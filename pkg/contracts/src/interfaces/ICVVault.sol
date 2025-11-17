// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity >=0.8.18;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IVotingPowerRegistry} from "./IVotingPowerRegistry.sol";
import {ISafe} from "./ISafe.sol";

interface ICVVault is IVotingPowerRegistry {
    event Harvested(address indexed caller, address indexed receiver, uint256 harvestedAmount);

    function initialize(
        IERC20 asset_,
        string calldata name_,
        string calldata symbol_,
        address manager_,
        ISafe councilSafe_,
        uint256 basisAmount_,
        address strategy_,
        bool strategyEnabled_
    ) external;

    function harvest(address receiver) external returns (uint256 harvestedAmount);

    function totalPrincipal() external view returns (uint256);

    function strategy() external view returns (address);

    function configureAllowlist(bytes32 role, bytes32 adminRole) external;
}
