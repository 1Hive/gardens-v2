// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {RegistryFactory} from "../src/RegistryFactory/RegistryFactory.sol";
import {RegistryCommunity} from "../src/RegistryCommunity/RegistryCommunity.sol";
import {CVStrategy} from "../src/CVStrategy/CVStrategy.sol";
import {CollateralVault} from "../src/CollateralVault.sol";
import {ProxyOwner} from "../src/ProxyOwner.sol";
import {ProxyOwnableUpgrader} from "../src/ProxyOwnableUpgrader.sol";

contract ProxyOwnerV2 is ProxyOwner {
    function version() external pure returns (string memory) {
        return "v2";
    }
}

contract ProxyOwnerTest is Test {
    address deployerWallet = makeAddr("deployerWallet");
    address anotherWallet = makeAddr("anotherWallet");
    address upgradeWallet = makeAddr("upgradeWallet");
    address protocolFeeReceiver = makeAddr("multisigReceiver");
    address newOwner = makeAddr("newOwner");

    function _deployProxyOwner() internal returns (ProxyOwner) {
        return ProxyOwner(
            address(
                new ERC1967Proxy(
                    address(new ProxyOwner()), abi.encodeWithSelector(ProxyOwner.initialize.selector, deployerWallet)
                )
            )
        );
    }

    function _deployRegistryFactory(address ownerAddr) internal returns (RegistryFactory) {
        ERC1967Proxy proxy = new ERC1967Proxy(
            address(new RegistryFactory()),
            abi.encodeWithSelector(
                RegistryFactory.initialize.selector,
                ownerAddr, // owner
                address(protocolFeeReceiver), // gardensFeeReceiver
                address(new RegistryCommunity()), // registryCommunityTemplate
                address(new CVStrategy()), // strategyTemplate
                address(new CollateralVault()) // collateralVaultTemplate
            )
        );
        return RegistryFactory(payable(address(proxy)));
    }

    function test_initialize_setsOwner_once() public {
        ProxyOwner proxyOwner = _deployProxyOwner();
        assertEq(proxyOwner.owner(), deployerWallet);

        vm.expectRevert("Initializable: contract is already initialized");
        proxyOwner.initialize(deployerWallet);
    }

    function test_transferOwnership_setsPendingAndAccepts() public {
        ProxyOwner proxyOwner = _deployProxyOwner();

        vm.prank(deployerWallet);
        proxyOwner.transferOwnership(newOwner);
        assertEq(proxyOwner.pendingOwner(), newOwner);
        assertEq(proxyOwner.owner(), deployerWallet);

        vm.prank(newOwner);
        proxyOwner.acceptOwnership();
        assertEq(proxyOwner.owner(), newOwner);
        assertEq(proxyOwner.pendingOwner(), address(0));
    }

    function test_transferOwnership_allowsCancelWithZero() public {
        ProxyOwner proxyOwner = _deployProxyOwner();

        vm.prank(deployerWallet);
        proxyOwner.transferOwnership(newOwner);
        assertEq(proxyOwner.pendingOwner(), newOwner);

        vm.prank(deployerWallet);
        proxyOwner.transferOwnership(address(0));
        assertEq(proxyOwner.pendingOwner(), address(0));
    }

    function test_acceptOwnership_revertsIfNotPending() public {
        ProxyOwner proxyOwner = _deployProxyOwner();

        vm.prank(newOwner);
        vm.expectRevert(abi.encodeWithSelector(ProxyOwner.OwnableUnauthorizedAccount.selector, newOwner));
        proxyOwner.acceptOwnership();
    }

    function test_transferOwnership_revertsIfNotOwner() public {
        ProxyOwner proxyOwner = _deployProxyOwner();

        vm.prank(anotherWallet);
        vm.expectRevert(abi.encodeWithSelector(ProxyOwner.OwnableUnauthorizedAccount.selector, anotherWallet));
        proxyOwner.transferOwnership(newOwner);
    }

    function test_upgradeWithProxyOwner() public {
        ProxyOwner proxyOwner = _deployProxyOwner();
        RegistryFactory factory = _deployRegistryFactory(address(proxyOwner));
        RegistryFactory newImpl = new RegistryFactory();

        vm.prank(deployerWallet);
        factory.upgradeTo(address(newImpl));
    }

    function test_grantUpgradeAccess_exposesUpgradeWalletAsOwner() public {
        ProxyOwner proxyOwner = _deployProxyOwner();

        vm.prank(deployerWallet);
        proxyOwner.grantUpgradeAccess(upgradeWallet);

        assertEq(proxyOwner.mainOwner(), deployerWallet);
        assertEq(proxyOwner.proxyOwner(), deployerWallet);
        assertEq(proxyOwner.owner(), upgradeWallet);
        assertEq(proxyOwner.upgradeAccess(), upgradeWallet);
    }

    function test_grantedUpgradeWallet_canUpgradeProxyOwnedContract() public {
        ProxyOwner proxyOwner = _deployProxyOwner();
        RegistryFactory factory = _deployRegistryFactory(address(proxyOwner));
        RegistryFactory newImpl = new RegistryFactory();

        vm.prank(deployerWallet);
        proxyOwner.grantUpgradeAccess(upgradeWallet);

        vm.prank(upgradeWallet);
        factory.upgradeTo(address(newImpl));
    }

    function test_grantedUpgradeWallet_cannotManageProxyOwner() public {
        ProxyOwner proxyOwner = _deployProxyOwner();
        ProxyOwnerV2 newImpl = new ProxyOwnerV2();

        vm.prank(deployerWallet);
        proxyOwner.grantUpgradeAccess(upgradeWallet);

        vm.prank(upgradeWallet);
        vm.expectRevert(abi.encodeWithSelector(ProxyOwner.OwnableUnauthorizedAccount.selector, upgradeWallet));
        proxyOwner.transferOwnership(newOwner);

        vm.prank(upgradeWallet);
        vm.expectRevert(abi.encodeWithSelector(ProxyOwner.OwnableUnauthorizedAccount.selector, upgradeWallet));
        proxyOwner.upgradeTo(address(newImpl));
    }

    function test_renounceUpgradeAccess_restoresOriginalOwner() public {
        ProxyOwner proxyOwner = _deployProxyOwner();
        RegistryFactory factory = _deployRegistryFactory(address(proxyOwner));
        RegistryFactory newImpl = new RegistryFactory();

        vm.prank(deployerWallet);
        proxyOwner.grantUpgradeAccess(upgradeWallet);
        assertEq(proxyOwner.owner(), upgradeWallet);

        vm.prank(upgradeWallet);
        proxyOwner.renounceUpgradeAccess();

        assertEq(proxyOwner.owner(), deployerWallet);
        assertEq(proxyOwner.upgradeAccess(), address(0));

        vm.prank(upgradeWallet);
        vm.expectRevert(
            abi.encodeWithSelector(ProxyOwnableUpgrader.CallerNotOwner.selector, upgradeWallet, deployerWallet)
        );
        factory.upgradeTo(address(newImpl));
    }

    function test_renounceUpgradeAccess_revertsForNonUpgradeWallet() public {
        ProxyOwner proxyOwner = _deployProxyOwner();

        vm.prank(deployerWallet);
        proxyOwner.grantUpgradeAccess(upgradeWallet);

        vm.prank(anotherWallet);
        vm.expectRevert(abi.encodeWithSelector(ProxyOwner.OwnableUnauthorizedAccount.selector, anotherWallet));
        proxyOwner.renounceUpgradeAccess();
    }

    function test_reclaimUpgradeAccess_restoresOriginalOwner() public {
        ProxyOwner proxyOwner = _deployProxyOwner();
        RegistryFactory factory = _deployRegistryFactory(address(proxyOwner));
        RegistryFactory newImpl = new RegistryFactory();

        vm.prank(deployerWallet);
        proxyOwner.grantUpgradeAccess(upgradeWallet);
        assertEq(proxyOwner.owner(), upgradeWallet);

        vm.prank(deployerWallet);
        proxyOwner.reclaimUpgradeAccess();

        assertEq(proxyOwner.owner(), deployerWallet);
        assertEq(proxyOwner.upgradeAccess(), address(0));

        vm.prank(upgradeWallet);
        vm.expectRevert(
            abi.encodeWithSelector(ProxyOwnableUpgrader.CallerNotOwner.selector, upgradeWallet, deployerWallet)
        );
        factory.upgradeTo(address(newImpl));
    }

    function test_reclaimUpgradeAccess_revertsForNonOwner() public {
        ProxyOwner proxyOwner = _deployProxyOwner();

        vm.prank(deployerWallet);
        proxyOwner.grantUpgradeAccess(upgradeWallet);

        vm.prank(anotherWallet);
        vm.expectRevert(abi.encodeWithSelector(ProxyOwner.OwnableUnauthorizedAccount.selector, anotherWallet));
        proxyOwner.reclaimUpgradeAccess();
    }

    function test_upgradeWithEOAOwner() public {
        RegistryFactory factory = _deployRegistryFactory(deployerWallet);
        RegistryFactory newImpl = new RegistryFactory();

        vm.prank(deployerWallet);
        factory.upgradeTo(address(newImpl));
    }

    function test_Revert_upgradeWithProxyOwnerNotAuthorized() public {
        ProxyOwner proxyOwner = _deployProxyOwner();
        RegistryFactory factory = _deployRegistryFactory(address(proxyOwner));
        RegistryFactory newImpl = new RegistryFactory();

        vm.prank(anotherWallet);
        vm.expectRevert(
            abi.encodeWithSelector(ProxyOwnableUpgrader.CallerNotOwner.selector, anotherWallet, deployerWallet)
        );
        factory.upgradeTo(address(newImpl));
    }

    function test_Revert_upgradeWithEOANotExpectedOwner() public {
        RegistryFactory factory = _deployRegistryFactory(anotherWallet);
        RegistryFactory newImpl = new RegistryFactory();

        vm.prank(deployerWallet);
        vm.expectRevert(
            abi.encodeWithSelector(ProxyOwnableUpgrader.CallerNotOwner.selector, deployerWallet, anotherWallet)
        );
        factory.upgradeTo(address(newImpl));
    }

    function test_proxyOwner_upgrade_authorizedOnlyOwner() public {
        ProxyOwner proxyOwner = _deployProxyOwner();
        ProxyOwnerV2 newImpl = new ProxyOwnerV2();

        vm.prank(deployerWallet);
        proxyOwner.upgradeTo(address(newImpl));

        assertEq(ProxyOwnerV2(address(proxyOwner)).version(), "v2");
    }

    function test_proxyOwner_upgrade_revertsForNonOwner() public {
        ProxyOwner proxyOwner = _deployProxyOwner();
        ProxyOwnerV2 newImpl = new ProxyOwnerV2();

        vm.prank(anotherWallet);
        vm.expectRevert(abi.encodeWithSelector(ProxyOwner.OwnableUnauthorizedAccount.selector, anotherWallet));
        proxyOwner.upgradeTo(address(newImpl));
    }
}
