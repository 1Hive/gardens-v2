// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.13;

import {Allo} from "allo-v2-contracts/core/Allo.sol";
import {Metadata} from "allo-v2-contracts/core/libraries/Metadata.sol";
import {CVStrategy} from "../src/CVStrategy.sol";
import {Native} from "allo-v2-contracts/core/libraries/Native.sol";
import {IRegistry} from "allo-v2-contracts/core/interfaces/IRegistry.sol";

import {Accounts} from "allo-v2-test/foundry/shared/Accounts.sol";

contract CVStrategyHelpers is Native, Accounts {
    Metadata public metadata = Metadata({protocol: 1, pointer: "strategy pointer"});

    bytes32 internal _poolProfileId_;

    function poolProfile_id(IRegistry registry) public virtual returns (bytes32) {
        if (_poolProfileId_ == bytes32(0)) {
            _poolProfileId_ = registry.createProfile(
                0, "Pool Profile 1", Metadata({protocol: 1, pointer: "PoolProfile1"}), pool_admin(), pool_managers()
            );
        }
        return _poolProfileId_;
    }

    function createPool(Allo allo, address strategy, address registryGardens, IRegistry registry)
        public
        returns (uint256 poolId)
    {
        // IAllo allo = IAllo(ALLO_PROXY_ADDRESS);
        CVStrategy.InitializeParams memory params;
        params.decay = _etherToFloat(0.9 ether); // alpha = decay
        params.maxRatio = _etherToFloat(0.2 ether); // beta = maxRatio
        params.weight = _etherToFloat(0.002 ether); // RHO = p  = weight
        params.minThresholdStakePercentage = 0.2 ether; // 20%
        params.registryGardens = registryGardens;

        address[] memory pool_managers = new address[](2);
        pool_managers[0] = address(this);
        pool_managers[1] = address(msg.sender);

        // bytes32 memory_poolProfileId_ = registry.createProfile(
        //     0, "Pool Profile 1", Metadata({protocol: 1, pointer: "PoolProfile1"}), pool_admin(), pool_managers()
        // );

        poolId = allo.createPoolWithCustomStrategy(
            poolProfile_id(registry), address(strategy), abi.encode(params), NATIVE, 0, metadata, pool_managers
        );
    }

    function _etherToFloat(uint256 _amount) internal pure returns (uint256) {
        return _amount / 10 ** 11;
    }
}
