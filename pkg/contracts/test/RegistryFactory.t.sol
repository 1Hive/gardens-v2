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

contract MockNonSafeContractWallet {
    fallback() external payable {}
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
    address authorized = address(0xBEEF1);
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
        vm.startPrank(owner);
        factory.setCommunityFacets(dummyCuts, address(0), "");
        factory.setStrategyFacets(dummyCuts, address(0), "");
        vm.stopPrank();

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

    function test_getProtocolFee_returnsFeeWhenCouncilSafeContractIsNotSafe() public {
        params._councilSafe = payable(address(new MockNonSafeContractWallet()));
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

    function test_setProtopianAddress_authorized_wallet() public {
        address[] memory addrs = _toSingleton(address(0x3));
        vm.prank(owner);
        factory.setAuthorizedWallet(authorized, true);

        vm.prank(authorized);
        factory.setProtopianAddress(addrs, true);

        assertTrue(factory.protopiansAddresses(address(0x3)));
    }

    function test_setKeeperAddress_removalBranch() public {
        address[] memory keepers = _toSingleton(address(0xB));
        vm.startPrank(owner);
        factory.setKeeperAddress(keepers, true);
        factory.setKeeperAddress(keepers, false);
        vm.stopPrank();
        assertFalse(factory.keepersAddresses(address(0xB)));
    }

    function test_setKeeperAddress_authorized_wallet() public {
        address[] memory keepers = _toSingleton(address(0xC));
        vm.prank(owner);
        factory.setAuthorizedWallet(authorized, true);

        vm.prank(authorized);
        factory.setKeeperAddress(keepers, true);

        assertTrue(factory.keepersAddresses(address(0xC)));
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

    function test_setFacets_onlyOwner() public {
        IDiamond.FacetCut[] memory dummyCuts = new IDiamond.FacetCut[](1);
        bytes4[] memory selectors = new bytes4[](1);
        selectors[0] = bytes4(keccak256("dummy()"));
        dummyCuts[0] = IDiamond.FacetCut({
            facetAddress: address(0x1),
            action: IDiamond.FacetCutAction.Add,
            functionSelectors: selectors
        });

        vm.expectRevert();
        factory.setCommunityFacets(dummyCuts, address(0), "");

        vm.expectRevert();
        factory.setStrategyFacets(dummyCuts, address(0), "");
    }

    function test_register_and_unregister_contracts_with_zero_address_guard() public {
        address target = address(0xC0DE);

        vm.prank(owner);
        factory.registerContract(target);
        assertTrue(factory.isContractRegistered(target));

        vm.prank(owner);
        factory.unregisterContract(target);
        assertFalse(factory.isContractRegistered(target));

        vm.prank(owner);
        vm.expectRevert(RegistryFactory.AddressCannotBeZero.selector);
        factory.registerContract(address(0));

        vm.prank(owner);
        vm.expectRevert(RegistryFactory.AddressCannotBeZero.selector);
        factory.unregisterContract(address(0));
    }

    function test_setGlobalPauseController_only_owner_and_non_zero() public {
        vm.prank(owner);
        factory.setGlobalPauseController(address(0xCAFE));
        assertEq(factory.globalPauseController(), address(0xCAFE));

        vm.prank(owner);
        vm.expectRevert(RegistryFactory.AddressCannotBeZero.selector);
        factory.setGlobalPauseController(address(0));

        vm.expectRevert();
        factory.setGlobalPauseController(address(0xBEEF));
    }

    function test_setAuthorizedWallet_onlyOwner() public {
        address caller = address(0xCA11);

        vm.prank(owner);
        factory.setAuthorizedWallet(caller, true);
        assertTrue(factory.isAuthorizedWallet(caller));

        vm.prank(owner);
        factory.setAuthorizedWallet(caller, false);
        assertFalse(factory.isAuthorizedWallet(caller));

        vm.expectRevert();
        factory.setAuthorizedWallet(caller, true);
    }

    function test_setAuthorizedWallet_zeroAddressReverts() public {
        vm.prank(owner);
        vm.expectRevert(RegistryFactory.AddressCannotBeZero.selector);
        factory.setAuthorizedWallet(address(0), true);
    }

    function test_delegateProtopian_by_holder() public {
        address from = address(0x123);
        address to = address(0x456);

        vm.prank(owner);
        factory.setProtopianAddress(_toSingleton(from), true);

        vm.prank(from);
        factory.delegateProtopian(from, to);

        assertFalse(factory.protopiansAddresses(from));
        assertTrue(factory.protopiansAddresses(to));
        assertEq(factory.protopianDelegate(from), to);
    }

    function test_delegateProtopian_by_authorized_wallet() public {
        address from = address(0x111);
        address to = address(0x222);

        vm.startPrank(owner);
        factory.setAuthorizedWallet(authorized, true);
        factory.setProtopianAddress(_toSingleton(from), true);
        vm.stopPrank();

        vm.prank(authorized);
        factory.delegateProtopian(from, to);

        assertFalse(factory.protopiansAddresses(from));
        assertTrue(factory.protopiansAddresses(to));
        assertEq(factory.protopianDelegate(from), to);
    }

    function test_delegateProtopian_undelegate() public {
        address from = address(0x111);
        address to = address(0x222);

        vm.prank(owner);
        factory.setProtopianAddress(_toSingleton(from), true);

        vm.prank(from);
        factory.delegateProtopian(from, to);

        vm.prank(owner);
        factory.setProtopianAddress(_toSingleton(from), true);

        vm.prank(owner);
        factory.delegateProtopian(from, address(0));

        assertTrue(factory.protopiansAddresses(from));
        assertFalse(factory.protopiansAddresses(to));
        assertEq(factory.protopianDelegate(from), address(0));
    }

    function test_delegateProtopian_switch_delegate_after_sync_clears_previous() public {
        address from = address(0x111);
        address first = address(0x222);
        address second = address(0x333);

        vm.prank(owner);
        factory.setProtopianAddress(_toSingleton(from), true);

        vm.prank(from);
        factory.delegateProtopian(from, first);

        vm.prank(owner);
        factory.setProtopianAddress(_toSingleton(from), true);

        vm.prank(owner);
        factory.delegateProtopian(from, second);

        assertFalse(factory.protopiansAddresses(first));
        assertTrue(factory.protopiansAddresses(second));
        assertEq(factory.protopianDelegate(from), second);
    }

    function test_delegateProtopian_can_update_when_holder_currently_delegated() public {
        address from = address(0x111);
        address first = address(0x222);
        address second = address(0x333);

        vm.prank(owner);
        factory.setProtopianAddress(_toSingleton(from), true);

        vm.prank(from);
        factory.delegateProtopian(from, first);

        vm.prank(owner);
        factory.delegateProtopian(from, second);

        vm.prank(owner);
        factory.delegateProtopian(from, address(0));

        assertTrue(factory.protopiansAddresses(from));
        assertFalse(factory.protopiansAddresses(first));
        assertFalse(factory.protopiansAddresses(second));
        assertEq(factory.protopianDelegate(from), address(0));
    }

    function test_setProtopianAddress_removes_old_holder_delegate() public {
        address from = address(0x111);
        address to = address(0x222);

        vm.prank(owner);
        factory.setProtopianAddress(_toSingleton(from), true);

        vm.prank(from);
        factory.delegateProtopian(from, to);

        vm.prank(owner);
        factory.setProtopianAddress(_toSingleton(from), false);

        assertFalse(factory.protopiansAddresses(from));
        assertFalse(factory.protopiansAddresses(to));
        assertEq(factory.protopianDelegate(from), address(0));
    }

    function test_delegateProtopian_requires_protopian_holder() public {
        vm.prank(address(0x123));
        vm.expectRevert(abi.encodeWithSelector(RegistryFactory.ProtopianHolderRequired.selector, address(0x123)));
        factory.delegateProtopian(address(0x123), address(0x456));
    }

    function test_delegateProtopian_reverts_for_unauthorized_caller() public {
        address from = address(0x123);
        address to = address(0x456);
        address caller = address(0x789);

        vm.prank(owner);
        factory.setProtopianAddress(_toSingleton(from), true);

        vm.prank(caller);
        vm.expectRevert(abi.encodeWithSelector(RegistryFactory.UnauthorizedProtopianDelegation.selector, caller, from));
        factory.delegateProtopian(from, to);

        assertTrue(factory.protopiansAddresses(from));
        assertFalse(factory.protopiansAddresses(to));
        assertEq(factory.protopianDelegate(from), address(0));
    }

    function test_delegateProtopian_reverts_for_zero_from() public {
        vm.expectRevert(RegistryFactory.AddressCannotBeZero.selector);
        factory.delegateProtopian(address(0), address(0x456));
    }

    function test_clear_and_upsert_facet_cuts_and_init_getters() public {
        IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](1);
        bytes4[] memory selectors = new bytes4[](1);
        selectors[0] = bytes4(keccak256("a()"));
        cuts[0] =
            IDiamond.FacetCut({facetAddress: address(0x1111), action: IDiamond.FacetCutAction.Add, functionSelectors: selectors});

        vm.startPrank(owner);
        factory.setCommunityFacets(cuts, address(0xAAAA), hex"1234");
        factory.setStrategyFacets(cuts, address(0xBBBB), hex"5678");
        vm.stopPrank();

        (IDiamond.FacetCut[] memory communityCuts, address communityInit, bytes memory communityCalldata) =
            factory.getCommunityFacets();
        assertEq(communityCuts.length, 1);
        assertEq(communityCuts[0].facetAddress, address(0x1111));
        assertEq(communityInit, address(0xAAAA));
        assertEq(communityCalldata, hex"1234");

        (IDiamond.FacetCut[] memory strategyCuts, address strategyInit, bytes memory strategyCalldata) =
            factory.getStrategyFacets();
        assertEq(strategyCuts.length, 1);
        assertEq(strategyCuts[0].facetAddress, address(0x1111));
        assertEq(strategyInit, address(0xBBBB));
        assertEq(strategyCalldata, hex"5678");

        vm.prank(owner);
        factory.upsertCommunityFacetCut(0, address(0x2222), IDiamond.FacetCutAction.Replace, selectors);
        (communityCuts,,) = factory.getCommunityFacets();
        assertEq(communityCuts[0].facetAddress, address(0x2222));
        assertEq(uint8(communityCuts[0].action), uint8(IDiamond.FacetCutAction.Replace));

        vm.prank(owner);
        vm.expectRevert(bytes("invalid facet index"));
        factory.upsertCommunityFacetCut(2, address(0x3333), IDiamond.FacetCutAction.Add, selectors);

        vm.prank(owner);
        factory.clearCommunityFacetCuts();
        (communityCuts,,) = factory.getCommunityFacets();
        assertEq(communityCuts.length, 0);

        vm.prank(owner);
        factory.clearStrategyFacetCuts();
        (strategyCuts,,) = factory.getStrategyFacets();
        assertEq(strategyCuts.length, 0);
    }

    function _toSingleton(address a) internal pure returns (address[] memory arr) {
        arr = new address[](1);
        arr[0] = a;
    }
}
