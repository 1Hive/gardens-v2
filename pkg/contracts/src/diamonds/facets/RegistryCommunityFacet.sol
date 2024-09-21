// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {LibDiamond} from "@src/diamonds/libraries/LibDiamond.sol";

import {RegistryCommunityV0_1 } from "@src/RegistryCommunity/RegistryCommunityV0_1.sol";
import {ProxyOwnableUpgrader} from "@src/ProxyOwnableUpgrader.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {Clone} from "allo-v2-contracts/core/libraries/Clone.sol";


contract RegistryCommunityFacet is RegistryCommunityV0_1  {

    // AUDIT: acknowledged upgradeable contract hat does not protect initialize functions,
    // slither-disable-next-line unprotected-upgrade
    function initializeV2(
        address _owner,
        address _strategyTemplate,
        address _collateralVaultTemplate
    ) public reinitializer(2) onlyOwner {
        _revertZeroAddress(_owner);
        _revertZeroAddress(_strategyTemplate);
        _revertZeroAddress(_collateralVaultTemplate);
        
        transferOwnership(_owner);
        
        strategyTemplate = _strategyTemplate;
        collateralVaultTemplate = _collateralVaultTemplate;
        //TODO emit event reinitialized
    }

   
    function VERSION() public pure override returns (string memory) {
        return "0.1";
    }

    // This implements ERC-165.
    function supportsInterface(bytes4 _interfaceId) public view override virtual returns (bool) {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        return ds.supportedInterfaces[_interfaceId];
    }
    

    uint256[50] private __gap;
}
