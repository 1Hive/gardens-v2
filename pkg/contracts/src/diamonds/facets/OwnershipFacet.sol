// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {LibDiamond} from "@src/diamonds/libraries/LibDiamond.sol";
import {IERC173} from "@src/diamonds/interfaces/IERC173.sol";

contract OwnershipFacet is IERC173 {
    // Sig: 0xf2fde38b
    function transferOwnership(address _newOwner) external override {
        LibDiamond.enforceIsContractOwner();
        LibDiamond.setContractOwner(_newOwner);
    }

    // Sig: 0x8da5cb5b
    function owner() external view override returns (address owner_) {
        owner_ = LibDiamond.contractOwner();
    }
}