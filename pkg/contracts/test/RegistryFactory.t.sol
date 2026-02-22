// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import "forge-std/Test.sol";

import {RegistryFactory} from "../src/RegistryFactory/RegistryFactory.sol";
import {RegistryCommunityInitializeParams} from "../src/RegistryCommunity/RegistryCommunity.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Metadata} from "allo-v2-contracts/core/interfaces/IRegistry.sol";
import {IDiamondCut} from "../src/diamonds/interfaces/IDiamondCut.sol";
import {IDiamond} from "../src/diamonds/interfaces/IDiamond.sol";

contract MockSafe {
    address[] internal _owners;

    constructor(address owner) {
        _owners.push(owner);
    }

    function getOwners() external view returns (address[] memory) {
        return _owners;
    }
}

contract MockRegistryCommunity {
    address public councilSafe;

    function initialize(RegistryCommunityInitializeParams memory params, address, address, address) external {
        councilSafe = params._councilSafe;
    }

    function diamondCut(RegistryCommunityInitializeParams[] memory, address, bytes memory) external {}

    function setCouncilSafe(address newSafe) external {
        councilSafe = newSafe;
    }
}

contract RegistryFactoryTest is Test {
    RegistryFactory factory;
    address owner = address(0xA11CE);
    address gardensFeeReceiver = address(0xFEE);
    address registryTemplate;
    address strategyTemplate;
    address collateralTemplate;
    MockSafe councilSafe;

    RegistryCommunityInitializeParams params;

    function setUp() public {
        registryTemplate = address(new MockRegistryCommunity());
        strategyTemplate = address(0x1234);
        collateralTemplate = address(0x5678);
        councilSafe = new MockSafe(address(0xC0FFEE));

        factory = RegistryFactory(
            address(
                new ERC1967Proxy(
                    address(new RegistryFactory()),
                    abi.encodeWithSelector(
                        RegistryFactory.initialize.selector,
                        owner,
                        gardensFeeReceiver,
                        registryTemplate,
                        strategyTemplate,
                        collateralTemplate
                    )
                )
            )
        );
        IDiamond.FacetCut[] memory dummyCuts = new IDiamond.FacetCut[](1);
        bytes4[] memory selectors = new bytes4[](1);
        selectors[0] = bytes4(keccak256("dummy()"));
        dummyCuts[0] = IDiamond.FacetCut({
            facetAddress: address(0x1),
            action: IDiamond.FacetCutAction.Add,
            functionSelectors: selectors
        });
        vm.prank(owner);
        factory.initializeV2(dummyCuts, address(0), "", dummyCuts, address(0), "");

        params._allo = address(this);
        params._gardenToken = IERC20(address(0xBEEF));
        params._registerStakeAmount = 1;
        params._communityFee = 1;
        params._feeReceiver = gardensFeeReceiver;
        params._metadata = Metadata({protocol: 1, pointer: "test-meta"});
        params._councilSafe = payable(address(councilSafe));
        params._communityName = "test";
        params._isKickEnabled = false;
        params.covenantIpfsHash = "";
    }

    function test_initialize_setsVars() public {
        assertEq(factory.gardensFeeReceiver(), gardensFeeReceiver);
        assertEq(factory.registryCommunityTemplate(), registryTemplate);
        assertEq(factory.strategyTemplate(), strategyTemplate);
        assertEq(factory.collateralVaultTemplate(), collateralTemplate);
        assertEq(factory.nonce(), 0);
    }

    function test_createRegistry_incrementsNonceAndMarksValid() public {
        address registryAddr = factory.createRegistry(params);
        assertTrue(factory.getCommunityValidity(registryAddr));
        assertEq(factory.nonce(), 1);
    }

    function test_createRegistry_revertsWithoutFacetCuts() public {
        RegistryFactory fresh = RegistryFactory(
            address(
                new ERC1967Proxy(
                    address(new RegistryFactory()),
                    abi.encodeWithSelector(
                        RegistryFactory.initialize.selector,
                        owner,
                        gardensFeeReceiver,
                        registryTemplate,
                        strategyTemplate,
                        collateralTemplate
                    )
                )
            )
        );

        vm.expectRevert(bytes("Community facets not set"));
        fresh.createRegistry(params);

        IDiamond.FacetCut[] memory dummyCuts = new IDiamond.FacetCut[](1);
        bytes4[] memory selectors = new bytes4[](1);
        selectors[0] = bytes4(keccak256("dummy()"));
        dummyCuts[0] = IDiamond.FacetCut({
            facetAddress: address(0x1),
            action: IDiamond.FacetCutAction.Add,
            functionSelectors: selectors
        });

        vm.prank(owner);
        fresh.setCommunityFacets(dummyCuts, address(0), "");

        vm.expectRevert(bytes("Strategy facets not set"));
        fresh.createRegistry(params);
    }

    function test_setReceiverAddress_onlyOwner() public {
        vm.prank(owner);
        factory.setReceiverAddress(address(0xB0B));
        assertEq(factory.gardensFeeReceiver(), address(0xB0B));

        vm.prank(owner);
        vm.expectRevert();
        factory.setReceiverAddress(address(0));
    }

    function test_setTemplates_onlyOwner() public {
        vm.startPrank(owner);
        factory.setRegistryCommunityTemplate(address(0x123));
        factory.setStrategyTemplate(address(0x456));
        factory.setCollateralVaultTemplate(address(0x789));
        vm.stopPrank();

        assertEq(factory.registryCommunityTemplate(), address(0x123));
        assertEq(factory.strategyTemplate(), address(0x456));
        assertEq(factory.collateralVaultTemplate(), address(0x789));
    }

    function test_setTemplates_revertNonOwner() public {
        vm.expectRevert();
        factory.setRegistryCommunityTemplate(address(0x123));
        vm.expectRevert();
        factory.setStrategyTemplate(address(0x456));
        vm.expectRevert();
        factory.setCollateralVaultTemplate(address(0x789));
    }

    function test_setStreamingEscrowFactory_onlyOwner() public {
        vm.prank(owner);
        factory.setStreamingEscrowFactory(address(0xABC));
        assertEq(factory.getStreamingEscrowFactory(), address(0xABC));

        vm.prank(owner);
        vm.expectRevert();
        factory.setStreamingEscrowFactory(address(0));
    }

    function test_getProtocolFee_returnsFee() public {
        address registryAddr = factory.createRegistry(params);

        vm.prank(owner);
        factory.setProtocolFee(registryAddr, 42);

        uint256 fee = factory.getProtocolFee(registryAddr);
        assertEq(fee, 42);
    }

    function test_getProtocolFee_revertsIfInvalidCommunity() public {
        vm.expectRevert();
        factory.getProtocolFee(address(0xDEAD));
    }

    function test_getProtocolFee_zeroForKeepers() public {
        address registryAddr = factory.createRegistry(params);
        vm.prank(owner);
        factory.setKeeperAddress(_toSingleton(registryAddr), true);

        uint256 fee = factory.getProtocolFee(registryAddr);
        assertEq(fee, 0);
    }

    function test_getProtocolFee_zeroForProtopianSafe() public {
        address registryAddr = factory.createRegistry(params);
        MockSafe safe = new MockSafe(address(0xC0FFEE));

        vm.prank(owner);
        factory.setProtopianAddress(_toSingleton(address(safe)), true);

        MockRegistryCommunity(registryAddr).setCouncilSafe(address(safe));

        uint256 fee = factory.getProtocolFee(registryAddr);
        assertEq(fee, 0);
    }

    function test_getProtocolFee_zeroForProtopianOwner() public {
        address registryAddr = factory.createRegistry(params);
        address ownerAddr = councilSafe.getOwners()[0];

        vm.prank(owner);
        factory.setProtopianAddress(_toSingleton(ownerAddr), true);

        uint256 fee = factory.getProtocolFee(registryAddr);
        assertEq(fee, 0);
    }

    function test_getProtocolFee_returnsFeeWhenCouncilSafeIsEOA() public {
        params._councilSafe = payable(address(0xABCD));
        address registryAddr = factory.createRegistry(params);

        vm.prank(owner);
        factory.setProtocolFee(registryAddr, 55);

        uint256 fee = factory.getProtocolFee(registryAddr);
        assertEq(fee, 55);
    }

    function test_setProtopianAddress_removalBranch() public {
        address[] memory addrs = _toSingleton(address(0x2));
        vm.startPrank(owner);
        factory.setProtopianAddress(addrs, true);
        factory.setProtopianAddress(addrs, false);
        vm.stopPrank();
        assertFalse(factory.protopiansAddresses(address(0x2)));
    }

    function test_setKeeperAddress_removalBranch() public {
        address[] memory keepers = _toSingleton(address(0xB));
        vm.startPrank(owner);
        factory.setKeeperAddress(keepers, true);
        factory.setKeeperAddress(keepers, false);
        vm.stopPrank();
        assertFalse(factory.keepersAddresses(address(0xB)));
    }

    function test_setCommunityValidity_and_getCommunityValidity() public {
        address registryAddr = factory.createRegistry(params);

        vm.prank(owner);
        factory.setCommunityValidity(registryAddr, false);
        assertFalse(factory.getCommunityValidity(registryAddr));

        vm.prank(owner);
        factory.setCommunityValidity(registryAddr, true);
        assertTrue(factory.getCommunityValidity(registryAddr));
    }

    function test_setCommunityFacets_and_strategyFacets_onlyOwner() public {
        IDiamond.FacetCut[] memory dummyCuts = new IDiamond.FacetCut[](1);
        bytes4[] memory selectors = new bytes4[](2);
        selectors[0] = bytes4(keccak256("dummy1()"));
        selectors[1] = bytes4(keccak256("dummy2()"));
        dummyCuts[0] = IDiamond.FacetCut({
            facetAddress: address(0x1),
            action: IDiamond.FacetCutAction.Add,
            functionSelectors: selectors
        });

        vm.expectRevert();
        factory.setCommunityFacets(dummyCuts, address(0), "");

        vm.expectRevert();
        factory.setStrategyFacets(dummyCuts, address(0), "");

        vm.prank(owner);
        factory.setCommunityFacets(dummyCuts, address(0), "");

        vm.prank(owner);
        factory.setStrategyFacets(dummyCuts, address(0), "");
    }

    function test_initializeV2_onlyOwner() public {
        IDiamond.FacetCut[] memory dummyCuts = new IDiamond.FacetCut[](1);
        bytes4[] memory selectors = new bytes4[](1);
        selectors[0] = bytes4(keccak256("dummy()"));
        dummyCuts[0] = IDiamond.FacetCut({
            facetAddress: address(0x1),
            action: IDiamond.FacetCutAction.Add,
            functionSelectors: selectors
        });

        vm.expectRevert();
        factory.initializeV2(dummyCuts, address(0), "", dummyCuts, address(0), "");
    }

    function _toSingleton(address a) internal pure returns (address[] memory arr) {
        arr = new address[](1);
        arr[0] = a;
    }
}
