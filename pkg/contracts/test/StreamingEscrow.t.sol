// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import "forge-std/Test.sol";

import {StreamingEscrow} from "../src/CVStrategy/StreamingEscrow.sol";
import {ISuperToken} from "@superfluid-finance/ethereum-contracts/contracts/interfaces/superfluid/ISuperToken.sol";
import {
    ISuperfluidPool
} from "@superfluid-finance/ethereum-contracts/contracts/interfaces/agreements/gdav1/ISuperfluidPool.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract MockForwarder {
    uint256 public deposit;

    function setDeposit(uint256 _deposit) external {
        deposit = _deposit;
    }

    function getDepositRequiredForFlowRate(address, int96) external view returns (uint256) {
        return deposit;
    }

    function getBufferAmountByFlowrate(ISuperToken, int96) external view returns (uint256) {
        return deposit;
    }
}

contract MockForwarderFallbackOnly {
    uint256 public deposit;

    function setDeposit(uint256 _deposit) external {
        deposit = _deposit;
    }

    function getBufferAmountByFlowrate(ISuperToken, int96) external view returns (uint256) {
        return deposit;
    }
}

contract MockCFA {
    int96 public flowRate;

    function setFlowRate(int96 _flowRate) external {
        flowRate = _flowRate;
    }

    function getFlow(ISuperToken, address, address)
        external
        view
        returns (uint256 lastUpdated, int96 currentFlowRate, uint256 deposit, uint256 owedDeposit)
    {
        return (0, flowRate, 0, 0);
    }
}

contract MockHost {
    address public gda;
    address public cfa;
    uint256 public callAgreementCount;
    uint256 public callAgreementWithContextCount;
    address public lastAgreement;
    address public lastAgreementWithCtx;
    bytes public callAgreementResponse;

    constructor(address _gda, address _cfa) {
        gda = _gda;
        cfa = _cfa;
    }

    function getAgreementClass(bytes32 agreementType) external view returns (address) {
        bytes32 gdaKey = keccak256("org.superfluid-finance.agreements.GeneralDistributionAgreement.v1");
        bytes32 cfaKey = keccak256("org.superfluid-finance.agreements.ConstantFlowAgreement.v1");
        if (agreementType == gdaKey) {
            return gda;
        }
        if (agreementType == cfaKey) {
            return cfa;
        }
        return address(0);
    }

    function callAgreement(address agreementClass, bytes calldata, bytes calldata) external returns (bytes memory) {
        callAgreementCount++;
        lastAgreement = agreementClass;
        return callAgreementResponse;
    }

    function setCallAgreementResponse(bytes calldata response) external {
        callAgreementResponse = response;
    }

    function callAgreementWithContext(address agreementClass, bytes calldata, bytes calldata, bytes calldata ctx)
        external
        returns (bytes memory newCtx, bytes memory returnedData)
    {
        callAgreementWithContextCount++;
        lastAgreementWithCtx = agreementClass;
        return (ctx, "");
    }
}

contract MockPool {
    mapping(address => int96) public memberFlowRates;

    function setMemberFlowRate(address member, int96 flowRate) external {
        memberFlowRates[member] = flowRate;
    }

    function getMemberFlowRate(address member) external view returns (int96) {
        return memberFlowRates[member];
    }
}

contract MockSuperToken {
    address public host;
    bool public connectPoolReturn = true;
    bool public transferShouldSucceed = true;
    bool public flowShouldSucceed = true;

    address public lastFlowReceiver;
    int96 public lastFlowRate;
    uint256 public flowCallCount;

    mapping(address => uint256) public balances;

    constructor(address _host) {
        host = _host;
    }

    function setConnectPoolReturn(bool ok) external {
        connectPoolReturn = ok;
    }

    function setTransferShouldSucceed(bool ok) external {
        transferShouldSucceed = ok;
    }

    function setFlowShouldSucceed(bool ok) external {
        flowShouldSucceed = ok;
    }

    function getHost() external view returns (address) {
        return host;
    }

    function connectPool(ISuperfluidPool) external view returns (bool) {
        return connectPoolReturn;
    }

    function resetFlows() external {
        lastFlowReceiver = address(0);
        lastFlowRate = 0;
        flowCallCount = 0;
    }

    function balanceOf(address account) external view returns (uint256) {
        return balances[account];
    }

    function mint(address account, uint256 amount) external {
        balances[account] += amount;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        if (!transferShouldSucceed) {
            return false;
        }
        balances[msg.sender] -= amount;
        balances[to] += amount;
        return true;
    }

    function flow(address receiver, int96 flowRate) external returns (bool) {
        if (!flowShouldSucceed) {
            return false;
        }
        lastFlowReceiver = receiver;
        lastFlowRate = flowRate;
        flowCallCount++;
        return true;
    }

    function flowWithCtx(address receiver, int96 flowRate, bytes calldata ctx) external returns (bytes memory) {
        lastFlowReceiver = receiver;
        lastFlowRate = flowRate;
        flowCallCount++;
        return ctx;
    }
}

