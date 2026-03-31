// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import {CVStrategy, ArbitrableConfig, CVParams} from "../src/CVStrategy/CVStrategy.sol";
import {IArbitrator} from "../src/interfaces/IArbitrator.sol";
import {StrategyDiamondConfigurator} from "./helpers/StrategyDiamondConfigurator.sol";
import "@superfluid-finance/ethereum-contracts/contracts/apps/SuperTokenV1Library.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract ConnectGDAForkTest is Test {
    CVStrategy cvStrategy = CVStrategy(payable(address(0x3764607A0a721981780B798a02C2B1691D6bAa39)));
    address tribunal = address(0x9a17De1f0caD0c592F656410997E4B685d339029);
    address council = address(0x26746DdB7A853DDb5B12677Da60f40FA7e8F794a); // prod data team council address
    address allowlistMember = address(0x703550294eDD3E1A700f3F0D2347b037BC6A0030); // prod data team allowlist member address
    address buildersGDA = address(0xAFcAb1Ab378354b8Ce0dBD0aE2e2C0deA01dcF0b); // prod good builders round 2 GDA address

    ERC20 gd = ERC20(0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A); // prod GoodDollar token address

    function setUp() public {
        vm.createSelectFork("https://forno.celo.org", 41312794);
        CVStrategy upgrade = new CVStrategy();
        vm.prank(tribunal);
        cvStrategy.upgradeTo(address(upgrade));

        // Configure diamond facets after upgrade
        StrategyDiamondConfigurator configurator = new StrategyDiamondConfigurator();
        address owner = cvStrategy.owner();
        vm.startPrank(owner);
        cvStrategy.diamondCut(configurator.getFacetCuts(), address(0), "");
        vm.stopPrank();
    }

    function test_connectSuperfluidGDA_council() public {
        // Council should be able to connect
        vm.prank(council);
        cvStrategy.connectSuperfluidGDA(buildersGDA);
        vm.warp(block.timestamp + 1 hours); // Increase block timestamp
        vm.roll(block.number + 1); // Mine the next block
        assertGt(gd.balanceOf(address(cvStrategy)), 0, "no stream created");
    }

    function test_disconnectSuperfluidGDA_council() public {
        // Council should be able to disconnect
        vm.prank(council);
        cvStrategy.connectSuperfluidGDA(buildersGDA);
        vm.prank(council);
        cvStrategy.disconnectSuperfluidGDA(buildersGDA);
        // No revert expected, event should be emitted (not checked here)
    }

    function test_connectSuperfluidGDA_member() public {
        // Simulate a member address
        address member = address(0x1234567890123456789012345678901234567890);
        // Assume member is allowed (simulate allowlist if needed)
        vm.prank(member);
        // Should revert if member is not council or not allowed
        vm.expectRevert();
        cvStrategy.connectSuperfluidGDA(buildersGDA);
    }

    function test_disconnectSuperfluidGDA_member() public {
        // Simulate a member address
        address member = address(0x1234567890123456789012345678901234567890);
        vm.prank(member);
        vm.expectRevert();
        cvStrategy.disconnectSuperfluidGDA(buildersGDA);
    }

    function test_connectSuperfluidGDA_member_allowed() public {
        vm.prank(allowlistMember);
        cvStrategy.connectSuperfluidGDA(buildersGDA);
    }

    function test_disconnectSuperfluidGDA_member_allowed() public {
        vm.prank(allowlistMember);
        cvStrategy.connectSuperfluidGDA(buildersGDA);
        vm.prank(allowlistMember);
        cvStrategy.disconnectSuperfluidGDA(buildersGDA);
    }
}
