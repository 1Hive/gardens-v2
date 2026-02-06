// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import "forge-std/Test.sol";

import {StreamingEscrow} from "../src/CVStrategy/StreamingEscrow.sol";
import {ISuperToken} from "@superfluid-finance/ethereum-contracts/contracts/interfaces/superfluid/ISuperToken.sol";
import {ISuperfluidPool} from "@superfluid-finance/ethereum-contracts/contracts/interfaces/agreements/gdav1/ISuperfluidPool.sol";
import {ISuperfluidToken} from "@superfluid-finance/ethereum-contracts/contracts/interfaces/superfluid/ISuperfluidToken.sol";
import {ISuperAgreement} from "@superfluid-finance/ethereum-contracts/contracts/interfaces/superfluid/ISuperAgreement.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract MockGDA {
    int96 public flowRate;

    function setFlowRate(int96 rate) external {
        flowRate = rate;
    }

    function getAccountFlowInfo(ISuperfluidToken, address) external view returns (uint256, int96, uint256) {
        return (0, flowRate, 0);
    }
}

contract MockCFA {
    function getFlow(ISuperfluidToken, address, address)
        external
        pure
        returns (uint256 lastUpdated, int96 flowRate, uint256 deposit, uint256 owedDeposit)
    {
        return (0, 0, 0, 0);
    }
}

contract MockHost {
    address public gda;
    address public cfa;
    uint256 public callAgreementCount;
    uint256 public callAgreementWithContextCount;
    address public lastAgreement;
    address public lastAgreementWithCtx;

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

    function callAgreement(ISuperAgreement agreementClass, bytes calldata, bytes calldata) external returns (bytes memory) {
        callAgreementCount++;
        lastAgreement = address(agreementClass);
        return "";
    }

    function callAgreementWithContext(
        ISuperAgreement agreementClass,
        bytes calldata,
        bytes calldata,
        bytes calldata ctx
    )
        external
        returns (bytes memory newCtx, bytes memory returnedData)
    {
        callAgreementWithContextCount++;
        lastAgreementWithCtx = address(agreementClass);
        return (ctx, "");
    }
}

contract MockPool {}

