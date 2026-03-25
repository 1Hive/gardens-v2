// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "./BaseMultiChain.s.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {StreamingEscrow} from "../src/CVStrategy/StreamingEscrow.sol";
import {StreamingEscrowFactory} from "../src/CVStrategy/StreamingEscrowFactory.sol";
import {ISuperfluid} from "@superfluid-finance/ethereum-contracts/contracts/interfaces/superfluid/ISuperfluid.sol";

interface IStreamingEscrowUUPS {
    function strategy() external view returns (address);
    function upgradeTo(address newImplementation) external;
    function reinitializeV2Migrate() external;
}

contract DeployOrUpgradeStreamingEscrows is BaseMultiChain {
    using stdJson for string;

    bytes32 internal constant EIP1967_IMPLEMENTATION_SLOT =
        0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc;

    address internal requestedEscrowImplementation;

    function run(string memory network, address _newEscrowImplementation) public {
        requestedEscrowImplementation = _newEscrowImplementation;
        BaseMultiChain.run(network);
    }

    function run(string memory network) public override {
        run(network, address(0));
    }

    function runCurrentNetwork(string memory networkJson) public override {
        bool deployOnly = vm.envOr("DEPLOY_ONLY", false);
        address proxyOwner = networkJson.readAddress(getKeyNetwork(".ENVS.PROXY_OWNER"));
        require(proxyOwner != address(0), "PROXY_OWNER is zero");

        address factoryProxy = _readAddressOrZero(".ENVS.STREAMING_ESCROW_FACTORY");
        address configuredHost = _readAddressOrZero(".ENVS.SUPERFLUID_HOST");
        require(configuredHost != address(0), "SUPERFLUID_HOST is zero");
        StreamingEscrowFactory factory;
        address currentFactoryImplementation = address(0);
        address targetFactoryImplementation;

        if (factoryProxy != address(0) && factoryProxy.code.length == 0) {
            console2.log("Configured STREAMING_ESCROW_FACTORY has no code, redeploying", factoryProxy);
            factoryProxy = address(0);
        }

        if (factoryProxy == address(0)) {
            address initialEscrowImplementation = _resolveEscrowImplementation(address(0));
            address factoryImplementation = address(new StreamingEscrowFactory());
            factoryProxy = address(
                new ERC1967Proxy(
                    factoryImplementation,
                    abi.encodeWithSelector(
                        StreamingEscrowFactory.initialize.selector,
                        proxyOwner,
                        ISuperfluid(configuredHost),
                        initialEscrowImplementation
                    )
                )
            );
            factory = StreamingEscrowFactory(factoryProxy);

            _writeNetworkAddress(".ENVS.STREAMING_ESCROW_FACTORY", factoryProxy);
            _writeNetworkAddress(".IMPLEMENTATIONS.STREAMING_ESCROW_FACTORY", factoryImplementation);
            _writeNetworkAddress(".IMPLEMENTATIONS.STREAMING_ESCROW", initialEscrowImplementation);

            console2.log("Factory deployed", factoryProxy);
            console2.log("Factory implementation", factoryImplementation);
            console2.log("Escrow implementation", initialEscrowImplementation);
        } else {
            factory = StreamingEscrowFactory(factoryProxy);
            currentFactoryImplementation = _implementationOf(factoryProxy);
            targetFactoryImplementation = _resolveFactoryImplementation(currentFactoryImplementation);
            if (!deployOnly && _codehash(currentFactoryImplementation) != _codehash(targetFactoryImplementation)) {
                factory.upgradeTo(targetFactoryImplementation);
            }
        }

        address targetEscrowImplementation = _resolveEscrowImplementation(factory.escrowImplementation());
        if (!deployOnly && _codehash(factory.escrowImplementation()) != _codehash(targetEscrowImplementation)) {
            factory.setEscrowImplementation(targetEscrowImplementation);
        }

        if (factoryProxy != address(0) && targetFactoryImplementation == address(0)) {
            targetFactoryImplementation = _implementationOf(factoryProxy);
        }

        _writeNetworkAddress(".IMPLEMENTATIONS.STREAMING_ESCROW_FACTORY", targetFactoryImplementation);
        _writeNetworkAddress(".IMPLEMENTATIONS.STREAMING_ESCROW", targetEscrowImplementation);
        _writeNetworkAddress(".ENVS.STREAMING_ESCROW_FACTORY", factoryProxy);

        uint256 total = factory.escrowsLength();
        console2.log("Factory", factoryProxy);
        console2.log("Factory implementation", _implementationOf(factoryProxy));
        console2.log("Superfluid host", configuredHost);
        console2.log("Escrow implementation", targetEscrowImplementation);
        console2.log("Escrows", total);
        console2.log("Deploy only", deployOnly);

        // NOTE: Existing escrow proxies are intentionally NOT upgraded here.
        // This keeps current storage/layout untouched for already-deployed escrows.
        // The factory template above is still updated, so only newly deployed escrows use the new implementation.
        console2.log("Existing escrow upgrades disabled");
        console2.log("Existing escrows left untouched", total);
    }

    function _resolveFactoryImplementation(address currentFactoryImplementation) internal returns (address) {
        address candidate = address(new StreamingEscrowFactory());
        if (currentFactoryImplementation != address(0) && _codehash(candidate) == _codehash(currentFactoryImplementation)) {
            return currentFactoryImplementation;
        }
        return candidate;
    }

    function _resolveEscrowImplementation(address currentEscrowImplementation) internal returns (address) {
        if (requestedEscrowImplementation != address(0)) {
            return requestedEscrowImplementation;
        }

        address candidate = address(new StreamingEscrow());
        if (currentEscrowImplementation != address(0) && _codehash(candidate) == _codehash(currentEscrowImplementation)) {
            return currentEscrowImplementation;
        }
        return candidate;
    }

    function _implementationOf(address proxy) internal view returns (address implementation) {
        bytes32 implementationSlot = vm.load(proxy, EIP1967_IMPLEMENTATION_SLOT);
        implementation = address(uint160(uint256(implementationSlot)));
    }

    function _codehash(address target) internal view returns (bytes32 hash) {
        assembly {
            hash := extcodehash(target)
        }
    }
}
