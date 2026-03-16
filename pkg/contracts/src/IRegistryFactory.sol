// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

import {IDiamondCut} from "./diamonds/interfaces/IDiamondCut.sol";

interface IRegistryFactory {
    function getGardensFeeReceiver() external view returns (address);

    function getProtocolFee(address _community) external view returns (uint256);

    function getStreamingEscrowFactory() external view returns (address);

    function globalPauseController() external view returns (address);

    function isContractRegistered(address target) external view returns (bool);

    function getCommunityFacets()
        external
        view
        returns (IDiamondCut.FacetCut[] memory facetCuts, address init, bytes memory initCalldata);

    function getStrategyFacets()
        external
        view
        returns (IDiamondCut.FacetCut[] memory facetCuts, address init, bytes memory initCalldata);
}
