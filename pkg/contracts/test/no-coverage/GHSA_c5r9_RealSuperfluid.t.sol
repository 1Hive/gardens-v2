// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.23;

import {StreamingEscrow} from "../../src/CVStrategy/StreamingEscrow.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {SuperAppBase} from "@superfluid-finance/ethereum-contracts/contracts/apps/SuperAppBase.sol";
import {SuperTokenV1Library} from "@superfluid-finance/ethereum-contracts/contracts/apps/SuperTokenV1Library.sol";
import {
    ISuperfluid,
    ISuperApp,
    ISuperToken,
    SuperAppDefinitions
} from "@superfluid-finance/ethereum-contracts/contracts/interfaces/superfluid/ISuperfluid.sol";
import {
    IGeneralDistributionAgreementV1,
    ISuperfluidPool,
    PoolConfig
} from "@superfluid-finance/ethereum-contracts/contracts/interfaces/agreements/gdav1/IGeneralDistributionAgreementV1.sol";
import {
    FoundrySuperfluidTester
} from "@superfluid-finance/ethereum-contracts/test/foundry/FoundrySuperfluidTester.t.sol";

contract ReentrantStreamingBeneficiary is SuperAppBase {
    ISuperfluid internal immutable HOST;
    StreamingEscrow public escrow;
    bool public callbackEntered;
    bool public reentrySucceeded;
    bool public reenterThroughClaim;

    constructor(ISuperfluid host, bool registerSelf, bool _reenterThroughClaim) {
        HOST = host;
        reenterThroughClaim = _reenterThroughClaim;
        if (registerSelf) {
            host.registerApp(_configWord());
        }
    }

    function configWord() external pure returns (uint256) {
        return _configWord();
    }

    function setEscrow(StreamingEscrow _escrow) external {
        require(address(escrow) == address(0), "escrow already set");
        escrow = _escrow;
    }

    function afterAgreementTerminated(ISuperToken, address, bytes32, bytes calldata, bytes calldata, bytes calldata ctx)
        external
        override
        returns (bytes memory newCtx)
    {
        require(msg.sender == address(HOST), "only host");
        callbackEntered = true;

        if (reenterThroughClaim) {
            try escrow.claim() {
                reentrySucceeded = true;
            } catch {}
        } else {
            try escrow.syncOutflow() {
                reentrySucceeded = true;
            } catch {}
        }

        return ctx;
    }

    function _configWord() internal pure returns (uint256) {
        return SuperAppDefinitions.APP_LEVEL_FINAL | SuperAppDefinitions.BEFORE_AGREEMENT_CREATED_NOOP
            | SuperAppDefinitions.AFTER_AGREEMENT_CREATED_NOOP | SuperAppDefinitions.BEFORE_AGREEMENT_UPDATED_NOOP
            | SuperAppDefinitions.AFTER_AGREEMENT_UPDATED_NOOP | SuperAppDefinitions.BEFORE_AGREEMENT_TERMINATED_NOOP;
    }
}

