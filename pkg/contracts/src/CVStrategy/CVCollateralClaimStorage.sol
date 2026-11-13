// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

/// @notice Namespaced storage for dispute collateral payouts that failed inside `rule()`.
/// @dev Uses its own slot so CVStrategyBaseFacet's shared layout is untouched.
library CVCollateralClaimStorage {
    bytes32 internal constant STORAGE_SLOT = keccak256("cvstrategy.storage.collateral-claims.v1");

    struct Layout {
        // proposalId => fromUser (owner of the vault balance) => toUser (payee) => amount still owed
        mapping(uint256 => mapping(address => mapping(address => uint256))) pendingCollateralClaims;
    }

    function layout() internal pure returns (Layout storage l) {
        bytes32 slot = STORAGE_SLOT;
        assembly {
            l.slot := slot
        }
    }
}