contract MockSuperToken {
    address public host;

    address public lastFlowReceiver;
    int96 public lastFlowRate;
    uint256 public flowCallCount;

    mapping(address => uint256) public balances;

    constructor(address _host) {
        host = _host;
    }

    function resetFlows() external {
        lastFlowReceiver = address(0);
        lastFlowRate = 0;
        flowCallCount = 0;
    }

    function getHost() external view returns (address) {
        return host;
    }

    function balanceOf(address account) external view returns (uint256) {
        return balances[account];
    }

    function mint(address account, uint256 amount) external {
        balances[account] += amount;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        balances[msg.sender] -= amount;
        balances[to] += amount;
        return true;
    }

    function flow(address receiver, int96 flowRate) external returns (bool) {
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
    StreamingEscrowHarness internal escrow;
    MockGDA internal gda;
    MockCFA internal cfa;
    MockHost internal host;
    MockSuperToken internal token;
    MockPool internal pool;

    address internal strategy = address(this);
    address internal beneficiary = address(0xBEEF);
    address internal treasury = address(0xFEE);
    address internal other = address(0xCAFE);

    function setUp() public {
        gda = new MockGDA();
        cfa = new MockCFA();
        host = new MockHost(address(gda), address(cfa));
        token = new MockSuperToken(address(host));
        pool = new MockPool();

        StreamingEscrowHarness impl = new StreamingEscrowHarness();
        bytes memory initData = abi.encodeWithSelector(
            StreamingEscrow.initialize.selector,
            ISuperToken(address(token)),
            ISuperfluidPool(address(pool)),
            beneficiary,
            strategy,
            treasury
        );
        escrow = StreamingEscrowHarness(address(new ERC1967Proxy(address(impl), initData)));
    }

    function test_initialize_sets_state_and_connects() public {
        assertEq(address(escrow.superToken()), address(token));
        assertEq(address(escrow.pool()), address(pool));
        assertEq(address(escrow.host()), address(host));
        assertEq(address(escrow.gda()), address(gda));
        assertEq(escrow.beneficiary(), beneficiary);
        assertEq(escrow.strategy(), strategy);
        assertEq(escrow.treasury(), treasury);
        assertEq(escrow.owner(), strategy);
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
                strategy,
                treasury
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
                strategy,
                treasury
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
                strategy,
                treasury
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
                treasury
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
                strategy,
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
        escrow.setTreasury(address(0xB22));

        vm.prank(other);
        vm.expectRevert(abi.encodeWithSelector(StreamingEscrow.OnlyStrategy.selector, other));
        escrow.setDisputed(true);

        vm.prank(other);
        vm.expectRevert(abi.encodeWithSelector(StreamingEscrow.OnlyStrategy.selector, other));
        escrow.resolveToBeneficiary();

        vm.prank(other);
        vm.expectRevert(abi.encodeWithSelector(StreamingEscrow.OnlyStrategy.selector, other));
        escrow.resolveToTreasury();
    }

    function test_setBeneficiary_updates_flow_when_not_disputed() public {
        gda.setFlowRate(123);
        uint256 startCount = host.callAgreementCount();

        address newBeneficiary = address(0xA11);
        escrow.setBeneficiary(newBeneficiary);

        assertEq(escrow.beneficiary(), newBeneficiary);
        assertEq(host.callAgreementCount(), startCount + 1);
        assertEq(host.lastAgreement(), address(cfa));
    }

    function test_setBeneficiary_skips_flow_when_disputed() public {
        escrow.setDisputed(true);
        token.resetFlows();
        uint256 startCount = host.callAgreementCount();

        escrow.setBeneficiary(address(0xA11));
        assertEq(host.callAgreementCount(), startCount);
    }

    function test_setBeneficiary_reverts_on_zero() public {
        vm.expectRevert(StreamingEscrow.InvalidAddress.selector);
        escrow.setBeneficiary(address(0));
    }

    function test_setTreasury_updates_and_reverts_on_zero() public {
        address newTreasury = address(0xB22);
        escrow.setTreasury(newTreasury);
        assertEq(escrow.treasury(), newTreasury);

        vm.expectRevert(StreamingEscrow.InvalidAddress.selector);
        escrow.setTreasury(address(0));
    }

    function test_setDisputed_toggles_outflow() public {
        gda.setFlowRate(77);
        uint256 startCount = host.callAgreementCount();
        escrow.setDisputed(true);
        assertEq(host.callAgreementCount(), startCount);

        escrow.setDisputed(false);
        assertEq(host.callAgreementCount(), startCount + 1);
        assertEq(host.lastAgreement(), address(cfa));
    }

    function test_claim_reverts_when_disputed() public {
        escrow.setDisputed(true);
        vm.expectRevert(StreamingEscrow.Disputed.selector);
        escrow.claim();
    }

    function test_claim_drains_balance() public {
        token.mint(address(escrow), 100);
        escrow.claim();

        assertEq(token.balanceOf(address(escrow)), 0);
        assertEq(token.balanceOf(beneficiary), 100);
    }

    function test_resolveToBeneficiary_drains() public {
        token.mint(address(escrow), 55);
        escrow.resolveToBeneficiary();

        assertEq(token.balanceOf(address(escrow)), 0);
        assertEq(token.balanceOf(beneficiary), 55);
    }

    function test_resolveToTreasury_drains() public {
        token.mint(address(escrow), 44);
        escrow.resolveToTreasury();

        assertEq(token.balanceOf(address(escrow)), 0);
        assertEq(token.balanceOf(treasury), 44);
    }

    function test_afterAgreementChanged_onlyHost() public {
        vm.expectRevert(abi.encodeWithSelector(StreamingEscrow.OnlyHost.selector, address(this)));
        escrow.afterAgreementCreated(ISuperToken(address(token)), address(gda), bytes32(0), "", "", "");
    }

    function test_afterAgreementChanged_returns_ctx_for_mismatch() public {
        MockSuperToken otherToken = new MockSuperToken(address(host));
        bytes memory ctx = abi.encodePacked("ctx");

        vm.prank(address(host));
        bytes memory result = escrow.afterAgreementCreated(
            ISuperToken(address(otherToken)),
            address(gda),
            bytes32(0),
            "",
            "",
            ctx
        );
        assertEq(result, ctx);
        assertEq(host.callAgreementWithContextCount(), 0);

        vm.prank(address(host));
        result = escrow.afterAgreementCreated(
            ISuperToken(address(token)),
            address(0x1234),
            bytes32(0),
            "",
            "",
            ctx
        );
        assertEq(result, ctx);
        assertEq(host.callAgreementWithContextCount(), 0);
    }

    function test_afterAgreementChanged_calls_flow_when_matching() public {
        gda.setFlowRate(99);
        bytes memory ctx = abi.encodePacked("ctx");

        vm.prank(address(host));
        bytes memory result = escrow.afterAgreementCreated(
            ISuperToken(address(token)),
            address(gda),
            bytes32(0),
            "",
            "",
            ctx
        );
        assertEq(result, ctx);
        assertEq(host.callAgreementWithContextCount(), 1);
        assertEq(host.lastAgreementWithCtx(), address(cfa));
    }

    function test_afterAgreementChanged_uses_zero_flow_when_disputed() public {
        gda.setFlowRate(99);
        escrow.setDisputed(true);
        bytes memory ctx = abi.encodePacked("ctx");

        vm.prank(address(host));
        escrow.afterAgreementUpdated(
            ISuperToken(address(token)),
            address(gda),
            bytes32(0),
            "",
            "",
            ctx
        );
        assertEq(host.callAgreementWithContextCount(), 0);
    }

    function test_currentGDAFlowRate_nonpositive_returns_zero() public {
        gda.setFlowRate(-1);
        assertEq(escrow.exposedCurrentGDAFlowRate(), 0);
    }

    function test_setOutflow_skips_zero_receiver() public {
        token.resetFlows();
        escrow.exposedSetOutflow(1, address(0));
        assertEq(token.flowCallCount(), 0);
    }
}
