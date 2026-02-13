// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import "forge-std/Test.sol";

import {DiamondInit} from "../src/diamonds/upgradeInitializers/DiamondInit.sol";
import {
    DiamondMultiInit,
    AddressAndCalldataLengthDoNotMatch
} from "../src/diamonds/upgradeInitializers/DiamondMultiInit.sol";
import {IDiamondCut} from "../src/diamonds/interfaces/IDiamondCut.sol";
import {IDiamondLoupe} from "../src/diamonds/interfaces/IDiamondLoupe.sol";
import {IERC165} from "../src/diamonds/interfaces/IERC165.sol";
import {IERC173} from "../src/diamonds/interfaces/IERC173.sol";
import {LibDiamond} from "../src/diamonds/libraries/LibDiamond.sol";

contract InitSupportFacet {
    function mark(bytes4 key) external {
        LibDiamond.diamondStorage().supportedInterfaces[key] = true;
    }
}

contract DiamondInitHarness {
    constructor(address owner) {
        LibDiamond.setContractOwner(owner);
    }

    function runInit(address init, bytes memory data) external {
        LibDiamond.initializeDiamondCut(init, data);
    }

    function isSupported(bytes4 interfaceId) external view returns (bool) {
        return LibDiamond.diamondStorage().supportedInterfaces[interfaceId];
    }
}

contract DiamondUpgradeInitializersTest is Test {
    DiamondInitHarness private diamond;
    DiamondInit private singleInit;
    DiamondMultiInit private multiInit;
    InitSupportFacet private supportA;
    InitSupportFacet private supportB;

    address private owner;

    function setUp() public {
        owner = makeAddr("owner");
        diamond = new DiamondInitHarness(owner);
        singleInit = new DiamondInit();
        multiInit = new DiamondMultiInit();
        supportA = new InitSupportFacet();
        supportB = new InitSupportFacet();
    }

    function test_DiamondInit_setsBaseInterfaces() public {
        diamond.runInit(address(singleInit), abi.encodeWithSelector(DiamondInit.init.selector));

        assertTrue(diamond.isSupported(type(IERC165).interfaceId));
        assertTrue(diamond.isSupported(type(IDiamondCut).interfaceId));
        assertTrue(diamond.isSupported(type(IDiamondLoupe).interfaceId));
        assertTrue(diamond.isSupported(type(IERC173).interfaceId));
    }

    function test_DiamondMultiInit_executesAllInitializers() public {
        address[] memory targets = new address[](2);
        targets[0] = address(supportA);
        targets[1] = address(supportB);

        bytes[] memory calls = new bytes[](2);
        bytes4 keyA = bytes4(keccak256("A"));
        bytes4 keyB = bytes4(keccak256("B"));
        calls[0] = abi.encodeWithSelector(InitSupportFacet.mark.selector, keyA);
        calls[1] = abi.encodeWithSelector(InitSupportFacet.mark.selector, keyB);

        diamond.runInit(
            address(multiInit),
            abi.encodeWithSelector(DiamondMultiInit.multiInit.selector, targets, calls)
        );

        assertTrue(diamond.isSupported(keyA));
        assertTrue(diamond.isSupported(keyB));
    }

    function test_DiamondMultiInit_revertsOnLengthMismatch() public {
        address[] memory targets = new address[](2);
        targets[0] = address(supportA);
        targets[1] = address(supportB);

        bytes[] memory calls = new bytes[](1);
        calls[0] = abi.encodeWithSelector(InitSupportFacet.mark.selector, bytes4(0));

        vm.expectRevert(
            abi.encodeWithSelector(
                AddressAndCalldataLengthDoNotMatch.selector,
                targets.length,
                calls.length
            )
        );
        diamond.runInit(
            address(multiInit),
            abi.encodeWithSelector(DiamondMultiInit.multiInit.selector, targets, calls)
        );
    }
}
