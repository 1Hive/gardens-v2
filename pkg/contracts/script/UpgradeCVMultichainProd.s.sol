// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./BaseMultiChain.s.sol";
import {CVStrategyV0_0} from "../src/CVStrategy/CVStrategyV0_0.sol";
import {RegistryCommunityV0_0} from "../src/RegistryCommunity/RegistryCommunityV0_0.sol";
import {RegistryFactoryV0_0} from "../src/RegistryFactory/RegistryFactoryV0_0.sol";
import {ICVStrategy} from "../src/CVStrategy/ICVStrategy.sol";

contract UpgradeCVMultichainProd is BaseMultiChain {
    using stdJson for string;

    function runCurrentNetwork(string memory networkJson) public override {
        address registryFactoryImplementation = address(new RegistryFactoryV0_0());
        address registryImplementation = address(new RegistryCommunityV0_0());
        address strategyImplementation = address(new CVStrategyV0_0());
        // address passportScorer = networkJson.readAddress(getKeyNetwork(".ENVS.PASSPORT_SCORER"));
        address safeArbitrator = networkJson.readAddress(getKeyNetwork(".ENVS.ARBITRATOR"));

        string memory json = string(abi.encodePacked("["));

        // 1. REGISTRY FACTORY UPGRADE
        address registryFactoryProxy = networkJson.readAddress(getKeyNetwork(".PROXIES.REGISTRY_FACTORY"));
        {
            RegistryFactoryV0_0 registryFactory = RegistryFactoryV0_0(payable(address(registryFactoryProxy)));

            // 1.a -- Upgrade the Registry Factory --
            // {
            //     bytes memory upgradeRegistryFactory =
            //         abi.encodeWithSelector(registryFactory.upgradeTo.selector, registryFactoryImplementation);
            //     json = string(
            //         abi.encodePacked(json, _createTransactionJson(registryFactoryProxy, upgradeRegistryFactory), ",")
            //     );
            // }

            // 1.b -- Set the Registry Community Template --
            {
                bytes memory setRegistryCommunityTemplate = abi.encodeWithSelector(
                    registryFactory.setRegistryCommunityTemplate.selector, registryImplementation
                );
                json = string(
                    abi.encodePacked(
                        json, _createTransactionJson(registryFactoryProxy, setRegistryCommunityTemplate), ","
                    )
                );
            }

            // 1.c -- Set the Strategy Template --
            // {
            //     bytes memory setStrategyTemplate =
            //         abi.encodeWithSelector(registryFactory.setStrategyTemplate.selector, strategyImplementation);
            //     json = string(
            //         abi.encodePacked(json, _createTransactionJson(registryFactoryProxy, setStrategyTemplate), ",")
            //     );
            // }
        }

        // 2. REGISTRY COMMUNITIES UPGRADES
        {
            address[] memory registryCommunityProxies =
                networkJson.readAddressArray(getKeyNetwork(".PROXIES.REGISTRY_COMMUNITIES"));
            bytes[] memory registryTransactions = new bytes[](registryCommunityProxies.length * 2);
            for (uint256 i = 0; i < registryCommunityProxies.length; i++) {
                (registryTransactions[i * 2], registryTransactions[i * 2 + 1]) = _upgradeRegistryCommunity(
                    registryCommunityProxies[i], registryImplementation, strategyImplementation
                );
            }
            for (uint256 i = 0; i < registryCommunityProxies.length; i++) {
                // 2.a -- Upgrade the Registry Community --
                json = string(
                    abi.encodePacked(
                        json, _createTransactionJson(registryCommunityProxies[i], registryTransactions[i * 2]), ","
                    )
                );
                // 2.b -- Set the Strategy Template --
                // json = string(
                //     abi.encodePacked(
                //         json, _createTransactionJson(registryCommunityProxies[i], registryTransactions[i * 2 + 1]), ","
                //     )
                // );
            }
        }

        // 3. CV STRATEGIES UPGRADES
        {
            address[] memory cvStrategyProxies = networkJson.readAddressArray(getKeyNetwork(".PROXIES.CV_STRATEGIES"));
            bytes[] memory upgradeCVStrategies = new bytes[](cvStrategyProxies.length);
            // bytes[] memory initStategies = new bytes[](cvStrategyProxies.length);
            bytes[] memory setPoolParams = new bytes[](cvStrategyProxies.length);
            for (uint256 i = 0; i < cvStrategyProxies.length; i++) {
                (upgradeCVStrategies[i], setPoolParams[i]) =
                    _upgradeCVStrategy(cvStrategyProxies[i], strategyImplementation, safeArbitrator);
            }
            for (uint256 i = 0; i < cvStrategyProxies.length; i++) {
                // 3.a -- Upgrade the CV Strategy --
                // json = string(
                //     abi.encodePacked(json, _createTransactionJson(cvStrategyProxies[i], upgradeCVStrategies[i]), ",")
                // );
                // 3.b -- Set the Pool Params --
                // json = string(abi.encodePacked(json, _createTransactionJson(cvStrategyProxies[i], setPoolParams[i]), ","));
            }
        }

        // Remove the last comma and close the JSON array
        json = string(abi.encodePacked(_removeLastChar(json), "]"));

        console.log(json);

        // WIP: Write the JSON into a file
        // Write the json into a file
        // string memory path = string(
        //     abi.encodePacked("/pkg/contracts/transaction-builder/", chainName, "-upgrade-cv-multichain-prod.json")
        // );
        // vm.writeFile(path, json);
        // console.log("Payload written to: ", path);
    }

    function _removeLastChar(string memory input) internal pure returns (string memory) {
        bytes memory inputBytes = bytes(input);
        require(inputBytes.length > 0, "String is empty");
        // Create a new bytes array with one less length
        bytes memory trimmedBytes = new bytes(inputBytes.length - 1);
        for (uint256 i = 0; i < inputBytes.length - 1; i++) {
            trimmedBytes[i] = inputBytes[i];
        }
        return string(trimmedBytes);
    }

    function _upgradeRegistryCommunity(
        address registryProxy,
        address registryImplementation,
        address strategyImplementation
    ) internal pure returns (bytes memory, bytes memory) {
        RegistryCommunityV0_0 registryCommunity = RegistryCommunityV0_0(payable(registryProxy));
        bytes memory upgradeRegistryCommunity =
            abi.encodeWithSelector(registryCommunity.upgradeTo.selector, registryImplementation);
        bytes memory setStrategyTemplateCommunity =
            abi.encodeWithSelector(registryCommunity.setStrategyTemplate.selector, strategyImplementation);

        return (upgradeRegistryCommunity, setStrategyTemplateCommunity);
    }

    function _upgradeCVStrategy(address cvStrategyProxy, address strategyImplementation, address safeArbitrator)
        // address passportScorer
        internal
        view
        returns (bytes memory, bytes memory)
    {
        CVStrategyV0_0 cvStrategy = CVStrategyV0_0(payable(cvStrategyProxy));
        bytes memory upgradeCVStrategy = abi.encodeWithSelector(cvStrategy.upgradeTo.selector, strategyImplementation);
        // bytes memory initStategy = abi.encodeWithSelector(cvStrategy.init2.selector, safeArbitrator);
        // address oldPassport = address(cvStrategy.sybilScorer());
        // bytes memory setSybilScorer = "";
        // if (oldPassport != address(0)) {
        //     (uint256 threshold,,) = PassportScorer(oldPassport).strategies(cvStrategyProxy);
        //     setSybilScorer = abi.encodeWithSelector(cvStrategy.setSybilScorer.selector, passportScorer, threshold);
        // }
        ArbitrableConfig memory arbitrableConfig;
        {
            (
                ,
                address tribunalSafe,
                uint256 submitterCollateralAmount,
                uint256 challengerCollateralAmount,
                uint256 defaultRuling,
                uint256 defaultRulingTimeout
            ) = cvStrategy.arbitrableConfigs(cvStrategy.currentArbitrableConfigVersion());
            arbitrableConfig = ArbitrableConfig(
                IArbitrator(safeArbitrator),
                tribunalSafe,
                submitterCollateralAmount,
                challengerCollateralAmount,
                defaultRuling,
                defaultRulingTimeout
            );
        }
        CVParams memory cvParams;
        {
            (uint256 maxRatio, uint256 weight, uint256 decay, uint256 minThresholdPoints) = cvStrategy.cvParams();
            cvParams = CVParams(maxRatio, weight, decay, minThresholdPoints);
        }
        bytes memory setPoolParams =
            abi.encodeWithSelector(ICVStrategy.setPoolParams.selector, arbitrableConfig, cvParams);

        return (upgradeCVStrategy, setPoolParams);
    }

    function _createTransactionJson(address to, bytes memory data) internal pure returns (string memory) {
        return string(
            abi.encodePacked(
                '{"to":"',
                _addressToString(to),
                '","value":"0","data":"',
                _bytesToHexString(data),
                '","operation":0,"contractMethod":{"inputs":[],"name":"","payable":false},"contractInputsValues":{}}'
            )
        );
    }

    function _addressToString(address _addr) internal pure returns (string memory) {
        bytes32 value = bytes32(uint256(uint160(_addr)));
        bytes memory alphabet = "0123456789abcdef";

        bytes memory str = new bytes(42);
        str[0] = "0";
        str[1] = "x";
        for (uint256 i = 0; i < 20; i++) {
            str[2 + i * 2] = alphabet[uint8(value[i + 12] >> 4)];
            str[3 + i * 2] = alphabet[uint8(value[i + 12] & 0x0f)];
        }
        return string(str);
    }

    function _bytesToHexString(bytes memory _bytes) internal pure returns (string memory) {
        bytes memory alphabet = "0123456789abcdef";

        bytes memory str = new bytes(2 + _bytes.length * 2);
        str[0] = "0";
        str[1] = "x";
        for (uint256 i = 0; i < _bytes.length; i++) {
            str[2 + i * 2] = alphabet[uint8(_bytes[i] >> 4)];
            str[3 + i * 2] = alphabet[uint8(_bytes[i] & 0x0f)];
        }
        return string(str);
    }
}