contract StreamingEscrowHarness is StreamingEscrow {
    function exposedCurrentGDAFlowRate() external view returns (int96) {
        return _currentGDAFlowRate();
    }

    function exposedSetOutflow(int96 flowRate, address receiver) external {
        _setOutflow(flowRate, receiver);
    }
}

contract StreamingEscrowTest is Test {
    address internal constant CFA_V1_FORWARDER = 0xcfA132E353cB4E398080B9700609bb008eceB125;
    uint256 internal constant NEW_SUPER_TOKEN_SLOT = 151;
    uint256 internal constant NEW_POOL_SLOT = 152;
    uint256 internal constant NEW_HOST_SLOT = 153;
    uint256 internal constant NEW_GDA_SLOT = 154;
    uint256 internal constant NEW_STRATEGY_SLOT = 155;
    uint256 internal constant NEW_BENEFICIARY_AND_DISPUTED_SLOT = 156;

    StreamingEscrowHarness internal escrow;
    MockForwarder internal forwarder;
    MockCFA internal cfa;
    MockHost internal host;
    MockSuperToken internal token;
    MockPool internal pool;

    address internal owner = address(0xA11CE);
    address internal strategy = address(this);
    address internal beneficiary = address(0xBEEF);
    address internal other = address(0xCAFE);

    function setUp() public {
        pool = new MockPool();
        cfa = new MockCFA();

        address gdaAddress = address(0xDDAD);
        host = new MockHost(gdaAddress, address(cfa));
        token = new MockSuperToken(address(host));

        MockForwarder impl = new MockForwarder();
        vm.etch(CFA_V1_FORWARDER, address(impl).code);
        forwarder = MockForwarder(CFA_V1_FORWARDER);

        StreamingEscrowHarness escrowImpl = new StreamingEscrowHarness();
        bytes memory initData = abi.encodeWithSelector(
            StreamingEscrow.initialize.selector,
            ISuperToken(address(token)),
            ISuperfluidPool(address(pool)),
            beneficiary,
            owner,
            strategy
        );
        escrow = StreamingEscrowHarness(address(new ERC1967Proxy(address(escrowImpl), initData)));
    }

    function test_initialize_sets_state() public {
        assertEq(address(escrow.superToken()), address(token));
        assertEq(address(escrow.pool()), address(pool));
        assertEq(address(escrow.host()), address(host));
        assertEq(address(escrow.gda()), address(0xDDAD));
        assertEq(escrow.beneficiary(), beneficiary);
        assertEq(escrow.strategy(), strategy);
        assertEq(escrow.owner(), owner);
        assertEq(escrow.storageSchemaVersion(), 2);
    }

    function test_initialize_reverts_on_invalid_addresses() public {
        StreamingEscrowHarness impl = new StreamingEscrowHarness();

        vm.expectRevert(StreamingEscrow.InvalidAddress.selector);
        new ERC1967Proxy(
            address(impl),
            abi.encodeWithSelector(
                StreamingEscrow.initialize.selector,
                ISuperToken(address(0)),
                ISuperfluidPool(address(pool)),
                beneficiary,
                owner,
                strategy
            )
        );

        impl = new StreamingEscrowHarness();
        vm.expectRevert(StreamingEscrow.InvalidAddress.selector);
        new ERC1967Proxy(
            address(impl),
            abi.encodeWithSelector(
                StreamingEscrow.initialize.selector,
                ISuperToken(address(token)),
                ISuperfluidPool(address(0)),
                beneficiary,
                owner,
                strategy
            )
        );

        impl = new StreamingEscrowHarness();
        vm.expectRevert(StreamingEscrow.InvalidAddress.selector);
        new ERC1967Proxy(
            address(impl),
            abi.encodeWithSelector(
                StreamingEscrow.initialize.selector,
                ISuperToken(address(token)),
                ISuperfluidPool(address(pool)),
                address(0),
                owner,
                strategy
            )
        );

        impl = new StreamingEscrowHarness();
        vm.expectRevert(StreamingEscrow.InvalidAddress.selector);
        new ERC1967Proxy(
            address(impl),
            abi.encodeWithSelector(
                StreamingEscrow.initialize.selector,
                ISuperToken(address(token)),
                ISuperfluidPool(address(pool)),
                beneficiary,
                address(0),
                strategy
            )
        );

        impl = new StreamingEscrowHarness();
        vm.expectRevert(StreamingEscrow.InvalidAddress.selector);
        new ERC1967Proxy(
            address(impl),
            abi.encodeWithSelector(
                StreamingEscrow.initialize.selector,
                ISuperToken(address(token)),
                ISuperfluidPool(address(pool)),
                beneficiary,
                owner,
                address(0)
            )
        );
    }

    function test_onlyStrategy_guards() public {
        vm.prank(other);
        vm.expectRevert(abi.encodeWithSelector(StreamingEscrow.OnlyStrategy.selector, other));
        escrow.setBeneficiary(address(0xA11));

        vm.prank(other);
        vm.expectRevert(abi.encodeWithSelector(StreamingEscrow.OnlyStrategy.selector, other));
        escrow.setDisputed(true);

        vm.prank(other);
        vm.expectRevert(abi.encodeWithSelector(StreamingEscrow.OnlyStrategy.selector, other));
        escrow.drainToBeneficiary();

        vm.prank(other);
        vm.expectRevert(abi.encodeWithSelector(StreamingEscrow.OnlyStrategy.selector, other));
        escrow.drainToStrategy();
    }

    function test_syncOutflow_callable_by_anyone() public {
        pool.setMemberFlowRate(address(escrow), 42);
        uint256 start = host.callAgreementCount();

        escrow.syncOutflow();
        assertEq(host.callAgreementCount(), start + 1);

        vm.prank(owner);
        escrow.syncOutflow();
        assertEq(host.callAgreementCount(), start + 2);

        vm.prank(other);
        escrow.syncOutflow();
        assertEq(host.callAgreementCount(), start + 3);
    }

    function test_reinitializeV2Migrate_moves_legacy_slots_to_new_layout() public {
        vm.store(address(escrow), bytes32(NEW_SUPER_TOKEN_SLOT), bytes32(0));
        vm.store(address(escrow), bytes32(NEW_POOL_SLOT), bytes32(0));
        vm.store(address(escrow), bytes32(NEW_HOST_SLOT), bytes32(0));
        vm.store(address(escrow), bytes32(NEW_GDA_SLOT), bytes32(0));
        vm.store(address(escrow), bytes32(NEW_STRATEGY_SLOT), bytes32(0));
        vm.store(address(escrow), bytes32(NEW_BENEFICIARY_AND_DISPUTED_SLOT), bytes32(0));

        address legacySuperToken = address(0x1111);
        address legacyPool = address(0x2222);
        address legacyHost = address(0x3333);
        address legacyGda = address(0x4444);
        address legacyStrategy = address(0x5555);
        address legacyBeneficiary = address(0x6666);
        bool legacyDisputed = true;

        vm.store(address(escrow), bytes32(uint256(101)), bytes32(uint256(uint160(legacySuperToken))));
        vm.store(address(escrow), bytes32(uint256(102)), bytes32(uint256(uint160(legacyPool))));
        vm.store(address(escrow), bytes32(uint256(103)), bytes32(uint256(uint160(legacyHost))));
        vm.store(address(escrow), bytes32(uint256(104)), bytes32(uint256(uint160(legacyGda))));
        vm.store(address(escrow), bytes32(uint256(105)), bytes32(uint256(uint160(legacyStrategy))));

        uint256 packed = uint256(uint160(legacyBeneficiary));
        if (legacyDisputed) {
            packed |= (uint256(1) << 160);
        }
        vm.store(address(escrow), bytes32(uint256(106)), bytes32(packed));

        vm.prank(owner);
        escrow.reinitializeV2Migrate();

        assertEq(address(escrow.superToken()), legacySuperToken);
        assertEq(address(escrow.pool()), legacyPool);
        assertEq(address(escrow.host()), legacyHost);
        assertEq(address(escrow.gda()), legacyGda);
        assertEq(escrow.strategy(), legacyStrategy);
        assertEq(escrow.beneficiary(), legacyBeneficiary);
        assertTrue(escrow.disputed());
        assertEq(escrow.storageSchemaVersion(), 2);
    }

    function test_reinitializeV2Migrate_only_owner_and_once() public {
        vm.prank(other);
        vm.expectRevert();
        escrow.reinitializeV2Migrate();

        vm.prank(owner);
        vm.expectRevert(StreamingEscrow.MigrationNotRequired.selector);
        escrow.reinitializeV2Migrate();

        vm.store(address(escrow), bytes32(NEW_SUPER_TOKEN_SLOT), bytes32(0));
        vm.store(address(escrow), bytes32(NEW_POOL_SLOT), bytes32(0));
        vm.store(address(escrow), bytes32(NEW_HOST_SLOT), bytes32(0));
        vm.store(address(escrow), bytes32(NEW_GDA_SLOT), bytes32(0));
        vm.store(address(escrow), bytes32(NEW_STRATEGY_SLOT), bytes32(0));
        vm.store(address(escrow), bytes32(NEW_BENEFICIARY_AND_DISPUTED_SLOT), bytes32(0));
        vm.store(address(escrow), bytes32(uint256(101)), bytes32(uint256(uint160(address(0x11)))));
        vm.store(address(escrow), bytes32(uint256(102)), bytes32(uint256(uint160(address(0x22)))));
        vm.store(address(escrow), bytes32(uint256(103)), bytes32(uint256(uint160(address(0x33)))));
        vm.store(address(escrow), bytes32(uint256(104)), bytes32(uint256(uint160(address(0x44)))));
        vm.store(address(escrow), bytes32(uint256(105)), bytes32(uint256(uint160(address(0x55)))));
        vm.store(address(escrow), bytes32(uint256(106)), bytes32(uint256(uint160(address(0x66)))));

        vm.prank(owner);
        escrow.reinitializeV2Migrate();

        vm.prank(owner);
        vm.expectRevert();
        escrow.reinitializeV2Migrate();
    }

    function test_syncOutflow_drains_excess_balance_above_buffered_deposit() public {
        pool.setMemberFlowRate(address(escrow), 10);
        forwarder.setDeposit(30);
        token.mint(address(escrow), 100);

        escrow.syncOutflow();

        assertEq(token.balanceOf(address(escrow)), 31);
        assertEq(token.balanceOf(beneficiary), 69);
    }

    function test_security_syncOutflowKeepsStrategyDepositBuffer() public {
        pool.setMemberFlowRate(address(escrow), 10);
        forwarder.setDeposit(10_000);
        token.mint(address(escrow), 10_050);

        escrow.syncOutflow();

        assertEq(token.balanceOf(address(escrow)), 10_050, "syncOutflow must preserve the 50 bps deposit buffer");
        assertEq(token.balanceOf(beneficiary), 0, "deposit buffer must not be paid to beneficiary as excess");
    }

    function test_syncOutflow_does_not_drain_excess_when_disputed() public {
        pool.setMemberFlowRate(address(escrow), 10);
        forwarder.setDeposit(30);
        token.mint(address(escrow), 100);
        escrow.setDisputed(true);

        vm.prank(other);
        escrow.syncOutflow();

        assertEq(token.balanceOf(address(escrow)), 100);
        assertEq(token.balanceOf(beneficiary), 0);
    }

    function test_setBeneficiary_updates_flow_when_not_disputed() public {
        pool.setMemberFlowRate(address(escrow), 123);
        uint256 start = host.callAgreementCount();

        escrow.setBeneficiary(address(0xA11));

        assertEq(escrow.beneficiary(), address(0xA11));
        assertEq(host.callAgreementCount(), start + 1);
        assertEq(host.lastAgreement(), address(cfa));
    }

    function test_setBeneficiary_skips_flow_when_disputed() public {
        escrow.setDisputed(true);
        uint256 start = host.callAgreementCount();

        escrow.setBeneficiary(address(0xA11));

        assertEq(host.callAgreementCount(), start);
    }

    function test_setBeneficiary_reverts_on_zero() public {
        vm.expectRevert(StreamingEscrow.InvalidAddress.selector);
        escrow.setBeneficiary(address(0));
    }

    function test_setBeneficiary_same_address_is_noop() public {
        pool.setMemberFlowRate(address(escrow), 123);
        uint256 start = host.callAgreementCount();

        escrow.setBeneficiary(beneficiary);

        assertEq(host.callAgreementCount(), start);
        assertEq(escrow.beneficiary(), beneficiary);
    }

    function test_setDisputed_toggles_outflow() public {
        pool.setMemberFlowRate(address(escrow), 77);
        uint256 start = host.callAgreementCount();

        escrow.setDisputed(true);
        assertEq(host.callAgreementCount(), start);

        escrow.setDisputed(false);
        assertEq(host.callAgreementCount(), start + 1);
        assertEq(host.lastAgreement(), address(cfa));
    }

    function test_setDisputed_same_value_is_noop() public {
        uint256 start = host.callAgreementCount();

        escrow.setDisputed(false);
        assertEq(host.callAgreementCount(), start);

        escrow.setDisputed(true);
        start = host.callAgreementCount();
        escrow.setDisputed(true);
        assertEq(host.callAgreementCount(), start);
    }

    function test_claim_reverts_when_disputed() public {
        escrow.setDisputed(true);
        vm.expectRevert(StreamingEscrow.Disputed.selector);
        escrow.claim();
    }

    function test_depositAmount_zero_when_no_positive_flow() public {
        pool.setMemberFlowRate(address(escrow), 0);
        forwarder.setDeposit(999);
        assertEq(escrow.depositAmount(), 0);

        pool.setMemberFlowRate(address(escrow), -1);
        assertEq(escrow.depositAmount(), 0);
    }

    function test_depositAmount_reads_forwarder() public {
        pool.setMemberFlowRate(address(escrow), 10);
        forwarder.setDeposit(33);

        assertEq(escrow.depositAmount(), 33);
        assertEq(escrow.reservedDepositAmount(), 34);
    }

    function test_depositAmount_falls_back_to_buffer_method() public {
        MockForwarderFallbackOnly fallbackImpl = new MockForwarderFallbackOnly();
        vm.etch(CFA_V1_FORWARDER, address(fallbackImpl).code);
        MockForwarderFallbackOnly(CFA_V1_FORWARDER).setDeposit(77);

        pool.setMemberFlowRate(address(escrow), 10);
        assertEq(escrow.depositAmount(), 77);
    }

    function test_claim_transfers_balance_minus_buffered_deposit() public {
        pool.setMemberFlowRate(address(escrow), 10);
        forwarder.setDeposit(30);
        token.mint(address(escrow), 100);

        escrow.claim();

        assertEq(token.balanceOf(address(escrow)), 31);
        assertEq(token.balanceOf(beneficiary), 69);
    }

    function test_claim_noop_when_balance_below_or_equal_deposit() public {
        pool.setMemberFlowRate(address(escrow), 10);
        forwarder.setDeposit(120);
        token.mint(address(escrow), 100);

        escrow.claim();

        assertEq(token.balanceOf(address(escrow)), 100);
        assertEq(token.balanceOf(beneficiary), 0);
    }

    function test_drainToBeneficiary_drains_all() public {
        token.mint(address(escrow), 55);
        escrow.drainToBeneficiary();

        assertEq(token.balanceOf(address(escrow)), 0);
        assertEq(token.balanceOf(beneficiary), 55);
    }

    function test_drainToStrategy_drains_all_including_reserved_deposit_and_stops_outflow() public {
        pool.setMemberFlowRate(address(escrow), 10);
        cfa.setFlowRate(10);
        forwarder.setDeposit(30);
        token.mint(address(escrow), 100);
        uint256 start = host.callAgreementCount();

        escrow.drainToStrategy();

        assertEq(token.balanceOf(address(escrow)), 0);
        assertEq(token.balanceOf(strategy), 100);
        assertEq(host.callAgreementCount(), start + 1);
        assertEq(host.lastAgreement(), address(cfa));
    }

    function test_drainToBeneficiary_reverts_on_transfer_failure() public {
        token.mint(address(escrow), 55);
        token.setTransferShouldSucceed(false);

        vm.expectRevert(abi.encodeWithSelector(StreamingEscrow.SuperTokenTransferFailed.selector, beneficiary, 55));
        escrow.drainToBeneficiary();
    }

    function test_claim_reverts_on_transfer_failure() public {
        pool.setMemberFlowRate(address(escrow), 10);
        forwarder.setDeposit(30);
        token.mint(address(escrow), 100);
        token.setTransferShouldSucceed(false);

        vm.expectRevert(abi.encodeWithSelector(StreamingEscrow.SuperTokenTransferFailed.selector, beneficiary, 69));
        escrow.claim();
    }

    function test_afterAgreementChanged_onlyHost() public {
        vm.expectRevert(abi.encodeWithSelector(StreamingEscrow.OnlyHost.selector, address(this)));
        escrow.afterAgreementCreated(ISuperToken(address(token)), address(0xDDAD), bytes32(0), "", "", "");
    }

    function test_afterAgreementUpdated_onlyHost() public {
        vm.expectRevert(abi.encodeWithSelector(StreamingEscrow.OnlyHost.selector, address(this)));
        escrow.afterAgreementUpdated(ISuperToken(address(token)), address(0xDDAD), bytes32(0), "", "", "");
    }

    function test_afterAgreementTerminated_onlyHost() public {
        vm.expectRevert(abi.encodeWithSelector(StreamingEscrow.OnlyHost.selector, address(this)));
        escrow.afterAgreementTerminated(ISuperToken(address(token)), address(0xDDAD), bytes32(0), "", "", "");
    }

    function test_afterAgreementChanged_returns_ctx_for_mismatch() public {
        bytes memory ctx = abi.encodePacked("ctx");

        vm.prank(address(host));
        bytes memory result =
            escrow.afterAgreementCreated(ISuperToken(address(0x1234)), address(0xDDAD), bytes32(0), "", "", ctx);
        assertEq(result, ctx);
        assertEq(host.callAgreementWithContextCount(), 0);

        vm.prank(address(host));
        result = escrow.afterAgreementCreated(ISuperToken(address(token)), address(0x1234), bytes32(0), "", "", ctx);
        assertEq(result, ctx);
        assertEq(host.callAgreementWithContextCount(), 0);
    }

    function test_afterAgreementChanged_calls_flow_when_matching() public {
        pool.setMemberFlowRate(address(escrow), 99);
        bytes memory ctx = abi.encodePacked("ctx");

        vm.prank(address(host));
        bytes memory result =
            escrow.afterAgreementCreated(ISuperToken(address(token)), address(0xDDAD), bytes32(0), "", "", ctx);

        assertEq(result, ctx);
        assertEq(host.callAgreementWithContextCount(), 1);
        assertEq(host.lastAgreementWithCtx(), address(cfa));
    }

    function test_afterAgreementChanged_uses_zero_flow_when_disputed() public {
        pool.setMemberFlowRate(address(escrow), 99);
        escrow.setDisputed(true);
        bytes memory ctx = abi.encodePacked("ctx");

        vm.prank(address(host));
        escrow.afterAgreementUpdated(ISuperToken(address(token)), address(0xDDAD), bytes32(0), "", "", ctx);

        assertEq(host.callAgreementWithContextCount(), 0);
        assertEq(token.lastFlowRate(), 0);
    }

    function test_afterAgreementTerminated_calls_flow_when_matching() public {
        pool.setMemberFlowRate(address(escrow), 88);
        bytes memory ctx = abi.encodePacked("ctx-term");

        vm.prank(address(host));
        bytes memory result =
            escrow.afterAgreementTerminated(ISuperToken(address(token)), address(0xDDAD), bytes32(0), "", "", ctx);

        assertEq(result, ctx);
        assertEq(host.callAgreementWithContextCount(), 1);
        assertEq(host.lastAgreementWithCtx(), address(cfa));
    }

    function test_currentGDAFlowRate_nonpositive_returns_zero() public {
        pool.setMemberFlowRate(address(escrow), -1);
        assertEq(escrow.exposedCurrentGDAFlowRate(), 0);
    }

    function test_currentGDAFlowRate_positive_returns_value() public {
        pool.setMemberFlowRate(address(escrow), 11);
        assertEq(escrow.exposedCurrentGDAFlowRate(), 11);
    }

    function test_setOutflow_skips_zero_receiver() public {
        token.resetFlows();
        escrow.exposedSetOutflow(1, address(0));
        assertEq(token.flowCallCount(), 0);
    }
}
