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
    error UnauthorizedCaller(address sender, address strategy); // 0x6e154f1f
    error InvalidAddress(); // 0x9f1f3e28

    ISuperfluid public host;
    address public escrowImplementation;
    address[] public escrows;
    uint256[45] private __gap;

    event EscrowDeployed(
        address indexed escrow, address indexed strategy, address indexed beneficiary, address superToken, address pool
    );

    function initialize(address _owner, ISuperfluid _host, address _escrowImplementation) external initializer {
        if (_owner == address(0) || address(_host) == address(0)) {
            revert InvalidAddress();
        }
        if (_escrowImplementation == address(0)) {
            revert InvalidAddress();
        }

        ProxyOwnableUpgrader.initialize(_owner);

        host = _host;
        escrowImplementation = _escrowImplementation;
    }

    function deployEscrow(ISuperToken superToken, ISuperfluidPool pool, address beneficiary, address strategy)
        external
        returns (address escrow)
    {
        if (strategy == address(0)) {
            revert InvalidAddress();
        }
        if (msg.sender != strategy) {
            revert UnauthorizedCaller(msg.sender, strategy);
        }
        if (beneficiary == address(0)) {
            revert InvalidAddress();
        }

        bytes memory initData =
            abi.encodeCall(StreamingEscrow.initialize, (superToken, pool, beneficiary, proxyOwner(), strategy));
        escrow = address(new ERC1967Proxy(escrowImplementation, initData));
        escrows.push(escrow);

        uint256 configWord = SuperAppDefinitions.APP_LEVEL_FINAL | SuperAppDefinitions.BEFORE_AGREEMENT_CREATED_NOOP
            | SuperAppDefinitions.BEFORE_AGREEMENT_UPDATED_NOOP | SuperAppDefinitions.BEFORE_AGREEMENT_TERMINATED_NOOP;
        host.registerAppByFactory(ISuperApp(escrow), configWord);
        emit EscrowDeployed(escrow, strategy, beneficiary, address(superToken), address(pool));
    }

    function setEscrowImplementation(address implementation) external onlyOwner {
        if (implementation == address(0)) {
            revert InvalidAddress();
        }
        escrowImplementation = implementation;
    }

    function escrowsLength() external view returns (uint256) {
        return escrows.length;
    }
}
