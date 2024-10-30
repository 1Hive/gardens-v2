// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {IRegistry} from "allo-v2-contracts/core/interfaces/IRegistry.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ISafe} from "../../../interfaces/ISafe.sol";
import {FAllo} from "../../../interfaces/FAllo.sol";
import {IRegistryCommunityBase} from "./IRegistryCommunityBase.sol";

library RegistryCommunityStorage {
    bytes32 internal constant STORAGE_SLOT = 0x0;

    struct Layout {
        /// @notice The amount of tokens required to register a member
        uint256 registerStakeAmount;
        /// @notice The fee charged to the community for each registration
        uint256 communityFee;
        /// @notice The nonce used to create new strategy clones
        uint256 cloneNonce;
        /// @notice The profileId of the community in the Allo Registry
        bytes32 profileId;
        /// @notice Enable or disable the kick feature
        bool isKickEnabled;
        /// @notice The address that receives the community fee
        address feeReceiver;
        /// @notice The address of the registry factory
        address registryFactory;
        /// @notice The address of the collateral vault template
        address collateralVaultTemplate;
        /// @notice The address of the strategy template
        address strategyTemplate;
        /// @notice The address of the pending council safe owner
        address payable pendingCouncilSafe;
        /// @notice The Registry Allo contract
        IRegistry registry;
        /// @notice The token used to stake in the community
        IERC20 gardenToken;
        /// @notice The council safe contract address
        ISafe councilSafe;
        /// @notice The Allo contract address
        FAllo allo;
        /// @notice The community name
        string communityName;
        /// @notice The covenant IPFS hash of community
        string covenantIpfsHash;
        // mapping(address => bool) public tribunalMembers;

        /// @notice List of enabled/disabled strategies
        mapping(address strategy => bool isEnabled) enabledStrategies;
        /// @notice Power points for each member in each strategy
        mapping(address strategy => mapping(address member => uint256 power)) memberPowerInStrategy;
        /// @notice Member information as the staked amount and if is registered in the community
        mapping(address member => IRegistryCommunityBase.Member) addressToMemberInfo;
        /// @notice List of strategies for each member are activated
        mapping(address member => address[] strategiesAddresses) strategiesByMember;
        /// @notice Mapping to check if a member is activated in a strategy
        mapping(address member => mapping(address strategy => bool isActivated)) memberActivatedInStrategies;
        /// @notice List of initial members to be added as pool managers in the Allo Pool
        address[] initialMembers;
    }
}
