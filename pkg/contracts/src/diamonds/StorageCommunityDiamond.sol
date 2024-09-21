// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {BaseDiamond} from "@src/diamonds/BaseDiamond.sol";
import {LibDiamond} from "@src/diamonds/libraries/LibDiamond.sol";

import {IRegistry} from "allo-v2-contracts/core/interfaces/IRegistry.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ISafe} from "@src/interfaces/ISafe.sol";
import {FAllo} from "@src/interfaces/FAllo.sol";
import {Metadata} from "allo-v2-contracts/core/libraries/Metadata.sol";

/*|--------------------------------------------|*/
/*|              STRUCTS/ENUMS                 |*/
/*|--------------------------------------------|*/

/// @dev Initialize parameters for the contract
/// @param _allo The Allo contract address
/// @param _gardenToken The token used to stake in the community
/// @param _registerStakeAmount The amount of tokens required to register a member
/// @param _communityFee The fee charged to the community for each registration
/// @param _nonce The nonce used to create new strategy clones
/// @param _registryFactory The address of the registry factory
/// @param _feeReceiver The address that receives the community fee
/// @param _metadata The covenant IPFS hash of the community
/// @param _councilSafe The council safe contract address
/// @param _communityName The community name
/// @param _isKickEnabled Enable or disable the kick feature
struct RegistryCommunityInitializeParamsV0_0 {
    address _allo;
    IERC20 _gardenToken;
    uint256 _registerStakeAmount;
    uint256 _communityFee;
    uint256 _nonce;
    address _registryFactory;
    address _feeReceiver;
    Metadata _metadata;
    address payable _councilSafe;
    string _communityName;
    bool _isKickEnabled;
    string covenantIpfsHash;
}

struct Member {
    address member;
    uint256 stakedAmount;
    bool isRegistered;
}

struct Strategies {
    address[] strategies;
}
struct RoleData {
    mapping(address => bool) members;
    bytes32 adminRole;
}
abstract contract StorageCommunityDiamond is BaseDiamond {
    /*|--------------------------------------------|*/
    /*|           CONSTANTS & IMMUTABLE            |*/
    /*|--------------------------------------------|*/
   
    /*|--------------------------------------------|*/
    /*|                 STORAGE                    |*/
    /*|--------------------------------------------|*/

    uint8 private _initialized;                         //  || SLOT 0  
    bool private _initializing;                         //  || SLOT 0
    uint256[50] private __gap1;                         //  || SLOT 1
    address public _owner;                              //  || SLOT 51
    uint256[49] private __gap2;                         //  || SLOT 52
    uint256 private _status;                            //  || SLOT 101
    uint256[49] private __gap3;                         //  || SLOT 102
    uint256[50] private __gap4;                         //  || SLOT 151
    mapping(bytes32 => RoleData) private _roles;        //  || SLOT 201
    uint256[49] private __gap5;                         //  || SLOT 202
    
    uint256 public registerStakeAmount;                 //  || SLOT 251
    uint256 public communityFee;                        //  || SLOT 252
    uint256 public cloneNonce;                          //  || SLOT 253
    bytes32 public profileId;                           //  || SLOT 254
    bool public isKickEnabled;                          //  || SLOT 255
    address public feeReceiver;                         //  || SLOT 255
    address public registryFactory;                     //  || SLOT 256
    address public collateralVaultTemplate;             //  || SLOT 257
    address public strategyTemplate;                    //  || SLOT 258
    address payable public pendingCouncilSafe;          //  || SLOT 259
    IRegistry public registry;                          //  || SLOT 260
    IERC20 public gardenToken;                          //  || SLOT 261
    ISafe public councilSafe;                           //  || SLOT 262
    FAllo public allo;                                  //  || SLOT 263
    string public communityName;                        //  || SLOT 264
    string public covenantIpfsHash;                     //  || SLOT 265
    mapping(address => bool) public enabledStrategies;  //  || SLOT 266
    mapping(address => mapping(address => uint256)) public memberPowerInStrategy; //  || SLOT 267
    mapping(address => Member) public addressToMemberInfo; //  || SLOT 268
    mapping(address => address[]) public strategiesByMember; //  || SLOT 269
    mapping(address => mapping(address => bool)) public memberActivatedInStrategies; //  || SLOT 270
    address[] public initialMembers;                    //  || SLOT 271
    uint256[50] private __gap6;                         //  || SLOT 272
    /*|--------------------------------------------|*/
    /*|                 STORAGE                    |*/
    /*|--------------------------------------------|*/
}
