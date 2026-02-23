// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import "forge-std/Test.sol";

import {RegistryCommunityDiamondInit} from "../src/RegistryCommunity/RegistryCommunityDiamondInit.sol";
import {LibDiamond} from "../src/diamonds/libraries/LibDiamond.sol";
import {IDiamondLoupe} from "../src/diamonds/interfaces/IDiamondLoupe.sol";
import {IDiamondCut} from "../src/diamonds/interfaces/IDiamondCut.sol";
import {IERC173} from "../src/diamonds/interfaces/IERC173.sol";
import {IERC165} from "../src/diamonds/interfaces/IERC165.sol";

contract DiamondInitHarness {
    function callInit(address init) external {
        (bool ok, ) = init.delegatecall(abi.encodeWithSelector(RegistryCommunityDiamondInit.init.selector));
        require(ok, "init failed");
    }

    function supportsInterface(bytes4 interfaceId) external view returns (bool) {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        return ds.supportedInterfaces[interfaceId];
    }
}

contract DirectDiamondInitHarness is RegistryCommunityDiamondInit {
    function supportsInterface(bytes4 interfaceId) external view returns (bool) {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        return ds.supportedInterfaces[interfaceId];
    }
}

contract RegistryCommunityDiamondInitTest is Test {
    function test_init_registers_interfaces() public {
        RegistryCommunityDiamondInit init = new RegistryCommunityDiamondInit();
        DiamondInitHarness harness = new DiamondInitHarness();

        harness.callInit(address(init));

        assertTrue(harness.supportsInterface(type(IERC165).interfaceId));
        assertTrue(harness.supportsInterface(type(IDiamondCut).interfaceId));
        assertTrue(harness.supportsInterface(type(IDiamondLoupe).interfaceId));
        assertTrue(harness.supportsInterface(type(IERC173).interfaceId));
    }

    function test_init_direct_registers_interfaces() public {
        DirectDiamondInitHarness init = new DirectDiamondInitHarness();

        init.init();

        assertTrue(init.supportsInterface(type(IERC165).interfaceId));
        assertTrue(init.supportsInterface(type(IDiamondCut).interfaceId));
        assertTrue(init.supportsInterface(type(IDiamondLoupe).interfaceId));
        assertTrue(init.supportsInterface(type(IERC173).interfaceId));
    }
}
