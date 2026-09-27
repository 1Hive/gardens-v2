// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {CommunityBaseFacet, Member} from "../CommunityBaseFacet.sol";
import {CVStrategy} from "../../CVStrategy/CVStrategy.sol";

contract CommunityInvalidStakeMigration is CommunityBaseFacet {
    error AffectedMembersRequired();
    error DuplicateAffectedMember(address member);
    error InvalidExpectedStake(uint256 expected, uint256 actual);
    error NoStakeAccountingToClear(address member);

    event MemberUnregistered(address _member, uint256 _amountReturned);
    event MemberDeactivatedStrategy(address _member, address _strategy);
    event InvalidStakeAccountingCleared(address indexed member, uint256 stakedAmount);
    event InvalidStakeMigrationCompleted(uint256 memberCount, uint256 totalStakedAmount);

    function reinitializeV2RemoveInvalidStakes(address[] calldata affectedMembers, uint256 expectedTotalStakedAmount)
        external
        reinitializer(2)
        onlyOwner
        nonReentrant
    {
        uint256 memberCount = affectedMembers.length;
        if (memberCount == 0) {
            revert AffectedMembersRequired();
        }

        uint256 totalStakedAmount;
        for (uint256 i = 0; i < memberCount; i++) {
            address memberAddress = affectedMembers[i];
            for (uint256 j = 0; j < i; j++) {
                if (affectedMembers[j] == memberAddress) {
                    revert DuplicateAffectedMember(memberAddress);
                }
            }

            Member memory member = addressToMemberInfo[memberAddress];
            address[] memory memberStrategies = strategiesByMember[memberAddress];
            if (!member.isRegistered && member.stakedAmount == 0 && memberStrategies.length == 0) {
                revert NoStakeAccountingToClear(memberAddress);
            }

            totalStakedAmount += member.stakedAmount;

            for (uint256 j = 0; j < memberStrategies.length; j++) {
                address strategy = memberStrategies[j];
                CVStrategy(payable(strategy)).deactivatePoints(memberAddress);
                memberActivatedInStrategies[memberAddress][strategy] = false;
                memberPowerInStrategy[memberAddress][strategy] = 0;
                emit MemberDeactivatedStrategy(memberAddress, strategy);
            }

            delete strategiesByMember[memberAddress];
            delete addressToMemberInfo[memberAddress];
            if (member.isRegistered && totalMembers > 0) {
                totalMembers -= 1;
            }

            emit MemberUnregistered(memberAddress, member.stakedAmount);
            emit InvalidStakeAccountingCleared(memberAddress, member.stakedAmount);
        }

        if (totalStakedAmount != expectedTotalStakedAmount) {
            revert InvalidExpectedStake(expectedTotalStakedAmount, totalStakedAmount);
        }

        emit InvalidStakeMigrationCompleted(memberCount, totalStakedAmount);
    }
}
