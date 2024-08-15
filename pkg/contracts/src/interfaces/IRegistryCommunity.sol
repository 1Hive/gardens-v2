// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Metadata} from "allo-v2-contracts/core/interfaces/IRegistry.sol";
import {StrategyStruct} from "../CVStrategyV0_0.sol";

interface IRegistryCommunityV0_0 {
    /*|--------------------------------------------|*/
    /*|                 EVENTS                     |*/
    /*|--------------------------------------------|*/

    event AlloSet(address _allo);
    event CouncilSafeSet(address _safe);
    event CouncilSafeChangeStarted(address _safeOwner, address _newSafeOwner);
    event MemberRegistered(address _member, uint256 _amountStaked);
    event MemberUnregistered(address _member, uint256 _amountReturned);
    event MemberKicked(address _member, address _transferAddress, uint256 _amountReturned);
    event CommunityFeeUpdated(uint256 _newFee);
    event RegistryInitialized(bytes32 _profileId, string _communityName, Metadata _metadata);
    event StrategyAdded(address _strategy);
    event StrategyRemoved(address _strategy);
    event MemberActivatedStrategy(address _member, address _strategy, uint256 _pointsToIncrease);
    event MemberDeactivatedStrategy(address _member, address _strategy);
    event BasisStakedAmountSet(uint256 _newAmount);
    event MemberPowerIncreased(address _member, uint256 _stakedAmount);
    event MemberPowerDecreased(address _member, uint256 _unstakedAmount);
    event PoolCreated(uint256 _poolId, address _strategy, address _community, address _token, Metadata _metadata); // 0x778cac0a

    /*|--------------------------------------------|*/
    /*|              CUSTOM ERRORS                 |*/
    /*|--------------------------------------------|*/

    error AddressCannotBeZero();
    error RegistryCannotBeZero();
    error UserNotInCouncil(address _user);
    error UserNotInRegistry();
    error UserAlreadyRegistered();
    error UserNotGardenOwner();
    error UserAlreadyActivated();
    error UserAlreadyDeactivated();
    error StrategyExists();
    error StrategyDisabled();
    error SenderNotNewOwner();
    error SenderNotStrategy();
    error ValueCannotBeZero();
    error NewFeeGreaterThanMax();
    error KickNotEnabled();
    error PointsDeactivated();
    error DecreaseUnderMinimum();
    error CantDecreaseMoreThanPower(uint256 _decreaseAmount, uint256 _currentPower);

    /*|--------------------------------------------|*/
    /*|              STRUCTS/ENUMS                 |*/
    /*|--------------------------------------------|*/

    struct InitializeParams {
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
        address _strategyTemplate;
    }

    function createPool(address _token, StrategyStruct.InitializeParams memory _params, Metadata memory _metadata)
        external
        returns (uint256 poolId, address strategy);

    function createPool(
        address _strategy,
        address _token,
        StrategyStruct.InitializeParams memory _params,
        Metadata memory _metadata
    ) external returns (uint256 poolId, address strategy);

    function activateMemberInStrategy(address _member, address _strategy) external;

    function deactivateMemberInStrategy(address _member, address _strategy) external;

    function increasePower(uint256 _amountStaked) external;

    function decreasePower(uint256 _amountUnstaked) external;

    function getMemberPowerInStrategy(address _member, address _strategy) external view returns (uint256);

    function getMemberStakedAmount(address _member) external view returns (uint256);

    function addStrategyByPoolId(uint256 poolId) external;

    function addStrategy(address _newStrategy) external;

    function removeStrategyByPoolId(uint256 poolId) external;

    function removeStrategy(address _strategy) external;

    function setCouncilSafe(address payable _safe) external;

    function acceptCouncilSafe() external;

    function isMember(address _member) external view returns (bool _isMember);

    function stakeAndRegisterMember() external;

    function getStakeAmountWithFees() external view returns (uint256);

    function getBasisStakedAmount() external view returns (uint256);

    function setBasisStakedAmount(uint256 _newAmount) external;

    function setCommunityFee(uint256 _newCommunityFee) external;

    function isCouncilMember(address _member) external view returns (bool);

    function unregisterMember() external;

    function kickMember(address _member, address _transferAddress) external;
}