contract GHSAc5r9RealSuperfluidPoC is FoundrySuperfluidTester {
    using SuperTokenV1Library for ISuperToken;

    address internal constant CFA_V1_FORWARDER = 0xcfA132E353cB4E398080B9700609bb008eceB125;
    int96 internal constant FLOW_RATE = 1e12;

    constructor() FoundrySuperfluidTester(2) {}

    function setUp() public override {
        super.setUp();

        // StreamingEscrow uses Superfluid's canonical CFA forwarder address. Install the
        // real locally deployed forwarder runtime there for this isolated test chain.
        vm.etch(CFA_V1_FORWARDER, address(sf.cfaV1Forwarder).code);
    }

    function test_realSuperfluid_reentrantBeneficiaryCannotStealEscrowBuffer() public {
        _assertReentrantBeneficiaryCannotStealEscrowBuffer(false);
    }

    function test_realSuperfluid_reentrantClaimCannotStealEscrowBuffer() public {
        _assertReentrantBeneficiaryCannotStealEscrowBuffer(true);
    }

    function test_issue974_setBeneficiaryCallbackCannotClaim() public {
        ReentrantStreamingBeneficiary attacker = new ReentrantStreamingBeneficiary(sf.host, true, true);
        (StreamingEscrow escrow,) = _createFundedStreamingEscrow(address(attacker));
        attacker.setEscrow(escrow);
        address replacement = address(0xBEEF);
        uint256 attackerBalanceBefore = superToken.balanceOf(address(attacker));

        escrow.setBeneficiary(replacement);

        assertTrue(attacker.callbackEntered(), "old beneficiary callback was not exercised");
        assertFalse(attacker.reentrySucceeded(), "claim succeeded inside beneficiary change");
        assertEq(escrow.beneficiary(), replacement);
        assertEq(superToken.balanceOf(address(attacker)), attackerBalanceBefore);
        assertEq(ISuperToken(address(superToken)).getFlowRate(address(escrow), address(attacker)), 0);
        assertEq(ISuperToken(address(superToken)).getFlowRate(address(escrow), replacement), FLOW_RATE);
    }

    function test_issue974_setBeneficiaryCallbackCannotResyncFlow() public {
        ReentrantStreamingBeneficiary attacker = new ReentrantStreamingBeneficiary(sf.host, true, false);
        (StreamingEscrow escrow,) = _createFundedStreamingEscrow(address(attacker));
        attacker.setEscrow(escrow);
        address replacement = address(0xBEEF);

        escrow.setBeneficiary(replacement);

        assertTrue(attacker.callbackEntered(), "old beneficiary callback was not exercised");
        assertFalse(attacker.reentrySucceeded(), "flow resync succeeded inside beneficiary change");
        assertEq(ISuperToken(address(superToken)).getFlowRate(address(escrow), address(attacker)), 0);
        assertEq(ISuperToken(address(superToken)).getFlowRate(address(escrow), replacement), FLOW_RATE);
    }

    function test_issue974_setDisputedCallbackCannotClaim() public {
        ReentrantStreamingBeneficiary attacker = new ReentrantStreamingBeneficiary(sf.host, true, true);
        (StreamingEscrow escrow,) = _createFundedStreamingEscrow(address(attacker));
        attacker.setEscrow(escrow);
        uint256 attackerBalanceBefore = superToken.balanceOf(address(attacker));

        escrow.setDisputed(true);

        assertTrue(attacker.callbackEntered(), "beneficiary callback was not exercised");
        assertFalse(attacker.reentrySucceeded(), "claim succeeded inside dispute transition");
        assertTrue(escrow.disputed());
        assertEq(superToken.balanceOf(address(attacker)), attackerBalanceBefore);
        assertEq(ISuperToken(address(superToken)).getFlowRate(address(escrow), address(attacker)), 0);
    }

    function test_issue974_setDisputedCallbackCannotResyncFlow() public {
        ReentrantStreamingBeneficiary attacker = new ReentrantStreamingBeneficiary(sf.host, true, false);
        (StreamingEscrow escrow,) = _createFundedStreamingEscrow(address(attacker));
        attacker.setEscrow(escrow);

        escrow.setDisputed(true);

        assertTrue(attacker.callbackEntered(), "beneficiary callback was not exercised");
        assertFalse(attacker.reentrySucceeded(), "flow resync succeeded inside dispute transition");
        assertTrue(escrow.disputed());
        assertEq(ISuperToken(address(superToken)).getFlowRate(address(escrow), address(attacker)), 0);
    }

    function _assertReentrantBeneficiaryCannotStealEscrowBuffer(bool reenterThroughClaim) internal {
        ReentrantStreamingBeneficiary attacker = new ReentrantStreamingBeneficiary(sf.host, true, reenterThroughClaim);
        (StreamingEscrow escrow, ISuperfluidPool pool) = _createFundedStreamingEscrow(address(attacker));
        attacker.setEscrow(escrow);

        uint256 escrowBalanceBefore = superToken.balanceOf(address(escrow));
        uint256 attackerBalanceBefore = superToken.balanceOf(address(attacker));
        uint256 strategyBalanceBefore = superToken.balanceOf(address(this));
        assertGt(escrowBalanceBefore, 0, "escrow should hold pool-funded buffer");

        pool.updateMemberUnits(address(escrow), 0);
        escrow.drainToStrategy();

        assertTrue(attacker.callbackEntered(), "real CFA did not invoke termination callback");
        assertFalse(attacker.reentrySucceeded(), "reentrant fund-moving call succeeded");
        assertFalse(sf.host.isAppJailed(ISuperApp(address(attacker))), "beneficiary SuperApp was jailed");
        uint256 recoveredAmount = superToken.balanceOf(address(this)) - strategyBalanceBefore;
        emit log_named_uint("pool-funded amount returned", recoveredAmount);
        assertEq(
            superToken.balanceOf(address(attacker)), attackerBalanceBefore, "beneficiary stole cancellation buffer"
        );
        assertGt(recoveredAmount, escrowBalanceBefore, "strategy did not recover the released CFA deposit");
        assertEq(superToken.balanceOf(address(escrow)), 0, "escrow retained funds");
    }

    function test_realSuperfluid_eoaBeneficiaryReturnsEscrowBufferToStrategy() public {
        address beneficiary = address(0xBEEF);
        (StreamingEscrow escrow, ISuperfluidPool pool) = _createFundedStreamingEscrow(beneficiary);

        uint256 strategyBalanceBefore = superToken.balanceOf(address(this));
        uint256 escrowBalanceBefore = superToken.balanceOf(address(escrow));
        uint256 beneficiaryBalanceBefore = superToken.balanceOf(beneficiary);
        assertGt(escrowBalanceBefore, 0, "escrow should hold pool-funded buffer");

        pool.updateMemberUnits(address(escrow), 0);
        escrow.drainToStrategy();

        uint256 recoveredAmount = superToken.balanceOf(address(this)) - strategyBalanceBefore;
        emit log_named_uint("pool-funded amount returned", recoveredAmount);
        assertGt(recoveredAmount, escrowBalanceBefore, "strategy did not recover the released CFA deposit");
        assertEq(
            superToken.balanceOf(beneficiary), beneficiaryBalanceBefore, "EOA beneficiary received cancellation buffer"
        );
        assertEq(superToken.balanceOf(address(escrow)), 0, "escrow retained funds");
    }

    function _createFundedStreamingEscrow(address beneficiary)
        internal
        returns (StreamingEscrow escrow, ISuperfluidPool pool)
    {
        pool = sf.gda
            .createPool(
                ISuperToken(address(superToken)),
                address(this),
                PoolConfig({transferabilityForUnitsOwner: false, distributionFromAnyAddress: true})
            );

        StreamingEscrow implementation = new StreamingEscrow();
        bytes memory initData = abi.encodeCall(
            StreamingEscrow.initialize,
            (ISuperToken(address(superToken)), pool, beneficiary, address(this), address(this))
        );
        escrow = StreamingEscrow(address(new ERC1967Proxy(address(implementation), initData)));

        sf.host
            .registerApp(
                ISuperApp(address(escrow)),
                SuperAppDefinitions.APP_LEVEL_FINAL | SuperAppDefinitions.BEFORE_AGREEMENT_CREATED_NOOP
                    | SuperAppDefinitions.BEFORE_AGREEMENT_UPDATED_NOOP
                    | SuperAppDefinitions.BEFORE_AGREEMENT_TERMINATED_NOOP
            );

        pool.updateMemberUnits(address(escrow), 1);

        vm.startPrank(alice);
        ISuperToken(address(superToken)).distributeFlow(alice, pool, FLOW_RATE);
        uint256 targetDeposit = escrow.reservedDepositAmount();
        assertGt(targetDeposit, 0, "real CFA returned no required deposit");
        superToken.transfer(address(escrow), targetDeposit);
        vm.stopPrank();

        escrow.syncOutflow();
        assertEq(
            ISuperToken(address(superToken)).getFlowRate(address(escrow), beneficiary),
            pool.getMemberFlowRate(address(escrow)),
            "escrow outflow was not initialized"
        );
    }
}
