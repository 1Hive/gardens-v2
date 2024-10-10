// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {BaseDiamond} from "./BaseDiamond.sol";
import {LibDiamond} from "./libraries/LibDiamond.sol";
import {IDiamondCut} from "./interfaces/IDiamondCut.sol";
import {IDiamondLoupe} from "./interfaces/IDiamondLoupe.sol";
import {IERC173} from "./interfaces/IERC173.sol";
//import { IERC165} from "./interfaces/IERC165.sol";

import {IERC1822Proxiable} from "@openzeppelin/contracts/interfaces/draft-IERC1822.sol";
// When no function exists for function called

struct CommunityInfo {
    uint256 fee;
    bool valid;
}

contract RegistryFactoryDiamond is BaseDiamond {
    /*|--------------------------------------------|*/
    /*|           CONSTANTS & IMMUTABLE            |*/
    /*|--------------------------------------------|*/
    string public constant VERSION = "0.0";
    /*|--------------------------------------------|*/
    /*|                 STORAGE                    |*/
    /*|--------------------------------------------|*/
    uint8 private _initialized;
    bool private _initializing;
    uint256[50] private __gap1;
    address public _owner;
    uint256[49] private __gap2;
    uint256 public nonce;

    mapping(address => CommunityInfo) communityToInfo;
    address public gardensFeeReceiver;
    address public registryCommunityTemplate;
    address public strategyTemplate;
    address public collateralVaultTemplate;
    uint256[50] private __gap3;
    /*|--------------------------------------------|*/
    /*|                 STORAGE                    |*/
    /*|--------------------------------------------|*/
}
