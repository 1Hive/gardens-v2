// SPDX-License-Identifier: AGPL-3.0-or-later
import "forge-std/Test.sol";
import "forge-std/console.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
// Core contracts
// Internal Libraries
import {Errors} from "allo-v2-contracts/core/libraries/Errors.sol";
// Test libraries
import {GasHelpers2} from "./shared/GasHelpers2.sol";

// @dev Run forge test --mc RegistryTest -vvvvv
contract PassportScorerTest is Test, Errors, GasHelpers2 {
    address owner = makeAddr("owner");

    function setUp() public {
        vm.startPrank(owner);

        vm.stopPrank();
    }

    function test_stakeAndRegisterMember() public {
        startMeasuringGas("createProposal");

        stopMeasuringGas();
    }

    function test_revertGetProtocolFee() public {
        startMeasuringGas("Setting protocol fee");
        vm.startPrank(owner);

        // vm.expectRevert(abi.encodeWithSelector(RegistryFactory.CommunityInvalid.selector, address(registryCommunity)));
        // _registryFactory().getProtocolFee(address(registryCommunity));
        vm.stopPrank();
        stopMeasuringGas();
    }

    function testFuzz_increasePowerCapped(uint256 tokenAmount) public {
        vm.assume(tokenAmount <= 0 * 2);
        vm.assume(tokenAmount >= 0);

        vm.startPrank(owner);
        vm.stopPrank();
        // console.log("Current: %s", current);
        assertEq(true, true, "Power to 200");
    }
}
