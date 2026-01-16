// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import {GoodDollarSybil} from "../src/GoodDollarSybil.sol";
import {Strategy} from "../src/ISybilScorer.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract MockStrategy {
    address public registryCommunityAddress;

    constructor(address _registryCommunity) {
        registryCommunityAddress = _registryCommunity;
    }

    function registryCommunity() external view returns (address) {
        return registryCommunityAddress;
    }
}

contract GoodDollarSybilTest is Test {
    GoodDollarSybil internal sybil;
    address internal owner = address(0xA11CE);
    address internal listManager = address(0xB0B);
    address internal registryCommunity = address(0xCAFE);
    address internal councilSafe = address(0xC0C1E7);
    address internal stranger = address(0xD1CE);

    function setUp() public {
        ERC1967Proxy proxy = new ERC1967Proxy(
            address(new GoodDollarSybil()),
            abi.encodeWithSelector(GoodDollarSybil.initialize.selector, listManager, owner)
        );
        sybil = GoodDollarSybil(payable(address(proxy)));
    }

    function test_initialize_setsOwnerAndManager() public {
        assertEq(sybil.listManager(), listManager);
        assertEq(sybil.owner(), owner);
    }

    function test_initialize_revertsOnImplementationDirectCall() public {
        GoodDollarSybil impl = new GoodDollarSybil();
        vm.expectRevert("Initializable: contract is already initialized");
        impl.initialize(listManager, owner);
    }

    function test_validate_and_invalidate_byManager() public {
        vm.prank(listManager);
        sybil.validateUser(stranger);
        assertTrue(sybil.userValidity(stranger));

        vm.prank(listManager);
        sybil.invalidateUser(stranger);
        assertFalse(sybil.userValidity(stranger));
    }

    function test_validate_revertsZeroUser() public {
        vm.prank(listManager);
        vm.expectRevert(GoodDollarSybil.ZeroAddress.selector);
        sybil.validateUser(address(0));
    }

    function test_onlyAuthorized_revertsForStranger() public {
        vm.expectRevert(GoodDollarSybil.OnlyAuthorized.selector);
        sybil.validateUser(stranger);
    }

    function test_changeListManager_onlyOwner() public {
        address newManager = address(0xF00D);

        vm.prank(owner);
        sybil.changeListManager(newManager);
        assertEq(sybil.listManager(), newManager);

        vm.prank(newManager);
        sybil.validateUser(stranger);
        assertTrue(sybil.userValidity(stranger));
    }

    function test_changeListManager_revertsZeroAddress() public {
        vm.prank(owner);
        vm.expectRevert(GoodDollarSybil.ZeroAddress.selector);
        sybil.changeListManager(address(0));
    }

    function test_addStrategy_allowsCouncilOrAuthorizedCallers() public {
        MockStrategy strat = new MockStrategy(registryCommunity);

        // registryCommunity allowed
        vm.prank(registryCommunity);
        sybil.addStrategy(address(strat), 0, councilSafe);

        (uint256 threshold, bool active, address council) = sybil.strategies(address(strat));
        assertEq(council, councilSafe);
        assertEq(threshold, 0);
        assertFalse(active);

        // councilSafe also allowed once stored
        vm.prank(councilSafe);
        sybil.addStrategy(address(strat), 0, councilSafe);
    }

    function test_addStrategy_revertsUnauthorized() public {
        MockStrategy strat = new MockStrategy(registryCommunity);

        vm.prank(stranger);
        vm.expectRevert(GoodDollarSybil.OnlyCouncilOrAuthorized.selector);
        sybil.addStrategy(address(strat), 0, councilSafe);
    }

    function test_activateStrategy_setsActive() public {
        MockStrategy strat = new MockStrategy(registryCommunity);
        vm.prank(listManager);
        sybil.addStrategy(address(strat), 0, councilSafe);

        (, bool activeBefore,) = sybil.strategies(address(strat));
        assertFalse(activeBefore);
        sybil.activateStrategy(address(strat));
        (, bool activeAfter,) = sybil.strategies(address(strat));
        assertTrue(activeAfter);
    }

    function test_modifyThreshold_revertsNotSupported() public {
        vm.expectRevert(GoodDollarSybil.NotSupported.selector);
        sybil.modifyThreshold(address(0x1234), 1);
    }

    function test_canExecuteAction_reflectsUserValidity() public {
        bool allowed = sybil.canExecuteAction(stranger, address(0x123));
        assertFalse(allowed);

        vm.prank(owner);
        sybil.validateUser(stranger);
        allowed = sybil.canExecuteAction(stranger, address(0x123));
        assertTrue(allowed);
    }
}
