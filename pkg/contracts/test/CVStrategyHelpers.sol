// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.13;

import {Allo} from "allo-v2-contracts/core/Allo.sol";
import {Metadata} from "allo-v2-contracts/core/libraries/Metadata.sol";
import {CVStrategy} from "../src/CVStrategy.sol";
import {Native} from "allo-v2-contracts/core/libraries/Native.sol";
import {IRegistry} from "allo-v2-contracts/core/interfaces/IRegistry.sol";

import {Accounts} from "allo-v2-test/foundry/shared/Accounts.sol";

contract CVStrategyHelpers is Native, Accounts {
    Metadata public metadata = Metadata({protocol: 1, pointer: "strategy pointer"}); //@todo CID from IPFS

    bytes32 internal _poolProfileId1_;

    uint256 internal constant TWO_127 = 2 ** 127;
    uint256 internal constant TWO_128 = 2 ** 128;
    uint256 internal constant D = 10 ** 7;

    function poolProfile_id1(IRegistry registry) public virtual returns (bytes32) {
        if (_poolProfileId1_ == bytes32(0)) {
            _poolProfileId1_ = registry.createProfile(
                1, "Pool Profile 1", Metadata({protocol: 1, pointer: "PoolProfile1"}), pool_admin(), pool_managers()
            );
        }
        return _poolProfileId1_;
    }

    function createPool(Allo allo, address strategy, address registryGardens, IRegistry registry, address token)
        public
        returns (uint256 poolId)
    {
        // IAllo allo = IAllo(ALLO_PROXY_ADDRESS);
        CVStrategy.InitializeParams memory params;
        params.decay = _etherToFloat(0.9999799 ether); // alpha = decay
        params.maxRatio = _etherToFloat(0.2 ether); // beta = maxRatio
        params.weight = _etherToFloat(0.001 ether); // RHO = p  = weight
        // params.minThresholdStakePercentage = 0.2 ether; // 20%
        params.registryGardens = registryGardens;

        address[] memory _pool_managers = new address[](2);
        _pool_managers[0] = address(this);
        _pool_managers[1] = address(msg.sender);
        //@todo make councilSafe a member

        // bytes32 memory_poolProfileId_ = registry.createProfile(
        //     0, "Pool Profile 1", Metadata({protocol: 1, pointer: "PoolProfile1"}), pool_admin(), pool_managers()
        // );
        address _token = NATIVE;
        if (token != address(0)) {
            _token = token;
        }
        poolId = allo.createPoolWithCustomStrategy(
            // poolId = allo.createPool(
            poolProfile_id1(registry),
            address(strategy),
            abi.encode(params),
            _token,
            0,
            metadata,
            _pool_managers
        );
    }

    function _etherToFloat(uint256 _amount) internal pure returns (uint256) {
        return _amount / 10 ** 11;
    }

    function _mul(uint256 _a, uint256 _b) internal pure returns (uint256 _result) {
        require(_a <= TWO_128, "_a should be less than or equal to 2^128");
        require(_b < TWO_128, "_b should be less than 2^128");
        return ((_a * _b) + TWO_127) >> 128;
    }

    function _pow(uint256 _a, uint256 _b) internal pure returns (uint256 _result) {
        require(_a < TWO_128, "_a should be less than 2^128");
        uint256 a = _a;
        uint256 b = _b;
        _result = TWO_128;
        while (b > 0) {
            if (b & 1 == 0) {
                a = _mul(a, a);
                b >>= 1;
            } else {
                _result = _mul(_result, a);
                b -= 1;
            }
        }
    }

    function _calculateConviction(uint256 _timePassed, uint256 _lastConv, uint256 _oldAmount, uint256 decay)
        public
        pure
        returns (uint256)
    {
        uint256 t = _timePassed;
        uint256 atTWO_128 = _pow((decay << 128) / D, t);
        return (((atTWO_128 * _lastConv) + (_oldAmount * D * (TWO_128 - atTWO_128) / (D - decay))) + TWO_127) >> 128;
    }
}
