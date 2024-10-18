// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {RegistryFactoryV0_0, ERC1967Proxy} from "../RegistryFactory/RegistryFactoryV0_0.sol";
import {
    RegistryCommunityInitializeParamsV0_0,
    RegistryCommunityV0_0
} from "../RegistryCommunity/RegistryCommunityV0_0.sol";
import {RegistryCommunityV0_0} from "../RegistryCommunity/RegistryCommunityV0_0.sol";

/// @custom:oz-upgrades-from RegistryFactoryV0_0
contract RegistryFactoryV0_1 is RegistryFactoryV0_0 {
    function initializeV2() public reinitializer(2) {}

    function createRegistry(RegistryCommunityInitializeParamsV0_0 memory params)
        public
        virtual
        override
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
}
