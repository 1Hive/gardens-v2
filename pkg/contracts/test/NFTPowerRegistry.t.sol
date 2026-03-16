// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import {NFTPowerRegistry, IHatsMinimal} from "../src/NFTPowerRegistry.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC1155} from "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";

// ═══════════════════════════════════════════════════════════════════════════
// Mocks
// ═══════════════════════════════════════════════════════════════════════════

contract MockERC721 {
    mapping(address => uint256) public balances;

    function setBalance(address owner, uint256 balance) external {
        balances[owner] = balance;
    }

    function balanceOf(address owner) external view returns (uint256) {
        return balances[owner];
    }
}

contract MockERC1155 {
    mapping(address => mapping(uint256 => uint256)) public balances;

    function setBalance(address owner, uint256 tokenId, uint256 balance) external {
        balances[owner][tokenId] = balance;
    }

    function balanceOf(address account, uint256 id) external view returns (uint256) {
        return balances[account][id];
    }
}

contract MockHatsForRegistry {
    mapping(address => mapping(uint256 => bool)) public wearers;

    function setWearer(address user, uint256 hatId, bool isWearer) external {
        wearers[user][hatId] = isWearer;
    }

    function isWearerOfHat(address _user, uint256 _hatId) external view returns (bool) {
        return wearers[_user][_hatId];
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════════════════

contract NFTPowerRegistryTest is Test {
    MockERC721 internal nft721;
    MockERC1155 internal nft1155;
    MockHatsForRegistry internal mockHats;

    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");

    uint256 constant GARDENER_HAT_ID = 0x0000005c00010001000200000000000000000000000000000000000000000000;
    uint256 constant EVALUATOR_HAT_ID = 0x0000005c00010001000300000000000000000000000000000000000000000000;

    function setUp() public {
        nft721 = new MockERC721();
        nft1155 = new MockERC1155();
        mockHats = new MockHatsForRegistry();
    }

    // ─── Constructor Tests ──────────────────────────────────────────────

    function test_constructor_revertsWithNoPowerSources() public {
        NFTPowerRegistry.NFTPowerSource[] memory empty = new NFTPowerRegistry.NFTPowerSource[](0);
        vm.expectRevert(NFTPowerRegistry.NoPowerSources.selector);
        new NFTPowerRegistry(address(mockHats), empty);
    }

    function test_constructor_revertsWithZeroTokenAddress() public {
        NFTPowerRegistry.NFTPowerSource[] memory sources = new NFTPowerRegistry.NFTPowerSource[](1);
        sources[0] = NFTPowerRegistry.NFTPowerSource({
            token: address(0),
            nftType: NFTPowerRegistry.NFTType.ERC721,
            weight: 10000,
            tokenId: 0,
            hatId: 0
        });
        vm.expectRevert(NFTPowerRegistry.ZeroAddress.selector);
        new NFTPowerRegistry(address(mockHats), sources);
    }

    function test_constructor_revertsWhenHatSourceAndNoHatsProtocol() public {
        NFTPowerRegistry.NFTPowerSource[] memory sources = new NFTPowerRegistry.NFTPowerSource[](1);
        sources[0] = NFTPowerRegistry.NFTPowerSource({
            token: address(mockHats),
            nftType: NFTPowerRegistry.NFTType.HAT,
            weight: 10000,
            tokenId: 0,
            hatId: GARDENER_HAT_ID
        });

        vm.expectRevert(NFTPowerRegistry.HatsProtocolRequired.selector);
        new NFTPowerRegistry(address(0), sources);
    }

    function test_constructor_storesSourcesCorrectly() public {
        NFTPowerRegistry.NFTPowerSource[] memory sources = new NFTPowerRegistry.NFTPowerSource[](2);
        sources[0] = NFTPowerRegistry.NFTPowerSource({
            token: address(nft721),
            nftType: NFTPowerRegistry.NFTType.ERC721,
            weight: 10000,
            tokenId: 0,
            hatId: 0
        });
        sources[1] = NFTPowerRegistry.NFTPowerSource({
            token: address(mockHats),
            nftType: NFTPowerRegistry.NFTType.HAT,
            weight: 30000,
            tokenId: 0,
            hatId: GARDENER_HAT_ID
        });

        NFTPowerRegistry registry = new NFTPowerRegistry(address(mockHats), sources);
        assertEq(registry.powerSourceCount(), 2);
        assertEq(registry.hatsProtocol(), address(mockHats));
    }

    // ─── ERC721 Power Tests ─────────────────────────────────────────────

    function test_erc721_zeroPowerWhenNoBalance() public {
        NFTPowerRegistry registry = _createERC721Registry(10000);
        assertEq(registry.getMemberPowerInStrategy(alice, address(0)), 0);
    }

    function test_erc721_powerEqualsBalanceAt1x() public {
        nft721.setBalance(alice, 3);
        NFTPowerRegistry registry = _createERC721Registry(10000); // 1x weight
        assertEq(registry.getMemberPowerInStrategy(alice, address(0)), 3);
    }

    function test_erc721_powerWithWeightMultiplier() public {
        nft721.setBalance(alice, 2);
        NFTPowerRegistry registry = _createERC721Registry(50000); // 5x weight
        assertEq(registry.getMemberPowerInStrategy(alice, address(0)), 10); // 2 * 50000 / 10000 = 10
    }

    function test_erc721_powerWithFractionalWeight() public {
        nft721.setBalance(alice, 10);
        NFTPowerRegistry registry = _createERC721Registry(5000); // 0.5x weight
        assertEq(registry.getMemberPowerInStrategy(alice, address(0)), 5); // 10 * 5000 / 10000 = 5
    }

    // ─── ERC1155 Power Tests ────────────────────────────────────────────

    function test_erc1155_powerFromSpecificTokenId() public {
        uint256 tokenId = 42;
        nft1155.setBalance(alice, tokenId, 7);
        NFTPowerRegistry registry = _createERC1155Registry(tokenId, 10000);
        assertEq(registry.getMemberPowerInStrategy(alice, address(0)), 7);
    }

    function test_erc1155_zeroPowerWhenDifferentTokenId() public {
        nft1155.setBalance(alice, 42, 7);
        NFTPowerRegistry registry = _createERC1155Registry(99, 10000); // Different tokenId
        assertEq(registry.getMemberPowerInStrategy(alice, address(0)), 0);
    }

    // ─── HAT Power Tests ────────────────────────────────────────────────

    function test_hat_binaryPowerWhenWearer() public {
        mockHats.setWearer(alice, GARDENER_HAT_ID, true);
        NFTPowerRegistry registry = _createHatRegistry(GARDENER_HAT_ID, 10000);
        assertEq(registry.getMemberPowerInStrategy(alice, address(0)), 1); // binary: 1 * 10000 / 10000 = 1
    }

    function test_hat_zeroPowerWhenNotWearer() public {
        NFTPowerRegistry registry = _createHatRegistry(GARDENER_HAT_ID, 10000);
        assertEq(registry.getMemberPowerInStrategy(alice, address(0)), 0);
    }

    function test_hat_weightedPower() public {
        mockHats.setWearer(alice, EVALUATOR_HAT_ID, true);
        NFTPowerRegistry registry = _createHatRegistry(EVALUATOR_HAT_ID, 30000); // 3x
        assertEq(registry.getMemberPowerInStrategy(alice, address(0)), 3); // 1 * 30000 / 10000 = 3
    }

    // ─── Multiple Sources Tests ─────────────────────────────────────────

    function test_multipleSources_sumsPowerCorrectly() public {
        // Alice: 2 ERC721 NFTs (1x) + Gardener hat (1x) + Evaluator hat (3x) = 2 + 1 + 3 = 6
        nft721.setBalance(alice, 2);
        mockHats.setWearer(alice, GARDENER_HAT_ID, true);
        mockHats.setWearer(alice, EVALUATOR_HAT_ID, true);

        NFTPowerRegistry.NFTPowerSource[] memory sources = new NFTPowerRegistry.NFTPowerSource[](3);
        sources[0] = NFTPowerRegistry.NFTPowerSource({
            token: address(nft721),
            nftType: NFTPowerRegistry.NFTType.ERC721,
            weight: 10000,
            tokenId: 0,
            hatId: 0
        });
        sources[1] = NFTPowerRegistry.NFTPowerSource({
            token: address(mockHats),
            nftType: NFTPowerRegistry.NFTType.HAT,
            weight: 10000,
            tokenId: 0,
            hatId: GARDENER_HAT_ID
        });
        sources[2] = NFTPowerRegistry.NFTPowerSource({
            token: address(mockHats),
            nftType: NFTPowerRegistry.NFTType.HAT,
            weight: 30000,
            tokenId: 0,
            hatId: EVALUATOR_HAT_ID
        });

        NFTPowerRegistry registry = new NFTPowerRegistry(address(mockHats), sources);
        assertEq(registry.getMemberPowerInStrategy(alice, address(0)), 6);
    }

    function test_multipleSources_differentUsersGetDifferentPower() public {
        nft721.setBalance(alice, 5);
        nft721.setBalance(bob, 1);
        mockHats.setWearer(alice, GARDENER_HAT_ID, true);
        // bob doesn't wear gardener hat

        NFTPowerRegistry.NFTPowerSource[] memory sources = new NFTPowerRegistry.NFTPowerSource[](2);
        sources[0] = NFTPowerRegistry.NFTPowerSource({
            token: address(nft721),
            nftType: NFTPowerRegistry.NFTType.ERC721,
            weight: 10000,
            tokenId: 0,
            hatId: 0
        });
        sources[1] = NFTPowerRegistry.NFTPowerSource({
            token: address(mockHats),
            nftType: NFTPowerRegistry.NFTType.HAT,
            weight: 20000,
            tokenId: 0,
            hatId: GARDENER_HAT_ID
        });

        NFTPowerRegistry registry = new NFTPowerRegistry(address(mockHats), sources);
        assertEq(registry.getMemberPowerInStrategy(alice, address(0)), 7); // 5 + 2 = 7
        assertEq(registry.getMemberPowerInStrategy(bob, address(0)), 1); // 1 + 0 = 1
    }

    // ─── isMember Tests ─────────────────────────────────────────────────

    function test_isMember_trueWhenHasPower() public {
        nft721.setBalance(alice, 1);
        NFTPowerRegistry registry = _createERC721Registry(10000);
        assertTrue(registry.isMember(alice));
    }

    function test_isMember_falseWhenNoPower() public {
        NFTPowerRegistry registry = _createERC721Registry(10000);
        assertFalse(registry.isMember(alice));
    }

    // ─── ercAddress Tests ───────────────────────────────────────────────

    function test_ercAddress_returnsFirstPowerSource() public {
        NFTPowerRegistry registry = _createERC721Registry(10000);
        assertEq(registry.ercAddress(), address(nft721));
    }

    // ─── getMemberStakedAmount Tests ────────────────────────────────────

    function test_stakedAmount_alwaysZero() public {
        nft721.setBalance(alice, 100);
        NFTPowerRegistry registry = _createERC721Registry(10000);
        assertEq(registry.getMemberStakedAmount(alice), 0);
    }

    // ─── Helpers ────────────────────────────────────────────────────────

    function _createERC721Registry(uint256 weight) internal returns (NFTPowerRegistry) {
        NFTPowerRegistry.NFTPowerSource[] memory sources = new NFTPowerRegistry.NFTPowerSource[](1);
        sources[0] = NFTPowerRegistry.NFTPowerSource({
            token: address(nft721),
            nftType: NFTPowerRegistry.NFTType.ERC721,
            weight: weight,
            tokenId: 0,
            hatId: 0
        });
        return new NFTPowerRegistry(address(mockHats), sources);
    }

    function _createERC1155Registry(uint256 tokenId, uint256 weight) internal returns (NFTPowerRegistry) {
        NFTPowerRegistry.NFTPowerSource[] memory sources = new NFTPowerRegistry.NFTPowerSource[](1);
        sources[0] = NFTPowerRegistry.NFTPowerSource({
            token: address(nft1155),
            nftType: NFTPowerRegistry.NFTType.ERC1155,
            weight: weight,
            tokenId: tokenId,
            hatId: 0
        });
        return new NFTPowerRegistry(address(mockHats), sources);
    }

    function _createHatRegistry(uint256 hatId, uint256 weight) internal returns (NFTPowerRegistry) {
        NFTPowerRegistry.NFTPowerSource[] memory sources = new NFTPowerRegistry.NFTPowerSource[](1);
        sources[0] = NFTPowerRegistry.NFTPowerSource({
            token: address(mockHats),
            nftType: NFTPowerRegistry.NFTType.HAT,
            weight: weight,
            tokenId: 0,
            hatId: hatId
        });
        return new NFTPowerRegistry(address(mockHats), sources);
    }
}
