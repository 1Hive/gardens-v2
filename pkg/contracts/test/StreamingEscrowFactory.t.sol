// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import "forge-std/Test.sol";

import {StreamingEscrow} from "../src/CVStrategy/StreamingEscrow.sol";
import {StreamingEscrowFactory} from "../src/CVStrategy/StreamingEscrowFactory.sol";
import "@superfluid-finance/ethereum-contracts/contracts/interfaces/superfluid/ISuperApp.sol";
import "@superfluid-finance/ethereum-contracts/contracts/interfaces/superfluid/ISuperAgreement.sol";
import "@superfluid-finance/ethereum-contracts/contracts/interfaces/superfluid/ISuperToken.sol";
import "@superfluid-finance/ethereum-contracts/contracts/interfaces/agreements/gdav1/ISuperfluidPool.sol";
import "@superfluid-finance/ethereum-contracts/contracts/interfaces/superfluid/ISuperfluid.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract MockGDA {
    function getAccountFlowInfo(ISuperfluidToken, address) external pure returns (uint256, int96, uint256) {
        return (0, 0, 0);
    }
}

contract MockHost {
    address public gda;
    address public lastApp;
    uint256 public lastConfig;

    constructor(address _gda) {
        gda = _gda;
    }

    function getAgreementClass(bytes32) external view returns (address) {
        return gda;
    }

    function callAgreement(ISuperAgreement, bytes calldata, bytes calldata) external pure returns (bytes memory) {
        return "";
    }

    function registerAppByFactory(ISuperApp app, uint256 configWord) external {
        lastApp = address(app);
        lastConfig = configWord;
    }
}

contract MockPool {}

contract MockSuperToken {
    address public host;

    address public lastFlowReceiver;
    int96 public lastFlowRate;

    mapping(address => uint256) public balances;

    constructor(address _host) {
        host = _host;
    }

    function getHost() external view returns (address) {
        return host;
    }

    function connectPool(ISuperfluidPool) external pure returns (bool) {
        return true;
    }

    function balanceOf(address account) external view returns (uint256) {
        return balances[account];
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        balances[msg.sender] -= amount;
        balances[to] += amount;
        return true;
    }

    function flow(address receiver, int96 flowRate) external returns (bool) {
        lastFlowReceiver = receiver;
        lastFlowRate = flowRate;
        return true;
    }

    function flowWithCtx(address receiver, int96 flowRate, bytes calldata ctx) external returns (bytes memory) {
        lastFlowReceiver = receiver;
        lastFlowRate = flowRate;
        return ctx;
    }
}

contract StreamingEscrowFactoryTest is Test {
    StreamingEscrowFactory factory;
    StreamingEscrow escrowImpl;
    MockHost host;
    MockGDA gda;
    MockSuperToken token;
    MockPool pool;

    address beneficiary = address(0xBEEF);
    address treasury = address(0xFEE);

    function setUp() public {
        gda = new MockGDA();
        host = new MockHost(address(gda));
        token = new MockSuperToken(address(host));
        pool = new MockPool();

        escrowImpl = new StreamingEscrow();
        factory = StreamingEscrowFactory(
            address(
                new ERC1967Proxy(
                    address(new StreamingEscrowFactory()),
                    abi.encodeWithSelector(
                        StreamingEscrowFactory.initialize.selector,
                        address(this),
                        ISuperfluid(address(host)),
                        address(escrowImpl)
                    )
                )
            )
        );
    }

    function test_deployEscrow_registersAppAndInitializes() public {
        address escrow =
            factory.deployEscrow(ISuperToken(address(token)), ISuperfluidPool(address(pool)), beneficiary, treasury);

        assertEq(host.lastApp(), escrow);
        assertEq(StreamingEscrow(escrow).strategy(), address(this));
        assertEq(StreamingEscrow(escrow).beneficiary(), beneficiary);
        assertEq(StreamingEscrow(escrow).treasury(), treasury);
        assertEq(StreamingEscrow(escrow).owner(), address(this));
    }

    function test_deployEscrow_onlyStrategy() public {
        vm.prank(address(0xB0B));
        vm.expectRevert(abi.encodeWithSelector(StreamingEscrowFactory.OnlyStrategy.selector, address(0xB0B)));
        factory.deployEscrow(ISuperToken(address(token)), ISuperfluidPool(address(pool)), beneficiary, treasury);
    }
}
