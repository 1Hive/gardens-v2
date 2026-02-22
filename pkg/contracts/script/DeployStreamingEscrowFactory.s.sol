// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "./BaseMultiChain.s.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {RegistryFactory} from "../src/RegistryFactory/RegistryFactory.sol";
import {StreamingEscrowFactory} from "../src/CVStrategy/StreamingEscrowFactory.sol";
import {StreamingEscrow} from "../src/CVStrategy/StreamingEscrow.sol";
import {IAllo} from "allo-v2-contracts/core/interfaces/IAllo.sol";
import {ISuperfluid} from "@superfluid-finance/ethereum-contracts/contracts/interfaces/superfluid/ISuperfluid.sol";

interface ICVStrategySuperToken {
    function superfluidToken() external view returns (address);
}

interface ISuperTokenWithHost {
    function getHost() external view returns (address);
}

contract DeployStreamingEscrowFactory is BaseMultiChain {
    using stdJson for string;

    uint256 internal poolId;

    function run(string memory network, uint256 _poolId) public {
        poolId = _poolId;
        BaseMultiChain.run(network);
    }

    function runCurrentNetwork(string memory networkJson) public override {
        require(poolId != 0, "POOL_ID not set");

        address registryFactoryProxy = networkJson.readAddress(getKeyNetwork(".PROXIES.REGISTRY_FACTORY"));
        address alloProxy = networkJson.readAddress(getKeyNetwork(".ENVS.ALLO_PROXY"));
        address proxyOwner = networkJson.readAddress(getKeyNetwork(".ENVS.PROXY_OWNER"));
        require(proxyOwner != address(0), "proxy owner is zero");

        RegistryFactory registryFactory = RegistryFactory(payable(registryFactoryProxy));
        IAllo.Pool memory pool = IAllo(alloProxy).getPool(poolId);
        address strategy = address(pool.strategy);

        require(strategy != address(0), "pool strategy is zero");

        address superToken = ICVStrategySuperToken(strategy).superfluidToken();
        require(superToken != address(0), "strategy superToken is zero");

        address host = ISuperTokenWithHost(superToken).getHost();
        require(host != address(0), "superToken host is zero");

        address escrowImplementation = address(new StreamingEscrow());
        address factoryImplementation = address(new StreamingEscrowFactory());

        address factoryProxy = address(
            new ERC1967Proxy(
                factoryImplementation,
                abi.encodeWithSelector(
                    StreamingEscrowFactory.initialize.selector,
                    proxyOwner,
                    ISuperfluid(host),
                    escrowImplementation
                )
            )
        );

        registryFactory.setStreamingEscrowFactory(factoryProxy);

        console2.log("RegistryFactory", registryFactoryProxy);
        console2.log("Pool ID", poolId);
        console2.log("SuperToken", superToken);
        console2.log("Superfluid Host", host);
        console2.log("Proxy owner", proxyOwner);
        console2.log("StreamingEscrow impl", escrowImplementation);
        console2.log("StreamingEscrowFactory impl", factoryImplementation);
        console2.log("StreamingEscrowFactory proxy", factoryProxy);
    }
}
