// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {
    RegistryCommunityV0_0,
    RegistryCommunityInitializeParamsV0_0
} from "@src/RegistryCommunity/RegistryCommunityV0_0.sol";
import {RegistryCommunityV0_1 } from "@src/RegistryCommunity/RegistryCommunityV0_1.sol";
import {ProxyOwnableUpgrader} from "@src/ProxyOwnableUpgrader.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {Clone} from "allo-v2-contracts/core/libraries/Clone.sol";
import {RegistryFactoryV0_0} from "@src/RegistryFactory/RegistryFactoryV0_0.sol";
import {IDiamond} from "@src/diamonds/interfaces/IDiamond.sol";
import {IDiamondCut} from "@src/diamonds/interfaces/IDiamondCut.sol";
import {DiamondCutFacet} from "@src/diamonds/facets/DiamondCutFacet.sol";
import {DiamondLoupeFacet} from "@src/diamonds/facets/DiamondLoupeFacet.sol";

import {BaseDiamond} from "@src/diamonds/BaseDiamond.sol";


struct CommunityInfo {
    uint256 fee;
    bool valid;
}

contract RegistryFactoryFacet is RegistryFactoryV0_0  {


    IDiamondCut.FacetCut[] public cutsCommunity;

    function initializeV2(        
        address _owner,
        address _registryCommunityTemplate,
        IDiamond.FacetCut[] calldata _cuts,
        address _strategyTemplate,
        address _collateralVaultTemplate
    ) public onlyOwner reinitializer(2) {
        transferOwnership(_owner);
        _revertZeroAddress(_registryCommunityTemplate);
        _revertZeroAddress(_collateralVaultTemplate);
        registryCommunityTemplate = _registryCommunityTemplate;
        strategyTemplate = _strategyTemplate;
        collateralVaultTemplate = _collateralVaultTemplate;
        for (uint i = 0; i < _cuts.length; i++) {
            cutsCommunity.push(IDiamond.FacetCut({
                facetAddress: _cuts[i].facetAddress,
                action: _cuts[i].action,
                functionSelectors: _cuts[i].functionSelectors
            }));
        }

    }

    function createRegistry(RegistryCommunityInitializeParamsV0_0 memory params)
        public
        override
        virtual
        returns (address _createdRegistryAddress)
    {
        params._nonce = nonce++;
        params._registryFactory = address(this);


        ERC1967Proxy proxy = new ERC1967Proxy(
            address(registryCommunityTemplate),
            abi.encodeWithSelector(BaseDiamond.initializeOwner.selector, owner())
        );

        IDiamondCut(address(proxy)).diamondCut(cutsCommunity, address(0), ""); // @TODO put init address for add supportInterfaces with DiamondInit.sol 


        RegistryCommunityV0_0 registryCommunity = RegistryCommunityV0_0(payable(address(proxy)));

        registryCommunity.initialize(params, strategyTemplate, collateralVaultTemplate, owner());

        

        communityToInfo[address(registryCommunity)].valid = true;
        emit CommunityCreated(address(registryCommunity));
        return address(registryCommunity);
    }

   
    function VERSION() public pure override returns (string memory) {
        return "0.1";
    }


    uint256[50] private __gap;
}
