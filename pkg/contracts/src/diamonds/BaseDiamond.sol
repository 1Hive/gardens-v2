// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;


import {BaseDiamond} from "@src/diamonds/BaseDiamond.sol";
import {LibDiamond} from "@src/diamonds/libraries/LibDiamond.sol";
import {IDiamondCut} from "@src/diamonds/interfaces/IDiamondCut.sol";
import {IDiamond} from "@src/diamonds/interfaces/IDiamond.sol";

import {IERC1822Proxiable} from "@openzeppelin/contracts/interfaces/draft-IERC1822.sol";
// When no function exists for function called

error FunctionNotFound(bytes4 _functionSelector);
error DiamondAlreadyInitialized();

// This is used in diamond constructor
// more arguments are added to this struct
// this avoids stack too deep errors
struct DiamondArgs {
    address owner;
    address init;
    bytes initCalldata;
}

contract BaseDiamond is IERC1822Proxiable, IDiamondCut {
    bytes32 internal constant _IMPLEMENTATION_SLOT = 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc;

    constructor() payable {
    }

    function initializeOwnerCut(address _owner,IDiamond.FacetCut[] memory _diamondCut, address _init, bytes memory _calldata) external {
        _initializeOwner(_owner, _diamondCut, _init, _calldata);
    }
    function _initializeOwner(address _owner,IDiamond.FacetCut[] memory _diamondCut, address _init, bytes memory _calldata) internal {
        if (LibDiamond.isInitialized()) {
            revert DiamondAlreadyInitialized();
        }
        LibDiamond.setContractOwner(_owner);
        LibDiamond.setInitialized();
        LibDiamond.diamondCut(_diamondCut, _init, _calldata);

    }

    function initializeOwner(address _owner) external {
        _initializeOwner(_owner, new FacetCut[](0), address(0), new bytes(0));
    }

    
    // Find facet for function that is called and execute the
    // function if a facet is found and return any value.
    fallback() external payable {
        LibDiamond.DiamondStorage storage ds;
        bytes32 position = LibDiamond.DIAMOND_STORAGE_POSITION;
        // get diamond storage
        assembly {
            ds.slot := position
        }
        // get facet from function selector
        address facet = ds.facetAddressAndSelectorPosition[msg.sig].facetAddress;
        if (facet == address(0)) {
            revert FunctionNotFound(msg.sig);
        }
        // Execute external function from facet using delegatecall and return any value.
        assembly {
            // copy function selector and any arguments
            calldatacopy(0, 0, calldatasize())
            // execute function call using the facet
            let result := delegatecall(gas(), facet, 0, calldatasize(), 0, 0)
            // get any return value
            returndatacopy(0, 0, returndatasize())
            // return any return value or error back to the caller
            switch result
            case 0 { revert(0, returndatasize()) }
            default { return(0, returndatasize()) }
        }
    }

    receive() external payable {}

    function proxiableUUID() external view virtual override returns (bytes32) {
        return _IMPLEMENTATION_SLOT;
    }

        /// @notice Add/replace/remove any number of functions and optionally execute
    ///         a function with delegatecall
    /// @param _diamondCut Contains the facet addresses and function selectors
    /// @param _init The address of the contract or facet to execute _calldata
    /// @param _calldata A function call, including function selector and arguments
    ///                  _calldata is executed with delegatecall on _init
    function diamondCut(FacetCut[] calldata _diamondCut, address _init, bytes calldata _calldata) external override virtual {
        LibDiamond.enforceIsContractOwner();
        LibDiamond.diamondCut(_diamondCut, _init, _calldata);
    }
}
