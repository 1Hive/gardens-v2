// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

interface IStreamingLeaderboardFactory {
    function createLeaderboard(
        address beneficiaryAddress,
        string calldata leaderboardName,
        string calldata platformName,
        string calldata platformId
    ) external returns (address leaderboardAddress, address seedMarkeeAddress);
}
