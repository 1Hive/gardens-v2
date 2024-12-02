// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {BaseDiamond} from "@src/diamonds/BaseDiamond.sol";
import {LibDiamond} from "@src/diamonds/libraries/LibDiamond.sol";


struct CommunityInfo {
    uint256 fee;
    bool valid;
}

contract RegistryFactoryDiamond is BaseDiamond {
    /*|--------------------------------------------|*/
    /*|           CONSTANTS & IMMUTABLE            |*/
    /*|--------------------------------------------|*/
    // string public constant VERSION = "0.0";
    /*|--------------------------------------------|*/
    /*|                 STORAGE                    |*/
    /*|--------------------------------------------|*/
    uint8 private  _initialized;
    bool private _initializing;
    uint256[50] private __gap1;
    address public  _owner;
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
