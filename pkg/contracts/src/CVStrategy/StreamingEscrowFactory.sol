// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {ProxyOwnableUpgrader} from "../ProxyOwnableUpgrader.sol";
import {
    ISuperfluid,
    SuperAppDefinitions
} from "@superfluid-finance/ethereum-contracts/contracts/interfaces/superfluid/ISuperfluid.sol";
import "@superfluid-finance/ethereum-contracts/contracts/interfaces/superfluid/ISuperApp.sol";
import "@superfluid-finance/ethereum-contracts/contracts/interfaces/superfluid/ISuperToken.sol";
import "@superfluid-finance/ethereum-contracts/contracts/interfaces/agreements/gdav1/ISuperfluidPool.sol";

import {StreamingEscrow} from "./StreamingEscrow.sol";

/**
 * @title StreamingEscrowFactory
 * @notice Factory that deploys and registers StreamingEscrow SuperApps via registerAppByFactory.
 */
contract StreamingEscrowFactory is ProxyOwnableUpgrader {
    error OnlyStrategy(address sender); // 0x6c24a9f7
    error InvalidAddress(); // 0x9f1f3e28

    address public strategy;
    ISuperfluid public host;
    address public escrowImplementation;
    uint256[45] private __gap;

    function initialize(address _strategy, ISuperfluid _host, address _escrowImplementation) external initializer {
        if (_strategy == address(0) || address(_host) == address(0)) {
            revert InvalidAddress();
        }
        if (_escrowImplementation == address(0)) {
            revert InvalidAddress();
        }

        ProxyOwnableUpgrader.initialize(_strategy);

        strategy = _strategy;
        host = _host;
        escrowImplementation = _escrowImplementation;
    }

    function deployEscrow(ISuperToken superToken, ISuperfluidPool pool, address beneficiary, address treasury)
        external
        returns (address escrow)
    {
        if (msg.sender != strategy) {
            revert OnlyStrategy(msg.sender);
        }
        if (beneficiary == address(0) || treasury == address(0)) {
            revert InvalidAddress();
        }

        bytes memory initData =
            abi.encodeCall(StreamingEscrow.initialize, (superToken, pool, beneficiary, strategy, treasury));
        escrow = address(new ERC1967Proxy(escrowImplementation, initData));

        uint256 configWord = SuperAppDefinitions.APP_LEVEL_FINAL | SuperAppDefinitions.BEFORE_AGREEMENT_CREATED_NOOP
            | SuperAppDefinitions.BEFORE_AGREEMENT_UPDATED_NOOP | SuperAppDefinitions.BEFORE_AGREEMENT_TERMINATED_NOOP;
        host.registerAppByFactory(ISuperApp(escrow), configWord);
    }

    function setEscrowImplementation(address implementation) external onlyOwner {
        if (implementation == address(0)) {
            revert InvalidAddress();
        }
        escrowImplementation = implementation;
    }

}
