// // SPDX-License-Identifier: AGPL-3.0-only
// pragma solidity <0.9.0 =0.8.19 >=0.4.22 >=0.6.2 ^0.8.0 ^0.8.1 ^0.8.19 ^0.8.2 ^0.8.4;
// pragma experimental ABIEncoderV2;

// // lib/allo-v2/contracts/core/libraries/Errors.sol

// // ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣾⣿⣷⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣼⣿⣿⣷⣄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⣿⣿⣗⠀⠀⠀⢸⣿⣿⣿⡯⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
// // ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣿⣿⣿⣿⣷⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣼⣿⣿⣿⣿⣿⡄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⣿⣿⣗⠀⠀⠀⢸⣿⣿⣿⡯⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
// // ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⣿⣿⣿⣿⣿⡄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣸⣿⣿⣿⢿⣿⣿⣿⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⣿⣿⣗⠀⠀⠀⢸⣿⣿⣿⡯⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
// // ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠘⣿⣿⣿⣿⣿⣿⣿⣄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣰⣿⣿⣿⡟⠘⣿⣿⣿⣷⡀⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⣿⣿⣗⠀⠀⠀⢸⣿⣿⣿⡯⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
// // ⠀⠀⠀⠀⠀⠀⠀⠀⣀⣴⣾⣿⣿⣿⣿⣾⠻⣿⣿⣿⣿⣿⣿⣿⡆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢠⣿⣿⣿⡿⠀⠀⠸⣿⣿⣿⣧⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⣿⣿⣗⠀⠀⠀⢸⣿⣿⣿⡯⠀⠀⠀⠀⠀⠀⢀⣠⣴⣴⣶⣶⣶⣦⣦⣀⡀⠀⠀⠀⠀⠀⠀
// // ⠀⠀⠀⠀⠀⠀⠀⣴⣿⣿⣿⣿⣿⣿⡿⠃⠀⠙⣿⣿⣿⣿⣿⣿⣿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢠⣿⣿⣿⣿⠁⠀⠀⠀⢻⣿⣿⣿⣧⠀⠀⠀⠀⠀⠀⠀⢸⣿⣿⣿⣗⠀⠀⠀⢸⣿⣿⣿⡯⠀⠀⠀⠀⣠⣾⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣶⡀⠀⠀⠀⠀
// // ⠀⠀⠀⠀⠀⢀⣾⣿⣿⣿⣿⣿⣿⡿⠁⠀⠀⠀⠘⣿⣿⣿⣿⣿⡿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣾⣿⣿⣿⠃⠀⠀⠀⠀⠈⢿⣿⣿⣿⣆⠀⠀⠀⠀⠀⠀⢸⣿⣿⣿⣗⠀⠀⠀⢸⣿⣿⣿⡯⠀⠀⠀⣰⣿⣿⣿⡿⠋⠁⠀⠀⠈⠘⠹⣿⣿⣿⣿⣆⠀⠀⠀
// // ⠀⠀⠀⠀⢀⣾⣿⣿⣿⣿⣿⣿⡿⠀⠀⠀⠀⠀⠀⠈⢿⣿⣿⣿⠃⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣾⣿⣿⣿⠏⠀⠀⠀⠀⠀⠀⠘⣿⣿⣿⣿⡄⠀⠀⠀⠀⠀⢸⣿⣿⣿⣗⠀⠀⠀⢸⣿⣿⣿⡯⠀⠀⢰⣿⣿⣿⣿⠁⠀⠀⠀⠀⠀⠀⠀⠘⣿⣿⣿⣿⡀⠀⠀
// // ⠀⠀⠀⢠⣿⣿⣿⣿⣿⣿⣿⣟⠀⡀⢀⠀⡀⢀⠀⡀⢈⢿⡟⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣼⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡄⠀⠀⠀⠀⢸⣿⣿⣿⣗⠀⠀⠀⢸⣿⣿⣿⡯⠀⠀⢸⣿⣿⣿⣗⠀⠀⠀⠀⠀⠀⠀⠀⠀⣿⣿⣿⣿⡇⠀⠀
// // ⠀⠀⣠⣿⣿⣿⣿⣿⣿⡿⠋⢻⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣷⣶⣄⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣸⣿⣿⣿⡿⢿⠿⠿⠿⠿⠿⠿⠿⠿⠿⢿⣿⣿⣿⣷⡀⠀⠀⠀⢸⣿⣿⣿⣗⠀⠀⠀⢸⣿⣿⣿⡯⠀⠀⠸⣿⣿⣿⣷⡀⠀⠀⠀⠀⠀⠀⠀⢠⣿⣿⣿⣿⠂⠀⠀
// // ⠀⠀⠙⠛⠿⠻⠻⠛⠉⠀⠀⠈⢿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣷⣄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣰⣿⣿⣿⣿⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢿⣿⣿⣿⣧⠀⠀⠀⢸⣿⣿⣿⣗⠀⠀⠀⢸⣿⣿⣿⡯⠀⠀⠀⢻⣿⣿⣿⣷⣀⢀⠀⠀⠀⡀⣰⣾⣿⣿⣿⠏⠀⠀⠀
// // ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠛⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡄⠀⠀⠀⠀⠀⠀⠀⠀⠀⢰⣿⣿⣿⣿⠃⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠘⣿⣿⣿⣿⣧⠀⠀⢸⣿⣿⣿⣗⠀⠀⠀⢸⣿⣿⣿⡯⠀⠀⠀⠀⠹⢿⣿⣿⣿⣿⣾⣾⣷⣿⣿⣿⣿⡿⠋⠀⠀⠀⠀
// // ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠙⠙⠋⠛⠙⠋⠛⠙⠋⠛⠙⠋⠃⠀⠀⠀⠀⠀⠀⠀⠀⠠⠿⠻⠟⠿⠃⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠸⠟⠿⠟⠿⠆⠀⠸⠿⠿⠟⠯⠀⠀⠀⠸⠿⠿⠿⠏⠀⠀⠀⠀⠀⠈⠉⠻⠻⡿⣿⢿⡿⡿⠿⠛⠁⠀⠀⠀⠀⠀⠀
// //                    allo.gitcoin.co

// /// @title Errors
// /// @author @thelostone-mc <aditya@gitcoin.co>, @KurtMerbeth <kurt@gitcoin.co>, @codenamejason <jason@gitcoin.co>
// /// @notice Library containing all custom errors the protocol may revert with.
// contract Errors {
//     /// ======================
//     /// ====== Generic =======
//     /// ======================

//     /// @notice Thrown as a general error when input / data is invalid
//     error INVALID();

//     /// @notice Thrown when mismatch in decoding data
//     error MISMATCH();

//     /// @notice Thrown when not enough funds are available
//     error NOT_ENOUGH_FUNDS();

//     /// @notice Thrown when user is not authorized
//     error UNAUTHORIZED();

//     /// @notice Thrown when address is the zero address
//     error ZERO_ADDRESS();

//     /// @notice Thrown when the function is not implemented
//     error NOT_IMPLEMENTED();

//     /// ======================
//     /// ====== Registry ======
//     /// ======================

//     /// @dev Thrown when the nonce passed has been used or not available
//     error NONCE_NOT_AVAILABLE();

//     /// @dev Thrown when the 'msg.sender' is not the pending owner on ownership transfer
//     error NOT_PENDING_OWNER();

//     /// @dev Thrown if the anchor creation fails
//     error ANCHOR_ERROR();

//     /// ======================
//     /// ======== Allo ========
//     /// ======================

//     /// @notice Thrown when the strategy is not approved
//     error NOT_APPROVED_STRATEGY();

//     /// @notice Thrown when the strategy is approved and should be cloned
//     error IS_APPROVED_STRATEGY();

//     /// @notice Thrown when the fee is below 1e18 which is the fee percentage denominator
//     error INVALID_FEE();

//     /// ======================
//     /// ===== IStrategy ======
//     /// ======================

//     /// @notice Thrown when data is already intialized
//     error ALREADY_INITIALIZED();

//     /// @notice Thrown when data is yet to be initialized
//     error NOT_INITIALIZED();

//     /// @notice Thrown when an invalid address is used
//     error INVALID_ADDRESS();

//     /// @notice Thrown when a pool is inactive
//     error POOL_INACTIVE();

//     /// @notice Thrown when a pool is already active
//     error POOL_ACTIVE();

//     /// @notice Thrown when two arrays length are not equal
//     error ARRAY_MISMATCH();

//     /// @notice Thrown when the registration is invalid.
//     error INVALID_REGISTRATION();

//     /// @notice Thrown when the metadata is invalid.
//     error INVALID_METADATA();

//     /// @notice Thrown when the recipient is not accepted.
//     error RECIPIENT_NOT_ACCEPTED();

//     /// @notice Thrown when recipient is already accepted.
//     error RECIPIENT_ALREADY_ACCEPTED();

//     /// @notice Thrown when registration is not active.
//     error REGISTRATION_NOT_ACTIVE();

//     /// @notice Thrown when there is an error in recipient.
//     error RECIPIENT_ERROR(address recipientId);

//     /// @notice Thrown when the allocation is not active.
//     error ALLOCATION_NOT_ACTIVE();

//     /// @notice Thrown when the allocation is not ended.
//     error ALLOCATION_NOT_ENDED();

//     /// @notice Thrown when the allocation is active.
//     error ALLOCATION_ACTIVE();
// }

// // lib/allo-v2/contracts/core/libraries/Metadata.sol

// // ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣾⣿⣷⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣼⣿⣿⣷⣄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⣿⣿⣗⠀⠀⠀⢸⣿⣿⣿⡯⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
// // ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣿⣿⣿⣿⣷⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣼⣿⣿⣿⣿⣿⡄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⣿⣿⣗⠀⠀⠀⢸⣿⣿⣿⡯⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
// // ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⣿⣿⣿⣿⣿⡄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣸⣿⣿⣿⢿⣿⣿⣿⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⣿⣿⣗⠀⠀⠀⢸⣿⣿⣿⡯⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
// // ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠘⣿⣿⣿⣿⣿⣿⣿⣄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣰⣿⣿⣿⡟⠘⣿⣿⣿⣷⡀⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⣿⣿⣗⠀⠀⠀⢸⣿⣿⣿⡯⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
// // ⠀⠀⠀⠀⠀⠀⠀⠀⣀⣴⣾⣿⣿⣿⣿⣾⠻⣿⣿⣿⣿⣿⣿⣿⡆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢠⣿⣿⣿⡿⠀⠀⠸⣿⣿⣿⣧⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⣿⣿⣗⠀⠀⠀⢸⣿⣿⣿⡯⠀⠀⠀⠀⠀⠀⢀⣠⣴⣴⣶⣶⣶⣦⣦⣀⡀⠀⠀⠀⠀⠀⠀
// // ⠀⠀⠀⠀⠀⠀⠀⣴⣿⣿⣿⣿⣿⣿⡿⠃⠀⠙⣿⣿⣿⣿⣿⣿⣿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢠⣿⣿⣿⣿⠁⠀⠀⠀⢻⣿⣿⣿⣧⠀⠀⠀⠀⠀⠀⠀⢸⣿⣿⣿⣗⠀⠀⠀⢸⣿⣿⣿⡯⠀⠀⠀⠀⣠⣾⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣶⡀⠀⠀⠀⠀
// // ⠀⠀⠀⠀⠀⢀⣾⣿⣿⣿⣿⣿⣿⡿⠁⠀⠀⠀⠘⣿⣿⣿⣿⣿⡿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣾⣿⣿⣿⠃⠀⠀⠀⠀⠈⢿⣿⣿⣿⣆⠀⠀⠀⠀⠀⠀⢸⣿⣿⣿⣗⠀⠀⠀⢸⣿⣿⣿⡯⠀⠀⠀⣰⣿⣿⣿⡿⠋⠁⠀⠀⠈⠘⠹⣿⣿⣿⣿⣆⠀⠀⠀
// // ⠀⠀⠀⠀⢀⣾⣿⣿⣿⣿⣿⣿⡿⠀⠀⠀⠀⠀⠀⠈⢿⣿⣿⣿⠃⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣾⣿⣿⣿⠏⠀⠀⠀⠀⠀⠀⠘⣿⣿⣿⣿⡄⠀⠀⠀⠀⠀⢸⣿⣿⣿⣗⠀⠀⠀⢸⣿⣿⣿⡯⠀⠀⢰⣿⣿⣿⣿⠁⠀⠀⠀⠀⠀⠀⠀⠘⣿⣿⣿⣿⡀⠀⠀
// // ⠀⠀⠀⢠⣿⣿⣿⣿⣿⣿⣿⣟⠀⡀⢀⠀⡀⢀⠀⡀⢈⢿⡟⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣼⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡄⠀⠀⠀⠀⢸⣿⣿⣿⣗⠀⠀⠀⢸⣿⣿⣿⡯⠀⠀⢸⣿⣿⣿⣗⠀⠀⠀⠀⠀⠀⠀⠀⠀⣿⣿⣿⣿⡇⠀⠀
// // ⠀⠀⣠⣿⣿⣿⣿⣿⣿⡿⠋⢻⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣷⣶⣄⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣸⣿⣿⣿⡿⢿⠿⠿⠿⠿⠿⠿⠿⠿⠿⢿⣿⣿⣿⣷⡀⠀⠀⠀⢸⣿⣿⣿⣗⠀⠀⠀⢸⣿⣿⣿⡯⠀⠀⠸⣿⣿⣿⣷⡀⠀⠀⠀⠀⠀⠀⠀⢠⣿⣿⣿⣿⠂⠀⠀
// // ⠀⠀⠙⠛⠿⠻⠻⠛⠉⠀⠀⠈⢿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣷⣄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣰⣿⣿⣿⣿⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢿⣿⣿⣿⣧⠀⠀⠀⢸⣿⣿⣿⣗⠀⠀⠀⢸⣿⣿⣿⡯⠀⠀⠀⢻⣿⣿⣿⣷⣀⢀⠀⠀⠀⡀⣰⣾⣿⣿⣿⠏⠀⠀⠀
// // ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠛⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡄⠀⠀⠀⠀⠀⠀⠀⠀⠀⢰⣿⣿⣿⣿⠃⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠘⣿⣿⣿⣿⣧⠀⠀⢸⣿⣿⣿⣗⠀⠀⠀⢸⣿⣿⣿⡯⠀⠀⠀⠀⠹⢿⣿⣿⣿⣿⣾⣾⣷⣿⣿⣿⣿⡿⠋⠀⠀⠀⠀
// // ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠙⠙⠋⠛⠙⠋⠛⠙⠋⠛⠙⠋⠃⠀⠀⠀⠀⠀⠀⠀⠀⠠⠿⠻⠟⠿⠃⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠸⠟⠿⠟⠿⠆⠀⠸⠿⠿⠟⠯⠀⠀⠀⠸⠿⠿⠿⠏⠀⠀⠀⠀⠀⠈⠉⠻⠻⡿⣿⢿⡿⡿⠿⠛⠁⠀⠀⠀⠀⠀⠀
// //                    allo.gitcoin.co

// /// @title Metadata
// /// @author @thelostone-mc <aditya@gitcoin.co>, @0xKurt <kurt@gitcoin.co>, @codenamejason <jason@gitcoin.co>, @0xZakk <zakk@gitcoin.co>, @nfrgosselin <nate@gitcoin.co>
// /// @notice Metadata is used to define the metadata for the protocol that is used throughout the system.
// struct Metadata {
//     /// @notice Protocol ID corresponding to a specific protocol (currently using IPFS = 1)
//     uint256 protocol;
//     /// @notice Pointer (hash) to fetch metadata for the specified protocol
//     string pointer;
// }

// // lib/allo-v2/contracts/core/libraries/Native.sol

// // ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣾⣿⣷⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣼⣿⣿⣷⣄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⣿⣿⣗⠀⠀⠀⢸⣿⣿⣿⡯⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
// // ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣿⣿⣿⣿⣷⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣼⣿⣿⣿⣿⣿⡄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⣿⣿⣗⠀⠀⠀⢸⣿⣿⣿⡯⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
// // ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⣿⣿⣿⣿⣿⡄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣸⣿⣿⣿⢿⣿⣿⣿⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⣿⣿⣗⠀⠀⠀⢸⣿⣿⣿⡯⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
// // ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠘⣿⣿⣿⣿⣿⣿⣿⣄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣰⣿⣿⣿⡟⠘⣿⣿⣿⣷⡀⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⣿⣿⣗⠀⠀⠀⢸⣿⣿⣿⡯⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
// // ⠀⠀⠀⠀⠀⠀⠀⠀⣀⣴⣾⣿⣿⣿⣿⣾⠻⣿⣿⣿⣿⣿⣿⣿⡆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢠⣿⣿⣿⡿⠀⠀⠸⣿⣿⣿⣧⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⣿⣿⣗⠀⠀⠀⢸⣿⣿⣿⡯⠀⠀⠀⠀⠀⠀⢀⣠⣴⣴⣶⣶⣶⣦⣦⣀⡀⠀⠀⠀⠀⠀⠀
// // ⠀⠀⠀⠀⠀⠀⠀⣴⣿⣿⣿⣿⣿⣿⡿⠃⠀⠙⣿⣿⣿⣿⣿⣿⣿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢠⣿⣿⣿⣿⠁⠀⠀⠀⢻⣿⣿⣿⣧⠀⠀⠀⠀⠀⠀⠀⢸⣿⣿⣿⣗⠀⠀⠀⢸⣿⣿⣿⡯⠀⠀⠀⠀⣠⣾⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣶⡀⠀⠀⠀⠀
// // ⠀⠀⠀⠀⠀⢀⣾⣿⣿⣿⣿⣿⣿⡿⠁⠀⠀⠀⠘⣿⣿⣿⣿⣿⡿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣾⣿⣿⣿⠃⠀⠀⠀⠀⠈⢿⣿⣿⣿⣆⠀⠀⠀⠀⠀⠀⢸⣿⣿⣿⣗⠀⠀⠀⢸⣿⣿⣿⡯⠀⠀⠀⣰⣿⣿⣿⡿⠋⠁⠀⠀⠈⠘⠹⣿⣿⣿⣿⣆⠀⠀⠀
// // ⠀⠀⠀⠀⢀⣾⣿⣿⣿⣿⣿⣿⡿⠀⠀⠀⠀⠀⠀⠈⢿⣿⣿⣿⠃⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣾⣿⣿⣿⠏⠀⠀⠀⠀⠀⠀⠘⣿⣿⣿⣿⡄⠀⠀⠀⠀⠀⢸⣿⣿⣿⣗⠀⠀⠀⢸⣿⣿⣿⡯⠀⠀⢰⣿⣿⣿⣿⠁⠀⠀⠀⠀⠀⠀⠀⠘⣿⣿⣿⣿⡀⠀⠀
// // ⠀⠀⠀⢠⣿⣿⣿⣿⣿⣿⣿⣟⠀⡀⢀⠀⡀⢀⠀⡀⢈⢿⡟⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣼⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡄⠀⠀⠀⠀⢸⣿⣿⣿⣗⠀⠀⠀⢸⣿⣿⣿⡯⠀⠀⢸⣿⣿⣿⣗⠀⠀⠀⠀⠀⠀⠀⠀⠀⣿⣿⣿⣿⡇⠀⠀
// // ⠀⠀⣠⣿⣿⣿⣿⣿⣿⡿⠋⢻⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣷⣶⣄⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣸⣿⣿⣿⡿⢿⠿⠿⠿⠿⠿⠿⠿⠿⠿⢿⣿⣿⣿⣷⡀⠀⠀⠀⢸⣿⣿⣿⣗⠀⠀⠀⢸⣿⣿⣿⡯⠀⠀⠸⣿⣿⣿⣷⡀⠀⠀⠀⠀⠀⠀⠀⢠⣿⣿⣿⣿⠂⠀⠀
// // ⠀⠀⠙⠛⠿⠻⠻⠛⠉⠀⠀⠈⢿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣷⣄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣰⣿⣿⣿⣿⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢿⣿⣿⣿⣧⠀⠀⠀⢸⣿⣿⣿⣗⠀⠀⠀⢸⣿⣿⣿⡯⠀⠀⠀⢻⣿⣿⣿⣷⣀⢀⠀⠀⠀⡀⣰⣾⣿⣿⣿⠏⠀⠀⠀
// // ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠛⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡄⠀⠀⠀⠀⠀⠀⠀⠀⠀⢰⣿⣿⣿⣿⠃⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠘⣿⣿⣿⣿⣧⠀⠀⢸⣿⣿⣿⣗⠀⠀⠀⢸⣿⣿⣿⡯⠀⠀⠀⠀⠹⢿⣿⣿⣿⣿⣾⣾⣷⣿⣿⣿⣿⡿⠋⠀⠀⠀⠀
// // ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠙⠙⠋⠛⠙⠋⠛⠙⠋⠛⠙⠋⠃⠀⠀⠀⠀⠀⠀⠀⠀⠠⠿⠻⠟⠿⠃⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠸⠟⠿⠟⠿⠆⠀⠸⠿⠿⠟⠯⠀⠀⠀⠸⠿⠿⠿⠏⠀⠀⠀⠀⠀⠈⠉⠻⠻⡿⣿⢿⡿⡿⠿⠛⠁⠀⠀⠀⠀⠀⠀
// //                    allo.gitcoin.co

// /// @title Native token information
// /// @author @thelostone-mc <aditya@gitcoin.co>, @0xKurt <kurt@gitcoin.co>, @codenamejason <jason@gitcoin.co>, @0xZakk <zakk@gitcoin.co>, @nfrgosselin <nate@gitcoin.co>
// /// @notice This is used to define the address of the native token for the protocol
// contract Native {
//     /// @notice Address of the native token
//     address public constant NATIVE = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
// }

// // lib/allo-v2/lib/solady/src/utils/SafeTransferLib.sol

// /// @notice Safe ETH and ERC20 transfer library that gracefully handles missing return values.
// /// @author Solady (https://github.com/vectorized/solady/blob/main/src/utils/SafeTransferLib.sol)
// /// @author Modified from Solmate (https://github.com/transmissions11/solmate/blob/main/src/utils/SafeTransferLib.sol)
// ///
// /// @dev Note:
// /// - For ETH transfers, please use `forceSafeTransferETH` for gas griefing protection.
// /// - For ERC20s, this implementation won't check that a token has code,
// /// responsibility is delegated to the caller.
// library SafeTransferLib {
//     /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
//     /*                       CUSTOM ERRORS                        */
//     /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

//     /// @dev The ETH transfer has failed.
//     error ETHTransferFailed();

//     /// @dev The ERC20 `transferFrom` has failed.
//     error TransferFromFailed();

//     /// @dev The ERC20 `transfer` has failed.
//     error TransferFailed();

//     /// @dev The ERC20 `approve` has failed.
//     error ApproveFailed();

//     /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
//     /*                         CONSTANTS                          */
//     /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

//     /// @dev Suggested gas stipend for contract receiving ETH
//     /// that disallows any storage writes.
//     uint256 internal constant GAS_STIPEND_NO_STORAGE_WRITES = 2300;

//     /// @dev Suggested gas stipend for contract receiving ETH to perform a few
//     /// storage reads and writes, but low enough to prevent griefing.
//     /// Multiply by a small constant (e.g. 2), if needed.
//     uint256 internal constant GAS_STIPEND_NO_GRIEF = 100000;

//     /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
//     /*                       ETH OPERATIONS                       */
//     /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

//     /// @dev Sends `amount` (in wei) ETH to `to`.
//     /// Reverts upon failure.
//     ///
//     /// Note: This implementation does NOT protect against gas griefing.
//     /// Please use `forceSafeTransferETH` for gas griefing protection.
//     function safeTransferETH(address to, uint256 amount) internal {
//         /// @solidity memory-safe-assembly
//         assembly {
//             // Transfer the ETH and check if it succeeded or not.
//             if iszero(call(gas(), to, amount, 0x00, 0x00, 0x00, 0x00)) {
//                 // Store the function selector of `ETHTransferFailed()`.
//                 mstore(0x00, 0xb12d13eb)
//                 // Revert with (offset, size).
//                 revert(0x1c, 0x04)
//             }
//         }
//     }

//     /// @dev Force sends `amount` (in wei) ETH to `to`, with a `gasStipend`.
//     /// The `gasStipend` can be set to a low enough value to prevent
//     /// storage writes or gas griefing.
//     ///
//     /// If sending via the normal procedure fails, force sends the ETH by
//     /// creating a temporary contract which uses `SELFDESTRUCT` to force send the ETH.
//     ///
//     /// Reverts if the current contract has insufficient balance.
//     function forceSafeTransferETH(address to, uint256 amount, uint256 gasStipend) internal {
//         /// @solidity memory-safe-assembly
//         assembly {
//             // If insufficient balance, revert.
//             if lt(selfbalance(), amount) {
//                 // Store the function selector of `ETHTransferFailed()`.
//                 mstore(0x00, 0xb12d13eb)
//                 // Revert with (offset, size).
//                 revert(0x1c, 0x04)
//             }
//             // Transfer the ETH and check if it succeeded or not.
//             if iszero(call(gasStipend, to, amount, 0x00, 0x00, 0x00, 0x00)) {
//                 mstore(0x00, to) // Store the address in scratch space.
//                 mstore8(0x0b, 0x73) // Opcode `PUSH20`.
//                 mstore8(0x20, 0xff) // Opcode `SELFDESTRUCT`.
//                 // We can directly use `SELFDESTRUCT` in the contract creation.
//                 // Compatible with `SENDALL`: https://eips.ethereum.org/EIPS/eip-4758
//                 if iszero(create(amount, 0x0b, 0x16)) {
//                     // To coerce gas estimation to provide enough gas for the `create` above.
//                     if iszero(gt(gas(), 1000000)) { revert(0x00, 0x00) }
//                 }
//             }
//         }
//     }

//     /// @dev Force sends `amount` (in wei) ETH to `to`, with a gas stipend
//     /// equal to `GAS_STIPEND_NO_GRIEF`. This gas stipend is a reasonable default
//     /// for 99% of cases and can be overridden with the three-argument version of this
//     /// function if necessary.
//     ///
//     /// If sending via the normal procedure fails, force sends the ETH by
//     /// creating a temporary contract which uses `SELFDESTRUCT` to force send the ETH.
//     ///
//     /// Reverts if the current contract has insufficient balance.
//     function forceSafeTransferETH(address to, uint256 amount) internal {
//         // Manually inlined because the compiler doesn't inline functions with branches.
//         /// @solidity memory-safe-assembly
//         assembly {
//             // If insufficient balance, revert.
//             if lt(selfbalance(), amount) {
//                 // Store the function selector of `ETHTransferFailed()`.
//                 mstore(0x00, 0xb12d13eb)
//                 // Revert with (offset, size).
//                 revert(0x1c, 0x04)
//             }
//             // Transfer the ETH and check if it succeeded or not.
//             if iszero(call(GAS_STIPEND_NO_GRIEF, to, amount, 0x00, 0x00, 0x00, 0x00)) {
//                 mstore(0x00, to) // Store the address in scratch space.
//                 mstore8(0x0b, 0x73) // Opcode `PUSH20`.
//                 mstore8(0x20, 0xff) // Opcode `SELFDESTRUCT`.
//                 // We can directly use `SELFDESTRUCT` in the contract creation.
//                 // Compatible with `SENDALL`: https://eips.ethereum.org/EIPS/eip-4758
//                 if iszero(create(amount, 0x0b, 0x16)) {
//                     // To coerce gas estimation to provide enough gas for the `create` above.
//                     if iszero(gt(gas(), 1000000)) { revert(0x00, 0x00) }
//                 }
//             }
//         }
//     }

//     /// @dev Sends `amount` (in wei) ETH to `to`, with a `gasStipend`.
//     /// The `gasStipend` can be set to a low enough value to prevent
//     /// storage writes or gas griefing.
//     ///
//     /// Simply use `gasleft()` for `gasStipend` if you don't need a gas stipend.
//     ///
//     /// Note: Does NOT revert upon failure.
//     /// Returns whether the transfer of ETH is successful instead.
//     // function trySafeTransferETH(address to, uint256 amount, uint256 gasStipend)
//     //     internal
//     //     returns (bool success)
//     // {
//     //     /// @solidity memory-safe-assembly
//     //     assembly {
//     //         // Transfer the ETH and check if it succeeded or not.
//     //         success := call(gasStipend, to, amount, 0x00, 0x00, 0x00, 0x00)
//     //     }
//     // }

//     /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
//     /*                      ERC20 OPERATIONS                      */
//     /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

//     /// @dev Sends `amount` of ERC20 `token` from `from` to `to`.
//     /// Reverts upon failure.
//     ///
//     /// The `from` account must have at least `amount` approved for
//     /// the current contract to manage.
//     function safeTransferFrom(address token, address from, address to, uint256 amount) internal {
//         /// @solidity memory-safe-assembly
//         assembly {
//             let m := mload(0x40) // Cache the free memory pointer.

//             mstore(0x60, amount) // Store the `amount` argument.
//             mstore(0x40, to) // Store the `to` argument.
//             mstore(0x2c, shl(96, from)) // Store the `from` argument.
//             // Store the function selector of `transferFrom(address,address,uint256)`.
//             mstore(0x0c, 0x23b872dd000000000000000000000000)

//             if iszero(
//                 and( // The arguments of `and` are evaluated from right to left.
//                     // Set success to whether the call reverted, if not we check it either
//                     // returned exactly 1 (can't just be non-zero data), or had no return data.
//                     or(eq(mload(0x00), 1), iszero(returndatasize())),
//                     call(gas(), token, 0, 0x1c, 0x64, 0x00, 0x20)
//                 )
//             ) {
//                 // Store the function selector of `TransferFromFailed()`.
//                 mstore(0x00, 0x7939f424)
//                 // Revert with (offset, size).
//                 revert(0x1c, 0x04)
//             }

//             mstore(0x60, 0) // Restore the zero slot to zero.
//             mstore(0x40, m) // Restore the free memory pointer.
//         }
//     }

//     /// @dev Sends all of ERC20 `token` from `from` to `to`.
//     /// Reverts upon failure.
//     ///
//     /// The `from` account must have their entire balance approved for
//     /// the current contract to manage.
//     // function safeTransferAllFrom(address token, address from, address to)
//     //     internal
//     //     returns (uint256 amount)
//     // {
//     //     /// @solidity memory-safe-assembly
//     //     assembly {
//     //         let m := mload(0x40) // Cache the free memory pointer.

//     //         mstore(0x40, to) // Store the `to` argument.
//     //         mstore(0x2c, shl(96, from)) // Store the `from` argument.
//     //         // Store the function selector of `balanceOf(address)`.
//     //         mstore(0x0c, 0x70a08231000000000000000000000000)
//     //         if iszero(
//     //             and( // The arguments of `and` are evaluated from right to left.
//     //                 gt(returndatasize(), 0x1f), // At least 32 bytes returned.
//     //                 staticcall(gas(), token, 0x1c, 0x24, 0x60, 0x20)
//     //             )
//     //         ) {
//     //             // Store the function selector of `TransferFromFailed()`.
//     //             mstore(0x00, 0x7939f424)
//     //             // Revert with (offset, size).
//     //             revert(0x1c, 0x04)
//     //         }

//     //         // Store the function selector of `transferFrom(address,address,uint256)`.
//     //         mstore(0x00, 0x23b872dd)
//     //         // The `amount` is already at 0x60. Load it for the function's return value.
//     //         amount := mload(0x60)

//     //         if iszero(
//     //             and( // The arguments of `and` are evaluated from right to left.
//     //                 // Set success to whether the call reverted, if not we check it either
//     //                 // returned exactly 1 (can't just be non-zero data), or had no return data.
//     //                 or(eq(mload(0x00), 1), iszero(returndatasize())),
//     //                 call(gas(), token, 0, 0x1c, 0x64, 0x00, 0x20)
//     //             )
//     //         ) {
//     //             // Store the function selector of `TransferFromFailed()`.
//     //             mstore(0x00, 0x7939f424)
//     //             // Revert with (offset, size).
//     //             revert(0x1c, 0x04)
//     //         }

//     //         mstore(0x60, 0) // Restore the zero slot to zero.
//     //         mstore(0x40, m) // Restore the free memory pointer.
//     //     }
//     // }

//     /// @dev Sends `amount` of ERC20 `token` from the current contract to `to`.
//     /// Reverts upon failure.
//     function safeTransfer(address token, address to, uint256 amount) internal {
//         /// @solidity memory-safe-assembly
//         assembly {
//             mstore(0x14, to) // Store the `to` argument.
//             mstore(0x34, amount) // Store the `amount` argument.
//             // Store the function selector of `transfer(address,uint256)`.
//             mstore(0x00, 0xa9059cbb000000000000000000000000)

//             if iszero(
//                 and( // The arguments of `and` are evaluated from right to left.
//                     // Set success to whether the call reverted, if not we check it either
//                     // returned exactly 1 (can't just be non-zero data), or had no return data.
//                     or(eq(mload(0x00), 1), iszero(returndatasize())),
//                     call(gas(), token, 0, 0x10, 0x44, 0x00, 0x20)
//                 )
//             ) {
//                 // Store the function selector of `TransferFailed()`.
//                 mstore(0x00, 0x90b8ec18)
//                 // Revert with (offset, size).
//                 revert(0x1c, 0x04)
//             }
//             // Restore the part of the free memory pointer that was overwritten.
//             mstore(0x34, 0)
//         }
//     }

//     /// @dev Sends all of ERC20 `token` from the current contract to `to`.
//     /// Reverts upon failure.
//     // function safeTransferAll(address token, address to) internal returns (uint256 amount) {
//     //     /// @solidity memory-safe-assembly
//     //     assembly {
//     //         mstore(0x00, 0x70a08231) // Store the function selector of `balanceOf(address)`.
//     //         mstore(0x20, address()) // Store the address of the current contract.
//     //         if iszero(
//     //             and( // The arguments of `and` are evaluated from right to left.
//     //                 gt(returndatasize(), 0x1f), // At least 32 bytes returned.
//     //                 staticcall(gas(), token, 0x1c, 0x24, 0x34, 0x20)
//     //             )
//     //         ) {
//     //             // Store the function selector of `TransferFailed()`.
//     //             mstore(0x00, 0x90b8ec18)
//     //             // Revert with (offset, size).
//     //             revert(0x1c, 0x04)
//     //         }

//     //         mstore(0x14, to) // Store the `to` argument.
//     //         // The `amount` is already at 0x34. Load it for the function's return value.
//     //         amount := mload(0x34)
//     //         // Store the function selector of `transfer(address,uint256)`.
//     //         mstore(0x00, 0xa9059cbb000000000000000000000000)

//     //         if iszero(
//     //             and( // The arguments of `and` are evaluated from right to left.
//     //                 // Set success to whether the call reverted, if not we check it either
//     //                 // returned exactly 1 (can't just be non-zero data), or had no return data.
//     //                 or(eq(mload(0x00), 1), iszero(returndatasize())),
//     //                 call(gas(), token, 0, 0x10, 0x44, 0x00, 0x20)
//     //             )
//     //         ) {
//     //             // Store the function selector of `TransferFailed()`.
//     //             mstore(0x00, 0x90b8ec18)
//     //             // Revert with (offset, size).
//     //             revert(0x1c, 0x04)
//     //         }
//     //         // Restore the part of the free memory pointer that was overwritten.
//     //         mstore(0x34, 0)
//     //     }
//     // }

//     /// @dev Sets `amount` of ERC20 `token` for `to` to manage on behalf of the current contract.
//     /// Reverts upon failure.
//     // function safeApprove(address token, address to, uint256 amount) internal {
//     //     /// @solidity memory-safe-assembly
//     //     assembly {
//     //         mstore(0x14, to) // Store the `to` argument.
//     //         mstore(0x34, amount) // Store the `amount` argument.
//     //         // Store the function selector of `approve(address,uint256)`.
//     //         mstore(0x00, 0x095ea7b3000000000000000000000000)

//     //         if iszero(
//     //             and( // The arguments of `and` are evaluated from right to left.
//     //                 // Set success to whether the call reverted, if not we check it either
//     //                 // returned exactly 1 (can't just be non-zero data), or had no return data.
//     //                 or(eq(mload(0x00), 1), iszero(returndatasize())),
//     //                 call(gas(), token, 0, 0x10, 0x44, 0x00, 0x20)
//     //             )
//     //         ) {
//     //             // Store the function selector of `ApproveFailed()`.
//     //             mstore(0x00, 0x3e3f8f73)
//     //             // Revert with (offset, size).
//     //             revert(0x1c, 0x04)
//     //         }
//     //         // Restore the part of the free memory pointer that was overwritten.
//     //         mstore(0x34, 0)
//     //     }
//     // }

//     /// @dev Sets `amount` of ERC20 `token` for `to` to manage on behalf of the current contract.
//     /// If the initial attempt to approve fails, attempts to reset the approved amount to zero,
//     /// then retries the approval again (some tokens, e.g. USDT, requires this).
//     /// Reverts upon failure.
//     // function safeApproveWithRetry(address token, address to, uint256 amount) internal {
//     //     /// @solidity memory-safe-assembly
//     //     assembly {
//     //         mstore(0x14, to) // Store the `to` argument.
//     //         mstore(0x34, amount) // Store the `amount` argument.
//     //         // Store the function selector of `approve(address,uint256)`.
//     //         mstore(0x00, 0x095ea7b3000000000000000000000000)

//     //         if iszero(
//     //             and( // The arguments of `and` are evaluated from right to left.
//     //                 // Set success to whether the call reverted, if not we check it either
//     //                 // returned exactly 1 (can't just be non-zero data), or had no return data.
//     //                 or(eq(mload(0x00), 1), iszero(returndatasize())),
//     //                 call(gas(), token, 0, 0x10, 0x44, 0x00, 0x20)
//     //             )
//     //         ) {
//     //             mstore(0x34, 0) // Store 0 for the `amount`.
//     //             mstore(0x00, 0x095ea7b3000000000000000000000000) // Store the function selector.
//     //             // We can ignore the result of this call. Just need to check the next call.
//     //             pop(call(gas(), token, 0, 0x10, 0x44, 0x00, 0x00))
//     //             mstore(0x34, amount) // Store back the original `amount`.

//     //             if iszero(
//     //                 and(
//     //                     or(eq(mload(0x00), 1), iszero(returndatasize())),
//     //                     call(gas(), token, 0, 0x10, 0x44, 0x00, 0x20)
//     //                 )
//     //             ) {
//     //                 // Store the function selector of `ApproveFailed()`.
//     //                 mstore(0x00, 0x3e3f8f73)
//     //                 // Revert with (offset, size).
//     //                 revert(0x1c, 0x04)
//     //             }
//     //         }
//     //         // Restore the part of the free memory pointer that was overwritten.
//     //         mstore(0x34, 0)
//     //     }
//     // }

//     /// @dev Returns the amount of ERC20 `token` owned by `account`.
//     /// Returns zero if the `token` does not exist.
//     function balanceOf(address token, address account) internal view returns (uint256 amount) {
//         /// @solidity memory-safe-assembly
//         assembly {
//             mstore(0x14, account) // Store the `account` argument.
//             // Store the function selector of `balanceOf(address)`.
//             mstore(0x00, 0x70a08231000000000000000000000000)
//             amount :=
//                 mul(
//                     mload(0x20),
//                     and( // The arguments of `and` are evaluated from right to left.
//                         gt(returndatasize(), 0x1f), // At least 32 bytes returned.
//                         staticcall(gas(), token, 0x10, 0x24, 0x20, 0x20)
//                     )
//                 )
//         }
//     }
// }

// // lib/forge-std/src/Vm.sol
// // Automatically @generated by scripts/vm.py. Do not modify manually.

// /// The `VmSafe` interface does not allow manipulation of the EVM state or other actions that may
// /// result in Script simulations differing from on-chain execution. It is recommended to only use
// /// these cheats in scripts.
// interface VmSafe {
//     /// A modification applied to either `msg.sender` or `tx.origin`. Returned by `readCallers`.
//     enum CallerMode {
//         // No caller modification is currently active.
//         None,
//         // A one time broadcast triggered by a `vm.broadcast()` call is currently active.
//         Broadcast,
//         // A recurrent broadcast triggered by a `vm.startBroadcast()` call is currently active.
//         RecurrentBroadcast,
//         // A one time prank triggered by a `vm.prank()` call is currently active.
//         Prank,
//         // A recurrent prank triggered by a `vm.startPrank()` call is currently active.
//         RecurrentPrank
//     }

//     /// The kind of account access that occurred.
//     enum AccountAccessKind {
//         // The account was called.
//         Call,
//         // The account was called via delegatecall.
//         DelegateCall,
//         // The account was called via callcode.
//         CallCode,
//         // The account was called via staticcall.
//         StaticCall,
//         // The account was created.
//         Create,
//         // The account was selfdestructed.
//         SelfDestruct,
//         // Synthetic access indicating the current context has resumed after a previous sub-context (AccountAccess).
//         Resume,
//         // The account's balance was read.
//         Balance,
//         // The account's codesize was read.
//         Extcodesize,
//         // The account's codehash was read.
//         Extcodehash,
//         // The account's code was copied.
//         Extcodecopy
//     }

//     /// An Ethereum log. Returned by `getRecordedLogs`.
//     struct Log {
//         // The topics of the log, including the signature, if any.
//         bytes32[] topics;
//         // The raw data of the log.
//         bytes data;
//         // The address of the log's emitter.
//         address emitter;
//     }

//     /// An RPC URL and its alias. Returned by `rpcUrlStructs`.
//     struct Rpc {
//         // The alias of the RPC URL.
//         string key;
//         // The RPC URL.
//         string url;
//     }

//     /// An RPC log object. Returned by `eth_getLogs`.
//     struct EthGetLogs {
//         // The address of the log's emitter.
//         address emitter;
//         // The topics of the log, including the signature, if any.
//         bytes32[] topics;
//         // The raw data of the log.
//         bytes data;
//         // The block hash.
//         bytes32 blockHash;
//         // The block number.
//         uint64 blockNumber;
//         // The transaction hash.
//         bytes32 transactionHash;
//         // The transaction index in the block.
//         uint64 transactionIndex;
//         // The log index.
//         uint256 logIndex;
//         // Whether the log was removed.
//         bool removed;
//     }

//     /// A single entry in a directory listing. Returned by `readDir`.
//     struct DirEntry {
//         // The error message, if any.
//         string errorMessage;
//         // The path of the entry.
//         string path;
//         // The depth of the entry.
//         uint64 depth;
//         // Whether the entry is a directory.
//         bool isDir;
//         // Whether the entry is a symlink.
//         bool isSymlink;
//     }

//     /// Metadata information about a file.
//     /// This structure is returned from the `fsMetadata` function and represents known
//     /// metadata about a file such as its permissions, size, modification
//     /// times, etc.
//     struct FsMetadata {
//         // True if this metadata is for a directory.
//         bool isDir;
//         // True if this metadata is for a symlink.
//         bool isSymlink;
//         // The size of the file, in bytes, this metadata is for.
//         uint256 length;
//         // True if this metadata is for a readonly (unwritable) file.
//         bool readOnly;
//         // The last modification time listed in this metadata.
//         uint256 modified;
//         // The last access time of this metadata.
//         uint256 accessed;
//         // The creation time listed in this metadata.
//         uint256 created;
//     }

//     /// A wallet with a public and private key.
//     struct Wallet {
//         // The wallet's address.
//         address addr;
//         // The wallet's public key `X`.
//         uint256 publicKeyX;
//         // The wallet's public key `Y`.
//         uint256 publicKeyY;
//         // The wallet's private key.
//         uint256 privateKey;
//     }

//     /// The result of a `tryFfi` call.
//     struct FfiResult {
//         // The exit code of the call.
//         int32 exitCode;
//         // The optionally hex-decoded `stdout` data.
//         bytes stdout;
//         // The `stderr` data.
//         bytes stderr;
//     }

//     /// Information on the chain and fork.
//     struct ChainInfo {
//         // The fork identifier. Set to zero if no fork is active.
//         uint256 forkId;
//         // The chain ID of the current fork.
//         uint256 chainId;
//     }

//     /// The result of a `stopAndReturnStateDiff` call.
//     struct AccountAccess {
//         // The chain and fork the access occurred.
//         ChainInfo chainInfo;
//         // The kind of account access that determines what the account is.
//         // If kind is Call, DelegateCall, StaticCall or CallCode, then the account is the callee.
//         // If kind is Create, then the account is the newly created account.
//         // If kind is SelfDestruct, then the account is the selfdestruct recipient.
//         // If kind is a Resume, then account represents a account context that has resumed.
//         AccountAccessKind kind;
//         // The account that was accessed.
//         // It's either the account created, callee or a selfdestruct recipient for CREATE, CALL or SELFDESTRUCT.
//         address account;
//         // What accessed the account.
//         address accessor;
//         // If the account was initialized or empty prior to the access.
//         // An account is considered initialized if it has code, a
//         // non-zero nonce, or a non-zero balance.
//         bool initialized;
//         // The previous balance of the accessed account.
//         uint256 oldBalance;
//         // The potential new balance of the accessed account.
//         // That is, all balance changes are recorded here, even if reverts occurred.
//         uint256 newBalance;
//         // Code of the account deployed by CREATE.
//         bytes deployedCode;
//         // Value passed along with the account access
//         uint256 value;
//         // Input data provided to the CREATE or CALL
//         bytes data;
//         // If this access reverted in either the current or parent context.
//         bool reverted;
//         // An ordered list of storage accesses made during an account access operation.
//         StorageAccess[] storageAccesses;
//         // Call depth traversed during the recording of state differences
//         uint64 depth;
//     }

//     /// The storage accessed during an `AccountAccess`.
//     struct StorageAccess {
//         // The account whose storage was accessed.
//         address account;
//         // The slot that was accessed.
//         bytes32 slot;
//         // If the access was a write.
//         bool isWrite;
//         // The previous value of the slot.
//         bytes32 previousValue;
//         // The new value of the slot.
//         bytes32 newValue;
//         // If the access was reverted.
//         bool reverted;
//     }

//     // ======== Environment ========

//     /// Gets the environment variable `name` and parses it as `address`.
//     /// Reverts if the variable was not found or could not be parsed.
//     function envAddress(string calldata name) external view returns (address value);

//     /// Gets the environment variable `name` and parses it as an array of `address`, delimited by `delim`.
//     /// Reverts if the variable was not found or could not be parsed.
//     function envAddress(string calldata name, string calldata delim) external view returns (address[] memory value);

//     /// Gets the environment variable `name` and parses it as `bool`.
//     /// Reverts if the variable was not found or could not be parsed.
//     function envBool(string calldata name) external view returns (bool value);

//     /// Gets the environment variable `name` and parses it as an array of `bool`, delimited by `delim`.
//     /// Reverts if the variable was not found or could not be parsed.
//     function envBool(string calldata name, string calldata delim) external view returns (bool[] memory value);

//     /// Gets the environment variable `name` and parses it as `bytes32`.
//     /// Reverts if the variable was not found or could not be parsed.
//     function envBytes32(string calldata name) external view returns (bytes32 value);

//     /// Gets the environment variable `name` and parses it as an array of `bytes32`, delimited by `delim`.
//     /// Reverts if the variable was not found or could not be parsed.
//     function envBytes32(string calldata name, string calldata delim) external view returns (bytes32[] memory value);

//     /// Gets the environment variable `name` and parses it as `bytes`.
//     /// Reverts if the variable was not found or could not be parsed.
//     function envBytes(string calldata name) external view returns (bytes memory value);

//     /// Gets the environment variable `name` and parses it as an array of `bytes`, delimited by `delim`.
//     /// Reverts if the variable was not found or could not be parsed.
//     function envBytes(string calldata name, string calldata delim) external view returns (bytes[] memory value);

//     /// Gets the environment variable `name` and parses it as `int256`.
//     /// Reverts if the variable was not found or could not be parsed.
//     function envInt(string calldata name) external view returns (int256 value);

//     /// Gets the environment variable `name` and parses it as an array of `int256`, delimited by `delim`.
//     /// Reverts if the variable was not found or could not be parsed.
//     function envInt(string calldata name, string calldata delim) external view returns (int256[] memory value);

//     /// Gets the environment variable `name` and parses it as `bool`.
//     /// Reverts if the variable could not be parsed.
//     /// Returns `defaultValue` if the variable was not found.
//     function envOr(string calldata name, bool defaultValue) external view returns (bool value);

//     /// Gets the environment variable `name` and parses it as `uint256`.
//     /// Reverts if the variable could not be parsed.
//     /// Returns `defaultValue` if the variable was not found.
//     function envOr(string calldata name, uint256 defaultValue) external view returns (uint256 value);

//     /// Gets the environment variable `name` and parses it as an array of `address`, delimited by `delim`.
//     /// Reverts if the variable could not be parsed.
//     /// Returns `defaultValue` if the variable was not found.
//     function envOr(string calldata name, string calldata delim, address[] calldata defaultValue)
//         external
//         view
//         returns (address[] memory value);

//     /// Gets the environment variable `name` and parses it as an array of `bytes32`, delimited by `delim`.
//     /// Reverts if the variable could not be parsed.
//     /// Returns `defaultValue` if the variable was not found.
//     function envOr(string calldata name, string calldata delim, bytes32[] calldata defaultValue)
//         external
//         view
//         returns (bytes32[] memory value);

//     /// Gets the environment variable `name` and parses it as an array of `string`, delimited by `delim`.
//     /// Reverts if the variable could not be parsed.
//     /// Returns `defaultValue` if the variable was not found.
//     function envOr(string calldata name, string calldata delim, string[] calldata defaultValue)
//         external
//         view
//         returns (string[] memory value);

//     /// Gets the environment variable `name` and parses it as an array of `bytes`, delimited by `delim`.
//     /// Reverts if the variable could not be parsed.
//     /// Returns `defaultValue` if the variable was not found.
//     function envOr(string calldata name, string calldata delim, bytes[] calldata defaultValue)
//         external
//         view
//         returns (bytes[] memory value);

//     /// Gets the environment variable `name` and parses it as `int256`.
//     /// Reverts if the variable could not be parsed.
//     /// Returns `defaultValue` if the variable was not found.
//     function envOr(string calldata name, int256 defaultValue) external view returns (int256 value);

//     /// Gets the environment variable `name` and parses it as `address`.
//     /// Reverts if the variable could not be parsed.
//     /// Returns `defaultValue` if the variable was not found.
//     function envOr(string calldata name, address defaultValue) external view returns (address value);

//     /// Gets the environment variable `name` and parses it as `bytes32`.
//     /// Reverts if the variable could not be parsed.
//     /// Returns `defaultValue` if the variable was not found.
//     function envOr(string calldata name, bytes32 defaultValue) external view returns (bytes32 value);

//     /// Gets the environment variable `name` and parses it as `string`.
//     /// Reverts if the variable could not be parsed.
//     /// Returns `defaultValue` if the variable was not found.
//     function envOr(string calldata name, string calldata defaultValue) external view returns (string memory value);

//     /// Gets the environment variable `name` and parses it as `bytes`.
//     /// Reverts if the variable could not be parsed.
//     /// Returns `defaultValue` if the variable was not found.
//     function envOr(string calldata name, bytes calldata defaultValue) external view returns (bytes memory value);

//     /// Gets the environment variable `name` and parses it as an array of `bool`, delimited by `delim`.
//     /// Reverts if the variable could not be parsed.
//     /// Returns `defaultValue` if the variable was not found.
//     function envOr(string calldata name, string calldata delim, bool[] calldata defaultValue)
//         external
//         view
//         returns (bool[] memory value);

//     /// Gets the environment variable `name` and parses it as an array of `uint256`, delimited by `delim`.
//     /// Reverts if the variable could not be parsed.
//     /// Returns `defaultValue` if the variable was not found.
//     function envOr(string calldata name, string calldata delim, uint256[] calldata defaultValue)
//         external
//         view
//         returns (uint256[] memory value);

//     /// Gets the environment variable `name` and parses it as an array of `int256`, delimited by `delim`.
//     /// Reverts if the variable could not be parsed.
//     /// Returns `defaultValue` if the variable was not found.
//     function envOr(string calldata name, string calldata delim, int256[] calldata defaultValue)
//         external
//         view
//         returns (int256[] memory value);

//     /// Gets the environment variable `name` and parses it as `string`.
//     /// Reverts if the variable was not found or could not be parsed.
//     function envString(string calldata name) external view returns (string memory value);

//     /// Gets the environment variable `name` and parses it as an array of `string`, delimited by `delim`.
//     /// Reverts if the variable was not found or could not be parsed.
//     function envString(string calldata name, string calldata delim) external view returns (string[] memory value);

//     /// Gets the environment variable `name` and parses it as `uint256`.
//     /// Reverts if the variable was not found or could not be parsed.
//     function envUint(string calldata name) external view returns (uint256 value);

//     /// Gets the environment variable `name` and parses it as an array of `uint256`, delimited by `delim`.
//     /// Reverts if the variable was not found or could not be parsed.
//     function envUint(string calldata name, string calldata delim) external view returns (uint256[] memory value);

//     /// Sets environment variables.
//     function setEnv(string calldata name, string calldata value) external;

//     // ======== EVM ========

//     /// Gets all accessed reads and write slot from a `vm.record` session, for a given address.
//     function accesses(address target) external returns (bytes32[] memory readSlots, bytes32[] memory writeSlots);

//     /// Gets the address for a given private key.
//     function addr(uint256 privateKey) external pure returns (address keyAddr);

//     /// Gets all the logs according to specified filter.
//     function eth_getLogs(uint256 fromBlock, uint256 toBlock, address target, bytes32[] calldata topics)
//         external
//         returns (EthGetLogs[] memory logs);

//     /// Gets the current `block.number`.
//     /// You should use this instead of `block.number` if you use `vm.roll`, as `block.number` is assumed to be constant across a transaction,
//     /// and as a result will get optimized out by the compiler.
//     /// See https://github.com/foundry-rs/foundry/issues/6180
//     function getBlockNumber() external view returns (uint256 height);

//     /// Gets the current `block.timestamp`.
//     /// You should use this instead of `block.timestamp` if you use `vm.warp`, as `block.timestamp` is assumed to be constant across a transaction,
//     /// and as a result will get optimized out by the compiler.
//     /// See https://github.com/foundry-rs/foundry/issues/6180
//     function getBlockTimestamp() external view returns (uint256 timestamp);

//     /// Gets the map key and parent of a mapping at a given slot, for a given address.
//     function getMappingKeyAndParentOf(address target, bytes32 elementSlot)
//         external
//         returns (bool found, bytes32 key, bytes32 parent);

//     /// Gets the number of elements in the mapping at the given slot, for a given address.
//     function getMappingLength(address target, bytes32 mappingSlot) external returns (uint256 length);

//     /// Gets the elements at index idx of the mapping at the given slot, for a given address. The
//     /// index must be less than the length of the mapping (i.e. the number of keys in the mapping).
//     function getMappingSlotAt(address target, bytes32 mappingSlot, uint256 idx) external returns (bytes32 value);

//     /// Gets the nonce of an account.
//     function getNonce(address account) external view returns (uint64 nonce);

//     /// Gets all the recorded logs.
//     function getRecordedLogs() external returns (Log[] memory logs);

//     /// Loads a storage slot from an address.
//     function load(address target, bytes32 slot) external view returns (bytes32 data);

//     /// Pauses gas metering (i.e. gas usage is not counted). Noop if already paused.
//     function pauseGasMetering() external;

//     /// Records all storage reads and writes.
//     function record() external;

//     /// Record all the transaction logs.
//     function recordLogs() external;

//     /// Resumes gas metering (i.e. gas usage is counted again). Noop if already on.
//     function resumeGasMetering() external;

//     /// Performs an Ethereum JSON-RPC request to the current fork URL.
//     function rpc(string calldata method, string calldata params) external returns (bytes memory data);

//     /// Signs `digest` with `privateKey` using the secp256r1 curve.
//     function signP256(uint256 privateKey, bytes32 digest) external pure returns (bytes32 r, bytes32 s);

//     /// Signs `digest` with `privateKey` using the secp256k1 curve.
//     function sign(uint256 privateKey, bytes32 digest) external pure returns (uint8 v, bytes32 r, bytes32 s);

//     /// Starts recording all map SSTOREs for later retrieval.
//     function startMappingRecording() external;

//     /// Record all account accesses as part of CREATE, CALL or SELFDESTRUCT opcodes in order,
//     /// along with the context of the calls
//     function startStateDiffRecording() external;

//     /// Returns an ordered array of all account accesses from a `vm.startStateDiffRecording` session.
//     function stopAndReturnStateDiff() external returns (AccountAccess[] memory accountAccesses);

//     /// Stops recording all map SSTOREs for later retrieval and clears the recorded data.
//     function stopMappingRecording() external;

//     // ======== Filesystem ========

//     /// Closes file for reading, resetting the offset and allowing to read it from beginning with readLine.
//     /// `path` is relative to the project root.
//     function closeFile(string calldata path) external;

//     /// Copies the contents of one file to another. This function will **overwrite** the contents of `to`.
//     /// On success, the total number of bytes copied is returned and it is equal to the length of the `to` file as reported by `metadata`.
//     /// Both `from` and `to` are relative to the project root.
//     function copyFile(string calldata from, string calldata to) external returns (uint64 copied);

//     /// Creates a new, empty directory at the provided path.
//     /// This cheatcode will revert in the following situations, but is not limited to just these cases:
//     /// - User lacks permissions to modify `path`.
//     /// - A parent of the given path doesn't exist and `recursive` is false.
//     /// - `path` already exists and `recursive` is false.
//     /// `path` is relative to the project root.
//     function createDir(string calldata path, bool recursive) external;

//     /// Returns true if the given path points to an existing entity, else returns false.
//     function exists(string calldata path) external returns (bool result);

//     /// Performs a foreign function call via the terminal.
//     function ffi(string[] calldata commandInput) external returns (bytes memory result);

//     /// Given a path, query the file system to get information about a file, directory, etc.
//     function fsMetadata(string calldata path) external view returns (FsMetadata memory metadata);

//     /// Gets the creation bytecode from an artifact file. Takes in the relative path to the json file.
//     function getCode(string calldata artifactPath) external view returns (bytes memory creationBytecode);

//     /// Gets the deployed bytecode from an artifact file. Takes in the relative path to the json file.
//     function getDeployedCode(string calldata artifactPath) external view returns (bytes memory runtimeBytecode);

//     /// Returns true if the path exists on disk and is pointing at a directory, else returns false.
//     function isDir(string calldata path) external returns (bool result);

//     /// Returns true if the path exists on disk and is pointing at a regular file, else returns false.
//     function isFile(string calldata path) external returns (bool result);

//     /// Get the path of the current project root.
//     function projectRoot() external view returns (string memory path);

//     /// Prompts the user for a string value in the terminal.
//     function prompt(string calldata promptText) external returns (string memory input);

//     /// Prompts the user for a hidden string value in the terminal.
//     function promptSecret(string calldata promptText) external returns (string memory input);

//     /// Reads the directory at the given path recursively, up to `maxDepth`.
//     /// `maxDepth` defaults to 1, meaning only the direct children of the given directory will be returned.
//     /// Follows symbolic links if `followLinks` is true.
//     function readDir(string calldata path) external view returns (DirEntry[] memory entries);

//     /// See `readDir(string)`.
//     function readDir(string calldata path, uint64 maxDepth) external view returns (DirEntry[] memory entries);

//     /// See `readDir(string)`.
//     function readDir(string calldata path, uint64 maxDepth, bool followLinks)
//         external
//         view
//         returns (DirEntry[] memory entries);

//     /// Reads the entire content of file to string. `path` is relative to the project root.
//     function readFile(string calldata path) external view returns (string memory data);

//     /// Reads the entire content of file as binary. `path` is relative to the project root.
//     function readFileBinary(string calldata path) external view returns (bytes memory data);

//     /// Reads next line of file to string.
//     function readLine(string calldata path) external view returns (string memory line);

//     /// Reads a symbolic link, returning the path that the link points to.
//     /// This cheatcode will revert in the following situations, but is not limited to just these cases:
//     /// - `path` is not a symbolic link.
//     /// - `path` does not exist.
//     function readLink(string calldata linkPath) external view returns (string memory targetPath);

//     /// Removes a directory at the provided path.
//     /// This cheatcode will revert in the following situations, but is not limited to just these cases:
//     /// - `path` doesn't exist.
//     /// - `path` isn't a directory.
//     /// - User lacks permissions to modify `path`.
//     /// - The directory is not empty and `recursive` is false.
//     /// `path` is relative to the project root.
//     function removeDir(string calldata path, bool recursive) external;

//     /// Removes a file from the filesystem.
//     /// This cheatcode will revert in the following situations, but is not limited to just these cases:
//     /// - `path` points to a directory.
//     /// - The file doesn't exist.
//     /// - The user lacks permissions to remove the file.
//     /// `path` is relative to the project root.
//     function removeFile(string calldata path) external;

//     /// Performs a foreign function call via terminal and returns the exit code, stdout, and stderr.
//     function tryFfi(string[] calldata commandInput) external returns (FfiResult memory result);

//     /// Returns the time since unix epoch in milliseconds.
//     function unixTime() external returns (uint256 milliseconds);

//     /// Writes data to file, creating a file if it does not exist, and entirely replacing its contents if it does.
//     /// `path` is relative to the project root.
//     function writeFile(string calldata path, string calldata data) external;

//     /// Writes binary data to a file, creating a file if it does not exist, and entirely replacing its contents if it does.
//     /// `path` is relative to the project root.
//     function writeFileBinary(string calldata path, bytes calldata data) external;

//     /// Writes line to file, creating a file if it does not exist.
//     /// `path` is relative to the project root.
//     function writeLine(string calldata path, string calldata data) external;

//     // ======== JSON ========

//     /// Checks if `key` exists in a JSON object
//     /// `keyExists` is being deprecated in favor of `keyExistsJson`. It will be removed in future versions.
//     function keyExists(string calldata json, string calldata key) external view returns (bool);

//     /// Checks if `key` exists in a JSON object.
//     function keyExistsJson(string calldata json, string calldata key) external view returns (bool);

//     /// Parses a string of JSON data at `key` and coerces it to `address`.
//     function parseJsonAddress(string calldata json, string calldata key) external pure returns (address);

//     /// Parses a string of JSON data at `key` and coerces it to `address[]`.
//     function parseJsonAddressArray(string calldata json, string calldata key)
//         external
//         pure
//         returns (address[] memory);

//     /// Parses a string of JSON data at `key` and coerces it to `bool`.
//     function parseJsonBool(string calldata json, string calldata key) external pure returns (bool);

//     /// Parses a string of JSON data at `key` and coerces it to `bool[]`.
//     function parseJsonBoolArray(string calldata json, string calldata key) external pure returns (bool[] memory);

//     /// Parses a string of JSON data at `key` and coerces it to `bytes`.
//     function parseJsonBytes(string calldata json, string calldata key) external pure returns (bytes memory);

//     /// Parses a string of JSON data at `key` and coerces it to `bytes32`.
//     function parseJsonBytes32(string calldata json, string calldata key) external pure returns (bytes32);

//     /// Parses a string of JSON data at `key` and coerces it to `bytes32[]`.
//     function parseJsonBytes32Array(string calldata json, string calldata key)
//         external
//         pure
//         returns (bytes32[] memory);

//     /// Parses a string of JSON data at `key` and coerces it to `bytes[]`.
//     function parseJsonBytesArray(string calldata json, string calldata key) external pure returns (bytes[] memory);

//     /// Parses a string of JSON data at `key` and coerces it to `int256`.
//     function parseJsonInt(string calldata json, string calldata key) external pure returns (int256);

//     /// Parses a string of JSON data at `key` and coerces it to `int256[]`.
//     function parseJsonIntArray(string calldata json, string calldata key) external pure returns (int256[] memory);

//     /// Returns an array of all the keys in a JSON object.
//     function parseJsonKeys(string calldata json, string calldata key) external pure returns (string[] memory keys);

//     /// Parses a string of JSON data at `key` and coerces it to `string`.
//     function parseJsonString(string calldata json, string calldata key) external pure returns (string memory);

//     /// Parses a string of JSON data at `key` and coerces it to `string[]`.
//     function parseJsonStringArray(string calldata json, string calldata key) external pure returns (string[] memory);

//     /// Parses a string of JSON data at `key` and coerces it to `uint256`.
//     function parseJsonUint(string calldata json, string calldata key) external pure returns (uint256);

//     /// Parses a string of JSON data at `key` and coerces it to `uint256[]`.
//     function parseJsonUintArray(string calldata json, string calldata key) external pure returns (uint256[] memory);

//     /// ABI-encodes a JSON object.
//     function parseJson(string calldata json) external pure returns (bytes memory abiEncodedData);

//     /// ABI-encodes a JSON object at `key`.
//     function parseJson(string calldata json, string calldata key) external pure returns (bytes memory abiEncodedData);

//     /// See `serializeJson`.
//     function serializeAddress(string calldata objectKey, string calldata valueKey, address value)
//         external
//         returns (string memory json);

//     /// See `serializeJson`.
//     function serializeAddress(string calldata objectKey, string calldata valueKey, address[] calldata values)
//         external
//         returns (string memory json);

//     /// See `serializeJson`.
//     function serializeBool(string calldata objectKey, string calldata valueKey, bool value)
//         external
//         returns (string memory json);

//     /// See `serializeJson`.
//     function serializeBool(string calldata objectKey, string calldata valueKey, bool[] calldata values)
//         external
//         returns (string memory json);

//     /// See `serializeJson`.
//     function serializeBytes32(string calldata objectKey, string calldata valueKey, bytes32 value)
//         external
//         returns (string memory json);

//     /// See `serializeJson`.
//     function serializeBytes32(string calldata objectKey, string calldata valueKey, bytes32[] calldata values)
//         external
//         returns (string memory json);

//     /// See `serializeJson`.
//     function serializeBytes(string calldata objectKey, string calldata valueKey, bytes calldata value)
//         external
//         returns (string memory json);

//     /// See `serializeJson`.
//     function serializeBytes(string calldata objectKey, string calldata valueKey, bytes[] calldata values)
//         external
//         returns (string memory json);

//     /// See `serializeJson`.
//     function serializeInt(string calldata objectKey, string calldata valueKey, int256 value)
//         external
//         returns (string memory json);

//     /// See `serializeJson`.
//     function serializeInt(string calldata objectKey, string calldata valueKey, int256[] calldata values)
//         external
//         returns (string memory json);

//     /// Serializes a key and value to a JSON object stored in-memory that can be later written to a file.
//     /// Returns the stringified version of the specific JSON file up to that moment.
//     function serializeJson(string calldata objectKey, string calldata value) external returns (string memory json);

//     /// See `serializeJson`.
//     function serializeString(string calldata objectKey, string calldata valueKey, string calldata value)
//         external
//         returns (string memory json);

//     /// See `serializeJson`.
//     function serializeString(string calldata objectKey, string calldata valueKey, string[] calldata values)
//         external
//         returns (string memory json);

//     /// See `serializeJson`.
//     function serializeUint(string calldata objectKey, string calldata valueKey, uint256 value)
//         external
//         returns (string memory json);

//     /// See `serializeJson`.
//     function serializeUint(string calldata objectKey, string calldata valueKey, uint256[] calldata values)
//         external
//         returns (string memory json);

//     /// Write a serialized JSON object to a file. If the file exists, it will be overwritten.
//     function writeJson(string calldata json, string calldata path) external;

//     /// Write a serialized JSON object to an **existing** JSON file, replacing a value with key = <value_key.>
//     /// This is useful to replace a specific value of a JSON file, without having to parse the entire thing.
//     function writeJson(string calldata json, string calldata path, string calldata valueKey) external;

//     // ======== Scripting ========

//     /// Using the address that calls the test contract, has the next call (at this call depth only)
//     /// create a transaction that can later be signed and sent onchain.
//     function broadcast() external;

//     /// Has the next call (at this call depth only) create a transaction with the address provided
//     /// as the sender that can later be signed and sent onchain.
//     function broadcast(address signer) external;

//     /// Has the next call (at this call depth only) create a transaction with the private key
//     /// provided as the sender that can later be signed and sent onchain.
//     function broadcast(uint256 privateKey) external;

//     /// Using the address that calls the test contract, has all subsequent calls
//     /// (at this call depth only) create transactions that can later be signed and sent onchain.
//     function startBroadcast() external;

//     /// Has all subsequent calls (at this call depth only) create transactions with the address
//     /// provided that can later be signed and sent onchain.
//     function startBroadcast(address signer) external;

//     /// Has all subsequent calls (at this call depth only) create transactions with the private key
//     /// provided that can later be signed and sent onchain.
//     function startBroadcast(uint256 privateKey) external;

//     /// Stops collecting onchain transactions.
//     function stopBroadcast() external;

//     // ======== String ========

//     /// Parses the given `string` into an `address`.
//     function parseAddress(string calldata stringifiedValue) external pure returns (address parsedValue);

//     /// Parses the given `string` into a `bool`.
//     function parseBool(string calldata stringifiedValue) external pure returns (bool parsedValue);

//     /// Parses the given `string` into `bytes`.
//     function parseBytes(string calldata stringifiedValue) external pure returns (bytes memory parsedValue);

//     /// Parses the given `string` into a `bytes32`.
//     function parseBytes32(string calldata stringifiedValue) external pure returns (bytes32 parsedValue);

//     /// Parses the given `string` into a `int256`.
//     function parseInt(string calldata stringifiedValue) external pure returns (int256 parsedValue);

//     /// Parses the given `string` into a `uint256`.
//     function parseUint(string calldata stringifiedValue) external pure returns (uint256 parsedValue);

//     /// Replaces occurrences of `from` in the given `string` with `to`.
//     function replace(string calldata input, string calldata from, string calldata to)
//         external
//         pure
//         returns (string memory output);

//     /// Splits the given `string` into an array of strings divided by the `delimiter`.
//     function split(string calldata input, string calldata delimiter) external pure returns (string[] memory outputs);

//     /// Converts the given `string` value to Lowercase.
//     function toLowercase(string calldata input) external pure returns (string memory output);

//     /// Converts the given value to a `string`.
//     function toString(address value) external pure returns (string memory stringifiedValue);

//     /// Converts the given value to a `string`.
//     function toString(bytes calldata value) external pure returns (string memory stringifiedValue);

//     /// Converts the given value to a `string`.
//     function toString(bytes32 value) external pure returns (string memory stringifiedValue);

//     /// Converts the given value to a `string`.
//     function toString(bool value) external pure returns (string memory stringifiedValue);

//     /// Converts the given value to a `string`.
//     function toString(uint256 value) external pure returns (string memory stringifiedValue);

//     /// Converts the given value to a `string`.
//     function toString(int256 value) external pure returns (string memory stringifiedValue);

//     /// Converts the given `string` value to Uppercase.
//     function toUppercase(string calldata input) external pure returns (string memory output);

//     /// Trims leading and trailing whitespace from the given `string` value.
//     function trim(string calldata input) external pure returns (string memory output);

//     // ======== Testing ========

//     /// Compares two `uint256` values. Expects difference to be less than or equal to `maxDelta`.
//     /// Formats values with decimals in failure message.
//     function assertApproxEqAbsDecimal(uint256 left, uint256 right, uint256 maxDelta, uint256 decimals) external pure;

//     /// Compares two `uint256` values. Expects difference to be less than or equal to `maxDelta`.
//     /// Formats values with decimals in failure message. Includes error message into revert string on failure.
//     function assertApproxEqAbsDecimal(
//         uint256 left,
//         uint256 right,
//         uint256 maxDelta,
//         uint256 decimals,
//         string calldata error
//     ) external pure;

//     /// Compares two `int256` values. Expects difference to be less than or equal to `maxDelta`.
//     /// Formats values with decimals in failure message.
//     function assertApproxEqAbsDecimal(int256 left, int256 right, uint256 maxDelta, uint256 decimals) external pure;

//     /// Compares two `int256` values. Expects difference to be less than or equal to `maxDelta`.
//     /// Formats values with decimals in failure message. Includes error message into revert string on failure.
//     function assertApproxEqAbsDecimal(
//         int256 left,
//         int256 right,
//         uint256 maxDelta,
//         uint256 decimals,
//         string calldata error
//     ) external pure;

//     /// Compares two `uint256` values. Expects difference to be less than or equal to `maxDelta`.
//     function assertApproxEqAbs(uint256 left, uint256 right, uint256 maxDelta) external pure;

//     /// Compares two `uint256` values. Expects difference to be less than or equal to `maxDelta`.
//     /// Includes error message into revert string on failure.
//     function assertApproxEqAbs(uint256 left, uint256 right, uint256 maxDelta, string calldata error) external pure;

//     /// Compares two `int256` values. Expects difference to be less than or equal to `maxDelta`.
//     function assertApproxEqAbs(int256 left, int256 right, uint256 maxDelta) external pure;

//     /// Compares two `int256` values. Expects difference to be less than or equal to `maxDelta`.
//     /// Includes error message into revert string on failure.
//     function assertApproxEqAbs(int256 left, int256 right, uint256 maxDelta, string calldata error) external pure;

//     /// Compares two `uint256` values. Expects relative difference in percents to be less than or equal to `maxPercentDelta`.
//     /// `maxPercentDelta` is an 18 decimal fixed point number, where 1e18 == 100%
//     /// Formats values with decimals in failure message.
//     function assertApproxEqRelDecimal(uint256 left, uint256 right, uint256 maxPercentDelta, uint256 decimals)
//         external
//         pure;

//     /// Compares two `uint256` values. Expects relative difference in percents to be less than or equal to `maxPercentDelta`.
//     /// `maxPercentDelta` is an 18 decimal fixed point number, where 1e18 == 100%
//     /// Formats values with decimals in failure message. Includes error message into revert string on failure.
//     function assertApproxEqRelDecimal(
//         uint256 left,
//         uint256 right,
//         uint256 maxPercentDelta,
//         uint256 decimals,
//         string calldata error
//     ) external pure;

//     /// Compares two `int256` values. Expects relative difference in percents to be less than or equal to `maxPercentDelta`.
//     /// `maxPercentDelta` is an 18 decimal fixed point number, where 1e18 == 100%
//     /// Formats values with decimals in failure message.
//     function assertApproxEqRelDecimal(int256 left, int256 right, uint256 maxPercentDelta, uint256 decimals)
//         external
//         pure;

//     /// Compares two `int256` values. Expects relative difference in percents to be less than or equal to `maxPercentDelta`.
//     /// `maxPercentDelta` is an 18 decimal fixed point number, where 1e18 == 100%
//     /// Formats values with decimals in failure message. Includes error message into revert string on failure.
//     function assertApproxEqRelDecimal(
//         int256 left,
//         int256 right,
//         uint256 maxPercentDelta,
//         uint256 decimals,
//         string calldata error
//     ) external pure;

//     /// Compares two `uint256` values. Expects relative difference in percents to be less than or equal to `maxPercentDelta`.
//     /// `maxPercentDelta` is an 18 decimal fixed point number, where 1e18 == 100%
//     function assertApproxEqRel(uint256 left, uint256 right, uint256 maxPercentDelta) external pure;

//     /// Compares two `uint256` values. Expects relative difference in percents to be less than or equal to `maxPercentDelta`.
//     /// `maxPercentDelta` is an 18 decimal fixed point number, where 1e18 == 100%
//     /// Includes error message into revert string on failure.
//     function assertApproxEqRel(uint256 left, uint256 right, uint256 maxPercentDelta, string calldata error)
//         external
//         pure;

//     /// Compares two `int256` values. Expects relative difference in percents to be less than or equal to `maxPercentDelta`.
//     /// `maxPercentDelta` is an 18 decimal fixed point number, where 1e18 == 100%
//     function assertApproxEqRel(int256 left, int256 right, uint256 maxPercentDelta) external pure;

//     /// Compares two `int256` values. Expects relative difference in percents to be less than or equal to `maxPercentDelta`.
//     /// `maxPercentDelta` is an 18 decimal fixed point number, where 1e18 == 100%
//     /// Includes error message into revert string on failure.
//     function assertApproxEqRel(int256 left, int256 right, uint256 maxPercentDelta, string calldata error)
//         external
//         pure;

//     /// Asserts that two `uint256` values are equal, formatting them with decimals in failure message.
//     function assertEqDecimal(uint256 left, uint256 right, uint256 decimals) external pure;

//     /// Asserts that two `uint256` values are equal, formatting them with decimals in failure message.
//     /// Includes error message into revert string on failure.
//     function assertEqDecimal(uint256 left, uint256 right, uint256 decimals, string calldata error) external pure;

//     /// Asserts that two `int256` values are equal, formatting them with decimals in failure message.
//     function assertEqDecimal(int256 left, int256 right, uint256 decimals) external pure;

//     /// Asserts that two `int256` values are equal, formatting them with decimals in failure message.
//     /// Includes error message into revert string on failure.
//     function assertEqDecimal(int256 left, int256 right, uint256 decimals, string calldata error) external pure;

//     /// Asserts that two `bool` values are equal.
//     function assertEq(bool left, bool right) external pure;

//     /// Asserts that two `bool` values are equal and includes error message into revert string on failure.
//     function assertEq(bool left, bool right, string calldata error) external pure;

//     /// Asserts that two `string` values are equal.
//     function assertEq(string calldata left, string calldata right) external pure;

//     /// Asserts that two `string` values are equal and includes error message into revert string on failure.
//     function assertEq(string calldata left, string calldata right, string calldata error) external pure;

//     /// Asserts that two `bytes` values are equal.
//     function assertEq(bytes calldata left, bytes calldata right) external pure;

//     /// Asserts that two `bytes` values are equal and includes error message into revert string on failure.
//     function assertEq(bytes calldata left, bytes calldata right, string calldata error) external pure;

//     /// Asserts that two arrays of `bool` values are equal.
//     function assertEq(bool[] calldata left, bool[] calldata right) external pure;

//     /// Asserts that two arrays of `bool` values are equal and includes error message into revert string on failure.
//     function assertEq(bool[] calldata left, bool[] calldata right, string calldata error) external pure;

//     /// Asserts that two arrays of `uint256 values are equal.
//     function assertEq(uint256[] calldata left, uint256[] calldata right) external pure;

//     /// Asserts that two arrays of `uint256` values are equal and includes error message into revert string on failure.
//     function assertEq(uint256[] calldata left, uint256[] calldata right, string calldata error) external pure;

//     /// Asserts that two arrays of `int256` values are equal.
//     function assertEq(int256[] calldata left, int256[] calldata right) external pure;

//     /// Asserts that two arrays of `int256` values are equal and includes error message into revert string on failure.
//     function assertEq(int256[] calldata left, int256[] calldata right, string calldata error) external pure;

//     /// Asserts that two `uint256` values are equal.
//     function assertEq(uint256 left, uint256 right) external pure;

//     /// Asserts that two arrays of `address` values are equal.
//     function assertEq(address[] calldata left, address[] calldata right) external pure;

//     /// Asserts that two arrays of `address` values are equal and includes error message into revert string on failure.
//     function assertEq(address[] calldata left, address[] calldata right, string calldata error) external pure;

//     /// Asserts that two arrays of `bytes32` values are equal.
//     function assertEq(bytes32[] calldata left, bytes32[] calldata right) external pure;

//     /// Asserts that two arrays of `bytes32` values are equal and includes error message into revert string on failure.
//     function assertEq(bytes32[] calldata left, bytes32[] calldata right, string calldata error) external pure;

//     /// Asserts that two arrays of `string` values are equal.
//     function assertEq(string[] calldata left, string[] calldata right) external pure;

//     /// Asserts that two arrays of `string` values are equal and includes error message into revert string on failure.
//     function assertEq(string[] calldata left, string[] calldata right, string calldata error) external pure;

//     /// Asserts that two arrays of `bytes` values are equal.
//     function assertEq(bytes[] calldata left, bytes[] calldata right) external pure;

//     /// Asserts that two arrays of `bytes` values are equal and includes error message into revert string on failure.
//     function assertEq(bytes[] calldata left, bytes[] calldata right, string calldata error) external pure;

//     /// Asserts that two `uint256` values are equal and includes error message into revert string on failure.
//     function assertEq(uint256 left, uint256 right, string calldata error) external pure;

//     /// Asserts that two `int256` values are equal.
//     function assertEq(int256 left, int256 right) external pure;

//     /// Asserts that two `int256` values are equal and includes error message into revert string on failure.
//     function assertEq(int256 left, int256 right, string calldata error) external pure;

//     /// Asserts that two `address` values are equal.
//     function assertEq(address left, address right) external pure;

//     /// Asserts that two `address` values are equal and includes error message into revert string on failure.
//     function assertEq(address left, address right, string calldata error) external pure;

//     /// Asserts that two `bytes32` values are equal.
//     function assertEq(bytes32 left, bytes32 right) external pure;

//     /// Asserts that two `bytes32` values are equal and includes error message into revert string on failure.
//     function assertEq(bytes32 left, bytes32 right, string calldata error) external pure;

//     /// Asserts that the given condition is false.
//     function assertFalse(bool condition) external pure;

//     /// Asserts that the given condition is false and includes error message into revert string on failure.
//     function assertFalse(bool condition, string calldata error) external pure;

//     /// Compares two `uint256` values. Expects first value to be greater than or equal to second.
//     /// Formats values with decimals in failure message.
//     function assertGeDecimal(uint256 left, uint256 right, uint256 decimals) external pure;

//     /// Compares two `uint256` values. Expects first value to be greater than or equal to second.
//     /// Formats values with decimals in failure message. Includes error message into revert string on failure.
//     function assertGeDecimal(uint256 left, uint256 right, uint256 decimals, string calldata error) external pure;

//     /// Compares two `int256` values. Expects first value to be greater than or equal to second.
//     /// Formats values with decimals in failure message.
//     function assertGeDecimal(int256 left, int256 right, uint256 decimals) external pure;

//     /// Compares two `int256` values. Expects first value to be greater than or equal to second.
//     /// Formats values with decimals in failure message. Includes error message into revert string on failure.
//     function assertGeDecimal(int256 left, int256 right, uint256 decimals, string calldata error) external pure;

//     /// Compares two `uint256` values. Expects first value to be greater than or equal to second.
//     function assertGe(uint256 left, uint256 right) external pure;

//     /// Compares two `uint256` values. Expects first value to be greater than or equal to second.
//     /// Includes error message into revert string on failure.
//     function assertGe(uint256 left, uint256 right, string calldata error) external pure;

//     /// Compares two `int256` values. Expects first value to be greater than or equal to second.
//     function assertGe(int256 left, int256 right) external pure;

//     /// Compares two `int256` values. Expects first value to be greater than or equal to second.
//     /// Includes error message into revert string on failure.
//     function assertGe(int256 left, int256 right, string calldata error) external pure;

//     /// Compares two `uint256` values. Expects first value to be greater than second.
//     /// Formats values with decimals in failure message.
//     function assertGtDecimal(uint256 left, uint256 right, uint256 decimals) external pure;

//     /// Compares two `uint256` values. Expects first value to be greater than second.
//     /// Formats values with decimals in failure message. Includes error message into revert string on failure.
//     function assertGtDecimal(uint256 left, uint256 right, uint256 decimals, string calldata error) external pure;

//     /// Compares two `int256` values. Expects first value to be greater than second.
//     /// Formats values with decimals in failure message.
//     function assertGtDecimal(int256 left, int256 right, uint256 decimals) external pure;

//     /// Compares two `int256` values. Expects first value to be greater than second.
//     /// Formats values with decimals in failure message. Includes error message into revert string on failure.
//     function assertGtDecimal(int256 left, int256 right, uint256 decimals, string calldata error) external pure;

//     /// Compares two `uint256` values. Expects first value to be greater than second.
//     function assertGt(uint256 left, uint256 right) external pure;

//     /// Compares two `uint256` values. Expects first value to be greater than second.
//     /// Includes error message into revert string on failure.
//     function assertGt(uint256 left, uint256 right, string calldata error) external pure;

//     /// Compares two `int256` values. Expects first value to be greater than second.
//     function assertGt(int256 left, int256 right) external pure;

//     /// Compares two `int256` values. Expects first value to be greater than second.
//     /// Includes error message into revert string on failure.
//     function assertGt(int256 left, int256 right, string calldata error) external pure;

//     /// Compares two `uint256` values. Expects first value to be less than or equal to second.
//     /// Formats values with decimals in failure message.
//     function assertLeDecimal(uint256 left, uint256 right, uint256 decimals) external pure;

//     /// Compares two `uint256` values. Expects first value to be less than or equal to second.
//     /// Formats values with decimals in failure message. Includes error message into revert string on failure.
//     function assertLeDecimal(uint256 left, uint256 right, uint256 decimals, string calldata error) external pure;

//     /// Compares two `int256` values. Expects first value to be less than or equal to second.
//     /// Formats values with decimals in failure message.
//     function assertLeDecimal(int256 left, int256 right, uint256 decimals) external pure;

//     /// Compares two `int256` values. Expects first value to be less than or equal to second.
//     /// Formats values with decimals in failure message. Includes error message into revert string on failure.
//     function assertLeDecimal(int256 left, int256 right, uint256 decimals, string calldata error) external pure;

//     /// Compares two `uint256` values. Expects first value to be less than or equal to second.
//     function assertLe(uint256 left, uint256 right) external pure;

//     /// Compares two `uint256` values. Expects first value to be less than or equal to second.
//     /// Includes error message into revert string on failure.
//     function assertLe(uint256 left, uint256 right, string calldata error) external pure;

//     /// Compares two `int256` values. Expects first value to be less than or equal to second.
//     function assertLe(int256 left, int256 right) external pure;

//     /// Compares two `int256` values. Expects first value to be less than or equal to second.
//     /// Includes error message into revert string on failure.
//     function assertLe(int256 left, int256 right, string calldata error) external pure;

//     /// Compares two `uint256` values. Expects first value to be less than second.
//     /// Formats values with decimals in failure message.
//     function assertLtDecimal(uint256 left, uint256 right, uint256 decimals) external pure;

//     /// Compares two `uint256` values. Expects first value to be less than second.
//     /// Formats values with decimals in failure message. Includes error message into revert string on failure.
//     function assertLtDecimal(uint256 left, uint256 right, uint256 decimals, string calldata error) external pure;

//     /// Compares two `int256` values. Expects first value to be less than second.
//     /// Formats values with decimals in failure message.
//     function assertLtDecimal(int256 left, int256 right, uint256 decimals) external pure;

//     /// Compares two `int256` values. Expects first value to be less than second.
//     /// Formats values with decimals in failure message. Includes error message into revert string on failure.
//     function assertLtDecimal(int256 left, int256 right, uint256 decimals, string calldata error) external pure;

//     /// Compares two `uint256` values. Expects first value to be less than second.
//     function assertLt(uint256 left, uint256 right) external pure;

//     /// Compares two `uint256` values. Expects first value to be less than second.
//     /// Includes error message into revert string on failure.
//     function assertLt(uint256 left, uint256 right, string calldata error) external pure;

//     /// Compares two `int256` values. Expects first value to be less than second.
//     function assertLt(int256 left, int256 right) external pure;

//     /// Compares two `int256` values. Expects first value to be less than second.
//     /// Includes error message into revert string on failure.
//     function assertLt(int256 left, int256 right, string calldata error) external pure;

//     /// Asserts that two `uint256` values are not equal, formatting them with decimals in failure message.
//     function assertNotEqDecimal(uint256 left, uint256 right, uint256 decimals) external pure;

//     /// Asserts that two `uint256` values are not equal, formatting them with decimals in failure message.
//     /// Includes error message into revert string on failure.
//     function assertNotEqDecimal(uint256 left, uint256 right, uint256 decimals, string calldata error) external pure;

//     /// Asserts that two `int256` values are not equal, formatting them with decimals in failure message.
//     function assertNotEqDecimal(int256 left, int256 right, uint256 decimals) external pure;

//     /// Asserts that two `int256` values are not equal, formatting them with decimals in failure message.
//     /// Includes error message into revert string on failure.
//     function assertNotEqDecimal(int256 left, int256 right, uint256 decimals, string calldata error) external pure;

//     /// Asserts that two `bool` values are not equal.
//     function assertNotEq(bool left, bool right) external pure;

//     /// Asserts that two `bool` values are not equal and includes error message into revert string on failure.
//     function assertNotEq(bool left, bool right, string calldata error) external pure;

//     /// Asserts that two `string` values are not equal.
//     function assertNotEq(string calldata left, string calldata right) external pure;

//     /// Asserts that two `string` values are not equal and includes error message into revert string on failure.
//     function assertNotEq(string calldata left, string calldata right, string calldata error) external pure;

//     /// Asserts that two `bytes` values are not equal.
//     function assertNotEq(bytes calldata left, bytes calldata right) external pure;

//     /// Asserts that two `bytes` values are not equal and includes error message into revert string on failure.
//     function assertNotEq(bytes calldata left, bytes calldata right, string calldata error) external pure;

//     /// Asserts that two arrays of `bool` values are not equal.
//     function assertNotEq(bool[] calldata left, bool[] calldata right) external pure;

//     /// Asserts that two arrays of `bool` values are not equal and includes error message into revert string on failure.
//     function assertNotEq(bool[] calldata left, bool[] calldata right, string calldata error) external pure;

//     /// Asserts that two arrays of `uint256` values are not equal.
//     function assertNotEq(uint256[] calldata left, uint256[] calldata right) external pure;

//     /// Asserts that two arrays of `uint256` values are not equal and includes error message into revert string on failure.
//     function assertNotEq(uint256[] calldata left, uint256[] calldata right, string calldata error) external pure;

//     /// Asserts that two arrays of `int256` values are not equal.
//     function assertNotEq(int256[] calldata left, int256[] calldata right) external pure;

//     /// Asserts that two arrays of `int256` values are not equal and includes error message into revert string on failure.
//     function assertNotEq(int256[] calldata left, int256[] calldata right, string calldata error) external pure;

//     /// Asserts that two `uint256` values are not equal.
//     function assertNotEq(uint256 left, uint256 right) external pure;

//     /// Asserts that two arrays of `address` values are not equal.
//     function assertNotEq(address[] calldata left, address[] calldata right) external pure;

//     /// Asserts that two arrays of `address` values are not equal and includes error message into revert string on failure.
//     function assertNotEq(address[] calldata left, address[] calldata right, string calldata error) external pure;

//     /// Asserts that two arrays of `bytes32` values are not equal.
//     function assertNotEq(bytes32[] calldata left, bytes32[] calldata right) external pure;

//     /// Asserts that two arrays of `bytes32` values are not equal and includes error message into revert string on failure.
//     function assertNotEq(bytes32[] calldata left, bytes32[] calldata right, string calldata error) external pure;

//     /// Asserts that two arrays of `string` values are not equal.
//     function assertNotEq(string[] calldata left, string[] calldata right) external pure;

//     /// Asserts that two arrays of `string` values are not equal and includes error message into revert string on failure.
//     function assertNotEq(string[] calldata left, string[] calldata right, string calldata error) external pure;

//     /// Asserts that two arrays of `bytes` values are not equal.
//     function assertNotEq(bytes[] calldata left, bytes[] calldata right) external pure;

//     /// Asserts that two arrays of `bytes` values are not equal and includes error message into revert string on failure.
//     function assertNotEq(bytes[] calldata left, bytes[] calldata right, string calldata error) external pure;

//     /// Asserts that two `uint256` values are not equal and includes error message into revert string on failure.
//     function assertNotEq(uint256 left, uint256 right, string calldata error) external pure;

//     /// Asserts that two `int256` values are not equal.
//     function assertNotEq(int256 left, int256 right) external pure;

//     /// Asserts that two `int256` values are not equal and includes error message into revert string on failure.
//     function assertNotEq(int256 left, int256 right, string calldata error) external pure;

//     /// Asserts that two `address` values are not equal.
//     function assertNotEq(address left, address right) external pure;

//     /// Asserts that two `address` values are not equal and includes error message into revert string on failure.
//     function assertNotEq(address left, address right, string calldata error) external pure;

//     /// Asserts that two `bytes32` values are not equal.
//     function assertNotEq(bytes32 left, bytes32 right) external pure;

//     /// Asserts that two `bytes32` values are not equal and includes error message into revert string on failure.
//     function assertNotEq(bytes32 left, bytes32 right, string calldata error) external pure;

//     /// Asserts that the given condition is true.
//     function assertTrue(bool condition) external pure;

//     /// Asserts that the given condition is true and includes error message into revert string on failure.
//     function assertTrue(bool condition, string calldata error) external pure;

//     /// If the condition is false, discard this run's fuzz inputs and generate new ones.
//     function assume(bool condition) external pure;

//     /// Writes a breakpoint to jump to in the debugger.
//     function breakpoint(string calldata char) external;

//     /// Writes a conditional breakpoint to jump to in the debugger.
//     function breakpoint(string calldata char, bool value) external;

//     /// Returns the RPC url for the given alias.
//     function rpcUrl(string calldata rpcAlias) external view returns (string memory json);

//     /// Returns all rpc urls and their aliases as structs.
//     function rpcUrlStructs() external view returns (Rpc[] memory urls);

//     /// Returns all rpc urls and their aliases `[alias, url][]`.
//     function rpcUrls() external view returns (string[2][] memory urls);

//     /// Suspends execution of the main thread for `duration` milliseconds.
//     function sleep(uint256 duration) external;

//     // ======== Toml ========

//     /// Checks if `key` exists in a TOML table.
//     function keyExistsToml(string calldata toml, string calldata key) external view returns (bool);

//     /// Parses a string of TOML data at `key` and coerces it to `address`.
//     function parseTomlAddress(string calldata toml, string calldata key) external pure returns (address);

//     /// Parses a string of TOML data at `key` and coerces it to `address[]`.
//     function parseTomlAddressArray(string calldata toml, string calldata key)
//         external
//         pure
//         returns (address[] memory);

//     /// Parses a string of TOML data at `key` and coerces it to `bool`.
//     function parseTomlBool(string calldata toml, string calldata key) external pure returns (bool);

//     /// Parses a string of TOML data at `key` and coerces it to `bool[]`.
//     function parseTomlBoolArray(string calldata toml, string calldata key) external pure returns (bool[] memory);

//     /// Parses a string of TOML data at `key` and coerces it to `bytes`.
//     function parseTomlBytes(string calldata toml, string calldata key) external pure returns (bytes memory);

//     /// Parses a string of TOML data at `key` and coerces it to `bytes32`.
//     function parseTomlBytes32(string calldata toml, string calldata key) external pure returns (bytes32);

//     /// Parses a string of TOML data at `key` and coerces it to `bytes32[]`.
//     function parseTomlBytes32Array(string calldata toml, string calldata key)
//         external
//         pure
//         returns (bytes32[] memory);

//     /// Parses a string of TOML data at `key` and coerces it to `bytes[]`.
//     function parseTomlBytesArray(string calldata toml, string calldata key) external pure returns (bytes[] memory);

//     /// Parses a string of TOML data at `key` and coerces it to `int256`.
//     function parseTomlInt(string calldata toml, string calldata key) external pure returns (int256);

//     /// Parses a string of TOML data at `key` and coerces it to `int256[]`.
//     function parseTomlIntArray(string calldata toml, string calldata key) external pure returns (int256[] memory);

//     /// Returns an array of all the keys in a TOML table.
//     function parseTomlKeys(string calldata toml, string calldata key) external pure returns (string[] memory keys);

//     /// Parses a string of TOML data at `key` and coerces it to `string`.
//     function parseTomlString(string calldata toml, string calldata key) external pure returns (string memory);

//     /// Parses a string of TOML data at `key` and coerces it to `string[]`.
//     function parseTomlStringArray(string calldata toml, string calldata key) external pure returns (string[] memory);

//     /// Parses a string of TOML data at `key` and coerces it to `uint256`.
//     function parseTomlUint(string calldata toml, string calldata key) external pure returns (uint256);

//     /// Parses a string of TOML data at `key` and coerces it to `uint256[]`.
//     function parseTomlUintArray(string calldata toml, string calldata key) external pure returns (uint256[] memory);

//     /// ABI-encodes a TOML table.
//     function parseToml(string calldata toml) external pure returns (bytes memory abiEncodedData);

//     /// ABI-encodes a TOML table at `key`.
//     function parseToml(string calldata toml, string calldata key) external pure returns (bytes memory abiEncodedData);

//     /// Takes serialized JSON, converts to TOML and write a serialized TOML to a file.
//     function writeToml(string calldata json, string calldata path) external;

//     /// Takes serialized JSON, converts to TOML and write a serialized TOML table to an **existing** TOML file, replacing a value with key = <value_key.>
//     /// This is useful to replace a specific value of a TOML file, without having to parse the entire thing.
//     function writeToml(string calldata json, string calldata path, string calldata valueKey) external;

//     // ======== Utilities ========

//     /// Compute the address of a contract created with CREATE2 using the given CREATE2 deployer.
//     function computeCreate2Address(bytes32 salt, bytes32 initCodeHash, address deployer)
//         external
//         pure
//         returns (address);

//     /// Compute the address of a contract created with CREATE2 using the default CREATE2 deployer.
//     function computeCreate2Address(bytes32 salt, bytes32 initCodeHash) external pure returns (address);

//     /// Compute the address a contract will be deployed at for a given deployer address and nonce.
//     function computeCreateAddress(address deployer, uint256 nonce) external pure returns (address);

//     /// Derives a private key from the name, labels the account with that name, and returns the wallet.
//     function createWallet(string calldata walletLabel) external returns (Wallet memory wallet);

//     /// Generates a wallet from the private key and returns the wallet.
//     function createWallet(uint256 privateKey) external returns (Wallet memory wallet);

//     /// Generates a wallet from the private key, labels the account with that name, and returns the wallet.
//     function createWallet(uint256 privateKey, string calldata walletLabel) external returns (Wallet memory wallet);

//     /// Derive a private key from a provided mnenomic string (or mnenomic file path)
//     /// at the derivation path `m/44'/60'/0'/0/{index}`.
//     function deriveKey(string calldata mnemonic, uint32 index) external pure returns (uint256 privateKey);

//     /// Derive a private key from a provided mnenomic string (or mnenomic file path)
//     /// at `{derivationPath}{index}`.
//     function deriveKey(string calldata mnemonic, string calldata derivationPath, uint32 index)
//         external
//         pure
//         returns (uint256 privateKey);

//     /// Derive a private key from a provided mnenomic string (or mnenomic file path) in the specified language
//     /// at the derivation path `m/44'/60'/0'/0/{index}`.
//     function deriveKey(string calldata mnemonic, uint32 index, string calldata language)
//         external
//         pure
//         returns (uint256 privateKey);

//     /// Derive a private key from a provided mnenomic string (or mnenomic file path) in the specified language
//     /// at `{derivationPath}{index}`.
//     function deriveKey(string calldata mnemonic, string calldata derivationPath, uint32 index, string calldata language)
//         external
//         pure
//         returns (uint256 privateKey);

//     /// Gets the label for the specified address.
//     function getLabel(address account) external view returns (string memory currentLabel);

//     /// Get a `Wallet`'s nonce.
//     function getNonce(Wallet calldata wallet) external returns (uint64 nonce);

//     /// Labels an address in call traces.
//     function label(address account, string calldata newLabel) external;

//     /// Adds a private key to the local forge wallet and returns the address.
//     function rememberKey(uint256 privateKey) external returns (address keyAddr);

//     /// Signs data with a `Wallet`.
//     function sign(Wallet calldata wallet, bytes32 digest) external returns (uint8 v, bytes32 r, bytes32 s);

//     /// Encodes a `bytes` value to a base64url string.
//     function toBase64URL(bytes calldata data) external pure returns (string memory);

//     /// Encodes a `string` value to a base64url string.
//     function toBase64URL(string calldata data) external pure returns (string memory);

//     /// Encodes a `bytes` value to a base64 string.
//     function toBase64(bytes calldata data) external pure returns (string memory);

//     /// Encodes a `string` value to a base64 string.
//     function toBase64(string calldata data) external pure returns (string memory);
// }

// /// The `Vm` interface does allow manipulation of the EVM state. These are all intended to be used
// /// in tests, but it is not recommended to use these cheats in scripts.
// interface Vm is VmSafe {
//     // ======== EVM ========

//     /// Returns the identifier of the currently active fork. Reverts if no fork is currently active.
//     function activeFork() external view returns (uint256 forkId);

//     /// In forking mode, explicitly grant the given address cheatcode access.
//     function allowCheatcodes(address account) external;

//     /// Sets `block.chainid`.
//     function chainId(uint256 newChainId) external;

//     /// Clears all mocked calls.
//     function clearMockedCalls() external;

//     /// Sets `block.coinbase`.
//     function coinbase(address newCoinbase) external;

//     /// Creates a new fork with the given endpoint and the _latest_ block and returns the identifier of the fork.
//     function createFork(string calldata urlOrAlias) external returns (uint256 forkId);

//     /// Creates a new fork with the given endpoint and block and returns the identifier of the fork.
//     function createFork(string calldata urlOrAlias, uint256 blockNumber) external returns (uint256 forkId);

//     /// Creates a new fork with the given endpoint and at the block the given transaction was mined in,
//     /// replays all transaction mined in the block before the transaction, and returns the identifier of the fork.
//     function createFork(string calldata urlOrAlias, bytes32 txHash) external returns (uint256 forkId);

//     /// Creates and also selects a new fork with the given endpoint and the latest block and returns the identifier of the fork.
//     function createSelectFork(string calldata urlOrAlias) external returns (uint256 forkId);

//     /// Creates and also selects a new fork with the given endpoint and block and returns the identifier of the fork.
//     function createSelectFork(string calldata urlOrAlias, uint256 blockNumber) external returns (uint256 forkId);

//     /// Creates and also selects new fork with the given endpoint and at the block the given transaction was mined in,
//     /// replays all transaction mined in the block before the transaction, returns the identifier of the fork.
//     function createSelectFork(string calldata urlOrAlias, bytes32 txHash) external returns (uint256 forkId);

//     /// Sets an address' balance.
//     function deal(address account, uint256 newBalance) external;

//     /// Removes the snapshot with the given ID created by `snapshot`.
//     /// Takes the snapshot ID to delete.
//     /// Returns `true` if the snapshot was successfully deleted.
//     /// Returns `false` if the snapshot does not exist.
//     function deleteSnapshot(uint256 snapshotId) external returns (bool success);

//     /// Removes _all_ snapshots previously created by `snapshot`.
//     function deleteSnapshots() external;

//     /// Sets `block.difficulty`.
//     /// Not available on EVM versions from Paris onwards. Use `prevrandao` instead.
//     /// Reverts if used on unsupported EVM versions.
//     function difficulty(uint256 newDifficulty) external;

//     /// Dump a genesis JSON file's `allocs` to disk.
//     function dumpState(string calldata pathToStateJson) external;

//     /// Sets an address' code.
//     function etch(address target, bytes calldata newRuntimeBytecode) external;

//     /// Sets `block.basefee`.
//     function fee(uint256 newBasefee) external;

//     /// Returns true if the account is marked as persistent.
//     function isPersistent(address account) external view returns (bool persistent);

//     /// Load a genesis JSON file's `allocs` into the in-memory revm state.
//     function loadAllocs(string calldata pathToAllocsJson) external;

//     /// Marks that the account(s) should use persistent storage across fork swaps in a multifork setup
//     /// Meaning, changes made to the state of this account will be kept when switching forks.
//     function makePersistent(address account) external;

//     /// See `makePersistent(address)`.
//     function makePersistent(address account0, address account1) external;

//     /// See `makePersistent(address)`.
//     function makePersistent(address account0, address account1, address account2) external;

//     /// See `makePersistent(address)`.
//     function makePersistent(address[] calldata accounts) external;

//     /// Reverts a call to an address with specified revert data.
//     function mockCallRevert(address callee, bytes calldata data, bytes calldata revertData) external;

//     /// Reverts a call to an address with a specific `msg.value`, with specified revert data.
//     function mockCallRevert(address callee, uint256 msgValue, bytes calldata data, bytes calldata revertData)
//         external;

//     /// Mocks a call to an address, returning specified data.
//     /// Calldata can either be strict or a partial match, e.g. if you only
//     /// pass a Solidity selector to the expected calldata, then the entire Solidity
//     /// function will be mocked.
//     function mockCall(address callee, bytes calldata data, bytes calldata returnData) external;

//     /// Mocks a call to an address with a specific `msg.value`, returning specified data.
//     /// Calldata match takes precedence over `msg.value` in case of ambiguity.
//     function mockCall(address callee, uint256 msgValue, bytes calldata data, bytes calldata returnData) external;

//     /// Sets the *next* call's `msg.sender` to be the input address.
//     function prank(address msgSender) external;

//     /// Sets the *next* call's `msg.sender` to be the input address, and the `tx.origin` to be the second input.
//     function prank(address msgSender, address txOrigin) external;

//     /// Sets `block.prevrandao`.
//     /// Not available on EVM versions before Paris. Use `difficulty` instead.
//     /// If used on unsupported EVM versions it will revert.
//     function prevrandao(bytes32 newPrevrandao) external;

//     /// Reads the current `msg.sender` and `tx.origin` from state and reports if there is any active caller modification.
//     function readCallers() external returns (CallerMode callerMode, address msgSender, address txOrigin);

//     /// Resets the nonce of an account to 0 for EOAs and 1 for contract accounts.
//     function resetNonce(address account) external;

//     /// Revert the state of the EVM to a previous snapshot
//     /// Takes the snapshot ID to revert to.
//     /// Returns `true` if the snapshot was successfully reverted.
//     /// Returns `false` if the snapshot does not exist.
//     /// **Note:** This does not automatically delete the snapshot. To delete the snapshot use `deleteSnapshot`.
//     function revertTo(uint256 snapshotId) external returns (bool success);

//     /// Revert the state of the EVM to a previous snapshot and automatically deletes the snapshots
//     /// Takes the snapshot ID to revert to.
//     /// Returns `true` if the snapshot was successfully reverted and deleted.
//     /// Returns `false` if the snapshot does not exist.
//     function revertToAndDelete(uint256 snapshotId) external returns (bool success);

//     /// Revokes persistent status from the address, previously added via `makePersistent`.
//     function revokePersistent(address account) external;

//     /// See `revokePersistent(address)`.
//     function revokePersistent(address[] calldata accounts) external;

//     /// Sets `block.height`.
//     function roll(uint256 newHeight) external;

//     /// Updates the currently active fork to given block number
//     /// This is similar to `roll` but for the currently active fork.
//     function rollFork(uint256 blockNumber) external;

//     /// Updates the currently active fork to given transaction. This will `rollFork` with the number
//     /// of the block the transaction was mined in and replays all transaction mined before it in the block.
//     function rollFork(bytes32 txHash) external;

//     /// Updates the given fork to given block number.
//     function rollFork(uint256 forkId, uint256 blockNumber) external;

//     /// Updates the given fork to block number of the given transaction and replays all transaction mined before it in the block.
//     function rollFork(uint256 forkId, bytes32 txHash) external;

//     /// Takes a fork identifier created by `createFork` and sets the corresponding forked state as active.
//     function selectFork(uint256 forkId) external;

//     /// Sets the nonce of an account. Must be higher than the current nonce of the account.
//     function setNonce(address account, uint64 newNonce) external;

//     /// Sets the nonce of an account to an arbitrary value.
//     function setNonceUnsafe(address account, uint64 newNonce) external;

//     /// Snapshot the current state of the evm.
//     /// Returns the ID of the snapshot that was created.
//     /// To revert a snapshot use `revertTo`.
//     function snapshot() external returns (uint256 snapshotId);

//     /// Sets all subsequent calls' `msg.sender` to be the input address until `stopPrank` is called.
//     function startPrank(address msgSender) external;

//     /// Sets all subsequent calls' `msg.sender` to be the input address until `stopPrank` is called, and the `tx.origin` to be the second input.
//     function startPrank(address msgSender, address txOrigin) external;

//     /// Resets subsequent calls' `msg.sender` to be `address(this)`.
//     function stopPrank() external;

//     /// Stores a value to an address' storage slot.
//     function store(address target, bytes32 slot, bytes32 value) external;

//     /// Fetches the given transaction from the active fork and executes it on the current state.
//     function transact(bytes32 txHash) external;

//     /// Fetches the given transaction from the given fork and executes it on the current state.
//     function transact(uint256 forkId, bytes32 txHash) external;

//     /// Sets `tx.gasprice`.
//     function txGasPrice(uint256 newGasPrice) external;

//     /// Sets `block.timestamp`.
//     function warp(uint256 newTimestamp) external;

//     // ======== Testing ========

//     /// Expect a call to an address with the specified `msg.value` and calldata, and a *minimum* amount of gas.
//     function expectCallMinGas(address callee, uint256 msgValue, uint64 minGas, bytes calldata data) external;

//     /// Expect given number of calls to an address with the specified `msg.value` and calldata, and a *minimum* amount of gas.
//     function expectCallMinGas(address callee, uint256 msgValue, uint64 minGas, bytes calldata data, uint64 count)
//         external;

//     /// Expects a call to an address with the specified calldata.
//     /// Calldata can either be a strict or a partial match.
//     function expectCall(address callee, bytes calldata data) external;

//     /// Expects given number of calls to an address with the specified calldata.
//     function expectCall(address callee, bytes calldata data, uint64 count) external;

//     /// Expects a call to an address with the specified `msg.value` and calldata.
//     function expectCall(address callee, uint256 msgValue, bytes calldata data) external;

//     /// Expects given number of calls to an address with the specified `msg.value` and calldata.
//     function expectCall(address callee, uint256 msgValue, bytes calldata data, uint64 count) external;

//     /// Expect a call to an address with the specified `msg.value`, gas, and calldata.
//     function expectCall(address callee, uint256 msgValue, uint64 gas, bytes calldata data) external;

//     /// Expects given number of calls to an address with the specified `msg.value`, gas, and calldata.
//     function expectCall(address callee, uint256 msgValue, uint64 gas, bytes calldata data, uint64 count) external;

//     /// Prepare an expected log with (bool checkTopic1, bool checkTopic2, bool checkTopic3, bool checkData.).
//     /// Call this function, then emit an event, then call a function. Internally after the call, we check if
//     /// logs were emitted in the expected order with the expected topics and data (as specified by the booleans).
//     function expectEmit(bool checkTopic1, bool checkTopic2, bool checkTopic3, bool checkData) external;

//     /// Same as the previous method, but also checks supplied address against emitting contract.
//     function expectEmit(bool checkTopic1, bool checkTopic2, bool checkTopic3, bool checkData, address emitter)
//         external;

//     /// Prepare an expected log with all topic and data checks enabled.
//     /// Call this function, then emit an event, then call a function. Internally after the call, we check if
//     /// logs were emitted in the expected order with the expected topics and data.
//     function expectEmit() external;

//     /// Same as the previous method, but also checks supplied address against emitting contract.
//     function expectEmit(address emitter) external;

//     /// Expects an error on next call with any revert data.
//     function expectRevert() external;

//     /// Expects an error on next call that starts with the revert data.
//     function expectRevert(bytes4 revertData) external;

//     /// Expects an error on next call that exactly matches the revert data.
//     function expectRevert(bytes calldata revertData) external;

//     /// Only allows memory writes to offsets [0x00, 0x60) ∪ [min, max) in the current subcontext. If any other
//     /// memory is written to, the test will fail. Can be called multiple times to add more ranges to the set.
//     function expectSafeMemory(uint64 min, uint64 max) external;

//     /// Only allows memory writes to offsets [0x00, 0x60) ∪ [min, max) in the next created subcontext.
//     /// If any other memory is written to, the test will fail. Can be called multiple times to add more ranges
//     /// to the set.
//     function expectSafeMemoryCall(uint64 min, uint64 max) external;

//     /// Marks a test as skipped. Must be called at the top of the test.
//     function skip(bool skipTest) external;

//     /// Stops all safe memory expectation in the current subcontext.
//     function stopExpectSafeMemory() external;
// }

// // lib/forge-std/src/console.sol

// library console {
//     address constant CONSOLE_ADDRESS = address(0x000000000000000000636F6e736F6c652e6c6f67);

//     function _sendLogPayload(bytes memory payload) private view {
//         uint256 payloadLength = payload.length;
//         address consoleAddress = CONSOLE_ADDRESS;
//         /// @solidity memory-safe-assembly
//         assembly {
//             let payloadStart := add(payload, 32)
//             let r := staticcall(gas(), consoleAddress, payloadStart, payloadLength, 0, 0)
//         }
//     }

//     function log() internal view {
//         _sendLogPayload(abi.encodeWithSignature("log()"));
//     }

//     function logInt(int p0) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(int)", p0));
//     }

//     function logUint(uint p0) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(uint)", p0));
//     }

//     function logString(string memory p0) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(string)", p0));
//     }

//     function logBool(bool p0) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bool)", p0));
//     }

//     function logAddress(address p0) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(address)", p0));
//     }

//     function logBytes(bytes memory p0) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bytes)", p0));
//     }

//     function logBytes1(bytes1 p0) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bytes1)", p0));
//     }

//     function logBytes2(bytes2 p0) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bytes2)", p0));
//     }

//     function logBytes3(bytes3 p0) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bytes3)", p0));
//     }

//     function logBytes4(bytes4 p0) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bytes4)", p0));
//     }

//     function logBytes5(bytes5 p0) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bytes5)", p0));
//     }

//     function logBytes6(bytes6 p0) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bytes6)", p0));
//     }

//     function logBytes7(bytes7 p0) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bytes7)", p0));
//     }

//     function logBytes8(bytes8 p0) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bytes8)", p0));
//     }

//     function logBytes9(bytes9 p0) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bytes9)", p0));
//     }

//     function logBytes10(bytes10 p0) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bytes10)", p0));
//     }

//     function logBytes11(bytes11 p0) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bytes11)", p0));
//     }

//     function logBytes12(bytes12 p0) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bytes12)", p0));
//     }

//     function logBytes13(bytes13 p0) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bytes13)", p0));
//     }

//     function logBytes14(bytes14 p0) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bytes14)", p0));
//     }

//     function logBytes15(bytes15 p0) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bytes15)", p0));
//     }

//     function logBytes16(bytes16 p0) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bytes16)", p0));
//     }

//     function logBytes17(bytes17 p0) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bytes17)", p0));
//     }

//     function logBytes18(bytes18 p0) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bytes18)", p0));
//     }

//     function logBytes19(bytes19 p0) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bytes19)", p0));
//     }

//     function logBytes20(bytes20 p0) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bytes20)", p0));
//     }

//     function logBytes21(bytes21 p0) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bytes21)", p0));
//     }

//     function logBytes22(bytes22 p0) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bytes22)", p0));
//     }

//     function logBytes23(bytes23 p0) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bytes23)", p0));
//     }

//     function logBytes24(bytes24 p0) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bytes24)", p0));
//     }

//     function logBytes25(bytes25 p0) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bytes25)", p0));
//     }

//     function logBytes26(bytes26 p0) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bytes26)", p0));
//     }

//     function logBytes27(bytes27 p0) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bytes27)", p0));
//     }

//     function logBytes28(bytes28 p0) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bytes28)", p0));
//     }

//     function logBytes29(bytes29 p0) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bytes29)", p0));
//     }

//     function logBytes30(bytes30 p0) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bytes30)", p0));
//     }

//     function logBytes31(bytes31 p0) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bytes31)", p0));
//     }

//     function logBytes32(bytes32 p0) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bytes32)", p0));
//     }

//     function log(uint p0) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(uint)", p0));
//     }

//     function log(string memory p0) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(string)", p0));
//     }

//     function log(bool p0) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bool)", p0));
//     }

//     function log(address p0) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(address)", p0));
//     }

//     function log(uint p0, uint p1) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(uint,uint)", p0, p1));
//     }

//     function log(uint p0, string memory p1) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(uint,string)", p0, p1));
//     }

//     function log(uint p0, bool p1) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(uint,bool)", p0, p1));
//     }

//     function log(uint p0, address p1) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(uint,address)", p0, p1));
//     }

//     function log(string memory p0, uint p1) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(string,uint)", p0, p1));
//     }

//     function log(string memory p0, string memory p1) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(string,string)", p0, p1));
//     }

//     function log(string memory p0, bool p1) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(string,bool)", p0, p1));
//     }

//     function log(string memory p0, address p1) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(string,address)", p0, p1));
//     }

//     function log(bool p0, uint p1) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bool,uint)", p0, p1));
//     }

//     function log(bool p0, string memory p1) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bool,string)", p0, p1));
//     }

//     function log(bool p0, bool p1) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bool,bool)", p0, p1));
//     }

//     function log(bool p0, address p1) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bool,address)", p0, p1));
//     }

//     function log(address p0, uint p1) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(address,uint)", p0, p1));
//     }

//     function log(address p0, string memory p1) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(address,string)", p0, p1));
//     }

//     function log(address p0, bool p1) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(address,bool)", p0, p1));
//     }

//     function log(address p0, address p1) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(address,address)", p0, p1));
//     }

//     function log(uint p0, uint p1, uint p2) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(uint,uint,uint)", p0, p1, p2));
//     }

//     function log(uint p0, uint p1, string memory p2) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(uint,uint,string)", p0, p1, p2));
//     }

//     function log(uint p0, uint p1, bool p2) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(uint,uint,bool)", p0, p1, p2));
//     }

//     function log(uint p0, uint p1, address p2) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(uint,uint,address)", p0, p1, p2));
//     }

//     function log(uint p0, string memory p1, uint p2) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(uint,string,uint)", p0, p1, p2));
//     }

//     function log(uint p0, string memory p1, string memory p2) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(uint,string,string)", p0, p1, p2));
//     }

//     function log(uint p0, string memory p1, bool p2) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(uint,string,bool)", p0, p1, p2));
//     }

//     function log(uint p0, string memory p1, address p2) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(uint,string,address)", p0, p1, p2));
//     }

//     function log(uint p0, bool p1, uint p2) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(uint,bool,uint)", p0, p1, p2));
//     }

//     function log(uint p0, bool p1, string memory p2) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(uint,bool,string)", p0, p1, p2));
//     }

//     function log(uint p0, bool p1, bool p2) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(uint,bool,bool)", p0, p1, p2));
//     }

//     function log(uint p0, bool p1, address p2) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(uint,bool,address)", p0, p1, p2));
//     }

//     function log(uint p0, address p1, uint p2) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(uint,address,uint)", p0, p1, p2));
//     }

//     function log(uint p0, address p1, string memory p2) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(uint,address,string)", p0, p1, p2));
//     }

//     function log(uint p0, address p1, bool p2) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(uint,address,bool)", p0, p1, p2));
//     }

//     function log(uint p0, address p1, address p2) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(uint,address,address)", p0, p1, p2));
//     }

//     function log(string memory p0, uint p1, uint p2) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(string,uint,uint)", p0, p1, p2));
//     }

//     function log(string memory p0, uint p1, string memory p2) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(string,uint,string)", p0, p1, p2));
//     }

//     function log(string memory p0, uint p1, bool p2) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(string,uint,bool)", p0, p1, p2));
//     }

//     function log(string memory p0, uint p1, address p2) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(string,uint,address)", p0, p1, p2));
//     }

//     function log(string memory p0, string memory p1, uint p2) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(string,string,uint)", p0, p1, p2));
//     }

//     function log(string memory p0, string memory p1, string memory p2) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(string,string,string)", p0, p1, p2));
//     }

//     function log(string memory p0, string memory p1, bool p2) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(string,string,bool)", p0, p1, p2));
//     }

//     function log(string memory p0, string memory p1, address p2) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(string,string,address)", p0, p1, p2));
//     }

//     function log(string memory p0, bool p1, uint p2) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(string,bool,uint)", p0, p1, p2));
//     }

//     function log(string memory p0, bool p1, string memory p2) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(string,bool,string)", p0, p1, p2));
//     }

//     function log(string memory p0, bool p1, bool p2) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(string,bool,bool)", p0, p1, p2));
//     }

//     function log(string memory p0, bool p1, address p2) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(string,bool,address)", p0, p1, p2));
//     }

//     function log(string memory p0, address p1, uint p2) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(string,address,uint)", p0, p1, p2));
//     }

//     function log(string memory p0, address p1, string memory p2) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(string,address,string)", p0, p1, p2));
//     }

//     function log(string memory p0, address p1, bool p2) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(string,address,bool)", p0, p1, p2));
//     }

//     function log(string memory p0, address p1, address p2) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(string,address,address)", p0, p1, p2));
//     }

//     function log(bool p0, uint p1, uint p2) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bool,uint,uint)", p0, p1, p2));
//     }

//     function log(bool p0, uint p1, string memory p2) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bool,uint,string)", p0, p1, p2));
//     }

//     function log(bool p0, uint p1, bool p2) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bool,uint,bool)", p0, p1, p2));
//     }

//     function log(bool p0, uint p1, address p2) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bool,uint,address)", p0, p1, p2));
//     }

//     function log(bool p0, string memory p1, uint p2) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bool,string,uint)", p0, p1, p2));
//     }

//     function log(bool p0, string memory p1, string memory p2) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bool,string,string)", p0, p1, p2));
//     }

//     function log(bool p0, string memory p1, bool p2) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bool,string,bool)", p0, p1, p2));
//     }

//     function log(bool p0, string memory p1, address p2) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bool,string,address)", p0, p1, p2));
//     }

//     function log(bool p0, bool p1, uint p2) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bool,bool,uint)", p0, p1, p2));
//     }

//     function log(bool p0, bool p1, string memory p2) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bool,bool,string)", p0, p1, p2));
//     }

//     function log(bool p0, bool p1, bool p2) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bool,bool,bool)", p0, p1, p2));
//     }

//     function log(bool p0, bool p1, address p2) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bool,bool,address)", p0, p1, p2));
//     }

//     function log(bool p0, address p1, uint p2) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bool,address,uint)", p0, p1, p2));
//     }

//     function log(bool p0, address p1, string memory p2) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bool,address,string)", p0, p1, p2));
//     }

//     function log(bool p0, address p1, bool p2) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bool,address,bool)", p0, p1, p2));
//     }

//     function log(bool p0, address p1, address p2) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bool,address,address)", p0, p1, p2));
//     }

//     function log(address p0, uint p1, uint p2) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(address,uint,uint)", p0, p1, p2));
//     }

//     function log(address p0, uint p1, string memory p2) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(address,uint,string)", p0, p1, p2));
//     }

//     function log(address p0, uint p1, bool p2) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(address,uint,bool)", p0, p1, p2));
//     }

//     function log(address p0, uint p1, address p2) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(address,uint,address)", p0, p1, p2));
//     }

//     function log(address p0, string memory p1, uint p2) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(address,string,uint)", p0, p1, p2));
//     }

//     function log(address p0, string memory p1, string memory p2) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(address,string,string)", p0, p1, p2));
//     }

//     function log(address p0, string memory p1, bool p2) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(address,string,bool)", p0, p1, p2));
//     }

//     function log(address p0, string memory p1, address p2) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(address,string,address)", p0, p1, p2));
//     }

//     function log(address p0, bool p1, uint p2) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(address,bool,uint)", p0, p1, p2));
//     }

//     function log(address p0, bool p1, string memory p2) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(address,bool,string)", p0, p1, p2));
//     }

//     function log(address p0, bool p1, bool p2) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(address,bool,bool)", p0, p1, p2));
//     }

//     function log(address p0, bool p1, address p2) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(address,bool,address)", p0, p1, p2));
//     }

//     function log(address p0, address p1, uint p2) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(address,address,uint)", p0, p1, p2));
//     }

//     function log(address p0, address p1, string memory p2) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(address,address,string)", p0, p1, p2));
//     }

//     function log(address p0, address p1, bool p2) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(address,address,bool)", p0, p1, p2));
//     }

//     function log(address p0, address p1, address p2) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(address,address,address)", p0, p1, p2));
//     }

//     function log(uint p0, uint p1, uint p2, uint p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(uint,uint,uint,uint)", p0, p1, p2, p3));
//     }

//     function log(uint p0, uint p1, uint p2, string memory p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(uint,uint,uint,string)", p0, p1, p2, p3));
//     }

//     function log(uint p0, uint p1, uint p2, bool p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(uint,uint,uint,bool)", p0, p1, p2, p3));
//     }

//     function log(uint p0, uint p1, uint p2, address p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(uint,uint,uint,address)", p0, p1, p2, p3));
//     }

//     function log(uint p0, uint p1, string memory p2, uint p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(uint,uint,string,uint)", p0, p1, p2, p3));
//     }

//     function log(uint p0, uint p1, string memory p2, string memory p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(uint,uint,string,string)", p0, p1, p2, p3));
//     }

//     function log(uint p0, uint p1, string memory p2, bool p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(uint,uint,string,bool)", p0, p1, p2, p3));
//     }

//     function log(uint p0, uint p1, string memory p2, address p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(uint,uint,string,address)", p0, p1, p2, p3));
//     }

//     function log(uint p0, uint p1, bool p2, uint p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(uint,uint,bool,uint)", p0, p1, p2, p3));
//     }

//     function log(uint p0, uint p1, bool p2, string memory p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(uint,uint,bool,string)", p0, p1, p2, p3));
//     }

//     function log(uint p0, uint p1, bool p2, bool p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(uint,uint,bool,bool)", p0, p1, p2, p3));
//     }

//     function log(uint p0, uint p1, bool p2, address p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(uint,uint,bool,address)", p0, p1, p2, p3));
//     }

//     function log(uint p0, uint p1, address p2, uint p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(uint,uint,address,uint)", p0, p1, p2, p3));
//     }

//     function log(uint p0, uint p1, address p2, string memory p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(uint,uint,address,string)", p0, p1, p2, p3));
//     }

//     function log(uint p0, uint p1, address p2, bool p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(uint,uint,address,bool)", p0, p1, p2, p3));
//     }

//     function log(uint p0, uint p1, address p2, address p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(uint,uint,address,address)", p0, p1, p2, p3));
//     }

//     function log(uint p0, string memory p1, uint p2, uint p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(uint,string,uint,uint)", p0, p1, p2, p3));
//     }

//     function log(uint p0, string memory p1, uint p2, string memory p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(uint,string,uint,string)", p0, p1, p2, p3));
//     }

//     function log(uint p0, string memory p1, uint p2, bool p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(uint,string,uint,bool)", p0, p1, p2, p3));
//     }

//     function log(uint p0, string memory p1, uint p2, address p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(uint,string,uint,address)", p0, p1, p2, p3));
//     }

//     function log(uint p0, string memory p1, string memory p2, uint p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(uint,string,string,uint)", p0, p1, p2, p3));
//     }

//     function log(uint p0, string memory p1, string memory p2, string memory p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(uint,string,string,string)", p0, p1, p2, p3));
//     }

//     function log(uint p0, string memory p1, string memory p2, bool p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(uint,string,string,bool)", p0, p1, p2, p3));
//     }

//     function log(uint p0, string memory p1, string memory p2, address p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(uint,string,string,address)", p0, p1, p2, p3));
//     }

//     function log(uint p0, string memory p1, bool p2, uint p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(uint,string,bool,uint)", p0, p1, p2, p3));
//     }

//     function log(uint p0, string memory p1, bool p2, string memory p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(uint,string,bool,string)", p0, p1, p2, p3));
//     }

//     function log(uint p0, string memory p1, bool p2, bool p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(uint,string,bool,bool)", p0, p1, p2, p3));
//     }

//     function log(uint p0, string memory p1, bool p2, address p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(uint,string,bool,address)", p0, p1, p2, p3));
//     }

//     function log(uint p0, string memory p1, address p2, uint p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(uint,string,address,uint)", p0, p1, p2, p3));
//     }

//     function log(uint p0, string memory p1, address p2, string memory p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(uint,string,address,string)", p0, p1, p2, p3));
//     }

//     function log(uint p0, string memory p1, address p2, bool p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(uint,string,address,bool)", p0, p1, p2, p3));
//     }

//     function log(uint p0, string memory p1, address p2, address p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(uint,string,address,address)", p0, p1, p2, p3));
//     }

//     function log(uint p0, bool p1, uint p2, uint p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(uint,bool,uint,uint)", p0, p1, p2, p3));
//     }

//     function log(uint p0, bool p1, uint p2, string memory p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(uint,bool,uint,string)", p0, p1, p2, p3));
//     }

//     function log(uint p0, bool p1, uint p2, bool p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(uint,bool,uint,bool)", p0, p1, p2, p3));
//     }

//     function log(uint p0, bool p1, uint p2, address p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(uint,bool,uint,address)", p0, p1, p2, p3));
//     }

//     function log(uint p0, bool p1, string memory p2, uint p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(uint,bool,string,uint)", p0, p1, p2, p3));
//     }

//     function log(uint p0, bool p1, string memory p2, string memory p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(uint,bool,string,string)", p0, p1, p2, p3));
//     }

//     function log(uint p0, bool p1, string memory p2, bool p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(uint,bool,string,bool)", p0, p1, p2, p3));
//     }

//     function log(uint p0, bool p1, string memory p2, address p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(uint,bool,string,address)", p0, p1, p2, p3));
//     }

//     function log(uint p0, bool p1, bool p2, uint p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(uint,bool,bool,uint)", p0, p1, p2, p3));
//     }

//     function log(uint p0, bool p1, bool p2, string memory p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(uint,bool,bool,string)", p0, p1, p2, p3));
//     }

//     function log(uint p0, bool p1, bool p2, bool p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(uint,bool,bool,bool)", p0, p1, p2, p3));
//     }

//     function log(uint p0, bool p1, bool p2, address p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(uint,bool,bool,address)", p0, p1, p2, p3));
//     }

//     function log(uint p0, bool p1, address p2, uint p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(uint,bool,address,uint)", p0, p1, p2, p3));
//     }

//     function log(uint p0, bool p1, address p2, string memory p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(uint,bool,address,string)", p0, p1, p2, p3));
//     }

//     function log(uint p0, bool p1, address p2, bool p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(uint,bool,address,bool)", p0, p1, p2, p3));
//     }

//     function log(uint p0, bool p1, address p2, address p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(uint,bool,address,address)", p0, p1, p2, p3));
//     }

//     function log(uint p0, address p1, uint p2, uint p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(uint,address,uint,uint)", p0, p1, p2, p3));
//     }

//     function log(uint p0, address p1, uint p2, string memory p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(uint,address,uint,string)", p0, p1, p2, p3));
//     }

//     function log(uint p0, address p1, uint p2, bool p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(uint,address,uint,bool)", p0, p1, p2, p3));
//     }

//     function log(uint p0, address p1, uint p2, address p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(uint,address,uint,address)", p0, p1, p2, p3));
//     }

//     function log(uint p0, address p1, string memory p2, uint p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(uint,address,string,uint)", p0, p1, p2, p3));
//     }

//     function log(uint p0, address p1, string memory p2, string memory p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(uint,address,string,string)", p0, p1, p2, p3));
//     }

//     function log(uint p0, address p1, string memory p2, bool p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(uint,address,string,bool)", p0, p1, p2, p3));
//     }

//     function log(uint p0, address p1, string memory p2, address p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(uint,address,string,address)", p0, p1, p2, p3));
//     }

//     function log(uint p0, address p1, bool p2, uint p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(uint,address,bool,uint)", p0, p1, p2, p3));
//     }

//     function log(uint p0, address p1, bool p2, string memory p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(uint,address,bool,string)", p0, p1, p2, p3));
//     }

//     function log(uint p0, address p1, bool p2, bool p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(uint,address,bool,bool)", p0, p1, p2, p3));
//     }

//     function log(uint p0, address p1, bool p2, address p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(uint,address,bool,address)", p0, p1, p2, p3));
//     }

//     function log(uint p0, address p1, address p2, uint p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(uint,address,address,uint)", p0, p1, p2, p3));
//     }

//     function log(uint p0, address p1, address p2, string memory p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(uint,address,address,string)", p0, p1, p2, p3));
//     }

//     function log(uint p0, address p1, address p2, bool p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(uint,address,address,bool)", p0, p1, p2, p3));
//     }

//     function log(uint p0, address p1, address p2, address p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(uint,address,address,address)", p0, p1, p2, p3));
//     }

//     function log(string memory p0, uint p1, uint p2, uint p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(string,uint,uint,uint)", p0, p1, p2, p3));
//     }

//     function log(string memory p0, uint p1, uint p2, string memory p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(string,uint,uint,string)", p0, p1, p2, p3));
//     }

//     function log(string memory p0, uint p1, uint p2, bool p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(string,uint,uint,bool)", p0, p1, p2, p3));
//     }

//     function log(string memory p0, uint p1, uint p2, address p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(string,uint,uint,address)", p0, p1, p2, p3));
//     }

//     function log(string memory p0, uint p1, string memory p2, uint p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(string,uint,string,uint)", p0, p1, p2, p3));
//     }

//     function log(string memory p0, uint p1, string memory p2, string memory p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(string,uint,string,string)", p0, p1, p2, p3));
//     }

//     function log(string memory p0, uint p1, string memory p2, bool p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(string,uint,string,bool)", p0, p1, p2, p3));
//     }

//     function log(string memory p0, uint p1, string memory p2, address p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(string,uint,string,address)", p0, p1, p2, p3));
//     }

//     function log(string memory p0, uint p1, bool p2, uint p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(string,uint,bool,uint)", p0, p1, p2, p3));
//     }

//     function log(string memory p0, uint p1, bool p2, string memory p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(string,uint,bool,string)", p0, p1, p2, p3));
//     }

//     function log(string memory p0, uint p1, bool p2, bool p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(string,uint,bool,bool)", p0, p1, p2, p3));
//     }

//     function log(string memory p0, uint p1, bool p2, address p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(string,uint,bool,address)", p0, p1, p2, p3));
//     }

//     function log(string memory p0, uint p1, address p2, uint p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(string,uint,address,uint)", p0, p1, p2, p3));
//     }

//     function log(string memory p0, uint p1, address p2, string memory p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(string,uint,address,string)", p0, p1, p2, p3));
//     }

//     function log(string memory p0, uint p1, address p2, bool p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(string,uint,address,bool)", p0, p1, p2, p3));
//     }

//     function log(string memory p0, uint p1, address p2, address p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(string,uint,address,address)", p0, p1, p2, p3));
//     }

//     function log(string memory p0, string memory p1, uint p2, uint p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(string,string,uint,uint)", p0, p1, p2, p3));
//     }

//     function log(string memory p0, string memory p1, uint p2, string memory p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(string,string,uint,string)", p0, p1, p2, p3));
//     }

//     function log(string memory p0, string memory p1, uint p2, bool p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(string,string,uint,bool)", p0, p1, p2, p3));
//     }

//     function log(string memory p0, string memory p1, uint p2, address p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(string,string,uint,address)", p0, p1, p2, p3));
//     }

//     function log(string memory p0, string memory p1, string memory p2, uint p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(string,string,string,uint)", p0, p1, p2, p3));
//     }

//     function log(string memory p0, string memory p1, string memory p2, string memory p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(string,string,string,string)", p0, p1, p2, p3));
//     }

//     function log(string memory p0, string memory p1, string memory p2, bool p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(string,string,string,bool)", p0, p1, p2, p3));
//     }

//     function log(string memory p0, string memory p1, string memory p2, address p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(string,string,string,address)", p0, p1, p2, p3));
//     }

//     function log(string memory p0, string memory p1, bool p2, uint p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(string,string,bool,uint)", p0, p1, p2, p3));
//     }

//     function log(string memory p0, string memory p1, bool p2, string memory p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(string,string,bool,string)", p0, p1, p2, p3));
//     }

//     function log(string memory p0, string memory p1, bool p2, bool p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(string,string,bool,bool)", p0, p1, p2, p3));
//     }

//     function log(string memory p0, string memory p1, bool p2, address p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(string,string,bool,address)", p0, p1, p2, p3));
//     }

//     function log(string memory p0, string memory p1, address p2, uint p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(string,string,address,uint)", p0, p1, p2, p3));
//     }

//     function log(string memory p0, string memory p1, address p2, string memory p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(string,string,address,string)", p0, p1, p2, p3));
//     }

//     function log(string memory p0, string memory p1, address p2, bool p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(string,string,address,bool)", p0, p1, p2, p3));
//     }

//     function log(string memory p0, string memory p1, address p2, address p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(string,string,address,address)", p0, p1, p2, p3));
//     }

//     function log(string memory p0, bool p1, uint p2, uint p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(string,bool,uint,uint)", p0, p1, p2, p3));
//     }

//     function log(string memory p0, bool p1, uint p2, string memory p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(string,bool,uint,string)", p0, p1, p2, p3));
//     }

//     function log(string memory p0, bool p1, uint p2, bool p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(string,bool,uint,bool)", p0, p1, p2, p3));
//     }

//     function log(string memory p0, bool p1, uint p2, address p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(string,bool,uint,address)", p0, p1, p2, p3));
//     }

//     function log(string memory p0, bool p1, string memory p2, uint p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(string,bool,string,uint)", p0, p1, p2, p3));
//     }

//     function log(string memory p0, bool p1, string memory p2, string memory p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(string,bool,string,string)", p0, p1, p2, p3));
//     }

//     function log(string memory p0, bool p1, string memory p2, bool p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(string,bool,string,bool)", p0, p1, p2, p3));
//     }

//     function log(string memory p0, bool p1, string memory p2, address p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(string,bool,string,address)", p0, p1, p2, p3));
//     }

//     function log(string memory p0, bool p1, bool p2, uint p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(string,bool,bool,uint)", p0, p1, p2, p3));
//     }

//     function log(string memory p0, bool p1, bool p2, string memory p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(string,bool,bool,string)", p0, p1, p2, p3));
//     }

//     function log(string memory p0, bool p1, bool p2, bool p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(string,bool,bool,bool)", p0, p1, p2, p3));
//     }

//     function log(string memory p0, bool p1, bool p2, address p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(string,bool,bool,address)", p0, p1, p2, p3));
//     }

//     function log(string memory p0, bool p1, address p2, uint p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(string,bool,address,uint)", p0, p1, p2, p3));
//     }

//     function log(string memory p0, bool p1, address p2, string memory p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(string,bool,address,string)", p0, p1, p2, p3));
//     }

//     function log(string memory p0, bool p1, address p2, bool p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(string,bool,address,bool)", p0, p1, p2, p3));
//     }

//     function log(string memory p0, bool p1, address p2, address p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(string,bool,address,address)", p0, p1, p2, p3));
//     }

//     function log(string memory p0, address p1, uint p2, uint p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(string,address,uint,uint)", p0, p1, p2, p3));
//     }

//     function log(string memory p0, address p1, uint p2, string memory p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(string,address,uint,string)", p0, p1, p2, p3));
//     }

//     function log(string memory p0, address p1, uint p2, bool p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(string,address,uint,bool)", p0, p1, p2, p3));
//     }

//     function log(string memory p0, address p1, uint p2, address p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(string,address,uint,address)", p0, p1, p2, p3));
//     }

//     function log(string memory p0, address p1, string memory p2, uint p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(string,address,string,uint)", p0, p1, p2, p3));
//     }

//     function log(string memory p0, address p1, string memory p2, string memory p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(string,address,string,string)", p0, p1, p2, p3));
//     }

//     function log(string memory p0, address p1, string memory p2, bool p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(string,address,string,bool)", p0, p1, p2, p3));
//     }

//     function log(string memory p0, address p1, string memory p2, address p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(string,address,string,address)", p0, p1, p2, p3));
//     }

//     function log(string memory p0, address p1, bool p2, uint p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(string,address,bool,uint)", p0, p1, p2, p3));
//     }

//     function log(string memory p0, address p1, bool p2, string memory p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(string,address,bool,string)", p0, p1, p2, p3));
//     }

//     function log(string memory p0, address p1, bool p2, bool p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(string,address,bool,bool)", p0, p1, p2, p3));
//     }

//     function log(string memory p0, address p1, bool p2, address p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(string,address,bool,address)", p0, p1, p2, p3));
//     }

//     function log(string memory p0, address p1, address p2, uint p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(string,address,address,uint)", p0, p1, p2, p3));
//     }

//     function log(string memory p0, address p1, address p2, string memory p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(string,address,address,string)", p0, p1, p2, p3));
//     }

//     function log(string memory p0, address p1, address p2, bool p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(string,address,address,bool)", p0, p1, p2, p3));
//     }

//     function log(string memory p0, address p1, address p2, address p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(string,address,address,address)", p0, p1, p2, p3));
//     }

//     function log(bool p0, uint p1, uint p2, uint p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bool,uint,uint,uint)", p0, p1, p2, p3));
//     }

//     function log(bool p0, uint p1, uint p2, string memory p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bool,uint,uint,string)", p0, p1, p2, p3));
//     }

//     function log(bool p0, uint p1, uint p2, bool p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bool,uint,uint,bool)", p0, p1, p2, p3));
//     }

//     function log(bool p0, uint p1, uint p2, address p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bool,uint,uint,address)", p0, p1, p2, p3));
//     }

//     function log(bool p0, uint p1, string memory p2, uint p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bool,uint,string,uint)", p0, p1, p2, p3));
//     }

//     function log(bool p0, uint p1, string memory p2, string memory p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bool,uint,string,string)", p0, p1, p2, p3));
//     }

//     function log(bool p0, uint p1, string memory p2, bool p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bool,uint,string,bool)", p0, p1, p2, p3));
//     }

//     function log(bool p0, uint p1, string memory p2, address p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bool,uint,string,address)", p0, p1, p2, p3));
//     }

//     function log(bool p0, uint p1, bool p2, uint p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bool,uint,bool,uint)", p0, p1, p2, p3));
//     }

//     function log(bool p0, uint p1, bool p2, string memory p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bool,uint,bool,string)", p0, p1, p2, p3));
//     }

//     function log(bool p0, uint p1, bool p2, bool p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bool,uint,bool,bool)", p0, p1, p2, p3));
//     }

//     function log(bool p0, uint p1, bool p2, address p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bool,uint,bool,address)", p0, p1, p2, p3));
//     }

//     function log(bool p0, uint p1, address p2, uint p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bool,uint,address,uint)", p0, p1, p2, p3));
//     }

//     function log(bool p0, uint p1, address p2, string memory p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bool,uint,address,string)", p0, p1, p2, p3));
//     }

//     function log(bool p0, uint p1, address p2, bool p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bool,uint,address,bool)", p0, p1, p2, p3));
//     }

//     function log(bool p0, uint p1, address p2, address p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bool,uint,address,address)", p0, p1, p2, p3));
//     }

//     function log(bool p0, string memory p1, uint p2, uint p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bool,string,uint,uint)", p0, p1, p2, p3));
//     }

//     function log(bool p0, string memory p1, uint p2, string memory p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bool,string,uint,string)", p0, p1, p2, p3));
//     }

//     function log(bool p0, string memory p1, uint p2, bool p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bool,string,uint,bool)", p0, p1, p2, p3));
//     }

//     function log(bool p0, string memory p1, uint p2, address p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bool,string,uint,address)", p0, p1, p2, p3));
//     }

//     function log(bool p0, string memory p1, string memory p2, uint p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bool,string,string,uint)", p0, p1, p2, p3));
//     }

//     function log(bool p0, string memory p1, string memory p2, string memory p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bool,string,string,string)", p0, p1, p2, p3));
//     }

//     function log(bool p0, string memory p1, string memory p2, bool p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bool,string,string,bool)", p0, p1, p2, p3));
//     }

//     function log(bool p0, string memory p1, string memory p2, address p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bool,string,string,address)", p0, p1, p2, p3));
//     }

//     function log(bool p0, string memory p1, bool p2, uint p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bool,string,bool,uint)", p0, p1, p2, p3));
//     }

//     function log(bool p0, string memory p1, bool p2, string memory p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bool,string,bool,string)", p0, p1, p2, p3));
//     }

//     function log(bool p0, string memory p1, bool p2, bool p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bool,string,bool,bool)", p0, p1, p2, p3));
//     }

//     function log(bool p0, string memory p1, bool p2, address p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bool,string,bool,address)", p0, p1, p2, p3));
//     }

//     function log(bool p0, string memory p1, address p2, uint p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bool,string,address,uint)", p0, p1, p2, p3));
//     }

//     function log(bool p0, string memory p1, address p2, string memory p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bool,string,address,string)", p0, p1, p2, p3));
//     }

//     function log(bool p0, string memory p1, address p2, bool p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bool,string,address,bool)", p0, p1, p2, p3));
//     }

//     function log(bool p0, string memory p1, address p2, address p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bool,string,address,address)", p0, p1, p2, p3));
//     }

//     function log(bool p0, bool p1, uint p2, uint p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bool,bool,uint,uint)", p0, p1, p2, p3));
//     }

//     function log(bool p0, bool p1, uint p2, string memory p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bool,bool,uint,string)", p0, p1, p2, p3));
//     }

//     function log(bool p0, bool p1, uint p2, bool p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bool,bool,uint,bool)", p0, p1, p2, p3));
//     }

//     function log(bool p0, bool p1, uint p2, address p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bool,bool,uint,address)", p0, p1, p2, p3));
//     }

//     function log(bool p0, bool p1, string memory p2, uint p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bool,bool,string,uint)", p0, p1, p2, p3));
//     }

//     function log(bool p0, bool p1, string memory p2, string memory p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bool,bool,string,string)", p0, p1, p2, p3));
//     }

//     function log(bool p0, bool p1, string memory p2, bool p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bool,bool,string,bool)", p0, p1, p2, p3));
//     }

//     function log(bool p0, bool p1, string memory p2, address p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bool,bool,string,address)", p0, p1, p2, p3));
//     }

//     function log(bool p0, bool p1, bool p2, uint p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bool,bool,bool,uint)", p0, p1, p2, p3));
//     }

//     function log(bool p0, bool p1, bool p2, string memory p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bool,bool,bool,string)", p0, p1, p2, p3));
//     }

//     function log(bool p0, bool p1, bool p2, bool p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bool,bool,bool,bool)", p0, p1, p2, p3));
//     }

//     function log(bool p0, bool p1, bool p2, address p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bool,bool,bool,address)", p0, p1, p2, p3));
//     }

//     function log(bool p0, bool p1, address p2, uint p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bool,bool,address,uint)", p0, p1, p2, p3));
//     }

//     function log(bool p0, bool p1, address p2, string memory p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bool,bool,address,string)", p0, p1, p2, p3));
//     }

//     function log(bool p0, bool p1, address p2, bool p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bool,bool,address,bool)", p0, p1, p2, p3));
//     }

//     function log(bool p0, bool p1, address p2, address p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bool,bool,address,address)", p0, p1, p2, p3));
//     }

//     function log(bool p0, address p1, uint p2, uint p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bool,address,uint,uint)", p0, p1, p2, p3));
//     }

//     function log(bool p0, address p1, uint p2, string memory p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bool,address,uint,string)", p0, p1, p2, p3));
//     }

//     function log(bool p0, address p1, uint p2, bool p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bool,address,uint,bool)", p0, p1, p2, p3));
//     }

//     function log(bool p0, address p1, uint p2, address p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bool,address,uint,address)", p0, p1, p2, p3));
//     }

//     function log(bool p0, address p1, string memory p2, uint p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bool,address,string,uint)", p0, p1, p2, p3));
//     }

//     function log(bool p0, address p1, string memory p2, string memory p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bool,address,string,string)", p0, p1, p2, p3));
//     }

//     function log(bool p0, address p1, string memory p2, bool p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bool,address,string,bool)", p0, p1, p2, p3));
//     }

//     function log(bool p0, address p1, string memory p2, address p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bool,address,string,address)", p0, p1, p2, p3));
//     }

//     function log(bool p0, address p1, bool p2, uint p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bool,address,bool,uint)", p0, p1, p2, p3));
//     }

//     function log(bool p0, address p1, bool p2, string memory p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bool,address,bool,string)", p0, p1, p2, p3));
//     }

//     function log(bool p0, address p1, bool p2, bool p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bool,address,bool,bool)", p0, p1, p2, p3));
//     }

//     function log(bool p0, address p1, bool p2, address p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bool,address,bool,address)", p0, p1, p2, p3));
//     }

//     function log(bool p0, address p1, address p2, uint p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bool,address,address,uint)", p0, p1, p2, p3));
//     }

//     function log(bool p0, address p1, address p2, string memory p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bool,address,address,string)", p0, p1, p2, p3));
//     }

//     function log(bool p0, address p1, address p2, bool p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bool,address,address,bool)", p0, p1, p2, p3));
//     }

//     function log(bool p0, address p1, address p2, address p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(bool,address,address,address)", p0, p1, p2, p3));
//     }

//     function log(address p0, uint p1, uint p2, uint p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(address,uint,uint,uint)", p0, p1, p2, p3));
//     }

//     function log(address p0, uint p1, uint p2, string memory p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(address,uint,uint,string)", p0, p1, p2, p3));
//     }

//     function log(address p0, uint p1, uint p2, bool p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(address,uint,uint,bool)", p0, p1, p2, p3));
//     }

//     function log(address p0, uint p1, uint p2, address p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(address,uint,uint,address)", p0, p1, p2, p3));
//     }

//     function log(address p0, uint p1, string memory p2, uint p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(address,uint,string,uint)", p0, p1, p2, p3));
//     }

//     function log(address p0, uint p1, string memory p2, string memory p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(address,uint,string,string)", p0, p1, p2, p3));
//     }

//     function log(address p0, uint p1, string memory p2, bool p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(address,uint,string,bool)", p0, p1, p2, p3));
//     }

//     function log(address p0, uint p1, string memory p2, address p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(address,uint,string,address)", p0, p1, p2, p3));
//     }

//     function log(address p0, uint p1, bool p2, uint p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(address,uint,bool,uint)", p0, p1, p2, p3));
//     }

//     function log(address p0, uint p1, bool p2, string memory p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(address,uint,bool,string)", p0, p1, p2, p3));
//     }

//     function log(address p0, uint p1, bool p2, bool p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(address,uint,bool,bool)", p0, p1, p2, p3));
//     }

//     function log(address p0, uint p1, bool p2, address p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(address,uint,bool,address)", p0, p1, p2, p3));
//     }

//     function log(address p0, uint p1, address p2, uint p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(address,uint,address,uint)", p0, p1, p2, p3));
//     }

//     function log(address p0, uint p1, address p2, string memory p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(address,uint,address,string)", p0, p1, p2, p3));
//     }

//     function log(address p0, uint p1, address p2, bool p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(address,uint,address,bool)", p0, p1, p2, p3));
//     }

//     function log(address p0, uint p1, address p2, address p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(address,uint,address,address)", p0, p1, p2, p3));
//     }

//     function log(address p0, string memory p1, uint p2, uint p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(address,string,uint,uint)", p0, p1, p2, p3));
//     }

//     function log(address p0, string memory p1, uint p2, string memory p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(address,string,uint,string)", p0, p1, p2, p3));
//     }

//     function log(address p0, string memory p1, uint p2, bool p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(address,string,uint,bool)", p0, p1, p2, p3));
//     }

//     function log(address p0, string memory p1, uint p2, address p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(address,string,uint,address)", p0, p1, p2, p3));
//     }

//     function log(address p0, string memory p1, string memory p2, uint p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(address,string,string,uint)", p0, p1, p2, p3));
//     }

//     function log(address p0, string memory p1, string memory p2, string memory p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(address,string,string,string)", p0, p1, p2, p3));
//     }

//     function log(address p0, string memory p1, string memory p2, bool p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(address,string,string,bool)", p0, p1, p2, p3));
//     }

//     function log(address p0, string memory p1, string memory p2, address p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(address,string,string,address)", p0, p1, p2, p3));
//     }

//     function log(address p0, string memory p1, bool p2, uint p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(address,string,bool,uint)", p0, p1, p2, p3));
//     }

//     function log(address p0, string memory p1, bool p2, string memory p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(address,string,bool,string)", p0, p1, p2, p3));
//     }

//     function log(address p0, string memory p1, bool p2, bool p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(address,string,bool,bool)", p0, p1, p2, p3));
//     }

//     function log(address p0, string memory p1, bool p2, address p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(address,string,bool,address)", p0, p1, p2, p3));
//     }

//     function log(address p0, string memory p1, address p2, uint p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(address,string,address,uint)", p0, p1, p2, p3));
//     }

//     function log(address p0, string memory p1, address p2, string memory p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(address,string,address,string)", p0, p1, p2, p3));
//     }

//     function log(address p0, string memory p1, address p2, bool p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(address,string,address,bool)", p0, p1, p2, p3));
//     }

//     function log(address p0, string memory p1, address p2, address p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(address,string,address,address)", p0, p1, p2, p3));
//     }

//     function log(address p0, bool p1, uint p2, uint p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(address,bool,uint,uint)", p0, p1, p2, p3));
//     }

//     function log(address p0, bool p1, uint p2, string memory p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(address,bool,uint,string)", p0, p1, p2, p3));
//     }

//     function log(address p0, bool p1, uint p2, bool p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(address,bool,uint,bool)", p0, p1, p2, p3));
//     }

//     function log(address p0, bool p1, uint p2, address p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(address,bool,uint,address)", p0, p1, p2, p3));
//     }

//     function log(address p0, bool p1, string memory p2, uint p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(address,bool,string,uint)", p0, p1, p2, p3));
//     }

//     function log(address p0, bool p1, string memory p2, string memory p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(address,bool,string,string)", p0, p1, p2, p3));
//     }

//     function log(address p0, bool p1, string memory p2, bool p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(address,bool,string,bool)", p0, p1, p2, p3));
//     }

//     function log(address p0, bool p1, string memory p2, address p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(address,bool,string,address)", p0, p1, p2, p3));
//     }

//     function log(address p0, bool p1, bool p2, uint p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(address,bool,bool,uint)", p0, p1, p2, p3));
//     }

//     function log(address p0, bool p1, bool p2, string memory p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(address,bool,bool,string)", p0, p1, p2, p3));
//     }

//     function log(address p0, bool p1, bool p2, bool p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(address,bool,bool,bool)", p0, p1, p2, p3));
//     }

//     function log(address p0, bool p1, bool p2, address p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(address,bool,bool,address)", p0, p1, p2, p3));
//     }

//     function log(address p0, bool p1, address p2, uint p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(address,bool,address,uint)", p0, p1, p2, p3));
//     }

//     function log(address p0, bool p1, address p2, string memory p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(address,bool,address,string)", p0, p1, p2, p3));
//     }

//     function log(address p0, bool p1, address p2, bool p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(address,bool,address,bool)", p0, p1, p2, p3));
//     }

//     function log(address p0, bool p1, address p2, address p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(address,bool,address,address)", p0, p1, p2, p3));
//     }

//     function log(address p0, address p1, uint p2, uint p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(address,address,uint,uint)", p0, p1, p2, p3));
//     }

//     function log(address p0, address p1, uint p2, string memory p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(address,address,uint,string)", p0, p1, p2, p3));
//     }

//     function log(address p0, address p1, uint p2, bool p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(address,address,uint,bool)", p0, p1, p2, p3));
//     }

//     function log(address p0, address p1, uint p2, address p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(address,address,uint,address)", p0, p1, p2, p3));
//     }

//     function log(address p0, address p1, string memory p2, uint p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(address,address,string,uint)", p0, p1, p2, p3));
//     }

//     function log(address p0, address p1, string memory p2, string memory p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(address,address,string,string)", p0, p1, p2, p3));
//     }

//     function log(address p0, address p1, string memory p2, bool p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(address,address,string,bool)", p0, p1, p2, p3));
//     }

//     function log(address p0, address p1, string memory p2, address p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(address,address,string,address)", p0, p1, p2, p3));
//     }

//     function log(address p0, address p1, bool p2, uint p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(address,address,bool,uint)", p0, p1, p2, p3));
//     }

//     function log(address p0, address p1, bool p2, string memory p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(address,address,bool,string)", p0, p1, p2, p3));
//     }

//     function log(address p0, address p1, bool p2, bool p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(address,address,bool,bool)", p0, p1, p2, p3));
//     }

//     function log(address p0, address p1, bool p2, address p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(address,address,bool,address)", p0, p1, p2, p3));
//     }

//     function log(address p0, address p1, address p2, uint p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(address,address,address,uint)", p0, p1, p2, p3));
//     }

//     function log(address p0, address p1, address p2, string memory p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(address,address,address,string)", p0, p1, p2, p3));
//     }

//     function log(address p0, address p1, address p2, bool p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(address,address,address,bool)", p0, p1, p2, p3));
//     }

//     function log(address p0, address p1, address p2, address p3) internal view {
//         _sendLogPayload(abi.encodeWithSignature("log(address,address,address,address)", p0, p1, p2, p3));
//     }

// }

// // lib/openzeppelin-contracts/contracts/interfaces/IERC1967.sol

// // OpenZeppelin Contracts (last updated v4.9.0) (interfaces/IERC1967.sol)

// /**
//  * @dev ERC-1967: Proxy Storage Slots. This interface contains the events defined in the ERC.
//  *
//  * _Available since v4.8.3._
//  */
// interface IERC1967 {
//     /**
//      * @dev Emitted when the implementation is upgraded.
//      */
//     event Upgraded(address indexed implementation);

//     /**
//      * @dev Emitted when the admin account has changed.
//      */
//     event AdminChanged(address previousAdmin, address newAdmin);

//     /**
//      * @dev Emitted when the beacon is changed.
//      */
//     event BeaconUpgraded(address indexed beacon);
// }

// // lib/openzeppelin-contracts/contracts/interfaces/draft-IERC1822.sol

// // OpenZeppelin Contracts (last updated v4.5.0) (interfaces/draft-IERC1822.sol)

// /**
//  * @dev ERC1822: Universal Upgradeable Proxy Standard (UUPS) documents a method for upgradeability through a simplified
//  * proxy whose upgrades are fully controlled by the current implementation.
//  */
// interface IERC1822Proxiable {
//     /**
//      * @dev Returns the storage slot that the proxiable contract assumes is being used to store the implementation
//      * address.
//      *
//      * IMPORTANT: A proxy pointing at a proxiable contract should not be considered proxiable itself, because this risks
//      * bricking a proxy that upgrades to it, by delegating to itself until out of gas. Thus it is critical that this
//      * function revert if invoked through a proxy.
//      */
//     function proxiableUUID() external view returns (bytes32);
// }

// // lib/openzeppelin-contracts/contracts/proxy/Proxy.sol

// // OpenZeppelin Contracts (last updated v4.6.0) (proxy/Proxy.sol)

// /**
//  * @dev This abstract contract provides a fallback function that delegates all calls to another contract using the EVM
//  * instruction `delegatecall`. We refer to the second contract as the _implementation_ behind the proxy, and it has to
//  * be specified by overriding the virtual {_implementation} function.
//  *
//  * Additionally, delegation to the implementation can be triggered manually through the {_fallback} function, or to a
//  * different contract through the {_delegate} function.
//  *
//  * The success and return data of the delegated call will be returned back to the caller of the proxy.
//  */
// abstract contract Proxy {
//     /**
//      * @dev Delegates the current call to `implementation`.
//      *
//      * This function does not return to its internal call site, it will return directly to the external caller.
//      */
//     function _delegate(address implementation) internal virtual {
//         assembly {
//             // Copy msg.data. We take full control of memory in this inline assembly
//             // block because it will not return to Solidity code. We overwrite the
//             // Solidity scratch pad at memory position 0.
//             calldatacopy(0, 0, calldatasize())

//             // Call the implementation.
//             // out and outsize are 0 because we don't know the size yet.
//             let result := delegatecall(gas(), implementation, 0, calldatasize(), 0, 0)

//             // Copy the returned data.
//             returndatacopy(0, 0, returndatasize())

//             switch result
//             // delegatecall returns 0 on error.
//             case 0 {
//                 revert(0, returndatasize())
//             }
//             default {
//                 return(0, returndatasize())
//             }
//         }
//     }

//     /**
//      * @dev This is a virtual function that should be overridden so it returns the address to which the fallback function
//      * and {_fallback} should delegate.
//      */
//     function _implementation() internal view virtual returns (address);

//     /**
//      * @dev Delegates the current call to the address returned by `_implementation()`.
//      *
//      * This function does not return to its internal call site, it will return directly to the external caller.
//      */
//     function _fallback() internal virtual {
//         _beforeFallback();
//         _delegate(_implementation());
//     }

//     /**
//      * @dev Fallback function that delegates calls to the address returned by `_implementation()`. Will run if no other
//      * function in the contract matches the call data.
//      */
//     fallback() external payable virtual {
//         _fallback();
//     }

//     /**
//      * @dev Fallback function that delegates calls to the address returned by `_implementation()`. Will run if call data
//      * is empty.
//      */
//     receive() external payable virtual {
//         _fallback();
//     }

//     /**
//      * @dev Hook that is called before falling back to the implementation. Can happen as part of a manual `_fallback`
//      * call, or as part of the Solidity `fallback` or `receive` functions.
//      *
//      * If overridden should call `super._beforeFallback()`.
//      */
//     function _beforeFallback() internal virtual {}
// }

// // lib/openzeppelin-contracts/contracts/proxy/beacon/IBeacon.sol

// // OpenZeppelin Contracts v4.4.1 (proxy/beacon/IBeacon.sol)

// /**
//  * @dev This is the interface that {BeaconProxy} expects of its beacon.
//  */
// interface IBeacon {
//     /**
//      * @dev Must return an address that can be used as a delegate call target.
//      *
//      * {BeaconProxy} will check that this address is a contract.
//      */
//     function implementation() external view returns (address);
// }

// // lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol

// // OpenZeppelin Contracts (last updated v4.9.0) (token/ERC20/IERC20.sol)

// /**
//  * @dev Interface of the ERC20 standard as defined in the EIP.
//  */
// interface IERC20 {
//     /**
//      * @dev Emitted when `value` tokens are moved from one account (`from`) to
//      * another (`to`).
//      *
//      * Note that `value` may be zero.
//      */
//     event Transfer(address indexed from, address indexed to, uint256 value);

//     /**
//      * @dev Emitted when the allowance of a `spender` for an `owner` is set by
//      * a call to {approve}. `value` is the new allowance.
//      */
//     event Approval(address indexed owner, address indexed spender, uint256 value);

//     /**
//      * @dev Returns the amount of tokens in existence.
//      */
//     function totalSupply() external view returns (uint256);

//     /**
//      * @dev Returns the amount of tokens owned by `account`.
//      */
//     function balanceOf(address account) external view returns (uint256);

//     /**
//      * @dev Moves `amount` tokens from the caller's account to `to`.
//      *
//      * Returns a boolean value indicating whether the operation succeeded.
//      *
//      * Emits a {Transfer} event.
//      */
//     function transfer(address to, uint256 amount) external returns (bool);

//     /**
//      * @dev Returns the remaining number of tokens that `spender` will be
//      * allowed to spend on behalf of `owner` through {transferFrom}. This is
//      * zero by default.
//      *
//      * This value changes when {approve} or {transferFrom} are called.
//      */
//     function allowance(address owner, address spender) external view returns (uint256);

//     /**
//      * @dev Sets `amount` as the allowance of `spender` over the caller's tokens.
//      *
//      * Returns a boolean value indicating whether the operation succeeded.
//      *
//      * IMPORTANT: Beware that changing an allowance with this method brings the risk
//      * that someone may use both the old and the new allowance by unfortunate
//      * transaction ordering. One possible solution to mitigate this race
//      * condition is to first reduce the spender's allowance to 0 and set the
//      * desired value afterwards:
//      * https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
//      *
//      * Emits an {Approval} event.
//      */
//     function approve(address spender, uint256 amount) external returns (bool);

//     /**
//      * @dev Moves `amount` tokens from `from` to `to` using the
//      * allowance mechanism. `amount` is then deducted from the caller's
//      * allowance.
//      *
//      * Returns a boolean value indicating whether the operation succeeded.
//      *
//      * Emits a {Transfer} event.
//      */
//     function transferFrom(address from, address to, uint256 amount) external returns (bool);
// }

// // lib/openzeppelin-contracts/contracts/token/ERC20/extensions/IERC20Permit.sol

// // OpenZeppelin Contracts (last updated v4.9.0) (token/ERC20/extensions/IERC20Permit.sol)

// /**
//  * @dev Interface of the ERC20 Permit extension allowing approvals to be made via signatures, as defined in
//  * https://eips.ethereum.org/EIPS/eip-2612[EIP-2612].
//  *
//  * Adds the {permit} method, which can be used to change an account's ERC20 allowance (see {IERC20-allowance}) by
//  * presenting a message signed by the account. By not relying on {IERC20-approve}, the token holder account doesn't
//  * need to send a transaction, and thus is not required to hold Ether at all.
//  */
// interface IERC20Permit {
//     /**
//      * @dev Sets `value` as the allowance of `spender` over ``owner``'s tokens,
//      * given ``owner``'s signed approval.
//      *
//      * IMPORTANT: The same issues {IERC20-approve} has related to transaction
//      * ordering also apply here.
//      *
//      * Emits an {Approval} event.
//      *
//      * Requirements:
//      *
//      * - `spender` cannot be the zero address.
//      * - `deadline` must be a timestamp in the future.
//      * - `v`, `r` and `s` must be a valid `secp256k1` signature from `owner`
//      * over the EIP712-formatted function arguments.
//      * - the signature must use ``owner``'s current nonce (see {nonces}).
//      *
//      * For more information on the signature format, see the
//      * https://eips.ethereum.org/EIPS/eip-2612#specification[relevant EIP
//      * section].
//      */
//     function permit(
//         address owner,
//         address spender,
//         uint256 value,
//         uint256 deadline,
//         uint8 v,
//         bytes32 r,
//         bytes32 s
//     ) external;

//     /**
//      * @dev Returns the current nonce for `owner`. This value must be
//      * included whenever a signature is generated for {permit}.
//      *
//      * Every successful call to {permit} increases ``owner``'s nonce by one. This
//      * prevents a signature from being used multiple times.
//      */
//     function nonces(address owner) external view returns (uint256);

//     /**
//      * @dev Returns the domain separator used in the encoding of the signature for {permit}, as defined by {EIP712}.
//      */
//     // solhint-disable-next-line func-name-mixedcase
//     function DOMAIN_SEPARATOR() external view returns (bytes32);
// }

// // lib/openzeppelin-contracts/contracts/token/ERC777/IERC777.sol

// // OpenZeppelin Contracts (last updated v4.9.0) (token/ERC777/IERC777.sol)

// /**
//  * @dev Interface of the ERC777Token standard as defined in the EIP.
//  *
//  * This contract uses the
//  * https://eips.ethereum.org/EIPS/eip-1820[ERC1820 registry standard] to let
//  * token holders and recipients react to token movements by using setting implementers
//  * for the associated interfaces in said registry. See {IERC1820Registry} and
//  * {ERC1820Implementer}.
//  */
// interface IERC777 {
//     /**
//      * @dev Emitted when `amount` tokens are created by `operator` and assigned to `to`.
//      *
//      * Note that some additional user `data` and `operatorData` can be logged in the event.
//      */
//     event Minted(address indexed operator, address indexed to, uint256 amount, bytes data, bytes operatorData);

//     /**
//      * @dev Emitted when `operator` destroys `amount` tokens from `account`.
//      *
//      * Note that some additional user `data` and `operatorData` can be logged in the event.
//      */
//     event Burned(address indexed operator, address indexed from, uint256 amount, bytes data, bytes operatorData);

//     /**
//      * @dev Emitted when `operator` is made operator for `tokenHolder`.
//      */
//     event AuthorizedOperator(address indexed operator, address indexed tokenHolder);

//     /**
//      * @dev Emitted when `operator` is revoked its operator status for `tokenHolder`.
//      */
//     event RevokedOperator(address indexed operator, address indexed tokenHolder);

//     /**
//      * @dev Returns the name of the token.
//      */
//     function name() external view returns (string memory);

//     /**
//      * @dev Returns the symbol of the token, usually a shorter version of the
//      * name.
//      */
//     function symbol() external view returns (string memory);

//     /**
//      * @dev Returns the smallest part of the token that is not divisible. This
//      * means all token operations (creation, movement and destruction) must have
//      * amounts that are a multiple of this number.
//      *
//      * For most token contracts, this value will equal 1.
//      */
//     function granularity() external view returns (uint256);

//     /**
//      * @dev Returns the amount of tokens in existence.
//      */
//     function totalSupply() external view returns (uint256);

//     /**
//      * @dev Returns the amount of tokens owned by an account (`owner`).
//      */
//     function balanceOf(address owner) external view returns (uint256);

//     /**
//      * @dev Moves `amount` tokens from the caller's account to `recipient`.
//      *
//      * If send or receive hooks are registered for the caller and `recipient`,
//      * the corresponding functions will be called with `data` and empty
//      * `operatorData`. See {IERC777Sender} and {IERC777Recipient}.
//      *
//      * Emits a {Sent} event.
//      *
//      * Requirements
//      *
//      * - the caller must have at least `amount` tokens.
//      * - `recipient` cannot be the zero address.
//      * - if `recipient` is a contract, it must implement the {IERC777Recipient}
//      * interface.
//      */
//     function send(address recipient, uint256 amount, bytes calldata data) external;

//     /**
//      * @dev Destroys `amount` tokens from the caller's account, reducing the
//      * total supply.
//      *
//      * If a send hook is registered for the caller, the corresponding function
//      * will be called with `data` and empty `operatorData`. See {IERC777Sender}.
//      *
//      * Emits a {Burned} event.
//      *
//      * Requirements
//      *
//      * - the caller must have at least `amount` tokens.
//      */
//     function burn(uint256 amount, bytes calldata data) external;

//     /**
//      * @dev Returns true if an account is an operator of `tokenHolder`.
//      * Operators can send and burn tokens on behalf of their owners. All
//      * accounts are their own operator.
//      *
//      * See {operatorSend} and {operatorBurn}.
//      */
//     function isOperatorFor(address operator, address tokenHolder) external view returns (bool);

//     /**
//      * @dev Make an account an operator of the caller.
//      *
//      * See {isOperatorFor}.
//      *
//      * Emits an {AuthorizedOperator} event.
//      *
//      * Requirements
//      *
//      * - `operator` cannot be calling address.
//      */
//     function authorizeOperator(address operator) external;

//     /**
//      * @dev Revoke an account's operator status for the caller.
//      *
//      * See {isOperatorFor} and {defaultOperators}.
//      *
//      * Emits a {RevokedOperator} event.
//      *
//      * Requirements
//      *
//      * - `operator` cannot be calling address.
//      */
//     function revokeOperator(address operator) external;

//     /**
//      * @dev Returns the list of default operators. These accounts are operators
//      * for all token holders, even if {authorizeOperator} was never called on
//      * them.
//      *
//      * This list is immutable, but individual holders may revoke these via
//      * {revokeOperator}, in which case {isOperatorFor} will return false.
//      */
//     function defaultOperators() external view returns (address[] memory);

//     /**
//      * @dev Moves `amount` tokens from `sender` to `recipient`. The caller must
//      * be an operator of `sender`.
//      *
//      * If send or receive hooks are registered for `sender` and `recipient`,
//      * the corresponding functions will be called with `data` and
//      * `operatorData`. See {IERC777Sender} and {IERC777Recipient}.
//      *
//      * Emits a {Sent} event.
//      *
//      * Requirements
//      *
//      * - `sender` cannot be the zero address.
//      * - `sender` must have at least `amount` tokens.
//      * - the caller must be an operator for `sender`.
//      * - `recipient` cannot be the zero address.
//      * - if `recipient` is a contract, it must implement the {IERC777Recipient}
//      * interface.
//      */
//     function operatorSend(
//         address sender,
//         address recipient,
//         uint256 amount,
//         bytes calldata data,
//         bytes calldata operatorData
//     ) external;

//     /**
//      * @dev Destroys `amount` tokens from `account`, reducing the total supply.
//      * The caller must be an operator of `account`.
//      *
//      * If a send hook is registered for `account`, the corresponding function
//      * will be called with `data` and `operatorData`. See {IERC777Sender}.
//      *
//      * Emits a {Burned} event.
//      *
//      * Requirements
//      *
//      * - `account` cannot be the zero address.
//      * - `account` must have at least `amount` tokens.
//      * - the caller must be an operator for `account`.
//      */
//     function operatorBurn(address account, uint256 amount, bytes calldata data, bytes calldata operatorData) external;

//     event Sent(
//         address indexed operator,
//         address indexed from,
//         address indexed to,
//         uint256 amount,
//         bytes data,
//         bytes operatorData
//     );
// }

// // lib/openzeppelin-contracts/contracts/utils/Address.sol

// // OpenZeppelin Contracts (last updated v4.9.0) (utils/Address.sol)

// /**
//  * @dev Collection of functions related to the address type
//  */
// library Address {
//     /**
//      * @dev Returns true if `account` is a contract.
//      *
//      * [IMPORTANT]
//      * ====
//      * It is unsafe to assume that an address for which this function returns
//      * false is an externally-owned account (EOA) and not a contract.
//      *
//      * Among others, `isContract` will return false for the following
//      * types of addresses:
//      *
//      *  - an externally-owned account
//      *  - a contract in construction
//      *  - an address where a contract will be created
//      *  - an address where a contract lived, but was destroyed
//      *
//      * Furthermore, `isContract` will also return true if the target contract within
//      * the same transaction is already scheduled for destruction by `SELFDESTRUCT`,
//      * which only has an effect at the end of a transaction.
//      * ====
//      *
//      * [IMPORTANT]
//      * ====
//      * You shouldn't rely on `isContract` to protect against flash loan attacks!
//      *
//      * Preventing calls from contracts is highly discouraged. It breaks composability, breaks support for smart wallets
//      * like Gnosis Safe, and does not provide security since it can be circumvented by calling from a contract
//      * constructor.
//      * ====
//      */
//     function isContract(address account) internal view returns (bool) {
//         // This method relies on extcodesize/address.code.length, which returns 0
//         // for contracts in construction, since the code is only stored at the end
//         // of the constructor execution.

//         return account.code.length > 0;
//     }

//     /**
//      * @dev Replacement for Solidity's `transfer`: sends `amount` wei to
//      * `recipient`, forwarding all available gas and reverting on errors.
//      *
//      * https://eips.ethereum.org/EIPS/eip-1884[EIP1884] increases the gas cost
//      * of certain opcodes, possibly making contracts go over the 2300 gas limit
//      * imposed by `transfer`, making them unable to receive funds via
//      * `transfer`. {sendValue} removes this limitation.
//      *
//      * https://consensys.net/diligence/blog/2019/09/stop-using-soliditys-transfer-now/[Learn more].
//      *
//      * IMPORTANT: because control is transferred to `recipient`, care must be
//      * taken to not create reentrancy vulnerabilities. Consider using
//      * {ReentrancyGuard} or the
//      * https://solidity.readthedocs.io/en/v0.8.0/security-considerations.html#use-the-checks-effects-interactions-pattern[checks-effects-interactions pattern].
//      */
//     function sendValue(address payable recipient, uint256 amount) internal {
//         require(address(this).balance >= amount, "Address: insufficient balance");

//         (bool success, ) = recipient.call{value: amount}("");
//         require(success, "Address: unable to send value, recipient may have reverted");
//     }

//     /**
//      * @dev Performs a Solidity function call using a low level `call`. A
//      * plain `call` is an unsafe replacement for a function call: use this
//      * function instead.
//      *
//      * If `target` reverts with a revert reason, it is bubbled up by this
//      * function (like regular Solidity function calls).
//      *
//      * Returns the raw returned data. To convert to the expected return value,
//      * use https://solidity.readthedocs.io/en/latest/units-and-global-variables.html?highlight=abi.decode#abi-encoding-and-decoding-functions[`abi.decode`].
//      *
//      * Requirements:
//      *
//      * - `target` must be a contract.
//      * - calling `target` with `data` must not revert.
//      *
//      * _Available since v3.1._
//      */
//     function functionCall(address target, bytes memory data) internal returns (bytes memory) {
//         return functionCallWithValue(target, data, 0, "Address: low-level call failed");
//     }

//     /**
//      * @dev Same as {xref-Address-functionCall-address-bytes-}[`functionCall`], but with
//      * `errorMessage` as a fallback revert reason when `target` reverts.
//      *
//      * _Available since v3.1._
//      */
//     function functionCall(
//         address target,
//         bytes memory data,
//         string memory errorMessage
//     ) internal returns (bytes memory) {
//         return functionCallWithValue(target, data, 0, errorMessage);
//     }

//     /**
//      * @dev Same as {xref-Address-functionCall-address-bytes-}[`functionCall`],
//      * but also transferring `value` wei to `target`.
//      *
//      * Requirements:
//      *
//      * - the calling contract must have an ETH balance of at least `value`.
//      * - the called Solidity function must be `payable`.
//      *
//      * _Available since v3.1._
//      */
//     function functionCallWithValue(address target, bytes memory data, uint256 value) internal returns (bytes memory) {
//         return functionCallWithValue(target, data, value, "Address: low-level call with value failed");
//     }

//     /**
//      * @dev Same as {xref-Address-functionCallWithValue-address-bytes-uint256-}[`functionCallWithValue`], but
//      * with `errorMessage` as a fallback revert reason when `target` reverts.
//      *
//      * _Available since v3.1._
//      */
//     function functionCallWithValue(
//         address target,
//         bytes memory data,
//         uint256 value,
//         string memory errorMessage
//     ) internal returns (bytes memory) {
//         require(address(this).balance >= value, "Address: insufficient balance for call");
//         (bool success, bytes memory returndata) = target.call{value: value}(data);
//         return verifyCallResultFromTarget(target, success, returndata, errorMessage);
//     }

//     /**
//      * @dev Same as {xref-Address-functionCall-address-bytes-}[`functionCall`],
//      * but performing a static call.
//      *
//      * _Available since v3.3._
//      */
//     function functionStaticCall(address target, bytes memory data) internal view returns (bytes memory) {
//         return functionStaticCall(target, data, "Address: low-level static call failed");
//     }

//     /**
//      * @dev Same as {xref-Address-functionCall-address-bytes-string-}[`functionCall`],
//      * but performing a static call.
//      *
//      * _Available since v3.3._
//      */
//     function functionStaticCall(
//         address target,
//         bytes memory data,
//         string memory errorMessage
//     ) internal view returns (bytes memory) {
//         (bool success, bytes memory returndata) = target.staticcall(data);
//         return verifyCallResultFromTarget(target, success, returndata, errorMessage);
//     }

//     /**
//      * @dev Same as {xref-Address-functionCall-address-bytes-}[`functionCall`],
//      * but performing a delegate call.
//      *
//      * _Available since v3.4._
//      */
//     function functionDelegateCall(address target, bytes memory data) internal returns (bytes memory) {
//         return functionDelegateCall(target, data, "Address: low-level delegate call failed");
//     }

//     /**
//      * @dev Same as {xref-Address-functionCall-address-bytes-string-}[`functionCall`],
//      * but performing a delegate call.
//      *
//      * _Available since v3.4._
//      */
//     function functionDelegateCall(
//         address target,
//         bytes memory data,
//         string memory errorMessage
//     ) internal returns (bytes memory) {
//         (bool success, bytes memory returndata) = target.delegatecall(data);
//         return verifyCallResultFromTarget(target, success, returndata, errorMessage);
//     }

//     /**
//      * @dev Tool to verify that a low level call to smart-contract was successful, and revert (either by bubbling
//      * the revert reason or using the provided one) in case of unsuccessful call or if target was not a contract.
//      *
//      * _Available since v4.8._
//      */
//     function verifyCallResultFromTarget(
//         address target,
//         bool success,
//         bytes memory returndata,
//         string memory errorMessage
//     ) internal view returns (bytes memory) {
//         if (success) {
//             if (returndata.length == 0) {
//                 // only check isContract if the call was successful and the return data is empty
//                 // otherwise we already know that it was a contract
//                 require(isContract(target), "Address: call to non-contract");
//             }
//             return returndata;
//         } else {
//             _revert(returndata, errorMessage);
//         }
//     }

//     /**
//      * @dev Tool to verify that a low level call was successful, and revert if it wasn't, either by bubbling the
//      * revert reason or using the provided one.
//      *
//      * _Available since v4.3._
//      */
//     function verifyCallResult(
//         bool success,
//         bytes memory returndata,
//         string memory errorMessage
//     ) internal pure returns (bytes memory) {
//         if (success) {
//             return returndata;
//         } else {
//             _revert(returndata, errorMessage);
//         }
//     }

//     function _revert(bytes memory returndata, string memory errorMessage) private pure {
//         // Look for revert reason and bubble it up if present
//         if (returndata.length > 0) {
//             // The easiest way to bubble the revert reason is using memory via assembly
//             /// @solidity memory-safe-assembly
//             assembly {
//                 let returndata_size := mload(returndata)
//                 revert(add(32, returndata), returndata_size)
//             }
//         } else {
//             revert(errorMessage);
//         }
//     }
// }

// // lib/openzeppelin-contracts/contracts/utils/Context.sol

// // OpenZeppelin Contracts v4.4.1 (utils/Context.sol)

// /**
//  * @dev Provides information about the current execution context, including the
//  * sender of the transaction and its data. While these are generally available
//  * via msg.sender and msg.data, they should not be accessed in such a direct
//  * manner, since when dealing with meta-transactions the account sending and
//  * paying for execution may not be the actual sender (as far as an application
//  * is concerned).
//  *
//  * This contract is only required for intermediate, library-like contracts.
//  */
// abstract contract Context {
//     function _msgSender() internal view virtual returns (address) {
//         return msg.sender;
//     }

//     function _msgData() internal view virtual returns (bytes calldata) {
//         return msg.data;
//     }
// }

// // lib/openzeppelin-contracts/contracts/utils/StorageSlot.sol

// // OpenZeppelin Contracts (last updated v4.9.0) (utils/StorageSlot.sol)
// // This file was procedurally generated from scripts/generate/templates/StorageSlot.js.

// /**
//  * @dev Library for reading and writing primitive types to specific storage slots.
//  *
//  * Storage slots are often used to avoid storage conflict when dealing with upgradeable contracts.
//  * This library helps with reading and writing to such slots without the need for inline assembly.
//  *
//  * The functions in this library return Slot structs that contain a `value` member that can be used to read or write.
//  *
//  * Example usage to set ERC1967 implementation slot:
//  * ```solidity
//  * contract ERC1967 {
//  *     bytes32 internal constant _IMPLEMENTATION_SLOT = 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc;
//  *
//  *     function _getImplementation() internal view returns (address) {
//  *         return StorageSlot.getAddressSlot(_IMPLEMENTATION_SLOT).value;
//  *     }
//  *
//  *     function _setImplementation(address newImplementation) internal {
//  *         require(Address.isContract(newImplementation), "ERC1967: new implementation is not a contract");
//  *         StorageSlot.getAddressSlot(_IMPLEMENTATION_SLOT).value = newImplementation;
//  *     }
//  * }
//  * ```
//  *
//  * _Available since v4.1 for `address`, `bool`, `bytes32`, `uint256`._
//  * _Available since v4.9 for `string`, `bytes`._
//  */
// library StorageSlot {
//     struct AddressSlot {
//         address value;
//     }

//     struct BooleanSlot {
//         bool value;
//     }

//     struct Bytes32Slot {
//         bytes32 value;
//     }

//     struct Uint256Slot {
//         uint256 value;
//     }

//     struct StringSlot {
//         string value;
//     }

//     struct BytesSlot {
//         bytes value;
//     }

//     /**
//      * @dev Returns an `AddressSlot` with member `value` located at `slot`.
//      */
//     function getAddressSlot(bytes32 slot) internal pure returns (AddressSlot storage r) {
//         /// @solidity memory-safe-assembly
//         assembly {
//             r.slot := slot
//         }
//     }

//     /**
//      * @dev Returns an `BooleanSlot` with member `value` located at `slot`.
//      */
//     function getBooleanSlot(bytes32 slot) internal pure returns (BooleanSlot storage r) {
//         /// @solidity memory-safe-assembly
//         assembly {
//             r.slot := slot
//         }
//     }

//     /**
//      * @dev Returns an `Bytes32Slot` with member `value` located at `slot`.
//      */
//     function getBytes32Slot(bytes32 slot) internal pure returns (Bytes32Slot storage r) {
//         /// @solidity memory-safe-assembly
//         assembly {
//             r.slot := slot
//         }
//     }

//     /**
//      * @dev Returns an `Uint256Slot` with member `value` located at `slot`.
//      */
//     function getUint256Slot(bytes32 slot) internal pure returns (Uint256Slot storage r) {
//         /// @solidity memory-safe-assembly
//         assembly {
//             r.slot := slot
//         }
//     }

//     /**
//      * @dev Returns an `StringSlot` with member `value` located at `slot`.
//      */
//     function getStringSlot(bytes32 slot) internal pure returns (StringSlot storage r) {
//         /// @solidity memory-safe-assembly
//         assembly {
//             r.slot := slot
//         }
//     }

//     /**
//      * @dev Returns an `StringSlot` representation of the string storage pointer `store`.
//      */
//     function getStringSlot(string storage store) internal pure returns (StringSlot storage r) {
//         /// @solidity memory-safe-assembly
//         assembly {
//             r.slot := store.slot
//         }
//     }

//     /**
//      * @dev Returns an `BytesSlot` with member `value` located at `slot`.
//      */
//     function getBytesSlot(bytes32 slot) internal pure returns (BytesSlot storage r) {
//         /// @solidity memory-safe-assembly
//         assembly {
//             r.slot := slot
//         }
//     }

//     /**
//      * @dev Returns an `BytesSlot` representation of the bytes storage pointer `store`.
//      */
//     function getBytesSlot(bytes storage store) internal pure returns (BytesSlot storage r) {
//         /// @solidity memory-safe-assembly
//         assembly {
//             r.slot := store.slot
//         }
//     }
// }

// // lib/openzeppelin-contracts/contracts/utils/introspection/IERC165.sol

// // OpenZeppelin Contracts v4.4.1 (utils/introspection/IERC165.sol)

// /**
//  * @dev Interface of the ERC165 standard, as defined in the
//  * https://eips.ethereum.org/EIPS/eip-165[EIP].
//  *
//  * Implementers can declare support of contract interfaces, which can then be
//  * queried by others ({ERC165Checker}).
//  *
//  * For an implementation, see {ERC165}.
//  */
// interface IERC165 {
//     /**
//      * @dev Returns true if this contract implements the interface defined by
//      * `interfaceId`. See the corresponding
//      * https://eips.ethereum.org/EIPS/eip-165#how-interfaces-are-identified[EIP section]
//      * to learn more about how these ids are created.
//      *
//      * This function call must use less than 30 000 gas.
//      */
//     function supportsInterface(bytes4 interfaceId) external view returns (bool);
// }

// // lib/openzeppelin-contracts/contracts/utils/math/Math.sol

// // OpenZeppelin Contracts (last updated v4.9.0) (utils/math/Math.sol)

// /**
//  * @dev Standard math utilities missing in the Solidity language.
//  */
// library Math {
//     enum Rounding {
//         Down, // Toward negative infinity
//         Up, // Toward infinity
//         Zero // Toward zero
//     }

//     /**
//      * @dev Returns the largest of two numbers.
//      */
//     function max(uint256 a, uint256 b) internal pure returns (uint256) {
//         return a > b ? a : b;
//     }

//     /**
//      * @dev Returns the smallest of two numbers.
//      */
//     function min(uint256 a, uint256 b) internal pure returns (uint256) {
//         return a < b ? a : b;
//     }

//     /**
//      * @dev Returns the average of two numbers. The result is rounded towards
//      * zero.
//      */
//     function average(uint256 a, uint256 b) internal pure returns (uint256) {
//         // (a + b) / 2 can overflow.
//         return (a & b) + (a ^ b) / 2;
//     }

//     /**
//      * @dev Returns the ceiling of the division of two numbers.
//      *
//      * This differs from standard division with `/` in that it rounds up instead
//      * of rounding down.
//      */
//     function ceilDiv(uint256 a, uint256 b) internal pure returns (uint256) {
//         // (a + b - 1) / b can overflow on addition, so we distribute.
//         return a == 0 ? 0 : (a - 1) / b + 1;
//     }

//     /**
//      * @notice Calculates floor(x * y / denominator) with full precision. Throws if result overflows a uint256 or denominator == 0
//      * @dev Original credit to Remco Bloemen under MIT license (https://xn--2-umb.com/21/muldiv)
//      * with further edits by Uniswap Labs also under MIT license.
//      */
//     function mulDiv(uint256 x, uint256 y, uint256 denominator) internal pure returns (uint256 result) {
//         unchecked {
//             // 512-bit multiply [prod1 prod0] = x * y. Compute the product mod 2^256 and mod 2^256 - 1, then use
//             // use the Chinese Remainder Theorem to reconstruct the 512 bit result. The result is stored in two 256
//             // variables such that product = prod1 * 2^256 + prod0.
//             uint256 prod0; // Least significant 256 bits of the product
//             uint256 prod1; // Most significant 256 bits of the product
//             assembly {
//                 let mm := mulmod(x, y, not(0))
//                 prod0 := mul(x, y)
//                 prod1 := sub(sub(mm, prod0), lt(mm, prod0))
//             }

//             // Handle non-overflow cases, 256 by 256 division.
//             if (prod1 == 0) {
//                 // Solidity will revert if denominator == 0, unlike the div opcode on its own.
//                 // The surrounding unchecked block does not change this fact.
//                 // See https://docs.soliditylang.org/en/latest/control-structures.html#checked-or-unchecked-arithmetic.
//                 return prod0 / denominator;
//             }

//             // Make sure the result is less than 2^256. Also prevents denominator == 0.
//             require(denominator > prod1, "Math: mulDiv overflow");

//             ///////////////////////////////////////////////
//             // 512 by 256 division.
//             ///////////////////////////////////////////////

//             // Make division exact by subtracting the remainder from [prod1 prod0].
//             uint256 remainder;
//             assembly {
//                 // Compute remainder using mulmod.
//                 remainder := mulmod(x, y, denominator)

//                 // Subtract 256 bit number from 512 bit number.
//                 prod1 := sub(prod1, gt(remainder, prod0))
//                 prod0 := sub(prod0, remainder)
//             }

//             // Factor powers of two out of denominator and compute largest power of two divisor of denominator. Always >= 1.
//             // See https://cs.stackexchange.com/q/138556/92363.

//             // Does not overflow because the denominator cannot be zero at this stage in the function.
//             uint256 twos = denominator & (~denominator + 1);
//             assembly {
//                 // Divide denominator by twos.
//                 denominator := div(denominator, twos)

//                 // Divide [prod1 prod0] by twos.
//                 prod0 := div(prod0, twos)

//                 // Flip twos such that it is 2^256 / twos. If twos is zero, then it becomes one.
//                 twos := add(div(sub(0, twos), twos), 1)
//             }

//             // Shift in bits from prod1 into prod0.
//             prod0 |= prod1 * twos;

//             // Invert denominator mod 2^256. Now that denominator is an odd number, it has an inverse modulo 2^256 such
//             // that denominator * inv = 1 mod 2^256. Compute the inverse by starting with a seed that is correct for
//             // four bits. That is, denominator * inv = 1 mod 2^4.
//             uint256 inverse = (3 * denominator) ^ 2;

//             // Use the Newton-Raphson iteration to improve the precision. Thanks to Hensel's lifting lemma, this also works
//             // in modular arithmetic, doubling the correct bits in each step.
//             inverse *= 2 - denominator * inverse; // inverse mod 2^8
//             inverse *= 2 - denominator * inverse; // inverse mod 2^16
//             inverse *= 2 - denominator * inverse; // inverse mod 2^32
//             inverse *= 2 - denominator * inverse; // inverse mod 2^64
//             inverse *= 2 - denominator * inverse; // inverse mod 2^128
//             inverse *= 2 - denominator * inverse; // inverse mod 2^256

//             // Because the division is now exact we can divide by multiplying with the modular inverse of denominator.
//             // This will give us the correct result modulo 2^256. Since the preconditions guarantee that the outcome is
//             // less than 2^256, this is the final result. We don't need to compute the high bits of the result and prod1
//             // is no longer required.
//             result = prod0 * inverse;
//             return result;
//         }
//     }

//     /**
//      * @notice Calculates x * y / denominator with full precision, following the selected rounding direction.
//      */
//     function mulDiv(uint256 x, uint256 y, uint256 denominator, Rounding rounding) internal pure returns (uint256) {
//         uint256 result = mulDiv(x, y, denominator);
//         if (rounding == Rounding.Up && mulmod(x, y, denominator) > 0) {
//             result += 1;
//         }
//         return result;
//     }

//     /**
//      * @dev Returns the square root of a number. If the number is not a perfect square, the value is rounded down.
//      *
//      * Inspired by Henry S. Warren, Jr.'s "Hacker's Delight" (Chapter 11).
//      */
//     function sqrt(uint256 a) internal pure returns (uint256) {
//         if (a == 0) {
//             return 0;
//         }

//         // For our first guess, we get the biggest power of 2 which is smaller than the square root of the target.
//         //
//         // We know that the "msb" (most significant bit) of our target number `a` is a power of 2 such that we have
//         // `msb(a) <= a < 2*msb(a)`. This value can be written `msb(a)=2**k` with `k=log2(a)`.
//         //
//         // This can be rewritten `2**log2(a) <= a < 2**(log2(a) + 1)`
//         // → `sqrt(2**k) <= sqrt(a) < sqrt(2**(k+1))`
//         // → `2**(k/2) <= sqrt(a) < 2**((k+1)/2) <= 2**(k/2 + 1)`
//         //
//         // Consequently, `2**(log2(a) / 2)` is a good first approximation of `sqrt(a)` with at least 1 correct bit.
//         uint256 result = 1 << (log2(a) >> 1);

//         // At this point `result` is an estimation with one bit of precision. We know the true value is a uint128,
//         // since it is the square root of a uint256. Newton's method converges quadratically (precision doubles at
//         // every iteration). We thus need at most 7 iteration to turn our partial result with one bit of precision
//         // into the expected uint128 result.
//         unchecked {
//             result = (result + a / result) >> 1;
//             result = (result + a / result) >> 1;
//             result = (result + a / result) >> 1;
//             result = (result + a / result) >> 1;
//             result = (result + a / result) >> 1;
//             result = (result + a / result) >> 1;
//             result = (result + a / result) >> 1;
//             return min(result, a / result);
//         }
//     }

//     /**
//      * @notice Calculates sqrt(a), following the selected rounding direction.
//      */
//     function sqrt(uint256 a, Rounding rounding) internal pure returns (uint256) {
//         unchecked {
//             uint256 result = sqrt(a);
//             return result + (rounding == Rounding.Up && result * result < a ? 1 : 0);
//         }
//     }

//     /**
//      * @dev Return the log in base 2, rounded down, of a positive value.
//      * Returns 0 if given 0.
//      */
//     function log2(uint256 value) internal pure returns (uint256) {
//         uint256 result = 0;
//         unchecked {
//             if (value >> 128 > 0) {
//                 value >>= 128;
//                 result += 128;
//             }
//             if (value >> 64 > 0) {
//                 value >>= 64;
//                 result += 64;
//             }
//             if (value >> 32 > 0) {
//                 value >>= 32;
//                 result += 32;
//             }
//             if (value >> 16 > 0) {
//                 value >>= 16;
//                 result += 16;
//             }
//             if (value >> 8 > 0) {
//                 value >>= 8;
//                 result += 8;
//             }
//             if (value >> 4 > 0) {
//                 value >>= 4;
//                 result += 4;
//             }
//             if (value >> 2 > 0) {
//                 value >>= 2;
//                 result += 2;
//             }
//             if (value >> 1 > 0) {
//                 result += 1;
//             }
//         }
//         return result;
//     }

//     /**
//      * @dev Return the log in base 2, following the selected rounding direction, of a positive value.
//      * Returns 0 if given 0.
//      */
//     function log2(uint256 value, Rounding rounding) internal pure returns (uint256) {
//         unchecked {
//             uint256 result = log2(value);
//             return result + (rounding == Rounding.Up && 1 << result < value ? 1 : 0);
//         }
//     }

//     /**
//      * @dev Return the log in base 10, rounded down, of a positive value.
//      * Returns 0 if given 0.
//      */
//     function log10(uint256 value) internal pure returns (uint256) {
//         uint256 result = 0;
//         unchecked {
//             if (value >= 10 ** 64) {
//                 value /= 10 ** 64;
//                 result += 64;
//             }
//             if (value >= 10 ** 32) {
//                 value /= 10 ** 32;
//                 result += 32;
//             }
//             if (value >= 10 ** 16) {
//                 value /= 10 ** 16;
//                 result += 16;
//             }
//             if (value >= 10 ** 8) {
//                 value /= 10 ** 8;
//                 result += 8;
//             }
//             if (value >= 10 ** 4) {
//                 value /= 10 ** 4;
//                 result += 4;
//             }
//             if (value >= 10 ** 2) {
//                 value /= 10 ** 2;
//                 result += 2;
//             }
//             if (value >= 10 ** 1) {
//                 result += 1;
//             }
//         }
//         return result;
//     }

//     /**
//      * @dev Return the log in base 10, following the selected rounding direction, of a positive value.
//      * Returns 0 if given 0.
//      */
//     function log10(uint256 value, Rounding rounding) internal pure returns (uint256) {
//         unchecked {
//             uint256 result = log10(value);
//             return result + (rounding == Rounding.Up && 10 ** result < value ? 1 : 0);
//         }
//     }

//     /**
//      * @dev Return the log in base 256, rounded down, of a positive value.
//      * Returns 0 if given 0.
//      *
//      * Adding one to the result gives the number of pairs of hex symbols needed to represent `value` as a hex string.
//      */
//     function log256(uint256 value) internal pure returns (uint256) {
//         uint256 result = 0;
//         unchecked {
//             if (value >> 128 > 0) {
//                 value >>= 128;
//                 result += 16;
//             }
//             if (value >> 64 > 0) {
//                 value >>= 64;
//                 result += 8;
//             }
//             if (value >> 32 > 0) {
//                 value >>= 32;
//                 result += 4;
//             }
//             if (value >> 16 > 0) {
//                 value >>= 16;
//                 result += 2;
//             }
//             if (value >> 8 > 0) {
//                 result += 1;
//             }
//         }
//         return result;
//     }

//     /**
//      * @dev Return the log in base 256, following the selected rounding direction, of a positive value.
//      * Returns 0 if given 0.
//      */
//     function log256(uint256 value, Rounding rounding) internal pure returns (uint256) {
//         unchecked {
//             uint256 result = log256(value);
//             return result + (rounding == Rounding.Up && 1 << (result << 3) < value ? 1 : 0);
//         }
//     }
// }

// // lib/openzeppelin-contracts/contracts/utils/math/SignedMath.sol

// // OpenZeppelin Contracts (last updated v4.8.0) (utils/math/SignedMath.sol)

// /**
//  * @dev Standard signed math utilities missing in the Solidity language.
//  */
// library SignedMath {
//     /**
//      * @dev Returns the largest of two signed numbers.
//      */
//     function max(int256 a, int256 b) internal pure returns (int256) {
//         return a > b ? a : b;
//     }

//     /**
//      * @dev Returns the smallest of two signed numbers.
//      */
//     function min(int256 a, int256 b) internal pure returns (int256) {
//         return a < b ? a : b;
//     }

//     /**
//      * @dev Returns the average of two signed numbers without overflow.
//      * The result is rounded towards zero.
//      */
//     function average(int256 a, int256 b) internal pure returns (int256) {
//         // Formula from the book "Hacker's Delight"
//         int256 x = (a & b) + ((a ^ b) >> 1);
//         return x + (int256(uint256(x) >> 255) & (a ^ b));
//     }

//     /**
//      * @dev Returns the absolute unsigned value of a signed value.
//      */
//     function abs(int256 n) internal pure returns (uint256) {
//         unchecked {
//             // must be unchecked in order to support `n = type(int256).min`
//             return uint256(n >= 0 ? n : -n);
//         }
//     }
// }

// // lib/openzeppelin-contracts-upgradeable/contracts/access/IAccessControlUpgradeable.sol

// // OpenZeppelin Contracts v4.4.1 (access/IAccessControl.sol)

// /**
//  * @dev External interface of AccessControl declared to support ERC165 detection.
//  */
// interface IAccessControlUpgradeable {
//     /**
//      * @dev Emitted when `newAdminRole` is set as ``role``'s admin role, replacing `previousAdminRole`
//      *
//      * `DEFAULT_ADMIN_ROLE` is the starting admin for all roles, despite
//      * {RoleAdminChanged} not being emitted signaling this.
//      *
//      * _Available since v3.1._
//      */
//     event RoleAdminChanged(bytes32 indexed role, bytes32 indexed previousAdminRole, bytes32 indexed newAdminRole);

//     /**
//      * @dev Emitted when `account` is granted `role`.
//      *
//      * `sender` is the account that originated the contract call, an admin role
//      * bearer except when using {AccessControl-_setupRole}.
//      */
//     event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender);

//     /**
//      * @dev Emitted when `account` is revoked `role`.
//      *
//      * `sender` is the account that originated the contract call:
//      *   - if using `revokeRole`, it is the admin role bearer
//      *   - if using `renounceRole`, it is the role bearer (i.e. `account`)
//      */
//     event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender);

//     /**
//      * @dev Returns `true` if `account` has been granted `role`.
//      */
//     function hasRole(bytes32 role, address account) external view returns (bool);

//     /**
//      * @dev Returns the admin role that controls `role`. See {grantRole} and
//      * {revokeRole}.
//      *
//      * To change a role's admin, use {AccessControl-_setRoleAdmin}.
//      */
//     function getRoleAdmin(bytes32 role) external view returns (bytes32);

//     /**
//      * @dev Grants `role` to `account`.
//      *
//      * If `account` had not been already granted `role`, emits a {RoleGranted}
//      * event.
//      *
//      * Requirements:
//      *
//      * - the caller must have ``role``'s admin role.
//      */
//     function grantRole(bytes32 role, address account) external;

//     /**
//      * @dev Revokes `role` from `account`.
//      *
//      * If `account` had been granted `role`, emits a {RoleRevoked} event.
//      *
//      * Requirements:
//      *
//      * - the caller must have ``role``'s admin role.
//      */
//     function revokeRole(bytes32 role, address account) external;

//     /**
//      * @dev Revokes `role` from the calling account.
//      *
//      * Roles are often managed via {grantRole} and {revokeRole}: this function's
//      * purpose is to provide a mechanism for accounts to lose their privileges
//      * if they are compromised (such as when a trusted device is misplaced).
//      *
//      * If the calling account had been granted `role`, emits a {RoleRevoked}
//      * event.
//      *
//      * Requirements:
//      *
//      * - the caller must be `account`.
//      */
//     function renounceRole(bytes32 role, address account) external;
// }

// // lib/openzeppelin-contracts-upgradeable/contracts/proxy/ClonesUpgradeable.sol

// // OpenZeppelin Contracts (last updated v4.9.0) (proxy/Clones.sol)

// /**
//  * @dev https://eips.ethereum.org/EIPS/eip-1167[EIP 1167] is a standard for
//  * deploying minimal proxy contracts, also known as "clones".
//  *
//  * > To simply and cheaply clone contract functionality in an immutable way, this standard specifies
//  * > a minimal bytecode implementation that delegates all calls to a known, fixed address.
//  *
//  * The library includes functions to deploy a proxy using either `create` (traditional deployment) or `create2`
//  * (salted deterministic deployment). It also includes functions to predict the addresses of clones deployed using the
//  * deterministic method.
//  *
//  * _Available since v3.4._
//  */
// library ClonesUpgradeable {
//     /**
//      * @dev Deploys and returns the address of a clone that mimics the behaviour of `implementation`.
//      *
//      * This function uses the create opcode, which should never revert.
//      */
//     function clone(address implementation) internal returns (address instance) {
//         /// @solidity memory-safe-assembly
//         assembly {
//             // Cleans the upper 96 bits of the `implementation` word, then packs the first 3 bytes
//             // of the `implementation` address with the bytecode before the address.
//             mstore(0x00, or(shr(0xe8, shl(0x60, implementation)), 0x3d602d80600a3d3981f3363d3d373d3d3d363d73000000))
//             // Packs the remaining 17 bytes of `implementation` with the bytecode after the address.
//             mstore(0x20, or(shl(0x78, implementation), 0x5af43d82803e903d91602b57fd5bf3))
//             instance := create(0, 0x09, 0x37)
//         }
//         require(instance != address(0), "ERC1167: create failed");
//     }

//     /**
//      * @dev Deploys and returns the address of a clone that mimics the behaviour of `implementation`.
//      *
//      * This function uses the create2 opcode and a `salt` to deterministically deploy
//      * the clone. Using the same `implementation` and `salt` multiple time will revert, since
//      * the clones cannot be deployed twice at the same address.
//      */
//     function cloneDeterministic(address implementation, bytes32 salt) internal returns (address instance) {
//         /// @solidity memory-safe-assembly
//         assembly {
//             // Cleans the upper 96 bits of the `implementation` word, then packs the first 3 bytes
//             // of the `implementation` address with the bytecode before the address.
//             mstore(0x00, or(shr(0xe8, shl(0x60, implementation)), 0x3d602d80600a3d3981f3363d3d373d3d3d363d73000000))
//             // Packs the remaining 17 bytes of `implementation` with the bytecode after the address.
//             mstore(0x20, or(shl(0x78, implementation), 0x5af43d82803e903d91602b57fd5bf3))
//             instance := create2(0, 0x09, 0x37, salt)
//         }
//         require(instance != address(0), "ERC1167: create2 failed");
//     }

//     /**
//      * @dev Computes the address of a clone deployed using {Clones-cloneDeterministic}.
//      */
//     function predictDeterministicAddress(
//         address implementation,
//         bytes32 salt,
//         address deployer
//     ) internal pure returns (address predicted) {
//         /// @solidity memory-safe-assembly
//         assembly {
//             let ptr := mload(0x40)
//             mstore(add(ptr, 0x38), deployer)
//             mstore(add(ptr, 0x24), 0x5af43d82803e903d91602b57fd5bf3ff)
//             mstore(add(ptr, 0x14), implementation)
//             mstore(ptr, 0x3d602d80600a3d3981f3363d3d373d3d3d363d73)
//             mstore(add(ptr, 0x58), salt)
//             mstore(add(ptr, 0x78), keccak256(add(ptr, 0x0c), 0x37))
//             predicted := keccak256(add(ptr, 0x43), 0x55)
//         }
//     }

//     /**
//      * @dev Computes the address of a clone deployed using {Clones-cloneDeterministic}.
//      */
//     function predictDeterministicAddress(
//         address implementation,
//         bytes32 salt
//     ) internal view returns (address predicted) {
//         return predictDeterministicAddress(implementation, salt, address(this));
//     }
// }

// // lib/openzeppelin-contracts-upgradeable/contracts/utils/AddressUpgradeable.sol

// // OpenZeppelin Contracts (last updated v4.9.0) (utils/Address.sol)

// /**
//  * @dev Collection of functions related to the address type
//  */
// library AddressUpgradeable {
//     /**
//      * @dev Returns true if `account` is a contract.
//      *
//      * [IMPORTANT]
//      * ====
//      * It is unsafe to assume that an address for which this function returns
//      * false is an externally-owned account (EOA) and not a contract.
//      *
//      * Among others, `isContract` will return false for the following
//      * types of addresses:
//      *
//      *  - an externally-owned account
//      *  - a contract in construction
//      *  - an address where a contract will be created
//      *  - an address where a contract lived, but was destroyed
//      *
//      * Furthermore, `isContract` will also return true if the target contract within
//      * the same transaction is already scheduled for destruction by `SELFDESTRUCT`,
//      * which only has an effect at the end of a transaction.
//      * ====
//      *
//      * [IMPORTANT]
//      * ====
//      * You shouldn't rely on `isContract` to protect against flash loan attacks!
//      *
//      * Preventing calls from contracts is highly discouraged. It breaks composability, breaks support for smart wallets
//      * like Gnosis Safe, and does not provide security since it can be circumvented by calling from a contract
//      * constructor.
//      * ====
//      */
//     function isContract(address account) internal view returns (bool) {
//         // This method relies on extcodesize/address.code.length, which returns 0
//         // for contracts in construction, since the code is only stored at the end
//         // of the constructor execution.

//         return account.code.length > 0;
//     }

//     /**
//      * @dev Replacement for Solidity's `transfer`: sends `amount` wei to
//      * `recipient`, forwarding all available gas and reverting on errors.
//      *
//      * https://eips.ethereum.org/EIPS/eip-1884[EIP1884] increases the gas cost
//      * of certain opcodes, possibly making contracts go over the 2300 gas limit
//      * imposed by `transfer`, making them unable to receive funds via
//      * `transfer`. {sendValue} removes this limitation.
//      *
//      * https://consensys.net/diligence/blog/2019/09/stop-using-soliditys-transfer-now/[Learn more].
//      *
//      * IMPORTANT: because control is transferred to `recipient`, care must be
//      * taken to not create reentrancy vulnerabilities. Consider using
//      * {ReentrancyGuard} or the
//      * https://solidity.readthedocs.io/en/v0.8.0/security-considerations.html#use-the-checks-effects-interactions-pattern[checks-effects-interactions pattern].
//      */
//     function sendValue(address payable recipient, uint256 amount) internal {
//         require(address(this).balance >= amount, "Address: insufficient balance");

//         (bool success, ) = recipient.call{value: amount}("");
//         require(success, "Address: unable to send value, recipient may have reverted");
//     }

//     /**
//      * @dev Performs a Solidity function call using a low level `call`. A
//      * plain `call` is an unsafe replacement for a function call: use this
//      * function instead.
//      *
//      * If `target` reverts with a revert reason, it is bubbled up by this
//      * function (like regular Solidity function calls).
//      *
//      * Returns the raw returned data. To convert to the expected return value,
//      * use https://solidity.readthedocs.io/en/latest/units-and-global-variables.html?highlight=abi.decode#abi-encoding-and-decoding-functions[`abi.decode`].
//      *
//      * Requirements:
//      *
//      * - `target` must be a contract.
//      * - calling `target` with `data` must not revert.
//      *
//      * _Available since v3.1._
//      */
//     function functionCall(address target, bytes memory data) internal returns (bytes memory) {
//         return functionCallWithValue(target, data, 0, "Address: low-level call failed");
//     }

//     /**
//      * @dev Same as {xref-Address-functionCall-address-bytes-}[`functionCall`], but with
//      * `errorMessage` as a fallback revert reason when `target` reverts.
//      *
//      * _Available since v3.1._
//      */
//     function functionCall(
//         address target,
//         bytes memory data,
//         string memory errorMessage
//     ) internal returns (bytes memory) {
//         return functionCallWithValue(target, data, 0, errorMessage);
//     }

//     /**
//      * @dev Same as {xref-Address-functionCall-address-bytes-}[`functionCall`],
//      * but also transferring `value` wei to `target`.
//      *
//      * Requirements:
//      *
//      * - the calling contract must have an ETH balance of at least `value`.
//      * - the called Solidity function must be `payable`.
//      *
//      * _Available since v3.1._
//      */
//     function functionCallWithValue(address target, bytes memory data, uint256 value) internal returns (bytes memory) {
//         return functionCallWithValue(target, data, value, "Address: low-level call with value failed");
//     }

//     /**
//      * @dev Same as {xref-Address-functionCallWithValue-address-bytes-uint256-}[`functionCallWithValue`], but
//      * with `errorMessage` as a fallback revert reason when `target` reverts.
//      *
//      * _Available since v3.1._
//      */
//     function functionCallWithValue(
//         address target,
//         bytes memory data,
//         uint256 value,
//         string memory errorMessage
//     ) internal returns (bytes memory) {
//         require(address(this).balance >= value, "Address: insufficient balance for call");
//         (bool success, bytes memory returndata) = target.call{value: value}(data);
//         return verifyCallResultFromTarget(target, success, returndata, errorMessage);
//     }

//     /**
//      * @dev Same as {xref-Address-functionCall-address-bytes-}[`functionCall`],
//      * but performing a static call.
//      *
//      * _Available since v3.3._
//      */
//     function functionStaticCall(address target, bytes memory data) internal view returns (bytes memory) {
//         return functionStaticCall(target, data, "Address: low-level static call failed");
//     }

//     /**
//      * @dev Same as {xref-Address-functionCall-address-bytes-string-}[`functionCall`],
//      * but performing a static call.
//      *
//      * _Available since v3.3._
//      */
//     function functionStaticCall(
//         address target,
//         bytes memory data,
//         string memory errorMessage
//     ) internal view returns (bytes memory) {
//         (bool success, bytes memory returndata) = target.staticcall(data);
//         return verifyCallResultFromTarget(target, success, returndata, errorMessage);
//     }

//     /**
//      * @dev Same as {xref-Address-functionCall-address-bytes-}[`functionCall`],
//      * but performing a delegate call.
//      *
//      * _Available since v3.4._
//      */
//     function functionDelegateCall(address target, bytes memory data) internal returns (bytes memory) {
//         return functionDelegateCall(target, data, "Address: low-level delegate call failed");
//     }

//     /**
//      * @dev Same as {xref-Address-functionCall-address-bytes-string-}[`functionCall`],
//      * but performing a delegate call.
//      *
//      * _Available since v3.4._
//      */
//     function functionDelegateCall(
//         address target,
//         bytes memory data,
//         string memory errorMessage
//     ) internal returns (bytes memory) {
//         (bool success, bytes memory returndata) = target.delegatecall(data);
//         return verifyCallResultFromTarget(target, success, returndata, errorMessage);
//     }

//     /**
//      * @dev Tool to verify that a low level call to smart-contract was successful, and revert (either by bubbling
//      * the revert reason or using the provided one) in case of unsuccessful call or if target was not a contract.
//      *
//      * _Available since v4.8._
//      */
//     function verifyCallResultFromTarget(
//         address target,
//         bool success,
//         bytes memory returndata,
//         string memory errorMessage
//     ) internal view returns (bytes memory) {
//         if (success) {
//             if (returndata.length == 0) {
//                 // only check isContract if the call was successful and the return data is empty
//                 // otherwise we already know that it was a contract
//                 require(isContract(target), "Address: call to non-contract");
//             }
//             return returndata;
//         } else {
//             _revert(returndata, errorMessage);
//         }
//     }

//     /**
//      * @dev Tool to verify that a low level call was successful, and revert if it wasn't, either by bubbling the
//      * revert reason or using the provided one.
//      *
//      * _Available since v4.3._
//      */
//     function verifyCallResult(
//         bool success,
//         bytes memory returndata,
//         string memory errorMessage
//     ) internal pure returns (bytes memory) {
//         if (success) {
//             return returndata;
//         } else {
//             _revert(returndata, errorMessage);
//         }
//     }

//     function _revert(bytes memory returndata, string memory errorMessage) private pure {
//         // Look for revert reason and bubble it up if present
//         if (returndata.length > 0) {
//             // The easiest way to bubble the revert reason is using memory via assembly
//             /// @solidity memory-safe-assembly
//             assembly {
//                 let returndata_size := mload(returndata)
//                 revert(add(32, returndata), returndata_size)
//             }
//         } else {
//             revert(errorMessage);
//         }
//     }
// }

// // lib/openzeppelin-contracts-upgradeable/contracts/utils/introspection/IERC165Upgradeable.sol

// // OpenZeppelin Contracts v4.4.1 (utils/introspection/IERC165.sol)

// /**
//  * @dev Interface of the ERC165 standard, as defined in the
//  * https://eips.ethereum.org/EIPS/eip-165[EIP].
//  *
//  * Implementers can declare support of contract interfaces, which can then be
//  * queried by others ({ERC165Checker}).
//  *
//  * For an implementation, see {ERC165}.
//  */
// interface IERC165Upgradeable {
//     /**
//      * @dev Returns true if this contract implements the interface defined by
//      * `interfaceId`. See the corresponding
//      * https://eips.ethereum.org/EIPS/eip-165#how-interfaces-are-identified[EIP section]
//      * to learn more about how these ids are created.
//      *
//      * This function call must use less than 30 000 gas.
//      */
//     function supportsInterface(bytes4 interfaceId) external view returns (bool);
// }

// // lib/openzeppelin-contracts-upgradeable/contracts/utils/math/MathUpgradeable.sol

// // OpenZeppelin Contracts (last updated v4.9.0) (utils/math/Math.sol)

// /**
//  * @dev Standard math utilities missing in the Solidity language.
//  */
// library MathUpgradeable {
//     enum Rounding {
//         Down, // Toward negative infinity
//         Up, // Toward infinity
//         Zero // Toward zero
//     }

//     /**
//      * @dev Returns the largest of two numbers.
//      */
//     // function max(uint256 a, uint256 b) internal pure returns (uint256) {
//     //     return a > b ? a : b;
//     // }

//     // /**
//     //  * @dev Returns the smallest of two numbers.
//     //  */
//     // function min(uint256 a, uint256 b) internal pure returns (uint256) {
//     //     return a < b ? a : b;
//     // }

//     // /**
//     //  * @dev Returns the average of two numbers. The result is rounded towards
//     //  * zero.
//     //  */
//     // function average(uint256 a, uint256 b) internal pure returns (uint256) {
//     //     // (a + b) / 2 can overflow.
//     //     return (a & b) + (a ^ b) / 2;
//     // }

//     // /**
//     //  * @dev Returns the ceiling of the division of two numbers.
//     //  *
//     //  * This differs from standard division with `/` in that it rounds up instead
//     //  * of rounding down.
//     //  */
//     // function ceilDiv(uint256 a, uint256 b) internal pure returns (uint256) {
//     //     // (a + b - 1) / b can overflow on addition, so we distribute.
//     //     return a == 0 ? 0 : (a - 1) / b + 1;
//     // }

//     // /**
//     //  * @notice Calculates floor(x * y / denominator) with full precision. Throws if result overflows a uint256 or denominator == 0
//     //  * @dev Original credit to Remco Bloemen under MIT license (https://xn--2-umb.com/21/muldiv)
//     //  * with further edits by Uniswap Labs also under MIT license.
//     //  */
//     // function mulDiv(uint256 x, uint256 y, uint256 denominator) internal pure returns (uint256 result) {
//     //     unchecked {
//     //         // 512-bit multiply [prod1 prod0] = x * y. Compute the product mod 2^256 and mod 2^256 - 1, then use
//     //         // use the Chinese Remainder Theorem to reconstruct the 512 bit result. The result is stored in two 256
//     //         // variables such that product = prod1 * 2^256 + prod0.
//     //         uint256 prod0; // Least significant 256 bits of the product
//     //         uint256 prod1; // Most significant 256 bits of the product
//     //         assembly {
//     //             let mm := mulmod(x, y, not(0))
//     //             prod0 := mul(x, y)
//     //             prod1 := sub(sub(mm, prod0), lt(mm, prod0))
//     //         }

//     //         // Handle non-overflow cases, 256 by 256 division.
//     //         if (prod1 == 0) {
//     //             // Solidity will revert if denominator == 0, unlike the div opcode on its own.
//     //             // The surrounding unchecked block does not change this fact.
//     //             // See https://docs.soliditylang.org/en/latest/control-structures.html#checked-or-unchecked-arithmetic.
//     //             return prod0 / denominator;
//     //         }

//     //         // Make sure the result is less than 2^256. Also prevents denominator == 0.
//     //         require(denominator > prod1, "Math: mulDiv overflow");

//     //         ///////////////////////////////////////////////
//     //         // 512 by 256 division.
//     //         ///////////////////////////////////////////////

//     //         // Make division exact by subtracting the remainder from [prod1 prod0].
//     //         uint256 remainder;
//     //         assembly {
//     //             // Compute remainder using mulmod.
//     //             remainder := mulmod(x, y, denominator)

//     //             // Subtract 256 bit number from 512 bit number.
//     //             prod1 := sub(prod1, gt(remainder, prod0))
//     //             prod0 := sub(prod0, remainder)
//     //         }

//     //         // Factor powers of two out of denominator and compute largest power of two divisor of denominator. Always >= 1.
//     //         // See https://cs.stackexchange.com/q/138556/92363.

//     //         // Does not overflow because the denominator cannot be zero at this stage in the function.
//     //         uint256 twos = denominator & (~denominator + 1);
//     //         assembly {
//     //             // Divide denominator by twos.
//     //             denominator := div(denominator, twos)

//     //             // Divide [prod1 prod0] by twos.
//     //             prod0 := div(prod0, twos)

//     //             // Flip twos such that it is 2^256 / twos. If twos is zero, then it becomes one.
//     //             twos := add(div(sub(0, twos), twos), 1)
//     //         }

//     //         // Shift in bits from prod1 into prod0.
//     //         prod0 |= prod1 * twos;

//     //         // Invert denominator mod 2^256. Now that denominator is an odd number, it has an inverse modulo 2^256 such
//     //         // that denominator * inv = 1 mod 2^256. Compute the inverse by starting with a seed that is correct for
//     //         // four bits. That is, denominator * inv = 1 mod 2^4.
//     //         uint256 inverse = (3 * denominator) ^ 2;

//     //         // Use the Newton-Raphson iteration to improve the precision. Thanks to Hensel's lifting lemma, this also works
//     //         // in modular arithmetic, doubling the correct bits in each step.
//     //         inverse *= 2 - denominator * inverse; // inverse mod 2^8
//     //         inverse *= 2 - denominator * inverse; // inverse mod 2^16
//     //         inverse *= 2 - denominator * inverse; // inverse mod 2^32
//     //         inverse *= 2 - denominator * inverse; // inverse mod 2^64
//     //         inverse *= 2 - denominator * inverse; // inverse mod 2^128
//     //         inverse *= 2 - denominator * inverse; // inverse mod 2^256

//     //         // Because the division is now exact we can divide by multiplying with the modular inverse of denominator.
//     //         // This will give us the correct result modulo 2^256. Since the preconditions guarantee that the outcome is
//     //         // less than 2^256, this is the final result. We don't need to compute the high bits of the result and prod1
//     //         // is no longer required.
//     //         result = prod0 * inverse;
//     //         return result;
//     //     }
//     // }

//     // /**
//     //  * @notice Calculates x * y / denominator with full precision, following the selected rounding direction.
//     //  */
//     // function mulDiv(uint256 x, uint256 y, uint256 denominator, Rounding rounding) internal pure returns (uint256) {
//     //     uint256 result = mulDiv(x, y, denominator);
//     //     if (rounding == Rounding.Up && mulmod(x, y, denominator) > 0) {
//     //         result += 1;
//     //     }
//     //     return result;
//     // }

//     // /**
//     //  * @dev Returns the square root of a number. If the number is not a perfect square, the value is rounded down.
//     //  *
//     //  * Inspired by Henry S. Warren, Jr.'s "Hacker's Delight" (Chapter 11).
//     //  */
//     // function sqrt(uint256 a) internal pure returns (uint256) {
//     //     if (a == 0) {
//     //         return 0;
//     //     }

//     //     // For our first guess, we get the biggest power of 2 which is smaller than the square root of the target.
//     //     //
//     //     // We know that the "msb" (most significant bit) of our target number `a` is a power of 2 such that we have
//     //     // `msb(a) <= a < 2*msb(a)`. This value can be written `msb(a)=2**k` with `k=log2(a)`.
//     //     //
//     //     // This can be rewritten `2**log2(a) <= a < 2**(log2(a) + 1)`
//     //     // → `sqrt(2**k) <= sqrt(a) < sqrt(2**(k+1))`
//     //     // → `2**(k/2) <= sqrt(a) < 2**((k+1)/2) <= 2**(k/2 + 1)`
//     //     //
//     //     // Consequently, `2**(log2(a) / 2)` is a good first approximation of `sqrt(a)` with at least 1 correct bit.
//     //     uint256 result = 1 << (log2(a) >> 1);

//     //     // At this point `result` is an estimation with one bit of precision. We know the true value is a uint128,
//     //     // since it is the square root of a uint256. Newton's method converges quadratically (precision doubles at
//     //     // every iteration). We thus need at most 7 iteration to turn our partial result with one bit of precision
//     //     // into the expected uint128 result.
//     //     unchecked {
//     //         result = (result + a / result) >> 1;
//     //         result = (result + a / result) >> 1;
//     //         result = (result + a / result) >> 1;
//     //         result = (result + a / result) >> 1;
//     //         result = (result + a / result) >> 1;
//     //         result = (result + a / result) >> 1;
//     //         result = (result + a / result) >> 1;
//     //         return min(result, a / result);
//     //     }
//     // }

//     // /**
//     //  * @notice Calculates sqrt(a), following the selected rounding direction.
//     //  */
//     // function sqrt(uint256 a, Rounding rounding) internal pure returns (uint256) {
//     //     unchecked {
//     //         uint256 result = sqrt(a);
//     //         return result + (rounding == Rounding.Up && result * result < a ? 1 : 0);
//     //     }
//     // }

//     // /**
//     //  * @dev Return the log in base 2, rounded down, of a positive value.
//     //  * Returns 0 if given 0.
//     //  */
//     // function log2(uint256 value) internal pure returns (uint256) {
//     //     uint256 result = 0;
//     //     unchecked {
//     //         if (value >> 128 > 0) {
//     //             value >>= 128;
//     //             result += 128;
//     //         }
//     //         if (value >> 64 > 0) {
//     //             value >>= 64;
//     //             result += 64;
//     //         }
//     //         if (value >> 32 > 0) {
//     //             value >>= 32;
//     //             result += 32;
//     //         }
//     //         if (value >> 16 > 0) {
//     //             value >>= 16;
//     //             result += 16;
//     //         }
//     //         if (value >> 8 > 0) {
//     //             value >>= 8;
//     //             result += 8;
//     //         }
//     //         if (value >> 4 > 0) {
//     //             value >>= 4;
//     //             result += 4;
//     //         }
//     //         if (value >> 2 > 0) {
//     //             value >>= 2;
//     //             result += 2;
//     //         }
//     //         if (value >> 1 > 0) {
//     //             result += 1;
//     //         }
//     //     }
//     //     return result;
//     // }

//     // /**
//     //  * @dev Return the log in base 2, following the selected rounding direction, of a positive value.
//     //  * Returns 0 if given 0.
//     //  */
//     // function log2(uint256 value, Rounding rounding) internal pure returns (uint256) {
//     //     unchecked {
//     //         uint256 result = log2(value);
//     //         return result + (rounding == Rounding.Up && 1 << result < value ? 1 : 0);
//     //     }
//     // }

//     // /**
//     //  * @dev Return the log in base 10, rounded down, of a positive value.
//     //  * Returns 0 if given 0.
//     //  */
//     function log10(uint256 value) internal pure returns (uint256) {
//         uint256 result = 0;
//         unchecked {
//             if (value >= 10 ** 64) {
//                 value /= 10 ** 64;
//                 result += 64;
//             }
//             if (value >= 10 ** 32) {
//                 value /= 10 ** 32;
//                 result += 32;
//             }
//             if (value >= 10 ** 16) {
//                 value /= 10 ** 16;
//                 result += 16;
//             }
//             if (value >= 10 ** 8) {
//                 value /= 10 ** 8;
//                 result += 8;
//             }
//             if (value >= 10 ** 4) {
//                 value /= 10 ** 4;
//                 result += 4;
//             }
//             if (value >= 10 ** 2) {
//                 value /= 10 ** 2;
//                 result += 2;
//             }
//             if (value >= 10 ** 1) {
//                 result += 1;
//             }
//         }
//         return result;
//     }

//     // /**
//     //  * @dev Return the log in base 10, following the selected rounding direction, of a positive value.
//     //  * Returns 0 if given 0.
//     //  */
//     // function log10(uint256 value, Rounding rounding) internal pure returns (uint256) {
//     //     unchecked {
//     //         uint256 result = log10(value);
//     //         return result + (rounding == Rounding.Up && 10 ** result < value ? 1 : 0);
//     //     }
//     // }

//     // /**
//     //  * @dev Return the log in base 256, rounded down, of a positive value.
//     //  * Returns 0 if given 0.
//     //  *
//     //  * Adding one to the result gives the number of pairs of hex symbols needed to represent `value` as a hex string.
//     //  */
//     function log256(uint256 value) internal pure returns (uint256) {
//         uint256 result = 0;
//         unchecked {
//             if (value >> 128 > 0) {
//                 value >>= 128;
//                 result += 16;
//             }
//             if (value >> 64 > 0) {
//                 value >>= 64;
//                 result += 8;
//             }
//             if (value >> 32 > 0) {
//                 value >>= 32;
//                 result += 4;
//             }
//             if (value >> 16 > 0) {
//                 value >>= 16;
//                 result += 2;
//             }
//             if (value >> 8 > 0) {
//                 result += 1;
//             }
//         }
//         return result;
//     }

//     // /**
//     //  * @dev Return the log in base 256, following the selected rounding direction, of a positive value.
//     //  * Returns 0 if given 0.
//     //  */
//     // function log256(uint256 value, Rounding rounding) internal pure returns (uint256) {
//     //     unchecked {
//     //         uint256 result = log256(value);
//     //         return result + (rounding == Rounding.Up && 1 << (result << 3) < value ? 1 : 0);
//     //     }
//     // }
// }

// // lib/openzeppelin-contracts-upgradeable/contracts/utils/math/SignedMathUpgradeable.sol

// // OpenZeppelin Contracts (last updated v4.8.0) (utils/math/SignedMath.sol)

// /**
//  * @dev Standard signed math utilities missing in the Solidity language.
//  */
// library SignedMathUpgradeable {
//     /**
//      * @dev Returns the largest of two signed numbers.
//      */
//     // function max(int256 a, int256 b) internal pure returns (int256) {
//     //     return a > b ? a : b;
//     // }

//     // /**
//     //  * @dev Returns the smallest of two signed numbers.
//     //  */
//     // function min(int256 a, int256 b) internal pure returns (int256) {
//     //     return a < b ? a : b;
//     // }

//     // /**
//     //  * @dev Returns the average of two signed numbers without overflow.
//     //  * The result is rounded towards zero.
//     //  */
//     // function average(int256 a, int256 b) internal pure returns (int256) {
//     //     // Formula from the book "Hacker's Delight"
//     //     int256 x = (a & b) + ((a ^ b) >> 1);
//     //     return x + (int256(uint256(x) >> 255) & (a ^ b));
//     // }

//      /**
//       * @dev Returns the absolute unsigned value of a signed value.
//       */
//    function abs(int256 n) internal pure returns (uint256) {
//        unchecked {
//            // must be unchecked in order to support `n = type(int256).min`
//            return uint256(n >= 0 ? n : -n);
//        }
//    }
// }

// // lib/openzeppelin-foundry-upgrades/lib/solidity-stringutils/src/strings.sol
// /*
//  * @title String & slice utility library for Solidity contracts.
//  * @author Nick Johnson <arachnid@notdot.net>
//  *
//  * @dev Functionality in this library is largely implemented using an
//  *      abstraction called a 'slice'. A slice represents a part of a string -
//  *      anything from the entire string to a single character, or even no
//  *      characters at all (a 0-length slice). Since a slice only has to specify
//  *      an offset and a length, copying and manipulating slices is a lot less
//  *      expensive than copying and manipulating the strings they reference.
//  *
//  *      To further reduce gas costs, most functions on slice that need to return
//  *      a slice modify the original one instead of allocating a new one; for
//  *      instance, `s.split(".")` will return the text up to the first '.',
//  *      modifying s to only contain the remainder of the string after the '.'.
//  *      In situations where you do not want to modify the original slice, you
//  *      can make a copy first with `.copy()`, for example:
//  *      `s.copy().split(".")`. Try and avoid using this idiom in loops; since
//  *      Solidity has no memory management, it will result in allocating many
//  *      short-lived slices that are later discarded.
//  *
//  *      Functions that return two slices come in two versions: a non-allocating
//  *      version that takes the second slice as an argument, modifying it in
//  *      place, and an allocating version that allocates and returns the second
//  *      slice; see `nextRune` for example.
//  *
//  *      Functions that have to copy string data will return strings rather than
//  *      slices; these can be cast back to slices for further processing if
//  *      required.
//  *
//  *      For convenience, some functions are provided with non-modifying
//  *      variants that create a new slice and return both; for instance,
//  *      `s.splitNew('.')` leaves s unmodified, and returns two values
//  *      corresponding to the left and right parts of the string.
//  */

// library strings {
//     struct slice {
//         uint _len;
//         uint _ptr;
//     }

//     function memcpy(uint dest, uint src, uint length) private pure {
//         // Copy word-length chunks while possible
//         for(; length >= 32; length -= 32) {
//             assembly {
//                 mstore(dest, mload(src))
//             }
//             dest += 32;
//             src += 32;
//         }

//         // Copy remaining bytes
//         uint mask = type(uint).max;
//         if (length > 0) {
//             mask = 256 ** (32 - length) - 1;
//         }
//         assembly {
//             let srcpart := and(mload(src), not(mask))
//             let destpart := and(mload(dest), mask)
//             mstore(dest, or(destpart, srcpart))
//         }
//     }

//     /*
//      * @dev Returns a slice containing the entire string.
//      * @param self The string to make a slice from.
//      * @return A newly allocated slice containing the entire string.
//      */
//     function toSlice(string memory self) internal pure returns (slice memory) {
//         uint ptr;
//         assembly {
//             ptr := add(self, 0x20)
//         }
//         return slice(bytes(self).length, ptr);
//     }

//     /*
//      * @dev Returns the length of a null-terminated bytes32 string.
//      * @param self The value to find the length of.
//      * @return The length of the string, from 0 to 32.
//      */
//     function len(bytes32 self) internal pure returns (uint) {
//         uint ret;
//         if (self == 0)
//             return 0;
//         if (uint(self) & type(uint128).max == 0) {
//             ret += 16;
//             self = bytes32(uint(self) / 0x100000000000000000000000000000000);
//         }
//         if (uint(self) & type(uint64).max == 0) {
//             ret += 8;
//             self = bytes32(uint(self) / 0x10000000000000000);
//         }
//         if (uint(self) & type(uint32).max == 0) {
//             ret += 4;
//             self = bytes32(uint(self) / 0x100000000);
//         }
//         if (uint(self) & type(uint16).max == 0) {
//             ret += 2;
//             self = bytes32(uint(self) / 0x10000);
//         }
//         if (uint(self) & type(uint8).max == 0) {
//             ret += 1;
//         }
//         return 32 - ret;
//     }

//     /*
//      * @dev Returns a slice containing the entire bytes32, interpreted as a
//      *      null-terminated utf-8 string.
//      * @param self The bytes32 value to convert to a slice.
//      * @return A new slice containing the value of the input argument up to the
//      *         first null.
//      */
//     function toSliceB32(bytes32 self) internal pure returns (slice memory ret) {
//         // Allocate space for `self` in memory, copy it there, and point ret at it
//         assembly {
//             let ptr := mload(0x40)
//             mstore(0x40, add(ptr, 0x20))
//             mstore(ptr, self)
//             mstore(add(ret, 0x20), ptr)
//         }
//         ret._len = len(self);
//     }

//     /*
//      * @dev Returns a new slice containing the same data as the current slice.
//      * @param self The slice to copy.
//      * @return A new slice containing the same data as `self`.
//      */
//     function copy(slice memory self) internal pure returns (slice memory) {
//         return slice(self._len, self._ptr);
//     }

//     /*
//      * @dev Copies a slice to a new string.
//      * @param self The slice to copy.
//      * @return A newly allocated string containing the slice's text.
//      */
//     function toString(slice memory self) internal pure returns (string memory) {
//         string memory ret = new string(self._len);
//         uint retptr;
//         assembly { retptr := add(ret, 32) }

//         memcpy(retptr, self._ptr, self._len);
//         return ret;
//     }

//     /*
//      * @dev Returns the length in runes of the slice. Note that this operation
//      *      takes time proportional to the length of the slice; avoid using it
//      *      in loops, and call `slice.empty()` if you only need to know whether
//      *      the slice is empty or not.
//      * @param self The slice to operate on.
//      * @return The length of the slice in runes.
//      */
//     function len(slice memory self) internal pure returns (uint l) {
//         // Starting at ptr-31 means the LSB will be the byte we care about
//         uint ptr = self._ptr - 31;
//         uint end = ptr + self._len;
//         for (l = 0; ptr < end; l++) {
//             uint8 b;
//             assembly { b := and(mload(ptr), 0xFF) }
//             if (b < 0x80) {
//                 ptr += 1;
//             } else if(b < 0xE0) {
//                 ptr += 2;
//             } else if(b < 0xF0) {
//                 ptr += 3;
//             } else if(b < 0xF8) {
//                 ptr += 4;
//             } else if(b < 0xFC) {
//                 ptr += 5;
//             } else {
//                 ptr += 6;
//             }
//         }
//     }

//     /*
//      * @dev Returns true if the slice is empty (has a length of 0).
//      * @param self The slice to operate on.
//      * @return True if the slice is empty, False otherwise.
//      */
//     function empty(slice memory self) internal pure returns (bool) {
//         return self._len == 0;
//     }

//     /*
//      * @dev Returns a positive number if `other` comes lexicographically after
//      *      `self`, a negative number if it comes before, or zero if the
//      *      contents of the two slices are equal. Comparison is done per-rune,
//      *      on unicode codepoints.
//      * @param self The first slice to compare.
//      * @param other The second slice to compare.
//      * @return The result of the comparison.
//      */
//     function compare(slice memory self, slice memory other) internal pure returns (int) {
//         uint shortest = self._len;
//         if (other._len < self._len)
//             shortest = other._len;

//         uint selfptr = self._ptr;
//         uint otherptr = other._ptr;
//         for (uint idx = 0; idx < shortest; idx += 32) {
//             uint a;
//             uint b;
//             assembly {
//                 a := mload(selfptr)
//                 b := mload(otherptr)
//             }
//             if (a != b) {
//                 // Mask out irrelevant bytes and check again
//                 uint mask = type(uint).max; // 0xffff...
//                 if(shortest < 32) {
//                   mask = ~(2 ** (8 * (32 - shortest + idx)) - 1);
//                 }
//                 unchecked {
//                     uint diff = (a & mask) - (b & mask);
//                     if (diff != 0)
//                         return int(diff);
//                 }
//             }
//             selfptr += 32;
//             otherptr += 32;
//         }
//         return int(self._len) - int(other._len);
//     }

//     /*
//      * @dev Returns true if the two slices contain the same text.
//      * @param self The first slice to compare.
//      * @param self The second slice to compare.
//      * @return True if the slices are equal, false otherwise.
//      */
//     function equals(slice memory self, slice memory other) internal pure returns (bool) {
//         return compare(self, other) == 0;
//     }

//     /*
//      * @dev Extracts the first rune in the slice into `rune`, advancing the
//      *      slice to point to the next rune and returning `self`.
//      * @param self The slice to operate on.
//      * @param rune The slice that will contain the first rune.
//      * @return `rune`.
//      */
//     function nextRune(slice memory self, slice memory rune) internal pure returns (slice memory) {
//         rune._ptr = self._ptr;

//         if (self._len == 0) {
//             rune._len = 0;
//             return rune;
//         }

//         uint l;
//         uint b;
//         // Load the first byte of the rune into the LSBs of b
//         assembly { b := and(mload(sub(mload(add(self, 32)), 31)), 0xFF) }
//         if (b < 0x80) {
//             l = 1;
//         } else if(b < 0xE0) {
//             l = 2;
//         } else if(b < 0xF0) {
//             l = 3;
//         } else {
//             l = 4;
//         }

//         // Check for truncated codepoints
//         if (l > self._len) {
//             rune._len = self._len;
//             self._ptr += self._len;
//             self._len = 0;
//             return rune;
//         }

//         self._ptr += l;
//         self._len -= l;
//         rune._len = l;
//         return rune;
//     }

//     /*
//      * @dev Returns the first rune in the slice, advancing the slice to point
//      *      to the next rune.
//      * @param self The slice to operate on.
//      * @return A slice containing only the first rune from `self`.
//      */
//     function nextRune(slice memory self) internal pure returns (slice memory ret) {
//         nextRune(self, ret);
//     }

//     /*
//      * @dev Returns the number of the first codepoint in the slice.
//      * @param self The slice to operate on.
//      * @return The number of the first codepoint in the slice.
//      */
//     function ord(slice memory self) internal pure returns (uint ret) {
//         if (self._len == 0) {
//             return 0;
//         }

//         uint word;
//         uint length;
//         uint divisor = 2 ** 248;

//         // Load the rune into the MSBs of b
//         assembly { word:= mload(mload(add(self, 32))) }
//         uint b = word / divisor;
//         if (b < 0x80) {
//             ret = b;
//             length = 1;
//         } else if(b < 0xE0) {
//             ret = b & 0x1F;
//             length = 2;
//         } else if(b < 0xF0) {
//             ret = b & 0x0F;
//             length = 3;
//         } else {
//             ret = b & 0x07;
//             length = 4;
//         }

//         // Check for truncated codepoints
//         if (length > self._len) {
//             return 0;
//         }

//         for (uint i = 1; i < length; i++) {
//             divisor = divisor / 256;
//             b = (word / divisor) & 0xFF;
//             if (b & 0xC0 != 0x80) {
//                 // Invalid UTF-8 sequence
//                 return 0;
//             }
//             ret = (ret * 64) | (b & 0x3F);
//         }

//         return ret;
//     }

//     /*
//      * @dev Returns the keccak-256 hash of the slice.
//      * @param self The slice to hash.
//      * @return The hash of the slice.
//      */
//     function keccak(slice memory self) internal pure returns (bytes32 ret) {
//         assembly {
//             ret := keccak256(mload(add(self, 32)), mload(self))
//         }
//     }

//     /*
//      * @dev Returns true if `self` starts with `needle`.
//      * @param self The slice to operate on.
//      * @param needle The slice to search for.
//      * @return True if the slice starts with the provided text, false otherwise.
//      */
//     function startsWith(slice memory self, slice memory needle) internal pure returns (bool) {
//         if (self._len < needle._len) {
//             return false;
//         }

//         if (self._ptr == needle._ptr) {
//             return true;
//         }

//         bool equal;
//         assembly {
//             let length := mload(needle)
//             let selfptr := mload(add(self, 0x20))
//             let needleptr := mload(add(needle, 0x20))
//             equal := eq(keccak256(selfptr, length), keccak256(needleptr, length))
//         }
//         return equal;
//     }

//     /*
//      * @dev If `self` starts with `needle`, `needle` is removed from the
//      *      beginning of `self`. Otherwise, `self` is unmodified.
//      * @param self The slice to operate on.
//      * @param needle The slice to search for.
//      * @return `self`
//      */
//     function beyond(slice memory self, slice memory needle) internal pure returns (slice memory) {
//         if (self._len < needle._len) {
//             return self;
//         }

//         bool equal = true;
//         if (self._ptr != needle._ptr) {
//             assembly {
//                 let length := mload(needle)
//                 let selfptr := mload(add(self, 0x20))
//                 let needleptr := mload(add(needle, 0x20))
//                 equal := eq(keccak256(selfptr, length), keccak256(needleptr, length))
//             }
//         }

//         if (equal) {
//             self._len -= needle._len;
//             self._ptr += needle._len;
//         }

//         return self;
//     }

//     /*
//      * @dev Returns true if the slice ends with `needle`.
//      * @param self The slice to operate on.
//      * @param needle The slice to search for.
//      * @return True if the slice starts with the provided text, false otherwise.
//      */
//     function endsWith(slice memory self, slice memory needle) internal pure returns (bool) {
//         if (self._len < needle._len) {
//             return false;
//         }

//         uint selfptr = self._ptr + self._len - needle._len;

//         if (selfptr == needle._ptr) {
//             return true;
//         }

//         bool equal;
//         assembly {
//             let length := mload(needle)
//             let needleptr := mload(add(needle, 0x20))
//             equal := eq(keccak256(selfptr, length), keccak256(needleptr, length))
//         }

//         return equal;
//     }

//     /*
//      * @dev If `self` ends with `needle`, `needle` is removed from the
//      *      end of `self`. Otherwise, `self` is unmodified.
//      * @param self The slice to operate on.
//      * @param needle The slice to search for.
//      * @return `self`
//      */
//     function until(slice memory self, slice memory needle) internal pure returns (slice memory) {
//         if (self._len < needle._len) {
//             return self;
//         }

//         uint selfptr = self._ptr + self._len - needle._len;
//         bool equal = true;
//         if (selfptr != needle._ptr) {
//             assembly {
//                 let length := mload(needle)
//                 let needleptr := mload(add(needle, 0x20))
//                 equal := eq(keccak256(selfptr, length), keccak256(needleptr, length))
//             }
//         }

//         if (equal) {
//             self._len -= needle._len;
//         }

//         return self;
//     }

//     // Returns the memory address of the first byte of the first occurrence of
//     // `needle` in `self`, or the first byte after `self` if not found.
//     function findPtr(uint selflen, uint selfptr, uint needlelen, uint needleptr) private pure returns (uint) {
//         uint ptr = selfptr;
//         uint idx;

//         if (needlelen <= selflen) {
//             if (needlelen <= 32) {
//                 bytes32 mask;
//                 if (needlelen > 0) {
//                     mask = bytes32(~(2 ** (8 * (32 - needlelen)) - 1));
//                 }

//                 bytes32 needledata;
//                 assembly { needledata := and(mload(needleptr), mask) }

//                 uint end = selfptr + selflen - needlelen;
//                 bytes32 ptrdata;
//                 assembly { ptrdata := and(mload(ptr), mask) }

//                 while (ptrdata != needledata) {
//                     if (ptr >= end)
//                         return selfptr + selflen;
//                     ptr++;
//                     assembly { ptrdata := and(mload(ptr), mask) }
//                 }
//                 return ptr;
//             } else {
//                 // For long needles, use hashing
//                 bytes32 hash;
//                 assembly { hash := keccak256(needleptr, needlelen) }

//                 for (idx = 0; idx <= selflen - needlelen; idx++) {
//                     bytes32 testHash;
//                     assembly { testHash := keccak256(ptr, needlelen) }
//                     if (hash == testHash)
//                         return ptr;
//                     ptr += 1;
//                 }
//             }
//         }
//         return selfptr + selflen;
//     }

//     // Returns the memory address of the first byte after the last occurrence of
//     // `needle` in `self`, or the address of `self` if not found.
//     function rfindPtr(uint selflen, uint selfptr, uint needlelen, uint needleptr) private pure returns (uint) {
//         uint ptr;

//         if (needlelen <= selflen) {
//             if (needlelen <= 32) {
//                 bytes32 mask;
//                 if (needlelen > 0) {
//                     mask = bytes32(~(2 ** (8 * (32 - needlelen)) - 1));
//                 }

//                 bytes32 needledata;
//                 assembly { needledata := and(mload(needleptr), mask) }

//                 ptr = selfptr + selflen - needlelen;
//                 bytes32 ptrdata;
//                 assembly { ptrdata := and(mload(ptr), mask) }

//                 while (ptrdata != needledata) {
//                     if (ptr <= selfptr)
//                         return selfptr;
//                     ptr--;
//                     assembly { ptrdata := and(mload(ptr), mask) }
//                 }
//                 return ptr + needlelen;
//             } else {
//                 // For long needles, use hashing
//                 bytes32 hash;
//                 assembly { hash := keccak256(needleptr, needlelen) }
//                 ptr = selfptr + (selflen - needlelen);
//                 while (ptr >= selfptr) {
//                     bytes32 testHash;
//                     assembly { testHash := keccak256(ptr, needlelen) }
//                     if (hash == testHash)
//                         return ptr + needlelen;
//                     ptr -= 1;
//                 }
//             }
//         }
//         return selfptr;
//     }

//     /*
//      * @dev Modifies `self` to contain everything from the first occurrence of
//      *      `needle` to the end of the slice. `self` is set to the empty slice
//      *      if `needle` is not found.
//      * @param self The slice to search and modify.
//      * @param needle The text to search for.
//      * @return `self`.
//      */
//     function find(slice memory self, slice memory needle) internal pure returns (slice memory) {
//         uint ptr = findPtr(self._len, self._ptr, needle._len, needle._ptr);
//         self._len -= ptr - self._ptr;
//         self._ptr = ptr;
//         return self;
//     }

//     /*
//      * @dev Modifies `self` to contain the part of the string from the start of
//      *      `self` to the end of the first occurrence of `needle`. If `needle`
//      *      is not found, `self` is set to the empty slice.
//      * @param self The slice to search and modify.
//      * @param needle The text to search for.
//      * @return `self`.
//      */
//     function rfind(slice memory self, slice memory needle) internal pure returns (slice memory) {
//         uint ptr = rfindPtr(self._len, self._ptr, needle._len, needle._ptr);
//         self._len = ptr - self._ptr;
//         return self;
//     }

//     /*
//      * @dev Splits the slice, setting `self` to everything after the first
//      *      occurrence of `needle`, and `token` to everything before it. If
//      *      `needle` does not occur in `self`, `self` is set to the empty slice,
//      *      and `token` is set to the entirety of `self`.
//      * @param self The slice to split.
//      * @param needle The text to search for in `self`.
//      * @param token An output parameter to which the first token is written.
//      * @return `token`.
//      */
//     function split(slice memory self, slice memory needle, slice memory token) internal pure returns (slice memory) {
//         uint ptr = findPtr(self._len, self._ptr, needle._len, needle._ptr);
//         token._ptr = self._ptr;
//         token._len = ptr - self._ptr;
//         if (ptr == self._ptr + self._len) {
//             // Not found
//             self._len = 0;
//         } else {
//             self._len -= token._len + needle._len;
//             self._ptr = ptr + needle._len;
//         }
//         return token;
//     }

//     /*
//      * @dev Splits the slice, setting `self` to everything after the first
//      *      occurrence of `needle`, and returning everything before it. If
//      *      `needle` does not occur in `self`, `self` is set to the empty slice,
//      *      and the entirety of `self` is returned.
//      * @param self The slice to split.
//      * @param needle The text to search for in `self`.
//      * @return The part of `self` up to the first occurrence of `delim`.
//      */
//     function split(slice memory self, slice memory needle) internal pure returns (slice memory token) {
//         split(self, needle, token);
//     }

//     /*
//      * @dev Splits the slice, setting `self` to everything before the last
//      *      occurrence of `needle`, and `token` to everything after it. If
//      *      `needle` does not occur in `self`, `self` is set to the empty slice,
//      *      and `token` is set to the entirety of `self`.
//      * @param self The slice to split.
//      * @param needle The text to search for in `self`.
//      * @param token An output parameter to which the first token is written.
//      * @return `token`.
//      */
//     function rsplit(slice memory self, slice memory needle, slice memory token) internal pure returns (slice memory) {
//         uint ptr = rfindPtr(self._len, self._ptr, needle._len, needle._ptr);
//         token._ptr = ptr;
//         token._len = self._len - (ptr - self._ptr);
//         if (ptr == self._ptr) {
//             // Not found
//             self._len = 0;
//         } else {
//             self._len -= token._len + needle._len;
//         }
//         return token;
//     }

//     /*
//      * @dev Splits the slice, setting `self` to everything before the last
//      *      occurrence of `needle`, and returning everything after it. If
//      *      `needle` does not occur in `self`, `self` is set to the empty slice,
//      *      and the entirety of `self` is returned.
//      * @param self The slice to split.
//      * @param needle The text to search for in `self`.
//      * @return The part of `self` after the last occurrence of `delim`.
//      */
//     function rsplit(slice memory self, slice memory needle) internal pure returns (slice memory token) {
//         rsplit(self, needle, token);
//     }

//     /*
//      * @dev Counts the number of nonoverlapping occurrences of `needle` in `self`.
//      * @param self The slice to search.
//      * @param needle The text to search for in `self`.
//      * @return The number of occurrences of `needle` found in `self`.
//      */
//     function count(slice memory self, slice memory needle) internal pure returns (uint cnt) {
//         uint ptr = findPtr(self._len, self._ptr, needle._len, needle._ptr) + needle._len;
//         while (ptr <= self._ptr + self._len) {
//             cnt++;
//             ptr = findPtr(self._len - (ptr - self._ptr), ptr, needle._len, needle._ptr) + needle._len;
//         }
//     }

//     /*
//      * @dev Returns True if `self` contains `needle`.
//      * @param self The slice to search.
//      * @param needle The text to search for in `self`.
//      * @return True if `needle` is found in `self`, false otherwise.
//      */
//     function contains(slice memory self, slice memory needle) internal pure returns (bool) {
//         return rfindPtr(self._len, self._ptr, needle._len, needle._ptr) != self._ptr;
//     }

//     /*
//      * @dev Returns a newly allocated string containing the concatenation of
//      *      `self` and `other`.
//      * @param self The first slice to concatenate.
//      * @param other The second slice to concatenate.
//      * @return The concatenation of the two strings.
//      */
//     function concat(slice memory self, slice memory other) internal pure returns (string memory) {
//         string memory ret = new string(self._len + other._len);
//         uint retptr;
//         assembly { retptr := add(ret, 32) }
//         memcpy(retptr, self._ptr, self._len);
//         memcpy(retptr + self._len, other._ptr, other._len);
//         return ret;
//     }

//     /*
//      * @dev Joins an array of slices, using `self` as a delimiter, returning a
//      *      newly allocated string.
//      * @param self The delimiter to use.
//      * @param parts A list of slices to join.
//      * @return A newly allocated string containing all the slices in `parts`,
//      *         joined with `self`.
//      */
//     function join(slice memory self, slice[] memory parts) internal pure returns (string memory) {
//         if (parts.length == 0)
//             return "";

//         uint length = self._len * (parts.length - 1);
//         for(uint i = 0; i < parts.length; i++)
//             length += parts[i]._len;

//         string memory ret = new string(length);
//         uint retptr;
//         assembly { retptr := add(ret, 32) }

//         for(uint i = 0; i < parts.length; i++) {
//             memcpy(retptr, parts[i]._ptr, parts[i]._len);
//             retptr += parts[i]._len;
//             if (i < parts.length - 1) {
//                 memcpy(retptr, self._ptr, self._len);
//                 retptr += self._len;
//             }
//         }

//         return ret;
//     }
// }

// // lib/openzeppelin-foundry-upgrades/src/Options.sol

// /**
//  * Common options.
//  */
// struct Options {
//     /*
//      * The reference contract to use for storage layout comparisons, e.g. "ContractV1.sol" or "ContractV1.sol:ContractV1".
//      * If not set, attempts to use the `@custom:oz-upgrades-from <reference>` annotation from the contract.
//      */
//     string referenceContract;
//     /*
//      * Encoded constructor arguments for the implementation contract.
//      * Note that these are different from initializer arguments, and will be used in the deployment of the implementation contract itself.
//      * Can be used to initialize immutable variables.
//      */
//     bytes constructorData;
//     /*
//      * Selectively disable one or more validation errors. Comma-separated list that must be compatible with the
//      * --unsafeAllow option described in https://docs.openzeppelin.com/upgrades-plugins/1.x/api-core#usage
//      */
//     string unsafeAllow;
//     /*
//      * Configure storage layout check to allow variable renaming
//      */
//     bool unsafeAllowRenames;
//     /*
//      * Skips checking for storage layout compatibility errors. This is a dangerous option meant to be used as a last resort.
//      */
//     bool unsafeSkipStorageCheck;
//     /*
//      * Skips all upgrade safety checks. This is a dangerous option meant to be used as a last resort.
//      */
//     bool unsafeSkipAllChecks;
//     /*
//      * Options for OpenZeppelin Defender deployments.
//      */
//     DefenderOptions defender;
// }

// /**
//  * Options for OpenZeppelin Defender deployments.
//  */
// struct DefenderOptions {
//     /*
//      * Deploys contracts using OpenZeppelin Defender instead of broadcasting deployments through Forge. Defaults to `false`. See DEFENDER.md.
//      *
//      * NOTE: If using an EOA or Safe to deploy, go to https://defender.openzeppelin.com/v2/#/deploy[Defender deploy] to submit the pending deployment(s) while the script is running.
//      * The script waits for each deployment to complete before it continues.
//      */
//     bool useDefenderDeploy;
//     /*
//      * When using OpenZeppelin Defender deployments, whether to skip verifying source code on block explorers. Defaults to `false`.
//      */
//     bool skipVerifySourceCode;
//     /*
//      * When using OpenZeppelin Defender deployments, the ID of the relayer to use for the deployment. Defaults to the relayer configured for your deployment environment on Defender.
//      */
//     string relayerId;
//     /*
//      * Applies to OpenZeppelin Defender deployments only.
//      * If this is not set, deployments will be performed using the CREATE opcode.
//      * If this is set, deployments will be performed using the CREATE2 opcode with the provided salt.
//      * Note that deployments using a Safe are done using CREATE2 and require a salt.
//      *
//      * WARNING: CREATE2 affects `msg.sender` behavior. See https://docs.openzeppelin.com/defender/v2/tutorial/deploy#deploy-caveat for more information.
//      */
//     bytes32 salt;
//     /*
//      * The ID of the upgrade approval process to use when proposing an upgrade.
//      * Defaults to the upgrade approval process configured for your deployment environment on Defender.
//      */
//     string upgradeApprovalProcessId;
//     /*
//      * License type to display on block explorers for verified source code.
//      * See https://etherscan.io/contract-license-types for supported values and use the string found in brackets, e.g. MIT.
//      * If not set, infers the license type by using the SPDX license identifier from the contract's Solidity file.
//      * Cannot be set if `skipLicenseType` or `skipVerifySourceCode` is `true`.
//      */
//     string licenseType;
//     /*
//      * If set to `true`, does not set the license type on block explorers for verified source code.
//      * Use this if your contract's license type is not supported by block explorers.
//      * Defaults to `false`.
//      */
//     bool skipLicenseType;
//     /*
//      * Transaction overrides for OpenZeppelin Defender deployments.
//      */
//     TxOverrides txOverrides;
// }

// /**
//  * Transaction overrides for OpenZeppelin Defender deployments.
//  */
// struct TxOverrides {
//     /*
//      * Maximum amount of gas to allow the deployment transaction to use.
//      */
//     uint256 gasLimit;
//     /*
//      * Gas price for legacy transactions, in wei.
//      */
//     uint256 gasPrice;
//     /*
//      * Maximum total fee per gas, in wei.
//      */
//     uint256 maxFeePerGas;
//     /*
//      * Maximum priority fee per gas, in wei.
//      */
//     uint256 maxPriorityFeePerGas;
// }

// // lib/openzeppelin-foundry-upgrades/src/internal/Versions.sol

// library Versions {
//     // TODO add a workflow to update this automatically based on package.json
//     string constant UPGRADES_CORE = "^1.32.3";
//     string constant DEFENDER_DEPLOY_CLIENT_CLI = "0.0.1-alpha.7";
// }

// // lib/openzeppelin-foundry-upgrades/src/internal/interfaces/IProxyAdmin.sol

// interface IProxyAdmin {
//     /**
//      * Upgrades a proxy to a new implementation without calling a function on the new implementation.
//      */
//     function upgrade(address, address) external;

//     /**
//      * Upgrades a proxy to a new implementation and calls a function on the new implementation.
//      * If UPGRADE_INTERFACE_VERSION is "5.0.0", bytes can be empty if no function should be called on the new implementation.
//      */
//     function upgradeAndCall(address, address, bytes memory) external payable;
// }

// // lib/openzeppelin-foundry-upgrades/src/internal/interfaces/IUpgradeableBeacon.sol

// interface IUpgradeableBeacon {
//     /**
//      * Upgrades the beacon to a new implementation.
//      */
//     function upgradeTo(address) external;
// }

// // lib/openzeppelin-foundry-upgrades/src/internal/interfaces/IUpgradeableProxy.sol

// interface IUpgradeableProxy {
//     /**
//      * Upgrades the proxy to a new implementation without calling a function on the new implementation.
//      */
//     function upgradeTo(address) external;

//     /**
//      * Upgrades the proxy to a new implementation and calls a function on the new implementation.
//      * If UPGRADE_INTERFACE_VERSION is "5.0.0", bytes can be empty if no function should be called on the new implementation.
//      */
//     function upgradeToAndCall(address, bytes memory) external payable;
// }

// // pkg/contracts/src/IRegistryFactory.sol

// interface IRegistryFactory {
//     function getGardensFeeReceiver() external view returns (address);

//     function getProtocolFee(address _community) external view returns (uint256);
// }

// // pkg/contracts/src/ISybilScorer.sol

// struct Strategy {
//     uint256 threshold;
//     bool active;
//     address councilSafe;
// }

// interface ISybilScorer {
//     function addUserScore(address _user, uint256 _score) external;
//     function removeUser(address _user) external;
//     function changeListManager(address _newManager) external;
//     function canExecuteAction(address _user, address _strategy) external view returns (bool);
//     function modifyThreshold(address _strategy, uint256 _newThreshold) external;
//     function addStrategy(address _strategy, uint256 _threshold, address _councilSafe) external;
//     function removeStrategy(address _strategy) external;
//     function activateStrategy(address _strategy) external;
// }

// // pkg/contracts/src/interfaces/ICollateralVault.sol

// interface ICollateralVault {
//     function initialize() external;

//     function depositCollateral(uint256 proposalId, address user) external payable;

//     function withdrawCollateral(uint256 _proposalId, address _user, uint256 _amount) external;

//     function withdrawCollateralFor(uint256 _proposalId, address _fromUser, address _toUser, uint256 _amount) external;
// }

// // pkg/contracts/src/interfaces/ISafe.sol

// interface ISafe {
//     function getOwners() external view returns (address[] memory);
//     function nonce() external view returns (uint256);
//     function setup(
//         address[] calldata _owners,
//         uint256 _threshold,
//         address to,
//         bytes calldata data,
//         address fallbackHandler,
//         address paymentToken,
//         uint256 payment,
//         address payable paymentReceiver
//     ) external;
//     function getTransactionHash(
//         address to,
//         uint256 value,
//         bytes calldata data,
//         Enum.Operation operation,
//         uint256 safeTxGas,
//         uint256 baseGas,
//         uint256 gasPrice,
//         address gasToken,
//         address refundReceiver,
//         uint256 _nonce
//     ) external view returns (bytes32);
//     function execTransaction(
//         address to,
//         uint256 value,
//         bytes calldata data,
//         Enum.Operation operation,
//         uint256 safeTxGas,
//         uint256 baseGas,
//         uint256 gasPrice,
//         address gasToken,
//         address payable refundReceiver,
//         bytes memory signatures
//     ) external payable returns (bool success);
//     function addOwnerWithThreshold(address owner, uint256 _threshold) external;
// }

// interface SafeProxyFactory {
//     function createProxyWithNonce(address _singleton, bytes memory initializer, uint256 saltNonce)
//         external
//         returns (address proxy);
// }

// abstract contract Enum {
//     enum Operation {
//         Call,
//         DelegateCall
//     }
// }

// // lib/allo-v2/contracts/core/interfaces/IRegistry.sol

// // Internal Libraries

// // ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣾⣿⣷⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣼⣿⣿⣷⣄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⣿⣿⣗⠀⠀⠀⢸⣿⣿⣿⡯⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
// // ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣿⣿⣿⣿⣷⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣼⣿⣿⣿⣿⣿⡄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⣿⣿⣗⠀⠀⠀⢸⣿⣿⣿⡯⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
// // ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⣿⣿⣿⣿⣿⡄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣸⣿⣿⣿⢿⣿⣿⣿⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⣿⣿⣗⠀⠀⠀⢸⣿⣿⣿⡯⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
// // ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠘⣿⣿⣿⣿⣿⣿⣿⣄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣰⣿⣿⣿⡟⠘⣿⣿⣿⣷⡀⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⣿⣿⣗⠀⠀⠀⢸⣿⣿⣿⡯⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
// // ⠀⠀⠀⠀⠀⠀⠀⠀⣀⣴⣾⣿⣿⣿⣿⣾⠻⣿⣿⣿⣿⣿⣿⣿⡆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢠⣿⣿⣿⡿⠀⠀⠸⣿⣿⣿⣧⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⣿⣿⣗⠀⠀⠀⢸⣿⣿⣿⡯⠀⠀⠀⠀⠀⠀⢀⣠⣴⣴⣶⣶⣶⣦⣦⣀⡀⠀⠀⠀⠀⠀⠀
// // ⠀⠀⠀⠀⠀⠀⠀⣴⣿⣿⣿⣿⣿⣿⡿⠃⠀⠙⣿⣿⣿⣿⣿⣿⣿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢠⣿⣿⣿⣿⠁⠀⠀⠀⢻⣿⣿⣿⣧⠀⠀⠀⠀⠀⠀⠀⢸⣿⣿⣿⣗⠀⠀⠀⢸⣿⣿⣿⡯⠀⠀⠀⠀⣠⣾⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣶⡀⠀⠀⠀⠀
// // ⠀⠀⠀⠀⠀⢀⣾⣿⣿⣿⣿⣿⣿⡿⠁⠀⠀⠀⠘⣿⣿⣿⣿⣿⡿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣾⣿⣿⣿⠃⠀⠀⠀⠀⠈⢿⣿⣿⣿⣆⠀⠀⠀⠀⠀⠀⢸⣿⣿⣿⣗⠀⠀⠀⢸⣿⣿⣿⡯⠀⠀⠀⣰⣿⣿⣿⡿⠋⠁⠀⠀⠈⠘⠹⣿⣿⣿⣿⣆⠀⠀⠀
// // ⠀⠀⠀⠀⢀⣾⣿⣿⣿⣿⣿⣿⡿⠀⠀⠀⠀⠀⠀⠈⢿⣿⣿⣿⠃⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣾⣿⣿⣿⠏⠀⠀⠀⠀⠀⠀⠘⣿⣿⣿⣿⡄⠀⠀⠀⠀⠀⢸⣿⣿⣿⣗⠀⠀⠀⢸⣿⣿⣿⡯⠀⠀⢰⣿⣿⣿⣿⠁⠀⠀⠀⠀⠀⠀⠀⠘⣿⣿⣿⣿⡀⠀⠀
// // ⠀⠀⠀⢠⣿⣿⣿⣿⣿⣿⣿⣟⠀⡀⢀⠀⡀⢀⠀⡀⢈⢿⡟⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣼⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡄⠀⠀⠀⠀⢸⣿⣿⣿⣗⠀⠀⠀⢸⣿⣿⣿⡯⠀⠀⢸⣿⣿⣿⣗⠀⠀⠀⠀⠀⠀⠀⠀⠀⣿⣿⣿⣿⡇⠀⠀
// // ⠀⠀⣠⣿⣿⣿⣿⣿⣿⡿⠋⢻⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣷⣶⣄⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣸⣿⣿⣿⡿⢿⠿⠿⠿⠿⠿⠿⠿⠿⠿⢿⣿⣿⣿⣷⡀⠀⠀⠀⢸⣿⣿⣿⣗⠀⠀⠀⢸⣿⣿⣿⡯⠀⠀⠸⣿⣿⣿⣷⡀⠀⠀⠀⠀⠀⠀⠀⢠⣿⣿⣿⣿⠂⠀⠀
// // ⠀⠀⠙⠛⠿⠻⠻⠛⠉⠀⠀⠈⢿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣷⣄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣰⣿⣿⣿⣿⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢿⣿⣿⣿⣧⠀⠀⠀⢸⣿⣿⣿⣗⠀⠀⠀⢸⣿⣿⣿⡯⠀⠀⠀⢻⣿⣿⣿⣷⣀⢀⠀⠀⠀⡀⣰⣾⣿⣿⣿⠏⠀⠀⠀
// // ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠛⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡄⠀⠀⠀⠀⠀⠀⠀⠀⠀⢰⣿⣿⣿⣿⠃⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠘⣿⣿⣿⣿⣧⠀⠀⢸⣿⣿⣿⣗⠀⠀⠀⢸⣿⣿⣿⡯⠀⠀⠀⠀⠹⢿⣿⣿⣿⣿⣾⣾⣷⣿⣿⣿⣿⡿⠋⠀⠀⠀⠀
// // ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠙⠙⠋⠛⠙⠋⠛⠙⠋⠛⠙⠋⠃⠀⠀⠀⠀⠀⠀⠀⠀⠠⠿⠻⠟⠿⠃⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠸⠟⠿⠟⠿⠆⠀⠸⠿⠿⠟⠯⠀⠀⠀⠸⠿⠿⠿⠏⠀⠀⠀⠀⠀⠈⠉⠻⠻⡿⣿⢿⡿⡿⠿⠛⠁⠀⠀⠀⠀⠀⠀
// //                    allo.gitcoin.co

// /// @title IRegistry Interface
// /// @author @thelostone-mc <aditya@gitcoin.co>, @0xKurt <kurt@gitcoin.co>, @codenamejason <jason@gitcoin.co>, @0xZakk <zakk@gitcoin.co>, @nfrgosselin <nate@gitcoin.co>
// /// @notice Interface for the Registry contract and exposes all functions needed to use the Registry
// ///         within the Allo protocol.
// /// @dev The Registry Interface is used to interact with the Allo protocol and create profiles
// ///      that can be used to interact with the Allo protocol. The Registry is the main contract
// ///      that all other contracts interact with to get the 'Profile' information needed to
// ///      interact with the Allo protocol. The Registry is also used to create new profiles
// ///      and update existing profiles. The Registry is also used to add and remove members
// ///      from a profile. The Registry will not always be used in a strategy and will depend on
// ///      the strategy being used.
// interface IRegistry {
//     /// ======================
//     /// ======= Structs ======
//     /// ======================

//     /// @dev The Profile struct that all profiles are based from
//     struct Profile {
//         bytes32 id;
//         uint256 nonce;
//         string name;
//         Metadata metadata;
//         address owner;
//         address anchor;
//     }

//     /// ======================
//     /// ======= Events =======
//     /// ======================

//     /// @dev Emitted when a profile is created. This will return your anchor address.
//     event ProfileCreated(
//         bytes32 indexed profileId, uint256 nonce, string name, Metadata metadata, address owner, address anchor
//     );

//     /// @dev Emitted when a profile name is updated. This will update the anchor when the name is updated and return it.
//     event ProfileNameUpdated(bytes32 indexed profileId, string name, address anchor);

//     /// @dev Emitted when a profile's metadata is updated.
//     event ProfileMetadataUpdated(bytes32 indexed profileId, Metadata metadata);

//     /// @dev Emitted when a profile owner is updated.
//     event ProfileOwnerUpdated(bytes32 indexed profileId, address owner);

//     /// @dev Emitted when a profile pending owner is updated.
//     event ProfilePendingOwnerUpdated(bytes32 indexed profileId, address pendingOwner);

//     /// =========================
//     /// ==== View Functions =====
//     /// =========================

//     /// @dev Returns the 'Profile' for a '_profileId' passed
//     /// @param _profileId The 'profileId' to return the 'Profile' for
//     /// @return profile The 'Profile' for the '_profileId' passed
//     function getProfileById(bytes32 _profileId) external view returns (Profile memory profile);

//     /// @dev Returns the 'Profile' for an '_anchor' passed
//     /// @param _anchor The 'anchor' to return the 'Profile' for
//     /// @return profile The 'Profile' for the '_anchor' passed
//     function getProfileByAnchor(address _anchor) external view returns (Profile memory profile);

//     /// @dev Returns a boolean if the '_account' is a member or owner of the '_profileId' passed in
//     /// @param _profileId The 'profileId' to check if the '_account' is a member or owner of
//     /// @param _account The 'account' to check if they are a member or owner of the '_profileId' passed in
//     /// @return isOwnerOrMemberOfProfile A boolean if the '_account' is a member or owner of the '_profileId' passed in
//     function isOwnerOrMemberOfProfile(bytes32 _profileId, address _account)
//         external
//         view
//         returns (bool isOwnerOrMemberOfProfile);

//     /// @dev Returns a boolean if the '_account' is an owner of the '_profileId' passed in
//     /// @param _profileId The 'profileId' to check if the '_account' is an owner of
//     /// @param _owner The 'owner' to check if they are an owner of the '_profileId' passed in
//     /// @return isOwnerOfProfile A boolean if the '_account' is an owner of the '_profileId' passed in
//     function isOwnerOfProfile(bytes32 _profileId, address _owner) external view returns (bool isOwnerOfProfile);

//     /// @dev Returns a boolean if the '_account' is a member of the '_profileId' passed in
//     /// @param _profileId The 'profileId' to check if the '_account' is a member of
//     /// @param _member The 'member' to check if they are a member of the '_profileId' passed in
//     /// @return isMemberOfProfile A boolean if the '_account' is a member of the '_profileId' passed in
//     function isMemberOfProfile(bytes32 _profileId, address _member) external view returns (bool isMemberOfProfile);

//     /// ====================================
//     /// ==== External/Public Functions =====
//     /// ====================================

//     /// @dev Creates a new 'Profile' and returns the 'profileId' of the new profile
//     ///
//     /// Note: The 'name' and 'nonce' are used to generate the 'anchor' address
//     ///
//     /// Requirements: None, anyone can create a new profile
//     ///
//     /// @param _nonce The nonce to use to generate the 'anchor' address
//     /// @param _name The name to use to generate the 'anchor' address
//     /// @param _metadata The 'Metadata' to use to generate the 'anchor' address
//     /// @param _owner The 'owner' to use to generate the 'anchor' address
//     /// @param _members The 'members' to use to generate the 'anchor' address
//     /// @return profileId The 'profileId' of the new profile
//     function createProfile(
//         uint256 _nonce,
//         string memory _name,
//         Metadata memory _metadata,
//         address _owner,
//         address[] memory _members
//     ) external returns (bytes32 profileId);

//     /// @dev Updates the 'name' of the '_profileId' passed in and returns the new 'anchor' address
//     ///
//     /// Requirements: Only the 'Profile' owner can update the name
//     ///
//     /// Note: The 'name' and 'nonce' are used to generate the 'anchor' address and this will update the 'anchor'
//     ///       so please use caution. You can always recreate your 'anchor' address by updating the name back
//     ///       to the original name used to create the profile.
//     ///
//     /// @param _profileId The 'profileId' to update the name for
//     /// @param _name The new 'name' value
//     /// @return anchor The new 'anchor' address
//     function updateProfileName(bytes32 _profileId, string memory _name) external returns (address anchor);

//     /// @dev Updates the 'Metadata' of the '_profileId' passed in
//     ///
//     /// Requirements: Only the 'Profile' owner can update the metadata
//     ///
//     /// @param _profileId The 'profileId' to update the metadata for
//     /// @param _metadata The new 'Metadata' value
//     function updateProfileMetadata(bytes32 _profileId, Metadata memory _metadata) external;

//     /// @dev Updates the pending 'owner' of the '_profileId' passed in
//     ///
//     /// Requirements: Only the 'Profile' owner can update the pending owner
//     ///
//     /// @param _profileId The 'profileId' to update the pending owner for
//     /// @param _pendingOwner The new pending 'owner' value
//     function updateProfilePendingOwner(bytes32 _profileId, address _pendingOwner) external;

//     /// @dev Accepts the pending 'owner' of the '_profileId' passed in
//     ///
//     /// Requirements: Only the pending owner can accept the ownership
//     ///
//     /// @param _profileId The 'profileId' to accept the ownership for
//     function acceptProfileOwnership(bytes32 _profileId) external;

//     /// @dev Adds members to the '_profileId' passed in
//     ///
//     /// Requirements: Only the 'Profile' owner can add members
//     ///
//     /// @param _profileId The 'profileId' to add members to
//     /// @param _members The members to add to the '_profileId' passed in
//     function addMembers(bytes32 _profileId, address[] memory _members) external;

//     /// @dev Removes members from the '_profileId' passed in
//     ///
//     /// Requirements: Only the 'Profile' owner can remove members
//     ///
//     /// @param _profileId The 'profileId' to remove members from
//     /// @param _members The members to remove from the '_profileId' passed in
//     function removeMembers(bytes32 _profileId, address[] memory _members) external;

//     /// @dev Recovers funds from the contract
//     ///
//     /// Requirements: Must be the Allo owner
//     ///
//     /// @param _token The token you want to use to recover funds
//     /// @param _recipient The recipient of the recovered funds
//     function recoverFunds(address _token, address _recipient) external;
// }

// // lib/allo-v2/contracts/core/libraries/Clone.sol

// // External Libraries

// // ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣾⣿⣷⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣼⣿⣿⣷⣄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⣿⣿⣗⠀⠀⠀⢸⣿⣿⣿⡯⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
// // ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣿⣿⣿⣿⣷⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣼⣿⣿⣿⣿⣿⡄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⣿⣿⣗⠀⠀⠀⢸⣿⣿⣿⡯⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
// // ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⣿⣿⣿⣿⣿⡄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣸⣿⣿⣿⢿⣿⣿⣿⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⣿⣿⣗⠀⠀⠀⢸⣿⣿⣿⡯⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
// // ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠘⣿⣿⣿⣿⣿⣿⣿⣄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣰⣿⣿⣿⡟⠘⣿⣿⣿⣷⡀⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⣿⣿⣗⠀⠀⠀⢸⣿⣿⣿⡯⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
// // ⠀⠀⠀⠀⠀⠀⠀⠀⣀⣴⣾⣿⣿⣿⣿⣾⠻⣿⣿⣿⣿⣿⣿⣿⡆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢠⣿⣿⣿⡿⠀⠀⠸⣿⣿⣿⣧⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⣿⣿⣗⠀⠀⠀⢸⣿⣿⣿⡯⠀⠀⠀⠀⠀⠀⢀⣠⣴⣴⣶⣶⣶⣦⣦⣀⡀⠀⠀⠀⠀⠀⠀
// // ⠀⠀⠀⠀⠀⠀⠀⣴⣿⣿⣿⣿⣿⣿⡿⠃⠀⠙⣿⣿⣿⣿⣿⣿⣿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢠⣿⣿⣿⣿⠁⠀⠀⠀⢻⣿⣿⣿⣧⠀⠀⠀⠀⠀⠀⠀⢸⣿⣿⣿⣗⠀⠀⠀⢸⣿⣿⣿⡯⠀⠀⠀⠀⣠⣾⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣶⡀⠀⠀⠀⠀
// // ⠀⠀⠀⠀⠀⢀⣾⣿⣿⣿⣿⣿⣿⡿⠁⠀⠀⠀⠘⣿⣿⣿⣿⣿⡿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣾⣿⣿⣿⠃⠀⠀⠀⠀⠈⢿⣿⣿⣿⣆⠀⠀⠀⠀⠀⠀⢸⣿⣿⣿⣗⠀⠀⠀⢸⣿⣿⣿⡯⠀⠀⠀⣰⣿⣿⣿⡿⠋⠁⠀⠀⠈⠘⠹⣿⣿⣿⣿⣆⠀⠀⠀
// // ⠀⠀⠀⠀⢀⣾⣿⣿⣿⣿⣿⣿⡿⠀⠀⠀⠀⠀⠀⠈⢿⣿⣿⣿⠃⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣾⣿⣿⣿⠏⠀⠀⠀⠀⠀⠀⠘⣿⣿⣿⣿⡄⠀⠀⠀⠀⠀⢸⣿⣿⣿⣗⠀⠀⠀⢸⣿⣿⣿⡯⠀⠀⢰⣿⣿⣿⣿⠁⠀⠀⠀⠀⠀⠀⠀⠘⣿⣿⣿⣿⡀⠀⠀
// // ⠀⠀⠀⢠⣿⣿⣿⣿⣿⣿⣿⣟⠀⡀⢀⠀⡀⢀⠀⡀⢈⢿⡟⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣼⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡄⠀⠀⠀⠀⢸⣿⣿⣿⣗⠀⠀⠀⢸⣿⣿⣿⡯⠀⠀⢸⣿⣿⣿⣗⠀⠀⠀⠀⠀⠀⠀⠀⠀⣿⣿⣿⣿⡇⠀⠀
// // ⠀⠀⣠⣿⣿⣿⣿⣿⣿⡿⠋⢻⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣷⣶⣄⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣸⣿⣿⣿⡿⢿⠿⠿⠿⠿⠿⠿⠿⠿⠿⢿⣿⣿⣿⣷⡀⠀⠀⠀⢸⣿⣿⣿⣗⠀⠀⠀⢸⣿⣿⣿⡯⠀⠀⠸⣿⣿⣿⣷⡀⠀⠀⠀⠀⠀⠀⠀⢠⣿⣿⣿⣿⠂⠀⠀
// // ⠀⠀⠙⠛⠿⠻⠻⠛⠉⠀⠀⠈⢿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣷⣄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣰⣿⣿⣿⣿⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢿⣿⣿⣿⣧⠀⠀⠀⢸⣿⣿⣿⣗⠀⠀⠀⢸⣿⣿⣿⡯⠀⠀⠀⢻⣿⣿⣿⣷⣀⢀⠀⠀⠀⡀⣰⣾⣿⣿⣿⠏⠀⠀⠀
// // ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠛⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡄⠀⠀⠀⠀⠀⠀⠀⠀⠀⢰⣿⣿⣿⣿⠃⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠘⣿⣿⣿⣿⣧⠀⠀⢸⣿⣿⣿⣗⠀⠀⠀⢸⣿⣿⣿⡯⠀⠀⠀⠀⠹⢿⣿⣿⣿⣿⣾⣾⣷⣿⣿⣿⣿⡿⠋⠀⠀⠀⠀
// // ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠙⠙⠋⠛⠙⠋⠛⠙⠋⠛⠙⠋⠃⠀⠀⠀⠀⠀⠀⠀⠀⠠⠿⠻⠟⠿⠃⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠸⠟⠿⠟⠿⠆⠀⠸⠿⠿⠟⠯⠀⠀⠀⠸⠿⠿⠿⠏⠀⠀⠀⠀⠀⠈⠉⠻⠻⡿⣿⢿⡿⡿⠿⠛⠁⠀⠀⠀⠀⠀⠀
// //                    allo.gitcoin.co

// /// @title Clone library
// /// @author @thelostone-mc <aditya@gitcoin.co>, @0xKurt <kurt@gitcoin.co>, @codenamejason <jason@gitcoin.co>, @0xZakk <zakk@gitcoin.co>, @nfrgosselin <nate@gitcoin.co>
// /// @notice A helper library to create deterministic clones of the strategy contracts when a pool is created
// /// @dev Handles the creation of clones for the strategy contracts and returns the address of the clone
// library Clone {
//     /// @dev Create a clone of the contract
//     /// @param _contract The address of the contract to clone
//     /// @param _nonce The nonce to use for the clone
//     function createClone(address _contract, uint256 _nonce) internal returns (address) {
//         bytes32 salt = keccak256(abi.encodePacked(msg.sender, _nonce));

//         // Return the address of the contract
//         return ClonesUpgradeable.cloneDeterministic(_contract, salt);
//     }
// }

// // lib/openzeppelin-contracts/contracts/proxy/utils/Initializable.sol

// // OpenZeppelin Contracts (last updated v4.9.0) (proxy/utils/Initializable.sol)

// /**
//  * @dev This is a base contract to aid in writing upgradeable contracts, or any kind of contract that will be deployed
//  * behind a proxy. Since proxied contracts do not make use of a constructor, it's common to move constructor logic to an
//  * external initializer function, usually called `initialize`. It then becomes necessary to protect this initializer
//  * function so it can only be called once. The {initializer} modifier provided by this contract will have this effect.
//  *
//  * The initialization functions use a version number. Once a version number is used, it is consumed and cannot be
//  * reused. This mechanism prevents re-execution of each "step" but allows the creation of new initialization steps in
//  * case an upgrade adds a module that needs to be initialized.
//  *
//  * For example:
//  *
//  * [.hljs-theme-light.nopadding]
//  * ```solidity
//  * contract MyToken is ERC20Upgradeable {
//  *     function initialize() initializer public {
//  *         __ERC20_init("MyToken", "MTK");
//  *     }
//  * }
//  *
//  * contract MyTokenV2 is MyToken, ERC20PermitUpgradeable {
//  *     function initializeV2() reinitializer(2) public {
//  *         __ERC20Permit_init("MyToken");
//  *     }
//  * }
//  * ```
//  *
//  * TIP: To avoid leaving the proxy in an uninitialized state, the initializer function should be called as early as
//  * possible by providing the encoded function call as the `_data` argument to {ERC1967Proxy-constructor}.
//  *
//  * CAUTION: When used with inheritance, manual care must be taken to not invoke a parent initializer twice, or to ensure
//  * that all initializers are idempotent. This is not verified automatically as constructors are by Solidity.
//  *
//  * [CAUTION]
//  * ====
//  * Avoid leaving a contract uninitialized.
//  *
//  * An uninitialized contract can be taken over by an attacker. This applies to both a proxy and its implementation
//  * contract, which may impact the proxy. To prevent the implementation contract from being used, you should invoke
//  * the {_disableInitializers} function in the constructor to automatically lock it when it is deployed:
//  *
//  * [.hljs-theme-light.nopadding]
//  * ```
//  * /// @custom:oz-upgrades-unsafe-allow constructor
//  * constructor() {
//  *     _disableInitializers();
//  * }
//  * ```
//  * ====
//  */
// abstract contract Initializable_0 {
//     /**
//      * @dev Indicates that the contract has been initialized.
//      * @custom:oz-retyped-from bool
//      */
//     uint8 private _initialized;

//     /**
//      * @dev Indicates that the contract is in the process of being initialized.
//      */
//     bool private _initializing;

//     /**
//      * @dev Triggered when the contract has been initialized or reinitialized.
//      */
//     event Initialized(uint8 version);

//     /**
//      * @dev A modifier that defines a protected initializer function that can be invoked at most once. In its scope,
//      * `onlyInitializing` functions can be used to initialize parent contracts.
//      *
//      * Similar to `reinitializer(1)`, except that functions marked with `initializer` can be nested in the context of a
//      * constructor.
//      *
//      * Emits an {Initialized} event.
//      */
//     modifier initializer() {
//         bool isTopLevelCall = !_initializing;
//         if(!((isTopLevelCall && _initialized < 1) || (!Address.isContract(address(this)) && _initialized == 1))){
//           revert();
//         }
//         // require(
//         //     ,
//         //     "Initializable: contract is already initialized"
//         // );
//         _initialized = 1;
//         if (isTopLevelCall) {
//             _initializing = true;
//         }
//         _;
//         if (isTopLevelCall) {
//             _initializing = false;
//             emit Initialized(1);
//         }
//     }

//     /**
//      * @dev A modifier that defines a protected reinitializer function that can be invoked at most once, and only if the
//      * contract hasn't been initialized to a greater version before. In its scope, `onlyInitializing` functions can be
//      * used to initialize parent contracts.
//      *
//      * A reinitializer may be used after the original initialization step. This is essential to configure modules that
//      * are added through upgrades and that require initialization.
//      *
//      * When `version` is 1, this modifier is similar to `initializer`, except that functions marked with `reinitializer`
//      * cannot be nested. If one is invoked in the context of another, execution will revert.
//      *
//      * Note that versions can jump in increments greater than 1; this implies that if multiple reinitializers coexist in
//      * a contract, executing them in the right order is up to the developer or operator.
//      *
//      * WARNING: setting the version to 255 will prevent any future reinitialization.
//      *
//      * Emits an {Initialized} event.
//      */
//     modifier reinitializer(uint8 version) {
//         if(!(!_initializing && _initialized < version)){
//           revert();
//         }
//         // require(!_initializing && _initialized < version, "Initializable: contract is already initialized");
//         _initialized = version;
//         _initializing = true;
//         _;
//         _initializing = false;
//         emit Initialized(version);
//     }

//     /**
//      * @dev Modifier to protect an initialization function so that it can only be invoked by functions with the
//      * {initializer} and {reinitializer} modifiers, directly or indirectly.
//      */
//     modifier onlyInitializing() {
//       if(!_initializing){
//         revert();
//       }
//         // require(_initializing, "Initializable: contract is not initializing");
//         _;
//     }

//     /**
//      * @dev Locks the contract, preventing any future reinitialization. This cannot be part of an initializer call.
//      * Calling this in the constructor of a contract will prevent that contract from being initialized or reinitialized
//      * to any version. It is recommended to use this to lock implementation contracts that are designed to be called
//      * through proxies.
//      *
//      * Emits an {Initialized} event the first time it is successfully executed.
//      */
//     function _disableInitializers() internal virtual {
//       if(_initializing) {
//         revert();
//       }
//         // require(!_initializing, "Initializable: contract is initializing");
//         if (_initialized != type(uint8).max) {
//             _initialized = type(uint8).max;
//             emit Initialized(type(uint8).max);
//         }
//     }

//     /**
//      * @dev Returns the highest version that has been initialized. See {reinitializer}.
//      */
//     function _getInitializedVersion() internal view returns (uint8) {
//         return _initialized;
//     }

//     /**
//      * @dev Returns `true` if the contract is currently initializing. See {onlyInitializing}.
//      */
//     function _isInitializing() internal view returns (bool) {
//         return _initializing;
//     }
// }

// // lib/openzeppelin-contracts/contracts/token/ERC20/extensions/IERC20Metadata.sol

// // OpenZeppelin Contracts v4.4.1 (token/ERC20/extensions/IERC20Metadata.sol)

// /**
//  * @dev Interface for the optional metadata functions from the ERC20 standard.
//  *
//  * _Available since v4.1._
//  */
// interface IERC20Metadata is IERC20 {
//     /**
//      * @dev Returns the name of the token.
//      */
//     function name() external view returns (string memory);

//     /**
//      * @dev Returns the symbol of the token.
//      */
//     function symbol() external view returns (string memory);

//     /**
//      * @dev Returns the decimals places of the token.
//      */
//     function decimals() external view returns (uint8);
// }

// // lib/openzeppelin-contracts/contracts/utils/introspection/ERC165.sol

// // OpenZeppelin Contracts v4.4.1 (utils/introspection/ERC165.sol)

// /**
//  * @dev Implementation of the {IERC165} interface.
//  *
//  * Contracts that want to implement ERC165 should inherit from this contract and override {supportsInterface} to check
//  * for the additional interface id that will be supported. For example:
//  *
//  * ```solidity
//  * function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
//  *     return interfaceId == type(MyInterface).interfaceId || super.supportsInterface(interfaceId);
//  * }
//  * ```
//  *
//  * Alternatively, {ERC165Storage} provides an easier to use but more expensive implementation.
//  */
// abstract contract ERC165 is IERC165 {
//     /**
//      * @dev See {IERC165-supportsInterface}.
//      */
//     function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
//         return interfaceId == type(IERC165).interfaceId;
//     }
// }

// // lib/openzeppelin-contracts/contracts/utils/introspection/ERC165Checker.sol

// // OpenZeppelin Contracts (last updated v4.9.0) (utils/introspection/ERC165Checker.sol)

// /**
//  * @dev Library used to query support of an interface declared via {IERC165}.
//  *
//  * Note that these functions return the actual result of the query: they do not
//  * `revert` if an interface is not supported. It is up to the caller to decide
//  * what to do in these cases.
//  */
// library ERC165Checker {
//     // As per the EIP-165 spec, no interface should ever match 0xffffffff
//     bytes4 private constant _INTERFACE_ID_INVALID = 0xffffffff;

//     /**
//      * @dev Returns true if `account` supports the {IERC165} interface.
//      */
//     function supportsERC165(address account) internal view returns (bool) {
//         // Any contract that implements ERC165 must explicitly indicate support of
//         // InterfaceId_ERC165 and explicitly indicate non-support of InterfaceId_Invalid
//         return
//             supportsERC165InterfaceUnchecked(account, type(IERC165).interfaceId) &&
//             !supportsERC165InterfaceUnchecked(account, _INTERFACE_ID_INVALID);
//     }

//     /**
//      * @dev Returns true if `account` supports the interface defined by
//      * `interfaceId`. Support for {IERC165} itself is queried automatically.
//      *
//      * See {IERC165-supportsInterface}.
//      */
//     function supportsInterface(address account, bytes4 interfaceId) internal view returns (bool) {
//         // query support of both ERC165 as per the spec and support of _interfaceId
//         return supportsERC165(account) && supportsERC165InterfaceUnchecked(account, interfaceId);
//     }

//     /**
//      * @dev Returns a boolean array where each value corresponds to the
//      * interfaces passed in and whether they're supported or not. This allows
//      * you to batch check interfaces for a contract where your expectation
//      * is that some interfaces may not be supported.
//      *
//      * See {IERC165-supportsInterface}.
//      *
//      * _Available since v3.4._
//      */
//     function getSupportedInterfaces(
//         address account,
//         bytes4[] memory interfaceIds
//     ) internal view returns (bool[] memory) {
//         // an array of booleans corresponding to interfaceIds and whether they're supported or not
//         bool[] memory interfaceIdsSupported = new bool[](interfaceIds.length);

//         // query support of ERC165 itself
//         if (supportsERC165(account)) {
//             // query support of each interface in interfaceIds
//             for (uint256 i = 0; i < interfaceIds.length; i++) {
//                 interfaceIdsSupported[i] = supportsERC165InterfaceUnchecked(account, interfaceIds[i]);
//             }
//         }

//         return interfaceIdsSupported;
//     }

//     /**
//      * @dev Returns true if `account` supports all the interfaces defined in
//      * `interfaceIds`. Support for {IERC165} itself is queried automatically.
//      *
//      * Batch-querying can lead to gas savings by skipping repeated checks for
//      * {IERC165} support.
//      *
//      * See {IERC165-supportsInterface}.
//      */
//     function supportsAllInterfaces(address account, bytes4[] memory interfaceIds) internal view returns (bool) {
//         // query support of ERC165 itself
//         if (!supportsERC165(account)) {
//             return false;
//         }

//         // query support of each interface in interfaceIds
//         for (uint256 i = 0; i < interfaceIds.length; i++) {
//             if (!supportsERC165InterfaceUnchecked(account, interfaceIds[i])) {
//                 return false;
//             }
//         }

//         // all interfaces supported
//         return true;
//     }

//     /**
//      * @notice Query if a contract implements an interface, does not check ERC165 support
//      * @param account The address of the contract to query for support of an interface
//      * @param interfaceId The interface identifier, as specified in ERC-165
//      * @return true if the contract at account indicates support of the interface with
//      * identifier interfaceId, false otherwise
//      * @dev Assumes that account contains a contract that supports ERC165, otherwise
//      * the behavior of this method is undefined. This precondition can be checked
//      * with {supportsERC165}.
//      *
//      * Some precompiled contracts will falsely indicate support for a given interface, so caution
//      * should be exercised when using this function.
//      *
//      * Interface identification is specified in ERC-165.
//      */
//     function supportsERC165InterfaceUnchecked(address account, bytes4 interfaceId) internal view returns (bool) {
//         // prepare call
//         bytes memory encodedParams = abi.encodeWithSelector(IERC165.supportsInterface.selector, interfaceId);

//         // perform static call
//         bool success;
//         uint256 returnSize;
//         uint256 returnValue;
//         assembly {
//             success := staticcall(30000, account, add(encodedParams, 0x20), mload(encodedParams), 0x00, 0x20)
//             returnSize := returndatasize()
//             returnValue := mload(0x00)
//         }

//         return success && returnSize >= 0x20 && returnValue > 0;
//     }
// }

// // lib/openzeppelin-contracts-upgradeable/contracts/proxy/utils/Initializable.sol

// // OpenZeppelin Contracts (last updated v4.9.0) (proxy/utils/Initializable.sol)

// /**
//  * @dev This is a base contract to aid in writing upgradeable contracts, or any kind of contract that will be deployed
//  * behind a proxy. Since proxied contracts do not make use of a constructor, it's common to move constructor logic to an
//  * external initializer function, usually called `initialize`. It then becomes necessary to protect this initializer
//  * function so it can only be called once. The {initializer} modifier provided by this contract will have this effect.
//  *
//  * The initialization functions use a version number. Once a version number is used, it is consumed and cannot be
//  * reused. This mechanism prevents re-execution of each "step" but allows the creation of new initialization steps in
//  * case an upgrade adds a module that needs to be initialized.
//  *
//  * For example:
//  *
//  * [.hljs-theme-light.nopadding]
//  * ```solidity
//  * contract MyToken is ERC20Upgradeable {
//  *     function initialize() initializer public {
//  *         __ERC20_init("MyToken", "MTK");
//  *     }
//  * }
//  *
//  * contract MyTokenV2 is MyToken, ERC20PermitUpgradeable {
//  *     function initializeV2() reinitializer(2) public {
//  *         __ERC20Permit_init("MyToken");
//  *     }
//  * }
//  * ```
//  *
//  * TIP: To avoid leaving the proxy in an uninitialized state, the initializer function should be called as early as
//  * possible by providing the encoded function call as the `_data` argument to {ERC1967Proxy-constructor}.
//  *
//  * CAUTION: When used with inheritance, manual care must be taken to not invoke a parent initializer twice, or to ensure
//  * that all initializers are idempotent. This is not verified automatically as constructors are by Solidity.
//  *
//  * [CAUTION]
//  * ====
//  * Avoid leaving a contract uninitialized.
//  *
//  * An uninitialized contract can be taken over by an attacker. This applies to both a proxy and its implementation
//  * contract, which may impact the proxy. To prevent the implementation contract from being used, you should invoke
//  * the {_disableInitializers} function in the constructor to automatically lock it when it is deployed:
//  *
//  * [.hljs-theme-light.nopadding]
//  * ```
//  * /// @custom:oz-upgrades-unsafe-allow constructor
//  * constructor() {
//  *     _disableInitializers();
//  * }
//  * ```
//  * ====
//  */
// abstract contract Initializable_1 {
//     /**
//      * @dev Indicates that the contract has been initialized.
//      * @custom:oz-retyped-from bool
//      */
//     uint8 private _initialized;

//     /**
//      * @dev Indicates that the contract is in the process of being initialized.
//      */
//     bool private _initializing;

//     /**
//      * @dev Triggered when the contract has been initialized or reinitialized.
//      */
//     event Initialized(uint8 version);

//     /**
//      * @dev A modifier that defines a protected initializer function that can be invoked at most once. In its scope,
//      * `onlyInitializing` functions can be used to initialize parent contracts.
//      *
//      * Similar to `reinitializer(1)`, except that functions marked with `initializer` can be nested in the context of a
//      * constructor.
//      *
//      * Emits an {Initialized} event.
//      */
//     modifier initializer() {
//         bool isTopLevelCall = !_initializing;
//         if(!((isTopLevelCall && _initialized < 1) || (!AddressUpgradeable.isContract(address(this)) && _initialized == 1))){
//           revert();
//         }
//         // require(
//         //     ,
//         //     "Initializable: contract is already initialized"
//         // );
//         _initialized = 1;
//         if (isTopLevelCall) {
//             _initializing = true;
//         }
//         _;
//         if (isTopLevelCall) {
//             _initializing = false;
//             emit Initialized(1);
//         }
//     }

//     /**
//      * @dev A modifier that defines a protected reinitializer function that can be invoked at most once, and only if the
//      * contract hasn't been initialized to a greater version before. In its scope, `onlyInitializing` functions can be
//      * used to initialize parent contracts.
//      *
//      * A reinitializer may be used after the original initialization step. This is essential to configure modules that
//      * are added through upgrades and that require initialization.
//      *
//      * When `version` is 1, this modifier is similar to `initializer`, except that functions marked with `reinitializer`
//      * cannot be nested. If one is invoked in the context of another, execution will revert.
//      *
//      * Note that versions can jump in increments greater than 1; this implies that if multiple reinitializers coexist in
//      * a contract, executing them in the right order is up to the developer or operator.
//      *
//      * WARNING: setting the version to 255 will prevent any future reinitialization.
//      *
//      * Emits an {Initialized} event.
//      */
//     modifier reinitializer(uint8 version) {
//         require(!_initializing && _initialized < version, "Initializable: contract is already initialized");
//         _initialized = version;
//         _initializing = true;
//         _;
//         _initializing = false;
//         emit Initialized(version);
//     }

//     /**
//      * @dev Modifier to protect an initialization function so that it can only be invoked by functions with the
//      * {initializer} and {reinitializer} modifiers, directly or indirectly.
//      */
//     modifier onlyInitializing() {
//         require(_initializing, "Initializable: contract is not initializing");
//         _;
//     }

//     /**
//      * @dev Locks the contract, preventing any future reinitialization. This cannot be part of an initializer call.
//      * Calling this in the constructor of a contract will prevent that contract from being initialized or reinitialized
//      * to any version. It is recommended to use this to lock implementation contracts that are designed to be called
//      * through proxies.
//      *
//      * Emits an {Initialized} event the first time it is successfully executed.
//      */
//     function _disableInitializers() internal virtual {
//         require(!_initializing, "Initializable: contract is initializing");
//         if (_initialized != type(uint8).max) {
//             _initialized = type(uint8).max;
//             emit Initialized(type(uint8).max);
//         }
//     }

//     /**
//      * @dev Returns the highest version that has been initialized. See {reinitializer}.
//      */
//     function _getInitializedVersion() internal view returns (uint8) {
//         return _initialized;
//     }

//     /**
//      * @dev Returns `true` if the contract is currently initializing. See {onlyInitializing}.
//      */
//     function _isInitializing() internal view returns (bool) {
//         return _initializing;
//     }
// }

// // lib/allo-v2/contracts/core/libraries/Transfer.sol

// // External Libraries

// // Internal Libraries

// // ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣾⣿⣷⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣼⣿⣿⣷⣄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⣿⣿⣗⠀⠀⠀⢸⣿⣿⣿⡯⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
// // ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣿⣿⣿⣿⣷⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣼⣿⣿⣿⣿⣿⡄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⣿⣿⣗⠀⠀⠀⢸⣿⣿⣿⡯⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
// // ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⣿⣿⣿⣿⣿⡄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣸⣿⣿⣿⢿⣿⣿⣿⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⣿⣿⣗⠀⠀⠀⢸⣿⣿⣿⡯⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
// // ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠘⣿⣿⣿⣿⣿⣿⣿⣄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣰⣿⣿⣿⡟⠘⣿⣿⣿⣷⡀⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⣿⣿⣗⠀⠀⠀⢸⣿⣿⣿⡯⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
// // ⠀⠀⠀⠀⠀⠀⠀⠀⣀⣴⣾⣿⣿⣿⣿⣾⠻⣿⣿⣿⣿⣿⣿⣿⡆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢠⣿⣿⣿⡿⠀⠀⠸⣿⣿⣿⣧⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⣿⣿⣗⠀⠀⠀⢸⣿⣿⣿⡯⠀⠀⠀⠀⠀⠀⢀⣠⣴⣴⣶⣶⣶⣦⣦⣀⡀⠀⠀⠀⠀⠀⠀
// // ⠀⠀⠀⠀⠀⠀⠀⣴⣿⣿⣿⣿⣿⣿⡿⠃⠀⠙⣿⣿⣿⣿⣿⣿⣿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢠⣿⣿⣿⣿⠁⠀⠀⠀⢻⣿⣿⣿⣧⠀⠀⠀⠀⠀⠀⠀⢸⣿⣿⣿⣗⠀⠀⠀⢸⣿⣿⣿⡯⠀⠀⠀⠀⣠⣾⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣶⡀⠀⠀⠀⠀
// // ⠀⠀⠀⠀⠀⢀⣾⣿⣿⣿⣿⣿⣿⡿⠁⠀⠀⠀⠘⣿⣿⣿⣿⣿⡿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣾⣿⣿⣿⠃⠀⠀⠀⠀⠈⢿⣿⣿⣿⣆⠀⠀⠀⠀⠀⠀⢸⣿⣿⣿⣗⠀⠀⠀⢸⣿⣿⣿⡯⠀⠀⠀⣰⣿⣿⣿⡿⠋⠁⠀⠀⠈⠘⠹⣿⣿⣿⣿⣆⠀⠀⠀
// // ⠀⠀⠀⠀⢀⣾⣿⣿⣿⣿⣿⣿⡿⠀⠀⠀⠀⠀⠀⠈⢿⣿⣿⣿⠃⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣾⣿⣿⣿⠏⠀⠀⠀⠀⠀⠀⠘⣿⣿⣿⣿⡄⠀⠀⠀⠀⠀⢸⣿⣿⣿⣗⠀⠀⠀⢸⣿⣿⣿⡯⠀⠀⢰⣿⣿⣿⣿⠁⠀⠀⠀⠀⠀⠀⠀⠘⣿⣿⣿⣿⡀⠀⠀
// // ⠀⠀⠀⢠⣿⣿⣿⣿⣿⣿⣿⣟⠀⡀⢀⠀⡀⢀⠀⡀⢈⢿⡟⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣼⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡄⠀⠀⠀⠀⢸⣿⣿⣿⣗⠀⠀⠀⢸⣿⣿⣿⡯⠀⠀⢸⣿⣿⣿⣗⠀⠀⠀⠀⠀⠀⠀⠀⠀⣿⣿⣿⣿⡇⠀⠀
// // ⠀⠀⣠⣿⣿⣿⣿⣿⣿⡿⠋⢻⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣷⣶⣄⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣸⣿⣿⣿⡿⢿⠿⠿⠿⠿⠿⠿⠿⠿⠿⢿⣿⣿⣿⣷⡀⠀⠀⠀⢸⣿⣿⣿⣗⠀⠀⠀⢸⣿⣿⣿⡯⠀⠀⠸⣿⣿⣿⣷⡀⠀⠀⠀⠀⠀⠀⠀⢠⣿⣿⣿⣿⠂⠀⠀
// // ⠀⠀⠙⠛⠿⠻⠻⠛⠉⠀⠀⠈⢿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣷⣄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣰⣿⣿⣿⣿⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢿⣿⣿⣿⣧⠀⠀⠀⢸⣿⣿⣿⣗⠀⠀⠀⢸⣿⣿⣿⡯⠀⠀⠀⢻⣿⣿⣿⣷⣀⢀⠀⠀⠀⡀⣰⣾⣿⣿⣿⠏⠀⠀⠀
// // ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠛⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡄⠀⠀⠀⠀⠀⠀⠀⠀⠀⢰⣿⣿⣿⣿⠃⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠘⣿⣿⣿⣿⣧⠀⠀⢸⣿⣿⣿⣗⠀⠀⠀⢸⣿⣿⣿⡯⠀⠀⠀⠀⠹⢿⣿⣿⣿⣿⣾⣾⣷⣿⣿⣿⣿⡿⠋⠀⠀⠀⠀
// // ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠙⠙⠋⠛⠙⠋⠛⠙⠋⠛⠙⠋⠃⠀⠀⠀⠀⠀⠀⠀⠀⠠⠿⠻⠟⠿⠃⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠸⠟⠿⠟⠿⠆⠀⠸⠿⠿⠟⠯⠀⠀⠀⠸⠿⠿⠿⠏⠀⠀⠀⠀⠀⠈⠉⠻⠻⡿⣿⢿⡿⡿⠿⠛⠁⠀⠀⠀⠀⠀⠀
// //                    allo.gitcoin.co

// /// @title Transfer contract
// /// @author @thelostone-mc <aditya@gitcoin.co>, @0xKurt <kurt@gitcoin.co>, @codenamejason <jason@gitcoin.co>, @0xZakk <zakk@gitcoin.co>, @nfrgosselin <nate@gitcoin.co>
// /// @notice A helper contract to transfer tokens within Allo protocol
// /// @dev Handles the transfer of tokens to an address
// contract Transfer is Native {
//     /// @notice Thrown when the amount of tokens sent does not match the amount of tokens expected
//     error AMOUNT_MISMATCH();

//     /// @notice This holds the details for a transfer
//     struct TransferData {
//         address from;
//         address to;
//         uint256 amount;
//     }

//     /// @notice Transfer an amount of a token to an array of addresses
//     /// @param _token The address of the token
//     /// @param _transferData TransferData[]
//     /// @return Whether the transfer was successful or not
//     function _transferAmountsFrom(address _token, TransferData[] memory _transferData) internal returns (bool) {
//         uint256 msgValue = msg.value;

//         for (uint256 i; i < _transferData.length;) {
//             TransferData memory transferData = _transferData[i];

//             if (_token == NATIVE) {
//                 msgValue -= transferData.amount;
//                 SafeTransferLib.safeTransferETH(transferData.to, transferData.amount);
//             } else {
//                 SafeTransferLib.safeTransferFrom(_token, transferData.from, transferData.to, transferData.amount);
//             }

//             unchecked {
//                 i++;
//             }
//         }

//         if (msgValue != 0) revert AMOUNT_MISMATCH();

//         return true;
//     }

//     /// @notice Transfer an amount of a token to an address
//     /// @param _token The address of the token
//     /// @param _transferData Individual TransferData
//     /// @return Whether the transfer was successful or not
//     function _transferAmountFrom(address _token, TransferData memory _transferData) internal returns (bool) {
//         uint256 amount = _transferData.amount;
//         if (_token == NATIVE) {
//             // Native Token
//             if (msg.value < amount) revert AMOUNT_MISMATCH();

//             SafeTransferLib.safeTransferETH(_transferData.to, amount);
//         } else {
//             SafeTransferLib.safeTransferFrom(_token, _transferData.from, _transferData.to, amount);
//         }
//         return true;
//     }

//     /// @notice Transfer an amount of a token to an address
//     /// @param _token The token to transfer
//     /// @param _to The address to transfer to
//     /// @param _amount The amount to transfer
//     function _transferAmount(address _token, address _to, uint256 _amount) internal {
//         if (_token == NATIVE) {
//             SafeTransferLib.safeTransferETH(_to, _amount);
//         } else {
//             SafeTransferLib.safeTransfer(_token, _to, _amount);
//         }
//     }

//     /// @notice Get the balance of a token for an account
//     /// @param _token The token to get the balance of
//     /// @param _account The account to get the balance for
//     /// @return The balance of the token for the account
//     function _getBalance(address _token, address _account) internal view returns (uint256) {
//         if (_token == NATIVE) {
//             return payable(_account).balance;
//         } else {
//             return SafeTransferLib.balanceOf(_token, _account);
//         }
//     }
// }

// // lib/openzeppelin-contracts/contracts/utils/Strings.sol

// // OpenZeppelin Contracts (last updated v4.9.0) (utils/Strings.sol)

// /**
//  * @dev String operations.
//  */
// library Strings {
//     bytes16 private constant _SYMBOLS = "0123456789abcdef";
//     uint8 private constant _ADDRESS_LENGTH = 20;

//     /**
//      * @dev Converts a `uint256` to its ASCII `string` decimal representation.
//      */
//     function toString(uint256 value) internal pure returns (string memory) {
//         unchecked {
//             uint256 length = Math.log10(value) + 1;
//             string memory buffer = new string(length);
//             uint256 ptr;
//             /// @solidity memory-safe-assembly
//             assembly {
//                 ptr := add(buffer, add(32, length))
//             }
//             while (true) {
//                 ptr--;
//                 /// @solidity memory-safe-assembly
//                 assembly {
//                     mstore8(ptr, byte(mod(value, 10), _SYMBOLS))
//                 }
//                 value /= 10;
//                 if (value == 0) break;
//             }
//             return buffer;
//         }
//     }

//     /**
//      * @dev Converts a `int256` to its ASCII `string` decimal representation.
//      */
//     function toString(int256 value) internal pure returns (string memory) {
//         return string(abi.encodePacked(value < 0 ? "-" : "", toString(SignedMath.abs(value))));
//     }

//     /**
//      * @dev Converts a `uint256` to its ASCII `string` hexadecimal representation.
//      */
//     function toHexString(uint256 value) internal pure returns (string memory) {
//         unchecked {
//             return toHexString(value, Math.log256(value) + 1);
//         }
//     }

//     /**
//      * @dev Converts a `uint256` to its ASCII `string` hexadecimal representation with fixed length.
//      */
//     function toHexString(uint256 value, uint256 length) internal pure returns (string memory) {
//         bytes memory buffer = new bytes(2 * length + 2);
//         buffer[0] = "0";
//         buffer[1] = "x";
//         for (uint256 i = 2 * length + 1; i > 1; --i) {
//             buffer[i] = _SYMBOLS[value & 0xf];
//             value >>= 4;
//         }
//         require(value == 0, "Strings: hex length insufficient");
//         return string(buffer);
//     }

//     /**
//      * @dev Converts an `address` with fixed length of 20 bytes to its not checksummed ASCII `string` hexadecimal representation.
//      */
//     function toHexString(address addr) internal pure returns (string memory) {
//         return toHexString(uint256(uint160(addr)), _ADDRESS_LENGTH);
//     }

//     /**
//      * @dev Returns true if the two strings are equal.
//      */
//     function equal(string memory a, string memory b) internal pure returns (bool) {
//         return keccak256(bytes(a)) == keccak256(bytes(b));
//     }
// }

// // lib/openzeppelin-contracts-upgradeable/contracts/security/ReentrancyGuardUpgradeable.sol

// // OpenZeppelin Contracts (last updated v4.9.0) (security/ReentrancyGuard.sol)

// /**
//  * @dev Contract module that helps prevent reentrant calls to a function.
//  *
//  * Inheriting from `ReentrancyGuard` will make the {nonReentrant} modifier
//  * available, which can be applied to functions to make sure there are no nested
//  * (reentrant) calls to them.
//  *
//  * Note that because there is a single `nonReentrant` guard, functions marked as
//  * `nonReentrant` may not call one another. This can be worked around by making
//  * those functions `private`, and then adding `external` `nonReentrant` entry
//  * points to them.
//  *
//  * TIP: If you would like to learn more about reentrancy and alternative ways
//  * to protect against it, check out our blog post
//  * https://blog.openzeppelin.com/reentrancy-after-istanbul/[Reentrancy After Istanbul].
//  */
// abstract contract ReentrancyGuardUpgradeable is Initializable_1 {
//     // Booleans are more expensive than uint256 or any type that takes up a full
//     // word because each write operation emits an extra SLOAD to first read the
//     // slot's contents, replace the bits taken up by the boolean, and then write
//     // back. This is the compiler's defense against contract upgrades and
//     // pointer aliasing, and it cannot be disabled.

//     // The values being non-zero value makes deployment a bit more expensive,
//     // but in exchange the refund on every call to nonReentrant will be lower in
//     // amount. Since refunds are capped to a percentage of the total
//     // transaction's gas, it is best to keep them low in cases like this one, to
//     // increase the likelihood of the full refund coming into effect.
//     uint256 private constant _NOT_ENTERED = 1;
//     uint256 private constant _ENTERED = 2;

//     uint256 private _status;

//     function __ReentrancyGuard_init() internal onlyInitializing {
//         __ReentrancyGuard_init_unchained();
//     }

//     function __ReentrancyGuard_init_unchained() internal onlyInitializing {
//         _status = _NOT_ENTERED;
//     }

//     /**
//      * @dev Prevents a contract from calling itself, directly or indirectly.
//      * Calling a `nonReentrant` function from another `nonReentrant`
//      * function is not supported. It is possible to prevent this from happening
//      * by making the `nonReentrant` function external, and making it call a
//      * `private` function that does the actual work.
//      */
//     modifier nonReentrant() {
//         _nonReentrantBefore();
//         _;
//         _nonReentrantAfter();
//     }

//     function _nonReentrantBefore() private {
//         // On the first call to nonReentrant, _status will be _NOT_ENTERED
//         require(_status != _ENTERED, "ReentrancyGuard: reentrant call");

//         // Any calls to nonReentrant after this point will fail
//         _status = _ENTERED;
//     }

//     function _nonReentrantAfter() private {
//         // By storing the original value once again, a refund is triggered (see
//         // https://eips.ethereum.org/EIPS/eip-2200)
//         _status = _NOT_ENTERED;
//     }

//     /**
//      * @dev Returns true if the reentrancy guard is currently set to "entered", which indicates there is a
//      * `nonReentrant` function in the call stack.
//      */
//     function _reentrancyGuardEntered() internal view returns (bool) {
//         return _status == _ENTERED;
//     }

//     /**
//      * @dev This empty reserved space is put in place to allow future versions to add new
//      * variables without shifting down storage in the inheritance chain.
//      * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
//      */
//     uint256[49] private __gap;
// }

// // lib/openzeppelin-contracts-upgradeable/contracts/utils/ContextUpgradeable.sol

// // OpenZeppelin Contracts (last updated v4.9.4) (utils/Context.sol)

// /**
//  * @dev Provides information about the current execution context, including the
//  * sender of the transaction and its data. While these are generally available
//  * via msg.sender and msg.data, they should not be accessed in such a direct
//  * manner, since when dealing with meta-transactions the account sending and
//  * paying for execution may not be the actual sender (as far as an application
//  * is concerned).
//  *
//  * This contract is only required for intermediate, library-like contracts.
//  */
// abstract contract ContextUpgradeable is Initializable_1 {
//     function __Context_init() internal onlyInitializing {
//     }

//     function __Context_init_unchained() internal onlyInitializing {
//     }
//     function _msgSender() internal view virtual returns (address) {
//         return msg.sender;
//     }

//     function _msgData() internal view virtual returns (bytes calldata) {
//         return msg.data;
//     }

//     function _contextSuffixLength() internal view virtual returns (uint256) {
//         return 0;
//     }

//     /**
//      * @dev This empty reserved space is put in place to allow future versions to add new
//      * variables without shifting down storage in the inheritance chain.
//      * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
//      */
//     uint256[50] private __gap;
// }

// // lib/openzeppelin-contracts-upgradeable/contracts/utils/StringsUpgradeable.sol

// // OpenZeppelin Contracts (last updated v4.9.0) (utils/Strings.sol)

// /**
//  * @dev String operations.
//  */
// library StringsUpgradeable {
//     bytes16 private constant _SYMBOLS = "0123456789abcdef";
//     uint8 private constant _ADDRESS_LENGTH = 20;

//     /**
//      * @dev Converts a `uint256` to its ASCII `string` decimal representation.
//      */
//     function toString(uint256 value) internal pure returns (string memory) {
//         unchecked {
//             uint256 length = MathUpgradeable.log10(value) + 1;
//             string memory buffer = new string(length);
//             uint256 ptr;
//             /// @solidity memory-safe-assembly
//             assembly {
//                 ptr := add(buffer, add(32, length))
//             }
//             while (true) {
//                 ptr--;
//                 /// @solidity memory-safe-assembly
//                 assembly {
//                     mstore8(ptr, byte(mod(value, 10), _SYMBOLS))
//                 }
//                 value /= 10;
//                 if (value == 0) break;
//             }
//             return buffer;
//         }
//     }

//     /**
//      * @dev Converts a `int256` to its ASCII `string` decimal representation.
//      */
//     function toString(int256 value) internal pure returns (string memory) {
//         return string(abi.encodePacked(value < 0 ? "-" : "", toString(SignedMathUpgradeable.abs(value))));
//     }

//     /**
//      * @dev Converts a `uint256` to its ASCII `string` hexadecimal representation.
//      */
//     function toHexString(uint256 value) internal pure returns (string memory) {
//         unchecked {
//             return toHexString(value, MathUpgradeable.log256(value) + 1);
//         }
//     }

//     /**
//      * @dev Converts a `uint256` to its ASCII `string` hexadecimal representation with fixed length.
//      */
//     function toHexString(uint256 value, uint256 length) internal pure returns (string memory) {
//         bytes memory buffer = new bytes(2 * length + 2);
//         buffer[0] = "0";
//         buffer[1] = "x";
//         for (uint256 i = 2 * length + 1; i > 1; --i) {
//             buffer[i] = _SYMBOLS[value & 0xf];
//             value >>= 4;
//         }
//         require(value == 0, "Strings: hex length insufficient");
//         return string(buffer);
//     }

//     /**
//      * @dev Converts an `address` with fixed length of 20 bytes to its not checksummed ASCII `string` hexadecimal representation.
//      */
//     function toHexString(address addr) internal pure returns (string memory) {
//         return toHexString(uint256(uint160(addr)), _ADDRESS_LENGTH);
//     }

//     /**
//      * @dev Returns true if the two strings are equal.
//      */
//     function equal(string memory a, string memory b) internal pure returns (bool) {
//         return keccak256(bytes(a)) == keccak256(bytes(b));
//     }
// }

// // pkg/contracts/src/interfaces/IArbitrable.sol

// /// @title IArbitrable
// /// @notice Arbitrable interface.
// /// @dev When developing arbitrable contracts, we need to:
// /// - Define the action taken when a ruling is received by the contract.
// /// - Allow dispute creation. For this a function must call arbitrator.createDispute{value: _fee}(_choices,_extraData);
// interface IArbitrable {
//     /// @dev To be emitted when a dispute is created to link the correct meta-evidence to the disputeID.
//     /// @param _arbitrator The arbitrator of the contract.
//     /// @param _arbitrableDisputeID The identifier of the dispute in the Arbitrable contract.
//     /// @param _externalDisputeID An identifier created outside Kleros by the protocol requesting arbitration.
//     /// @param _templateId The identifier of the dispute template. Should not be used with _templateUri.
//     /// @param _templateUri The URI to the dispute template. For example on IPFS: starting with '/ipfs/'. Should not be used with _templateId.
//     event DisputeRequest(
//         IArbitrator indexed _arbitrator,
//         uint256 indexed _arbitrableDisputeID,
//         uint256 _externalDisputeID,
//         uint256 _templateId,
//         string _templateUri
//     );

//     /// @dev To be raised when a ruling is given.
//     /// @param _arbitrator The arbitrator giving the ruling.
//     /// @param _disputeID The identifier of the dispute in the Arbitrator contract.
//     /// @param _ruling The ruling which was given.
//     event Ruling(IArbitrator indexed _arbitrator, uint256 indexed _disputeID, uint256 _ruling);

//     /// @dev Give a ruling for a dispute.
//     ///      Must be called by the arbitrator.
//     ///      The purpose of this function is to ensure that the address calling it has the right to rule on the contract.
//     /// @param _disputeID The identifier of the dispute in the Arbitrator contract.
//     /// @param _ruling Ruling given by the arbitrator.
//     /// Note that 0 is reserved for "Not able/wanting to make a decision".
//     function rule(uint256 _disputeID, uint256 _ruling) external;
// }

// // pkg/contracts/src/interfaces/IArbitrator.sol

// /// @title Arbitrator
// /// Arbitrator interface that implements the new arbitration standard.
// /// Unlike the ERC-792 this standard is not concerned with appeals, so each arbitrator can implement an appeal system that suits it the most.
// /// When developing arbitrator contracts we need to:
// /// - Define the functions for dispute creation (createDispute). Don't forget to store the arbitrated contract and the disputeID (which should be unique, may nbDisputes).
// /// - Define the functions for cost display (arbitrationCost).
// /// - Allow giving rulings. For this a function must call arbitrable.rule(disputeID, ruling).
// interface IArbitrator {
//     /// @dev To be emitted when a dispute is created.
//     /// @param _disputeID The identifier of the dispute in the Arbitrator contract.
//     /// @param _arbitrable The contract which created the dispute.
//     event DisputeCreation(uint256 indexed _disputeID, IArbitrable indexed _arbitrable);

//     /// @dev To be raised when a ruling is given.
//     /// @param _arbitrable The arbitrable receiving the ruling.
//     /// @param _disputeID The identifier of the dispute in the Arbitrator contract.
//     /// @param _ruling The ruling which was given.
//     event Ruling(IArbitrable indexed _arbitrable, uint256 indexed _disputeID, uint256 _ruling);

//     /// @dev To be emitted when an ERC20 token is added or removed as a method to pay fees.
//     /// @param _token The ERC20 token.
//     /// @param _accepted Whether the token is accepted or not.
//     event AcceptedFeeToken(IERC20 indexed _token, bool indexed _accepted);

//     /// @dev To be emitted when the fee for a particular ERC20 token is updated.
//     /// @param _feeToken The ERC20 token.
//     /// @param _rateInEth The new rate of the fee token in ETH.
//     /// @param _rateDecimals The new decimals of the fee token rate.
//     event NewCurrencyRate(IERC20 indexed _feeToken, uint64 _rateInEth, uint8 _rateDecimals);

//     /// @dev Create a dispute and pay for the fees in the native currency, typically ETH.
//     ///      Must be called by the arbitrable contract.
//     ///      Must pay at least arbitrationCost(_extraData).
//     /// @param _numberOfChoices The number of choices the arbitrator can choose from in this dispute.
//     /// @param _extraData Additional info about the dispute. We use it to pass the ID of the dispute's court (first 32 bytes), the minimum number of jurors required (next 32 bytes) and the ID of the specific dispute kit (last 32 bytes).
//     /// @return disputeID The identifier of the dispute created.
//     function createDispute(uint256 _numberOfChoices, bytes calldata _extraData)
//         external
//         payable
//         returns (uint256 disputeID);

//     /// @dev Create a dispute and pay for the fees in a supported ERC20 token.
//     ///      Must be called by the arbitrable contract.
//     ///      Must pay at least arbitrationCost(_extraData).
//     /// @param _numberOfChoices The number of choices the arbitrator can choose from in this dispute.
//     /// @param _extraData Additional info about the dispute. We use it to pass the ID of the dispute's court (first 32 bytes), the minimum number of jurors required (next 32 bytes) and the ID of the specific dispute kit (last 32 bytes).
//     /// @param _feeToken The ERC20 token used to pay fees.
//     /// @param _feeAmount Amount of the ERC20 token used to pay fees.
//     /// @return disputeID The identifier of the dispute created.
//     function createDispute(uint256 _numberOfChoices, bytes calldata _extraData, IERC20 _feeToken, uint256 _feeAmount)
//         external
//         returns (uint256 disputeID);

//     /// @dev Compute the cost of arbitration denominated in the native currency, typically ETH.
//     ///      It is recommended not to increase it often, as it can be highly time and gas consuming for the arbitrated contracts to cope with fee augmentation.
//     /// @param _extraData Additional info about the dispute. We use it to pass the ID of the dispute's court (first 32 bytes), the minimum number of jurors required (next 32 bytes) and the ID of the specific dispute kit (last 32 bytes).
//     /// @return cost The arbitration cost in ETH.
//     function arbitrationCost(bytes calldata _extraData) external view returns (uint256 cost);

//     /// @dev Compute the cost of arbitration denominated in `_feeToken`.
//     ///      It is recommended not to increase it often, as it can be highly time and gas consuming for the arbitrated contracts to cope with fee augmentation.
//     /// @param _extraData Additional info about the dispute. We use it to pass the ID of the dispute's court (first 32 bytes), the minimum number of jurors required (next 32 bytes) and the ID of the specific dispute kit (last 32 bytes).
//     /// @param _feeToken The ERC20 token used to pay fees.
//     /// @return cost The arbitration cost in `_feeToken`.
//     function arbitrationCost(bytes calldata _extraData, IERC20 _feeToken) external view returns (uint256 cost);

//     /// @dev Gets the current ruling of a specified dispute.
//     /// @param _disputeID The ID of the dispute.
//     /// @return ruling The current ruling.
//     /// @return tied Whether it's a tie or not.
//     /// @return overridden Whether the ruling was overridden by appeal funding or not.
//     function currentRuling(uint256 _disputeID) external view returns (uint256 ruling, bool tied, bool overridden);

//     // Interface override
//     /// @dev Authorize the safe to execute a ruling on the source contract.<
//     /// @param _safe that acts as the Tribunal safe that can rule disputes from the source Strategy.
//     function registerSafe(address _safe) external;
// }

// // lib/allo-v2/contracts/core/interfaces/IAllo.sol

// // Interfaces

// // Internal Libraries

// // ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣾⣿⣷⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣼⣿⣿⣷⣄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⣿⣿⣗⠀⠀⠀⢸⣿⣿⣿⡯⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
// // ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣿⣿⣿⣿⣷⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣼⣿⣿⣿⣿⣿⡄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⣿⣿⣗⠀⠀⠀⢸⣿⣿⣿⡯⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
// // ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⣿⣿⣿⣿⣿⡄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣸⣿⣿⣿⢿⣿⣿⣿⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⣿⣿⣗⠀⠀⠀⢸⣿⣿⣿⡯⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
// // ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠘⣿⣿⣿⣿⣿⣿⣿⣄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣰⣿⣿⣿⡟⠘⣿⣿⣿⣷⡀⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⣿⣿⣗⠀⠀⠀⢸⣿⣿⣿⡯⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
// // ⠀⠀⠀⠀⠀⠀⠀⠀⣀⣴⣾⣿⣿⣿⣿⣾⠻⣿⣿⣿⣿⣿⣿⣿⡆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢠⣿⣿⣿⡿⠀⠀⠸⣿⣿⣿⣧⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⣿⣿⣗⠀⠀⠀⢸⣿⣿⣿⡯⠀⠀⠀⠀⠀⠀⢀⣠⣴⣴⣶⣶⣶⣦⣦⣀⡀⠀⠀⠀⠀⠀⠀
// // ⠀⠀⠀⠀⠀⠀⠀⣴⣿⣿⣿⣿⣿⣿⡿⠃⠀⠙⣿⣿⣿⣿⣿⣿⣿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢠⣿⣿⣿⣿⠁⠀⠀⠀⢻⣿⣿⣿⣧⠀⠀⠀⠀⠀⠀⠀⢸⣿⣿⣿⣗⠀⠀⠀⢸⣿⣿⣿⡯⠀⠀⠀⠀⣠⣾⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣶⡀⠀⠀⠀⠀
// // ⠀⠀⠀⠀⠀⢀⣾⣿⣿⣿⣿⣿⣿⡿⠁⠀⠀⠀⠘⣿⣿⣿⣿⣿⡿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣾⣿⣿⣿⠃⠀⠀⠀⠀⠈⢿⣿⣿⣿⣆⠀⠀⠀⠀⠀⠀⢸⣿⣿⣿⣗⠀⠀⠀⢸⣿⣿⣿⡯⠀⠀⠀⣰⣿⣿⣿⡿⠋⠁⠀⠀⠈⠘⠹⣿⣿⣿⣿⣆⠀⠀⠀
// // ⠀⠀⠀⠀⢀⣾⣿⣿⣿⣿⣿⣿⡿⠀⠀⠀⠀⠀⠀⠈⢿⣿⣿⣿⠃⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣾⣿⣿⣿⠏⠀⠀⠀⠀⠀⠀⠘⣿⣿⣿⣿⡄⠀⠀⠀⠀⠀⢸⣿⣿⣿⣗⠀⠀⠀⢸⣿⣿⣿⡯⠀⠀⢰⣿⣿⣿⣿⠁⠀⠀⠀⠀⠀⠀⠀⠘⣿⣿⣿⣿⡀⠀⠀
// // ⠀⠀⠀⢠⣿⣿⣿⣿⣿⣿⣿⣟⠀⡀⢀⠀⡀⢀⠀⡀⢈⢿⡟⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣼⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡄⠀⠀⠀⠀⢸⣿⣿⣿⣗⠀⠀⠀⢸⣿⣿⣿⡯⠀⠀⢸⣿⣿⣿⣗⠀⠀⠀⠀⠀⠀⠀⠀⠀⣿⣿⣿⣿⡇⠀⠀
// // ⠀⠀⣠⣿⣿⣿⣿⣿⣿⡿⠋⢻⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣷⣶⣄⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣸⣿⣿⣿⡿⢿⠿⠿⠿⠿⠿⠿⠿⠿⠿⢿⣿⣿⣿⣷⡀⠀⠀⠀⢸⣿⣿⣿⣗⠀⠀⠀⢸⣿⣿⣿⡯⠀⠀⠸⣿⣿⣿⣷⡀⠀⠀⠀⠀⠀⠀⠀⢠⣿⣿⣿⣿⠂⠀⠀
// // ⠀⠀⠙⠛⠿⠻⠻⠛⠉⠀⠀⠈⢿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣷⣄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣰⣿⣿⣿⣿⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢿⣿⣿⣿⣧⠀⠀⠀⢸⣿⣿⣿⣗⠀⠀⠀⢸⣿⣿⣿⡯⠀⠀⠀⢻⣿⣿⣿⣷⣀⢀⠀⠀⠀⡀⣰⣾⣿⣿⣿⠏⠀⠀⠀
// // ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠛⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡄⠀⠀⠀⠀⠀⠀⠀⠀⠀⢰⣿⣿⣿⣿⠃⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠘⣿⣿⣿⣿⣧⠀⠀⢸⣿⣿⣿⣗⠀⠀⠀⢸⣿⣿⣿⡯⠀⠀⠀⠀⠹⢿⣿⣿⣿⣿⣾⣾⣷⣿⣿⣿⣿⡿⠋⠀⠀⠀⠀
// // ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠙⠙⠋⠛⠙⠋⠛⠙⠋⠛⠙⠋⠃⠀⠀⠀⠀⠀⠀⠀⠀⠠⠿⠻⠟⠿⠃⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠸⠟⠿⠟⠿⠆⠀⠸⠿⠿⠟⠯⠀⠀⠀⠸⠿⠿⠿⠏⠀⠀⠀⠀⠀⠈⠉⠻⠻⡿⣿⢿⡿⡿⠿⠛⠁⠀⠀⠀⠀⠀⠀
// //                    allo.gitcoin.co

// /// @title Allo Interface
// /// @author @thelostone-mc <aditya@gitcoin.co>, @0xKurt <kurt@gitcoin.co>, @codenamejason <jason@gitcoin.co>, @0xZakk <zakk@gitcoin.co>, @nfrgosselin <nate@gitcoin.co>
// /// @notice Interface for the Allo contract. It exposes all functions needed to use the Allo protocol.
// interface IAllo {
//     /// ======================
//     /// ======= Structs ======
//     /// ======================

//     /// @notice the Pool struct that all strategy pools are based from
//     struct Pool {
//         bytes32 profileId;
//         IStrategy strategy;
//         address token;
//         Metadata metadata;
//         bytes32 managerRole;
//         bytes32 adminRole;
//     }

//     /// ======================
//     /// ======= Events =======
//     /// ======================

//     /// @notice Event emitted when a new pool is created
//     /// @param poolId ID of the pool created
//     /// @param profileId ID of the profile the pool is associated with
//     /// @param strategy Address of the strategy contract
//     /// @param token Address of the token pool was funded with when created
//     /// @param amount Amount pool was funded with when created
//     /// @param metadata Pool metadata
//     event PoolCreated(
//         uint256 indexed poolId,
//         bytes32 indexed profileId,
//         IStrategy strategy,
//         address token,
//         uint256 amount,
//         Metadata metadata
//     );

//     /// @notice Emitted when a pools metadata is updated
//     /// @param poolId ID of the pool updated
//     /// @param metadata Pool metadata that was updated
//     event PoolMetadataUpdated(uint256 indexed poolId, Metadata metadata);

//     /// @notice Emitted when a pool is funded
//     /// @param poolId ID of the pool funded
//     /// @param amount Amount funded to the pool
//     /// @param fee Amount of the fee paid to the treasury
//     event PoolFunded(uint256 indexed poolId, uint256 amount, uint256 fee);

//     /// @notice Emitted when the base fee is paid
//     /// @param poolId ID of the pool the base fee was paid for
//     /// @param amount Amount of the base fee paid
//     event BaseFeePaid(uint256 indexed poolId, uint256 amount);

//     /// @notice Emitted when the treasury address is updated
//     /// @param treasury Address of the new treasury
//     event TreasuryUpdated(address treasury);

//     /// @notice Emitted when the percent fee is updated
//     /// @param percentFee New percentage for the fee
//     event PercentFeeUpdated(uint256 percentFee);

//     /// @notice Emitted when the base fee is updated
//     /// @param baseFee New base fee amount
//     event BaseFeeUpdated(uint256 baseFee);

//     /// @notice Emitted when the registry address is updated
//     /// @param registry Address of the new registry
//     event RegistryUpdated(address registry);

//     /// @notice Emitted when a strategy is approved and added to the cloneable strategies
//     /// @param strategy Address of the strategy approved
//     event StrategyApproved(address strategy);

//     /// @notice Emitted when a strategy is removed from the cloneable strategies
//     /// @param strategy Address of the strategy removed
//     event StrategyRemoved(address strategy);

//     /// ====================================
//     /// ==== External/Public Functions =====
//     /// ====================================

//     /// @notice Initialize the Allo contract
//     /// @param _owner Address of the owner
//     /// @param _registry Address of the registry contract
//     /// @param _treasury Address of the treasury
//     /// @param _percentFee Percentage for the fee
//     /// @param _baseFee Base fee amount
//     function initialize(
//         address _owner,
//         address _registry,
//         address payable _treasury,
//         uint256 _percentFee,
//         uint256 _baseFee
//     ) external;

//     /// @notice Updates a pools metadata.
//     /// @dev 'msg.sender' must be a pool admin.
//     /// @param _poolId The ID of the pool to update
//     /// @param _metadata The new metadata to set
//     function updatePoolMetadata(uint256 _poolId, Metadata memory _metadata) external;

//     /// @notice Update the registry address.
//     /// @dev 'msg.sender' must be the Allo contract owner.
//     /// @param _registry The new registry address
//     function updateRegistry(address _registry) external;

//     /// @notice Updates the treasury address.
//     /// @dev 'msg.sender' must be the Allo contract owner.
//     /// @param _treasury The new treasury address
//     function updateTreasury(address payable _treasury) external;

//     /// @notice Updates the percentage for the fee.
//     /// @dev 'msg.sender' must be the Allo contract owner.
//     /// @param _percentFee The new percentage for the fee
//     function updatePercentFee(uint256 _percentFee) external;

//     /// @notice Updates the base fee.
//     /// @dev 'msg.sender' must be the Allo contract owner.
//     /// @param _baseFee The new base fee
//     function updateBaseFee(uint256 _baseFee) external;

//     /// @notice Adds a strategy to the cloneable strategies.
//     /// @dev 'msg.sender' must be the Allo contract owner.
//     /// @param _strategy The address of the strategy to add
//     function addToCloneableStrategies(address _strategy) external;

//     /// @notice Removes a strategy from the cloneable strategies.
//     /// @dev 'msg.sender' must be the Allo contract owner.
//     /// @param _strategy The address of the strategy to remove
//     function removeFromCloneableStrategies(address _strategy) external;

//     /// @notice Adds a pool manager to the pool.
//     /// @dev 'msg.sender' must be a pool admin.
//     /// @param _poolId The ID of the pool to add the manager to
//     /// @param _manager The address of the manager to add
//     function addPoolManager(uint256 _poolId, address _manager) external;

//     /// @notice Removes a pool manager from the pool.
//     /// @dev 'msg.sender' must be a pool admin.
//     /// @param _poolId The ID of the pool to remove the manager from
//     /// @param _manager The address of the manager to remove
//     function removePoolManager(uint256 _poolId, address _manager) external;

//     /// @notice Recovers funds from a pool.
//     /// @dev 'msg.sender' must be a pool admin.
//     /// @param _token The token to recover
//     /// @param _recipient The address to send the recovered funds to
//     function recoverFunds(address _token, address _recipient) external;

//     /// @notice Registers a recipient and emits {Registered} event if successful and may be handled differently by each strategy.
//     /// @param _poolId The ID of the pool to register the recipient for
//     function registerRecipient(uint256 _poolId, bytes memory _data) external payable returns (address);

//     /// @notice Registers a batch of recipients.
//     /// @param _poolIds The pool ID's to register the recipients for
//     /// @param _data The data to pass to the strategy and may be handled differently by each strategy
//     function batchRegisterRecipient(uint256[] memory _poolIds, bytes[] memory _data)
//         external
//         returns (address[] memory);

//     /// @notice Funds a pool.
//     /// @dev 'msg.value' must be greater than 0 if the token is the native token
//     ///       or '_amount' must be greater than 0 if the token is not the native token.
//     /// @param _poolId The ID of the pool to fund
//     /// @param _amount The amount to fund the pool with
//     // function fundPool(uint256 _poolId, uint256 _amount) external payable;

//     /// @notice Allocates funds to a recipient.
//     /// @dev Each strategy will handle the allocation of funds differently.
//     /// @param _poolId The ID of the pool to allocate funds from
//     /// @param _data The data to pass to the strategy and may be handled differently by each strategy.
//     function allocate(uint256 _poolId, bytes memory _data) external payable;

//     /// @notice Allocates funds to multiple recipients.
//     /// @dev Each strategy will handle the allocation of funds differently
//     function batchAllocate(uint256[] calldata _poolIds, bytes[] memory _datas) external;

//     /// @notice Distributes funds to recipients and emits {Distributed} event if successful
//     /// @dev Each strategy will handle the distribution of funds differently
//     /// @param _poolId The ID of the pool to distribute from
//     /// @param _recipientIds The recipient ids to distribute to
//     /// @param _data The data to pass to the strategy and may be handled differently by each strategy
//     function distribute(uint256 _poolId, address[] memory _recipientIds, bytes memory _data) external;

//     /// =========================
//     /// ==== View Functions =====
//     /// =========================

//     /// @notice Checks if an address is a pool admin.
//     /// @param _poolId The ID of the pool to check
//     /// @param _address The address to check
//     /// @return 'true' if the '_address' is a pool admin, otherwise 'false'
//     function isPoolAdmin(uint256 _poolId, address _address) external view returns (bool);

//     /// @notice Checks if an address is a pool manager.
//     /// @param _poolId The ID of the pool to check
//     /// @param _address The address to check
//     /// @return 'true' if the '_address' is a pool manager, otherwise 'false'
//     function isPoolManager(uint256 _poolId, address _address) external view returns (bool);

//     /// @notice Checks if a strategy is cloneable (is in the cloneableStrategies mapping).
//     /// @param _strategy The address of the strategy to check
//     /// @return 'true' if the '_strategy' is cloneable, otherwise 'false'
//     function isCloneableStrategy(address _strategy) external view returns (bool);

//     /// @notice Returns the address of the strategy for a given 'poolId'
//     /// @param _poolId The ID of the pool to check
//     /// @return strategy The address of the strategy for the ID of the pool passed in
//     function getStrategy(uint256 _poolId) external view returns (address);

//     /// @notice Returns the current percent fee
//     /// @return percentFee The current percentage for the fee
//     function getPercentFee() external view returns (uint256);

//     /// @notice Returns the current base fee
//     /// @return baseFee The current base fee
//     function getBaseFee() external view returns (uint256);

//     /// @notice Returns the current treasury address
//     /// @return treasury The current treasury address
//     function getTreasury() external view returns (address payable);

//     /// @notice Returns the current registry address
//     /// @return registry The current registry address
//     function getRegistry() external view returns (IRegistry);

//     /// @notice Returns the 'Pool' struct for a given 'poolId'
//     /// @param _poolId The ID of the pool to check
//     /// @return pool The 'Pool' struct for the ID of the pool passed in
//     function getPool(uint256 _poolId) external view returns (Pool memory);

//     /// @notice Returns the current fee denominator
//     /// @dev 1e18 represents 100%
//     /// @return feeDenominator The current fee denominator
//     function getFeeDenominator() external view returns (uint256);
// }

// // lib/allo-v2/contracts/core/interfaces/IStrategy.sol

// // Interfaces

// // ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣾⣿⣷⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣼⣿⣿⣷⣄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⣿⣿⣗⠀⠀⠀⢸⣿⣿⣿⡯⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
// // ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣿⣿⣿⣿⣷⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣼⣿⣿⣿⣿⣿⡄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⣿⣿⣗⠀⠀⠀⢸⣿⣿⣿⡯⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
// // ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⣿⣿⣿⣿⣿⡄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣸⣿⣿⣿⢿⣿⣿⣿⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⣿⣿⣗⠀⠀⠀⢸⣿⣿⣿⡯⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
// // ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠘⣿⣿⣿⣿⣿⣿⣿⣄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣰⣿⣿⣿⡟⠘⣿⣿⣿⣷⡀⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⣿⣿⣗⠀⠀⠀⢸⣿⣿⣿⡯⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
// // ⠀⠀⠀⠀⠀⠀⠀⠀⣀⣴⣾⣿⣿⣿⣿⣾⠻⣿⣿⣿⣿⣿⣿⣿⡆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢠⣿⣿⣿⡿⠀⠀⠸⣿⣿⣿⣧⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⣿⣿⣗⠀⠀⠀⢸⣿⣿⣿⡯⠀⠀⠀⠀⠀⠀⢀⣠⣴⣴⣶⣶⣶⣦⣦⣀⡀⠀⠀⠀⠀⠀⠀
// // ⠀⠀⠀⠀⠀⠀⠀⣴⣿⣿⣿⣿⣿⣿⡿⠃⠀⠙⣿⣿⣿⣿⣿⣿⣿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢠⣿⣿⣿⣿⠁⠀⠀⠀⢻⣿⣿⣿⣧⠀⠀⠀⠀⠀⠀⠀⢸⣿⣿⣿⣗⠀⠀⠀⢸⣿⣿⣿⡯⠀⠀⠀⠀⣠⣾⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣶⡀⠀⠀⠀⠀
// // ⠀⠀⠀⠀⠀⢀⣾⣿⣿⣿⣿⣿⣿⡿⠁⠀⠀⠀⠘⣿⣿⣿⣿⣿⡿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣾⣿⣿⣿⠃⠀⠀⠀⠀⠈⢿⣿⣿⣿⣆⠀⠀⠀⠀⠀⠀⢸⣿⣿⣿⣗⠀⠀⠀⢸⣿⣿⣿⡯⠀⠀⠀⣰⣿⣿⣿⡿⠋⠁⠀⠀⠈⠘⠹⣿⣿⣿⣿⣆⠀⠀⠀
// // ⠀⠀⠀⠀⢀⣾⣿⣿⣿⣿⣿⣿⡿⠀⠀⠀⠀⠀⠀⠈⢿⣿⣿⣿⠃⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣾⣿⣿⣿⠏⠀⠀⠀⠀⠀⠀⠘⣿⣿⣿⣿⡄⠀⠀⠀⠀⠀⢸⣿⣿⣿⣗⠀⠀⠀⢸⣿⣿⣿⡯⠀⠀⢰⣿⣿⣿⣿⠁⠀⠀⠀⠀⠀⠀⠀⠘⣿⣿⣿⣿⡀⠀⠀
// // ⠀⠀⠀⢠⣿⣿⣿⣿⣿⣿⣿⣟⠀⡀⢀⠀⡀⢀⠀⡀⢈⢿⡟⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣼⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡄⠀⠀⠀⠀⢸⣿⣿⣿⣗⠀⠀⠀⢸⣿⣿⣿⡯⠀⠀⢸⣿⣿⣿⣗⠀⠀⠀⠀⠀⠀⠀⠀⠀⣿⣿⣿⣿⡇⠀⠀
// // ⠀⠀⣠⣿⣿⣿⣿⣿⣿⡿⠋⢻⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣷⣶⣄⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣸⣿⣿⣿⡿⢿⠿⠿⠿⠿⠿⠿⠿⠿⠿⢿⣿⣿⣿⣷⡀⠀⠀⠀⢸⣿⣿⣿⣗⠀⠀⠀⢸⣿⣿⣿⡯⠀⠀⠸⣿⣿⣿⣷⡀⠀⠀⠀⠀⠀⠀⠀⢠⣿⣿⣿⣿⠂⠀⠀
// // ⠀⠀⠙⠛⠿⠻⠻⠛⠉⠀⠀⠈⢿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣷⣄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣰⣿⣿⣿⣿⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢿⣿⣿⣿⣧⠀⠀⠀⢸⣿⣿⣿⣗⠀⠀⠀⢸⣿⣿⣿⡯⠀⠀⠀⢻⣿⣿⣿⣷⣀⢀⠀⠀⠀⡀⣰⣾⣿⣿⣿⠏⠀⠀⠀
// // ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠛⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡄⠀⠀⠀⠀⠀⠀⠀⠀⠀⢰⣿⣿⣿⣿⠃⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠘⣿⣿⣿⣿⣧⠀⠀⢸⣿⣿⣿⣗⠀⠀⠀⢸⣿⣿⣿⡯⠀⠀⠀⠀⠹⢿⣿⣿⣿⣿⣾⣾⣷⣿⣿⣿⣿⡿⠋⠀⠀⠀⠀
// // ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠙⠙⠋⠛⠙⠋⠛⠙⠋⠛⠙⠋⠃⠀⠀⠀⠀⠀⠀⠀⠀⠠⠿⠻⠟⠿⠃⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠸⠟⠿⠟⠿⠆⠀⠸⠿⠿⠟⠯⠀⠀⠀⠸⠿⠿⠿⠏⠀⠀⠀⠀⠀⠈⠉⠻⠻⡿⣿⢿⡿⡿⠿⠛⠁⠀⠀⠀⠀⠀⠀
// //                    allo.gitcoin.co

// /// @title IStrategy Interface
// /// @author @thelostone-mc <aditya@gitcoin.co>, @0xKurt <kurt@gitcoin.co>, @codenamejason <jason@gitcoin.co>, @0xZakk <zakk@gitcoin.co>, @nfrgosselin <nate@gitcoin.co> @0xZakk <zakk@gitcoin.co>, @nfrgosselin <nate@gitcoin.co>
// /// @notice BaseStrategy is the base contract that all strategies should inherit from and uses this interface.

// interface IStrategy {
//     /// ======================
//     /// ======= Storage ======
//     /// ======================

//     /// @notice The Status enum that all recipients are based from
//     enum Status {
//         None,
//         Pending,
//         Accepted,
//         Rejected,
//         Appealed,
//         InReview,
//         Canceled
//     }

//     /// @notice Payout summary struct to hold the payout data
//     struct PayoutSummary {
//         address recipientAddress;
//         uint256 amount;
//     }

//     /// ======================
//     /// ======= Events =======
//     /// ======================

//     /// @notice Emitted when strategy is initialized.
//     /// @param poolId The ID of the pool
//     /// @param data The data passed to the 'initialize' function
//     event Initialized(uint256 poolId, bytes data);

//     /// @notice Emitted when a recipient is registered.
//     /// @param recipientId The ID of the recipient
//     /// @param data The data passed to the 'registerRecipient' function
//     /// @param sender The sender
//     event Registered(address indexed recipientId, bytes data, address sender);

//     /// @notice Emitted when a recipient is allocated to.
//     /// @param recipientId The ID of the recipient
//     /// @param amount The amount allocated
//     /// @param token The token allocated
//     event Allocated(address indexed recipientId, uint256 amount, address token, address sender);

//     /// @notice Emitted when tokens are distributed.
//     /// @param recipientId The ID of the recipient
//     /// @param recipientAddress The recipient
//     /// @param amount The amount distributed
//     /// @param sender The sender
//     event Distributed(address indexed recipientId, address recipientAddress, uint256 amount, address sender);

//     /// @notice Emitted when pool is set to active status.
//     /// @param active The status of the pool
//     event PoolActive(bool active);

//     /// ======================
//     /// ======= Views ========
//     /// ======================

//     /// @notice Getter for the address of the Allo contract.
//     /// @return The 'Allo' contract
//     function getAllo() external view returns (IAllo);

//     /// @notice Getter for the 'poolId' for this strategy.
//     /// @return The ID of the pool
//     function getPoolId() external view returns (uint256);

//     /// @notice Getter for the 'id' of the strategy.
//     /// @return The ID of the strategy
//     // function getStrategyId() external view returns (bytes32);

//     /// @notice Checks whether a allocator is valid or not, will usually be true for all strategies
//     ///      and will depend on the strategy implementation.
//     /// @param _allocator The allocator to check
//     /// @return Whether the allocator is valid or not
//     // function isValidAllocator(address _allocator) external view returns (bool);

//     /// @notice whether pool is active.
//     /// @return Whether the pool is active or not
//     function isPoolActive() external returns (bool);

//     /// @notice Checks the amount of tokens in the pool.
//     /// @return The balance of the pool
//     function getPoolAmount() external view returns (uint256);

//     /// @notice Increases the balance of the pool.
//     /// @param _amount The amount to increase the pool by
//     // function increasePoolAmount(uint256 _amount) external;

//     /// @notice Checks the status of a recipient probably tracked in a mapping, but will depend on the implementation
//     ///      for example, the OpenSelfRegistration only maps users to bool, and then assumes Accepted for those
//     ///      since there is no need for Pending or Rejected.
//     /// @param _recipientId The ID of the recipient
//     /// @return The status of the recipient
//     // function getRecipientStatus(address _recipientId) external view returns (Status);

//     /// @notice Checks the amount allocated to a recipient for distribution.
//     /// @dev Input the values you would send to distribute(), get the amounts each recipient in the array would receive.
//     ///      The encoded '_data' will be determined by the strategy, and will be used to determine the payout.
//     /// @param _recipientIds The IDs of the recipients
//     /// @param _data The encoded data
//     // function getPayouts(address[] memory _recipientIds, bytes[] memory _data)
//     //     external
//     //     view
//     //     returns (PayoutSummary[] memory);

//     /// ======================
//     /// ===== Functions ======
//     /// ======================

//     /// @notice
//     /// @dev The default BaseStrategy version will not use the data  if a strategy wants to use it, they will overwrite it,
//     ///      use it, and then call super.initialize().
//     /// @param _poolId The ID of the pool
//     /// @param _data The encoded data
//     function initialize(uint256 _poolId, bytes memory _data) external;

//     /// @notice This will register a recipient, set their status (and any other strategy specific values), and
//     ///         return the ID of the recipient.
//     /// @dev Able to change status all the way up to 'Accepted', or to 'Pending' and if there are more steps, additional
//     ///      functions should be added to allow the owner to check this. The owner could also check attestations directly
//     ///      and then accept for instance. The '_data' will be determined by the strategy implementation.
//     /// @param _data The data to use to register the recipient
//     /// @param _sender The address of the sender
//     /// @return The ID of the recipient
//     function registerRecipient(bytes memory _data, address _sender) external payable returns (address);

//     /// @notice This will allocate to a recipient.
//     /// @dev The encoded '_data' will be determined by the strategy implementation.
//     /// @param _data The data to use to allocate to the recipient
//     /// @param _sender The address of the sender
//     function allocate(bytes memory _data, address _sender) external payable;

//     /// @notice This will distribute funds (tokens) to recipients.
//     /// @dev most strategies will track a TOTAL amount per recipient, and a PAID amount, and pay the difference
//     /// this contract will need to track the amount paid already, so that it doesn't double pay.
//     function distribute(address[] memory _recipientIds, bytes memory _data, address _sender) external;
// }

// // lib/openzeppelin-contracts/contracts/token/ERC20/ERC20.sol

// // OpenZeppelin Contracts (last updated v4.9.0) (token/ERC20/ERC20.sol)

// /**
//  * @dev Implementation of the {IERC20} interface.
//  *
//  * This implementation is agnostic to the way tokens are created. This means
//  * that a supply mechanism has to be added in a derived contract using {_mint}.
//  * For a generic mechanism see {ERC20PresetMinterPauser}.
//  *
//  * TIP: For a detailed writeup see our guide
//  * https://forum.openzeppelin.com/t/how-to-implement-erc20-supply-mechanisms/226[How
//  * to implement supply mechanisms].
//  *
//  * The default value of {decimals} is 18. To change this, you should override
//  * this function so it returns a different value.
//  *
//  * We have followed general OpenZeppelin Contracts guidelines: functions revert
//  * instead returning `false` on failure. This behavior is nonetheless
//  * conventional and does not conflict with the expectations of ERC20
//  * applications.
//  *
//  * Additionally, an {Approval} event is emitted on calls to {transferFrom}.
//  * This allows applications to reconstruct the allowance for all accounts just
//  * by listening to said events. Other implementations of the EIP may not emit
//  * these events, as it isn't required by the specification.
//  *
//  * Finally, the non-standard {decreaseAllowance} and {increaseAllowance}
//  * functions have been added to mitigate the well-known issues around setting
//  * allowances. See {IERC20-approve}.
//  */
// contract ERC20 is Context, IERC20, IERC20Metadata {
//     mapping(address => uint256) private _balances;

//     mapping(address => mapping(address => uint256)) private _allowances;

//     uint256 private _totalSupply;

//     string private _name;
//     string private _symbol;

//     /**
//      * @dev Sets the values for {name} and {symbol}.
//      *
//      * All two of these values are immutable: they can only be set once during
//      * construction.
//      */
//     constructor(string memory name_, string memory symbol_) {
//         _name = name_;
//         _symbol = symbol_;
//     }

//     /**
//      * @dev Returns the name of the token.
//      */
//     function name() public view virtual override returns (string memory) {
//         return _name;
//     }

//     /**
//      * @dev Returns the symbol of the token, usually a shorter version of the
//      * name.
//      */
//     function symbol() public view virtual override returns (string memory) {
//         return _symbol;
//     }

//     /**
//      * @dev Returns the number of decimals used to get its user representation.
//      * For example, if `decimals` equals `2`, a balance of `505` tokens should
//      * be displayed to a user as `5.05` (`505 / 10 ** 2`).
//      *
//      * Tokens usually opt for a value of 18, imitating the relationship between
//      * Ether and Wei. This is the default value returned by this function, unless
//      * it's overridden.
//      *
//      * NOTE: This information is only used for _display_ purposes: it in
//      * no way affects any of the arithmetic of the contract, including
//      * {IERC20-balanceOf} and {IERC20-transfer}.
//      */
//     function decimals() public view virtual override returns (uint8) {
//         return 18;
//     }

//     /**
//      * @dev See {IERC20-totalSupply}.
//      */
//     function totalSupply() public view virtual override returns (uint256) {
//         return _totalSupply;
//     }

//     /**
//      * @dev See {IERC20-balanceOf}.
//      */
//     function balanceOf(address account) public view virtual override returns (uint256) {
//         return _balances[account];
//     }

//     /**
//      * @dev See {IERC20-transfer}.
//      *
//      * Requirements:
//      *
//      * - `to` cannot be the zero address.
//      * - the caller must have a balance of at least `amount`.
//      */
//     function transfer(address to, uint256 amount) public virtual override returns (bool) {
//         address owner = _msgSender();
//         _transfer(owner, to, amount);
//         return true;
//     }

//     /**
//      * @dev See {IERC20-allowance}.
//      */
//     function allowance(address owner, address spender) public view virtual override returns (uint256) {
//         return _allowances[owner][spender];
//     }

//     /**
//      * @dev See {IERC20-approve}.
//      *
//      * NOTE: If `amount` is the maximum `uint256`, the allowance is not updated on
//      * `transferFrom`. This is semantically equivalent to an infinite approval.
//      *
//      * Requirements:
//      *
//      * - `spender` cannot be the zero address.
//      */
//     function approve(address spender, uint256 amount) public virtual override returns (bool) {
//         address owner = _msgSender();
//         _approve(owner, spender, amount);
//         return true;
//     }

//     /**
//      * @dev See {IERC20-transferFrom}.
//      *
//      * Emits an {Approval} event indicating the updated allowance. This is not
//      * required by the EIP. See the note at the beginning of {ERC20}.
//      *
//      * NOTE: Does not update the allowance if the current allowance
//      * is the maximum `uint256`.
//      *
//      * Requirements:
//      *
//      * - `from` and `to` cannot be the zero address.
//      * - `from` must have a balance of at least `amount`.
//      * - the caller must have allowance for ``from``'s tokens of at least
//      * `amount`.
//      */
//     function transferFrom(address from, address to, uint256 amount) public virtual override returns (bool) {
//         address spender = _msgSender();
//         _spendAllowance(from, spender, amount);
//         _transfer(from, to, amount);
//         return true;
//     }

//     /**
//      * @dev Atomically increases the allowance granted to `spender` by the caller.
//      *
//      * This is an alternative to {approve} that can be used as a mitigation for
//      * problems described in {IERC20-approve}.
//      *
//      * Emits an {Approval} event indicating the updated allowance.
//      *
//      * Requirements:
//      *
//      * - `spender` cannot be the zero address.
//      */
//     function increaseAllowance(address spender, uint256 addedValue) public virtual returns (bool) {
//         address owner = _msgSender();
//         _approve(owner, spender, allowance(owner, spender) + addedValue);
//         return true;
//     }

//     /**
//      * @dev Atomically decreases the allowance granted to `spender` by the caller.
//      *
//      * This is an alternative to {approve} that can be used as a mitigation for
//      * problems described in {IERC20-approve}.
//      *
//      * Emits an {Approval} event indicating the updated allowance.
//      *
//      * Requirements:
//      *
//      * - `spender` cannot be the zero address.
//      * - `spender` must have allowance for the caller of at least
//      * `subtractedValue`.
//      */
//     function decreaseAllowance(address spender, uint256 subtractedValue) public virtual returns (bool) {
//         address owner = _msgSender();
//         uint256 currentAllowance = allowance(owner, spender);
//         require(currentAllowance >= subtractedValue, "ERC20: decreased allowance below zero");
//         unchecked {
//             _approve(owner, spender, currentAllowance - subtractedValue);
//         }

//         return true;
//     }

//     /**
//      * @dev Moves `amount` of tokens from `from` to `to`.
//      *
//      * This internal function is equivalent to {transfer}, and can be used to
//      * e.g. implement automatic token fees, slashing mechanisms, etc.
//      *
//      * Emits a {Transfer} event.
//      *
//      * Requirements:
//      *
//      * - `from` cannot be the zero address.
//      * - `to` cannot be the zero address.
//      * - `from` must have a balance of at least `amount`.
//      */
//     function _transfer(address from, address to, uint256 amount) internal virtual {
//         require(from != address(0), "ERC20: transfer from the zero address");
//         require(to != address(0), "ERC20: transfer to the zero address");

//         _beforeTokenTransfer(from, to, amount);

//         uint256 fromBalance = _balances[from];
//         require(fromBalance >= amount, "ERC20: transfer amount exceeds balance");
//         unchecked {
//             _balances[from] = fromBalance - amount;
//             // Overflow not possible: the sum of all balances is capped by totalSupply, and the sum is preserved by
//             // decrementing then incrementing.
//             _balances[to] += amount;
//         }

//         emit Transfer(from, to, amount);

//         _afterTokenTransfer(from, to, amount);
//     }

//     /** @dev Creates `amount` tokens and assigns them to `account`, increasing
//      * the total supply.
//      *
//      * Emits a {Transfer} event with `from` set to the zero address.
//      *
//      * Requirements:
//      *
//      * - `account` cannot be the zero address.
//      */
//     function _mint(address account, uint256 amount) internal virtual {
//         require(account != address(0), "ERC20: mint to the zero address");

//         _beforeTokenTransfer(address(0), account, amount);

//         _totalSupply += amount;
//         unchecked {
//             // Overflow not possible: balance + amount is at most totalSupply + amount, which is checked above.
//             _balances[account] += amount;
//         }
//         emit Transfer(address(0), account, amount);

//         _afterTokenTransfer(address(0), account, amount);
//     }

//     /**
//      * @dev Destroys `amount` tokens from `account`, reducing the
//      * total supply.
//      *
//      * Emits a {Transfer} event with `to` set to the zero address.
//      *
//      * Requirements:
//      *
//      * - `account` cannot be the zero address.
//      * - `account` must have at least `amount` tokens.
//      */
//     function _burn(address account, uint256 amount) internal virtual {
//         require(account != address(0), "ERC20: burn from the zero address");

//         _beforeTokenTransfer(account, address(0), amount);

//         uint256 accountBalance = _balances[account];
//         require(accountBalance >= amount, "ERC20: burn amount exceeds balance");
//         unchecked {
//             _balances[account] = accountBalance - amount;
//             // Overflow not possible: amount <= accountBalance <= totalSupply.
//             _totalSupply -= amount;
//         }

//         emit Transfer(account, address(0), amount);

//         _afterTokenTransfer(account, address(0), amount);
//     }

//     /**
//      * @dev Sets `amount` as the allowance of `spender` over the `owner` s tokens.
//      *
//      * This internal function is equivalent to `approve`, and can be used to
//      * e.g. set automatic allowances for certain subsystems, etc.
//      *
//      * Emits an {Approval} event.
//      *
//      * Requirements:
//      *
//      * - `owner` cannot be the zero address.
//      * - `spender` cannot be the zero address.
//      */
//     function _approve(address owner, address spender, uint256 amount) internal virtual {
//         require(owner != address(0), "ERC20: approve from the zero address");
//         require(spender != address(0), "ERC20: approve to the zero address");

//         _allowances[owner][spender] = amount;
//         emit Approval(owner, spender, amount);
//     }

//     /**
//      * @dev Updates `owner` s allowance for `spender` based on spent `amount`.
//      *
//      * Does not update the allowance amount in case of infinite allowance.
//      * Revert if not enough allowance is available.
//      *
//      * Might emit an {Approval} event.
//      */
//     function _spendAllowance(address owner, address spender, uint256 amount) internal virtual {
//         uint256 currentAllowance = allowance(owner, spender);
//         if (currentAllowance != type(uint256).max) {
//             require(currentAllowance >= amount, "ERC20: insufficient allowance");
//             unchecked {
//                 _approve(owner, spender, currentAllowance - amount);
//             }
//         }
//     }

//     /**
//      * @dev Hook that is called before any transfer of tokens. This includes
//      * minting and burning.
//      *
//      * Calling conditions:
//      *
//      * - when `from` and `to` are both non-zero, `amount` of ``from``'s tokens
//      * will be transferred to `to`.
//      * - when `from` is zero, `amount` tokens will be minted for `to`.
//      * - when `to` is zero, `amount` of ``from``'s tokens will be burned.
//      * - `from` and `to` are never both zero.
//      *
//      * To learn more about hooks, head to xref:ROOT:extending-contracts.adoc#using-hooks[Using Hooks].
//      */
//     function _beforeTokenTransfer(address from, address to, uint256 amount) internal virtual {}

//     /**
//      * @dev Hook that is called after any transfer of tokens. This includes
//      * minting and burning.
//      *
//      * Calling conditions:
//      *
//      * - when `from` and `to` are both non-zero, `amount` of ``from``'s tokens
//      * has been transferred to `to`.
//      * - when `from` is zero, `amount` tokens have been minted for `to`.
//      * - when `to` is zero, `amount` of ``from``'s tokens have been burned.
//      * - `from` and `to` are never both zero.
//      *
//      * To learn more about hooks, head to xref:ROOT:extending-contracts.adoc#using-hooks[Using Hooks].
//      */
//     function _afterTokenTransfer(address from, address to, uint256 amount) internal virtual {}
// }

// // lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol

// // OpenZeppelin Contracts (last updated v4.9.0) (token/ERC20/utils/SafeERC20.sol)

// /**
//  * @title SafeERC20
//  * @dev Wrappers around ERC20 operations that throw on failure (when the token
//  * contract returns false). Tokens that return no value (and instead revert or
//  * throw on failure) are also supported, non-reverting calls are assumed to be
//  * successful.
//  * To use this library you can add a `using SafeERC20 for IERC20;` statement to your contract,
//  * which allows you to call the safe operations as `token.safeTransfer(...)`, etc.
//  */
// library SafeERC20 {
//     using Address for address;

//     /**
//      * @dev Transfer `value` amount of `token` from the calling contract to `to`. If `token` returns no value,
//      * non-reverting calls are assumed to be successful.
//      */
//     function safeTransfer(IERC20 token, address to, uint256 value) internal {
//         _callOptionalReturn(token, abi.encodeWithSelector(token.transfer.selector, to, value));
//     }

//     /**
//      * @dev Transfer `value` amount of `token` from `from` to `to`, spending the approval given by `from` to the
//      * calling contract. If `token` returns no value, non-reverting calls are assumed to be successful.
//      */
//     function safeTransferFrom(IERC20 token, address from, address to, uint256 value) internal {
//         _callOptionalReturn(token, abi.encodeWithSelector(token.transferFrom.selector, from, to, value));
//     }

//     /**
//      * @dev Deprecated. This function has issues similar to the ones found in
//      * {IERC20-approve}, and its usage is discouraged.
//      *
//      * Whenever possible, use {safeIncreaseAllowance} and
//      * {safeDecreaseAllowance} instead.
//      */
//     function safeApprove(IERC20 token, address spender, uint256 value) internal {
//         // safeApprove should only be called when setting an initial allowance,
//         // or when resetting it to zero. To increase and decrease it, use
//         // 'safeIncreaseAllowance' and 'safeDecreaseAllowance'
//         require(
//             (value == 0) || (token.allowance(address(this), spender) == 0),
//             "SafeERC20: approve from non-zero to non-zero allowance"
//         );
//         _callOptionalReturn(token, abi.encodeWithSelector(token.approve.selector, spender, value));
//     }

//     /**
//      * @dev Increase the calling contract's allowance toward `spender` by `value`. If `token` returns no value,
//      * non-reverting calls are assumed to be successful.
//      */
//     function safeIncreaseAllowance(IERC20 token, address spender, uint256 value) internal {
//         uint256 oldAllowance = token.allowance(address(this), spender);
//         _callOptionalReturn(token, abi.encodeWithSelector(token.approve.selector, spender, oldAllowance + value));
//     }

//     /**
//      * @dev Decrease the calling contract's allowance toward `spender` by `value`. If `token` returns no value,
//      * non-reverting calls are assumed to be successful.
//      */
//     function safeDecreaseAllowance(IERC20 token, address spender, uint256 value) internal {
//         unchecked {
//             uint256 oldAllowance = token.allowance(address(this), spender);
//             require(oldAllowance >= value, "SafeERC20: decreased allowance below zero");
//             _callOptionalReturn(token, abi.encodeWithSelector(token.approve.selector, spender, oldAllowance - value));
//         }
//     }

//     /**
//      * @dev Set the calling contract's allowance toward `spender` to `value`. If `token` returns no value,
//      * non-reverting calls are assumed to be successful. Compatible with tokens that require the approval to be set to
//      * 0 before setting it to a non-zero value.
//      */
//     function forceApprove(IERC20 token, address spender, uint256 value) internal {
//         bytes memory approvalCall = abi.encodeWithSelector(token.approve.selector, spender, value);

//         if (!_callOptionalReturnBool(token, approvalCall)) {
//             _callOptionalReturn(token, abi.encodeWithSelector(token.approve.selector, spender, 0));
//             _callOptionalReturn(token, approvalCall);
//         }
//     }

//     /**
//      * @dev Use a ERC-2612 signature to set the `owner` approval toward `spender` on `token`.
//      * Revert on invalid signature.
//      */
//     function safePermit(
//         IERC20Permit token,
//         address owner,
//         address spender,
//         uint256 value,
//         uint256 deadline,
//         uint8 v,
//         bytes32 r,
//         bytes32 s
//     ) internal {
//         uint256 nonceBefore = token.nonces(owner);
//         token.permit(owner, spender, value, deadline, v, r, s);
//         uint256 nonceAfter = token.nonces(owner);
//         require(nonceAfter == nonceBefore + 1, "SafeERC20: permit did not succeed");
//     }

//     /**
//      * @dev Imitates a Solidity high-level call (i.e. a regular function call to a contract), relaxing the requirement
//      * on the return value: the return value is optional (but if data is returned, it must not be false).
//      * @param token The token targeted by the call.
//      * @param data The call data (encoded using abi.encode or one of its variants).
//      */
//     function _callOptionalReturn(IERC20 token, bytes memory data) private {
//         // We need to perform a low level call here, to bypass Solidity's return data size checking mechanism, since
//         // we're implementing it ourselves. We use {Address-functionCall} to perform this call, which verifies that
//         // the target address contains contract code and also asserts for success in the low-level call.

//         bytes memory returndata = address(token).functionCall(data, "SafeERC20: low-level call failed");
//         require(returndata.length == 0 || abi.decode(returndata, (bool)), "SafeERC20: ERC20 operation did not succeed");
//     }

//     /**
//      * @dev Imitates a Solidity high-level call (i.e. a regular function call to a contract), relaxing the requirement
//      * on the return value: the return value is optional (but if data is returned, it must not be false).
//      * @param token The token targeted by the call.
//      * @param data The call data (encoded using abi.encode or one of its variants).
//      *
//      * This is a variant of {_callOptionalReturn} that silents catches all reverts and returns a bool instead.
//      */
//     function _callOptionalReturnBool(IERC20 token, bytes memory data) private returns (bool) {
//         // We need to perform a low level call here, to bypass Solidity's return data size checking mechanism, since
//         // we're implementing it ourselves. We cannot use {Address-functionCall} here since this should return false
//         // and not revert is the subcall reverts.

//         (bool success, bytes memory returndata) = address(token).call(data);
//         return
//             success && (returndata.length == 0 || abi.decode(returndata, (bool))) && Address.isContract(address(token));
//     }
// }

// // lib/openzeppelin-contracts-upgradeable/contracts/access/OwnableUpgradeable.sol

// // OpenZeppelin Contracts (last updated v4.9.0) (access/Ownable.sol)

// /**
//  * @dev Contract module which provides a basic access control mechanism, where
//  * there is an account (an owner) that can be granted exclusive access to
//  * specific functions.
//  *
//  * By default, the owner account will be the one that deploys the contract. This
//  * can later be changed with {transferOwnership}.
//  *
//  * This module is used through inheritance. It will make available the modifier
//  * `onlyOwner`, which can be applied to your functions to restrict their use to
//  * the owner.
//  */
// abstract contract OwnableUpgradeable is Initializable_1, ContextUpgradeable {
//     address private _owner;

//     event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

//     /**
//      * @dev Initializes the contract setting the deployer as the initial owner.
//      */
//     function __Ownable_init() internal onlyInitializing {
//         __Ownable_init_unchained();
//     }

//     function __Ownable_init_unchained() internal onlyInitializing {
//         _transferOwnership(_msgSender());
//     }

//     /**
//      * @dev Throws if called by any account other than the owner.
//      */
//     modifier onlyOwner() {
//         _checkOwner();
//         _;
//     }

//     /**
//      * @dev Returns the address of the current owner.
//      */
//     function owner() public view virtual returns (address) {
//         return _owner;
//     }

//     /**
//      * @dev Throws if the sender is not the owner.
//      */
//     function _checkOwner() internal view virtual {
//         require(owner() == _msgSender(), "Ownable: caller is not the owner");
//     }

//     /**
//      * @dev Leaves the contract without owner. It will not be possible to call
//      * `onlyOwner` functions. Can only be called by the current owner.
//      *
//      * NOTE: Renouncing ownership will leave the contract without an owner,
//      * thereby disabling any functionality that is only available to the owner.
//      */
//     function renounceOwnership() public virtual onlyOwner {
//         _transferOwnership(address(0));
//     }

//     /**
//      * @dev Transfers ownership of the contract to a new account (`newOwner`).
//      * Can only be called by the current owner.
//      */
//     function transferOwnership(address newOwner) public virtual onlyOwner {
//         require(newOwner != address(0), "Ownable: new owner is the zero address");
//         _transferOwnership(newOwner);
//     }

//     /**
//      * @dev Transfers ownership of the contract to a new account (`newOwner`).
//      * Internal function without access restriction.
//      */
//     function _transferOwnership(address newOwner) internal virtual {
//         address oldOwner = _owner;
//         _owner = newOwner;
//         emit OwnershipTransferred(oldOwner, newOwner);
//     }

//     /**
//      * @dev This empty reserved space is put in place to allow future versions to add new
//      * variables without shifting down storage in the inheritance chain.
//      * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
//      */
//     uint256[49] private __gap;
// }

// // lib/openzeppelin-contracts-upgradeable/contracts/utils/introspection/ERC165Upgradeable.sol

// // OpenZeppelin Contracts v4.4.1 (utils/introspection/ERC165.sol)

// /**
//  * @dev Implementation of the {IERC165} interface.
//  *
//  * Contracts that want to implement ERC165 should inherit from this contract and override {supportsInterface} to check
//  * for the additional interface id that will be supported. For example:
//  *
//  * ```solidity
//  * function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
//  *     return interfaceId == type(MyInterface).interfaceId || super.supportsInterface(interfaceId);
//  * }
//  * ```
//  *
//  * Alternatively, {ERC165Storage} provides an easier to use but more expensive implementation.
//  */
// abstract contract ERC165Upgradeable is Initializable_1, IERC165Upgradeable {
//     function __ERC165_init() internal onlyInitializing {
//     }

//     function __ERC165_init_unchained() internal onlyInitializing {
//     }
//     /**
//      * @dev See {IERC165-supportsInterface}.
//      */
//     function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
//         return interfaceId == type(IERC165Upgradeable).interfaceId;
//     }

//     /**
//      * @dev This empty reserved space is put in place to allow future versions to add new
//      * variables without shifting down storage in the inheritance chain.
//      * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
//      */
//     uint256[50] private __gap;
// }

// // lib/openzeppelin-foundry-upgrades/src/internal/Utils.sol

// struct ContractInfo {
//     /*
//      * Contract path, e.g. "src/MyContract.sol"
//      */
//     string contractPath;
//     /*
//      * Contract short name, e.g. "MyContract"
//      */
//     string shortName;
//     /*
//      * License identifier from the compiled artifact. Empty if not found.
//      */
//     string license;
//     /*
//      * keccak256 hash of the source code from metadata
//      */
//     string sourceCodeHash;
//     /*
//      * Artifact file path e.g. the path of the file 'out/MyContract.sol/MyContract.json'
//      */
//     string artifactPath;
// }

// /**
//  * @dev Internal helper methods used by Upgrades and Defender libraries.
//  */
// library Utils {
//     address constant CHEATCODE_ADDRESS = 0x7109709ECfa91a80626fF3989D68f67F5b1DD12D;

//     /**
//      * @dev Gets the fully qualified name of a contract.
//      *
//      * @param contractName Contract name in the format "MyContract.sol" or "MyContract.sol:MyContract" or artifact path relative to the project root directory
//      * @param outDir Foundry output directory to search in if contractName is not an artifact path
//      * @return Fully qualified name of the contract, e.g. "src/MyContract.sol:MyContract"
//      */
//     function getFullyQualifiedName(
//         string memory contractName,
//         string memory outDir
//     ) internal view returns (string memory) {
//         ContractInfo memory info = getContractInfo(contractName, outDir);
//         return string(abi.encodePacked(info.contractPath, ":", info.shortName));
//     }

//     /**
//      * @dev Gets information about a contract from its Foundry artifact.
//      *
//      * @param contractName Contract name in the format "MyContract.sol" or "MyContract.sol:MyContract" or artifact path relative to the project root directory
//      * @param outDir Foundry output directory to search in if contractName is not an artifact path
//      * @return ContractInfo struct containing information about the contract
//      */
//     function getContractInfo(
//         string memory contractName,
//         string memory outDir
//     ) internal view returns (ContractInfo memory) {
//         Vm vm = Vm(CHEATCODE_ADDRESS);

//         ContractInfo memory info;

//         info.shortName = _toShortName(contractName);

//         string memory fileName = _toFileName(contractName);

//         string memory artifactPath = string(
//             abi.encodePacked(vm.projectRoot(), "/", outDir, "/", fileName, "/", info.shortName, ".json")
//         );
//         string memory artifactJson = vm.readFile(artifactPath);

//         if (!vm.keyExistsJson(artifactJson, ".ast")) {
//             revert(
//                 string(
//                     abi.encodePacked(
//                         "Could not find AST in artifact ",
//                         artifactPath,
//                         ". Set `ast = true` in foundry.toml"
//                     )
//                 )
//             );
//         }
//         info.contractPath = vm.parseJsonString(artifactJson, ".ast.absolutePath");
//         if (vm.keyExistsJson(artifactJson, ".ast.license")) {
//             info.license = vm.parseJsonString(artifactJson, ".ast.license");
//         }
//         info.sourceCodeHash = vm.parseJsonString(
//             artifactJson,
//             string(abi.encodePacked(".metadata.sources.['", info.contractPath, "'].keccak256"))
//         );
//         info.artifactPath = artifactPath;

//         return info;
//     }

//     using strings for *;

//     /**
//      * Gets the path to the build-info file that contains the given bytecode.
//      *
//      * @param sourceCodeHash keccak256 hash of the source code from metadata
//      * @param contractName Contract name to display in error message if build-info file is not found
//      * @param outDir Foundry output directory that contains a build-info directory
//      * @return The path to the build-info file that contains the given bytecode
//      */
//     function getBuildInfoFile(
//         string memory sourceCodeHash,
//         string memory contractName,
//         string memory outDir
//     ) internal returns (string memory) {
//         string[] memory inputs = new string[](4);
//         inputs[0] = "grep";
//         inputs[1] = "-rl";
//         inputs[2] = string(abi.encodePacked('"', sourceCodeHash, '"'));
//         inputs[3] = string(abi.encodePacked(outDir, "/build-info"));

//         VmSafe.FfiResult memory result = runAsBashCommand(inputs);
//         string memory stdout = string(result.stdout);

//         if (!stdout.toSlice().endsWith(".json".toSlice())) {
//             revert(
//                 string(
//                     abi.encodePacked(
//                         "Could not find build-info file with matching source code hash for contract ",
//                         contractName
//                     )
//                 )
//             );
//         }

//         return stdout;
//     }

//     /**
//      * @dev Gets the output directory from the FOUNDRY_OUT environment variable, or defaults to "out" if not set.
//      */
//     function getOutDir() internal view returns (string memory) {
//         Vm vm = Vm(CHEATCODE_ADDRESS);

//         string memory defaultOutDir = "out";
//         return vm.envOr("FOUNDRY_OUT", defaultOutDir);
//     }

//     function _split(
//         strings.slice memory inputSlice,
//         strings.slice memory delimSlice
//     ) private pure returns (string[] memory) {
//         string[] memory parts = new string[](inputSlice.count(delimSlice) + 1);
//         for (uint i = 0; i < parts.length; i++) {
//             parts[i] = inputSlice.split(delimSlice).toString();
//         }
//         return parts;
//     }

//     function _toFileName(string memory contractName) private pure returns (string memory) {
//         strings.slice memory name = contractName.toSlice();
//         if (name.endsWith(".sol".toSlice())) {
//             return name.toString();
//         } else if (name.count(":".toSlice()) == 1) {
//             return name.split(":".toSlice()).toString();
//         } else {
//             if (name.endsWith(".json".toSlice())) {
//                 string[] memory parts = _split(name, "/".toSlice());
//                 if (parts.length > 1) {
//                     return parts[parts.length - 2];
//                 }
//             }

//             revert(
//                 string(
//                     abi.encodePacked(
//                         "Contract name ",
//                         contractName,
//                         " must be in the format MyContract.sol:MyContract or MyContract.sol or out/MyContract.sol/MyContract.json"
//                     )
//                 )
//             );
//         }
//     }

//     function _toShortName(string memory contractName) private pure returns (string memory) {
//         strings.slice memory name = contractName.toSlice();
//         if (name.endsWith(".sol".toSlice())) {
//             return name.until(".sol".toSlice()).toString();
//         } else if (name.count(":".toSlice()) == 1) {
//             name.split(":".toSlice());
//             return name.split(":".toSlice()).toString();
//         } else if (name.endsWith(".json".toSlice())) {
//             string[] memory parts = _split(name, "/".toSlice());
//             string memory jsonName = parts[parts.length - 1];
//             return jsonName.toSlice().until(".json".toSlice()).toString();
//         } else {
//             revert(
//                 string(
//                     abi.encodePacked(
//                         "Contract name ",
//                         contractName,
//                         " must be in the format MyContract.sol:MyContract or MyContract.sol or out/MyContract.sol/MyContract.json"
//                     )
//                 )
//             );
//         }
//     }

//     /**
//      * @dev Converts an array of inputs to a bash command.
//      * @param inputs Inputs for a command, e.g. ["grep", "-rl", "0x1234", "out/build-info"]
//      * @param bashPath Path to the bash executable or just "bash" if it is in the PATH
//      * @return A bash command that runs the given inputs, e.g. ["bash", "-c", "grep -rl 0x1234 out/build-info"]
//      */
//     function toBashCommand(string[] memory inputs, string memory bashPath) internal pure returns (string[] memory) {
//         string memory commandString;
//         for (uint i = 0; i < inputs.length; i++) {
//             commandString = string(abi.encodePacked(commandString, inputs[i]));
//             if (i != inputs.length - 1) {
//                 commandString = string(abi.encodePacked(commandString, " "));
//             }
//         }

//         string[] memory result = new string[](3);
//         result[0] = bashPath;
//         result[1] = "-c";
//         result[2] = commandString;
//         return result;
//     }

//     /**
//      * @dev Runs an arbitrary command using bash.
//      * @param inputs Inputs for a command, e.g. ["grep", "-rl", "0x1234", "out/build-info"]
//      * @return The result of the corresponding bash command as a Vm.FfiResult struct
//      */
//     function runAsBashCommand(string[] memory inputs) internal returns (VmSafe.FfiResult memory) {
//         Vm vm = Vm(CHEATCODE_ADDRESS);
//         string memory defaultBashPath = "bash";
//         string memory bashPath = vm.envOr("OPENZEPPELIN_BASH_PATH", defaultBashPath);

//         string[] memory bashCommand = toBashCommand(inputs, bashPath);
//         VmSafe.FfiResult memory result = vm.tryFfi(bashCommand);
//         if (result.exitCode != 0 && result.stdout.length == 0 && result.stderr.length == 0) {
//             // On Windows, using the bash executable from WSL leads to a non-zero exit code and no output
//             revert(
//                 string(
//                     abi.encodePacked(
//                         'Failed to run bash command with "',
//                         bashCommand[0],
//                         '". If you are using Windows, set the OPENZEPPELIN_BASH_PATH environment variable to the fully qualified path of the bash executable. For example, if you are using Git for Windows, add the following line in the .env file of your project (using forward slashes):\nOPENZEPPELIN_BASH_PATH="C:/Program Files/Git/bin/bash"'
//                     )
//                 )
//             );
//         } else {
//             return result;
//         }
//     }
// }

// // pkg/contracts/src/interfaces/ISuperToken.sol

// /**
//  * @title Super token (Superfluid Token + ERC20 + ERC777) interface
//  * @author Superfluid
//  */
// interface ISuperToken is IERC20Metadata, IERC777 {
//     /**
//      *
//      * Errors
//      *
//      */
//     error SUPER_TOKEN_CALLER_IS_NOT_OPERATOR_FOR_HOLDER(); // 0xf7f02227
//     error SUPER_TOKEN_NOT_ERC777_TOKENS_RECIPIENT(); // 0xfe737d05
//     error SUPER_TOKEN_INFLATIONARY_DEFLATIONARY_NOT_SUPPORTED(); // 0xe3e13698
//     error SUPER_TOKEN_NO_UNDERLYING_TOKEN(); // 0xf79cf656
//     error SUPER_TOKEN_ONLY_SELF(); // 0x7ffa6648
//     error SUPER_TOKEN_ONLY_ADMIN(); // 0x0484acab
//     error SUPER_TOKEN_ONLY_GOV_OWNER(); // 0xd9c7ed08
//     error SUPER_TOKEN_APPROVE_FROM_ZERO_ADDRESS(); // 0x81638627
//     error SUPER_TOKEN_APPROVE_TO_ZERO_ADDRESS(); // 0xdf070274
//     error SUPER_TOKEN_BURN_FROM_ZERO_ADDRESS(); // 0xba2ab184
//     error SUPER_TOKEN_MINT_TO_ZERO_ADDRESS(); // 0x0d243157
//     error SUPER_TOKEN_TRANSFER_FROM_ZERO_ADDRESS(); // 0xeecd6c9b
//     error SUPER_TOKEN_TRANSFER_TO_ZERO_ADDRESS(); // 0xe219bd39
//     error SUPER_TOKEN_NFT_PROXY_ADDRESS_CHANGED(); // 0x6bef249d

//     /**
//      * @dev Initialize the contract
//      */
//     function initialize(IERC20 underlyingToken, uint8 underlyingDecimals, string calldata n, string calldata s)
//         external;

//     /**
//      * @dev Initialize the contract with an admin
//      */
//     function initializeWithAdmin(
//         IERC20 underlyingToken,
//         uint8 underlyingDecimals,
//         string calldata n,
//         string calldata s,
//         address admin
//     ) external;

//     /**
//      * @notice Changes the admin for the SuperToken
//      * @dev Only the current admin can call this function
//      * if admin is address(0), it is implicitly the host address
//      * @param newAdmin New admin address
//      */
//     function changeAdmin(address newAdmin) external;

//     event AdminChanged(address indexed oldAdmin, address indexed newAdmin);

//     /**
//      * @dev Returns the admin address for the SuperToken
//      */
//     function getAdmin() external view returns (address admin);

//     /**
//      *
//      * Immutable variables
//      *
//      */

//     // solhint-disable-next-line func-name-mixedcase
//     // function POOL_ADMIN_NFT() external view returns (IPoolAdminNFT);
//     // solhint-disable-next-line func-name-mixedcase
//     // function POOL_MEMBER_NFT() external view returns (IPoolMemberNFT);

//     /**
//      *
//      * IERC20Metadata & ERC777
//      *
//      */

//     /**
//      * @dev Returns the name of the token.
//      */
//     function name() external view override(IERC777, IERC20Metadata) returns (string memory);

//     /**
//      * @dev Returns the symbol of the token, usually a shorter version of the
//      * name.
//      */
//     function symbol() external view override(IERC777, IERC20Metadata) returns (string memory);

//     /**
//      * @dev Returns the number of decimals used to get its user representation.
//      * For example, if `decimals` equals `2`, a balance of `505` tokens should
//      * be displayed to a user as `5,05` (`505 / 10 ** 2`).
//      *
//      * Tokens usually opt for a value of 18, imitating the relationship between
//      * Ether and Wei. This is the value {ERC20} uses, unless {_setupDecimals} is
//      * called.
//      *
//      * @custom:note SuperToken always uses 18 decimals.
//      *
//      * This information is only used for _display_ purposes: it in
//      * no way affects any of the arithmetic of the contract, including
//      * {IERC20-balanceOf} and {IERC20-transfer}.
//      */
//     function decimals() external view override(IERC20Metadata) returns (uint8);

//     /**
//      *
//      * ERC20 & ERC777
//      *
//      */

//     /**
//      * @dev See {IERC20-totalSupply}.
//      */
//     function totalSupply() external view override(IERC777, IERC20) returns (uint256);

//     /**
//      * @dev Returns the amount of tokens owned by an account (`owner`).
//      */
//     function balanceOf(address account) external view override(IERC777, IERC20) returns (uint256 balance);

//     /**
//      *
//      * ERC20
//      *
//      */

//     /**
//      * @dev Moves `amount` tokens from the caller's account to `recipient`.
//      *
//      * @return Returns Success a boolean value indicating whether the operation succeeded.
//      *
//      * @custom:emits a {Transfer} event.
//      */
//     function transfer(address recipient, uint256 amount) external override(IERC20) returns (bool);

//     /**
//      * @dev Returns the remaining number of tokens that `spender` will be
//      *         allowed to spend on behalf of `owner` through {transferFrom}. This is
//      *         zero by default.
//      *
//      * @notice This value changes when {approve} or {transferFrom} are called.
//      */
//     function allowance(address owner, address spender) external view override(IERC20) returns (uint256);

//     /**
//      * @dev Sets `amount` as the allowance of `spender` over the caller's tokens.
//      *
//      * @return Returns Success a boolean value indicating whether the operation succeeded.
//      *
//      * @custom:note Beware that changing an allowance with this method brings the risk
//      * that someone may use both the old and the new allowance by unfortunate
//      * transaction ordering. One possible solution to mitigate this race
//      * condition is to first reduce the spender's allowance to 0 and set the
//      * desired value afterwards:
//      * https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
//      *
//      * @custom:emits an {Approval} event.
//      */
//     function approve(address spender, uint256 amount) external override(IERC20) returns (bool);

//     /**
//      * @dev Moves `amount` tokens from `sender` to `recipient` using the
//      *         allowance mechanism. `amount` is then deducted from the caller's
//      *         allowance.
//      *
//      * @return Returns Success a boolean value indicating whether the operation succeeded.
//      *
//      * @custom:emits a {Transfer} event.
//      */
//     function transferFrom(address sender, address recipient, uint256 amount) external override(IERC20) returns (bool);

//     /**
//      * @dev Atomically increases the allowance granted to `spender` by the caller.
//      *
//      * This is an alternative to {approve} that can be used as a mitigation for
//      * problems described in {IERC20-approve}.
//      *
//      * @custom:emits an {Approval} event indicating the updated allowance.
//      *
//      * @custom:requirements
//      * - `spender` cannot be the zero address.
//      */
//     function increaseAllowance(address spender, uint256 addedValue) external returns (bool);

//     /**
//      * @dev Atomically decreases the allowance granted to `spender` by the caller.
//      *
//      * This is an alternative to {approve} that can be used as a mitigation for
//      * problems described in {IERC20-approve}.
//      *
//      * @custom:emits an {Approval} event indicating the updated allowance.
//      *
//      * @custom:requirements
//      * - `spender` cannot be the zero address.
//      * - `spender` must have allowance for the caller of at least
//      * `subtractedValue`.
//      */
//     function decreaseAllowance(address spender, uint256 subtractedValue) external returns (bool);

//     /**
//      *
//      * ERC777
//      *
//      */

//     /**
//      * @dev Returns the smallest part of the token that is not divisible. This
//      *         means all token operations (creation, movement and destruction) must have
//      *         amounts that are a multiple of this number.
//      *
//      * @custom:note For super token contracts, this value is always 1
//      */
//     function granularity() external view override(IERC777) returns (uint256);

//     /**
//      * @dev Moves `amount` tokens from the caller's account to `recipient`.
//      *
//      * @dev If send or receive hooks are registered for the caller and `recipient`,
//      *      the corresponding functions will be called with `userData` and empty
//      *      `operatorData`. See {IERC777Sender} and {IERC777Recipient}.
//      *
//      * @custom:emits a {Sent} event.
//      *
//      * @custom:requirements
//      * - the caller must have at least `amount` tokens.
//      * - `recipient` cannot be the zero address.
//      * - if `recipient` is a contract, it must implement the {IERC777Recipient}
//      * interface.
//      */
//     function send(address recipient, uint256 amount, bytes calldata userData) external override(IERC777);

//     /**
//      * @dev Destroys `amount` tokens from the caller's account, reducing the
//      * total supply and transfers the underlying token to the caller's account.
//      *
//      * If a send hook is registered for the caller, the corresponding function
//      * will be called with `userData` and empty `operatorData`. See {IERC777Sender}.
//      *
//      * @custom:emits a {Burned} event.
//      *
//      * @custom:requirements
//      * - the caller must have at least `amount` tokens.
//      */
//     function burn(uint256 amount, bytes calldata userData) external override(IERC777);

//     /**
//      * @dev Returns true if an account is an operator of `tokenHolder`.
//      * Operators can send and burn tokens on behalf of their owners. All
//      * accounts are their own operator.
//      *
//      * See {operatorSend} and {operatorBurn}.
//      */
//     function isOperatorFor(address operator, address tokenHolder) external view override(IERC777) returns (bool);

//     /**
//      * @dev Make an account an operator of the caller.
//      *
//      * See {isOperatorFor}.
//      *
//      * @custom:emits an {AuthorizedOperator} event.
//      *
//      * @custom:requirements
//      * - `operator` cannot be calling address.
//      */
//     function authorizeOperator(address operator) external override(IERC777);

//     /**
//      * @dev Revoke an account's operator status for the caller.
//      *
//      * See {isOperatorFor} and {defaultOperators}.
//      *
//      * @custom:emits a {RevokedOperator} event.
//      *
//      * @custom:requirements
//      * - `operator` cannot be calling address.
//      */
//     function revokeOperator(address operator) external override(IERC777);

//     /**
//      * @dev Returns the list of default operators. These accounts are operators
//      * for all token holders, even if {authorizeOperator} was never called on
//      * them.
//      *
//      * This list is immutable, but individual holders may revoke these via
//      * {revokeOperator}, in which case {isOperatorFor} will return false.
//      */
//     function defaultOperators() external view override(IERC777) returns (address[] memory);

//     /**
//      * @dev Moves `amount` tokens from `sender` to `recipient`. The caller must
//      * be an operator of `sender`.
//      *
//      * If send or receive hooks are registered for `sender` and `recipient`,
//      * the corresponding functions will be called with `userData` and
//      * `operatorData`. See {IERC777Sender} and {IERC777Recipient}.
//      *
//      * @custom:emits a {Sent} event.
//      *
//      * @custom:requirements
//      * - `sender` cannot be the zero address.
//      * - `sender` must have at least `amount` tokens.
//      * - the caller must be an operator for `sender`.
//      * - `recipient` cannot be the zero address.
//      * - if `recipient` is a contract, it must implement the {IERC777Recipient}
//      * interface.
//      */
//     function operatorSend(
//         address sender,
//         address recipient,
//         uint256 amount,
//         bytes calldata userData,
//         bytes calldata operatorData
//     ) external override(IERC777);

//     /**
//      * @dev Destroys `amount` tokens from `account`, reducing the total supply.
//      * The caller must be an operator of `account`.
//      *
//      * If a send hook is registered for `account`, the corresponding function
//      * will be called with `userData` and `operatorData`. See {IERC777Sender}.
//      *
//      * @custom:emits a {Burned} event.
//      *
//      * @custom:requirements
//      * - `account` cannot be the zero address.
//      * - `account` must have at least `amount` tokens.
//      * - the caller must be an operator for `account`.
//      */
//     function operatorBurn(address account, uint256 amount, bytes calldata userData, bytes calldata operatorData)
//         external
//         override(IERC777);

//     /**
//      *
//      * SuperToken custom token functions
//      *
//      */

//     /**
//      * @dev Mint new tokens for the account
//      * If `userData` is not empty, the `tokensReceived` hook is invoked according to ERC777 semantics.
//      *
//      * @custom:modifiers
//      *  - onlySelf
//      */
//     function selfMint(address account, uint256 amount, bytes memory userData) external;

//     /**
//      * @dev Burn existing tokens for the account
//      * If `userData` is not empty, the `tokensToSend` hook is invoked according to ERC777 semantics.
//      *
//      * @custom:modifiers
//      *  - onlySelf
//      */
//     function selfBurn(address account, uint256 amount, bytes memory userData) external;

//     /**
//      * @dev Transfer `amount` tokens from the `sender` to `recipient`.
//      * If `spender` isn't the same as `sender`, checks if `spender` has allowance to
//      * spend tokens of `sender`.
//      *
//      * @custom:modifiers
//      *  - onlySelf
//      */
//     function selfTransferFrom(address sender, address spender, address recipient, uint256 amount) external;

//     /**
//      * @dev Give `spender`, `amount` allowance to spend the tokens of
//      * `account`.
//      *
//      * @custom:modifiers
//      *  - onlySelf
//      */
//     function selfApproveFor(address account, address spender, uint256 amount) external;

//     /**
//      *
//      * SuperToken extra functions
//      *
//      */

//     /**
//      * @dev Transfer all available balance from `msg.sender` to `recipient`
//      */
//     function transferAll(address recipient) external;

//     /**
//      *
//      * ERC20 wrapping
//      *
//      */

//     /**
//      * @dev Return the underlying token contract
//      * @return tokenAddr Underlying token address
//      */
//     function getUnderlyingToken() external view returns (address tokenAddr);

//     /**
//      * @dev Return the underlying token decimals
//      * @return underlyingDecimals Underlying token decimals
//      */
//     function getUnderlyingDecimals() external view returns (uint8 underlyingDecimals);

//     /**
//      * @dev Return the underlying token conversion rate
//      * @param amount Number of tokens to be upgraded (in 18 decimals)
//      * @return underlyingAmount The underlying token amount after scaling
//      * @return adjustedAmount The super token amount after scaling
//      */
//     function toUnderlyingAmount(uint256 amount)
//         external
//         view
//         returns (uint256 underlyingAmount, uint256 adjustedAmount);

//     /**
//      * @dev Upgrade ERC20 to SuperToken.
//      * @param amount Number of tokens to be upgraded (in 18 decimals)
//      *
//      * @custom:note It will use `transferFrom` to get tokens. Before calling this
//      * function you should `approve` this contract
//      */
//     function upgrade(uint256 amount) external;

//     /**
//      * @dev Upgrade ERC20 to SuperToken and transfer immediately
//      * @param to The account to receive upgraded tokens
//      * @param amount Number of tokens to be upgraded (in 18 decimals)
//      * @param userData User data for the TokensRecipient callback
//      *
//      * @custom:note It will use `transferFrom` to get tokens. Before calling this
//      * function you should `approve` this contract
//      *
//      * @custom:warning
//      * - there is potential of reentrancy IF the "to" account is a registered ERC777 recipient.
//      * @custom:requirements
//      * - if `userData` is NOT empty AND `to` is a contract, it MUST be a registered ERC777 recipient
//      *   otherwise it reverts.
//      */
//     function upgradeTo(address to, uint256 amount, bytes calldata userData) external;

//     /**
//      * @dev Token upgrade event
//      * @param account Account where tokens are upgraded to
//      * @param amount Amount of tokens upgraded (in 18 decimals)
//      */
//     event TokenUpgraded(address indexed account, uint256 amount);

//     /**
//      * @dev Downgrade SuperToken to ERC20.
//      * @dev It will call transfer to send tokens
//      * @param amount Number of tokens to be downgraded
//      */
//     function downgrade(uint256 amount) external;

//     /**
//      * @dev Downgrade SuperToken to ERC20 and transfer immediately
//      * @param to The account to receive downgraded tokens
//      * @param amount Number of tokens to be downgraded (in 18 decimals)
//      */
//     function downgradeTo(address to, uint256 amount) external;

//     /**
//      * @dev Token downgrade event
//      * @param account Account whose tokens are downgraded
//      * @param amount Amount of tokens downgraded
//      */
//     event TokenDowngraded(address indexed account, uint256 amount);

//     /**
//      *
//      * Batch Operations
//      *
//      */

//     /**
//      * @dev Perform ERC20 approve by host contract.
//      * @param account The account owner to be approved.
//      * @param spender The spender of account owner's funds.
//      * @param amount Number of tokens to be approved.
//      *
//      * @custom:modifiers
//      *  - onlyHost
//      */
//     function operationApprove(address account, address spender, uint256 amount) external;

//     function operationIncreaseAllowance(address account, address spender, uint256 addedValue) external;

//     function operationDecreaseAllowance(address account, address spender, uint256 subtractedValue) external;

//     /**
//      * @dev Perform ERC20 transferFrom by host contract.
//      * @param account The account to spend sender's funds.
//      * @param spender The account where the funds is sent from.
//      * @param recipient The recipient of the funds.
//      * @param amount Number of tokens to be transferred.
//      *
//      * @custom:modifiers
//      *  - onlyHost
//      */
//     function operationTransferFrom(address account, address spender, address recipient, uint256 amount) external;

//     /**
//      * @dev Perform ERC777 send by host contract.
//      * @param spender The account where the funds is sent from.
//      * @param recipient The recipient of the funds.
//      * @param amount Number of tokens to be transferred.
//      * @param userData Arbitrary user inputted data
//      *
//      * @custom:modifiers
//      *  - onlyHost
//      */
//     function operationSend(address spender, address recipient, uint256 amount, bytes memory userData) external;

//     /**
//      * @dev Upgrade ERC20 to SuperToken by host contract.
//      * @param account The account to be changed.
//      * @param amount Number of tokens to be upgraded (in 18 decimals)
//      *
//      * @custom:modifiers
//      *  - onlyHost
//      */
//     function operationUpgrade(address account, uint256 amount) external;

//     /**
//      * @dev Downgrade ERC20 to SuperToken by host contract.
//      * @param account The account to be changed.
//      * @param amount Number of tokens to be downgraded (in 18 decimals)
//      *
//      * @custom:modifiers
//      *  - onlyHost
//      */
//     function operationDowngrade(address account, uint256 amount) external;

//     /**
//      * @dev Upgrade ERC20 to SuperToken by host contract and transfer immediately.
//      * @param account The account to be changed.
//      * @param to The account to receive upgraded tokens
//      * @param amount Number of tokens to be upgraded (in 18 decimals)
//      *
//      * @custom:modifiers
//      *  - onlyHost
//      */
//     function operationUpgradeTo(address account, address to, uint256 amount) external;

//     /**
//      * @dev Downgrade ERC20 to SuperToken by host contract and transfer immediately.
//      * @param account The account to be changed.
//      * @param to The account to receive downgraded tokens
//      * @param amount Number of tokens to be downgraded (in 18 decimals)
//      *
//      * @custom:modifiers
//      *  - onlyHost
//      */
//     function operationDowngradeTo(address account, address to, uint256 amount) external;

//     /**
//      * @dev Pool Admin NFT proxy created event
//      * @param poolAdminNFT pool admin nft address
//      */
//     event PoolAdminNFTCreated(address indexed poolAdminNFT);

//     /**
//      * @dev Pool Member NFT proxy created event
//      * @param poolMemberNFT pool member nft address
//      */
//     event PoolMemberNFTCreated(address indexed poolMemberNFT);

//     /**
//      *
//      * Function modifiers for access control and parameter validations
//      *
//      * While they cannot be explicitly stated in function definitions, they are
//      * listed in function definition comments instead for clarity.
//      *
//      * NOTE: solidity-coverage not supporting it
//      *
//      */

//     /// @dev The msg.sender must be the contract itself
//     //modifier onlySelf() virtual
// }

// // pkg/contracts/src/interfaces/FAllo.sol

// interface FAllo {
//     function createPoolWithCustomStrategy(
//         bytes32 _profileId,
//         address _strategy,
//         bytes memory _initStrategyData,
//         address _token,
//         uint256 _amount,
//         Metadata memory _metadata,
//         address[] memory _managers
//     ) external payable returns (uint256 poolId);

//     function getRegistry() external view returns (address);
//     function getPool(uint256 _poolId) external view returns (IAllo.Pool memory);
// }

// // lib/openzeppelin-contracts/contracts/proxy/ERC1967/ERC1967Upgrade.sol

// // OpenZeppelin Contracts (last updated v4.9.0) (proxy/ERC1967/ERC1967Upgrade.sol)

// /**
//  * @dev This abstract contract provides getters and event emitting update functions for
//  * https://eips.ethereum.org/EIPS/eip-1967[EIP1967] slots.
//  *
//  * _Available since v4.1._
//  */
// abstract contract ERC1967Upgrade is IERC1967 {
//     // This is the keccak-256 hash of "eip1967.proxy.rollback" subtracted by 1
//     bytes32 private constant _ROLLBACK_SLOT = 0x4910fdfa16fed3260ed0e7147f7cc6da11a60208b5b9406d12a635614ffd9143;

//     /**
//      * @dev Storage slot with the address of the current implementation.
//      * This is the keccak-256 hash of "eip1967.proxy.implementation" subtracted by 1, and is
//      * validated in the constructor.
//      */
//     bytes32 internal constant _IMPLEMENTATION_SLOT = 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc;

//     /**
//      * @dev Returns the current implementation address.
//      */
//     function _getImplementation() internal view returns (address) {
//         return StorageSlot.getAddressSlot(_IMPLEMENTATION_SLOT).value;
//     }

//     /**
//      * @dev Stores a new address in the EIP1967 implementation slot.
//      */
//     function _setImplementation(address newImplementation) private {
//         require(Address.isContract(newImplementation), "ERC1967: new implementation is not a contract");
//         StorageSlot.getAddressSlot(_IMPLEMENTATION_SLOT).value = newImplementation;
//     }

//     /**
//      * @dev Perform implementation upgrade
//      *
//      * Emits an {Upgraded} event.
//      */
//     function _upgradeTo(address newImplementation) internal {
//         _setImplementation(newImplementation);
//         emit Upgraded(newImplementation);
//     }

//     /**
//      * @dev Perform implementation upgrade with additional setup call.
//      *
//      * Emits an {Upgraded} event.
//      */
//     function _upgradeToAndCall(address newImplementation, bytes memory data, bool forceCall) internal {
//         _upgradeTo(newImplementation);
//         if (data.length > 0 || forceCall) {
//             Address.functionDelegateCall(newImplementation, data);
//         }
//     }

//     /**
//      * @dev Perform implementation upgrade with security checks for UUPS proxies, and additional setup call.
//      *
//      * Emits an {Upgraded} event.
//      */
//     function _upgradeToAndCallUUPS(address newImplementation, bytes memory data, bool forceCall) internal {
//         // Upgrades from old implementations will perform a rollback test. This test requires the new
//         // implementation to upgrade back to the old, non-ERC1822 compliant, implementation. Removing
//         // this special case will break upgrade paths from old UUPS implementation to new ones.
//         if (StorageSlot.getBooleanSlot(_ROLLBACK_SLOT).value) {
//             _setImplementation(newImplementation);
//         } else {
//             try IERC1822Proxiable(newImplementation).proxiableUUID() returns (bytes32 slot) {
//                 require(slot == _IMPLEMENTATION_SLOT, "ERC1967Upgrade: unsupported proxiableUUID");
//             } catch {
//                 revert("ERC1967Upgrade: new implementation is not UUPS");
//             }
//             _upgradeToAndCall(newImplementation, data, forceCall);
//         }
//     }

//     /**
//      * @dev Storage slot with the admin of the contract.
//      * This is the keccak-256 hash of "eip1967.proxy.admin" subtracted by 1, and is
//      * validated in the constructor.
//      */
//     bytes32 internal constant _ADMIN_SLOT = 0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103;

//     /**
//      * @dev Returns the current admin.
//      */
//     function _getAdmin() internal view returns (address) {
//         return StorageSlot.getAddressSlot(_ADMIN_SLOT).value;
//     }

//     /**
//      * @dev Stores a new address in the EIP1967 admin slot.
//      */
//     function _setAdmin(address newAdmin) private {
//         require(newAdmin != address(0), "ERC1967: new admin is the zero address");
//         StorageSlot.getAddressSlot(_ADMIN_SLOT).value = newAdmin;
//     }

//     /**
//      * @dev Changes the admin of the proxy.
//      *
//      * Emits an {AdminChanged} event.
//      */
//     function _changeAdmin(address newAdmin) internal {
//         emit AdminChanged(_getAdmin(), newAdmin);
//         _setAdmin(newAdmin);
//     }

//     /**
//      * @dev The storage slot of the UpgradeableBeacon contract which defines the implementation for this proxy.
//      * This is bytes32(uint256(keccak256('eip1967.proxy.beacon')) - 1)) and is validated in the constructor.
//      */
//     bytes32 internal constant _BEACON_SLOT = 0xa3f0ad74e5423aebfd80d3ef4346578335a9a72aeaee59ff6cb3582b35133d50;

//     /**
//      * @dev Returns the current beacon.
//      */
//     function _getBeacon() internal view returns (address) {
//         return StorageSlot.getAddressSlot(_BEACON_SLOT).value;
//     }

//     /**
//      * @dev Stores a new beacon in the EIP1967 beacon slot.
//      */
//     function _setBeacon(address newBeacon) private {
//         require(Address.isContract(newBeacon), "ERC1967: new beacon is not a contract");
//         require(
//             Address.isContract(IBeacon(newBeacon).implementation()),
//             "ERC1967: beacon implementation is not a contract"
//         );
//         StorageSlot.getAddressSlot(_BEACON_SLOT).value = newBeacon;
//     }

//     /**
//      * @dev Perform beacon upgrade with additional setup call. Note: This upgrades the address of the beacon, it does
//      * not upgrade the implementation contained in the beacon (see {UpgradeableBeacon-_setImplementation} for that).
//      *
//      * Emits a {BeaconUpgraded} event.
//      */
//     function _upgradeBeaconToAndCall(address newBeacon, bytes memory data, bool forceCall) internal {
//         _setBeacon(newBeacon);
//         emit BeaconUpgraded(newBeacon);
//         if (data.length > 0 || forceCall) {
//             Address.functionDelegateCall(IBeacon(newBeacon).implementation(), data);
//         }
//     }
// }

// // pkg/contracts/src/CVStrategy/ICVStrategy.sol

// /*|--------------------------------------------|*/
// /*|              STRUCTS/ENUMS                 |*/
// /*|--------------------------------------------|*/

// // interface IPointStrategy {
// //     function deactivatePoints(address _member) external;

// //     function increasePower(address _member, uint256 _amountToStake) external returns (uint256);

// //     function decreasePower(address _member, uint256 _amountToUntake) external returns (uint256);

// //     function getPointSystem() external returns (PointSystem);
// // }

// enum ProposalType {
//     Signaling,
//     Funding,
//     Streaming
// }

// enum PointSystem {
//     Fixed,
//     Capped,
//     Unlimited,
//     Quadratic
// }

// struct CreateProposal {
//     // uint256 proposalId;
//     uint256 poolId;
//     address beneficiary;
//     // ProposalType proposalType;
//     uint256 amountRequested;
//     address requestedToken;
//     Metadata metadata;
// }

// enum ProposalStatus {
//     Inactive, // Inactive
//     Active, // A vote that has been reported to Agreements
//     Paused, // A votee that is being challenged by Agreements
//     Cancelled, // A vote that has been cancelled
//     Executed, // A vote that has been executed
//     Disputed, // A vote that has been disputed
//     Rejected // A vote that has been rejected

// }

// struct ProposalDisputeInfo {
//     uint256 disputeId;
//     uint256 disputeTimestamp;
//     address challenger;
// }

// struct Proposal {
//     uint256 proposalId;
//     uint256 requestedAmount;
//     uint256 stakedAmount;
//     uint256 convictionLast;
//     address beneficiary;
//     address submitter;
//     address requestedToken;
//     uint256 blockLast;
//     ProposalStatus proposalStatus;
//     mapping(address => uint256) voterStakedPoints; // voter staked points
//     Metadata metadata;
//     ProposalDisputeInfo disputeInfo;
//     uint256 lastDisputeCompletion;
//     uint256 arbitrableConfigVersion;
// }

// struct ProposalSupport {
//     uint256 proposalId;
//     int256 deltaSupport; // use int256 to allow negative values
// }

// struct PointSystemConfig {
//     //Capped point system
//     uint256 maxAmount;
// }

// struct ArbitrableConfig {
//     IArbitrator arbitrator;
//     address tribunalSafe;
//     uint256 submitterCollateralAmount;
//     uint256 challengerCollateralAmount;
//     uint256 defaultRuling;
//     uint256 defaultRulingTimeout;
// }

// struct CVParams {
//     uint256 maxRatio;
//     uint256 weight;
//     uint256 decay;
//     uint256 minThresholdPoints;
// }

// struct CVStrategyInitializeParamsV0_0 {
//     CVParams cvParams;
//     ProposalType proposalType;
//     PointSystem pointSystem;
//     PointSystemConfig pointConfig;
//     ArbitrableConfig arbitrableConfig;
//     address registryCommunity;
//     address sybilScorer;
// }

// struct CVStrategyInitializeParamsV0_1 {
//     CVParams cvParams;
//     ProposalType proposalType;
//     PointSystem pointSystem;
//     PointSystemConfig pointConfig;
//     ArbitrableConfig arbitrableConfig;
//     address registryCommunity;
//     address sybilScorer;
//     uint256 sybilScorerThreshold;
//     address[] initialAllowlist;
// }

// struct CVStrategyInitializeParamsV0_2 {
//     CVParams cvParams;
//     ProposalType proposalType;
//     PointSystem pointSystem;
//     PointSystemConfig pointConfig;
//     ArbitrableConfig arbitrableConfig;
//     address registryCommunity;
//     address sybilScorer;
//     uint256 sybilScorerThreshold;
//     address[] initialAllowlist;
//     address superfluidToken;
// }

// interface ICVStrategy {
//     function setPoolParams(
//         ArbitrableConfig memory _arbitrableConfig,
//         CVParams memory _cvParams,
//         address superfluidToken
//     ) external;
// }

// // lib/openzeppelin-contracts/contracts/proxy/utils/UUPSUpgradeable.sol

// // OpenZeppelin Contracts (last updated v4.9.0) (proxy/utils/UUPSUpgradeable.sol)

// /**
//  * @dev An upgradeability mechanism designed for UUPS proxies. The functions included here can perform an upgrade of an
//  * {ERC1967Proxy}, when this contract is set as the implementation behind such a proxy.
//  *
//  * A security mechanism ensures that an upgrade does not turn off upgradeability accidentally, although this risk is
//  * reinstated if the upgrade retains upgradeability but removes the security mechanism, e.g. by replacing
//  * `UUPSUpgradeable` with a custom implementation of upgrades.
//  *
//  * The {_authorizeUpgrade} function must be overridden to include access restriction to the upgrade mechanism.
//  *
//  * _Available since v4.1._
//  */
// abstract contract UUPSUpgradeable is IERC1822Proxiable, ERC1967Upgrade {
//     /// @custom:oz-upgrades-unsafe-allow state-variable-immutable state-variable-assignment
//     address private immutable __self = address(this);

//     /**
//      * @dev Check that the execution is being performed through a delegatecall call and that the execution context is
//      * a proxy contract with an implementation (as defined in ERC1967) pointing to self. This should only be the case
//      * for UUPS and transparent proxies that are using the current contract as their implementation. Execution of a
//      * function through ERC1167 minimal proxies (clones) would not normally pass this test, but is not guaranteed to
//      * fail.
//      */
//     modifier onlyProxy() {
//         require(address(this) != __self, "Function must be called through delegatecall");
//         require(_getImplementation() == __self, "Function must be called through active proxy");
//         _;
//     }

//     /**
//      * @dev Check that the execution is not being performed through a delegate call. This allows a function to be
//      * callable on the implementing contract but not through proxies.
//      */
//     modifier notDelegated() {
//         require(address(this) == __self, "UUPSUpgradeable: must not be called through delegatecall");
//         _;
//     }

//     /**
//      * @dev Implementation of the ERC1822 {proxiableUUID} function. This returns the storage slot used by the
//      * implementation. It is used to validate the implementation's compatibility when performing an upgrade.
//      *
//      * IMPORTANT: A proxy pointing at a proxiable contract should not be considered proxiable itself, because this risks
//      * bricking a proxy that upgrades to it, by delegating to itself until out of gas. Thus it is critical that this
//      * function revert if invoked through a proxy. This is guaranteed by the `notDelegated` modifier.
//      */
//     function proxiableUUID() external view virtual override notDelegated returns (bytes32) {
//         return _IMPLEMENTATION_SLOT;
//     }

//     /**
//      * @dev Upgrade the implementation of the proxy to `newImplementation`.
//      *
//      * Calls {_authorizeUpgrade}.
//      *
//      * Emits an {Upgraded} event.
//      *
//      * @custom:oz-upgrades-unsafe-allow-reachable delegatecall
//      */
//     function upgradeTo(address newImplementation) public virtual onlyProxy {
//         _authorizeUpgrade(newImplementation);
//         _upgradeToAndCallUUPS(newImplementation, new bytes(0), false);
//     }

//     /**
//      * @dev Upgrade the implementation of the proxy to `newImplementation`, and subsequently execute the function call
//      * encoded in `data`.
//      *
//      * Calls {_authorizeUpgrade}.
//      *
//      * Emits an {Upgraded} event.
//      *
//      * @custom:oz-upgrades-unsafe-allow-reachable delegatecall
//      */
//     function upgradeToAndCall(address newImplementation, bytes memory data) public payable virtual onlyProxy {
//         _authorizeUpgrade(newImplementation);
//         _upgradeToAndCallUUPS(newImplementation, data, true);
//     }

//     /**
//      * @dev Function that should revert when `msg.sender` is not authorized to upgrade the contract. Called by
//      * {upgradeTo} and {upgradeToAndCall}.
//      *
//      * Normally, this function will use an xref:access.adoc[access control] modifier such as {Ownable-onlyOwner}.
//      *
//      * ```solidity
//      * function _authorizeUpgrade(address) internal override onlyOwner {}
//      * ```
//      */
//     function _authorizeUpgrade(address newImplementation) internal virtual;
// }

// // pkg/contracts/src/CVStrategy/ConvictionsUtils.sol

// library ConvictionsUtils {
//     uint256 public constant D = 10000000; // 10**7
//     uint256 internal constant TWO_128 = 0x100000000000000000000000000000000; // 2**128
//     uint256 internal constant TWO_127 = 0x80000000000000000000000000000000; // 2**127

//     /**
//      * @dev Conviction formula: a^t * y(0) + x * (1 - a^t) / (1 - a)
//      * Solidity implementation: y = (2^128 * a^t * y0 + x * D * (2^128 - 2^128 * a^t) / (D - aD) + 2^127) / 2^128
//      * @param _timePassed Number of blocks since last conviction record
//      * @param _lastConv Last conviction record
//      * @param _oldAmount Amount of tokens staked until now
//      * @return Current conviction
//      */
//     function calculateConviction(uint256 _timePassed, uint256 _lastConv, uint256 _oldAmount, uint256 _decay)
//         public
//         pure
//         returns (uint256)
//     {
//         uint256 t = _timePassed;
//         // atTWO_128 = 2^128 * a^t
//         //        @audit-issue why that _pow require that need be less than TWO_128? why dont use 256?
//         //        @audit-ok they use 2^128 as the container for the result of the _pow function
//         uint256 atTWO_128 = _pow((_decay << 128) / D, t);
//         return (((atTWO_128 * _lastConv) + ((_oldAmount * D * (TWO_128 - atTWO_128)) / (D - _decay))) + TWO_127) >> 128;
//     }

//     /**
//      * @dev Formula: ρ * totalStaked / (1 - a) / (β - requestedAmount / total)**2
//      * For the Solidity implementation we amplify ρ and β and simplify the formula:
//      * weight = ρ * D
//      * maxRatio = β * D
//      * decay = a * D
//      * threshold = weight * totalStaked * D ** 2 * funds ** 2 / (D - decay) / (maxRatio * funds - requestedAmount * D) ** 2
//      * @param _requestedAmount Requested amount of tokens on certain proposal
//      * @return _threshold Threshold a proposal's conviction should surpass in order to be able to
//      * executed it.
//      */
//     function calculateThreshold(
//         uint256 _requestedAmount,
//         uint256 _poolAmount,
//         uint256 _totalPointsActivated,
//         uint256 _decay,
//         uint256 _weight,
//         uint256 _maxRatio,
//         uint256 _minThresholdPoints
//     ) public pure returns (uint256 _threshold) {
//         uint256 denom = (_maxRatio * 2 ** 64) / D - (_requestedAmount * 2 ** 64) / _poolAmount;
//         _threshold =
//             ((((((_weight << 128) / D) / ((denom * denom) >> 64)) * D) / (D - _decay)) * _totalPointsActivated) >> 64;

//         if (_totalPointsActivated != 0) {
//             uint256 thresholdOverride = (
//                 (_minThresholdPoints * D * getMaxConviction(_totalPointsActivated, _decay)) / (_totalPointsActivated)
//             ) / 10 ** 7;
//             _threshold = _threshold > thresholdOverride ? _threshold : thresholdOverride;
//         }
//     }

//     function getMaxConviction(uint256 amount, uint256 _decay) public pure returns (uint256) {
//         return ((amount * D) / (D - _decay));
//     }

//     /**
//      * Calculate (_a / 2^128)^_b * 2^128.  Parameter _a should be less than 2^128.
//      *
//      * @param _a left argument
//      * @param _b right argument
//      * @return _result (_a / 2^128)^_b * 2^128
//      */
//     function _pow(uint256 _a, uint256 _b) internal pure returns (uint256 _result) {
//         // TODO: Uncomment when contract size fixed with diamond
//         // if (_a >= TWO_128) {
//         //     revert AShouldBeUnderTwo_128();
//         // }

//         uint256 a = _a;
//         uint256 b = _b;
//         _result = TWO_128;
//         while (b > 0) {
//             if (b & 1 == 0) {
//                 a = _mul(a, a);
//                 b >>= 1;
//             } else {
//                 _result = _mul(_result, a);
//                 b -= 1;
//             }
//         }
//     }

//     /**
//      * Multiply _a by _b / 2^128.  Parameter _a should be less than or equal to
//      * 2^128 and parameter _b should be less than 2^128.
//      * @param _a left argument
//      * @param _b right argument
//      * @return _result _a * _b / 2^128
//      */
//     function _mul(uint256 _a, uint256 _b) internal pure returns (uint256 _result) {
//         // TODO: Uncomment when contract size fixed with diamond
//         // if (_a > TWO_128) {
//         //     revert AShouldBeUnderOrEqTwo_128();
//         // }
//         // if (_b > TWO_128) {
//         //     revert BShouldBeLessTwo_128();
//         // }

//         return ((_a * _b) + TWO_127) >> 128;
//     }
// }

// // lib/openzeppelin-contracts/contracts/proxy/ERC1967/ERC1967Proxy.sol

// // OpenZeppelin Contracts (last updated v4.7.0) (proxy/ERC1967/ERC1967Proxy.sol)

// /**
//  * @dev This contract implements an upgradeable proxy. It is upgradeable because calls are delegated to an
//  * implementation address that can be changed. This address is stored in storage in the location specified by
//  * https://eips.ethereum.org/EIPS/eip-1967[EIP1967], so that it doesn't conflict with the storage layout of the
//  * implementation behind the proxy.
//  */
// contract ERC1967Proxy is Proxy, ERC1967Upgrade {
//     /**
//      * @dev Initializes the upgradeable proxy with an initial implementation specified by `_logic`.
//      *
//      * If `_data` is nonempty, it's used as data in a delegate call to `_logic`. This will typically be an encoded
//      * function call, and allows initializing the storage of the proxy like a Solidity constructor.
//      */
//     constructor(address _logic, bytes memory _data) payable {
//         _upgradeToAndCall(_logic, _data, false);
//     }

//     /**
//      * @dev Returns the current implementation address.
//      */
//     function _implementation() internal view virtual override returns (address impl) {
//         return ERC1967Upgrade._getImplementation();
//     }
// }

// // lib/openzeppelin-contracts-upgradeable/contracts/access/AccessControlUpgradeable.sol

// // OpenZeppelin Contracts (last updated v4.9.0) (access/AccessControl.sol)

// /**
//  * @dev Contract module that allows children to implement role-based access
//  * control mechanisms. This is a lightweight version that doesn't allow enumerating role
//  * members except through off-chain means by accessing the contract event logs. Some
//  * applications may benefit from on-chain enumerability, for those cases see
//  * {AccessControlEnumerable}.
//  *
//  * Roles are referred to by their `bytes32` identifier. These should be exposed
//  * in the external API and be unique. The best way to achieve this is by
//  * using `public constant` hash digests:
//  *
//  * ```solidity
//  * bytes32 public constant MY_ROLE = keccak256("MY_ROLE");
//  * ```
//  *
//  * Roles can be used to represent a set of permissions. To restrict access to a
//  * function call, use {hasRole}:
//  *
//  * ```solidity
//  * function foo() public {
//  *     require(hasRole(MY_ROLE, msg.sender));
//  *     ...
//  * }
//  * ```
//  *
//  * Roles can be granted and revoked dynamically via the {grantRole} and
//  * {revokeRole} functions. Each role has an associated admin role, and only
//  * accounts that have a role's admin role can call {grantRole} and {revokeRole}.
//  *
//  * By default, the admin role for all roles is `DEFAULT_ADMIN_ROLE`, which means
//  * that only accounts with this role will be able to grant or revoke other
//  * roles. More complex role relationships can be created by using
//  * {_setRoleAdmin}.
//  *
//  * WARNING: The `DEFAULT_ADMIN_ROLE` is also its own admin: it has permission to
//  * grant and revoke this role. Extra precautions should be taken to secure
//  * accounts that have been granted it. We recommend using {AccessControlDefaultAdminRules}
//  * to enforce additional security measures for this role.
//  */
// abstract contract AccessControlUpgradeable is Initializable_1, ContextUpgradeable, IAccessControlUpgradeable, ERC165Upgradeable {
//     struct RoleData {
//         mapping(address => bool) members;
//         bytes32 adminRole;
//     }

//     mapping(bytes32 => RoleData) private _roles;

//     bytes32 public constant DEFAULT_ADMIN_ROLE = 0x00;

//     /**
//      * @dev Modifier that checks that an account has a specific role. Reverts
//      * with a standardized message including the required role.
//      *
//      * The format of the revert reason is given by the following regular expression:
//      *
//      *  /^AccessControl: account (0x[0-9a-f]{40}) is missing role (0x[0-9a-f]{64})$/
//      *
//      * _Available since v4.1._
//      */
//     modifier onlyRole(bytes32 role) {
//         _checkRole(role);
//         _;
//     }

//     function __AccessControl_init() internal onlyInitializing {
//     }

//     function __AccessControl_init_unchained() internal onlyInitializing {
//     }
//     /**
//      * @dev See {IERC165-supportsInterface}.
//      */
//     function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
//         return interfaceId == type(IAccessControlUpgradeable).interfaceId || super.supportsInterface(interfaceId);
//     }

//     /**
//      * @dev Returns `true` if `account` has been granted `role`.
//      */
//     function hasRole(bytes32 role, address account) public view virtual override returns (bool) {
//         return _roles[role].members[account];
//     }

//     /**
//      * @dev Revert with a standard message if `_msgSender()` is missing `role`.
//      * Overriding this function changes the behavior of the {onlyRole} modifier.
//      *
//      * Format of the revert message is described in {_checkRole}.
//      *
//      * _Available since v4.6._
//      */
//     function _checkRole(bytes32 role) internal view virtual {
//         _checkRole(role, _msgSender());
//     }

//     /**
//      * @dev Revert with a standard message if `account` is missing `role`.
//      *
//      * The format of the revert reason is given by the following regular expression:
//      *
//      *  /^AccessControl: account (0x[0-9a-f]{40}) is missing role (0x[0-9a-f]{64})$/
//      */
//     function _checkRole(bytes32 role, address account) internal view virtual {
//         if (!hasRole(role, account)) {
//             revert(
//                 string(
//                     abi.encodePacked(
//                         "AccessControl: account ",
//                         StringsUpgradeable.toHexString(account),
//                         " is missing role ",
//                         StringsUpgradeable.toHexString(uint256(role), 32)
//                     )
//                 )
//             );
//         }
//     }

//     /**
//      * @dev Returns the admin role that controls `role`. See {grantRole} and
//      * {revokeRole}.
//      *
//      * To change a role's admin, use {_setRoleAdmin}.
//      */
//     function getRoleAdmin(bytes32 role) public view virtual override returns (bytes32) {
//         return _roles[role].adminRole;
//     }

//     /**
//      * @dev Grants `role` to `account`.
//      *
//      * If `account` had not been already granted `role`, emits a {RoleGranted}
//      * event.
//      *
//      * Requirements:
//      *
//      * - the caller must have ``role``'s admin role.
//      *
//      * May emit a {RoleGranted} event.
//      */
//     function grantRole(bytes32 role, address account) public virtual override onlyRole(getRoleAdmin(role)) {
//         _grantRole(role, account);
//     }

//     /**
//      * @dev Revokes `role` from `account`.
//      *
//      * If `account` had been granted `role`, emits a {RoleRevoked} event.
//      *
//      * Requirements:
//      *
//      * - the caller must have ``role``'s admin role.
//      *
//      * May emit a {RoleRevoked} event.
//      */
//     function revokeRole(bytes32 role, address account) public virtual override onlyRole(getRoleAdmin(role)) {
//         _revokeRole(role, account);
//     }

//     /**
//      * @dev Revokes `role` from the calling account.
//      *
//      * Roles are often managed via {grantRole} and {revokeRole}: this function's
//      * purpose is to provide a mechanism for accounts to lose their privileges
//      * if they are compromised (such as when a trusted device is misplaced).
//      *
//      * If the calling account had been revoked `role`, emits a {RoleRevoked}
//      * event.
//      *
//      * Requirements:
//      *
//      * - the caller must be `account`.
//      *
//      * May emit a {RoleRevoked} event.
//      */
//     function renounceRole(bytes32 role, address account) public virtual override {
//         require(account == _msgSender(), "AccessControl: can only renounce roles for self");

//         _revokeRole(role, account);
//     }

//     /**
//      * @dev Grants `role` to `account`.
//      *
//      * If `account` had not been already granted `role`, emits a {RoleGranted}
//      * event. Note that unlike {grantRole}, this function doesn't perform any
//      * checks on the calling account.
//      *
//      * May emit a {RoleGranted} event.
//      *
//      * [WARNING]
//      * ====
//      * This function should only be called from the constructor when setting
//      * up the initial roles for the system.
//      *
//      * Using this function in any other way is effectively circumventing the admin
//      * system imposed by {AccessControl}.
//      * ====
//      *
//      * NOTE: This function is deprecated in favor of {_grantRole}.
//      */
//     function _setupRole(bytes32 role, address account) internal virtual {
//         _grantRole(role, account);
//     }

//     /**
//      * @dev Sets `adminRole` as ``role``'s admin role.
//      *
//      * Emits a {RoleAdminChanged} event.
//      */
//     function _setRoleAdmin(bytes32 role, bytes32 adminRole) internal virtual {
//         bytes32 previousAdminRole = getRoleAdmin(role);
//         _roles[role].adminRole = adminRole;
//         emit RoleAdminChanged(role, previousAdminRole, adminRole);
//     }

//     /**
//      * @dev Grants `role` to `account`.
//      *
//      * Internal function without access restriction.
//      *
//      * May emit a {RoleGranted} event.
//      */
//     function _grantRole(bytes32 role, address account) internal virtual {
//         if (!hasRole(role, account)) {
//             _roles[role].members[account] = true;
//             emit RoleGranted(role, account, _msgSender());
//         }
//     }

//     /**
//      * @dev Revokes `role` from `account`.
//      *
//      * Internal function without access restriction.
//      *
//      * May emit a {RoleRevoked} event.
//      */
//     function _revokeRole(bytes32 role, address account) internal virtual {
//         if (hasRole(role, account)) {
//             _roles[role].members[account] = false;
//             emit RoleRevoked(role, account, _msgSender());
//         }
//     }

//     /**
//      * @dev This empty reserved space is put in place to allow future versions to add new
//      * variables without shifting down storage in the inheritance chain.
//      * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
//      */
//     uint256[49] private __gap;
// }

// // pkg/contracts/src/ProxyOwnableUpgrader.sol

// contract ProxyOwnableUpgrader is OwnableUpgradeable, UUPSUpgradeable {
//     error CallerNotOwner(address _caller, address _owner);

//     function initialize(address initialOwner) public onlyInitializing {
//         _transferOwnership(initialOwner);
//     }

//     function proxyOwner() public view returns (address) {
//         return OwnableUpgradeable.owner();
//     }

//     function owner() public view override returns (address) {
//         // Check if the current owner is a contract
//         if (address(proxyOwner()).code.length == 0) {
//             // The owner is an EOA or a non-contract address
//             return proxyOwner();
//         } else {
//             try OwnableUpgradeable(proxyOwner()).owner() returns (address _owner) {
//                 return _owner;
//             } catch {
//                 // Handle the case where the recursive call fails
//                 return proxyOwner();
//             }
//         }
//     }

//     function _authorizeUpgrade(address) internal view override {
//         if (owner() != msg.sender) {
//             revert CallerNotOwner(msg.sender, owner());
//         }
//     }
// }

// // lib/openzeppelin-foundry-upgrades/src/Defender.sol

// /**
//  * @dev Library for interacting with OpenZeppelin Defender from Forge scripts or tests.
//  */
// library Defender {
//     /**
//      * @dev Deploys a contract to the current network using OpenZeppelin Defender.
//      *
//      * WARNING: Do not use this function directly if you are deploying an upgradeable contract. This function does not validate whether the contract is upgrade safe.
//      *
//      * NOTE: If using an EOA or Safe to deploy, go to https://defender.openzeppelin.com/v2/#/deploy[Defender deploy] to submit the pending deployment while the script is running.
//      * The script waits for the deployment to complete before it continues.
//      *
//      * @param contractName Name of the contract to deploy, e.g. "MyContract.sol" or "MyContract.sol:MyContract" or artifact path relative to the project root directory
//      * @return Address of the deployed contract
//      */
//     // function deployContract(string memory contractName) internal returns (address) {
//     //     return deployContract(contractName, "");
//     // }

//     /**
//      * @dev Deploys a contract to the current network using OpenZeppelin Defender.
//      *
//      * WARNING: Do not use this function directly if you are deploying an upgradeable contract. This function does not validate whether the contract is upgrade safe.
//      *
//      * NOTE: If using an EOA or Safe to deploy, go to https://defender.openzeppelin.com/v2/#/deploy[Defender deploy] to submit the pending deployment while the script is running.
//      * The script waits for the deployment to complete before it continues.
//      *
//      * @param contractName Name of the contract to deploy, e.g. "MyContract.sol" or "MyContract.sol:MyContract" or artifact path relative to the project root directory
//      * @param defenderOpts Defender deployment options. Note that the `useDefenderDeploy` option is always treated as `true` when called from this function.
//      * @return Address of the deployed contract
//      */
//     // function deployContract(
//     //     string memory contractName,
//     //     DefenderOptions memory defenderOpts
//     // ) internal returns (address) {
//     //     return deployContract(contractName, "", defenderOpts);
//     // }

//     /**
//      * @dev Deploys a contract with constructor arguments to the current network using OpenZeppelin Defender.
//      *
//      * WARNING: Do not use this function directly if you are deploying an upgradeable contract. This function does not validate whether the contract is upgrade safe.
//      *
//      * NOTE: If using an EOA or Safe to deploy, go to https://defender.openzeppelin.com/v2/#/deploy[Defender deploy] to submit the pending deployment while the script is running.
//      * The script waits for the deployment to complete before it continues.
//      *
//      * @param contractName Name of the contract to deploy, e.g. "MyContract.sol" or "MyContract.sol:MyContract" or artifact path relative to the project root directory
//      * @param constructorData Encoded constructor arguments
//      * @return Address of the deployed contract
//      */
//     // function deployContract(string memory contractName, bytes memory constructorData) internal returns (address) {
//     //     DefenderOptions memory defenderOpts;
//     //     return deployContract(contractName, constructorData, defenderOpts);
//     // }

//     /**
//      * @dev Deploys a contract with constructor arguments to the current network using OpenZeppelin Defender.
//      *
//      * WARNING: Do not use this function directly if you are deploying an upgradeable contract. This function does not validate whether the contract is upgrade safe.
//      *
//      * NOTE: If using an EOA or Safe to deploy, go to https://defender.openzeppelin.com/v2/#/deploy[Defender deploy] to submit the pending deployment while the script is running.
//      * The script waits for the deployment to complete before it continues.
//      *
//      * @param contractName Name of the contract to deploy, e.g. "MyContract.sol" or "MyContract.sol:MyContract" or artifact path relative to the project root directory
//      * @param constructorData Encoded constructor arguments
//      * @param defenderOpts Defender deployment options. Note that the `useDefenderDeploy` option is always treated as `true` when called from this function.
//      * @return Address of the deployed contract
//      */
//     // function deployContract(
//     //     string memory contractName,
//     //     bytes memory constructorData,
//     //     DefenderOptions memory defenderOpts
//     // ) internal returns (address) {
//     //     return DefenderDeploy.deploy(contractName, constructorData, defenderOpts);
//     // }

//     /**
//      * @dev Proposes an upgrade to an upgradeable proxy using OpenZeppelin Defender.
//      *
//      * This function validates a new implementation contract in comparison with a reference contract, deploys the new implementation contract using Defender,
//      * and proposes an upgrade to the new implementation contract using an upgrade approval process on Defender.
//      *
//      * Supported for UUPS or Transparent proxies. Not currently supported for beacon proxies or beacons.
//      * For beacons, use `Upgrades.prepareUpgrade` along with a transaction proposal on Defender to upgrade the beacon to the deployed implementation.
//      *
//      * Requires that either the `referenceContract` option is set, or the contract has a `@custom:oz-upgrades-from <reference>` annotation.
//      *
//      * WARNING: Ensure that the reference contract is the same as the current implementation contract that the proxy is pointing to.
//      * This function does not validate that the reference contract is the current implementation.
//      *
//      * NOTE: If using an EOA or Safe to deploy, go to https://defender.openzeppelin.com/v2/#/deploy[Defender deploy] to submit the pending deployment of the new implementation contract while the script is running.
//      * The script waits for the deployment to complete before it continues.
//      *
//      * @param proxyAddress The proxy address
//      * @param newImplementationContractName Name of the new implementation contract to upgrade to, e.g. "MyContract.sol" or "MyContract.sol:MyContract" or artifact path relative to the project root directory
//      * @param opts Common options. Note that the `defender.useDefenderDeploy` option is always treated as `true` when called from this function.
//      * @return Struct containing the proposal ID and URL for the upgrade proposal
//      */
//     // function proposeUpgrade(
//     //     address proxyAddress,
//     //     string memory newImplementationContractName,
//     //     Options memory opts
//     // ) internal returns (ProposeUpgradeResponse memory) {
//     //     opts.defender.useDefenderDeploy = true;
//     //     address proxyAdminAddress = Core.getAdminAddress(proxyAddress);
//     //     address newImplementationAddress = Core.prepareUpgrade(newImplementationContractName, opts);
//     //     return
//     //         DefenderDeploy.proposeUpgrade(
//     //             proxyAddress,
//     //             proxyAdminAddress,
//     //             newImplementationAddress,
//     //             newImplementationContractName,
//     //             opts
//     //         );
//     // }

//     /**
//      * @dev Gets the default deploy approval process configured for your deployment environment on OpenZeppelin Defender.
//      *
//      * @return Struct with the default deploy approval process ID and the associated address, such as a Relayer, EOA, or multisig wallet address.
//      */
//     // function getDeployApprovalProcess() internal returns (ApprovalProcessResponse memory) {
//     //     return DefenderDeploy.getApprovalProcess("getDeployApprovalProcess");
//     // }

//     /**
//      * @dev Gets the default upgrade approval process configured for your deployment environment on OpenZeppelin Defender.
//      * For example, this is useful for determining the default multisig wallet that you can use in your scripts to assign as the owner of your proxy.
//      *
//      * @return Struct with the default upgrade approval process ID and the associated address, such as a multisig or governor contract address.
//      */
//     // function getUpgradeApprovalProcess() internal returns (ApprovalProcessResponse memory) {
//     //     return DefenderDeploy.getApprovalProcess("getUpgradeApprovalProcess");
//     // }
// }

// struct ProposeUpgradeResponse {
//     string proposalId;
//     string url;
// }

// struct ApprovalProcessResponse {
//     string approvalProcessId;
//     address via;
//     string viaType;
// }

// // lib/openzeppelin-foundry-upgrades/src/internal/Core.sol

// /**
//  * @dev Internal helper methods to validate/deploy implementations and perform upgrades.
//  *
//  * WARNING: DO NOT USE DIRECTLY. Use Upgrades.sol, LegacyUpgrades.sol or Defender.sol instead.
//  */
// library Core {
//     /**
//      * @dev Upgrades a proxy to a new implementation contract. Only supported for UUPS or transparent proxies.
//      *
//      * Requires that either the `referenceContract` option is set, or the new implementation contract has a `@custom:oz-upgrades-from <reference>` annotation.
//      *
//      * @param proxy Address of the proxy to upgrade
//      * @param contractName Name of the new implementation contract to upgrade to, e.g. "MyContract.sol" or "MyContract.sol:MyContract" or artifact path relative to the project root directory
//      * @param data Encoded call data of an arbitrary function to call during the upgrade process, or empty if no function needs to be called during the upgrade
//      * @param opts Common options
//      */
//     function upgradeProxy(address proxy, string memory contractName, bytes memory data, Options memory opts) internal {
//         address newImpl = prepareUpgrade(contractName, opts);
//         upgradeProxyTo(proxy, newImpl, data);
//     }

//     /**
//      * @notice For tests only. If broadcasting in scripts, use the `--sender <ADDRESS>` option with `forge script` instead.
//      *
//      * @dev Upgrades a proxy to a new implementation contract. Only supported for UUPS or transparent proxies.
//      *
//      * Requires that either the `referenceContract` option is set, or the new implementation contract has a `@custom:oz-upgrades-from <reference>` annotation.
//      *
//      * This function provides an additional `tryCaller` parameter to test an upgrade using a specific caller address.
//      * Use this if you encounter `OwnableUnauthorizedAccount` errors in your tests.
//      *
//      * @param proxy Address of the proxy to upgrade
//      * @param contractName Name of the new implementation contract to upgrade to, e.g. "MyContract.sol" or "MyContract.sol:MyContract" or artifact path relative to the project root directory
//      * @param data Encoded call data of an arbitrary function to call during the upgrade process, or empty if no function needs to be called during the upgrade
//      * @param opts Common options
//      * @param tryCaller Address to use as the caller of the upgrade function. This should be the address that owns the proxy or its ProxyAdmin.
//      */
//     function upgradeProxy(
//         address proxy,
//         string memory contractName,
//         bytes memory data,
//         Options memory opts,
//         address tryCaller
//     ) internal tryPrank(tryCaller) {
//         upgradeProxy(proxy, contractName, data, opts);
//     }

//     /**
//      * @dev Upgrades a proxy to a new implementation contract. Only supported for UUPS or transparent proxies.
//      *
//      * @param proxy Address of the proxy to upgrade
//      * @param newImpl Address of the new implementation contract to upgrade to
//      * @param data Encoded call data of an arbitrary function to call during the upgrade process, or empty if no function needs to be called during the upgrade
//      */
//     function upgradeProxyTo(address proxy, address newImpl, bytes memory data) internal {
//         Vm vm = Vm(Utils.CHEATCODE_ADDRESS);

//         bytes32 adminSlot = vm.load(proxy, ADMIN_SLOT);
//         if (adminSlot == bytes32(0)) {
//             string memory upgradeInterfaceVersion = _getUpgradeInterfaceVersion(proxy);
//             if (upgradeInterfaceVersion.toSlice().equals("5.0.0".toSlice()) || data.length > 0) {
//                 IUpgradeableProxy(proxy).upgradeToAndCall(newImpl, data);
//             } else {
//                 IUpgradeableProxy(proxy).upgradeTo(newImpl);
//             }
//         } else {
//             address admin = address(uint160(uint256(adminSlot)));
//             string memory upgradeInterfaceVersion = _getUpgradeInterfaceVersion(admin);
//             if (upgradeInterfaceVersion.toSlice().equals("5.0.0".toSlice()) || data.length > 0) {
//                 IProxyAdmin(admin).upgradeAndCall(proxy, newImpl, data);
//             } else {
//                 IProxyAdmin(admin).upgrade(proxy, newImpl);
//             }
//         }
//     }

//     /**
//      * @notice For tests only. If broadcasting in scripts, use the `--sender <ADDRESS>` option with `forge script` instead.
//      *
//      * @dev Upgrades a proxy to a new implementation contract. Only supported for UUPS or transparent proxies.
//      *
//      * This function provides an additional `tryCaller` parameter to test an upgrade using a specific caller address.
//      * Use this if you encounter `OwnableUnauthorizedAccount` errors in your tests.
//      *
//      * @param proxy Address of the proxy to upgrade
//      * @param newImpl Address of the new implementation contract to upgrade to
//      * @param data Encoded call data of an arbitrary function to call during the upgrade process, or empty if no function needs to be called during the upgrade
//      * @param tryCaller Address to use as the caller of the upgrade function. This should be the address that owns the proxy or its ProxyAdmin.
//      */
//     function upgradeProxyTo(
//         address proxy,
//         address newImpl,
//         bytes memory data,
//         address tryCaller
//     ) internal tryPrank(tryCaller) {
//         upgradeProxyTo(proxy, newImpl, data);
//     }

//     /**
//      * @dev Upgrades a beacon to a new implementation contract.
//      *
//      * Requires that either the `referenceContract` option is set, or the new implementation contract has a `@custom:oz-upgrades-from <reference>` annotation.
//      *
//      * @param beacon Address of the beacon to upgrade
//      * @param contractName Name of the new implementation contract to upgrade to, e.g. "MyContract.sol" or "MyContract.sol:MyContract" or artifact path relative to the project root directory
//      * @param opts Common options
//      */
//     function upgradeBeacon(address beacon, string memory contractName, Options memory opts) internal {
//         address newImpl = prepareUpgrade(contractName, opts);
//         upgradeBeaconTo(beacon, newImpl);
//     }

//     /**
//      * @notice For tests only. If broadcasting in scripts, use the `--sender <ADDRESS>` option with `forge script` instead.
//      *
//      * @dev Upgrades a beacon to a new implementation contract.
//      *
//      * Requires that either the `referenceContract` option is set, or the new implementation contract has a `@custom:oz-upgrades-from <reference>` annotation.
//      *
//      * This function provides an additional `tryCaller` parameter to test an upgrade using a specific caller address.
//      * Use this if you encounter `OwnableUnauthorizedAccount` errors in your tests.
//      *
//      * @param beacon Address of the beacon to upgrade
//      * @param contractName Name of the new implementation contract to upgrade to, e.g. "MyContract.sol" or "MyContract.sol:MyContract" or artifact path relative to the project root directory
//      * @param opts Common options
//      * @param tryCaller Address to use as the caller of the upgrade function. This should be the address that owns the beacon.
//      */
//     function upgradeBeacon(
//         address beacon,
//         string memory contractName,
//         Options memory opts,
//         address tryCaller
//     ) internal tryPrank(tryCaller) {
//         upgradeBeacon(beacon, contractName, opts);
//     }

//     /**
//      * @dev Upgrades a beacon to a new implementation contract address.
//      *
//      * @param beacon Address of the beacon to upgrade
//      * @param newImpl Address of the new implementation contract to upgrade to
//      */
//     function upgradeBeaconTo(address beacon, address newImpl) internal {
//         IUpgradeableBeacon(beacon).upgradeTo(newImpl);
//     }

//     /**
//      * @notice For tests only. If broadcasting in scripts, use the `--sender <ADDRESS>` option with `forge script` instead.
//      *
//      * @dev Upgrades a beacon to a new implementation contract.
//      *
//      * This function provides an additional `tryCaller` parameter to test an upgrade using a specific caller address.
//      * Use this if you encounter `OwnableUnauthorizedAccount` errors in your tests.
//      *
//      * @param beacon Address of the beacon to upgrade
//      * @param newImpl Address of the new implementation contract to upgrade to
//      * @param tryCaller Address to use as the caller of the upgrade function. This should be the address that owns the beacon.
//      */
//     function upgradeBeaconTo(address beacon, address newImpl, address tryCaller) internal tryPrank(tryCaller) {
//         upgradeBeaconTo(beacon, newImpl);
//     }

//     /**
//      * @dev Validates an implementation contract, but does not deploy it.
//      *
//      * @param contractName Name of the contract to validate, e.g. "MyContract.sol" or "MyContract.sol:MyContract" or artifact path relative to the project root directory
//      * @param opts Common options
//      */
//     function validateImplementation(string memory contractName, Options memory opts) internal {
//         _validate(contractName, opts, false);
//     }

//     /**
//      * @dev Validates and deploys an implementation contract, and returns its address.
//      *
//      * @param contractName Name of the contract to deploy, e.g. "MyContract.sol" or "MyContract.sol:MyContract" or artifact path relative to the project root directory
//      * @param opts Common options
//      * @return Address of the implementation contract
//      */
//     // function deployImplementation(string memory contractName, Options memory opts) internal returns (address) {
//     //     validateImplementation(contractName, opts);
//     //     return deploy(contractName, opts.constructorData, opts);
//     // }

//     /**
//      * @dev Validates a new implementation contract in comparison with a reference contract, but does not deploy it.
//      *
//      * Requires that either the `referenceContract` option is set, or the contract has a `@custom:oz-upgrades-from <reference>` annotation.
//      *
//      * @param contractName Name of the contract to validate, e.g. "MyContract.sol" or "MyContract.sol:MyContract" or artifact path relative to the project root directory
//      * @param opts Common options
//      */
//     function validateUpgrade(string memory contractName, Options memory opts) internal {
//         _validate(contractName, opts, true);
//     }

//     /**
//      * @dev Validates a new implementation contract in comparison with a reference contract, deploys the new implementation contract,
//      * and returns its address.
//      *
//      * Requires that either the `referenceContract` option is set, or the contract has a `@custom:oz-upgrades-from <reference>` annotation.
//      *
//      * Use this method to prepare an upgrade to be run from an admin address you do not control directly or cannot use from your deployment environment.
//      *
//      * @param contractName Name of the contract to deploy, e.g. "MyContract.sol" or "MyContract.sol:MyContract" or artifact path relative to the project root directory
//      * @param opts Common options
//      * @return Address of the new implementation contract
//      */
//     function prepareUpgrade(string memory contractName, Options memory opts) internal returns (address) {
//         validateUpgrade(contractName, opts);
//         return deploy(contractName, opts.constructorData, opts);
//     }

//     /**
//      * @dev Gets the admin address of a transparent proxy from its ERC1967 admin storage slot.
//      *
//      * @param proxy Address of a transparent proxy
//      * @return Admin address
//      */
//     function getAdminAddress(address proxy) internal view returns (address) {
//         Vm vm = Vm(Utils.CHEATCODE_ADDRESS);

//         bytes32 adminSlot = vm.load(proxy, ADMIN_SLOT);
//         return address(uint160(uint256(adminSlot)));
//     }

//     /**
//      * @dev Gets the implementation address of a transparent or UUPS proxy from its ERC1967 implementation storage slot.
//      *
//      * @param proxy Address of a transparent or UUPS proxy
//      * @return Implementation address
//      */
//     function getImplementationAddress(address proxy) internal view returns (address) {
//         Vm vm = Vm(Utils.CHEATCODE_ADDRESS);

//         bytes32 implSlot = vm.load(proxy, IMPLEMENTATION_SLOT);
//         return address(uint160(uint256(implSlot)));
//     }

//     /**
//      * @dev Gets the beacon address of a beacon proxy from its ERC1967 beacon storage slot.
//      *
//      * @param proxy Address of a beacon proxy
//      * @return Beacon address
//      */
//     function getBeaconAddress(address proxy) internal view returns (address) {
//         Vm vm = Vm(Utils.CHEATCODE_ADDRESS);

//         bytes32 beaconSlot = vm.load(proxy, BEACON_SLOT);
//         return address(uint160(uint256(beaconSlot)));
//     }

//     /**
//      * @notice For tests only. If broadcasting in scripts, use the `--sender <ADDRESS>` option with `forge script` instead.
//      *
//      * @dev Runs a function as a prank, or just runs the function normally if the prank could not be started.
//      */
//     modifier tryPrank(address deployer) {
//         Vm vm = Vm(Utils.CHEATCODE_ADDRESS);

//         try vm.startPrank(deployer) {
//             _;
//             vm.stopPrank();
//         } catch {
//             _;
//         }
//     }

//     /**
//      * @dev Storage slot with the address of the implementation.
//      * This is the keccak-256 hash of "eip1967.proxy.implementation" subtracted by 1.
//      */
//     bytes32 private constant IMPLEMENTATION_SLOT = 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc;

//     /**
//      * @dev Storage slot with the admin of the proxy.
//      * This is the keccak-256 hash of "eip1967.proxy.admin" subtracted by 1.
//      */
//     bytes32 private constant ADMIN_SLOT = 0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103;

//     /**
//      * @dev Storage slot with the UpgradeableBeacon contract which defines the implementation for the proxy.
//      * This is the keccak-256 hash of "eip1967.proxy.beacon" subtracted by 1.
//      */
//     bytes32 private constant BEACON_SLOT = 0xa3f0ad74e5423aebfd80d3ef4346578335a9a72aeaee59ff6cb3582b35133d50;

//     using strings for *;

//     function _getUpgradeInterfaceVersion(address addr) private returns (string memory) {
//         (bool success, bytes memory returndata) = addr.call(abi.encodeWithSignature("UPGRADE_INTERFACE_VERSION()"));
//         if (success) {
//             return abi.decode(returndata, (string));
//         } else {
//             return "";
//         }
//     }

//     function _validate(string memory contractName, Options memory opts, bool requireReference) private {
//         if (opts.unsafeSkipAllChecks) {
//             return;
//         }

//         string[] memory inputs = _buildValidateCommand(contractName, opts, requireReference);
//         VmSafe.FfiResult memory result = Utils.runAsBashCommand(inputs);
//         string memory stdout = string(result.stdout);

//         // CLI validate command uses exit code to indicate if the validation passed or failed.
//         // As an extra precaution, we also check stdout for "SUCCESS" to ensure it actually ran.
//         if (result.exitCode == 0 && stdout.toSlice().contains("SUCCESS".toSlice())) {
//             return;
//         } else if (result.stderr.length > 0) {
//             // Validations failed to run
//             revert(string(abi.encodePacked("Failed to run upgrade safety validation: ", string(result.stderr))));
//         } else {
//             // Validations ran but some contracts were not upgrade safe
//             revert(string(abi.encodePacked("Upgrade safety validation failed:\n", stdout)));
//         }
//     }

//     function _buildValidateCommand(
//         string memory contractName,
//         Options memory opts,
//         bool requireReference
//     ) private view returns (string[] memory) {
//         string memory outDir = Utils.getOutDir();

//         string[] memory inputBuilder = new string[](255);

//         uint8 i = 0;

//         inputBuilder[i++] = "npx";
//         inputBuilder[i++] = string(abi.encodePacked("@openzeppelin/upgrades-core@", Versions.UPGRADES_CORE));
//         inputBuilder[i++] = "validate";
//         inputBuilder[i++] = string(abi.encodePacked(outDir, "/build-info"));
//         inputBuilder[i++] = "--contract";
//         inputBuilder[i++] = Utils.getFullyQualifiedName(contractName, outDir);

//         if (bytes(opts.referenceContract).length != 0) {
//             inputBuilder[i++] = "--reference";
//             inputBuilder[i++] = Utils.getFullyQualifiedName(opts.referenceContract, outDir);
//         }

//         if (opts.unsafeSkipStorageCheck) {
//             inputBuilder[i++] = "--unsafeSkipStorageCheck";
//         } else if (requireReference) {
//             inputBuilder[i++] = "--requireReference";
//         }

//         if (bytes(opts.unsafeAllow).length != 0) {
//             inputBuilder[i++] = "--unsafeAllow";
//             inputBuilder[i++] = opts.unsafeAllow;
//         }

//         if (opts.unsafeAllowRenames) {
//             inputBuilder[i++] = "--unsafeAllowRenames";
//         }

//         // Create a copy of inputs but with the correct length
//         string[] memory inputs = new string[](i);
//         for (uint8 j = 0; j < i; j++) {
//             inputs[j] = inputBuilder[j];
//         }

//         return inputs;
//     }

//     function deploy(
//         string memory contractName,
//         bytes memory constructorData,
//         Options memory opts
//     ) internal returns (address) {
//         // if (opts.defender.useDefenderDeploy) {
//         //     return DefenderDeploy.deploy(contractName, constructorData, opts.defender);
//         // } else {
//         return _deploy(contractName, constructorData);
//       // }
//     }

//     function _deploy(string memory contractName, bytes memory constructorData) private returns (address) {
//         bytes memory creationCode = Vm(Utils.CHEATCODE_ADDRESS).getCode(contractName);
//         address deployedAddress = _deployFromBytecode(abi.encodePacked(creationCode, constructorData));
//         if (deployedAddress == address(0)) {
//             revert(
//                 string(
//                     abi.encodePacked(
//                         "Failed to deploy contract ",
//                         contractName,
//                         ' using constructor data "',
//                         string(constructorData),
//                         '"'
//                     )
//                 )
//             );
//         }
//         return deployedAddress;
//     }

//      function _deployFromBytecode(bytes memory bytecode) private returns (address) {
//          address addr;
//          assembly {
//              addr := create(0, add(bytecode, 32), mload(bytecode))
//          }
//          return addr;
//      }
// }

// // lib/openzeppelin-foundry-upgrades/src/internal/DefenderDeploy.sol

// /**
//  * @dev Internal helper methods for Defender deployments.
//  *
//  * WARNING: DO NOT USE DIRECTLY. Use Defender.sol instead.
//  */
// library DefenderDeploy {
//     using strings for *;

//     // function deploy(
//     //     string memory contractName,
//     //     bytes memory constructorData,
//     //     DefenderOptions memory defenderOpts
//     // ) internal returns (address) {
//     //     string memory outDir = Utils.getOutDir();
//     //     ContractInfo memory contractInfo = Utils.getContractInfo(contractName, outDir);
//     //     string memory buildInfoFile = Utils.getBuildInfoFile(
//     //         contractInfo.sourceCodeHash,
//     //         contractInfo.shortName,
//     //         outDir
//     //     );

//     //     string[] memory inputs = buildDeployCommand(contractInfo, buildInfoFile, constructorData, defenderOpts);

//     //     VmSafe.FfiResult memory result = Utils.runAsBashCommand(inputs);
//     //     string memory stdout = string(result.stdout);

//     //     if (result.exitCode != 0) {
//     //         revert(string(abi.encodePacked("Failed to deploy contract ", contractName, ": ", string(result.stderr))));
//     //     }

//     //     string memory deployedAddress = _parseLine("Deployed to address: ", stdout, true);
//     //     return Vm(Utils.CHEATCODE_ADDRESS).parseAddress(deployedAddress);
//     // }

//     // function buildDeployCommand(
//     //     ContractInfo memory contractInfo,
//     //     string memory buildInfoFile,
//     //     bytes memory constructorData,
//     //     DefenderOptions memory defenderOpts
//     // ) internal view returns (string[] memory) {
//     //     Vm vm = Vm(Utils.CHEATCODE_ADDRESS);

//     //     if (!(defenderOpts.licenseType).toSlice().empty()) {
//     //         if (defenderOpts.skipVerifySourceCode) {
//     //             revert("The `licenseType` option cannot be used when the `skipVerifySourceCode` option is `true`");
//     //         } else if (defenderOpts.skipLicenseType) {
//     //             revert("The `licenseType` option cannot be used when the `skipLicenseType` option is `true`");
//     //         }
//     //     }

//     //     string[] memory inputBuilder = new string[](255);

//     //     uint8 i = 0;

//     //     inputBuilder[i++] = "npx";
//     //     inputBuilder[i++] = string(
//     //         abi.encodePacked("@openzeppelin/defender-deploy-client-cli@", Versions.DEFENDER_DEPLOY_CLIENT_CLI)
//     //     );
//     //     inputBuilder[i++] = "deploy";
//     //     inputBuilder[i++] = "--contractName";
//     //     inputBuilder[i++] = contractInfo.shortName;
//     //     inputBuilder[i++] = "--contractPath";
//     //     inputBuilder[i++] = contractInfo.contractPath;
//     //     inputBuilder[i++] = "--chainId";
//     //     inputBuilder[i++] = Strings.toString(block.chainid);
//     //     inputBuilder[i++] = "--buildInfoFile";
//     //     inputBuilder[i++] = buildInfoFile;
//     //     if (constructorData.length > 0) {
//     //         inputBuilder[i++] = "--constructorBytecode";
//     //         inputBuilder[i++] = vm.toString(constructorData);
//     //     }
//     //     if (defenderOpts.skipVerifySourceCode) {
//     //         inputBuilder[i++] = "--verifySourceCode";
//     //         inputBuilder[i++] = "false";
//     //     } else if (!(defenderOpts.licenseType).toSlice().empty()) {
//     //         inputBuilder[i++] = "--licenseType";
//     //         inputBuilder[i++] = string(abi.encodePacked('"', defenderOpts.licenseType, '"'));
//     //     } else if (!defenderOpts.skipLicenseType && !(contractInfo.license).toSlice().empty()) {
//     //         inputBuilder[i++] = "--licenseType";
//     //         inputBuilder[i++] = string(abi.encodePacked('"', _toLicenseType(contractInfo), '"'));
//     //     }
//     //     if (!(defenderOpts.relayerId).toSlice().empty()) {
//     //         inputBuilder[i++] = "--relayerId";
//     //         inputBuilder[i++] = defenderOpts.relayerId;
//     //     }
//     //     if (defenderOpts.salt != 0) {
//     //         inputBuilder[i++] = "--salt";
//     //         inputBuilder[i++] = vm.toString(defenderOpts.salt);
//     //     }
//     //     if (defenderOpts.txOverrides.gasLimit != 0) {
//     //         inputBuilder[i++] = "--gasLimit";
//     //         inputBuilder[i++] = Strings.toString(defenderOpts.txOverrides.gasLimit);
//     //     }
//     //     if (defenderOpts.txOverrides.gasPrice != 0) {
//     //         inputBuilder[i++] = "--gasPrice";
//     //         inputBuilder[i++] = Strings.toString(defenderOpts.txOverrides.gasPrice);
//     //     }
//     //     if (defenderOpts.txOverrides.maxFeePerGas != 0) {
//     //         inputBuilder[i++] = "--maxFeePerGas";
//     //         inputBuilder[i++] = Strings.toString(defenderOpts.txOverrides.maxFeePerGas);
//     //     }
//     //     if (defenderOpts.txOverrides.maxPriorityFeePerGas != 0) {
//     //         inputBuilder[i++] = "--maxPriorityFeePerGas";
//     //         inputBuilder[i++] = Strings.toString(defenderOpts.txOverrides.maxPriorityFeePerGas);
//     //     }

//     //     // Create a copy of inputs but with the correct length
//     //     string[] memory inputs = new string[](i);
//     //     for (uint8 j = 0; j < i; j++) {
//     //         inputs[j] = inputBuilder[j];
//     //     }

//     //     return inputs;
//     // }

//     // function _toLicenseType(ContractInfo memory contractInfo) private pure returns (string memory) {
//     //     strings.slice memory id = contractInfo.license.toSlice();
//     //     if (id.equals("UNLICENSED".toSlice())) {
//     //         return "None";
//     //     } else if (id.equals("Unlicense".toSlice())) {
//     //         return "Unlicense";
//     //     } else if (id.equals("MIT".toSlice())) {
//     //         return "MIT";
//     //     } else if (id.equals("GPL-2.0-only".toSlice()) || id.equals("GPL-2.0-or-later".toSlice())) {
//     //         return "GNU GPLv2";
//     //     } else if (id.equals("GPL-3.0-only".toSlice()) || id.equals("GPL-3.0-or-later".toSlice())) {
//     //         return "GNU GPLv3";
//     //     } else if (id.equals("LGPL-2.1-only".toSlice()) || id.equals("LGPL-2.1-or-later".toSlice())) {
//     //         return "GNU LGPLv2.1";
//     //     } else if (id.equals("LGPL-3.0-only".toSlice()) || id.equals("LGPL-3.0-or-later".toSlice())) {
//     //         return "GNU LGPLv3";
//     //     } else if (id.equals("BSD-2-Clause".toSlice())) {
//     //         return "BSD-2-Clause";
//     //     } else if (id.equals("BSD-3-Clause".toSlice())) {
//     //         return "BSD-3-Clause";
//     //     } else if (id.equals("MPL-2.0".toSlice())) {
//     //         return "MPL-2.0";
//     //     } else if (id.equals("OSL-3.0".toSlice())) {
//     //         return "OSL-3.0";
//     //     } else if (id.equals("Apache-2.0".toSlice())) {
//     //         return "Apache-2.0";
//     //     } else if (id.equals("AGPL-3.0-only".toSlice()) || id.equals("AGPL-3.0-or-later".toSlice())) {
//     //         return "GNU AGPLv3";
//     //     } else if (id.equals("BUSL-1.1".toSlice())) {
//     //         return "BSL 1.1";
//     //     } else {
//     //         revert(
//     //             string(
//     //                 abi.encodePacked(
//     //                     "SPDX license identifier ",
//     //                     contractInfo.license,
//     //                     " in ",
//     //                     contractInfo.contractPath,
//     //                     " does not look like a supported license for block explorer verification. Use the `licenseType` option to specify a license type, or set the `skipLicenseType` option to `true` to skip."
//     //                 )
//     //             )
//     //         );
//     //     }
//     // }

//     // function proposeUpgrade(
//     //     address proxyAddress,
//     //     address proxyAdminAddress,
//     //     address newImplementationAddress,
//     //     string memory newImplementationContractName,
//     //     Options memory opts
//     // ) internal returns (ProposeUpgradeResponse memory) {
//     //     Vm vm = Vm(Utils.CHEATCODE_ADDRESS);

//     //     string memory outDir = Utils.getOutDir();
//     //     ContractInfo memory contractInfo = Utils.getContractInfo(newImplementationContractName, outDir);

//     //     string[] memory inputs = buildProposeUpgradeCommand(
//     //         proxyAddress,
//     //         proxyAdminAddress,
//     //         newImplementationAddress,
//     //         contractInfo,
//     //         opts
//     //     );

//     //     VmSafe.FfiResult memory result = Utils.runAsBashCommand(inputs);
//     //     string memory stdout = string(result.stdout);

//     //     if (result.exitCode != 0) {
//     //         revert(
//     //             string(
//     //                 abi.encodePacked(
//     //                     "Failed to propose upgrade for proxy ",
//     //                     vm.toString(proxyAddress),
//     //                     ": ",
//     //                     string(result.stderr)
//     //                 )
//     //             )
//     //         );
//     //     }

//     //     return parseProposeUpgradeResponse(stdout);
//     // }

//     // function parseProposeUpgradeResponse(string memory stdout) internal pure returns (ProposeUpgradeResponse memory) {
//     //     ProposeUpgradeResponse memory response;
//     //     response.proposalId = _parseLine("Proposal ID: ", stdout, true);
//     //     response.url = _parseLine("Proposal URL: ", stdout, false);
//     //     return response;
//     // }

//     // function _parseLine(
//     //     string memory expectedPrefix,
//     //     string memory stdout,
//     //     bool required
//     // ) private pure returns (string memory) {
//     //     strings.slice memory delim = expectedPrefix.toSlice();
//     //     if (stdout.toSlice().contains(delim)) {
//     //         strings.slice memory slice = stdout.toSlice().copy().find(delim).beyond(delim);
//     //         // Remove any following lines
//     //         if (slice.contains("\n".toSlice())) {
//     //             slice = slice.split("\n".toSlice());
//     //         }
//     //         return slice.toString();
//     //     } else if (required) {
//     //         revert(
//     //             string(abi.encodePacked("Failed to find line with prefix '", expectedPrefix, "' in output: ", stdout))
//     //         );
//     //     } else {
//     //         return "";
//     //     }
//     // }

//     // function buildProposeUpgradeCommand(
//     //     address proxyAddress,
//     //     address proxyAdminAddress,
//     //     address newImplementationAddress,
//     //     ContractInfo memory contractInfo,
//     //     Options memory opts
//     // ) internal view returns (string[] memory) {
//     //     Vm vm = Vm(Utils.CHEATCODE_ADDRESS);

//     //     string[] memory inputBuilder = new string[](255);

//     //     uint8 i = 0;

//     //     inputBuilder[i++] = "npx";
//     //     inputBuilder[i++] = string(
//     //         abi.encodePacked("@openzeppelin/defender-deploy-client-cli@", Versions.DEFENDER_DEPLOY_CLIENT_CLI)
//     //     );
//     //     inputBuilder[i++] = "proposeUpgrade";
//     //     inputBuilder[i++] = "--proxyAddress";
//     //     inputBuilder[i++] = vm.toString(proxyAddress);
//     //     inputBuilder[i++] = "--newImplementationAddress";
//     //     inputBuilder[i++] = vm.toString(newImplementationAddress);
//     //     inputBuilder[i++] = "--chainId";
//     //     inputBuilder[i++] = Strings.toString(block.chainid);
//     //     inputBuilder[i++] = "--contractArtifactFile";
//     //     inputBuilder[i++] = contractInfo.artifactPath;
//     //     if (proxyAdminAddress != address(0)) {
//     //         inputBuilder[i++] = "--proxyAdminAddress";
//     //         inputBuilder[i++] = vm.toString(proxyAdminAddress);
//     //     }
//     //     if (!(opts.defender.upgradeApprovalProcessId).toSlice().empty()) {
//     //         inputBuilder[i++] = "--approvalProcessId";
//     //         inputBuilder[i++] = opts.defender.upgradeApprovalProcessId;
//     //     }

//     //     // Create a copy of inputs but with the correct length
//     //     string[] memory inputs = new string[](i);
//     //     for (uint8 j = 0; j < i; j++) {
//     //         inputs[j] = inputBuilder[j];
//     //     }

//     //     return inputs;
//     // }

//     // function getApprovalProcess(string memory command) internal returns (ApprovalProcessResponse memory) {
//     //     string[] memory inputs = buildGetApprovalProcessCommand(command);

//     //     VmSafe.FfiResult memory result = Utils.runAsBashCommand(inputs);
//     //     string memory stdout = string(result.stdout);

//     //     if (result.exitCode != 0) {
//     //         revert(string(abi.encodePacked("Failed to get approval process: ", string(result.stderr))));
//     //     }

//     //     return parseApprovalProcessResponse(stdout);
//     // }

//     // function parseApprovalProcessResponse(string memory stdout) internal pure returns (ApprovalProcessResponse memory) {
//     //     Vm vm = Vm(Utils.CHEATCODE_ADDRESS);

//     //     ApprovalProcessResponse memory response;

//     //     response.approvalProcessId = _parseLine("Approval process ID: ", stdout, true);

//     //     string memory viaString = _parseLine("Via: ", stdout, false);
//     //     if (viaString.toSlice().len() != 0) {
//     //         response.via = vm.parseAddress(viaString);
//     //     }

//     //     response.viaType = _parseLine("Via type: ", stdout, false);

//     //     return response;
//     // }

//     // function buildGetApprovalProcessCommand(string memory command) internal view returns (string[] memory) {
//     //     string[] memory inputBuilder = new string[](255);

//     //     uint8 i = 0;

//     //     inputBuilder[i++] = "npx";
//     //     inputBuilder[i++] = string(
//     //         abi.encodePacked("@openzeppelin/defender-deploy-client-cli@", Versions.DEFENDER_DEPLOY_CLIENT_CLI)
//     //     );
//     //     inputBuilder[i++] = command;
//     //     inputBuilder[i++] = "--chainId";
//     //     inputBuilder[i++] = Strings.toString(block.chainid);

//     //     // Create a copy of inputs but with the correct length
//     //     string[] memory inputs = new string[](i);
//     //     for (uint8 j = 0; j < i; j++) {
//     //         inputs[j] = inputBuilder[j];
//     //     }

//     //     return inputs;
//     // }
// }

// // lib/openzeppelin-foundry-upgrades/src/LegacyUpgrades.sol

// /**
//  * @dev Library for managing upgradeable contracts from Forge scripts or tests.
//  *
//  * NOTE: Only for upgrading existing deployments using OpenZeppelin Contracts v4.
//  * For new deployments, use OpenZeppelin Contracts v5 and Upgrades.sol.
//  */
// library Upgrades {
//     /**
//      * @dev Upgrades a proxy to a new implementation contract. Only supported for UUPS or transparent proxies.
//      *
//      * Requires that either the `referenceContract` option is set, or the new implementation contract has a `@custom:oz-upgrades-from <reference>` annotation.
//      *
//      * @param proxy Address of the proxy to upgrade
//      * @param contractName Name of the new implementation contract to upgrade to, e.g. "MyContract.sol" or "MyContract.sol:MyContract" or artifact path relative to the project root directory
//      * @param data Encoded call data of an arbitrary function to call during the upgrade process, or empty if no function needs to be called during the upgrade
//      * @param opts Common options
//      */
//     function upgradeProxy(address proxy, string memory contractName, bytes memory data, Options memory opts) internal {
//         Core.upgradeProxy(proxy, contractName, data, opts);
//     }

//     /**
//      * @dev Upgrades a proxy to a new implementation contract. Only supported for UUPS or transparent proxies.
//      *
//      * Requires that either the `referenceContract` option is set, or the new implementation contract has a `@custom:oz-upgrades-from <reference>` annotation.
//      *
//      * @param proxy Address of the proxy to upgrade
//      * @param contractName Name of the new implementation contract to upgrade to, e.g. "MyContract.sol" or "MyContract.sol:MyContract" or artifact path relative to the project root directory
//      * @param data Encoded call data of an arbitrary function to call during the upgrade process, or empty if no function needs to be called during the upgrade
//      */
//     function upgradeProxy(address proxy, string memory contractName, bytes memory data) internal {
//         Options memory opts;
//         Core.upgradeProxy(proxy, contractName, data, opts);
//     }

//     /**
//      * @notice For tests only. If broadcasting in scripts, use the `--sender <ADDRESS>` option with `forge script` instead.
//      *
//      * @dev Upgrades a proxy to a new implementation contract. Only supported for UUPS or transparent proxies.
//      *
//      * Requires that either the `referenceContract` option is set, or the new implementation contract has a `@custom:oz-upgrades-from <reference>` annotation.
//      *
//      * This function provides an additional `tryCaller` parameter to test an upgrade using a specific caller address.
//      * Use this if you encounter `OwnableUnauthorizedAccount` errors in your tests.
//      *
//      * @param proxy Address of the proxy to upgrade
//      * @param contractName Name of the new implementation contract to upgrade to, e.g. "MyContract.sol" or "MyContract.sol:MyContract" or artifact path relative to the project root directory
//      * @param data Encoded call data of an arbitrary function to call during the upgrade process, or empty if no function needs to be called during the upgrade
//      * @param opts Common options
//      * @param tryCaller Address to use as the caller of the upgrade function. This should be the address that owns the proxy or its ProxyAdmin.
//      */
//     function upgradeProxy(
//         address proxy,
//         string memory contractName,
//         bytes memory data,
//         Options memory opts,
//         address tryCaller
//     ) internal {
//         Core.upgradeProxy(proxy, contractName, data, opts, tryCaller);
//     }

//     /**
//      * @notice For tests only. If broadcasting in scripts, use the `--sender <ADDRESS>` option with `forge script` instead.
//      *
//      * @dev Upgrades a proxy to a new implementation contract. Only supported for UUPS or transparent proxies.
//      *
//      * Requires that either the `referenceContract` option is set, or the new implementation contract has a `@custom:oz-upgrades-from <reference>` annotation.
//      *
//      * This function provides an additional `tryCaller` parameter to test an upgrade using a specific caller address.
//      * Use this if you encounter `OwnableUnauthorizedAccount` errors in your tests.
//      *
//      * @param proxy Address of the proxy to upgrade
//      * @param contractName Name of the new implementation contract to upgrade to, e.g. "MyContract.sol" or "MyContract.sol:MyContract" or artifact path relative to the project root directory
//      * @param data Encoded call data of an arbitrary function to call during the upgrade process, or empty if no function needs to be called during the upgrade
//      * @param tryCaller Address to use as the caller of the upgrade function. This should be the address that owns the proxy or its ProxyAdmin.
//      */
//     function upgradeProxy(address proxy, string memory contractName, bytes memory data, address tryCaller) internal {
//         Options memory opts;
//         Core.upgradeProxy(proxy, contractName, data, opts, tryCaller);
//     }

//     /**
//      * @dev Upgrades a beacon to a new implementation contract.
//      *
//      * Requires that either the `referenceContract` option is set, or the new implementation contract has a `@custom:oz-upgrades-from <reference>` annotation.
//      *
//      * @param beacon Address of the beacon to upgrade
//      * @param contractName Name of the new implementation contract to upgrade to, e.g. "MyContract.sol" or "MyContract.sol:MyContract" or artifact path relative to the project root directory
//      * @param opts Common options
//      */
//     function upgradeBeacon(address beacon, string memory contractName, Options memory opts) internal {
//         Core.upgradeBeacon(beacon, contractName, opts);
//     }

//     /**
//      * @dev Upgrades a beacon to a new implementation contract.
//      *
//      * Requires that either the `referenceContract` option is set, or the new implementation contract has a `@custom:oz-upgrades-from <reference>` annotation.
//      *
//      * @param beacon Address of the beacon to upgrade
//      * @param contractName Name of the new implementation contract to upgrade to, e.g. "MyContract.sol" or "MyContract.sol:MyContract" or artifact path relative to the project root directory
//      */
//     function upgradeBeacon(address beacon, string memory contractName) internal {
//         Options memory opts;
//         Core.upgradeBeacon(beacon, contractName, opts);
//     }

//     /**
//      * @notice For tests only. If broadcasting in scripts, use the `--sender <ADDRESS>` option with `forge script` instead.
//      *
//      * @dev Upgrades a beacon to a new implementation contract.
//      *
//      * Requires that either the `referenceContract` option is set, or the new implementation contract has a `@custom:oz-upgrades-from <reference>` annotation.
//      *
//      * This function provides an additional `tryCaller` parameter to test an upgrade using a specific caller address.
//      * Use this if you encounter `OwnableUnauthorizedAccount` errors in your tests.
//      *
//      * @param beacon Address of the beacon to upgrade
//      * @param contractName Name of the new implementation contract to upgrade to, e.g. "MyContract.sol" or "MyContract.sol:MyContract" or artifact path relative to the project root directory
//      * @param opts Common options
//      * @param tryCaller Address to use as the caller of the upgrade function. This should be the address that owns the beacon.
//      */
//     function upgradeBeacon(
//         address beacon,
//         string memory contractName,
//         Options memory opts,
//         address tryCaller
//     ) internal {
//         Core.upgradeBeacon(beacon, contractName, opts, tryCaller);
//     }

//     /**
//      * @notice For tests only. If broadcasting in scripts, use the `--sender <ADDRESS>` option with `forge script` instead.
//      *
//      * @dev Upgrades a beacon to a new implementation contract.
//      *
//      * Requires that either the `referenceContract` option is set, or the new implementation contract has a `@custom:oz-upgrades-from <reference>` annotation.
//      *
//      * This function provides an additional `tryCaller` parameter to test an upgrade using a specific caller address.
//      * Use this if you encounter `OwnableUnauthorizedAccount` errors in your tests.
//      *
//      * @param beacon Address of the beacon to upgrade
//      * @param contractName Name of the new implementation contract to upgrade to, e.g. "MyContract.sol" or "MyContract.sol:MyContract" or artifact path relative to the project root directory
//      * @param tryCaller Address to use as the caller of the upgrade function. This should be the address that owns the beacon.
//      */
//     function upgradeBeacon(address beacon, string memory contractName, address tryCaller) internal {
//         Options memory opts;
//         Core.upgradeBeacon(beacon, contractName, opts, tryCaller);
//     }

//     /**
//      * @dev Validates a new implementation contract in comparison with a reference contract, but does not deploy it.
//      *
//      * Requires that either the `referenceContract` option is set, or the contract has a `@custom:oz-upgrades-from <reference>` annotation.
//      *
//      * @param contractName Name of the contract to validate, e.g. "MyContract.sol" or "MyContract.sol:MyContract" or artifact path relative to the project root directory
//      * @param opts Common options
//      */
//     function validateUpgrade(string memory contractName, Options memory opts) internal {
//         Core.validateUpgrade(contractName, opts);
//     }

//     /**
//      * @dev Validates a new implementation contract in comparison with a reference contract, deploys the new implementation contract,
//      * and returns its address.
//      *
//      * Requires that either the `referenceContract` option is set, or the contract has a `@custom:oz-upgrades-from <reference>` annotation.
//      *
//      * Use this method to prepare an upgrade to be run from an admin address you do not control directly or cannot use from your deployment environment.
//      *
//      * @param contractName Name of the contract to deploy, e.g. "MyContract.sol" or "MyContract.sol:MyContract" or artifact path relative to the project root directory
//      * @param opts Common options
//      * @return Address of the new implementation contract
//      */
//     function prepareUpgrade(string memory contractName, Options memory opts) internal returns (address) {
//         return Core.prepareUpgrade(contractName, opts);
//     }

//     /**
//      * @dev Gets the admin address of a transparent proxy from its ERC1967 admin storage slot.
//      *
//      * @param proxy Address of a transparent proxy
//      * @return Admin address
//      */
//     function getAdminAddress(address proxy) internal view returns (address) {
//         return Core.getAdminAddress(proxy);
//     }

//     /**
//      * @dev Gets the implementation address of a transparent or UUPS proxy from its ERC1967 implementation storage slot.
//      *
//      * @param proxy Address of a transparent or UUPS proxy
//      * @return Implementation address
//      */
//     function getImplementationAddress(address proxy) internal view returns (address) {
//         return Core.getImplementationAddress(proxy);
//     }

//     /**
//      * @dev Gets the beacon address of a beacon proxy from its ERC1967 beacon storage slot.
//      *
//      * @param proxy Address of a beacon proxy
//      * @return Beacon address
//      */
//     function getBeaconAddress(address proxy) internal view returns (address) {
//         return Core.getBeaconAddress(proxy);
//     }
// }

// /**
//  * @dev Library for managing upgradeable contracts from Forge tests, without validations.
//  *
//  * Can be used with `forge coverage`. Requires implementation contracts to be instantiated first.
//  * Does not require `--ffi` and does not require a clean compilation before each run.
//  *
//  * Not supported for OpenZeppelin Defender deployments.
//  *
//  * WARNING: Not recommended for use in Forge scripts.
//  * `UnsafeUpgrades` does not validate whether your contracts are upgrade safe or whether new implementations are compatible with previous ones.
//  * Use `Upgrades` if you want validations to be run.
//  *
//  * NOTE: Only for upgrading existing deployments using OpenZeppelin Contracts v4.
//  * For new deployments, use OpenZeppelin Contracts v5 and Upgrades.sol.
//  */
// library UnsafeUpgrades {
//     /**
//      * @dev Upgrades a proxy to a new implementation contract address. Only supported for UUPS or transparent proxies.
//      *
//      * @param proxy Address of the proxy to upgrade
//      * @param newImpl Address of the new implementation contract to upgrade to
//      * @param data Encoded call data of an arbitrary function to call during the upgrade process, or empty if no function needs to be called during the upgrade
//      */
//     function upgradeProxy(address proxy, address newImpl, bytes memory data) internal {
//         Core.upgradeProxyTo(proxy, newImpl, data);
//     }

//     /**
//      * @notice For tests only. If broadcasting in scripts, use the `--sender <ADDRESS>` option with `forge script` instead.
//      *
//      * @dev Upgrades a proxy to a new implementation contract address. Only supported for UUPS or transparent proxies.
//      *
//      * This function provides an additional `tryCaller` parameter to test an upgrade using a specific caller address.
//      * Use this if you encounter `OwnableUnauthorizedAccount` errors in your tests.
//      *
//      * @param proxy Address of the proxy to upgrade
//      * @param newImpl Address of the new implementation contract to upgrade to
//      * @param data Encoded call data of an arbitrary function to call during the upgrade process, or empty if no function needs to be called during the upgrade
//      * @param tryCaller Address to use as the caller of the upgrade function. This should be the address that owns the proxy or its ProxyAdmin.
//      */
//     function upgradeProxy(address proxy, address newImpl, bytes memory data, address tryCaller) internal {
//         Core.upgradeProxyTo(proxy, newImpl, data, tryCaller);
//     }

//     /**
//      * @dev Upgrades a beacon to a new implementation contract address.
//      *
//      * @param beacon Address of the beacon to upgrade
//      * @param newImpl Address of the new implementation contract to upgrade to
//      */
//     function upgradeBeacon(address beacon, address newImpl) internal {
//         Core.upgradeBeaconTo(beacon, newImpl);
//     }

//     /**
//      * @notice For tests only. If broadcasting in scripts, use the `--sender <ADDRESS>` option with `forge script` instead.
//      *
//      * @dev Upgrades a beacon to a new implementation contract address.
//      *
//      * This function provides an additional `tryCaller` parameter to test an upgrade using a specific caller address.
//      * Use this if you encounter `OwnableUnauthorizedAccount` errors in your tests.
//      *
//      * @param beacon Address of the beacon to upgrade
//      * @param newImpl Address of the new implementation contract to upgrade to
//      * @param tryCaller Address to use as the caller of the upgrade function. This should be the address that owns the beacon.
//      */
//     function upgradeBeacon(address beacon, address newImpl, address tryCaller) internal {
//         Core.upgradeBeaconTo(beacon, newImpl, tryCaller);
//     }

//     /**
//      * @dev Gets the admin address of a transparent proxy from its ERC1967 admin storage slot.
//      *
//      * @param proxy Address of a transparent proxy
//      * @return Admin address
//      */
//     function getAdminAddress(address proxy) internal view returns (address) {
//         return Core.getAdminAddress(proxy);
//     }

//     /**
//      * @dev Gets the implementation address of a transparent or UUPS proxy from its ERC1967 implementation storage slot.
//      *
//      * @param proxy Address of a transparent or UUPS proxy
//      * @return Implementation address
//      */
//     function getImplementationAddress(address proxy) internal view returns (address) {
//         return Core.getImplementationAddress(proxy);
//     }

//     /**
//      * @dev Gets the beacon address of a beacon proxy from its ERC1967 beacon storage slot.
//      *
//      * @param proxy Address of a beacon proxy
//      * @return Beacon address
//      */
//     function getBeaconAddress(address proxy) internal view returns (address) {
//         return Core.getBeaconAddress(proxy);
//     }
// }

// // pkg/contracts/src/BaseStrategyUpgradeable.sol

// // Interfaces

// // Libraries
// // import {BaseStrategy, IAllo} from "allo-v2-contracts/strategies/BaseStrategy.sol";

// /// @title BaseStrategy Contract
// /// @author @thelostone-mc <aditya@gitcoin.co>, @0xKurt <kurt@gitcoin.co>, @codenamejason <jason@gitcoin.co>, @0xZakk <zakk@gitcoin.co>, @nfrgosselin <nate@gitcoin.co>
// /// @notice This contract is the base contract for all strategies
// /// @dev This contract is implemented by all strategies.

// abstract contract BaseStrategyUpgradeable is ProxyOwnableUpgrader, IStrategy, Transfer, Errors {
//     /// ==========================
//     /// === Storage Variables ====
//     /// ==========================

//     IAllo internal allo;
//     bytes32 internal strategyId;
//     bool internal poolActive;
//     uint256 internal poolId;
//     uint256 internal poolAmount;

//     /// ====================================
//     /// ========== Constructor =============
//     /// ====================================

//     /// @notice Constructor to set the Allo contract and "strategyId'.
//     /// @notice `init` here its the initialize for upgradable contracts, different from `initialize()` that its used for Allo
//     /// @param _allo Address of the Allo contract.
//     /// @param _name Name of the strategy
//     /// @param _owner Address of the owner of the strategy

//     function init(address _allo, string memory _name, address _owner) public onlyInitializing {
//         super.initialize(_owner);
//         allo = IAllo(_allo);
//         strategyId = keccak256(abi.encode(_name));
//     }

//     // function initialize(address _allo, string memory _name) external onlyAllo {
//     //     allo = IAllo(_allo);
//     //     strategyId = keccak256(abi.encode(_name));
//     // }

//     /// ====================================
//     /// =========== Modifiers ==============
//     /// ====================================

//     /// @notice Modifier to check if the 'msg.sender' is the Allo contract.
//     /// @dev Reverts if the 'msg.sender' is not the Allo contract.
//     // modifier onlyAllo() {
//     //     _checkOnlyAllo();
//     //     _;
//     // }

//     // /// @notice Modifier to check if the '_sender' is a pool manager.
//     // /// @dev Reverts if the '_sender' is not a pool manager.
//     // /// @param _sender The address to check if they are a pool manager
//     // modifier onlyPoolManager(address _sender) {
//     //     _checkOnlyPoolManager(_sender);
//     //     _;
//     // }

//     // /// @notice Modifier to check if the pool is active.
//     // /// @dev Reverts if the pool is not active.
//     // modifier onlyActivePool() {
//     //     _checkOnlyActivePool();
//     //     _;
//     // }

//     // /// @notice Modifier to check if the pool is inactive.
//     // /// @dev Reverts if the pool is active.
//     // modifier onlyInactivePool() {
//     //     _checkInactivePool();
//     //     _;
//     // }

//     // /// @notice Modifier to check if the pool is initialized.
//     // /// @dev Reverts if the pool is not initialized.
//     // modifier onlyInitialized() {
//     //     _checkOnlyInitialized();
//     //     _;
//     // }

//     /// ================================
//     /// =========== Views ==============
//     /// ================================

//     /// @notice Getter for the 'Allo' contract.
//     /// @return The Allo contract
//     function getAllo() external view override returns (IAllo) {
//         return allo;
//     }

//     /// @notice Getter for the 'poolId'.
//     /// @return The ID of the pool
//     function getPoolId() external view override returns (uint256) {
//         return poolId;
//     }

//     // /// @notice Getter for the 'strategyId'.
//     // /// @return The ID of the strategy
//     // function getStrategyId() external view override returns (bytes32) {
//     //     return strategyId;
//     // }

//     /// @notice Getter for whether or not the pool is active.
//     /// @return 'true' if the pool is active, otherwise 'false'
//     function isPoolActive() external view override returns (bool) {
//         return _isPoolActive();
//     }

//     /// ====================================
//     /// =========== Functions ==============
//     /// ====================================

//     /// @notice Initializes the 'Basetrategy'.
//     /// @dev Will revert if the poolId is invalid or already initialized
//     /// @param _poolId ID of the pool
//     function __BaseStrategy_init(uint256 _poolId) internal {
//         _checkOnlyAllo();
//         //@todo rename init to InitAllo
//         // check if pool ID is not initialized already, if it is, revert
//         if (poolId != 0) revert ALREADY_INITIALIZED();

//         // check if pool ID is valid and not zero (0), if it is, revert
//         if (_poolId == 0) revert INVALID();
//         poolId = _poolId;
//     }

//     // /// @notice Increases the pool amount.
//     // /// @dev Increases the 'poolAmount' by '_amount'. Only 'Allo' contract can call this.
//     // /// @param _amount The amount to increase the pool by
//     // function increasePoolAmount(uint256 _amount) external override onlyAllo {
//     //     _beforeIncreasePoolAmount(_amount);
//     //     poolAmount += _amount;
//     //     _afterIncreasePoolAmount(_amount);
//     // }

//     /// @notice Registers a recipient.
//     /// @dev Registers a recipient and returns the ID of the recipient. The encoded '_data' will be determined by the
//     ///      strategy implementation. Only 'Allo' contract can call this when it is initialized.
//     /// @param _data The data to use to register the recipient
//     /// @param _sender The address of the sender
//     /// @return recipientId The recipientId
//     // function registerRecipient(bytes memory _data, address _sender)
//     //     external
//     //     payable
//     //     onlyAllo
//     //     onlyInitialized
//     //     returns (address recipientId)
//     // {
//     //     _beforeRegisterRecipient(_data, _sender);
//     //     recipientId = _registerRecipient(_data, _sender);
//     //     _afterRegisterRecipient(_data, _sender);
//     // }

//     /// @notice Allocates to a recipient.
//     /// @dev The encoded '_data' will be determined by the strategy implementation. Only 'Allo' contract can
//     ///      call this when it is initialized.
//     /// @param _data The data to use to allocate to the recipient
//     /// @param _sender The address of the sender
//     // function allocate(bytes memory _data, address _sender) external payable onlyAllo onlyInitialized {
//     //     _beforeAllocate(_data, _sender);
//     //     _allocate(_data, _sender);
//     //     _afterAllocate(_data, _sender);
//     // }

//     /// @notice Distributes funds (tokens) to recipients.
//     /// @dev The encoded '_data' will be determined by the strategy implementation. Only 'Allo' contract can
//     ///      call this when it is initialized.
//     /// @param _recipientIds The IDs of the recipients
//     /// @param _data The data to use to distribute to the recipients
//     /// @param _sender The address of the sender
//     // function distribute(address[] memory _recipientIds, bytes memory _data, address _sender)
//     //     external
//     //     onlyAllo
//     //     onlyInitialized
//     // {
//     //     _beforeDistribute(_recipientIds, _data, _sender);
//     //     _distribute(_recipientIds, _data, _sender);
//     //     _afterDistribute(_recipientIds, _data, _sender);
//     // }

//     /// @notice Gets the payout summary for recipients.
//     /// @dev The encoded '_data' will be determined by the strategy implementation.
//     /// @param _recipientIds The IDs of the recipients
//     /// @param _data The data to use to get the payout summary for the recipients
//     // function getPayouts(address[] memory _recipientIds, bytes[] memory _data)
//     //     external
//     //     view
//     //     override
//     //     returns (PayoutSummary[] memory payouts)
//     // {
//     //     uint256 recipientLength = _recipientIds.length;
//     //     // check if the length of the recipient IDs and data arrays are equal, if they are not, revert
//     //     if (recipientLength != _data.length) revert ARRAY_MISMATCH();

//     //     payouts = new PayoutSummary[](recipientLength);
//     //     for (uint256 i; i < recipientLength;) {
//     //         payouts[i] = _getPayout(_recipientIds[i], _data[i]);
//     //         unchecked {
//     //             i++;
//     //         }
//     //     }
//     // }

//     // /// @notice Checks if the '_allocator' is a valid allocator.
//     // /// @dev How the allocator is determined is up to the strategy implementation.
//     // /// @param _allocator The address to check if it is a valid allocator for the strategy.
//     // /// @return 'true' if the address is a valid allocator, 'false' otherwise
//     // function isValidAllocator(address _allocator) external view  override returns (bool) {
//     //     return _isValidAllocator(_allocator);
//     // }

//     /// ====================================
//     /// ============ Internal ==============
//     /// ====================================

//     /// @notice Checks if the 'msg.sender' is the Allo contract.
//     /// @dev Reverts if the 'msg.sender' is not the Allo contract.
//     function _checkOnlyAllo() internal view {
//         if (msg.sender != address(allo)) revert UNAUTHORIZED();
//     }

//     /// @notice Checks if the '_sender' is a pool manager.
//     /// @dev Reverts if the '_sender' is not a pool manager.
//     /// @param _sender The address to check if they are a pool manager
//     function _checkOnlyPoolManager(address _sender) internal view {
//         if (!allo.isPoolManager(poolId, _sender)) revert UNAUTHORIZED();
//     }

//     /// @notice Checks if the pool is active.
//     /// @dev Reverts if the pool is not active.
//     function _checkOnlyActivePool() internal view {
//         if (!poolActive) revert POOL_INACTIVE();
//     }

//     /// @notice Checks if the pool is inactive.
//     /// @dev Reverts if the pool is active.
//     function _checkInactivePool() internal view {
//         if (poolActive) revert POOL_ACTIVE();
//     }

//     /// @notice Checks if the pool is initialized.
//     /// @dev Reverts if the pool is not initialized.
//     function _checkOnlyInitialized() internal view {
//         if (poolId == 0) revert NOT_INITIALIZED();
//     }

//     /// @notice Set the pool to active or inactive status.
//     /// @dev This will emit a 'PoolActive()' event. Used by the strategy implementation.
//     /// @param _active The status to set, 'true' means active, 'false' means inactive
//     function _setPoolActive(bool _active) internal {
//         poolActive = _active;
//         emit PoolActive(_active);
//     }

//     /// @notice Checks if the pool is active.
//     /// @dev Used by the strategy implementation.
//     /// @return 'true' if the pool is active, otherwise 'false'
//     function _isPoolActive() internal view returns (bool) {
//         return poolActive;
//     }

//     /// @notice Checks if the allocator is valid
//     /// @param _allocator The allocator address
//     /// @return 'true' if the allocator is valid, otherwise 'false'
//     // function _isValidAllocator(address _allocator) internal view returns (bool);

//     /// @notice This will register a recipient, set their status (and any other strategy specific values), and
//     ///         return the ID of the recipient.
//     /// @dev Able to change status all the way up to Accepted, or to Pending and if there are more steps, additional
//     ///      functions should be added to allow the owner to check this. The owner could also check attestations directly
//     ///      and then Accept for instance.
//     /// @param _data The data to use to register the recipient
//     /// @param _sender The address of the sender
//     /// @return The ID of the recipient
//     // function _registerRecipient(bytes memory _data, address _sender) internal virtual returns (address);

//     /// @notice This will allocate to a recipient.
//     /// @dev The encoded '_data' will be determined by the strategy implementation.
//     /// @param _data The data to use to allocate to the recipient
//     /// @param _sender The address of the sender
//     // function _allocate(bytes memory _data, address _sender) internal virtual;

//     /// @notice This will distribute funds (tokens) to recipients.
//     /// @dev most strategies will track a TOTAL amount per recipient, and a PAID amount, and pay the difference
//     /// this contract will need to track the amount paid already, so that it doesn't double pay.
//     /// @param _recipientIds The ids of the recipients to distribute to
//     /// @param _data Data required will depend on the strategy implementation
//     /// @param _sender The address of the sender
//     // function _distribute(address[] memory _recipientIds, bytes memory _data, address _sender) internal virtual;

//     /// @notice This will get the payout summary for a recipient.
//     /// @dev The encoded '_data' will be determined by the strategy implementation.
//     /// @param _recipientId The ID of the recipient
//     /// @param _data The data to use to get the payout summary for the recipient
//     /// @return The payout summary for the recipient
//     // function _getPayout(address _recipientId, bytes memory _data)
//     //     internal
//     //     view
//     //     virtual
//     //     returns (PayoutSummary memory);

//     // /// @notice This will get the status of a recipient.
//     // /// @param _recipientId The ID of the recipient
//     // /// @return The status of the recipient
//     // // simply returns the status of a recipient
//     // // probably tracked in a mapping, but will depend on the implementation
//     // // for example, the OpenSelfRegistration only maps users to bool, and then assumes Accepted for those
//     // // since there is no need for Pending or Rejected
//     // function getRecipientStatus(address _recipientId) external pure  returns (Status) {
//     //     // surpressStateMutabilityWarning;
//     //     // return _recipientId == address(0) ? Status.Rejected : Status.Accepted;
//     // }

//     /// ===================================
//     /// ============== Hooks ==============
//     /// ===================================

//     /// @notice Hook called before increasing the pool amount.
//     /// @param _amount The amount to increase the pool by
//     // function _beforeIncreasePoolAmount(uint256 _amount) internal  {}

//     /// @notice Hook called after increasing the pool amount.
//     /// @param _amount The amount to increase the pool by
//     // function _afterIncreasePoolAmount(uint256 _amount) internal  {}

//     /// @notice Hook called before registering a recipient.
//     /// @param _data The data to use to register the recipient
//     /// @param _sender The address of the sender
//     // function _beforeRegisterRecipient(bytes memory _data, address _sender) internal {}

//     /// @notice Hook called after registering a recipient.
//     /// @param _data The data to use to register the recipient
//     /// @param _sender The address of the sender
//     // function _afterRegisterRecipient(bytes memory _data, address _sender) internal {}

//     /// @notice Hook called before allocating to a recipient.
//     /// @param _data The data to use to allocate to the recipient
//     /// @param _sender The address of the sender
//     // function _beforeAllocate(bytes memory _data, address _sender) internal virtual {}

//     /// @notice Hook called after allocating to a recipient.
//     /// @param _data The data to use to allocate to the recipient
//     /// @param _sender The address of the sender
//     // function _afterAllocate(bytes memory _data, address _sender) internal {}

//     /// @notice Hook called before distributing funds (tokens) to recipients.
//     /// @param _recipientIds The IDs of the recipients
//     /// @param _data The data to use to distribute to the recipients
//     /// @param _sender The address of the sender
//     // function _beforeDistribute(address[] memory _recipientIds, bytes memory _data, address _sender) internal virtual {}

//     /// @notice Hook called after distributing funds (tokens) to recipients.
//     /// @param _recipientIds The IDs of the recipients
//     /// @param _data The data to use to distribute to the recipients
//     /// @param _sender The address of the sender
//     // function _afterDistribute(address[] memory _recipientIds, bytes memory _data, address _sender) internal {}
// }

// // pkg/contracts/src/PassportScorer.sol

// /// @custom:oz-upgrades-from PassportScorer
// contract PassportScorer is ISybilScorer, ProxyOwnableUpgrader {
//     address public listManager;

//     mapping(address => uint256) public userScores;
//     mapping(address => Strategy) public strategies;

//     event UserScoreAdded(address indexed user, uint256 score);
//     event UserRemoved(address indexed user);
//     event ListManagerChanged(address indexed oldManager, address indexed newManager);
//     event StrategyAdded(address indexed strategy, uint256 threshold, bool active, address councilSafe);
//     event StrategyRemoved(address indexed strategy);
//     event StrategyActivated(address indexed strategy);
//     event ThresholdModified(address indexed strategy, uint256 newThreshold);

//     error OnlyAuthorized();
//     error OnlyAuthorizedOrUser();
//     error OnlyCouncilOrAuthorized();
//     error OnlyCouncil();
//     error ZeroAddress();
//     error StrategyAlreadyExists();

//     modifier onlyAuthorized() {
//         if (msg.sender == owner() || msg.sender == listManager) {
//             _;
//         } else {
//             revert OnlyAuthorized();
//         }
//     }

//     modifier onlyCouncilOrAuthorized(address _strategy) {
//         address registryCommunity = address(CVStrategyV0_0(payable(_strategy)).registryCommunity());
//         if (
//             msg.sender == owner() || msg.sender == _strategy || msg.sender == registryCommunity
//                 || msg.sender == listManager || msg.sender == strategies[_strategy].councilSafe
//         ) {
//             _;
//         } else {
//             revert OnlyCouncilOrAuthorized();
//         }
//     }

//     modifier onlyCouncil(address _strategy) {
//         if (msg.sender == strategies[_strategy].councilSafe) {
//             _;
//         } else {
//             revert OnlyCouncil();
//         }
//     }

//     function _revertZeroAddress(address _address) private pure {
//         if (_address == address(0)) {
//             revert ZeroAddress();
//         }
//     }

//     // slither-disable-next-line unprotected-upgrade
//     function initialize(address _listManager, address _owner) public initializer {
//         super.initialize(_owner);
//         _revertZeroAddress(_listManager);
//         listManager = _listManager;
//     }

//     /// @notice Add a userScore to the list
//     /// @param _user address of the user to add
//     /// @param _score score to assign to the user
//     function addUserScore(address _user, uint256 _score) external override onlyAuthorized {
//         _revertZeroAddress(_user);
//         userScores[_user] = _score;
//         emit UserScoreAdded(_user, _score);
//     }

//     /// @notice Remove a user from the list
//     /// @param _user address of the user to remove
//     function removeUser(address _user) external override onlyAuthorized {
//         _revertZeroAddress(_user);
//         delete userScores[_user];
//         emit UserRemoved(_user);
//     }

//     /// @notice Change the list manager address
//     /// @param _newManager address of the new list manager
//     function changeListManager(address _newManager) external override onlyOwner {
//         _revertZeroAddress(_newManager);
//         address oldManager = listManager;
//         listManager = _newManager;
//         emit ListManagerChanged(oldManager, _newManager);
//     }

//     /// @notice Add a strategy to the contract
//     /// @param _threshold is expressed on a scale of 10**4
//     /// @param _councilSafe address of the council safe
//     function addStrategy(address _strategy, uint256 _threshold, address _councilSafe)
//         external
//         override
//         onlyCouncilOrAuthorized(_strategy)
//     {
//         _revertZeroAddress(_strategy);
//         _revertZeroAddress(_councilSafe);
//         if (strategies[_strategy].threshold != 0 || strategies[_strategy].councilSafe != address(0)) {
//             revert StrategyAlreadyExists();
//         }
//         strategies[_strategy] = Strategy({threshold: _threshold, active: false, councilSafe: _councilSafe});
//         emit StrategyAdded(_strategy, _threshold, false, _councilSafe);
//     }

//     /// @notice Remove a strategy from the contract
//     /// @param _strategy address of the strategy to remove
//     function removeStrategy(address _strategy) external override onlyCouncilOrAuthorized(_strategy) {
//         _revertZeroAddress(_strategy);
//         delete strategies[_strategy];
//         emit StrategyRemoved(_strategy);
//     }

//     /// @notice Activate a strategy
//     /// @param _strategy address of the strategy to activate
//     function activateStrategy(address _strategy) external onlyCouncilOrAuthorized(_strategy) {
//         _revertZeroAddress(_strategy);
//         strategies[_strategy].active = true;
//         emit StrategyActivated(_strategy);
//     }

//     /// @notice Modify the threshold of a strategy
//     /// @param _strategy address of the strategy to modify
//     /// @param _newThreshold new threshold to set expressed on a scale of 10**4
//     function modifyThreshold(address _strategy, uint256 _newThreshold) external onlyCouncilOrAuthorized(_strategy) {
//         _revertZeroAddress(_strategy);
//         strategies[_strategy].threshold = _newThreshold;
//         emit ThresholdModified(_strategy, _newThreshold);
//     }

//     /// @notice Check if an action can be executed
//     /// @param _user address of the user to check
//     /// @param _strategy address of the strategy to check
//     function canExecuteAction(address _user, address _strategy) external view override returns (bool) {
//         uint256 userScore = userScores[_user];
//         Strategy memory strategy = strategies[_strategy];

//         if (!strategy.active) {
//             return true;
//         }

//         return userScore >= strategy.threshold;
//     }

//     uint256[50] private __gap;
// }

// // pkg/contracts/src/RegistryCommunity/RegistryCommunityV0_0.sol

// /*|--------------------------------------------|*/
// /*|              STRUCTS/ENUMS                 |*/
// /*|--------------------------------------------|*/

// /// @dev Initialize parameters for the contract
// /// @param _allo The Allo contract address
// /// @param _gardenToken The token used to stake in the community
// /// @param _registerStakeAmount The amount of tokens required to register a member
// /// @param _communityFee The fee charged to the community for each registration
// /// @param _nonce The nonce used to create new strategy clones
// /// @param _registryFactory The address of the registry factory
// /// @param _feeReceiver The address that receives the community fee
// /// @param _metadata The covenant IPFS hash of the community
// /// @param _councilSafe The council safe contract address
// /// @param _communityName The community name
// /// @param _isKickEnabled Enable or able the kick feature
// struct RegistryCommunityInitializeParamsV0_0 {
//     address _allo;
//     IERC20 _gardenToken;
//     uint256 _registerStakeAmount;
//     uint256 _communityFee;
//     uint256 _nonce;
//     address _registryFactory;
//     address _feeReceiver;
//     Metadata _metadata;
//     address payable _councilSafe;
//     string _communityName;
//     bool _isKickEnabled;
//     string covenantIpfsHash;
// }

// struct Member {
//     address member;
//     uint256 stakedAmount;
//     bool isRegistered;
// }

// struct CommunityParams {
//     address councilSafe;
//     address feeReceiver;
//     uint256 communityFee;
//     string communityName;
//     // Empty community only params
//     uint256 registerStakeAmount;
//     bool isKickEnabled;
//     string covenantIpfsHash;
// }

// struct Strategies {
//     address[] strategies;
// }

// /// @custom:oz-upgrades-from RegistryCommunityV0_0
// contract RegistryCommunityV0_0 is ProxyOwnableUpgrader, ReentrancyGuardUpgradeable, AccessControlUpgradeable {
//     /*|--------------------------------------------|*/
//     /*|                 EVENTS                     |*/
//     /*|--------------------------------------------|*/

//     event CouncilSafeUpdated(address _safe);
//     event CouncilSafeChangeStarted(address _safeOwner, address _newSafeOwner);
//     event MemberRegistered(address _member, uint256 _amountStaked);
//     event MemberRegisteredWithCovenant(address _member, uint256 _amountStaked, string _covenantSig);
//     event MemberUnregistered(address _member, uint256 _amountReturned);
//     event MemberKicked(address _member, address _transferAddress, uint256 _amountReturned);
//     event CommunityFeeUpdated(uint256 _newFee);
//     event RegistryInitialized(bytes32 _profileId, string _communityName, Metadata _metadata);
//     event StrategyAdded(address _strategy);
//     event StrategyRemoved(address _strategy);
//     event MemberActivatedStrategy(address _member, address _strategy, uint256 _pointsToIncrease);
//     event MemberDeactivatedStrategy(address _member, address _strategy);
//     event BasisStakedAmountUpdated(uint256 _newAmount);
//     event MemberPowerIncreased(address _member, uint256 _stakedAmount);
//     event MemberPowerDecreased(address _member, uint256 _unstakedAmount);
//     event CommunityNameUpdated(string _communityName);
//     event CovenantIpfsHashUpdated(string _covenantIpfsHash);
//     event KickEnabledUpdated(bool _isKickEnabled);
//     event FeeReceiverChanged(address _feeReceiver);
//     event PoolCreated(uint256 _poolId, address _strategy, address _community, address _token, Metadata _metadata); // 0x778cac0a
//     event PoolRejected(address _strategy);

//     /*|--------------------------------------------|*/
//     /*|              CUSTOM ERRORS                 |*/
//     /*|--------------------------------------------|*/

//     error AllowlistTooBig(uint256 size);
//     // error AddressCannotBeZero();
//     error OnlyEmptyCommunity(uint256 totalMembers);
//     error UserNotInCouncil(address _user);
//     error UserNotInRegistry();
//     error UserAlreadyActivated();
//     error UserAlreadyDeactivated();
//     error StrategyExists();
//     error StrategyDisabled();
//     error SenderNotNewOwner();
//     error SenderNotStrategy();
//     error ValueCannotBeZero();
//     error NewFeeGreaterThanMax();
//     error KickNotEnabled();
//     error PointsDeactivated();
//     error DecreaseUnderMinimum();
//     error CantDecreaseMoreThanPower(uint256 _decreaseAmount, uint256 _currentPower);

//     using ERC165Checker for address;
//     using SafeERC20 for IERC20;
//     using Clone for address;

//     string public constant VERSION = "0.0";
//     /// @notice The native address to represent native token eg: ETH in mainnet
//     address public constant NATIVE = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
//     /// @notice The precision scale used in the contract to avoid loss of precision
//     uint256 public constant PRECISION_SCALE = 10 ** 4;
//     /// @notice The maximum fee that can be charged to the community
//     uint256 public constant MAX_FEE = 10 * PRECISION_SCALE;
//     /// @notice The amount of tokens required to register a member
//     uint256 public registerStakeAmount;
//     /// @notice The fee charged to the community for each registration
//     uint256 public communityFee;
//     /// @notice The nonce used to create new strategy clones
//     uint256 public cloneNonce;
//     /// @notice The profileId of the community in the Allo Registry
//     bytes32 public profileId;
//     /// @notice Enable or disable the kick feature
//     bool public isKickEnabled;

//     /// @notice The address that receives the community fee
//     address public feeReceiver;
//     /// @notice The address of the registry factory
//     address public registryFactory;
//     /// @notice The address of the collateral vault template
//     address public collateralVaultTemplate;
//     /// @notice The address of the strategy template
//     address public strategyTemplate;
//     /// @notice The address of the pending council safe owner
//     address payable public pendingCouncilSafe;

//     /// @notice The Registry Allo contract
//     IRegistry public registry;
//     /// @notice The token used to stake in the community
//     IERC20 public gardenToken;
//     /// @notice The council safe contract address
//     ISafe public councilSafe;
//     /// @notice The Allo contract address
//     FAllo public allo;

//     /// @notice The community name
//     string public communityName;
//     /// @notice The covenant IPFS hash of community
//     string public covenantIpfsHash;

//     // mapping(address => bool) public tribunalMembers;

//     /// @notice List of enabled/disabled strategies
//     mapping(address strategy => bool isEnabled) public enabledStrategies;
//     /// @notice Power points for each member in each strategy
//     mapping(address strategy => mapping(address member => uint256 power)) public memberPowerInStrategy;
//     /// @notice Member information as the staked amount and if is registered in the community
//     mapping(address member => Member) public addressToMemberInfo;
//     /// @notice List of strategies for each member are activated
//     mapping(address member => address[] strategiesAddresses) public strategiesByMember;
//     /// @notice Mapping to check if a member is activated in a strategy
//     mapping(address member => mapping(address strategy => bool isActivated)) public memberActivatedInStrategies;

//     /// @notice List of initial members to be added as pool managers in the Allo Pool
//     address[] initialMembers;

//     /// @notice The total number of members in the community
//     uint256 public totalMembers;

//     /*|--------------------------------------------|*/
//     /*|                 ROLES                      |*/
//     /*|--------------------------------------------|*/
//     /// @notice Role to council safe members
//     bytes32 public constant COUNCIL_MEMBER = keccak256("COUNCIL_MEMBER");

//     /*|--------------------------------------------|*/
//     /*|              MODIFIERS                     |*/
//     /*|--------------------------------------------|*/

//     function onlyCouncilSafe() internal view virtual {
//         if (!hasRole(COUNCIL_MEMBER, msg.sender)) {
//             revert UserNotInCouncil(msg.sender);
//         }
//     }

//     function onlyRegistryMemberSender() internal view virtual {
//         if (!isMember(msg.sender)) {
//             revert UserNotInRegistry();
//         }
//     }

//     function onlyRegistryMemberAddress(address _sender) internal view {
//         if (!isMember(_sender)) {
//             revert UserNotInRegistry();
//         }
//     }

//     function onlyStrategyEnabled(address _strategy) public view {
//         if (!enabledStrategies[_strategy]) {
//             revert StrategyDisabled();
//         }
//     }

//     function onlyEmptyCommunity() internal view {
//         if (totalMembers > 0) {
//             revert OnlyEmptyCommunity(totalMembers);
//         }
//     }

//     function onlyStrategyAddress(address _sender, address _strategy) internal pure {
//         if (_sender != _strategy) {
//             revert SenderNotStrategy();
//         }
//     }

//     function onlyActivatedInStrategy(address _strategy) internal view {
//         if (!memberActivatedInStrategies[msg.sender][_strategy]) {
//             revert PointsDeactivated();
//         }
//     }

//     // function _revertZeroAddress(address _address) internal pure {
//     //     if (_address == address(0)) revert AddressCannotBeZero();
//     // }

//     function setStrategyTemplate(address template) external onlyOwner {
//         strategyTemplate = template;
//     }

//     function setCollateralVaultTemplate(address template) external onlyOwner {
//         collateralVaultTemplate = template;
//     }

//     // AUDIT: acknowledged upgradeable contract hat does not protect initialize functions,
//     // slither-disable-next-line unprotected-upgrade
//     function initialize(
//         RegistryCommunityInitializeParamsV0_0 memory params,
//         address _strategyTemplate,
//         address _collateralVaultTemplate,
//         address _owner
//     ) public initializer {
//         super.initialize(_owner);
//         __ReentrancyGuard_init();
//         __AccessControl_init();

//         _setRoleAdmin(COUNCIL_MEMBER, DEFAULT_ADMIN_ROLE);

//         // _revertZeroAddress(address(params._gardenToken));
//         // _revertZeroAddress(params._councilSafe);
//         // _revertZeroAddress(params._allo);
//         // _revertZeroAddress(params._registryFactory);

//         // if (params._communityFee != 0) {
//         //     _revertZeroAddress(params._feeReceiver);
//         // }
//         allo = FAllo(params._allo);
//         gardenToken = params._gardenToken;
//         if (params._registerStakeAmount == 0) {
//             revert ValueCannotBeZero();
//         }
//         registerStakeAmount = params._registerStakeAmount;
//         communityFee = params._communityFee;
//         isKickEnabled = params._isKickEnabled;
//         communityName = params._communityName;
//         covenantIpfsHash = params.covenantIpfsHash;

//         registryFactory = params._registryFactory;
//         feeReceiver = params._feeReceiver;
//         councilSafe = ISafe(params._councilSafe);
//         totalMembers = 0;

//         _grantRole(COUNCIL_MEMBER, params._councilSafe);

//         registry = IRegistry(allo.getRegistry());

//         address[] memory pool_initialMembers;
//         // Support EOA as coucil safe
//         if (address(councilSafe).code.length == 0) {
//             pool_initialMembers = new address[](3);
//             pool_initialMembers[0] = msg.sender;
//         } else {
//             address[] memory owners = councilSafe.getOwners();
//             pool_initialMembers = new address[](owners.length + 2);
//             for (uint256 i = 0; i < owners.length; i++) {
//                 pool_initialMembers[i] = owners[i];
//             }
//         }

//         pool_initialMembers[pool_initialMembers.length - 1] = address(councilSafe);
//         pool_initialMembers[pool_initialMembers.length - 2] = address(this);

//         // console.log("initialMembers length", pool_initialMembers.length);
//         profileId =
//             registry.createProfile(params._nonce, communityName, params._metadata, address(this), pool_initialMembers);

//         initialMembers = pool_initialMembers;

//         strategyTemplate = _strategyTemplate;
//         collateralVaultTemplate = _collateralVaultTemplate;

//         emit RegistryInitialized(profileId, communityName, params._metadata);
//     }

//     function createPool(address _token, CVStrategyInitializeParamsV0_1 memory _params, Metadata memory _metadata)
//         public
//         virtual
//         returns (uint256 poolId, address strategy)
//     {
//         address strategyProxy = address(
//             new ERC1967Proxy(
//                 address(strategyTemplate),
//                 abi.encodeWithSelector(
//                     CVStrategyV0_0.init.selector, address(allo), collateralVaultTemplate, proxyOwner()
//                 )
//             )
//         );
//         (poolId, strategy) = createPool(strategyProxy, _token, _params, _metadata);

//         if (address(_params.sybilScorer) == address(0)) {
//             if (_params.initialAllowlist.length > 10000) {
//                 revert AllowlistTooBig(_params.initialAllowlist.length);
//             }
//             bytes32 allowlistRole = keccak256(abi.encodePacked("ALLOWLIST", poolId));
//             for (uint256 i = 0; i < _params.initialAllowlist.length; i++) {
//                 _grantRole(allowlistRole, _params.initialAllowlist[i]);
//             }
//         }

//         // Grant the strategy to grant for startegy specific allowlist
//         _setRoleAdmin(
//             keccak256(abi.encodePacked("ALLOWLIST", poolId)), keccak256(abi.encodePacked("ALLOWLIST_ADMIN", poolId))
//         );
//         _grantRole(keccak256(abi.encodePacked("ALLOWLIST_ADMIN", poolId)), strategy);
//     }

//     function createPool(
//         address _strategy,
//         address _token,
//         CVStrategyInitializeParamsV0_1 memory _params,
//         Metadata memory _metadata
//     ) public virtual returns (uint256 poolId, address strategy) {
//         address token = NATIVE;
//         if (_token != address(0)) {
//             token = _token;
//         }
//         strategy = _strategy;

//         poolId = allo.createPoolWithCustomStrategy(
//             profileId, strategy, abi.encode(_params), token, 0, _metadata, initialMembers
//         );

//         emit PoolCreated(poolId, strategy, address(this), _token, _metadata);
//     }

//     function activateMemberInStrategy(address _member, address _strategy) public virtual nonReentrant {
//         onlyRegistryMemberAddress(_member);
//         onlyStrategyEnabled(_strategy);
//         onlyStrategyAddress(msg.sender, _strategy);
//         // _revertZeroAddress(_strategy);

//         if (memberActivatedInStrategies[_member][_strategy]) {
//             revert UserAlreadyActivated();
//         }

//         Member memory member = addressToMemberInfo[_member];

//         uint256 totalStakedAmount = member.stakedAmount;
//         uint256 pointsToIncrease = registerStakeAmount;

//         if (CVStrategyV0_0(payable(_strategy)).getPointSystem() == PointSystem.Quadratic) {
//             pointsToIncrease = CVStrategyV0_0(payable(_strategy)).increasePower(_member, 0);
//         } else if (CVStrategyV0_0(payable(_strategy)).getPointSystem() != PointSystem.Fixed) {
//             pointsToIncrease = CVStrategyV0_0(payable(_strategy)).increasePower(_member, totalStakedAmount);
//         }

//         memberPowerInStrategy[_member][_strategy] = pointsToIncrease; // can be all zero
//         memberActivatedInStrategies[_member][_strategy] = true;

//         strategiesByMember[_member].push(_strategy);

//         emit MemberActivatedStrategy(_member, _strategy, pointsToIncrease);
//     }

//     function deactivateMemberInStrategy(address _member, address _strategy) public virtual {
//         onlyRegistryMemberAddress(_member);
//         // _revertZeroAddress(_strategy);
//         onlyStrategyAddress(msg.sender, _strategy);

//         if (!memberActivatedInStrategies[_member][_strategy]) {
//             revert UserAlreadyDeactivated();
//         }

//         memberActivatedInStrategies[_member][_strategy] = false;
//         memberPowerInStrategy[_member][_strategy] = 0;
//         removeStrategyFromMember(_member, _strategy);
//         //totalPointsActivatedInStrategy[_strategy] -= DEFAULT_POINTS;
//         // emit StrategyRemoved(_strategy);
//         emit MemberDeactivatedStrategy(_member, _strategy);
//     }

//     function removeStrategyFromMember(address _member, address _strategy) internal virtual {
//         address[] storage memberStrategies = strategiesByMember[_member];
//         for (uint256 i = 0; i < memberStrategies.length; i++) {
//             if (memberStrategies[i] == _strategy) {
//                 memberStrategies[i] = memberStrategies[memberStrategies.length - 1];
//                 memberStrategies.pop();
//             }
//         }
//     }

//     function increasePower(uint256 _amountStaked) public virtual nonReentrant {
//         onlyRegistryMemberSender();
//         address member = msg.sender;
//         uint256 pointsToIncrease;

//         for (uint256 i = 0; i < strategiesByMember[member].length; i++) {
//             //FIX support interface check
//             //if (address(strategiesByMember[member][i]) == _strategy) {
//             pointsToIncrease =
//                 CVStrategyV0_0(payable(strategiesByMember[member][i])).increasePower(member, _amountStaked);
//             if (pointsToIncrease != 0) {
//                 memberPowerInStrategy[member][strategiesByMember[member][i]] += pointsToIncrease;
//                 // console.log("Strategy power", memberPowerInStrategy[member][strategiesByMember[member][i]]);
//             }
//             //}
//         }

//         gardenToken.safeTransferFrom(member, address(this), _amountStaked);
//         addressToMemberInfo[member].stakedAmount += _amountStaked;
//         emit MemberPowerIncreased(member, _amountStaked);
//     }

//     /*
//      * @notice Decrease the power of a member in a strategy
//      * @param _amountUnstaked The amount of tokens to unstake
//      */
//     function decreasePower(uint256 _amountUnstaked) public virtual nonReentrant {
//         onlyRegistryMemberSender();
//         address member = msg.sender;
//         address[] storage memberStrategies = strategiesByMember[member];

//         uint256 pointsToDecrease;

//         if (addressToMemberInfo[member].stakedAmount - _amountUnstaked < registerStakeAmount) {
//             revert DecreaseUnderMinimum();
//         }
//         gardenToken.safeTransfer(member, _amountUnstaked);
//         for (uint256 i = 0; i < memberStrategies.length; i++) {
//             address strategy = memberStrategies[i];
//             // if (strategy.supportsInterface(type(CVStrategyV0_0).interfaceId)) {
//             pointsToDecrease = CVStrategyV0_0(payable(strategy)).decreasePower(member, _amountUnstaked);
//             uint256 currentPower = memberPowerInStrategy[member][memberStrategies[i]];
//             if (pointsToDecrease > currentPower) {
//                 revert CantDecreaseMoreThanPower(pointsToDecrease, currentPower);
//             } else {
//                 memberPowerInStrategy[member][memberStrategies[i]] -= pointsToDecrease;
//             }
//             // } else {
//             //     // emit StrategyShouldBeRemoved(strategy, member);
//             //     memberStrategies[i] = memberStrategies[memberStrategies.length - 1];
//             //     memberStrategies.pop();
//             //     _removeStrategy(strategy);
//             // }
//             // }
//         }
//         addressToMemberInfo[member].stakedAmount -= _amountUnstaked;
//         emit MemberPowerDecreased(member, _amountUnstaked);
//     }

//     function getMemberPowerInStrategy(address _member, address _strategy) public view virtual returns (uint256) {
//         return memberPowerInStrategy[_member][_strategy];
//     }

//     function getMemberStakedAmount(address _member) public view virtual returns (uint256) {
//         return addressToMemberInfo[_member].stakedAmount;
//     }

//     function addStrategyByPoolId(uint256 poolId) public virtual {
//         onlyCouncilSafe();
//         address strategy = address(allo.getPool(poolId).strategy);
//         // _revertZeroAddress(strategy);
//         // if (strategy.supportsInterface(type(IPointStrategy).interfaceId)) {
//         _addStrategy(strategy);
//         // }
//     }

//     function addStrategy(address _newStrategy) public virtual {
//         onlyCouncilSafe();
//         _addStrategy(_newStrategy);
//     }

//     function _addStrategy(address _newStrategy) internal virtual {
//         if (enabledStrategies[_newStrategy]) {
//             revert StrategyExists();
//         }
//         enabledStrategies[_newStrategy] = true;
//         ISybilScorer sybilScorer = CVStrategyV0_0(payable(_newStrategy)).sybilScorer();
//         if (address(sybilScorer) != address(0)) {
//             sybilScorer.activateStrategy(_newStrategy);
//         }
//         emit StrategyAdded(_newStrategy);
//     }

//     function rejectPool(address _strategy) public virtual {
//         onlyCouncilSafe();
//         if (enabledStrategies[_strategy]) {
//             _removeStrategy(_strategy);
//         }
//         emit PoolRejected(_strategy);
//     }

//     function removeStrategyByPoolId(uint256 poolId) public virtual {
//         onlyCouncilSafe();
//         address strategy = address(allo.getPool(poolId).strategy);
//         // _revertZeroAddress(strategy);
//         _removeStrategy(strategy);
//     }

//     function _removeStrategy(address _strategy) internal virtual {
//         // _revertZeroAddress(_strategy);
//         enabledStrategies[_strategy] = false;
//         emit StrategyRemoved(_strategy);
//     }

//     function removeStrategy(address _strategy) public virtual {
//         onlyCouncilSafe();
//         _removeStrategy(_strategy);
//     }

//     function setCouncilSafe(address payable _safe) public virtual {
//         onlyCouncilSafe();
//         // _revertZeroAddress(_safe);
//         pendingCouncilSafe = _safe;
//         emit CouncilSafeChangeStarted(address(councilSafe), pendingCouncilSafe);
//     }

//     function acceptCouncilSafe() public virtual {
//         if (msg.sender != pendingCouncilSafe) {
//             revert SenderNotNewOwner();
//         }
//         _grantRole(COUNCIL_MEMBER, pendingCouncilSafe);
//         _revokeRole(COUNCIL_MEMBER, address(councilSafe));
//         councilSafe = ISafe(pendingCouncilSafe);
//         delete pendingCouncilSafe;
//         emit CouncilSafeUpdated(address(councilSafe));
//     }

//     function isMember(address _member) public view virtual returns (bool) {
//         return addressToMemberInfo[_member].isRegistered;
//     }

//     function stakeAndRegisterMember(string memory covenantSig) public virtual nonReentrant {
//         IRegistryFactory gardensFactory = IRegistryFactory(registryFactory);
//         uint256 communityFeeAmount = (registerStakeAmount * communityFee) / (100 * PRECISION_SCALE);
//         uint256 gardensFeeAmount =
//             (registerStakeAmount * gardensFactory.getProtocolFee(address(this))) / (100 * PRECISION_SCALE);
//         if (!isMember(msg.sender)) {
//             addressToMemberInfo[msg.sender].isRegistered = true;

//             addressToMemberInfo[msg.sender].stakedAmount = registerStakeAmount;
//             // console.log("registerStakeAmount", registerStakeAmount);
//             // console.log("gardenToken", address(gardenToken));

//             gardenToken.safeTransferFrom(
//                 msg.sender, address(this), registerStakeAmount + communityFeeAmount + gardensFeeAmount
//             );
//             //TODO: Test if revert because of approve on contract, if doesnt work, transfer all to this contract, and then transfer to each receiver
//             //individually. Check vulnerabilites for that with Felipe
//             // gardenToken.approve(feeReceiver,communityFeeAmount);
//             //Error: ProtocolFee is equal to zero
//             // console.log("communityFeeAmount", communityFeeAmount);
//             if (communityFeeAmount > 0) {
//                 // console.log("feeReceiver", feeReceiver);
//                 gardenToken.safeTransfer(feeReceiver, communityFeeAmount);
//             }
//             // console.log("gardensFeeAmount", gardensFeeAmount);
//             if (gardensFeeAmount > 0) {
//                 // console.log("gardensFactory.getGardensFeeReceiver()", gardensFactory.getGardensFeeReceiver());
//                 gardenToken.safeTransfer(gardensFactory.getGardensFeeReceiver(), gardensFeeAmount);
//             }
//             totalMembers += 1;

//             emit MemberRegisteredWithCovenant(msg.sender, registerStakeAmount, covenantSig);
//         }
//     }

//     function getStakeAmountWithFees() public view virtual returns (uint256) {
//         uint256 communityFeeAmount = (registerStakeAmount * communityFee) / (100 * PRECISION_SCALE);
//         uint256 gardensFeeAmount = (
//             registerStakeAmount * IRegistryFactory(registryFactory).getProtocolFee(address(this))
//         ) / (100 * PRECISION_SCALE);

//         return registerStakeAmount + communityFeeAmount + gardensFeeAmount;
//     }

//     function getBasisStakedAmount() external view virtual returns (uint256) {
//         return registerStakeAmount;
//     }

//     function setBasisStakedAmount(uint256 _newAmount) public virtual {
//         onlyCouncilSafe();
//         onlyEmptyCommunity();
//         registerStakeAmount = _newAmount;
//         emit BasisStakedAmountUpdated(_newAmount);
//     }

//     function setCommunityParams(CommunityParams memory _params) external {
//         onlyCouncilSafe();
//         if (
//             _params.registerStakeAmount != registerStakeAmount || _params.isKickEnabled != isKickEnabled
//                 || keccak256(bytes(_params.covenantIpfsHash)) != keccak256(bytes(covenantIpfsHash))
//         ) {
//             onlyEmptyCommunity();
//             if (_params.registerStakeAmount != registerStakeAmount) {
//                 setBasisStakedAmount(_params.registerStakeAmount);
//             }
//             if (_params.isKickEnabled != isKickEnabled) {
//                 isKickEnabled = _params.isKickEnabled;
//                 emit KickEnabledUpdated(_params.isKickEnabled);
//             }
//             if (keccak256(bytes(_params.covenantIpfsHash)) != keccak256(bytes(covenantIpfsHash))) {
//                 covenantIpfsHash = _params.covenantIpfsHash;
//                 emit CovenantIpfsHashUpdated(_params.covenantIpfsHash);
//             }
//         }
//         if (keccak256(bytes(_params.communityName)) != keccak256(bytes(communityName))) {
//             communityName = _params.communityName;
//             emit CommunityNameUpdated(_params.communityName);
//         }
//         if (_params.communityFee != communityFee) {
//             setCommunityFee(_params.communityFee);
//         }
//         if (_params.feeReceiver != feeReceiver) {
//             feeReceiver = _params.feeReceiver;
//             emit FeeReceiverChanged(_params.feeReceiver);
//         }
//         if (_params.councilSafe != address(0)) {
//             setCouncilSafe(payable(_params.councilSafe));
//         }
//     }

//     function setCommunityFee(uint256 _newCommunityFee) public virtual {
//         onlyCouncilSafe();
//         // TODO: I dont think we want this to be restricted
//         if (_newCommunityFee > MAX_FEE) {
//             revert NewFeeGreaterThanMax();
//         }
//         communityFee = _newCommunityFee;
//         emit CommunityFeeUpdated(_newCommunityFee);
//     }

//     function isCouncilMember(address _member) public view virtual returns (bool) {
//         return hasRole(COUNCIL_MEMBER, _member);
//     }

//     function unregisterMember() public virtual nonReentrant {
//         onlyRegistryMemberSender();
//         address _member = msg.sender;
//         deactivateAllStrategies(_member);
//         Member memory member = addressToMemberInfo[_member];
//         delete addressToMemberInfo[_member];
//         delete strategiesByMember[_member];
//         // In order to resync older contracts that skipped this counter until upgrade (community-params-editable)
//         if (totalMembers > 0) {
//             totalMembers -= 1;
//         }
//         gardenToken.safeTransfer(_member, member.stakedAmount);
//         emit MemberUnregistered(_member, member.stakedAmount);
//     }

//     function deactivateAllStrategies(address _member) internal virtual {
//         address[] memory memberStrategies = strategiesByMember[_member];
//         // bytes4 interfaceId = IPointStrategy.withdraw.selector;
//         for (uint256 i = 0; i < memberStrategies.length; i++) {
//             //FIX support interface check
//             //if(memberStrategies[i].supportsInterface(interfaceId)){
//             CVStrategyV0_0(payable(memberStrategies[i])).deactivatePoints(_member);
//         }
//     }

//     function kickMember(address _member, address _transferAddress) public virtual nonReentrant {
//         onlyCouncilSafe();
//         if (!isKickEnabled) {
//             revert KickNotEnabled();
//         }
//         if (!isMember(_member)) {
//             revert UserNotInRegistry();
//         }
//         Member memory member = addressToMemberInfo[_member];
//         deactivateAllStrategies(_member);
//         delete addressToMemberInfo[_member];
//         totalMembers -= 1;

//         gardenToken.safeTransfer(_transferAddress, member.stakedAmount);
//         emit MemberKicked(_member, _transferAddress, member.stakedAmount);
//     }

//     uint256[49] private __gap;
// }

// // pkg/contracts/src/CVStrategy/CVStrategyV0_0.sol

// /// @custom:oz-upgrades-from CVStrategyV0_0
// contract CVStrategyV0_0 is BaseStrategyUpgradeable, IArbitrable, ERC165 {
//     /*|--------------------------------------------|*/
//     /*|              CUSTOM ERRORS                 |*/
//     /*|--------------------------------------------|*/

//     error UserCannotBeZero(); // 0xd1f28288
//     error UserNotInRegistry(); //0x6a5cfb6d
//     error UserIsInactive(); // 0x5fccb67f
//     error PoolIsEmpty(); // 0xed4421ad
//     error NotImplemented(); //0xd6234725
//     error TokenCannotBeZero(); //0x596a094c
//     error TokenNotAllowed(); // 0xa29c4986
//     error AmountOverMaxRatio(); // 0x3bf5ca14
//     error AddressCannotBeZero(); //0xe622e040
//     error RegistryCannotBeZero(); // 0x5df4b1ef
//     error SupportUnderflow(uint256 _support, int256 _delta, int256 _result); // 0x3bbc7142
//     error NotEnoughPointsToSupport(uint256 pointsSupport, uint256 pointsBalance); // 0xd64182fe

//     error ProposalDataIsEmpty(); //0xc5f7c4c0
//     error ProposalIdCannotBeZero(); //0xf881a10d
//     error ProposalNotActive(uint256 _proposalId); // 0x44980d8f
//     error ProposalNotInList(uint256 _proposalId); // 0xc1d17bef
//     error ProposalSupportDuplicated(uint256 _proposalId, uint256 index); //0xadebb154
//     error ConvictionUnderMinimumThreshold(); // 0xcce79308
//     error OnlyCommunityAllowed(); // 0xaf0916a2
//     error PoolAmountNotEnough(uint256 _proposalId, uint256 _requestedAmount, uint256 _poolAmount); //0x5863b0b6
//     error OnlyCouncilSafe();
//     error UserCannotExecuteAction();
//     error InsufficientCollateral(uint256 sentAmount, uint256 requiredAmount);
//     error OnlyArbitrator();
//     error ProposalNotDisputed(uint256 _proposalId);
//     error ArbitratorCannotBeZero();
//     error OnlySubmitter(address submitter, address sender);
//     // Goss: Support Collateral Zero
//     // error CollateralVaultCannotBeZero();
//     error DefaultRulingNotSet();
//     error DisputeCooldownNotPassed(uint256 _proposalId, uint256 _remainingSec);
//     error ProposalInvalidForAllocation(uint256 _proposalId, ProposalStatus _proposalStatus);
//     error AShouldBeUnderTwo_128();
//     error BShouldBeLessTwo_128();
//     error AShouldBeUnderOrEqTwo_128();

//     /*|--------------------------------------------|*/
//     /*|              CUSTOM EVENTS                 |*/
//     /*|--------------------------------------------|*/

//     event InitializedCV(uint256 poolId, CVStrategyInitializeParamsV0_0 data);
//     event InitializedCV2(uint256 poolId, CVStrategyInitializeParamsV0_1 data);
//     event Distributed(uint256 proposalId, address beneficiary, uint256 amount);
//     event ProposalCreated(uint256 poolId, uint256 proposalId);
//     event PoolAmountIncreased(uint256 amount);
//     event PointsDeactivated(address member);
//     event PowerIncreased(address member, uint256 tokensStaked, uint256 pointsToIncrease);
//     event PowerDecreased(address member, uint256 tokensUnStaked, uint256 pointsToDecrease);
//     event SupportAdded(
//         address from, uint256 proposalId, uint256 amount, uint256 totalStakedAmount, uint256 convictionLast
//     );
//     event CVParamsUpdated(CVParams cvParams);
//     // event RegistryUpdated(address registryCommunity);
//     event ProposalDisputed(
//         IArbitrator arbitrator,
//         uint256 proposalId,
//         uint256 disputeId,
//         address challenger,
//         string context,
//         uint256 timestamp
//     );
//     // TODO: Uncomment when needed in subgraph
//     // event TribunaSafeRegistered(address strategy, address arbitrator, address tribunalSafe);
//     event ProposalCancelled(uint256 proposalId);
//     event ArbitrableConfigUpdated(
//         uint256 currentArbitrableConfigVersion,
//         IArbitrator arbitrator,
//         address tribunalSafe,
//         uint256 submitterCollateralAmount,
//         uint256 challengerCollateralAmount,
//         uint256 defaultRuling,
//         uint256 defaultRulingTimeout
//     );
//     event AllowlistMembersRemoved(uint256 poolId, address[] members);
//     event AllowlistMembersAdded(uint256 poolId, address[] members);
//     event SybilScorerUpdated(address sybilScorer);
//     // event Logger(string message, uint256 value);

//     /*|-------------------------------------/-------|*o
//     /*|              STRUCTS/ENUMS                 |*/
//     /*|--------------------------------------------|*/

//     /*|--------------------------------------------|*/
//     /*|                VARIABLES                   |*/
//     /*|--------------------------------------------|*/

//     using ConvictionsUtils for uint256;

//     // Constants for fixed numbers
//     // string public constant VERSION = "0.0";
//     // uint256 internal constant TWO_64 = 0x10000000000000000; // 2**64 // GOSS: Unsused
//     // uint256 public constant MAX_STAKED_PROPOSALS = 10; // GOSS: Unsuded
//     uint256 public constant RULING_OPTIONS = 3;
//     uint256 public constant DISPUTE_COOLDOWN_SEC = 2 hours;

//     address internal collateralVaultTemplate;

//     // uint256 variables packed together
//     uint256 internal surpressStateMutabilityWarning; // used to suppress Solidity warnings
//     uint256 public cloneNonce;
//     uint64 public disputeCount;
//     uint256 public proposalCounter;
//     uint256 public currentArbitrableConfigVersion;

//     uint256 public totalStaked;
//     uint256 public totalPointsActivated;

//     CVParams public cvParams;

//     // Enum for handling proposal types
//     ProposalType public proposalType;

//     // Struct variables for complex data structures
//     PointSystem public pointSystem;
//     PointSystemConfig public pointConfig;

//     // Contract reference
//     RegistryCommunityV0_0 public registryCommunity;

//     ICollateralVault public collateralVault;
//     ISybilScorer public sybilScorer;

//     // Mappings to handle relationships and staking details
//     mapping(uint256 => Proposal) public proposals; // Mapping of proposal IDs to Proposal structures
//     mapping(address => uint256) public totalVoterStakePct; // voter -> total staked points
//     mapping(address => uint256[]) public voterStakedProposals; // voter -> proposal ids arrays
//     mapping(uint256 => uint256) public disputeIdToProposalId;
//     mapping(uint256 => ArbitrableConfig) public arbitrableConfigs;

//     ISuperToken superfluidToken;

//     /*|--------------------------------------------|*/
//     /*|              CONSTRUCTORS                  |*/
//     /*|--------------------------------------------|*/
//     // constructor(address _allo) BaseStrategy(address(_allo), "CVStrategy") {}
//     function init(address _allo, address _collateralVaultTemplate, address _owner) external initializer {
//         super.init(_allo, "CVStrategy", _owner);
//         collateralVaultTemplate = _collateralVaultTemplate;
//     }

//     function initialize(uint256 _poolId, bytes memory _data) external override  {
//         _checkOnlyAllo();
//         __BaseStrategy_init(_poolId);

//         collateralVault = ICollateralVault(Clone.createClone(collateralVaultTemplate, cloneNonce++));
//         collateralVault.initialize();

//         CVStrategyInitializeParamsV0_1 memory ip = abi.decode(_data, (CVStrategyInitializeParamsV0_1));

//         // if (ip.registryCommunity == address(0)) {
//         //     revert RegistryCannotBeZero();
//         // }
//         // Set councilsafe to whitelist admin
//         registryCommunity = RegistryCommunityV0_0(ip.registryCommunity);

//         proposalType = ip.proposalType;
//         pointSystem = ip.pointSystem;
//         pointConfig = ip.pointConfig;
//         sybilScorer = ISybilScorer(ip.sybilScorer);

//         emit InitializedCV2(_poolId, ip);

//         _setPoolParams(ip.arbitrableConfig, ip.cvParams, new address[](0), new address[](0), address(0)); // TODO: Consider passing superfluidToken at initialization
//         if (address(sybilScorer) != address(0x0)) {
//             _registerToSybilScorer(ip.sybilScorerThreshold);
//         }
//     }

//     // TODO: uncomment when contract size fixed with diamond
//     // function supportsInterface(bytes4 interfaceId) public view  override(ERC165) returns (bool) {
//     //     return interfaceId == type(IPointStrategy).interfaceId || super.supportsInterface(interfaceId);
//     // }

//     /*|--------------------------------------------|*/
//     /*|                 MODIFIERS                  |*/
//     /*|--------------------------------------------|*/
//     function checkSenderIsMember(address _sender) internal view {
//         // if (_sender == address(0)) {
//         //     revert UserCannotBeZero();
//         // }
//         // if (address(registryCommunity) == address(0)) {
//         //     revert RegistryCannotBeZero();
//         // }
//         if (!registryCommunity.isMember(_sender)) {
//             // revert UserNotInRegistry();
//             revert(); // @todo take commented when contract size fixed with diamond
//         }
//         // _;
//     }

//     function onlyRegistryCommunity() internal view {
//         if (msg.sender != address(registryCommunity)) {
//             // revert OnlyCommunityAllowed();
//             revert(); // @todo take commented when contract size fixed with diamond
//         }
//     }

//     // TODO: Uncomment when contract size fixed with diamond
//     // function _revertZeroAddress(address _address) internal pure  {
//     //     if (_address == address(0)) revert AddressCannotBeZero();
//     // }

//     function onlyCouncilSafe() internal view {
//         if (msg.sender != address(registryCommunity.councilSafe()) && msg.sender != owner()) {
//             // revert OnlyCouncilSafe();
//             revert(); // @todo take commented when contract size fixed with diamond
//         }
//     }

//     function _canExecuteAction(address _user) internal view returns (bool) {
//         if (address(sybilScorer) == address(0)) {
//             bytes32 allowlistRole = keccak256(abi.encodePacked("ALLOWLIST", poolId));
//             if (registryCommunity.hasRole(allowlistRole, address(0))) {
//                 return true;
//             } else {
//                 return registryCommunity.hasRole(allowlistRole, _user);
//             }
//         }
//         return sybilScorer.canExecuteAction(_user, address(this));
//     }

//     function _checkProposalAllocationValidity(uint256 _proposalId, int256 deltaSupport) internal view {
//         Proposal storage p = proposals[_proposalId];
//         if (
//             deltaSupport > 0
//                 && (
//                     p.proposalStatus == ProposalStatus.Inactive || p.proposalStatus == ProposalStatus.Cancelled
//                         || p.proposalStatus == ProposalStatus.Executed || p.proposalStatus == ProposalStatus.Rejected
//                 )
//         ) {
//             // revert ProposalInvalidForAllocation(_proposalId, p.proposalStatus);
//             revert(); // @todo take commented when contract size fixed with diamond
//         }
//     }

//     function setCollateralVaultTemplate(address template) external onlyOwner {
//         collateralVaultTemplate = template;
//     }

//     // this is called via allo.sol to register recipients
//     // it can change their status all the way to Accepted, or to Pending if there are more steps
//     // if there are more steps, additional functions should be added to allow the owner to check
//     // this could also check attestations directly and then Accept

//     function registerRecipient(bytes memory _data, address _sender)
//       payable
//       external
//      returns (address) {
//         _checkOnlyAllo();
//         _checkOnlyInitialized();
//         checkSenderIsMember(_sender);
//         registryCommunity.onlyStrategyEnabled(address(this));
//         // surpressStateMutabilityWarning++;
//         _data;
//         CreateProposal memory proposal = abi.decode(_data, (CreateProposal));
//         // console.log("proposalType", uint256(proposalType));
//         if (proposalType == ProposalType.Funding) {
//             // _revertZeroAddress(proposal.beneficiary);
//             //We want != instead of == no ?
//             // require(proposal.beneficiary != address(0)); // TODO: Take commented when contract size fixed with diamond
//             // getAllo().getPool(poolId).token;
//             // if (proposal.requestedToken == address(0)) {
//             //     revert TokenCannotBeZero();
//             // }
//             IAllo _allo = this.getAllo();
//             if (proposal.requestedToken != _allo.getPool(proposal.poolId).token) {
//                 // console.log("::requestedToken", proposal.requestedToken);
//                 // console.log("::PookToken", poolToken);
//                 // revert TokenNotAllowed();
//                 // revert(("TokenNotAllowed")); // @todo take commented when contract size fixed with diamond
//                 revert(); // @todo take commented when contract size fixed with diamond
//             }
//             if (_isOverMaxRatio(proposal.amountRequested)) {
//                 // revert AmountOverMaxRatio();
//                 // revert(("AmountOverMaxRatio")); // @todo take commented when contract size fixed with diamond
//                 revert();
//             }
//         }

//         if (
//             address(arbitrableConfigs[currentArbitrableConfigVersion].arbitrator) != address(0)
//                 && msg.value < arbitrableConfigs[currentArbitrableConfigVersion].submitterCollateralAmount
//         ) {
//             // revert InsufficientCollateral(
//             //     msg.value, arbitrableConfigs[currentArbitrableConfigVersion].submitterCollateralAmount
//             // );
//             // revert(("InsufficientCollateral")); // @todo take commented when contract size fixed with diamond
//             revert();
//         }

//         uint256 proposalId = ++proposalCounter;
//         Proposal storage p = proposals[proposalId];

//         p.proposalId = proposalId;
//         p.submitter = _sender;
//         p.beneficiary = proposal.beneficiary;
//         p.requestedToken = proposal.requestedToken;
//         p.requestedAmount = proposal.amountRequested;
//         // p.proposalType = proposal.proposalType;
//         p.proposalStatus = ProposalStatus.Active;
//         p.blockLast = block.number;
//         p.convictionLast = 0;
//         // p.agreementActionId = 0;
//         p.metadata = proposal.metadata;
//         p.arbitrableConfigVersion = currentArbitrableConfigVersion;
//         collateralVault.depositCollateral{value: msg.value}(proposalId, p.submitter);

//         emit ProposalCreated(poolId, proposalId);
//         // console.log("Gaz left: ", gasleft());
//         return address(uint160(proposalId));
//     }

//     function activatePoints() external {
//         if (!_canExecuteAction(msg.sender)) {
//             // revert UserCannotExecuteAction();
//             // revert(("UserCannotExecuteAction")); // @todo take commented when contract size fixed with diamond
//             revert();
//         }
//         registryCommunity.activateMemberInStrategy(msg.sender, address(this));
//         totalPointsActivated += registryCommunity.getMemberPowerInStrategy(msg.sender, address(this));
//     }

//     function deactivatePoints() external {
//         _deactivatePoints(msg.sender);
//     }

//     function deactivatePoints(address _member) external {
//         onlyRegistryCommunity();
//         _deactivatePoints(_member);
//     }

//     function _deactivatePoints(address _member) internal {
//         totalPointsActivated -= registryCommunity.getMemberPowerInStrategy(_member, address(this));
//         registryCommunity.deactivateMemberInStrategy(_member, address(this));
//         // remove support from all proposals
//         withdraw(_member);
//         emit PointsDeactivated(_member);
//     }

//     function increasePower(address _member, uint256 _amountToStake) external returns (uint256) {
//         //requireMemberActivatedInStrategies
//         onlyRegistryCommunity();
//         if (!_canExecuteAction(_member)) {
//             // revert UserCannotExecuteAction();
//             // revert(("UserCannotExecuteAction")); // @todo take commented when contract size fixed with diamond
//             revert();
//         }
//         uint256 pointsToIncrease = 0;
//         if (pointSystem == PointSystem.Unlimited) {
//             pointsToIncrease = _amountToStake; // from increasePowerUnlimited(_amountToUnstake)
//         } else if (pointSystem == PointSystem.Capped) {
//             pointsToIncrease = increasePowerCapped(_member, _amountToStake);
//         } else if (pointSystem == PointSystem.Quadratic) {
//             pointsToIncrease = increasePowerQuadratic(_member, _amountToStake);
//         }
//         bool isActivated = registryCommunity.memberActivatedInStrategies(_member, address(this));
//         if (isActivated) {
//             totalPointsActivated += pointsToIncrease;
//         }
//         emit PowerIncreased(_member, _amountToStake, pointsToIncrease);
//         return pointsToIncrease;
//     }

//     function decreasePower(address _member, uint256 _amountToUnstake) external returns (uint256) {
//         onlyRegistryCommunity();
//         //requireMemberActivatedInStrategies

//         uint256 pointsToDecrease = 0;
//         if (pointSystem == PointSystem.Unlimited) {
//             pointsToDecrease = _amountToUnstake;
//         } else if (pointSystem == PointSystem.Quadratic) {
//             pointsToDecrease = decreasePowerQuadratic(_member, _amountToUnstake);
//         } else if (pointSystem == PointSystem.Capped) {
//             if (registryCommunity.getMemberPowerInStrategy(_member, address(this)) < pointConfig.maxAmount) {
//                 pointsToDecrease = _amountToUnstake;
//             } else if (registryCommunity.getMemberStakedAmount(_member) - _amountToUnstake < pointConfig.maxAmount) {
//                 pointsToDecrease =
//                     pointConfig.maxAmount - (registryCommunity.getMemberStakedAmount(_member) - _amountToUnstake);
//             }
//         }
//         uint256 voterStake = totalVoterStakePct[_member];
//         uint256 unusedPower = registryCommunity.getMemberPowerInStrategy(_member, address(this)) - voterStake;
//         if (unusedPower < pointsToDecrease) {
//             uint256 balancingRatio = ((pointsToDecrease - unusedPower) << 128) / voterStake;
//             for (uint256 i = 0; i < voterStakedProposals[_member].length; i++) {
//                 uint256 proposalId = voterStakedProposals[_member][i];
//                 Proposal storage proposal = proposals[proposalId];
//                 uint256 stakedPoints = proposal.voterStakedPoints[_member];
//                 uint256 newStakedPoints;
//                 newStakedPoints = stakedPoints - ((stakedPoints * balancingRatio + (1 << 127)) >> 128);
//                 uint256 oldStake = proposal.stakedAmount;
//                 proposal.stakedAmount -= stakedPoints - newStakedPoints;
//                 proposal.voterStakedPoints[_member] = newStakedPoints;
//                 totalStaked -= stakedPoints - newStakedPoints;
//                 totalVoterStakePct[_member] -= stakedPoints - newStakedPoints;
//                 _calculateAndSetConviction(proposal, oldStake);
//                 emit SupportAdded(_member, proposalId, newStakedPoints, proposal.stakedAmount, proposal.convictionLast);
//             }
//         }
//         totalPointsActivated -= pointsToDecrease;
//         emit PowerDecreased(_member, _amountToUnstake, pointsToDecrease);

//         return pointsToDecrease;
//     }

//     function increasePowerCapped(address _member, uint256 _amountToStake) internal view returns (uint256) {
//         // console.log("POINTS TO INCREASE", _amountToStake);
//         uint256 memberPower = registryCommunity.getMemberPowerInStrategy(_member, address(this));
//         // console.log("MEMBERPOWER", memberPower);
//         if (memberPower + _amountToStake > pointConfig.maxAmount) {
//             _amountToStake = pointConfig.maxAmount - memberPower;
//         }
//         // console.log("POINTS TO INCREASE END", _amountToStake);

//         return _amountToStake;
//     }

//     function increasePowerQuadratic(address _member, uint256 _amountToStake) internal view returns (uint256) {
//         uint256 totalStake = registryCommunity.getMemberStakedAmount(_member) + _amountToStake;

//         uint256 decimal = 18;
//         try ERC20(address(registryCommunity.gardenToken())).decimals() returns (uint8 _decimal) {
//             decimal = uint256(_decimal);
//         } catch {
//             // console.log("Error getting decimal");
//         }
//         uint256 newTotalPoints = Math.sqrt(totalStake * 10 ** decimal);
//         uint256 currentPoints = registryCommunity.getMemberPowerInStrategy(_member, address(this));

//         uint256 pointsToIncrease = newTotalPoints - currentPoints;

//         return pointsToIncrease;
//     }

//     function decreasePowerQuadratic(address _member, uint256 _amountToUnstake) public view returns (uint256) {
//         uint256 decimal = 18;
//         try ERC20(address(registryCommunity.gardenToken())).decimals() returns (uint8 _decimal) {
//             decimal = uint256(_decimal);
//         } catch {
//             // console.log("Error getting decimal");
//         }
//         // console.log("_amountToUnstake", _amountToUnstake);
//         uint256 newTotalStake = registryCommunity.getMemberStakedAmount(_member) - _amountToUnstake;
//         // console.log("newTotalStake", newTotalStake);
//         uint256 newTotalPoints = Math.sqrt(newTotalStake * 10 ** decimal);
//         uint256 pointsToDecrease = registryCommunity.getMemberPowerInStrategy(_member, address(this)) - newTotalPoints;
//         return pointsToDecrease;
//     }

//     // Goss: Commented because both accessible by the public field
//     // function getMaxAmount() public view  returns (uint256) {
//     //     return pointConfig.maxAmount;
//     // }

//     function getPointSystem() public view returns (PointSystem) {
//         return pointSystem;
//     }

//     // [[[proposalId, delta],[proposalId, delta]]]
//     // layout.txs -> // console.log(data)
//     // data = bytes
//     // function supportProposal(ProposalSupport[] memory) public pure {
//     //     // // surpressStateMutabilityWarning++;
//     //     revert NotImplemented();
//     //     // allo().allocate(poolId, abi.encode(proposalId));
//     // }

//     function allocate(bytes memory _data, address _sender) external payable {
//       _checkOnlyAllo();
//       _checkOnlyAllo();

//         ProposalSupport[] memory pv = abi.decode(_data, (ProposalSupport[]));
//         for (uint256 i = 0; i < pv.length; i++) {
//             _checkProposalAllocationValidity(pv[i].proposalId, pv[i].deltaSupport);
//         }
//         checkSenderIsMember(_sender);
//         if (!_canExecuteAction(_sender)) {
//             for (uint256 i = 0; i < pv.length; i++) {
//                 if (pv[i].deltaSupport > 0) {
//                     // revert UserCannotExecuteAction();
//                     // revert(("UserCannotExecuteAction")); // @todo take commented when contract size fixed with diamond
//                     revert();
//                 }
//             }
//         }
//         if (!registryCommunity.memberActivatedInStrategies(_sender, address(this))) {
//             // revert UserIsInactive();
//             // revert(("UserIsInactive")); // @todo take commented when contract size fixed with diamond
//             revert();
//         }
//         int256 deltaSupportSum = 0;
//         bool canAddSupport = _canExecuteAction(_sender);
//         for (uint256 i = 0; i < pv.length; i++) {
//             // check if pv index i exist
//             if (!canAddSupport && pv[i].deltaSupport > 0) {
//                 // revert UserCannotExecuteAction();
//                 // revert(("UserCannotExecuteAction")); // @todo take commented when contract size fixed with diamond
//                 revert();
//             }
//             if (pv[i].proposalId == 0) {
//                 //@todo: check better way to do that.
//                 // console.log("proposalId == 0");
//                 continue;
//             }
//             uint256 proposalId = pv[i].proposalId;
//             if (!proposalExists(proposalId)) {
//                 // revert ProposalNotInList(proposalId);
//                 // revert(("ProposalNotInList")); // @todo take commented when contract size fixed with diamond
//                 revert();
//             }
//             deltaSupportSum += pv[i].deltaSupport;
//         }
//         // console.log("deltaSupportSum");
//         // console.logInt(deltaSupportSum);
//         uint256 newTotalVotingSupport = _applyDelta(totalVoterStakePct[_sender], deltaSupportSum);
//         // console.log("newTotalVotingSupport", newTotalVotingSupport);
//         uint256 participantBalance = registryCommunity.getMemberPowerInStrategy(_sender, address(this));

//         // console.log("participantBalance", participantBalance);
//         // Check that the sum of support is not greater than the participant balance
//         // console.log("newTotalVotingSupport", newTotalVotingSupport);
//         // console.log("participantBalance", participantBalance);
//         if (newTotalVotingSupport > participantBalance) {
//             // revert NotEnoughPointsToSupport(newTotalVotingSupport, participantBalance);
//             // revert(("NotEnoughPointsToSupport")); // @todo take commented when contract size fixed with diamond
//             revert();
//         }

//         totalVoterStakePct[_sender] = newTotalVotingSupport;
//         uint256[] memory proposalsIds;
//         for (uint256 i = 0; i < pv.length; i++) {
//             uint256 proposalId = pv[i].proposalId;
//             // add proposalid to the list if not exist
//             if (proposalsIds.length == 0) {
//                 proposalsIds = new uint256[](1);
//                 proposalsIds[0] = proposalId; // 0 => 1
//             } else {
//                 bool exist = false;
//                 for (uint256 j = 0; j < proposalsIds.length; j++) {
//                     // 1
//                     if (proposalsIds[j] == proposalId) {
//                         exist = true;
//                         // revert ProposalSupportDuplicated(proposalId, j);
//                         break; // TODO: Uncommented when contract size fixed with diamond
//                     }
//                 }
//                 if (!exist) {
//                     uint256[] memory temp = new uint256[](proposalsIds.length + 1);
//                     for (uint256 j = 0; j < proposalsIds.length; j++) {
//                         temp[j] = proposalsIds[j];
//                     }
//                     temp[proposalsIds.length] = proposalId;
//                     proposalsIds = temp;
//                 }
//             }
//             int256 delta = pv[i].deltaSupport;

//             Proposal storage proposal = proposals[proposalId];

//             // uint256 beforeStakedPointsPct = proposal.voterStakedPointsPct[_sender];
//             uint256 previousStakedAmount = proposal.stakedAmount;

//             uint256 previousStakedPoints = proposal.voterStakedPoints[_sender];
//             // console.log("beforeStakedPointsPct", beforeStakedPointsPct);
//             // console.log("previousStakedAmount:      %s", previousStakedAmount);

//             uint256 stakedPoints = _applyDelta(previousStakedPoints, delta);

//             // console.log("proposalID", proposalId);
//             // console.log("stakedPointsPct%", stakedPointsPct);

//             proposal.voterStakedPoints[_sender] = stakedPoints;
//             // console.log("proposal.voterStakedPoints[_sender]", proposal.voterStakedPoints[_sender]);

//             // console.log("_sender", _sender);
//             // uint2stakedPointsunt = stakedPoints;
//             // console.log("stakedAmount", stakedAmount);
//             // proposal.voterStake[_sender]stakedPointsunt;

//             bool hasProposal = false;
//             for (uint256 k = 0; k < voterStakedProposals[_sender].length; k++) {
//                 if (voterStakedProposals[_sender][k] == proposal.proposalId) {
//                     hasProposal = true;
//                     break;
//                 }
//             }
//             if (!hasProposal) {
//                 voterStakedProposals[_sender].push(proposal.proposalId);
//             }
//             // proposal.stakedAmount += stakedAmount;
//             // uint256 diff =_diffStakedTokens(previousStakedAmount, stakedAmount);
//             if (previousStakedPoints <= stakedPoints) {
//                 totalStaked += stakedPoints - previousStakedPoints;
//                 proposal.stakedAmount += stakedPoints - previousStakedPoints;
//             } else {
//                 totalStaked -= previousStakedPoints - stakedPoints;
//                 proposal.stakedAmount -= previousStakedPoints - stakedPoints;
//             }
//             if (proposal.blockLast == 0) {
//                 proposal.blockLast = block.number;
//             } else {
//                 // _calculateAndSetConviction(proposal, previousStakedPoints);
//                 _calculateAndSetConviction(proposal, previousStakedAmount);
//                 emit SupportAdded(_sender, proposalId, stakedPoints, proposal.stakedAmount, proposal.convictionLast);
//             }
//             // console.log("proposal.stakedAmount", proposal.stakedAmount);
//         }
//     }

//     function distribute(address[] memory _recipientIds, bytes memory _data, address _sender)
//         external
//         override
//     {
//       _checkOnlyAllo();
//       _checkOnlyInitialized();
//         // surpressStateMutabilityWarning++;
//         if (_data.length <= 0) {
//             // revert ProposalDataIsEmpty();
//             // revert(("ProposalDataIsEmpty")); // @todo take commented when contract size fixed with diamond
//             revert();
//         }

//         if (getPoolAmount() <= 0) {
//             // revert PoolIsEmpty();
//             // revert(("PoolIsEmpty")); // @todo take commented when contract size fixed with diamond
//             revert();
//         }

//         uint256 proposalId = abi.decode(_data, (uint256));

//         // Unwrap supertoken if needed
//         if (address(superfluidToken) != address(0)) {
//             if (
//                 ERC20(proposals[proposalId].requestedToken).balanceOf(address(this))
//                     < proposals[proposalId].requestedAmount
//             ) {
//                 superfluidToken.downgrade(superfluidToken.balanceOf(address(this))); // Unwrap all available
//             }
//         }

//         if (proposalType == ProposalType.Funding) {
//             if (proposals[proposalId].proposalId != proposalId && proposalId != 0) {
//                 // @todo take commented when contract size fixed with diamond
//                 //  revert ProposalNotInList(proposalId);
//                 // revert(("ProposalNotInList"));
//                 revert();
//             }

//             if (proposals[proposalId].proposalStatus != ProposalStatus.Active) {
//                 // revert ProposalNotActive(proposalId);
//                 // revert(("ProposalNotActive")); // @todo take commented when contract size fixed with diamond
//                 revert();
//             }

//             if (proposals[proposalId].requestedAmount > getPoolAmount()) {
//                 // revert PoolAmountNotEnough(proposalId, proposals[proposalId].requestedAmount, poolAmount);
//                 // revert(("PoolAmountNotEnough")); // @todo take commented when contract size fixed with diamond
//                 revert();
//             }

//             if (_isOverMaxRatio(proposals[proposalId].requestedAmount)) {
//                 // revert AmountOverMaxRatio();
//                 // revert(("AmountOverMaxRatio")); // @todo take commented when contract size fixed with diamond
//                 revert();
//             }

//             uint256 convictionLast = updateProposalConviction(proposalId);

//             uint256 threshold = ConvictionsUtils.calculateThreshold(
//                 proposals[proposalId].requestedAmount,
//                 getPoolAmount(),
//                 totalPointsActivated,
//                 cvParams.decay,
//                 cvParams.weight,
//                 cvParams.maxRatio,
//                 cvParams.minThresholdPoints
//             );

//             // <= for when threshold being zero
//             if (convictionLast <= threshold && proposals[proposalId].requestedAmount > 0) {
//                 // revert ConvictionUnderMinimumThreshold();
//                 // revert(("ConvictionUnderMinimumThreshold"));
//                 revert();
//             }

//             // Not needed since poolAmount = balanceOf
//             // poolAmount -= proposals[proposalId].requestedAmount; // CEI

//             _transferAmount(
//                 allo.getPool(poolId).token, proposals[proposalId].beneficiary, proposals[proposalId].requestedAmount
//             );

//             proposals[proposalId].proposalStatus = ProposalStatus.Executed;
//             collateralVault.withdrawCollateral(
//                 proposalId,
//                 proposals[proposalId].submitter,
//                 arbitrableConfigs[currentArbitrableConfigVersion].submitterCollateralAmount
//             );

//             emit Distributed(proposalId, proposals[proposalId].beneficiary, proposals[proposalId].requestedAmount);
//         } //signaling do nothing @todo write tests @todo add end date
//     }

//     // GOSS: NEVER CALLED
//     // function canExecuteProposal(uint256 proposalId) public view  returns (bool canBeExecuted) {
//     //     Proposal storage proposal = proposals[proposalId];

//     //     // uint256 convictionLast = updateProposalConviction(proposalId);
//     //     (uint256 convictionLast, uint256 blockNumber) =
//     //         _checkBlockAndCalculateConviction(proposal, proposal.stakedAmount);

//     //     if (convictionLast == 0 && blockNumber == 0) {
//     //         convictionLast = proposal.convictionLast;
//     //     }
//     //     uint256 threshold = calculateThreshold(proposal.requestedAmount);

//     //     // console.log("convictionLast", convictionLast);
//     //     // console.log("threshold", threshold);
//     //     canBeExecuted = convictionLast >= threshold;
//     // }

//     // function getPayouts(address[] memory, bytes[] memory) external pure override returns (PayoutSummary[] memory) {
//     //     // surpressStateMutabilityWarning
//     //     // PayoutSummary[] memory payouts = new PayoutSummary[](0);
//     //     // return payouts;
//     //     // revert NotImplemented();
//     //     revert();
//     // }

//     // function _getPayout(address _recipientId, bytes memory _data)
//     //     internal
//     //     pure
//     //     returns (PayoutSummary memory)
//     // {
//     //     // surpressStateMutabilityWarning;
//     //     // _data;
//     //     // return PayoutSummary(_recipientId, 0);
//     // }

//     // function _afterIncreasePoolAmount(uint256 _amount) internal {
//     //     emit PoolAmountIncreased(_amount);
//     // }

//     // simply returns whether a allocator is valid or not, will usually be true for all

//     // function _isValidAllocator(address _allocator) internal pure override returns (bool) {
//     //     // surpressStateMutabilityWarning;
//     // }

//     function setPoolActive(bool _active) external {
//         _setPoolActive(_active);
//     }

//     function withdraw(address _member) internal {
//         // remove all proposals from the member
//         for (uint256 i = 0; i < voterStakedProposals[_member].length; i++) {
//             uint256 proposalId = voterStakedProposals[_member][i];
//             Proposal storage proposal = proposals[proposalId];
//             if (proposalExists(proposalId)) {
//                 uint256 stakedPoints = proposal.voterStakedPoints[_member];
//                 proposal.voterStakedPoints[_member] = 0;
//                 proposal.stakedAmount -= stakedPoints;
//                 totalStaked -= stakedPoints;
//                 _calculateAndSetConviction(proposal, stakedPoints);
//                 emit SupportAdded(_member, proposalId, 0, proposal.stakedAmount, proposal.convictionLast);
//             }
//         }
//         totalVoterStakePct[_member] = 0;
//     }

//     /**
//      * @dev Get proposal details
//      * @param _proposalId Proposal id
//      * @return submitter Proposal submitter
//      * @return beneficiary Proposal beneficiary
//      * @return requestedToken Proposal requested token
//      * @return requestedAmount Proposal requested amount
//      * @return stakedAmount Proposal staked points
//      * @return proposalStatus Proposal status
//      * @return blockLast Last block when conviction was calculated
//      * @return convictionLast Last conviction calculated
//      * @return threshold Proposal threshold
//      * @return voterStakedPoints Voter staked points
//      * @return arbitrableConfigVersion Proposal arbitrable config id
//      */
//     function getProposal(uint256 _proposalId)
//         external
//         view
//         returns (
//             address submitter,
//             address beneficiary,
//             address requestedToken,
//             uint256 requestedAmount,
//             uint256 stakedAmount,
//             ProposalStatus proposalStatus,
//             uint256 blockLast,
//             uint256 convictionLast,
//             uint256 threshold,
//             uint256 voterStakedPoints,
//             uint256 arbitrableConfigVersion,
//             uint256 protocol
//         )
//     {
//         Proposal storage proposal = proposals[_proposalId];

//         threshold = proposal.requestedAmount == 0
//             ? 0
//             : ConvictionsUtils.calculateThreshold(
//                 proposal.requestedAmount,
//                 getPoolAmount(),
//                 totalPointsActivated,
//                 cvParams.decay,
//                 cvParams.weight,
//                 cvParams.maxRatio,
//                 cvParams.minThresholdPoints
//             );
//         return (
//             proposal.submitter,
//             proposal.beneficiary,
//             proposal.requestedToken,
//             proposal.requestedAmount,
//             proposal.stakedAmount,
//             proposal.proposalStatus,
//             proposal.blockLast,
//             proposal.convictionLast,
//             threshold,
//             proposal.voterStakedPoints[msg.sender],
//             proposal.arbitrableConfigVersion,
//             proposal.metadata.protocol
//         );
//     }

//     // Goss: Commented because accessible through public fields
//     // function getMetadata(uint256 _proposalId) external view  returns (Metadata memory) {
//     //     Proposal storage proposal = proposals[_proposalId];
//     //     return proposal.metadata;
//     // }

//     /**
//      * @notice Get stake of voter `_voter` on proposal #`_proposalId`
//      * @param _proposalId Proposal id
//      * @param _voter Voter address
//      * @return Proposal voter stake
//      */
//     function getProposalVoterStake(uint256 _proposalId, address _voter) external view returns (uint256) {
//         return _internal_getProposalVoterStake(_proposalId, _voter);
//     }

//     // TODO :Goss: Commented because accessible through public fields
//     function getProposalStakedAmount(uint256 _proposalId) external view returns (uint256) {
//         return proposals[_proposalId].stakedAmount;
//     }
//     //    do a internal function to get the total voter stake

//     // Goss: Commented because accessible through public fields
//     // function getTotalVoterStakePct(address _voter) public view  returns (uint256) {
//     //     return totalVoterStakePct[_voter];
//     // }

//     // Goss: Commented because accessible through public fields
//     function getArbitrableConfig()
//         external
//         view
//         returns (
//             IArbitrator arbitrator,
//             address tribunalSafe,
//             uint256 submitterCollateralAmount,
//             uint256 challengerCollateralAmount,
//             uint256 defaultRuling,
//             uint256 defaultRulingTimeout
//         )
//     {
//         return (
//             arbitrableConfigs[currentArbitrableConfigVersion].arbitrator,
//             arbitrableConfigs[currentArbitrableConfigVersion].tribunalSafe,
//             arbitrableConfigs[currentArbitrableConfigVersion].submitterCollateralAmount,
//             arbitrableConfigs[currentArbitrableConfigVersion].challengerCollateralAmount,
//             arbitrableConfigs[currentArbitrableConfigVersion].defaultRuling,
//             arbitrableConfigs[currentArbitrableConfigVersion].defaultRulingTimeout
//         );
//     }

//     function _internal_getProposalVoterStake(uint256 _proposalId, address _voter) internal view returns (uint256) {
//         return proposals[_proposalId].voterStakedPoints[_voter];
//     }

//     function getBasisStakedAmount() internal view returns (uint256) {
//         return registryCommunity.getBasisStakedAmount(); // 50 HNY = 100%
//     }

//     function proposalExists(uint256 _proposalID) internal view returns (bool) {
//         return proposals[_proposalID].proposalId > 0 && proposals[_proposalID].submitter != address(0);
//     }

//     function _isOverMaxRatio(uint256 _requestedAmount) internal view returns (bool isOverMaxRatio) {
//         isOverMaxRatio = cvParams.maxRatio * getPoolAmount() <= _requestedAmount * ConvictionsUtils.D;
//     }

//     function _applyDelta(uint256 _support, int256 _delta) internal pure returns (uint256) {
//         int256 result = int256(_support) + _delta;

//         if (result < 0) {
//             // revert SupportUnderflow(_support, _delta, result);
//             // revert(("SupportUnderflow")); // @todo take commented when contract size fixed with diamond
//             revert();
//         }
//         return uint256(result);
//     }

//     function calculateProposalConviction(uint256 _proposalId) public view returns (uint256) {
//         Proposal storage proposal = proposals[_proposalId];
//         return ConvictionsUtils.calculateConviction(
//             block.number - proposal.blockLast, proposal.convictionLast, proposal.stakedAmount, cvParams.decay
//         );
//     }

//     function calculateThreshold(uint256 _requestedAmount) external view returns (uint256) {
//         if (_isOverMaxRatio(_requestedAmount)) {
//             // revert AmountOverMaxRatio();
//             // revert(("AmountOverMaxRatio")); // @todo take commented when contract size fixed with diamond
//             revert();
//         }
//         return ConvictionsUtils.calculateThreshold(
//             _requestedAmount,
//             getPoolAmount(),
//             totalPointsActivated,
//             cvParams.decay,
//             cvParams.weight,
//             cvParams.maxRatio,
//             cvParams.minThresholdPoints
//         );
//     }

//     // TODO: Goss commented because totalPointsActivated is public
//     // function totalEffectiveActivePoints public view  returns (uint256) {
//     //     return totalPointsActivated;
//     // }

//     /**
//      * @dev Calculate conviction and store it on the proposal
//      * @param _proposal Proposal
//      * @param _oldStaked Amount of tokens staked on a proposal until now
//      */
//     function _calculateAndSetConviction(Proposal storage _proposal, uint256 _oldStaked) internal {
//         (uint256 conviction, uint256 blockNumber) = _checkBlockAndCalculateConviction(_proposal, _oldStaked);
//         if (conviction == 0 && blockNumber == 0) {
//             return;
//         }
//         _proposal.blockLast = blockNumber;
//         _proposal.convictionLast = conviction;
//         // emit Logger("Conviction set", conviction);
//     }

//     function _checkBlockAndCalculateConviction(Proposal storage _proposal, uint256 _oldStaked)
//         internal
//         view
//         returns (uint256 conviction, uint256 blockNumber)
//     {
//         blockNumber = block.number;
//         assert(_proposal.blockLast <= blockNumber);
//         if (_proposal.blockLast == blockNumber) {
//             // console.log("blockNumber == _proposal.blockLast");
//             return (0, 0); // Conviction already stored
//         }
//         // calculateConviction and store it
//         conviction = ConvictionsUtils.calculateConviction(
//             blockNumber - _proposal.blockLast, // we assert it doesn't overflow above
//             _proposal.convictionLast,
//             _oldStaked,
//             cvParams.decay
//         );
//     }

//     function setPoolParams(
//         ArbitrableConfig memory _arbitrableConfig,
//         CVParams memory _cvParams,
//         address _superfluidToken
//     ) external {
//         onlyCouncilSafe();
//         _setPoolParams(_arbitrableConfig, _cvParams, _superfluidToken);
//     }

//     function _setPoolParams(
//         ArbitrableConfig memory _arbitrableConfig,
//         CVParams memory _cvParams,
//         address _superfluidToken
//     ) internal {
//         if (
//             _arbitrableConfig.tribunalSafe != address(0) && address(_arbitrableConfig.arbitrator) != address(0)
//                 && (
//                     _arbitrableConfig.tribunalSafe != arbitrableConfigs[currentArbitrableConfigVersion].tribunalSafe
//                         || _arbitrableConfig.arbitrator != arbitrableConfigs[currentArbitrableConfigVersion].arbitrator
//                         || _arbitrableConfig.submitterCollateralAmount
//                             != arbitrableConfigs[currentArbitrableConfigVersion].submitterCollateralAmount
//                         || _arbitrableConfig.challengerCollateralAmount
//                             != arbitrableConfigs[currentArbitrableConfigVersion].challengerCollateralAmount
//                         || _arbitrableConfig.defaultRuling != arbitrableConfigs[currentArbitrableConfigVersion].defaultRuling
//                         || _arbitrableConfig.defaultRulingTimeout
//                             != arbitrableConfigs[currentArbitrableConfigVersion].defaultRulingTimeout
//                 )
//         ) {
//             if (
//                 arbitrableConfigs[currentArbitrableConfigVersion].tribunalSafe != _arbitrableConfig.tribunalSafe
//                     || arbitrableConfigs[currentArbitrableConfigVersion].arbitrator != _arbitrableConfig.arbitrator
//             ) {
//                 _arbitrableConfig.arbitrator.registerSafe(_arbitrableConfig.tribunalSafe);
//                 // TODO: Restore when needed in subgraph
//                 // emit TribunaSafeRegistered(
//                 //     address(this), address(_arbitrableConfig.arbitrator), _arbitrableConfig.tribunalSafe
//                 // );
//             }

//             currentArbitrableConfigVersion++;
//             arbitrableConfigs[currentArbitrableConfigVersion] = _arbitrableConfig;

//             emit ArbitrableConfigUpdated(
//                 currentArbitrableConfigVersion,
//                 _arbitrableConfig.arbitrator,
//                 _arbitrableConfig.tribunalSafe,
//                 _arbitrableConfig.submitterCollateralAmount,
//                 _arbitrableConfig.challengerCollateralAmount,
//                 _arbitrableConfig.defaultRuling,
//                 _arbitrableConfig.defaultRulingTimeout
//             );
//         }
//         superfluidToken = ISuperToken(_superfluidToken);
//         cvParams = _cvParams;
//         emit CVParamsUpdated(_cvParams);
//     }

//     function updateProposalConviction(uint256 proposalId) public returns (uint256) {
//         Proposal storage proposal = proposals[proposalId];

//         if (proposal.proposalId != proposalId) {
//             // revert ProposalNotInList(proposalId);
//             // revert(("ProposalNotInList")); // @todo take commented when contract size fixed with diamond
//             revert();
//         }

//         // Goss: Remove it to have access to this when disputed or proposal closed (to see the chart)
//         // if (proposal.proposalStatus != ProposalStatus.Active) {
//         //     revert ProposalNotActive(proposalId);
//         // }
//         // console.log("updateProposal: stakedAmount", proposal.stakedAmount);
//         _calculateAndSetConviction(proposal, proposal.stakedAmount);
//         return proposal.convictionLast;
//     }

//     //If we want to keep, we need a func to transfer power mapping (and more) in Registry contract -Kev
//     // function setRegistryCommunity(address _registryCommunity) external onlyPoolManager(msg.sender) {
//     //     registryCommunity = RegistryCommunityV0_0(_registryCommunity);
//     //     emit RegistryUpdated(_registryCommunity);
//     // }

//     function setSybilScorer(address _sybilScorer, uint256 threshold) external {
//         if (msg.sender != address(registryCommunity.councilSafe()) && msg.sender != owner()) {
//             // revert OnlyCouncilSafe();
//             // revert(("OnlyCouncilSafe")); // @todo take commented when contract size fixed with diamond
//             revert();
//         }
//         // _revertZeroAddress(_sybilScorer);
//         if (_sybilScorer == address(0)) {
//             revert(); // TODO: Take commented when contract size fixed with diamond
//         }
//         sybilScorer = ISybilScorer(_sybilScorer);
//         _registerToSybilScorer(threshold);
//         emit SybilScorerUpdated(_sybilScorer);
//     }

//     function _setPoolParams(
//         ArbitrableConfig memory _arbitrableConfig,
//         CVParams memory _cvParams,
//         address[] memory membersToAdd,
//         address[] memory membersToRemove,
//         address _superfluidToken
//     ) internal {
//         _setPoolParams(_arbitrableConfig, _cvParams, _superfluidToken);
//         if (membersToAdd.length > 0) {
//             _addToAllowList(membersToAdd);
//         }
//         if (membersToRemove.length > 0) {
//             _removeFromAllowList(membersToRemove);
//         }
//     }

//     function _setPoolParams(
//         ArbitrableConfig memory _arbitrableConfig,
//         CVParams memory _cvParams,
//         uint256 sybilScoreThreshold,
//         address _superfluidToken
//     ) internal {
//         _setPoolParams(_arbitrableConfig, _cvParams, _superfluidToken);
//         if (address(sybilScorer) != address(0)) {
//             sybilScorer.modifyThreshold(address(this), sybilScoreThreshold);
//         }
//     }

//     function setPoolParams(
//         ArbitrableConfig memory _arbitrableConfig,
//         CVParams memory _cvParams,
//         address[] memory _membersToAdd,
//         address[] memory _membersToRemove,
//         address _superfluidToken
//     ) external {
//         onlyCouncilSafe();
//         _setPoolParams(_arbitrableConfig, _cvParams, _membersToAdd, _membersToRemove, _superfluidToken);
//     }

//     function setPoolParams(
//         ArbitrableConfig memory _arbitrableConfig,
//         CVParams memory _cvParams,
//         uint256 _sybilScoreThreshold,
//         address _superfluidToken
//     ) external {
//         onlyCouncilSafe();
//         _setPoolParams(_arbitrableConfig, _cvParams, _sybilScoreThreshold, _superfluidToken);
//     }

//     function disputeProposal(uint256 proposalId, string calldata context, bytes calldata _extraData)
//         external
//         payable
//         returns (uint256 disputeId)
//     {
//         checkSenderIsMember(msg.sender);
//         Proposal storage proposal = proposals[proposalId];
//         ArbitrableConfig memory arbitrableConfig = arbitrableConfigs[proposal.arbitrableConfigVersion];

//         // if (address(arbitrableConfig.arbitrator) == address(0)) {
//         //     revert ArbitratorCannotBeZero();
//         // }
//         // Goss: Support Collateral Zero
//         // if (address(collateralVault) == address(0)) {
//         //     revert CollateralVaultCannotBeZero();
//         // }
//         // TODO: Uncoment when contract size fixed with diamond
//         // if (proposal.proposalId != proposalId) {
//         //     revert ProposalNotInList(proposalId);
//         // }
//         if (proposal.proposalStatus != ProposalStatus.Active) {
//             // revert ProposalNotActive(proposalId);
//             revert(); // @todo take commented when contract size fixed with diamond
//         }
//         if (msg.value < arbitrableConfig.challengerCollateralAmount) {
//             // revert InsufficientCollateral(msg.value, arbitrableConfig.challengerCollateralAmount);
//             revert(); // @todo take commented when contract size fixed with diamond
//         }

//         // if the lastDisputeCompletion is less than DISPUTE_COOLDOWN_SEC, we should revert
//         if (
//             proposal.lastDisputeCompletion != 0
//                 && proposal.lastDisputeCompletion + DISPUTE_COOLDOWN_SEC > block.timestamp
//         ) {
//             // revert DisputeCooldownNotPassed(
//             //     proposalId, proposal.lastDisputeCompletion + DISPUTE_COOLDOWN_SEC - block.timestamp
//             // );
//             revert(); // @todo take commented when contract size fixed with diamond
//         }

//         uint256 arbitrationFee = msg.value - arbitrableConfig.challengerCollateralAmount;

//         collateralVault.depositCollateral{value: arbitrableConfig.challengerCollateralAmount}(proposalId, msg.sender);

//         disputeId = arbitrableConfig.arbitrator.createDispute{value: arbitrationFee}(RULING_OPTIONS, _extraData);

//         proposal.proposalStatus = ProposalStatus.Disputed;
//         proposal.disputeInfo.disputeId = disputeId;
//         proposal.disputeInfo.disputeTimestamp = block.timestamp;
//         proposal.disputeInfo.challenger = msg.sender;
//         disputeIdToProposalId[disputeId] = proposalId;

//         disputeCount++;

//         emit ProposalDisputed(
//             arbitrableConfig.arbitrator,
//             proposalId,
//             disputeId,
//             msg.sender,
//             context,
//             proposal.disputeInfo.disputeTimestamp
//         );
//     }

//     function rule(uint256 _disputeID, uint256 _ruling) external override {
//         uint256 proposalId = disputeIdToProposalId[_disputeID];
//         Proposal storage proposal = proposals[proposalId];
//         ArbitrableConfig memory arbitrableConfig = arbitrableConfigs[proposal.arbitrableConfigVersion];

//         // if (proposalId == 0) {
//         //     revert ProposalNotInList(proposalId);
//         // }
//         if (proposal.proposalStatus != ProposalStatus.Disputed) {
//             // revert ProposalNotDisputed(proposalId);
//             revert(); // @todo take commented when contract size fixed with diamond
//         }

//         bool isTimeOut = block.timestamp > proposal.disputeInfo.disputeTimestamp + arbitrableConfig.defaultRulingTimeout;

//         if (!isTimeOut && msg.sender != address(arbitrableConfig.arbitrator)) {
//             // revert OnlyArbitrator();
//             revert(); // @todo take commented when contract size fixed with diamond
//         }

//         if (isTimeOut || _ruling == 0) {
//             if (arbitrableConfig.defaultRuling == 0) {
//                 // TODO: Take commented when contract size fixed with diamond
//                 // revert DefaultRulingNotSet();
//                 revert(); // @todo take commented when contract size fixed with diamond
//             }
//             if (arbitrableConfig.defaultRuling == 1) {
//                 proposal.proposalStatus = ProposalStatus.Active;
//             }
//             if (arbitrableConfig.defaultRuling == 2) {
//                 proposal.proposalStatus = ProposalStatus.Rejected;
//                 collateralVault.withdrawCollateral(
//                     proposalId, proposal.submitter, arbitrableConfig.submitterCollateralAmount
//                 );
//             }
//             collateralVault.withdrawCollateral(
//                 proposalId, proposal.disputeInfo.challenger, arbitrableConfig.challengerCollateralAmount
//             );
//         } else if (_ruling == 1) {
//             proposal.proposalStatus = ProposalStatus.Active;
//             collateralVault.withdrawCollateralFor(
//                 proposalId,
//                 proposal.disputeInfo.challenger,
//                 address(registryCommunity.councilSafe()),
//                 arbitrableConfig.challengerCollateralAmount
//             );
//         } else if (_ruling == 2) {
//             proposal.proposalStatus = ProposalStatus.Rejected;
//             collateralVault.withdrawCollateral(
//                 proposalId, proposal.disputeInfo.challenger, arbitrableConfig.challengerCollateralAmount
//             );
//             collateralVault.withdrawCollateralFor(
//                 proposalId,
//                 proposal.submitter,
//                 address(registryCommunity.councilSafe()),
//                 arbitrableConfigs[currentArbitrableConfigVersion].submitterCollateralAmount / 2
//             );
//             collateralVault.withdrawCollateralFor(
//                 proposalId,
//                 proposal.submitter,
//                 proposal.disputeInfo.challenger,
//                 arbitrableConfigs[currentArbitrableConfigVersion].submitterCollateralAmount / 2
//             );
//         }

//         disputeCount--;
//         proposal.lastDisputeCompletion = block.timestamp;
//         emit Ruling(arbitrableConfig.arbitrator, _disputeID, _ruling);
//     }

//     function cancelProposal(uint256 proposalId) external {
//         if (proposals[proposalId].proposalStatus != ProposalStatus.Active) {
//             // revert ProposalNotActive(proposalId);
//             revert(); // @todo take commented when contract size fixed with diamond
//         }

//         if (proposals[proposalId].submitter != msg.sender) {
//             // revert OnlySubmitter(proposals[proposalId].submitter, msg.sender);
//             revert(); // @todo take commented when contract size fixed with diamond
//         }

//         collateralVault.withdrawCollateral(
//             proposalId,
//             proposals[proposalId].submitter,
//             arbitrableConfigs[proposals[proposalId].arbitrableConfigVersion].submitterCollateralAmount
//         );

//         proposals[proposalId].proposalStatus = ProposalStatus.Cancelled;
//         emit ProposalCancelled(proposalId);
//     }

//     function addToAllowList(address[] memory members) public {
//         onlyCouncilSafe();
//         _addToAllowList(members);
//     }

//     function _addToAllowList(address[] memory members) internal {
//         bytes32 allowlistRole = keccak256(abi.encodePacked("ALLOWLIST", poolId));

//         if (registryCommunity.hasRole(allowlistRole, address(0))) {
//             registryCommunity.revokeRole(allowlistRole, address(0));
//         }
//         for (uint256 i = 0; i < members.length; i++) {
//             if (!registryCommunity.hasRole(allowlistRole, members[i])) {
//                 registryCommunity.grantRole(keccak256(abi.encodePacked("ALLOWLIST", poolId)), members[i]);
//             }
//         }

//         emit AllowlistMembersAdded(poolId, members);
//     }

//     function removeFromAllowList(address[] memory members) external {
//         onlyCouncilSafe();
//         _removeFromAllowList(members);
//     }

//     function _removeFromAllowList(address[] memory members) internal {
//         for (uint256 i = 0; i < members.length; i++) {
//             if (registryCommunity.hasRole(keccak256(abi.encodePacked("ALLOWLIST", poolId)), members[i])) {
//                 registryCommunity.revokeRole(keccak256(abi.encodePacked("ALLOWLIST", poolId)), members[i]);
//             }

//             if (members[i] != address(0)) {
//                 _deactivatePoints(members[i]);
//             }
//         }

//         emit AllowlistMembersRemoved(poolId, members);
//     }

//     function _registerToSybilScorer(uint256 threshold) internal {
//         sybilScorer.addStrategy(address(this), threshold, address(registryCommunity.councilSafe()));
//     }

//     /// @notice Getter for the 'poolAmount'.
//     /// @return The balance of the pool
//     function getPoolAmount() public view override returns (uint256) {
//         address token = allo.getPool(poolId).token;

//         if (token == NATIVE) {
//             return address(this).balance;
//         }

//         uint256 superfluidBalance;
//         if (address(superfluidToken) != address(0)) {
//             superfluidBalance = superfluidToken.balanceOf(address(this));
//         }

//         return ERC20(token).balanceOf(address(this)) + superfluidBalance;
//     }

//     uint256[49] private __gap;
// }
