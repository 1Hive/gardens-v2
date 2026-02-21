// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {CommunityBaseFacet, Member} from "../CommunityBaseFacet.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IRegistryFactory} from "../../IRegistryFactory.sol";
import {CVStrategy} from "../../CVStrategy/CVStrategy.sol";

/**
 * @title CommunityMemberFacet
 * @notice Facet containing member management functions for RegistryCommunity
 * @dev This facet is called via delegatecall from RegistryCommunity
 *      CRITICAL: Inherits storage layout from CommunityBaseFacet
 */
contract CommunityMemberFacet is CommunityBaseFacet {
    using SafeERC20 for IERC20;
    /*|--------------------------------------------|*/
    /*|              EVENTS                        |*/
    /*|--------------------------------------------|*/

    event MemberRegisteredWithCovenant(address _member, uint256 _amountStaked, string _covenantSig);
    event MemberUnregistered(address _member, uint256 _amountReturned);
    event MemberKicked(address _member, address _transferAddress, uint256 _amountReturned);

    /*|--------------------------------------------|*/
    /*|              ERRORS                        |*/
    /*|--------------------------------------------|*/
    error UserNotInCouncil(address _user);
    error UserNotInRegistry();
    error KickNotEnabled();
    error StakeRequiredForMembership();

    /*|--------------------------------------------|*/
    /*|              MODIFIERS                     |*/
    /*|--------------------------------------------|*/
    function onlyCouncilSafe() internal view {
        if (!hasRole(COUNCIL_MEMBER, msg.sender)) {
            revert UserNotInCouncil(msg.sender);
        }
    }

    function onlyRegistryMemberSender() internal view {
        if (!isMember(msg.sender)) {
            revert UserNotInRegistry();
        }
    }

    /*|--------------------------------------------|*/
    /*|              FUNCTIONS                     |*/
    /*|--------------------------------------------|*/

    // Sig: 0xa230c524
    function isMember(address _member) public view returns (bool) {
        return addressToMemberInfo[_member].isRegistered;
    }

    // Sig: 0x0331383c
    function getBasisStakedAmount() external view returns (uint256) {
        return registerStakeAmount;
    }

    // Sig: 0x28c309e9
    function getStakeAmountWithFees() public view returns (uint256) {
        uint256 communityFeeAmount = (registerStakeAmount * communityFee) / (100 * PRECISION_SCALE);
        uint256 gardensFeeAmount = (
            registerStakeAmount * IRegistryFactory(registryFactory).getProtocolFee(address(this))
        ) / (100 * PRECISION_SCALE);

        return registerStakeAmount + communityFeeAmount + gardensFeeAmount;
    }

    /// @notice Register as a member without staking (for NFT/Custom power pools)
    /// @dev Only available when community membership stake requirement is zero.
    ///      This prevents bypassing staking requirements in stake-based communities.
    function registerMember() public {
        if (registerStakeAmount > 0) {
            revert StakeRequiredForMembership();
        }
        if (!isMember(msg.sender)) {
            addressToMemberInfo[msg.sender].isRegistered = true;
            totalMembers += 1;
            emit MemberRegisteredWithCovenant(msg.sender, 0, "");
        }
    }

    // Sig: 0x9a1f46e2
    function stakeAndRegisterMember(string memory covenantSig) public {
        IRegistryFactory gardensFactory = IRegistryFactory(registryFactory);
        uint256 communityFeeAmount = (registerStakeAmount * communityFee) / (100 * PRECISION_SCALE);
        uint256 gardensFeeAmount =
            (registerStakeAmount * gardensFactory.getProtocolFee(address(this))) / (100 * PRECISION_SCALE);
        if (!isMember(msg.sender)) {
            addressToMemberInfo[msg.sender].isRegistered = true;

            addressToMemberInfo[msg.sender].stakedAmount = registerStakeAmount;

            gardenToken.safeTransferFrom(
                msg.sender, address(this), registerStakeAmount + communityFeeAmount + gardensFeeAmount
            );

            if (communityFeeAmount > 0) {
                gardenToken.safeTransfer(feeReceiver, communityFeeAmount);
            }
            if (gardensFeeAmount > 0) {
                gardenToken.safeTransfer(gardensFactory.getGardensFeeReceiver(), gardensFeeAmount);
            }
            totalMembers += 1;

            emit MemberRegisteredWithCovenant(msg.sender, registerStakeAmount, covenantSig);
        }
    }

    // Sig: 0xb99b4370
    function unregisterMember() public {
        onlyRegistryMemberSender();
        address _member = msg.sender;
        address[] memory memberStrategies = strategiesByMember[_member];
        Member memory member = addressToMemberInfo[_member];
        delete strategiesByMember[_member];
        delete addressToMemberInfo[_member];
        // In order to resync older contracts that skipped this counter until upgrade (community-params-editable)
        if (totalMembers > 0) {
            totalMembers -= 1;
        }
        deactivateAllStrategies(_member, memberStrategies);
        gardenToken.safeTransfer(_member, member.stakedAmount);
        emit MemberUnregistered(_member, member.stakedAmount);
    }

    // Sig: 0x6871eb4d
    function kickMember(address _member, address _transferAddress) public {
        onlyCouncilSafe();
        if (!isKickEnabled) {
            revert KickNotEnabled();
        }
        if (!isMember(_member)) {
            revert UserNotInRegistry();
        }
        address[] memory memberStrategies = strategiesByMember[_member];
        Member memory member = addressToMemberInfo[_member];
        delete strategiesByMember[_member];
        delete addressToMemberInfo[_member];
        totalMembers -= 1;

        deactivateAllStrategies(_member, memberStrategies);
        gardenToken.safeTransfer(_transferAddress, member.stakedAmount);
        emit MemberKicked(_member, _transferAddress, member.stakedAmount);
    }

    /*|--------------------------------------------|*/
    /*|              INTERNAL HELPERS              |*/
    /*|--------------------------------------------|*/

    function deactivateAllStrategies(address _member, address[] memory memberStrategies) internal {
        for (uint256 i = 0; i < memberStrategies.length; i++) {
            CVStrategy(payable(memberStrategies[i])).deactivatePoints(_member);
        }
    }
}
