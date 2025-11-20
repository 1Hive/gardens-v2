// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {CommunityBaseFacet} from "../CommunityBaseFacet.sol";
import {CVStrategy} from "../../CVStrategy/CVStrategy.sol";
import {ISybilScorer} from "../../ISybilScorer.sol";

/**
 * @title CommunityStrategyFacet
 * @notice Facet containing strategy management functions for RegistryCommunity
 * @dev This facet is called via delegatecall from RegistryCommunity
 *      CRITICAL: Inherits storage layout from CommunityBaseFacet
 */
contract CommunityStrategyFacet is CommunityBaseFacet {
    /*|--------------------------------------------|*/
    /*|              EVENTS                        |*/
    /*|--------------------------------------------|*/
    event StrategyAdded(address _strategy);
    event StrategyRemoved(address _strategy);
    event PoolRejected(address _strategy);

    /*|--------------------------------------------|*/
    /*|              ERRORS                        |*/
    /*|--------------------------------------------|*/
    error UserNotInCouncil(address _user);
    error StrategyExists();
    error StrategyNotEnabled();
    error ValueCannotBeZero();

    /*|--------------------------------------------|*/
    /*|              MODIFIERS                     |*/
    /*|--------------------------------------------|*/
    function onlyCouncilSafe() internal view {
        if (!hasRole(COUNCIL_MEMBER, msg.sender)) {
            revert UserNotInCouncil(msg.sender);
        }
    }

    /*|--------------------------------------------|*/
    /*|              FUNCTIONS                     |*/
    /*|--------------------------------------------|*/

    function addStrategyByPoolId(uint256 poolId) public {
        onlyCouncilSafe();
        address strategy = address(allo.getPool(poolId).strategy);
        _addStrategy(strategy);
    }

    function addStrategy(address _newStrategy) public {
        onlyCouncilSafe();
        _addStrategy(_newStrategy);
    }

    function removeStrategyByPoolId(uint256 poolId) public {
        onlyCouncilSafe();
        address strategy = address(allo.getPool(poolId).strategy);
        _removeStrategy(strategy);
    }

    function removeStrategy(address _strategy) public {
        onlyCouncilSafe();
        _removeStrategy(_strategy);
    }

    function rejectPool(address _strategy) public {
        onlyCouncilSafe();
        if (enabledStrategies[_strategy]) {
            _removeStrategy(_strategy);
        }
        emit PoolRejected(_strategy);
    }

    /*|--------------------------------------------|*/
    /*|              INTERNAL HELPERS              |*/
    /*|--------------------------------------------|*/

    function _addStrategy(address _newStrategy) internal {
        if (_newStrategy == address(0)) {
            revert ValueCannotBeZero();
        }
        if (enabledStrategies[_newStrategy]) {
            revert StrategyExists();
        }
        enabledStrategies[_newStrategy] = true;
        ISybilScorer sybilScorer = CVStrategy(payable(_newStrategy)).sybilScorer();
        if (address(sybilScorer) != address(0)) {
            sybilScorer.activateStrategy(_newStrategy);
        }
        emit StrategyAdded(_newStrategy);
    }

    function _removeStrategy(address _strategy) internal {
        if (_strategy == address(0)) {
            revert ValueCannotBeZero();
        }
        if (!enabledStrategies[_strategy]) {
            revert StrategyNotEnabled();
        }
        enabledStrategies[_strategy] = false;
        emit StrategyRemoved(_strategy);
    }
}
