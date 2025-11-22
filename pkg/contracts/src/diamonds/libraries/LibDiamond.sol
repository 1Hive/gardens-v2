// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title LibDiamond
 * @author Nick Mudge (nick@perfectabstractions.com)
 * @notice EIP-2535 Diamonds: https://eips.ethereum.org/EIPS/eip-2535
 */
import {IDiamond} from "../interfaces/IDiamond.sol";
import {IDiamondCut} from "../interfaces/IDiamondCut.sol";

// Remember to add the loupe functions from DiamondLoupeFacet to the diamond.
// The loupe functions are required by the EIP2535 Diamonds standard

error NoSelectorsGivenToAdd();
error NotContractOwner(address _user, address _contractOwner);
error NoSelectorsProvidedForFacetForCut(address _facetAddress);
error CannotAddSelectorsToZeroAddress(bytes4[] _selectors);
error NoBytecodeAtAddress(address _contractAddress, string _message);
error IncorrectFacetCutAction(uint8 _action);
error CannotAddFunctionToDiamondThatAlreadyExists(bytes4 _selector, string _selectorSignature);
error CannotReplaceFunctionsFromFacetWithZeroAddress(bytes4[] _selectors);
error CannotReplaceImmutableFunction(bytes4 _selector);
error CannotReplaceFunctionWithTheSameFunctionFromTheSameFacet(bytes4 _selector);
error CannotReplaceFunctionThatDoesNotExists(bytes4 _selector);
error RemoveFacetAddressMustBeZeroAddress(address _facetAddress);
error CannotRemoveFunctionThatDoesNotExist(bytes4 _selector);
error CannotRemoveImmutableFunction(bytes4 _selector);
error InitializationFunctionReverted(address _initializationContractAddress, bytes _calldata);

