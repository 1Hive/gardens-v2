// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import "forge-std/Test.sol";

import {CommunityPoolFacet} from "../src/RegistryCommunity/facets/CommunityPoolFacet.sol";
import {CVStrategyInitializeParamsV0_3} from "../src/CVStrategy/ICVStrategy.sol";
import {Metadata} from "allo-v2-contracts/core/interfaces/IRegistry.sol";
import {IDiamondCut} from "../src/diamonds/interfaces/IDiamondCut.sol";
import {IDiamond} from "../src/diamonds/interfaces/IDiamond.sol";
import {FAllo} from "../src/interfaces/FAllo.sol";

contract MockAlloPool {
    uint256 public nextPoolId = 1;
    bytes32 public lastProfileId;
    address public lastStrategy;
    bytes public lastInitData;
    address public lastToken;
    uint256 public lastAmount;
    Metadata public lastMetadata;

    function createPoolWithCustomStrategy(
        bytes32 profileId,
        address strategy,
        bytes memory initData,
        address token,
        uint256 amount,
        Metadata memory metadata,
        address[] memory
    ) external payable returns (uint256) {
        lastProfileId = profileId;
        lastStrategy = strategy;
        lastInitData = initData;
        lastToken = token;
        lastAmount = amount;
        lastMetadata = metadata;
        return nextPoolId++;
    }
}

contract MockRegistryFactoryPause {
    address public pauseController;
    IDiamondCut.FacetCut[] internal strategyFacetCuts;
    address internal strategyInit;
    bytes internal strategyInitCalldata;

    function setPauseController(address controller) external {
        pauseController = controller;
    }

    function setStrategyFacets(IDiamondCut.FacetCut[] memory cuts, address initAddr, bytes memory initCalldata_) external {
        delete strategyFacetCuts;
        for (uint256 i = 0; i < cuts.length; i++) {
            strategyFacetCuts.push();
            strategyFacetCuts[i].facetAddress = cuts[i].facetAddress;
            strategyFacetCuts[i].action = cuts[i].action;
            for (uint256 j = 0; j < cuts[i].functionSelectors.length; j++) {
                strategyFacetCuts[i].functionSelectors.push(cuts[i].functionSelectors[j]);
            }
        }
        strategyInit = initAddr;
        strategyInitCalldata = initCalldata_;
    }

    function getStrategyFacets()
        external
        view
        returns (IDiamondCut.FacetCut[] memory facetCuts, address initAddr, bytes memory initCalldata_)
    {
        facetCuts = new IDiamondCut.FacetCut[](strategyFacetCuts.length);
        for (uint256 i = 0; i < strategyFacetCuts.length; i++) {
            facetCuts[i].facetAddress = strategyFacetCuts[i].facetAddress;
            facetCuts[i].action = strategyFacetCuts[i].action;
            bytes4[] storage selectors = strategyFacetCuts[i].functionSelectors;
            facetCuts[i].functionSelectors = new bytes4[](selectors.length);
            for (uint256 j = 0; j < selectors.length; j++) {
                facetCuts[i].functionSelectors[j] = selectors[j];
            }
        }
        initAddr = strategyInit;
        initCalldata_ = strategyInitCalldata;
    }

    function globalPauseController() external view returns (address) {
        return pauseController;
    }
}

contract MockStrategyTemplate {
    address public lastAllo;
    address public lastCollateralVault;
    address public lastOwner;
    address public lastPauseController;
    address public lastInit;
    bytes public lastInitCalldata;
    IDiamondCut.FacetCut[] public lastCuts;

    function init(address allo, address collateralVaultTemplate, address owner) external {
        lastAllo = allo;
        lastCollateralVault = collateralVaultTemplate;
        lastOwner = owner;
    }

    function transferOwnership(address owner) external {
        lastOwner = owner;
    }

    function setPauseController(address controller) external {
        lastPauseController = controller;
    }

    function diamondCut(
        IDiamondCut.FacetCut[] calldata cuts,
        address initAddr,
        bytes calldata initCalldata
    ) external {
        delete lastCuts;
        for (uint256 i = 0; i < cuts.length; i++) {
            lastCuts.push();
            lastCuts[i].facetAddress = cuts[i].facetAddress;
            lastCuts[i].action = cuts[i].action;
            for (uint256 j = 0; j < cuts[i].functionSelectors.length; j++) {
                lastCuts[i].functionSelectors.push(cuts[i].functionSelectors[j]);
            }
        }
        lastInit = initAddr;
        lastInitCalldata = initCalldata;
    }
}

