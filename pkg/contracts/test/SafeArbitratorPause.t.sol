// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {SafeArbitrator} from "../src/SafeArbitrator.sol";
import {IArbitrable} from "../src/interfaces/IArbitrable.sol";
import {MockPauseController} from "./helpers/PauseHelpers.sol";
import {ControlledPauseUpgradeable} from "../src/pausing/ControlledPauseUpgradeable.sol";

contract PauseArbitrable is IArbitrable {
    bool public ruled;

    function rule(uint256, uint256) external {
        ruled = true;
    }

    receive() external payable {}
}

contract SafeArbitratorPauseTest is Test {
    SafeArbitrator internal arbitrator;
    MockPauseController internal controller;
    PauseArbitrable internal arbitrable;
    address internal tribunal = address(0xCAFE);

    function setUp() public {
        arbitrator = SafeArbitrator(
            payable(address(
                    new ERC1967Proxy(
                        address(new SafeArbitrator()), abi.encodeCall(SafeArbitrator.initialize, (0, address(this)))
                    )
                ))
        );
        controller = new MockPauseController();
        arbitrator.setPauseController(address(controller));
        arbitrable = new PauseArbitrable();
        vm.prank(address(arbitrable));
        arbitrator.registerSafe(tribunal);
    }

    function test_pause_blocks_new_disputes_but_allows_ruling_and_cancellation() public {
        vm.startPrank(address(arbitrable));
        uint256 first = arbitrator.createDispute(2, "");
        uint256 second = arbitrator.createDispute(2, "");
        vm.stopPrank();

        controller.setGlobalPaused(true);
        vm.prank(address(arbitrable));
        vm.expectRevert(abi.encodeWithSelector(ControlledPauseUpgradeable.ContractPaused.selector, address(controller)));
        arbitrator.createDispute(2, "");

        vm.prank(address(arbitrable));
        vm.expectRevert(abi.encodeWithSelector(ControlledPauseUpgradeable.ContractPaused.selector, address(controller)));
        arbitrator.registerSafe(tribunal);

        vm.prank(tribunal);
        arbitrator.executeRuling(first, 1, address(arbitrable));
        assertTrue(arbitrable.ruled());

        vm.prank(address(arbitrable));
        arbitrator.cancelDispute(second);
    }
}