library LibDiamond {
    bytes32 constant DIAMOND_STORAGE_POSITION = keccak256("diamond.standard.diamond.storage");
    bytes32 constant _IS_INITALIZED_SLOT = keccak256("diamond.contract.isInitialized");

    struct FacetAddressAndSelectorPosition {
        address facetAddress;
        uint16 selectorPosition;
    }

    struct DiamondStorage {
        // function selector => facet address and selector position in selectors array
        mapping(bytes4 => FacetAddressAndSelectorPosition) facetAddressAndSelectorPosition;
        bytes4[] selectors;
        mapping(bytes4 => bool) supportedInterfaces;
        // owner of the contract
        address contractOwner;
        bool isInitialized;
    }

    function diamondStorage() internal pure returns (DiamondStorage storage ds) {
        bytes32 position = DIAMOND_STORAGE_POSITION;
        assembly {
            ds.slot := position
        }
    }

    function isInitialized() internal view returns (bool) {
        return diamondStorage().isInitialized;
    }

    function setInitialized() internal {
        diamondStorage().isInitialized = true;
    }

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    function setContractOwner(address _newOwner) internal {
        DiamondStorage storage ds = diamondStorage();
        address previousOwner = ds.contractOwner;
        ds.contractOwner = _newOwner;
        emit OwnershipTransferred(previousOwner, _newOwner);
    }

    function contractOwner() internal view returns (address contractOwner_) {
        contractOwner_ = diamondStorage().contractOwner;
    }

    function enforceIsContractOwner() internal view {
        if (msg.sender != diamondStorage().contractOwner) {
            revert NotContractOwner(msg.sender, diamondStorage().contractOwner);
        }
    }

    event DiamondCut(IDiamondCut.FacetCut[] _diamondCut, address _init, bytes _calldata);

    // Internal function version of diamondCut
    function diamondCut(IDiamondCut.FacetCut[] memory _diamondCut, address _init, bytes memory _calldata) internal {
        for (uint256 facetIndex; facetIndex < _diamondCut.length; facetIndex++) {
            bytes4[] memory functionSelectors = _diamondCut[facetIndex].functionSelectors;
            address facetAddress = _diamondCut[facetIndex].facetAddress;
            if (functionSelectors.length == 0) {
                revert NoSelectorsProvidedForFacetForCut(facetAddress);
            }
            IDiamondCut.FacetCutAction action = _diamondCut[facetIndex].action;
            if (action == IDiamond.FacetCutAction.Add) {
                addFunctions(facetAddress, functionSelectors);
            } else if (action == IDiamond.FacetCutAction.Replace) {
                replaceFunctions(facetAddress, functionSelectors);
            } else if (action == IDiamond.FacetCutAction.Remove) {
                removeFunctions(facetAddress, functionSelectors);
            } else if (action == IDiamond.FacetCutAction.Auto) {
                _autoAddOrReplaceFunctions(facetAddress, functionSelectors);
            } else {
                revert IncorrectFacetCutAction(uint8(action));
            }
        }
        emit DiamondCut(_diamondCut, _init, _calldata);
        initializeDiamondCut(_init, _calldata);
    }

    function _autoAddOrReplaceFunctions(address _facetAddress, bytes4[] memory _functionSelectors) private {
        if (_facetAddress == address(0)) {
            revert CannotAddSelectorsToZeroAddress(_functionSelectors);
        }
        DiamondStorage storage ds = diamondStorage();
        enforceHasContractCode(_facetAddress, "LibDiamondCut: Auto facet has no code");

        bytes4[] memory addSelectors = new bytes4[](_functionSelectors.length);
        uint256 addCount;
        bytes4[] memory replaceSelectors = new bytes4[](_functionSelectors.length);
        uint256 replaceCount;

        for (uint256 selectorIndex; selectorIndex < _functionSelectors.length; selectorIndex++) {
            bytes4 selector = _functionSelectors[selectorIndex];
            address oldFacetAddress = ds.facetAddressAndSelectorPosition[selector].facetAddress;

            if (oldFacetAddress == address(0)) {
                addSelectors[addCount++] = selector;
            } else if (oldFacetAddress != _facetAddress) {
                replaceSelectors[replaceCount++] = selector;
            }
            // If oldFacetAddress == _facetAddress we skip since selector already points to new facet
        }

        if (addCount > 0) {
            addFunctions(_facetAddress, _shrinkSelectorArray(addSelectors, addCount));
        }
        if (replaceCount > 0) {
            replaceFunctions(_facetAddress, _shrinkSelectorArray(replaceSelectors, replaceCount));
        }
    }

    function addFunctions(address _facetAddress, bytes4[] memory _functionSelectors) internal {
        if (_facetAddress == address(0)) {
            revert CannotAddSelectorsToZeroAddress(_functionSelectors);
        }
        DiamondStorage storage ds = diamondStorage();
        uint16 selectorCount = uint16(ds.selectors.length);
        enforceHasContractCode(_facetAddress, "LibDiamondCut: Add facet has no code");
        for (uint256 selectorIndex; selectorIndex < _functionSelectors.length; selectorIndex++) {
            bytes4 selector = _functionSelectors[selectorIndex];
            address oldFacetAddress = ds.facetAddressAndSelectorPosition[selector].facetAddress;
            if (oldFacetAddress != address(0)) {
                revert CannotAddFunctionToDiamondThatAlreadyExists(selector, _selectorDisplayName(selector));
            }
            ds.facetAddressAndSelectorPosition[selector] = FacetAddressAndSelectorPosition(_facetAddress, selectorCount);
            ds.selectors.push(selector);
            selectorCount++;
        }
    }

    function replaceFunctions(address _facetAddress, bytes4[] memory _functionSelectors) internal {
        DiamondStorage storage ds = diamondStorage();
        if (_facetAddress == address(0)) {
            revert CannotReplaceFunctionsFromFacetWithZeroAddress(_functionSelectors);
        }
        enforceHasContractCode(_facetAddress, "LibDiamondCut: Replace facet has no code");
        for (uint256 selectorIndex; selectorIndex < _functionSelectors.length; selectorIndex++) {
            bytes4 selector = _functionSelectors[selectorIndex];
            address oldFacetAddress = ds.facetAddressAndSelectorPosition[selector].facetAddress;
            // can't replace immutable functions -- functions defined directly in the diamond in this case
            if (oldFacetAddress == address(this)) {
                revert CannotReplaceImmutableFunction(selector);
            }
            if (oldFacetAddress == _facetAddress) {
                revert CannotReplaceFunctionWithTheSameFunctionFromTheSameFacet(selector);
            }
            if (oldFacetAddress == address(0)) {
                revert CannotReplaceFunctionThatDoesNotExists(selector);
            }
            // replace old facet address
            ds.facetAddressAndSelectorPosition[selector].facetAddress = _facetAddress;
        }
    }

    function removeFunctions(address _facetAddress, bytes4[] memory _functionSelectors) internal {
        DiamondStorage storage ds = diamondStorage();
        uint256 selectorCount = ds.selectors.length;
        if (_facetAddress != address(0)) {
            revert RemoveFacetAddressMustBeZeroAddress(_facetAddress);
        }
        for (uint256 selectorIndex; selectorIndex < _functionSelectors.length; selectorIndex++) {
            bytes4 selector = _functionSelectors[selectorIndex];
            FacetAddressAndSelectorPosition memory oldFacetAddressAndSelectorPosition =
                ds.facetAddressAndSelectorPosition[selector];
            if (oldFacetAddressAndSelectorPosition.facetAddress == address(0)) {
                revert CannotRemoveFunctionThatDoesNotExist(selector);
            }

            // can't remove immutable functions -- functions defined directly in the diamond
            if (oldFacetAddressAndSelectorPosition.facetAddress == address(this)) {
                revert CannotRemoveImmutableFunction(selector);
            }
            // replace selector with last selector
            selectorCount--;
            if (oldFacetAddressAndSelectorPosition.selectorPosition != selectorCount) {
                bytes4 lastSelector = ds.selectors[selectorCount];
                ds.selectors[oldFacetAddressAndSelectorPosition.selectorPosition] = lastSelector;
                ds.facetAddressAndSelectorPosition[lastSelector].selectorPosition =
                    oldFacetAddressAndSelectorPosition.selectorPosition;
            }
            // delete last selector
            ds.selectors.pop();
            delete ds.facetAddressAndSelectorPosition[selector];
        }
    }

    function initializeDiamondCut(address _init, bytes memory _calldata) internal {
        if (_init == address(0)) {
            return;
        }
        enforceHasContractCode(_init, "LibDiamondCut: _init address has no code");
        (bool success, bytes memory error) = _init.delegatecall(_calldata);
        if (!success) {
            if (error.length > 0) {
                // bubble up error
                /// @solidity memory-safe-assembly
                assembly {
                    let returndata_size := mload(error)
                    revert(add(32, error), returndata_size)
                }
            } else {
                revert InitializationFunctionReverted(_init, _calldata);
            }
        }
    }

    function _selectorToHexString(bytes4 selector) internal pure returns (string memory) {
        bytes memory alphabet = "0123456789abcdef";
        bytes memory str = new bytes(10);
        str[0] = "0";
        str[1] = "x";
        for (uint256 i = 0; i < 4; i++) {
            str[2 + i * 2] = alphabet[uint8(selector[i] >> 4)];
            str[3 + i * 2] = alphabet[uint8(selector[i] & 0x0f)];
        }
        return string(str);
    }

    function _selectorDisplayName(bytes4 selector) internal pure returns (string memory) {
        string memory known = _knownSelectorName(selector);
        if (bytes(known).length > 0) {
            return known;
        }
        return _selectorToHexString(selector);
    }

    function _knownSelectorName(bytes4 selector) internal pure returns (string memory) {
        if (selector == bytes4(0xd5b7cc54)) {
            return "CVAdminFacet.setPoolParams";
        }
        if (selector == bytes4(0x924e6704)) {
            return "CVAdminFacet.connectSuperfluidGDA";
        }
        if (selector == bytes4(0xc69271ec)) {
            return "CVAdminFacet.disconnectSuperfluidGDA";
        }
        if (selector == bytes4(0xef2920fc)) {
            return "CVAllocationFacet.allocate";
        }
        if (selector == bytes4(0x0a6f0ee9)) {
            return "CVAllocationFacet.distribute";
        }
        if (selector == bytes4(0xb41596ec)) {
            return "CVDisputeFacet.disputeProposal";
        }
        if (selector == bytes4(0x311a6c56)) {
            return "CVDisputeFacet.rule";
        }
        if (selector == bytes4(0x2ed04b2b)) {
            return "CVPowerFacet.decreasePower";
        }
        if (selector == bytes4(0x1ddf1e23)) {
            return "CVPowerFacet.deactivatePoints()";
        }
        if (selector == bytes4(0x6453d9c4)) {
            return "CVPowerFacet.deactivatePoints(address)";
        }
        if (selector == bytes4(0x2bbe0cae)) {
            return "CVProposalFacet.registerRecipient";
        }
        if (selector == bytes4(0xe0a8f6f5)) {
            return "CVProposalFacet.cancelProposal";
        }
        if (selector == bytes4(0x141e3b38)) {
            return "CVProposalFacet.editProposal";
        }
        if (selector == bytes4(0x1b71f0e4)) {
            return "RegistryCommunity.setStrategyTemplate";
        }
        if (selector == bytes4(0xb0d3713a)) {
            return "RegistryCommunity.setCollateralVaultTemplate";
        }
        if (selector == bytes4(0x34196355)) {
            return "RegistryCommunity.initialize";
        }
        if (selector == bytes4(0x499ac57f)) {
            return "RegistryCommunity.createPool(address,(CVStrategyInitializeParamsV0_2),(Metadata))";
        }
        if (selector == bytes4(0xcd564dae)) {
            return "RegistryCommunity.createPool(address,address,(CVStrategyInitializeParamsV0_2),(Metadata))";
        }
        if (selector == bytes4(0x0b03bb9a)) {
            return "RegistryCommunity.setArchived";
        }
        if (selector == bytes4(0x0d4a8b49)) {
            return "RegistryCommunity.activateMemberInStrategy";
        }
        if (selector == bytes4(0x22bcf999)) {
            return "RegistryCommunity.deactivateMemberInStrategy";
        }
        if (selector == bytes4(0x559de05d)) {
            return "RegistryCommunity.increasePower";
        }
        if (selector == bytes4(0x5ecf71c5)) {
            return "RegistryCommunity.decreasePower";
        }
        if (selector == bytes4(0x7817ee4f)) {
            return "RegistryCommunity.getMemberPowerInStrategy";
        }
        if (selector == bytes4(0x2c611c4a)) {
            return "RegistryCommunity.getMemberStakedAmount";
        }
        if (selector == bytes4(0x82d6a1e7)) {
            return "RegistryCommunity.addStrategyByPoolId";
        }
        if (selector == bytes4(0x223e5479)) {
            return "RegistryCommunity.addStrategy";
        }
        if (selector == bytes4(0xfb1f6917)) {
            return "RegistryCommunity.rejectPool";
        }
        if (selector == bytes4(0x73265c37)) {
            return "RegistryCommunity.removeStrategyByPoolId";
        }
        if (selector == bytes4(0x175188e8)) {
            return "RegistryCommunity.removeStrategy";
        }
        if (selector == bytes4(0x397e2543)) {
            return "RegistryCommunity.setCouncilSafe";
        }
        if (selector == bytes4(0xb5058c50)) {
            return "RegistryCommunity.acceptCouncilSafe";
        }
        if (selector == bytes4(0xa230c524)) {
            return "RegistryCommunity.isMember";
        }
        if (selector == bytes4(0x9a1f46e2)) {
            return "RegistryCommunity.stakeAndRegisterMember";
        }
        if (selector == bytes4(0x28c309e9)) {
            return "RegistryCommunity.getStakeAmountWithFees";
        }
        if (selector == bytes4(0x0331383c)) {
            return "RegistryCommunity.getBasisStakedAmount";
        }
        if (selector == bytes4(0x31f61bca)) {
            return "RegistryCommunity.setBasisStakedAmount";
        }
        if (selector == bytes4(0xf2d774e7)) {
            return "RegistryCommunity.setCommunityParams";
        }
        if (selector == bytes4(0x0d12bbdb)) {
            return "RegistryCommunity.setCommunityFee";
        }
        if (selector == bytes4(0xebd7dc52)) {
            return "RegistryCommunity.isCouncilMember";
        }
        if (selector == bytes4(0xb99b4370)) {
            return "RegistryCommunity.unregisterMember";
        }
        if (selector == bytes4(0x6871eb4d)) {
            return "RegistryCommunity.kickMember";
        }
        if (selector == bytes4(0x1f931c1c)) {
            return "RegistryCommunity.diamondCut";
        }
        return "";
    }

    function _shrinkSelectorArray(bytes4[] memory selectors, uint256 newLength)
        private
        pure
        returns (bytes4[] memory)
    {
        bytes4[] memory trimmed = new bytes4[](newLength);
        for (uint256 i = 0; i < newLength; i++) {
            trimmed[i] = selectors[i];
        }
        return trimmed;
    }

    function enforceHasContractCode(address _contract, string memory _errorMessage) internal view {
        uint256 contractSize;
        assembly {
            contractSize := extcodesize(_contract)
        }
        if (contractSize == 0) {
            revert NoBytecodeAtAddress(_contract, _errorMessage);
        }
    }
}
