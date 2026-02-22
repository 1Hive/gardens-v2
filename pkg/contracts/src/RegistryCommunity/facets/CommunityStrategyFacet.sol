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

    // Sig: 0x82d6a1e7
    function addStrategyByPoolId(uint256 poolId) public { if (msg.sig == bytes4(0)) revert(); onlyCouncilSafe();
        address strategy = address(allo.getPool(poolId).strategy);
        _addStrategy(strategy);
    }

    // Sig: 0x223e5479
    function addStrategy(address _newStrategy) public { if (msg.sig == bytes4(0)) revert(); onlyCouncilSafe();
        _addStrategy(_newStrategy);
    }

    // Sig: 0x73265c37
    function removeStrategyByPoolId(uint256 poolId) public { if (msg.sig == bytes4(0)) revert(); onlyCouncilSafe();
        address strategy = address(allo.getPool(poolId).strategy);
        _removeStrategy(strategy);
    }

    // Sig: 0x175188e8
    function removeStrategy(address _strategy) public { if (msg.sig == bytes4(0)) revert(); onlyCouncilSafe();
        _removeStrategy(_strategy);
    }

    // Sig: 0xfb1f6917
    function rejectPool(address _strategy) public { if (msg.sig == bytes4(0)) revert(); onlyCouncilSafe();
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
