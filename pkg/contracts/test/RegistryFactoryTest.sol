// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/RegistryFactory/RegistryFactoryV0_0.sol";
import "../src/RegistryCommunity/RegistryCommunityV0_0.sol";
import "../src/interfaces/ISafe.sol";
import {console} from "forge-std/console.sol";

contract RegistryFactoryTest is Test {
    RegistryFactoryV0_0 registryFactory;
    address gardensFeeReceiver = address(0x123);
    address registryCommunityTemplate = address(0x456);
    address strategyTemplate = address(0x789);
    address collateralVaultTemplate = address(0xABC);
    address owner = address(0xDEF);

    address community = address(0x111);
    address keeper = address(0x222);
    address protopian = address(0x333);
    address nonProtopianOwner = address(0x444);

    function setUp() public {
        registryFactory = new RegistryFactoryV0_0();
        registryFactory.initialize(
            owner, gardensFeeReceiver, registryCommunityTemplate, strategyTemplate, collateralVaultTemplate
        );

        // Set up a valid community with a fee
        vm.prank(owner);
        registryFactory.setCommunityValidity(community, true);
        vm.prank(owner);
        registryFactory.setProtocolFee(community, 100); // Fee is 100 wei

        // Set up a keeper
        vm.prank(owner);
        address[] memory keepers = new address[](1);
        keepers[0] = keeper;
        registryFactory.setKeeperAddress(keepers, true);

        // Set up a protopian
        vm.prank(owner);
        address[] memory protopians = new address[](1);
        protopians[0] = protopian;
        registryFactory.setProtopianAddress(protopians, true);

        // Mock the councilSafe() and getOwners() for the community
        vm.mockCall(community, abi.encodeWithSignature("councilSafe()"), abi.encode(address(this)));

        address[] memory owners = new address[](2);
        owners[0] = protopian;
        owners[1] = nonProtopianOwner;

        vm.mockCall(address(this), abi.encodeWithSelector(ISafe.getOwners.selector), abi.encode(owners));
    }

    function testGetProtocolFee_ValidCommunity() public view {
        uint256 fee = registryFactory.getProtocolFee(community);
        console.log("Fee for community:", fee);
        assertEq(fee, 0, "Fee should be 0 for a community with a protopian owner");
    }

    function testGetProtocolFee_InvalidCommunity() public {
        address invalidCommunity = address(0x555);
        vm.expectRevert(abi.encodeWithSelector(RegistryFactoryV0_0.CommunityInvalid.selector, invalidCommunity));
        registryFactory.getProtocolFee(invalidCommunity);
    }

    function testGetProtocolFee_CommunityWithKeeper() public {
        vm.prank(owner);
        address[] memory keepers = new address[](1);
        keepers[0] = community;
        registryFactory.setKeeperAddress(keepers, true);
        uint256 fee = registryFactory.getProtocolFee(community);
        assertEq(fee, 0, "Fee should be 0 for a keeper community");
    }

    function testGetProtocolFee_CommunityWithProtopianOwner() public view {
        uint256 fee = registryFactory.getProtocolFee(community);
        assertEq(fee, 0, "Fee should be 0 for a community with a protopian owner");
    }

    function testGetProtocolFee_CommunityWithoutProtopianOwner() public {
        // Mock the councilSafe() and getOwners() to exclude protopians
        address[] memory ownersWithoutProtopian = new address[](1);
        ownersWithoutProtopian[0] = nonProtopianOwner;
        vm.mockCall(address(this), abi.encodeWithSelector(ISafe.getOwners.selector), abi.encode(ownersWithoutProtopian));

        uint256 fee = registryFactory.getProtocolFee(community);
        assertEq(fee, 100, "Fee should be 100 wei for a community without a protopian owner");
    }
}
