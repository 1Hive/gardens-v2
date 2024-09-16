// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {RegistryCommunityV0_0} from "./RegistryCommunityV0_0.sol";
import {ProxyOwnableUpgrader} from "./ProxyOwnableUpgrader.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {Clone} from "allo-v2-contracts/core/libraries/Clone.sol";

struct CommunityInfo {
    uint256 fee;
    bool valid;
}
/// @custom:oz-upgrades-from RegistryFactory

contract RegistryFactoryV0_0 is ProxyOwnableUpgrader {
    uint256 public nonce;

    mapping(address => CommunityInfo) communityToInfo;
    address public gardensFeeReceiver;
    address public registryCommunityTemplate;
    address public strategyTemplate;
    address public collateralVaultTemplate;

    /*|--------------------------------------------|*/
    /*|                 EVENTS                     |*/
    /*|--------------------------------------------|*/

    event FeeReceiverSet(address _newFeeReceiver);
    event ProtocolFeeSet(address _community, uint256 _newProtocolFee);
    event CommunityCreated(address _registryCommunity);
    event CommunityValiditySet(address _community, bool _isValid);

    /*|--------------------------------------------|*/
    /*|                 ERRORS                     |*/
    /*|--------------------------------------------|*/

    error CommunityInvalid(address _community);
    error AddressCannotBeZero();

    /*|--------------------------------------------|*/
    /*|                 MODIFIERS                  |*/
    /*|--------------------------------------------|*/
    
    function _revertZeroAddress(address _address) internal pure virtual {
        if (_address == address(0)) revert AddressCannotBeZero();
    }
    /// @param template: address of the template contract for creating new registries
    /// @dev Set the address of the template contract for creating new registries 
    function setRegistryCommunityTemplate(address template) external onlyOwner {
        registryCommunityTemplate = template;
    }
    
    /// @param template: address of the template contract for creating new strategies
    /// @dev Set the address of the template contract for creating new strategies 
    function setStrategyTemplate(address template) external onlyOwner {
        strategyTemplate = template;
    }

    /// @param template: address of the template contract for creating new collateral vaults
    /// @dev Set the address of the template contract for creating new collateral vaults 
    function setCollateralVaultTemplate(address template) external onlyOwner {
        collateralVaultTemplate = template;
    }

    /// @param _owner: address of the owner of the registry  
    /// @param _gardensFeeReceiver: address of the receiver of the fees 
    /// @param _registryCommunityTemplate: address of the template contract for creating new registries 
    /// @param _strategyTemplate: address of the template contract for creating new strategies
    /// @param _collateralVaultTemplate: address of the template contract for creating new collateral vaults
    // slither-disable-next-line unprotected-upgrade
    /// @notice Initializes the contract
    /// @param _owner The owner of the contract
    /// @param _gardensFeeReceiver The address that will receive the fees
    /// @param _registryCommunityTemplate The address of the template for the registry
    /// @param _strategyTemplate The address of the template for the strategy   
    /// @param _collateralVaultTemplate The address of the template for the collateral vault
    function initialize(
        address _owner,
        address _gardensFeeReceiver,
        address _registryCommunityTemplate,
        address _strategyTemplate,
        address _collateralVaultTemplate
    ) public virtual initializer {
        super.initialize(_owner);
        nonce = 0;
        _revertZeroAddress(_gardensFeeReceiver);
        _revertZeroAddress(_registryCommunityTemplate);
        _revertZeroAddress(_collateralVaultTemplate);
        gardensFeeReceiver = _gardensFeeReceiver;
        registryCommunityTemplate = _registryCommunityTemplate;
        strategyTemplate = _strategyTemplate;
        collateralVaultTemplate = _collateralVaultTemplate;
        emit FeeReceiverSet(_gardensFeeReceiver);
        // setReceiverAddress(_gardensFeeReceiver); //onlyOwner
    }
    /// @notice Creates a new registry
    /// @param params The parameters to initialize the registry
    /// @return _createdRegistryAddress The address of the created registry
    function createRegistry(RegistryCommunityV0_0.InitializeParams memory params)
        public
        virtual
        returns (address _createdRegistryAddress)
    {
        params._nonce = nonce++;
        params._registryFactory = address(this);

        ERC1967Proxy proxy = new ERC1967Proxy(
            address(registryCommunityTemplate),
            abi.encodeWithSelector(
                RegistryCommunityV0_0.initialize.selector, params, strategyTemplate, collateralVaultTemplate, owner()
            )
        );

        RegistryCommunityV0_0 registryCommunity = RegistryCommunityV0_0(payable(address(proxy)));

        // registryCommunity.initialize(params);
        communityToInfo[address(registryCommunity)].valid = true;
        emit CommunityCreated(address(registryCommunity));
        return address(registryCommunity);
    }

    /// @notice Sets the address that will receive the fees
    /// @param _newFeeReceiver The address that will receive the fees
    function setReceiverAddress(address _newFeeReceiver) public virtual onlyOwner {
        _revertZeroAddress(_newFeeReceiver);
        gardensFeeReceiver = _newFeeReceiver;
        emit FeeReceiverSet(_newFeeReceiver);
    }

    /// @notice Gets the address that will receive the fees
    /// @return address The address that will receive the fees
    function getGardensFeeReceiver() external view virtual returns (address) {
        return gardensFeeReceiver;
    }

    /// @notice Sets the protocol fee for a community
    /// @param _community the address of the community
    /// @param _newProtocolFee the new protocol fee
    function setProtocolFee(address _community, uint256 _newProtocolFee) public virtual onlyOwner {
        communityToInfo[_community].fee = _newProtocolFee;
        emit ProtocolFeeSet(_community, _newProtocolFee);
    }

    /// @dev Sets the validity of a community
    /// @param _community the address of the community
    /// @param _isValid the new validity
    function setCommunityValidity(address _community, bool _isValid) public virtual onlyOwner {
        communityToInfo[_community].valid = _isValid;
        emit CommunityValiditySet(_community, _isValid);
    }

    /// @notice Gets the validity of a community
    /// @param _community the address of the community
    function getCommunityValidity(address _community) external view virtual returns (bool) {
        return communityToInfo[_community].valid;
    }

    /// @notice Gets the protocol fee for a community
    /// @param _community: The address of the community
    function getProtocolFee(address _community) external view virtual returns (uint256) {
        if (!communityToInfo[_community].valid) {
            revert CommunityInvalid(_community);
        }

        return communityToInfo[_community].fee;
    }

    uint256[50] private __gap;
}
