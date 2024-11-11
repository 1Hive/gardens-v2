// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./BaseMultiChain.s.sol";
import {CVStrategyV0_0} from "../src/CVStrategy/CVStrategyV0_0.sol";
import {RegistryCommunityV0_0} from "../src/RegistryCommunity/RegistryCommunityV0_0.sol";
import {RegistryFactoryV0_0} from "../src/RegistryFactory/RegistryFactoryV0_0.sol";

contract UpgradeCVMultichainProd is BaseMultiChain {
    using stdJson for string;

    function runCurrentNetwork(string memory networkJson) public override {
        address registryFactoryImplementation = address(new RegistryFactoryV0_0());
        address registryImplementation = address(new RegistryCommunityV0_0());
        address strategyImplementation = address(new CVStrategyV0_0());
        address passportScorerImplementation = address(new PassportScorer());

        // PASSPORT SCORER UPGRADE
        address passportScorerProxy = networkJson.readAddress(getKeyNetwork(".PROXIES.PASSPORT_SCORER"));
        PassportScorer passportScorer = PassportScorer(address(passportScorerProxy));
        bytes memory upgradePassportScorer = abi.encodeWithSelector(
            passportScorer.upgradeTo.selector,
            passportScorerImplementation
        );

        // REGISTRY FACTORY UPGRADE
        address registryFactoryProxy = networkJson.readAddress(getKeyNetwork(".PROXIES.REGISTRY_FACTORY"));
        RegistryFactoryV0_0 registryFactory = RegistryFactoryV0_0(payable(address(registryFactoryProxy)));

        bytes memory upgradeRegistryFactory = abi.encodeWithSelector(
            registryFactory.upgradeTo.selector,
            registryFactoryImplementation
        );
        bytes memory setRegistryCommunityTemplate = abi.encodeWithSelector(
            registryFactory.setRegistryCommunityTemplate.selector,
            registryImplementation
        );
        bytes memory setStrategyTemplate = abi.encodeWithSelector(
            registryFactory.setStrategyTemplate.selector,
            strategyImplementation
        );

        // REGISTRY COMMUNITIES UPGRADES
        address[] memory registryCommunityProxies =
            networkJson.readAddressArray(getKeyNetwork(".PROXIES.REGISTRY_COMMUNITIES"));
        bytes[] memory upgradeRegistryCommunities = new bytes[](registryCommunityProxies.length * 2);
        for (uint256 i = 0; i < registryCommunityProxies.length; i++) {
            RegistryCommunityV0_0 registryCommunity =
                RegistryCommunityV0_0(payable(address(registryCommunityProxies[i])));
            bytes memory upgradeRegistryCommunity = abi.encodeWithSelector(
                registryCommunity.upgradeTo.selector,
                registryImplementation
            );
            bytes memory setStrategyTemplateCommunity = abi.encodeWithSelector(
                registryCommunity.setStrategyTemplate.selector,
                strategyImplementation
            );

            upgradeRegistryCommunities[i * 2] = upgradeRegistryCommunity;
            upgradeRegistryCommunities[i * 2 + 1] = setStrategyTemplateCommunity;
        }

        // CV STRATEGIES UPGRADES
        address[] memory cvStrategyProxies = networkJson.readAddressArray(getKeyNetwork(".PROXIES.CV_STRATEGIES"));
        bytes[] memory upgradeCVStrategies = new bytes[](cvStrategyProxies.length);
        for (uint256 i = 0; i < cvStrategyProxies.length; i++) {
            CVStrategyV0_0 cvStrategy = CVStrategyV0_0(payable(address(cvStrategyProxies[i])));
            bytes memory upgradeCVStrategy = abi.encodeWithSelector(
                cvStrategy.upgradeTo.selector,
                strategyImplementation
            );

            upgradeCVStrategies[i] = upgradeCVStrategy;
        }

        // Prepare JSON for Gnosis Safe transaction builder
        string memory json = '{"version":"1.0","chainId":"11155111","createdAt":1720550079625,"meta":{"name":"Transactions Batch","description":"","txBuilderVersion":"1.16.5","createdFromSafeAddress":"0xD30aee396a54560581a3265Fd2194B0edB787525","createdFromOwnerAddress":""},"transactions":[';
        json = string(abi.encodePacked(json, _createTransactionJson(passportScorerProxy, upgradePassportScorer), ","));
        json = string(abi.encodePacked(json, _createTransactionJson(registryFactoryProxy, upgradeRegistryFactory), ","));
        json = string(abi.encodePacked(json, _createTransactionJson(registryFactoryProxy, setRegistryCommunityTemplate), ","));
        json = string(abi.encodePacked(json, _createTransactionJson(registryFactoryProxy, setStrategyTemplate), ","));

        for (uint256 i = 0; i < registryCommunityProxies.length; i++) {
            json = string(
                abi.encodePacked(
                    json, _createTransactionJson(registryCommunityProxies[i], upgradeRegistryCommunities[i * 2]), ","
                )
            );
            json = string(
                abi.encodePacked(
                    json,
                    _createTransactionJson(registryCommunityProxies[i], upgradeRegistryCommunities[i * 2 + 1]),
                    ","
                )
            );
        }

        for (uint256 i = 0; i < cvStrategyProxies.length; i++) {
            json = string(
                abi.encodePacked(json, _createTransactionJson(cvStrategyProxies[i], upgradeCVStrategies[i]), ",")
            );
        }

        // Remove the last comma and close the JSON array
        json = string(abi.encodePacked(json, "]"));

        // Print the JSON
        console.log(json);
    }

    function _createTransactionJson(address to, bytes memory data) internal pure returns (string memory) {
        return string(
            abi.encodePacked(
                '{"to":"', _addressToString(to), '","value":"0","data":"', _bytesToHexString(data), '","operation":0,"contractMethod":{"inputs":[],"name":"","payable":false},"contractInputsValues":{}}'
            )
        );
    }

    function _addressToString(address _addr) internal pure returns (string memory) {
        bytes32 value = bytes32(uint256(uint160(_addr)));
        bytes memory alphabet = "0123456789abcdef";

        bytes memory str = new bytes(42);
        str[0] = '0';
        str[1] = 'x';
        for (uint256 i = 0; i < 20; i++) {
            str[2 + i * 2] = alphabet[uint8(value[i + 12] >> 4)];
            str[3 + i * 2] = alphabet[uint8(value[i + 12] & 0x0f)];
        }
        return string(str);
    }

    function _bytesToHexString(bytes memory _bytes) internal pure returns (string memory) {
        bytes memory alphabet = "0123456789abcdef";

        bytes memory str = new bytes(2 + _bytes.length * 2);
        str[0] = '0';
        str[1] = 'x';
        for (uint256 i = 0; i < _bytes.length; i++) {
            str[2 + i * 2] = alphabet[uint8(_bytes[i] >> 4)];
            str[3 + i * 2] = alphabet[uint8(_bytes[i] & 0x0f)];
        }
        return string(str);
    }
}