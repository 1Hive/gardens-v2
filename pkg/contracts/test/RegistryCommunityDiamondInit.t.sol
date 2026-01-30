// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import "forge-std/Test.sol";

import {RegistryCommunityDiamondInit} from "../src/RegistryCommunity/RegistryCommunityDiamondInit.sol";
import {IERC165} from "../src/diamonds/interfaces/IERC165.sol";
import {IDiamondCut} from "../src/diamonds/interfaces/IDiamondCut.sol";
import {IDiamondLoupe} from "../src/diamonds/interfaces/IDiamondLoupe.sol";
import {IERC173} from "../src/diamonds/interfaces/IERC173.sol";

contract RegistryCommunityDiamondInitTest is Test {
    function test_init_registersInterfaces() public {
        RegistryCommunityDiamondInit init = new RegistryCommunityDiamondInit();
        init.init();

        bytes32 position = keccak256("diamond.standard.diamond.storage");
        bytes32 supportedInterfacesSlot = bytes32(uint256(position) + 2);

        bytes32 key = keccak256(abi.encode(type(IERC165).interfaceId, supportedInterfacesSlot));
        assertEq(vm.load(address(init), key), bytes32(uint256(1)));

        key = keccak256(abi.encode(type(IDiamondCut).interfaceId, supportedInterfacesSlot));
        assertEq(vm.load(address(init), key), bytes32(uint256(1)));

        key = keccak256(abi.encode(type(IDiamondLoupe).interfaceId, supportedInterfacesSlot));
        assertEq(vm.load(address(init), key), bytes32(uint256(1)));

        key = keccak256(abi.encode(type(IERC173).interfaceId, supportedInterfacesSlot));
        assertEq(vm.load(address(init), key), bytes32(uint256(1)));
    }
}
