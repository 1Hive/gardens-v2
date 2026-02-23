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

contract MockGDA {}

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

    function registerAppByFactory(ISuperApp app, uint256 configWord) external {
        lastApp = address(app);
        lastConfig = configWord;
    }

    function callAgreement(address, bytes calldata, bytes calldata) external pure returns (bytes memory) {
        return "";
    }
}

contract MockPool {
    function getMemberFlowRate(address) external pure returns (int96) {
        return 0;
    }
}

contract MockSuperToken {
    address public host;

    constructor(address _host) {
        host = _host;
    }

    function getHost() external view returns (address) {
        return host;
    }

    function connectPool(ISuperfluidPool) external pure returns (bool) {
        return true;
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
            factory.deployEscrow(ISuperToken(address(token)), ISuperfluidPool(address(pool)), beneficiary, address(this));

        assertEq(host.lastApp(), escrow);
        assertEq(StreamingEscrow(escrow).strategy(), address(this));
        assertEq(StreamingEscrow(escrow).beneficiary(), beneficiary);
        assertEq(StreamingEscrow(escrow).owner(), address(this));
    }

    function test_deployEscrow_reverts_when_sender_not_strategy() public {
        vm.prank(address(0xB0B));
        vm.expectRevert(
            abi.encodeWithSelector(StreamingEscrowFactory.UnauthorizedCaller.selector, address(0xB0B), address(this))
        );
        factory.deployEscrow(ISuperToken(address(token)), ISuperfluidPool(address(pool)), beneficiary, address(this));
    }

    function test_initialize_reverts_on_zero_addresses() public {
        address impl1 = address(new StreamingEscrowFactory());
        vm.expectRevert(StreamingEscrowFactory.InvalidAddress.selector);
        new ERC1967Proxy(
            impl1,
            abi.encodeWithSelector(
                StreamingEscrowFactory.initialize.selector, address(0), ISuperfluid(address(host)), address(escrowImpl)
            )
        );

        address impl2 = address(new StreamingEscrowFactory());
        vm.expectRevert(StreamingEscrowFactory.InvalidAddress.selector);
        new ERC1967Proxy(
            impl2,
            abi.encodeWithSelector(
                StreamingEscrowFactory.initialize.selector, address(this), ISuperfluid(address(0)), address(escrowImpl)
            )
        );

        address impl3 = address(new StreamingEscrowFactory());
        vm.expectRevert(StreamingEscrowFactory.InvalidAddress.selector);
        new ERC1967Proxy(
            impl3,
            abi.encodeWithSelector(
                StreamingEscrowFactory.initialize.selector, address(this), ISuperfluid(address(host)), address(0)
            )
        );
    }

    function test_deployEscrow_reverts_on_invalid_addresses() public {
        vm.expectRevert(StreamingEscrowFactory.InvalidAddress.selector);
        factory.deployEscrow(ISuperToken(address(token)), ISuperfluidPool(address(pool)), address(0), address(this));

        vm.expectRevert(StreamingEscrowFactory.InvalidAddress.selector);
        factory.deployEscrow(ISuperToken(address(token)), ISuperfluidPool(address(pool)), beneficiary, address(0));
    }

    function test_setEscrowImplementation_onlyOwner_and_nonzero() public {
        vm.prank(address(0xB0B));
        vm.expectRevert("Ownable: caller is not the owner");
        factory.setEscrowImplementation(address(0x1234));

        vm.expectRevert(StreamingEscrowFactory.InvalidAddress.selector);
        factory.setEscrowImplementation(address(0));

        address newImpl = address(new StreamingEscrow());
        factory.setEscrowImplementation(newImpl);
        assertEq(factory.escrowImplementation(), newImpl);
    }
}
