// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import {IVotingPowerRegistry} from "./interfaces/IVotingPowerRegistry.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC1155} from "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";

/// @notice Minimal Hats Protocol interface for hat wearer checks
interface IHatsMinimal {
    function isWearerOfHat(address _user, uint256 _hatId) external view returns (bool);
}

/// @title NFTPowerRegistry
/// @notice Derives voting power from NFT ownership and/or Hats Protocol roles
/// @dev Implements IVotingPowerRegistry. Deployed once per pool. Immutable after construction.
///      Power = sum of (balance * weight / 10000) across all configured power sources.
///      Weight uses basis points: 10000 = 1x multiplier.
contract NFTPowerRegistry is IVotingPowerRegistry {
    /*|--------------------------------------------|*/
    /*|              TYPES                         |*/
    /*|--------------------------------------------|*/

    enum NFTType {
        ERC721,  // balanceOf() count
        ERC1155, // balanceOf(account, tokenId) count
        HAT      // isWearerOfHat() binary (0 or 1)
    }

    struct NFTPowerSource {
        address token;     // NFT contract or Hats Protocol address
        NFTType nftType;   // How to read the balance
        uint256 weight;    // Basis points multiplier (10000 = 1x)
        uint256 tokenId;   // ERC1155 token ID (ignored for ERC721/HAT)
        uint256 hatId;     // Hats Protocol hat ID (ignored for ERC721/ERC1155)
    }

    /*|--------------------------------------------|*/
    /*|              ERRORS                        |*/
    /*|--------------------------------------------|*/

    error NoPowerSources();
    error ZeroAddress();
    error HatsProtocolRequired();

    /*|--------------------------------------------|*/
    /*|              STORAGE (immutable-like)      |*/
    /*|--------------------------------------------|*/

    /// @notice Power sources configured at deployment
    NFTPowerSource[] public powerSources;

    /// @notice Hats Protocol address (used for HAT type sources)
    address public immutable hatsProtocol;

    /*|--------------------------------------------|*/
    /*|              CONSTRUCTOR                   |*/
    /*|--------------------------------------------|*/

    /// @param _hatsProtocol Address of Hats Protocol (can be address(0) if no HAT sources)
    /// @param _powerSources Array of power source configurations
    constructor(address _hatsProtocol, NFTPowerSource[] memory _powerSources) {
        if (_powerSources.length == 0) revert NoPowerSources();
        hatsProtocol = _hatsProtocol;

        for (uint256 i = 0; i < _powerSources.length; i++) {
            if (_powerSources[i].token == address(0)) revert ZeroAddress();
            if (_powerSources[i].nftType == NFTType.HAT && _hatsProtocol == address(0)) {
                revert HatsProtocolRequired();
            }
            powerSources.push(_powerSources[i]);
        }
    }

    /*|--------------------------------------------|*/
    /*|      IVotingPowerRegistry IMPLEMENTATION   |*/
    /*|--------------------------------------------|*/

    /// @notice Get member power by summing all NFT power sources
    /// @dev For Custom PointSystem, this value is used directly as voting power
    /// @param _member The member address
    /// @return power The total voting power (weighted sum)
    function getMemberPowerInStrategy(address _member, address /*_strategy*/) external view override returns (uint256 power) {
        for (uint256 i = 0; i < powerSources.length; i++) {
            NFTPowerSource storage source = powerSources[i];
            uint256 balance;

            if (source.nftType == NFTType.ERC721) {
                balance = IERC721(source.token).balanceOf(_member);
            } else if (source.nftType == NFTType.ERC1155) {
                balance = IERC1155(source.token).balanceOf(_member, source.tokenId);
            } else if (source.nftType == NFTType.HAT) {
                balance = IHatsMinimal(hatsProtocol).isWearerOfHat(_member, source.hatId) ? 1 : 0;
            }

            // Apply weight (basis points: 10000 = 1x)
            power += (balance * source.weight) / 10000;
        }
    }

    /// @notice Returns 0 for NFT-based registries (no staking)
    function getMemberStakedAmount(address /*_member*/) external pure override returns (uint256) {
        return 0;
    }

    /// @notice Returns the first power source token address
    /// @dev Used by PowerManagementUtils for decimals lookup
    function ercAddress() external view override returns (address) {
        return powerSources[0].token;
    }

    /// @notice Check if a member has any voting power
    function isMember(address _member) external view override returns (bool) {
        return this.getMemberPowerInStrategy(_member, address(0)) > 0;
    }

    /*|--------------------------------------------|*/
    /*|              VIEW HELPERS                  |*/
    /*|--------------------------------------------|*/

    /// @notice Get the number of configured power sources
    function powerSourceCount() external view returns (uint256) {
        return powerSources.length;
    }
}
