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
    function getFlow(ISuperToken, address, address)
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
    address internal constant CFA_V1_FORWARDER = 0xcfA132E353cB4E398080B9700609bb008eceB125;

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

    function test_syncOutflow_callable_by_strategy_or_owner() public {
        pool.setMemberFlowRate(address(escrow), 42);
        uint256 start = host.callAgreementCount();

        escrow.syncOutflow();
        assertEq(host.callAgreementCount(), start + 1);

        vm.prank(owner);
        escrow.syncOutflow();
        assertEq(host.callAgreementCount(), start + 2);

        vm.prank(other);
        vm.expectRevert(abi.encodeWithSelector(StreamingEscrow.OnlyStrategy.selector, other));
        escrow.syncOutflow();
    }

    function test_syncOutflow_drains_excess_balance_above_deposit() public {
        pool.setMemberFlowRate(address(escrow), 10);
        forwarder.setDeposit(30);
        token.mint(address(escrow), 100);

        escrow.syncOutflow();

        assertEq(token.balanceOf(address(escrow)), 30);
        assertEq(token.balanceOf(beneficiary), 70);
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

    function test_setDisputed_toggles_outflow() public {
        pool.setMemberFlowRate(address(escrow), 77);
        uint256 start = host.callAgreementCount();

        escrow.setDisputed(true);
        assertEq(host.callAgreementCount(), start);

        escrow.setDisputed(false);
        assertEq(host.callAgreementCount(), start + 1);
        assertEq(host.lastAgreement(), address(cfa));
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
    }

    function test_depositAmount_falls_back_to_buffer_method() public {
        MockForwarderFallbackOnly fallbackImpl = new MockForwarderFallbackOnly();
        vm.etch(CFA_V1_FORWARDER, address(fallbackImpl).code);
        MockForwarderFallbackOnly(CFA_V1_FORWARDER).setDeposit(77);

        pool.setMemberFlowRate(address(escrow), 10);
        assertEq(escrow.depositAmount(), 77);
    }

    function test_claim_transfers_balance_minus_deposit() public {
        pool.setMemberFlowRate(address(escrow), 10);
        forwarder.setDeposit(30);
        token.mint(address(escrow), 100);

        escrow.claim();

        assertEq(token.balanceOf(address(escrow)), 30);
        assertEq(token.balanceOf(beneficiary), 70);
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

    function test_drainToStrategy_drains_all_including_reserved_deposit() public {
        pool.setMemberFlowRate(address(escrow), 10);
        forwarder.setDeposit(30);
        token.mint(address(escrow), 100);

        escrow.drainToStrategy();

        assertEq(token.balanceOf(address(escrow)), 0);
        assertEq(token.balanceOf(strategy), 100);
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

    function test_setOutflow_skips_zero_receiver() public {
        token.resetFlows();
        escrow.exposedSetOutflow(1, address(0));
        assertEq(token.flowCallCount(), 0);
    }
}
