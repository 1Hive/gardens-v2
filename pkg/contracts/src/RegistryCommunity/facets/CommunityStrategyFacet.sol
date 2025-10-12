// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {CommunityStorage} from "../CommunityStorage.sol";
import {CVStrategyV0_0} from "../../CVStrategy/CVStrategyV0_0.sol";
import {ISybilScorer} from "../../ISybilScorer.sol";

/**
 * @title CommunityStrategyFacet
 * @notice Facet containing strategy management functions for RegistryCommunity
 * @dev This facet is called via delegatecall from RegistryCommunityV0_0
 *      CRITICAL: Storage layout is inherited from CommunityStorage base contract
 */
contract CommunityStrategyFacet is CommunityStorage {
    /*|--------------------------------------------|*/
    /*|              CONSTANTS                     |*/
    /*|--------------------------------------------|*/
    bytes32 public constant COUNCIL_MEMBER = keccak256("COUNCIL_MEMBER");

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

    /*|--------------------------------------------|*/
    /*|              MODIFIERS                     |*/
    /*|--------------------------------------------|*/
    function hasRole(bytes32 role, address account) internal view returns (bool) {
        return _roles[role][account];
    }

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
        if (enabledStrategies[_newStrategy]) {
            revert StrategyExists();
        }
        enabledStrategies[_newStrategy] = true;
        ISybilScorer sybilScorer = CVStrategyV0_0(payable(_newStrategy)).sybilScorer();
        if (address(sybilScorer) != address(0)) {
            sybilScorer.activateStrategy(_newStrategy);
        }
        emit StrategyAdded(_newStrategy);
    }

    function _removeStrategy(address _strategy) internal {
        enabledStrategies[_strategy] = false;
        emit StrategyRemoved(_strategy);
    }
}