contract CommunityPoolFacetHarness is CommunityPoolFacet {
    function initializeHarness(address owner_) external {
        initialize(owner_);
    }

    function setAllo(address allo_) external {
        allo = FAllo(allo_);
    }

    function setRegistryFactory(address factory) external {
        registryFactory = factory;
    }

    function setStrategyTemplate(address template) external {
        strategyTemplate = template;
    }

    function setCollateralVaultTemplate(address template) external {
        collateralVaultTemplate = template;
    }

    function setProfileId(bytes32 id) external {
        profileId = id;
    }

    function setStrategyFacetCuts(IDiamond.FacetCut[] memory cuts) external {
        delete strategyFacetCuts;
        for (uint256 i = 0; i < cuts.length; i++) {
            strategyFacetCuts.push();
            strategyFacetCuts[i].facetAddress = cuts[i].facetAddress;
            strategyFacetCuts[i].action = cuts[i].action;
            for (uint256 j = 0; j < cuts[i].functionSelectors.length; j++) {
                strategyFacetCuts[i].functionSelectors.push(cuts[i].functionSelectors[j]);
            }
        }
    }

    function setStrategyInit(address init, bytes memory calldata_) external {
        strategyInit = init;
        strategyInitCalldata = calldata_;
    }
}

contract CommunityPoolFacetTest is Test {
    CommunityPoolFacetHarness internal facet;
    MockAlloPool internal allo;
    MockRegistryFactoryPause internal registryFactory;
    MockStrategyTemplate internal strategyTemplate;

    address internal owner = makeAddr("owner");

    function setUp() public {
        facet = new CommunityPoolFacetHarness();
        facet.initializeHarness(owner);

        allo = new MockAlloPool();
        registryFactory = new MockRegistryFactoryPause();
        strategyTemplate = new MockStrategyTemplate();

        facet.setAllo(address(allo));
        facet.setRegistryFactory(address(registryFactory));
        facet.setStrategyTemplate(address(strategyTemplate));
        facet.setCollateralVaultTemplate(address(0xBEEF));
        facet.setProfileId(bytes32(uint256(1)));
    }

    function _baseParams() internal pure returns (CVStrategyInitializeParamsV0_3 memory params) {
        params.registryCommunity = address(0xCAFE);
        params.initialAllowlist = new address[](0);
    }

    function test_createPool_uses_native_token_when_zero() public {
        CVStrategyInitializeParamsV0_3 memory params = _baseParams();
        Metadata memory metadata = Metadata({protocol: 1, pointer: "meta"});

        (uint256 poolId, address strategy) = facet.createPool(address(0), params, metadata);

        assertEq(poolId, 1);
        assertEq(strategy, allo.lastStrategy());
        assertEq(allo.lastToken(), facet.NATIVE());
    }

    function test_createPool_grants_allowlist_and_admin_role() public {
        address[] memory allowlist = new address[](2);
        allowlist[0] = address(0x1);
        allowlist[1] = address(0x2);

        CVStrategyInitializeParamsV0_3 memory params = _baseParams();
        params.initialAllowlist = allowlist;
        Metadata memory metadata = Metadata({protocol: 1, pointer: "meta"});

        (, address strategy) = facet.createPool(address(0xABCD), params, metadata);

        bytes32 allowlistRole = keccak256(abi.encodePacked("ALLOWLIST", uint256(1)));
        bytes32 allowlistAdmin = keccak256(abi.encodePacked("ALLOWLIST_ADMIN", uint256(1)));

        assertTrue(facet.hasRole(allowlistRole, allowlist[0]));
        assertTrue(facet.hasRole(allowlistRole, allowlist[1]));
        assertTrue(facet.hasRole(allowlistAdmin, strategy));
    }

    function test_createPool_reverts_allowlist_too_big() public {
        CVStrategyInitializeParamsV0_3 memory params = _baseParams();
        params.initialAllowlist = new address[](10001);
        Metadata memory metadata = Metadata({protocol: 1, pointer: "meta"});

        vm.expectRevert(abi.encodeWithSelector(CommunityPoolFacet.AllowlistTooBig.selector, 10001));
        facet.createPool(address(0), params, metadata);
    }

    function test_createPool_configures_strategy_facets_and_pause_controller() public {
        IDiamond.FacetCut[] memory cuts = new IDiamond.FacetCut[](1);
        bytes4[] memory selectors = new bytes4[](1);
        selectors[0] = bytes4(0x12345678);
        cuts[0] = IDiamond.FacetCut({
            facetAddress: address(0xBEEF),
            action: IDiamond.FacetCutAction.Add,
            functionSelectors: selectors
        });

        registryFactory.setStrategyFacets(cuts, address(0xCAFE), "init");

        registryFactory.setPauseController(address(0xD00D));

        CVStrategyInitializeParamsV0_3 memory params = _baseParams();
        Metadata memory metadata = Metadata({protocol: 1, pointer: "meta"});

        (, address strategy) = facet.createPool(address(0xABCD), params, metadata);

        MockStrategyTemplate proxy = MockStrategyTemplate(strategy);
        assertEq(proxy.lastPauseController(), address(0xD00D));
        assertEq(proxy.lastInit(), address(0xCAFE));
        assertEq(proxy.lastOwner(), facet.proxyOwner());
    }
}
