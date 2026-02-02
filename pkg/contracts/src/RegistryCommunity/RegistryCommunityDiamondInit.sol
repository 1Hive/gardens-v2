// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * \
 * Author: Nick Mudge <nick@perfectabstractions.com> (https://twitter.com/mudgen)
 * EIP-2535 Diamonds: https://eips.ethereum.org/EIPS/eip-2535
 *
 * Implementation of a diamond.
 * /*****************************************************************************
 */
import {LibDiamond} from "@src/diamonds/libraries/LibDiamond.sol";
import {IDiamondLoupe} from "@src/diamonds/interfaces/IDiamondLoupe.sol";
import {IDiamondCut} from "@src/diamonds/interfaces/IDiamondCut.sol";
import {IERC173} from "@src/diamonds/interfaces/IERC173.sol";
import {IERC165} from "@src/diamonds/interfaces/IERC165.sol";

// Customized DiamondInit for RegistryCommunity to register standard interfaces
// Following EIP-2535 pattern: "It is expected that this contract is customized
// if you want to deploy your diamond with data from a deployment script"

contract RegistryCommunityDiamondInit {
    function init() external {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();

        // Register standard diamond interfaces
        ds.supportedInterfaces[type(IERC165).interfaceId] = true;
        ds.supportedInterfaces[type(IDiamondCut).interfaceId] = true;
        ds.supportedInterfaces[type(IDiamondLoupe).interfaceId] = true;
        ds.supportedInterfaces[type(IERC173).interfaceId] = true;
    }
}
