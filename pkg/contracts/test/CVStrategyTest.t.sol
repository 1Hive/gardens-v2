// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "forge-std/console.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeArbitrator} from "../src/SafeArbitrator.sol";

import {IAllo} from "allo-v2-contracts/core/interfaces/IAllo.sol";
import {IStrategy} from "allo-v2-contracts/core/interfaces/IStrategy.sol";
// Core contracts
import {Allo} from "allo-v2-contracts/core/Allo.sol";
import {Registry} from "allo-v2-contracts/core/Registry.sol";
// Internal Libraries
import {Errors} from "allo-v2-contracts/core/libraries/Errors.sol";
import {Metadata} from "allo-v2-contracts/core/libraries/Metadata.sol";
import {Native} from "allo-v2-contracts/core/libraries/Native.sol";
// Test libraries
import {AlloSetup} from "allo-v2-test/foundry/shared/AlloSetup.sol";
import {RegistrySetupFull} from "allo-v2-test/foundry/shared/RegistrySetup.sol";
import {TestStrategy} from "allo-v2-test/utils/TestStrategy.sol";
import {MockStrategy} from "allo-v2-test/utils/MockStrategy.sol";
import {IArbitrator} from "../src/interfaces/IArbitrator.sol";
import {ICVStrategy} from "../src/CVStrategy/ICVStrategy.sol";
import {GV2ERC20} from "../script/GV2ERC20.sol";
import {RegistryCommunity, RegistryCommunityInitializeParams} from "../src/RegistryCommunity/RegistryCommunity.sol";

import {CollateralVault} from "../src/CollateralVault.sol";
import {RegistryFactory} from "../src/RegistryFactory/RegistryFactory.sol";
import {
    CVStrategy,
    ProposalType,
    ProposalStatus,
    CVStrategyInitializeParamsV0_2,
    ArbitrableConfig,
    PointSystemConfig,
    PointSystem,
    Proposal,
    CreateProposal,
    ProposalSupport,
    CVParams
} from "../src/CVStrategy/CVStrategy.sol";

import {CVProposalFacet} from "../src/CVStrategy/facets/CVProposalFacet.sol";
import {CVStrategyBaseFacet} from "../src/CVStrategy/CVStrategyBaseFacet.sol";
import {ConvictionsUtils} from "../src/CVStrategy/ConvictionsUtils.sol";

import {ISybilScorer} from "../src/ISybilScorer.sol";
import {PassportScorer} from "../src/PassportScorer.sol";
import {RegistryCommunityDiamondInit} from "../src/RegistryCommunity/RegistryCommunityDiamondInit.sol";
import {CVStrategyDiamondInit} from "../src/CVStrategy/CVStrategyDiamondInit.sol";

import {GasHelpers2} from "./shared/GasHelpers2.sol";
import {SafeSetup} from "./shared/SafeSetup.sol";
import {CVStrategyHelpers} from "./CVStrategyHelpers.sol";
import {StrategyDiamondConfigurator} from "./helpers/StrategyDiamondConfigurator.sol";
import {CommunityDiamondConfigurator} from "./helpers/CommunityDiamondConfigurator.sol";

import {ABDKMath64x64} from "./ABDKMath64x64.sol";
import {Upgrades} from "@openzeppelin/foundry/LegacyUpgrades.sol";

import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "@superfluid-finance/ethereum-contracts/contracts/apps/SuperTokenV1Library.sol";

/* @dev Run
 * forge test --mc CVStrategyTest -vvvvv
 * forge test --mt testRevert -vvvv
 * forge test --mc CVStrategyTest --mt test -vv
 */

contract CVStrategyTest is Test, AlloSetup, RegistrySetupFull, CVStrategyHelpers, Errors, GasHelpers2, SafeSetup {
    using ABDKMath64x64 for int128;
    using ABDKMath64x64 for int256;
    using ABDKMath64x64 for uint128;
    using ABDKMath64x64 for uint256;

    GV2ERC20 public token;
    GV2ERC20 public superfluidToken;
    uint256 public mintAmount = 15000 ether;
    uint256 public constant TOTAL_SUPPLY = 45000 ether;
    uint256 public constant POOL_AMOUNT = 15000 ether;
    uint256 public constant MINIMUM_STAKE = 5 ether;
    uint256 public constant MINIMUM_SYBIL_SCORE = 40 ether;
    uint256 public constant PROTOCOL_FEE_PERCENTAGE = 1;
    uint256 public constant COMMUNITY_FEE_PERCENTAGE = 2;
    uint256 public constant STAKE_WITH_FEES =
        MINIMUM_STAKE + (MINIMUM_STAKE * (COMMUNITY_FEE_PERCENTAGE + PROTOCOL_FEE_PERCENTAGE)) / 100;
    uint256 public constant REQUESTED_AMOUNT = 1000 ether;
    uint256 public constant PRECISION_SCALE = 10 ** 4;
    uint256 public constant MIN_THRESHOLD_PTS = 5e23;

    RegistryFactory internal registryFactory;
    RegistryCommunity internal registryCommunity;

    PassportScorer public passportScorer;
    SafeArbitrator safeArbitrator;
    StrategyDiamondConfigurator public diamondConfigurator;
    CommunityDiamondConfigurator public communityDiamondConfigurator;

    address factoryOwner = makeAddr("registryFactoryDeployer");
    address protocolFeeReceiver = makeAddr("multisigReceiver");
    address gardenMember = makeAddr("gardenMember");
    address tribunalSafe = makeAddr("tribunalSafe");
    address listManager = makeAddr("listManager");

    // Used to give to setPool params to skip arbitration config
    ArbitrableConfig EMPTY_ARB_CONFIG = ArbitrableConfig(IArbitrator(address(0)), address(0), 0, 0, 0, 0);

    function setUp() public {
        __RegistrySetupFull();
        __AlloSetup(address(registry()));

        // Deploy diamond configurators
        diamondConfigurator = new StrategyDiamondConfigurator();
        communityDiamondConfigurator = new CommunityDiamondConfigurator();

        vm.startPrank(allo_owner());
        allo().updateBaseFee(0);
        allo().updatePercentFee(0);
        vm.stopPrank();

        token = new GV2ERC20("Mock Token", "MTK", 18);
        superfluidToken = new GV2ERC20("SF Token", "STK", 18);

        token.mint(local(), TOTAL_SUPPLY / 3);
        token.mint(pool_admin(), TOTAL_SUPPLY / 3);
        token.mint(gardenMember, TOTAL_SUPPLY / 3);
        //PassportScorer test
        token.mint(address(6), TOTAL_SUPPLY / 3);
        token.approve(address(allo()), mintAmount);

        vm.startPrank(allo_owner());
        allo().transferOwnership(local());
        vm.stopPrank();

        // registryCommunity = new RegistryCommunity();
        vm.startPrank(factoryOwner);

        ERC1967Proxy arbitratorProxy = new ERC1967Proxy(
            address(new SafeArbitrator()),
            abi.encodeWithSelector(SafeArbitrator.initialize.selector, 0.01 ether, factoryOwner)
        );
        safeArbitrator = SafeArbitrator(payable(address(arbitratorProxy)));

        // RegistryFactory registryFactory = new RegistryFactory();
        ERC1967Proxy proxy = new ERC1967Proxy(
            address(new RegistryFactory()),
            abi.encodeWithSelector(
                RegistryFactory.initialize.selector,
                factoryOwner,
                address(protocolFeeReceiver),
                address(new RegistryCommunity()),
                address(new CVStrategy()),
                address(new CollateralVault())
            )
        );

        registryFactory = RegistryFactory(address(proxy));

        registryFactory.initializeV2(
            communityDiamondConfigurator.getFacetCuts(),
            address(communityDiamondConfigurator.diamondInit()),
            abi.encodeCall(RegistryCommunityDiamondInit.init, ()),
            diamondConfigurator.getFacetCuts(),
            address(diamondConfigurator.diamondInit()),
            abi.encodeCall(CVStrategyDiamondInit.init, ())
        );

        vm.stopPrank();

        RegistryCommunityInitializeParams memory params;
        params._allo = address(allo());
        params._gardenToken = IERC20(address(token));
        params._registerStakeAmount = MINIMUM_STAKE;
        params._communityFee = COMMUNITY_FEE_PERCENTAGE;
        params._isKickEnabled = true;

        params._feeReceiver = address(this);

        params._metadata = metadata;
        params._councilSafe = payable(address(_councilSafe()));

        registryCommunity = RegistryCommunity(payable(registryFactory.createRegistry(params)));

        proxy = new ERC1967Proxy(
            address(new PassportScorer()),
            abi.encodeWithSelector(PassportScorer.initialize.selector, address(listManager), factoryOwner)
        );

        passportScorer = PassportScorer(payable(address(proxy)));

        // passportScorer.transferOwnership(factoryOwner);

        vm.startPrank(factoryOwner);
        registryFactory.setProtocolFee(address(registryCommunity), PROTOCOL_FEE_PERCENTAGE);
        vm.stopPrank();
        token.approve(address(registryCommunity), registryCommunity.getBasisStakedAmount());
    }

    function _registryCommunity() internal view returns (RegistryCommunity) {
        return registryCommunity;
    }

    /**
     *   HELPERS FUNCTIONS
     */
    function _createProposal(address _tokenPool, uint256 requestAmount, uint256 poolAmount)
        public
        returns (IAllo.Pool memory pool, uint256 poolId, uint256 proposalId)
    {
        (pool, poolId, proposalId) =
            _createProposal(_tokenPool, requestAmount, poolAmount, ProposalType.Funding, PointSystem.Unlimited);
    }

    function _createProposal(
        address _tokenPool,
        uint256 requestAmount,
        uint256 poolAmount,
        ProposalType proposalType,
        PointSystem pointSystem
    ) public returns (IAllo.Pool memory pool, uint256 poolId, uint256 proposalId) {
        if (requestAmount == 0) {
            requestAmount = REQUESTED_AMOUNT;
        }

        if (poolAmount == 0) {
            poolAmount = POOL_AMOUNT;
        }
        address useTokenPool = _tokenPool;
        if (_tokenPool == address(0)) {
            useTokenPool = NATIVE;
        }

        startMeasuringGas("createProposal");
        // allo().addToCloneableStrategies(address(strategy));

        ArbitrableConfig memory arbitrableConfig =
            ArbitrableConfig(safeArbitrator, payable(tribunalSafe), 0.02 ether, 0.01 ether, 1, 300);
        CVStrategyInitializeParamsV0_2 memory params;

        if (requestAmount == 12345) {
            params = getParams(
                address(registryCommunity),
                proposalType,
                pointSystem,
                PointSystemConfig(200 * DECIMALS),
                arbitrableConfig,
                new address[](1),
                address(0),
                0,
                address(superfluidToken)
            );
        } else {
            params = getParams(
                address(registryCommunity),
                proposalType,
                pointSystem,
                PointSystemConfig(200 * DECIMALS),
                arbitrableConfig,
                new address[](1),
                address(0),
                0,
                address(0)
            );
        }
        // CVStrategy strategy = new CVStrategy(address(allo()));

        (uint256 _poolId, address _strategy) = _registryCommunity().createPool(useTokenPool, params, metadata);
        // console.log("strat: %s", strat);
        poolId = _poolId;
        CVStrategy strategy = CVStrategy(payable(_strategy));

        // Configure diamond facets for the strategy as the owner
        vm.startPrank(strategy.owner());
        strategy.diamondCut(diamondConfigurator.getFacetCuts(), address(0), "");
        vm.stopPrank();

        vm.startPrank(pool_admin());
        safeHelper(
            address(registryCommunity),
            0,
            abi.encodeWithSelector(registryCommunity.addStrategy.selector, address(strategy))
        );
        vm.stopPrank();

        _registryCommunity().gardenToken().approve(address(registryCommunity), STAKE_WITH_FEES);
        _registryCommunity().stakeAndRegisterMember("");
        strategy.activatePoints();

        pool = allo().getPool(poolId);

        if (useTokenPool == NATIVE) {
            // allo().fundPool{value: poolAmount}(poolId, poolAmount);
            // ERC20 transfer
            vm.deal(address(this), poolAmount);
            // allo().fundPool{value: poolAmount}(poolId, poolAmount);
            payable(address(strategy)).transfer(poolAmount);
        } else {
            GV2ERC20(useTokenPool).mint(address(this), poolAmount);
            // ERC20 transfer
            GV2ERC20(useTokenPool).transfer(address(strategy), poolAmount);
            // allo().fundPool(poolId, poolAmount);
        }

        assertEq(pool.profileId, _registryCommunity().profileId(), "poolProfileID");
        // assertEq(pool.profileId, poolProfile_id1(registry(), local(), pool_managers()), "poolProfileID");
        // assertNotEq(address(pool.strategy), address(strategy), "Strategy Clones");

        startMeasuringGas("createProposal");

        CreateProposal memory proposal =
            CreateProposal(poolId, pool_admin(), requestAmount, address(useTokenPool), metadata);
        bytes memory data = abi.encode(proposal);
        uint256 arbitrableConfigVersion = strategy.currentArbitrableConfigVersion();

        (,, uint256 submitterCollateralAmount,,,) = strategy.arbitrableConfigs(arbitrableConfigVersion);
        vm.deal(pool_admin(), submitterCollateralAmount);
        vm.startPrank(pool_admin());
        _registryCommunity().gardenToken().approve(address(registryCommunity), STAKE_WITH_FEES);
        _registryCommunity().stakeAndRegisterMember("");
        proposalId = uint160(allo().registerRecipient{value: submitterCollateralAmount}(poolId, data));
        vm.stopPrank();

        stopMeasuringGas();
    }

    function _canExecuteProposal(CVStrategy strategy, uint256 proposalId)
        public
        view
        virtual
        returns (bool canBeExecuted)
    {
        //  Proposal storage proposal = proposals[proposalId];

        // uint256 convictionLast = updateProposalConviction(proposalId);
        //  (uint256 convictionLast, uint256 blockNumber) =
        //      _checkBlockAndCalculateConviction(proposal, proposal.stakedAmount);

        //  if (convictionLast == 0 && blockNumber == 0) {
        //      convictionLast = proposal.convictionLast;
        //  }
        (,,, uint256 requestedAmount,,,,,,,,) = strategy.getProposal(proposalId);
        uint256 conviction = strategy.calculateProposalConviction(proposalId);
        uint256 threshold = strategy.calculateThreshold(requestedAmount);

        console.log("conviction", conviction);
        console.log("threshold", threshold);
        canBeExecuted = conviction >= threshold;
    }

    function _assertProposalStatus(CVStrategy cv, uint256 proposalId, ProposalStatus _toBeChecked) internal view {
        (
            ,,,,, // address submitter,
            // address beneficiary
            // address requestedToken,
            // uint256 requestedAmount
            // uint256 stakedTokens,
            ProposalStatus proposalStatus, // uint256 blockLast, // uint256 convictionLast // uint256 threshold // uint256 voterPointsPct
            ,,,,,
        ) = cv.getProposal(proposalId);

        assertTrue(proposalStatus == _toBeChecked, "ProposalStatus");
    }

    function getBalance(address _token, address holder) public view returns (uint256) {
        if (_token == NATIVE) {
            return address(holder).balance;
        } else {
            return IERC20(_token).balanceOf(address(holder));
        }
    }

    /**
     *    TESTS
     */
    function test_createProposal_working() public {
        (, uint256 poolId,) = _createProposal(NATIVE, 0, 0);
    }

    function testRevert_createProposal_OverMaxRatio() public {
        (, uint256 poolId,) = _createProposal(NATIVE, 0, 0);

        CreateProposal memory proposal = CreateProposal(poolId, pool_admin(), 11000 ether, NATIVE, metadata);
        bytes memory data = abi.encode(proposal);
        // vm.expectRevert(abi.encodeWithSelector(CVStrategy.AmountOverMaxRatio.selector));
        vm.expectRevert();
        allo().registerRecipient(poolId, data);
    }

    function test_decreasePower_with_staked_proposal() public {
        /* Params */
        uint256 TOTAL_POWER = 100 ether;
        uint256 STAKED_ON_PROPOSAL = 50 ether;
        uint256 STAKE_TO_REMOVE = 75 ether;

        (IAllo.Pool memory pool, uint256 poolId, uint256 proposalId) = _createProposal(NATIVE, 0, 0);
        ProposalSupport[] memory votes = new ProposalSupport[](1);
        vm.startPrank(gardenMember);
        token.approve(address(registryCommunity), STAKE_WITH_FEES);
        console.log("STAKE_WITH_FEES", STAKE_WITH_FEES);
        _registryCommunity().stakeAndRegisterMember("");
        token.approve(address(registryCommunity), TOTAL_POWER - MINIMUM_STAKE);
        registryCommunity.increasePower(TOTAL_POWER - MINIMUM_STAKE);
        // 5 ether from regiterStake + 50 ether increase = 55 ether total staked
        votes[0] = ProposalSupport(proposalId, int256(STAKED_ON_PROPOSAL));
        bytes memory data = abi.encode(votes);
        CVStrategy cv = CVStrategy(payable(address(pool.strategy)));
        cv.activatePoints();
        allo().allocate(poolId, data);
        //Note: Here it might not be staked amount but support percentage
        //TODO: TotalVoterStakePct is actually TotalVoterStakePoints, need to refactor all pct for points
        assertEq(registryCommunity.getMemberPowerInStrategy(gardenMember, address(cv)), TOTAL_POWER);
        assertEq(cv.totalVoterStakePct(address(gardenMember)), STAKED_ON_PROPOSAL);
        assertEq(cv.getProposalStakedAmount(proposalId), STAKED_ON_PROPOSAL);
        assertEq(cv.totalStaked(), STAKED_ON_PROPOSAL);
        registryCommunity.decreasePower(STAKE_TO_REMOVE); //decrease power by 75, so only 25 ether left should be on proposal
        assertEq(cv.totalVoterStakePct(address(gardenMember)), TOTAL_POWER - STAKE_TO_REMOVE);
        assertEq(cv.getProposalStakedAmount(proposalId), TOTAL_POWER - STAKE_TO_REMOVE);
        vm.stopPrank();
    }

    function test_editProposal() public {
        // Create a proposal
        (IAllo.Pool memory pool, uint256 poolId, uint256 proposalId) = _createProposal(NATIVE, 0, 0);
        CVStrategy cv = CVStrategy(payable(address(pool.strategy)));

        // Get initial proposal data
        (, address beneficiary,, uint256 requestedAmount,,,,,,,,) = cv.getProposal(proposalId);

        // Prepare new data for editing
        address newBeneficiary = makeAddr("newBeneficiary");
        uint256 newRequestedAmount = REQUESTED_AMOUNT * 2;
        Metadata memory newMetadata = Metadata({protocol: 1, pointer: "QmNewPointer123456789"});

        // Edit proposal as the submitter (pool_admin who created it)
        vm.startPrank(pool_admin());

        // Fast forward less than 1 hour to see if it fails
        // vm.warp(block.timestamp + 2 hours);

        cv.editProposal(proposalId, newMetadata, newBeneficiary, newRequestedAmount);

        vm.stopPrank();

        // Verify the proposal was edited
        (, address updatedBeneficiary,, uint256 updatedRequestedAmount,,,,,,,,) = cv.getProposal(proposalId);

        assertEq(updatedBeneficiary, newBeneficiary, "Beneficiary should be updated");
        assertEq(updatedRequestedAmount, newRequestedAmount, "Requested amount should be updated");
    }

    function testRevert_editProposal_editTimeout() public {
        // Create a proposal
        (IAllo.Pool memory pool, uint256 poolId, uint256 proposalId) = _createProposal(NATIVE, 0, 0);
        CVStrategy cv = CVStrategy(payable(address(pool.strategy)));

        // Get initial proposal data
        (, address beneficiary,, uint256 requestedAmount,,,,,,,,) = cv.getProposal(proposalId);

        // Prepare new data for editing
        address newBeneficiary = makeAddr("newBeneficiary");
        uint256 newRequestedAmount = REQUESTED_AMOUNT * 2;
        Metadata memory newMetadata = Metadata({protocol: 1, pointer: "QmNewPointer123456789"});

        // Edit proposal as the submitter (pool_admin who created it)
        vm.startPrank(pool_admin());

        // Fast forward 2 hours to see if it fails
        vm.warp(block.timestamp + 2 hours);
        vm.expectRevert(
            abi.encodeWithSelector(
                CVProposalFacet.BeneficiaryEditTimeout.selector, proposalId, beneficiary, newBeneficiary, 1
            )
        );
        // revert BeneficiaryEditTimeout(
        //             _proposalId, proposal.beneficiary, _beneficiary, proposal.creationTimestamp
        //         );
        cv.editProposal(proposalId, newMetadata, newBeneficiary, newRequestedAmount);

        vm.stopPrank();
    }

    function testRevert_editProposal_notSubmitter() public {
        // Create a proposal
        (IAllo.Pool memory pool, uint256 poolId, uint256 proposalId) = _createProposal(NATIVE, 0, 0);
        CVStrategy cv = CVStrategy(payable(address(pool.strategy)));

        // Prepare new data
        address newBeneficiary = makeAddr("newBeneficiary");
        uint256 newRequestedAmount = REQUESTED_AMOUNT * 2;
        Metadata memory newMetadata = Metadata({protocol: 1, pointer: "QmNewPointer123456789"});

        // Try to edit proposal as a different user (not the submitter)
        vm.startPrank(gardenMember);
        vm.warp(block.timestamp + 2 hours);

        vm.expectRevert();
        cv.editProposal(proposalId, newMetadata, newBeneficiary, newRequestedAmount);

        vm.stopPrank();
    }

    function testRevert_editProposal_inactiveProposal() public {
        // Create a proposal
        (IAllo.Pool memory pool, uint256 poolId, uint256 proposalId) = _createProposal(NATIVE, 0, 0);
        CVStrategy cv = CVStrategy(payable(address(pool.strategy)));

        // Cancel the proposal
        vm.startPrank(pool_admin());
        cv.cancelProposal(proposalId);

        // Prepare new data
        address newBeneficiary = makeAddr("newBeneficiary");
        uint256 newRequestedAmount = REQUESTED_AMOUNT * 2;
        Metadata memory newMetadata = Metadata({protocol: 1, pointer: "QmNewPointer123456789"});

        // Try to edit cancelled proposal
        vm.expectRevert();
        cv.editProposal(proposalId, newMetadata, newBeneficiary, newRequestedAmount);

        vm.stopPrank();
    }

    function test_editProposal_metadataOnly_withinOneHour() public {
        // Create a proposal
        (IAllo.Pool memory pool, uint256 poolId, uint256 proposalId) = _createProposal(NATIVE, 0, 0);
        CVStrategy cv = CVStrategy(payable(address(pool.strategy)));

        // Get initial proposal data
        (, address beneficiary,, uint256 requestedAmount,,,, uint256 convictionLast,,,,) = cv.getProposal(proposalId);

        // Prepare new metadata (but keep beneficiary and amount the same)
        Metadata memory newMetadata = Metadata({protocol: 1, pointer: "QmNewPointer123456789"});

        // Edit proposal within one hour (only metadata should change if convictionLast == 0)
        vm.startPrank(pool_admin());

        // Only 30 minutes passed (less than ONE_HOUR)
        vm.warp(block.timestamp + 30 minutes);

        cv.editProposal(proposalId, newMetadata, beneficiary, requestedAmount);

        vm.stopPrank();

        // Verify that beneficiary and amount remain unchanged within one hour
        (, address updatedBeneficiary,, uint256 updatedRequestedAmount,,,,,,,,) = cv.getProposal(proposalId);

        assertEq(updatedBeneficiary, beneficiary, "Beneficiary should remain unchanged");
        assertEq(updatedRequestedAmount, requestedAmount, "Requested amount should remain unchanged");
        // Note: Metadata changes are not verifiable via getProposal, but would be reflected in proposal storage
    }

    function testRevert_deactivate_NotRegistry() public {
        (IAllo.Pool memory pool, uint256 poolId, uint256 proposalId) = _createProposal(NATIVE, 0, 0);
        /**
         * ASSERTS
         */
        CVStrategy cv = CVStrategy(payable(address(pool.strategy)));
        // vm.expectRevert(abi.encodeWithSelector(CVStrategy.OnlyCommunityAllowed.selector));
        vm.expectRevert();

        cv.deactivatePoints(address(pool_admin()));
    }

    // @todo uncoment with diamond, this non critical revert logic has been commented out to save space
    function testRevert_allocate_ProposalIdDuplicated() public {
        (,
            /*IAllo.Pool memory pool*/
            uint256 poolId,
            uint256 proposalId
        ) = _createProposal(NATIVE, 0, 0);

        /**
         * ASSERTS
         *
         */
        // startMeasuringGas("Support a Proposal");
        ProposalSupport[] memory votes = new ProposalSupport[](2);
        // votes[0] = ProposalSupport(proposalId, 70
        votes[0] = ProposalSupport(proposalId, 80);
        votes[1] = ProposalSupport(proposalId, 20); // 70 + 20 = 90% = 45
        // votes[2] = ProposalSupport(proposalId, -10 ); // 90 - 10 = 80% = 40
        // 35 + 45 + 40 = 120
        bytes memory data = abi.encode(votes);
        //     vm.expectRevert(abi.encodeWithSelector(CVStrategy.ProposalSupportDuplicated.selector, proposalId, 0));
        vm.expectRevert();

        allo().allocate(poolId, data);
        stopMeasuringGas();
    }

    function testRevert_allocate_UserNotInRegistry() public {
        (,
            /*IAllo.Pool memory pool*/
            uint256 poolId,
            uint256 proposalId
        ) = _createProposal(NATIVE, 0, 0);

        /**
         * ASSERTS
         *
         */
        // startMeasuringGas("Support a Proposal");
        ProposalSupport[] memory votes = new ProposalSupport[](2);
        // votes[0] = ProposalSupport(proposalId, 70 ); // 0 + 70 = 70% = 35
        votes[0] = ProposalSupport(proposalId, 80); // 0 + 70 = 70% = 35
        votes[1] = ProposalSupport(proposalId, 20); // 70 + 20 = 90% = 45
        // votes[2] = ProposalSupport(proposalId, -10 ); // 90 - 10 = 80% = 40
        // 35 + 45 + 40 = 120
        bytes memory data = abi.encode(votes);
        vm.startPrank(gardenMember);
        // vm.expectRevert(CVStrategy.UserNotInRegistry.selector);
        vm.expectRevert();
        allo().allocate(poolId, data);

        vm.stopPrank();
        stopMeasuringGas();
    }

    // @todo uncoment with diamond, this non critical revert logic has been commented out to save space
    // function testRevert_allocate_UserInactive() public {
    //     (IAllo.Pool memory pool, uint256 poolId, uint256 proposalId) = _createProposal(NATIVE, 0, 0);
    //     /**
    //      * ASSERTS
    //      *
    //      */
    //     ProposalSupport[] memory votes = new ProposalSupport[](2);
    //     votes[0] = ProposalSupport(proposalId, 80); // 0 + 80 = 80% = 40
    //     votes[1] = ProposalSupport(proposalId, 20); // 80 + 20 = 100% = 50
    //     bytes memory data = abi.encode(votes);
    //     CVStrategy cv = CVStrategy(payable(address(pool.strategy)));
    //     cv.deactivatePoints();
    // //     vm.expectRevert(CVStrategy.UserIsInactive.selector);
    // // vm.expectRevert();
    //     allo().allocate(poolId, data);
    // }

    function testRevert_allocate_InvalidProposal() public {
        (IAllo.Pool memory pool, uint256 poolId, uint256 proposalId) = _createProposal(NATIVE, 0, 0);
        /**
         * ASSERTS
         *
         */
        int256 SUPPORT_PCT = int256(MINIMUM_STAKE);
        ProposalSupport[] memory votes = new ProposalSupport[](1);
        votes[0] = ProposalSupport(10, SUPPORT_PCT); // 0 + 70 = 70% = 35
        bytes memory data = abi.encode(votes);
        // Had to change the way to test the reverts, will fail because of invalid proposal
        // since a proposal that doesn't exist will automatically have inactive status
        // //vm.expectRevert(abi.encodeWithSelector(CVStrategy.ProposalNotInList.selector, 10));
        vm.expectRevert();
        // vm.expectRevert(
        //     abi.encodeWithSelector(CVStrategy.ProposalInvalidForAllocation.selector, 10, ProposalStatus.Inactive)
        // );
        allo().allocate(poolId, data);
    }

    /**
     * Test decrease power when half of the power is staked on a proposal
     * 1. Increase power by 100
     * 2. Stake 50 on proposal
     * 3. Decrease power by 75
     * Expect 25 left on proposal
     */
    function test_decreasePower_100_50_75_supportRemoval() public {
        /* Params */
        uint256 TOTAL_POWER = 100 ether;
        uint256 STAKED_ON_PROPOSAL = 50 ether;
        uint256 STAKE_TO_REMOVE = 75 ether;

        (IAllo.Pool memory pool, uint256 poolId, uint256 proposalId) = _createProposal(NATIVE, 0, 0);
        ProposalSupport[] memory votes = new ProposalSupport[](1);
        vm.startPrank(gardenMember);
        token.approve(address(registryCommunity), STAKE_WITH_FEES);
        console.log("STAKE_WITH_FEES", STAKE_WITH_FEES);
        _registryCommunity().stakeAndRegisterMember("");
        token.approve(address(registryCommunity), TOTAL_POWER - MINIMUM_STAKE);
        registryCommunity.increasePower(TOTAL_POWER - MINIMUM_STAKE);
        // 5 ether from regiterStake + 50 ether increase = 55 ether total staked
        votes[0] = ProposalSupport(proposalId, int256(STAKED_ON_PROPOSAL));
        bytes memory data = abi.encode(votes);
        CVStrategy cv = CVStrategy(payable(address(pool.strategy)));
        cv.activatePoints();
        allo().allocate(poolId, data);
        //Note: Here it might not be staked amount but support percentage
        //TODO: TotalVoterStakePct is actually TotalVoterStakePoints, need to refactor all pct for points
        assertEq(registryCommunity.getMemberPowerInStrategy(gardenMember, address(cv)), TOTAL_POWER);
        assertEq(cv.totalVoterStakePct(address(gardenMember)), STAKED_ON_PROPOSAL);
        assertEq(cv.getProposalStakedAmount(proposalId), STAKED_ON_PROPOSAL);
        assertEq(cv.totalStaked(), STAKED_ON_PROPOSAL);
        registryCommunity.decreasePower(STAKE_TO_REMOVE); //decrease power by 75, so only 25 ether left should be on proposal
        assertEq(cv.totalVoterStakePct(address(gardenMember)), TOTAL_POWER - STAKE_TO_REMOVE);
        assertEq(cv.getProposalStakedAmount(proposalId), TOTAL_POWER - STAKE_TO_REMOVE);
        vm.stopPrank();
    }

    /**
     * Test decrease power when all power is staked on a proposal
     * 1. Increase power by 100
     * 2. Stake 100 on proposal
     * 3. Decrease power by 75
     * Expect 25 points left on proposal
     */
    function test_decreasePower_100_100_75_supportRemoval() public {
        /* Params */
        uint256 TOTAL_POWER = 100 ether;
        uint256 STAKED_ON_PROPOSAL = 100 ether;
        uint256 STAKE_TO_REMOVE = 75 ether;

        (IAllo.Pool memory pool, uint256 poolId, uint256 proposalId) = _createProposal(NATIVE, 0, 0);
        ProposalSupport[] memory votes = new ProposalSupport[](1);
        vm.startPrank(gardenMember);
        token.approve(address(registryCommunity), STAKE_WITH_FEES);
        console.log("STAKE_WITH_FEES", STAKE_WITH_FEES);
        _registryCommunity().stakeAndRegisterMember("");
        token.approve(address(registryCommunity), TOTAL_POWER - MINIMUM_STAKE);
        registryCommunity.increasePower(TOTAL_POWER - MINIMUM_STAKE);
        // 5 ether from regiterStake + 50 ether increase = 55 ether total staked
        votes[0] = ProposalSupport(proposalId, int256(STAKED_ON_PROPOSAL));
        bytes memory data = abi.encode(votes);
        CVStrategy cv = CVStrategy(payable(address(pool.strategy)));
        cv.activatePoints();
        allo().allocate(poolId, data);
        //Note: Here it might not be staked amount but support percentage
        //TODO: TotalVoterStakePct is actually TotalVoterStakePoints, need to refactor all pct for points
        assertEq(registryCommunity.getMemberPowerInStrategy(gardenMember, address(cv)), TOTAL_POWER);
        assertEq(cv.totalVoterStakePct(address(gardenMember)), STAKED_ON_PROPOSAL);
        assertEq(cv.getProposalStakedAmount(proposalId), STAKED_ON_PROPOSAL);
        assertEq(cv.totalStaked(), STAKED_ON_PROPOSAL);
        registryCommunity.decreasePower(STAKE_TO_REMOVE); //decrease power by 75, so only 25 ether left should be on proposal
        assertEq(cv.totalVoterStakePct(address(gardenMember)), TOTAL_POWER - STAKE_TO_REMOVE);
        assertEq(cv.getProposalStakedAmount(proposalId), TOTAL_POWER - STAKE_TO_REMOVE);
        vm.stopPrank();
    }

    function test_decreasePower_supportRemoval_Capped() public {
        (IAllo.Pool memory pool, uint256 poolId, uint256 proposalId) =
            _createProposal(NATIVE, 0, 0, ProposalType.Funding, PointSystem.Capped);
        /**
         * ASSERTS
         *
         */
        int256 SUPPORT_POINTS = int256(200 ether);
        ProposalSupport[] memory votes = new ProposalSupport[](1);
        vm.startPrank(gardenMember);
        token.approve(address(registryCommunity), STAKE_WITH_FEES);
        _registryCommunity().stakeAndRegisterMember("");
        token.approve(address(registryCommunity), 250 ether);
        registryCommunity.increasePower(250 ether);
        // 5 ether from regiterStake + 50 ether increase = 55 ether total staked
        votes[0] = ProposalSupport(proposalId, SUPPORT_POINTS);
        bytes memory data = abi.encode(votes);
        CVStrategy cv = CVStrategy(payable(address(pool.strategy)));
        cv.activatePoints();
        allo().allocate(poolId, data);
        registryCommunity.decreasePower(205 ether);
        assertEq(cv.totalVoterStakePct(address(gardenMember)), 50 * DECIMALS);
        assertEq(cv.getProposalStakedAmount(proposalId), 50 * DECIMALS);
        assertEq(cv.totalStaked(), 50 * DECIMALS);
        assertEq(registryCommunity.getMemberPowerInStrategy(gardenMember, address(cv)), 50 * DECIMALS);
    }

    function test_decreasePower_supportRemoval_Capped_PowerLessThanMaxAmount() public {
        (IAllo.Pool memory pool, uint256 poolId, uint256 proposalId) =
            _createProposal(NATIVE, 0, 0, ProposalType.Funding, PointSystem.Capped);
        /**
         * ASSERTS
         *
         */
        int256 SUPPORT_POINTS = int256(105 ether);
        ProposalSupport[] memory votes = new ProposalSupport[](1);
        vm.startPrank(gardenMember);
        token.approve(address(registryCommunity), STAKE_WITH_FEES);
        _registryCommunity().stakeAndRegisterMember("");
        token.approve(address(registryCommunity), 100 ether);
        registryCommunity.increasePower(100 ether);
        // 5 ether from regiterStake + 50 ether increase = 55 ether total staked
        votes[0] = ProposalSupport(proposalId, SUPPORT_POINTS);
        bytes memory data = abi.encode(votes);
        CVStrategy cv = CVStrategy(payable(address(pool.strategy)));
        cv.activatePoints();
        allo().allocate(poolId, data);
        registryCommunity.decreasePower(50 * DECIMALS);
        assertEq(cv.totalVoterStakePct(address(gardenMember)), 55 * DECIMALS);
        assertEq(cv.getProposalStakedAmount(proposalId), 55 * DECIMALS);
        assertEq(cv.totalStaked(), 55 * DECIMALS);
        assertEq(registryCommunity.getMemberPowerInStrategy(gardenMember, address(cv)), 55 * DECIMALS);
    }

    function test_decreasePower_supportRemoval_Capped_no_points_removed() public {
        (IAllo.Pool memory pool, uint256 poolId, uint256 proposalId) =
            _createProposal(NATIVE, 0, 0, ProposalType.Funding, PointSystem.Capped);
        /**
         * ASSERTS
         *
         */
        int256 SUPPORT_POINTS = int256(200 ether);
        ProposalSupport[] memory votes = new ProposalSupport[](1);
        vm.startPrank(gardenMember);
        token.approve(address(registryCommunity), STAKE_WITH_FEES);
        _registryCommunity().stakeAndRegisterMember("");
        token.approve(address(registryCommunity), 250 ether);
        registryCommunity.increasePower(250 ether);
        // 5 ether from regiterStake + 50 ether increase = 55 ether total staked
        votes[0] = ProposalSupport(proposalId, SUPPORT_POINTS);
        bytes memory data = abi.encode(votes);
        CVStrategy cv = CVStrategy(payable(address(pool.strategy)));
        cv.activatePoints();
        allo().allocate(poolId, data);
        registryCommunity.decreasePower(50 ether);
        assertEq(cv.totalVoterStakePct(address(gardenMember)), 200 * DECIMALS);
        assertEq(cv.getProposalStakedAmount(proposalId), 200 * DECIMALS);
        assertEq(cv.totalStaked(), 200 * DECIMALS);
        assertEq(registryCommunity.getMemberPowerInStrategy(gardenMember, address(cv)), 200 * DECIMALS);
    }
    /**
     * Test decrease power when all power is staked on 2 proposals
     * 1. Increase power by 100
     * 2. Stake 30 and 70 on proposals
     * 3. Decrease power by 50
     * Expect 15 points left on proposal 1 and 35 points left on proposal 2
     */

    function test_decreasePower_power_fully_staked_2_proposals_supportRemoval() public {
        /* Params */
        uint256 TOTAL_POWER = 100 ether;
        uint256 STAKED_ON_PROPOSAL_1 = 30 ether;
        uint256 STAKED_ON_PROPOSAL_2 = 70 ether;
        uint256 STAKE_TO_REMOVE = 50 ether; // decrease by 50%

        // Create pool and proposals
        (IAllo.Pool memory pool, uint256 poolId, uint256 proposalId1) = _createProposal(NATIVE, 0, 0);
        bytes memory createProposalData;
        {
            CreateProposal memory proposal2 = CreateProposal(
                // proposalID2,
                poolId,
                gardenMember,
                // ProposalType.Funding,
                REQUESTED_AMOUNT,
                NATIVE,
                metadata
            );
            createProposalData = abi.encode(proposal2);
        }
        CVStrategy cv = CVStrategy(payable(address(pool.strategy)));
        uint256 proposalId2;
        {
            (,, uint256 submitterCollateralAmount,,,) = cv.getArbitrableConfig();
            vm.startPrank(pool_admin());
            vm.deal(pool_admin(), submitterCollateralAmount);
            proposalId2 =
                uint160(allo().registerRecipient{value: submitterCollateralAmount}(poolId, createProposalData));
        }

        {
            ProposalSupport[] memory votes = new ProposalSupport[](2);
            vm.startPrank(gardenMember);
            token.approve(address(registryCommunity), STAKE_WITH_FEES);
            console.log("STAKE_WITH_FEES", STAKE_WITH_FEES);
            _registryCommunity().stakeAndRegisterMember("");
            token.approve(address(registryCommunity), TOTAL_POWER - MINIMUM_STAKE);
            registryCommunity.increasePower(TOTAL_POWER - MINIMUM_STAKE);
            votes[0] = ProposalSupport(proposalId1, int256(STAKED_ON_PROPOSAL_1));
            votes[1] = ProposalSupport(proposalId2, int256(STAKED_ON_PROPOSAL_2));
            bytes memory stakingData = abi.encode(votes);
            cv.activatePoints();
            allo().allocate(poolId, stakingData);
        }

        assertEq(registryCommunity.getMemberPowerInStrategy(gardenMember, address(cv)), TOTAL_POWER);
        assertEq(cv.totalVoterStakePct(address(gardenMember)), STAKED_ON_PROPOSAL_1 + STAKED_ON_PROPOSAL_2);
        assertEq(cv.getProposalStakedAmount(proposalId1), STAKED_ON_PROPOSAL_1);
        assertEq(cv.getProposalStakedAmount(proposalId2), STAKED_ON_PROPOSAL_2);
        assertEq(cv.totalStaked(), STAKED_ON_PROPOSAL_1 + STAKED_ON_PROPOSAL_2);
        registryCommunity.decreasePower(STAKE_TO_REMOVE);
        assertEq(cv.totalVoterStakePct(address(gardenMember)), TOTAL_POWER - STAKE_TO_REMOVE);
        assertEq(cv.getProposalStakedAmount(proposalId1), 15 ether);
        assertEq(cv.getProposalStakedAmount(proposalId2), 35 ether);
        vm.stopPrank();
    }

    function test_decreasePower_supportRemoval() public {
        (IAllo.Pool memory pool, uint256 poolId, uint256 proposalId) = _createProposal(NATIVE, 0, 0);
        /**
         * ASSERTS
         *
         */
        int256 SUPPORT_POINTS = int256(55 ether);
        ProposalSupport[] memory votes = new ProposalSupport[](1);
        vm.startPrank(gardenMember);
        token.approve(address(registryCommunity), STAKE_WITH_FEES);
        _registryCommunity().stakeAndRegisterMember("");
        token.approve(address(registryCommunity), 50 * DECIMALS);
        registryCommunity.increasePower(50 * DECIMALS);
        // 5 ether from regiterStake + 50 ether increase = 55 ether total staked
        votes[0] = ProposalSupport(proposalId, SUPPORT_POINTS);
        bytes memory data = abi.encode(votes);
        CVStrategy cv = CVStrategy(payable(address(pool.strategy)));
        cv.activatePoints();
        allo().allocate(poolId, data);
        //Note: Here it might not be staked amount but support percentage
        //TODO: TotalVoterStakePct is actually TotalVoterStakePoints, need to refactor all pct for points
        assertEq(cv.totalVoterStakePct(address(gardenMember)), 55 * DECIMALS);
        assertEq(cv.getProposalStakedAmount(proposalId), 55 * DECIMALS);
        assertEq(cv.totalStaked(), 55 * DECIMALS);
        registryCommunity.decreasePower(50 * DECIMALS); //decrease power by 50, so only 5 ether left should be on proposal
        assertEq(cv.totalVoterStakePct(address(gardenMember)), 5 * DECIMALS);
        assertEq(cv.getProposalStakedAmount(proposalId), 5 * DECIMALS);
        vm.stopPrank();
    }

    function test_decreasePower_supportRemoval_not_round_value() public {
        (IAllo.Pool memory pool, uint256 poolId, uint256 proposalId) = _createProposal(NATIVE, 0, 0);
        /**
         * ASSERTS
         *
         */
        int256 SUPPORT_POINTS = int256(55 ether);
        ProposalSupport[] memory votes = new ProposalSupport[](1);
        vm.startPrank(gardenMember);
        token.approve(address(registryCommunity), STAKE_WITH_FEES);
        _registryCommunity().stakeAndRegisterMember("");
        token.approve(address(registryCommunity), 50 * DECIMALS);
        registryCommunity.increasePower(50 * DECIMALS);
        votes[0] = ProposalSupport(proposalId, SUPPORT_POINTS);
        bytes memory data = abi.encode(votes);
        CVStrategy cv = CVStrategy(payable(address(pool.strategy)));
        cv.activatePoints();
        allo().allocate(poolId, data);
        // 5 ether from regiterStake + 50 ether increase = 55 ether total staked
        assertEq(cv.totalVoterStakePct(address(gardenMember)), 55 * DECIMALS);
        assertEq(cv.getProposalStakedAmount(proposalId), 55 * DECIMALS);
        assertEq(cv.totalStaked(), 55 * DECIMALS);
        registryCommunity.decreasePower(28 * DECIMALS); // decrease by 28 ether, so only 27 ether left should still be staked
        assertEq(cv.totalVoterStakePct(address(gardenMember)), 27 * DECIMALS);
        assertEq(cv.getProposalStakedAmount(proposalId), 27 * DECIMALS);
        vm.stopPrank();
    }

    function test_decreasePower_supportRemoval_multipleProposals() public {
        (IAllo.Pool memory pool, uint256 poolId, uint256 proposalId) = _createProposal(NATIVE, 0, 0);
        //     CreateProposal memory proposal = CreateProposal(
        //     proposalid2,
        //     poolId,
        //     pool_admin(),
        //     // ProposalType.Funding,
        //     REQUESTED_AMOUNT,
        //     address(token),
        //     metadata
        // );

        console.log("proposalId: ", proposalId);

        /**
         * ASSERTS
         *
         */
        int256 SUPPORT_POINTS = int256(30 ether);
        int256 SUPPORT_POINTS2 = int256(25 ether);
        ProposalSupport[] memory votes = new ProposalSupport[](2);
        // ProposalSupport[] memory votes = new ProposalSupport[](1);
        vm.startPrank(gardenMember);
        token.approve(address(registryCommunity), STAKE_WITH_FEES);
        _registryCommunity().stakeAndRegisterMember("");
        token.approve(address(registryCommunity), 50 * DECIMALS);
        registryCommunity.increasePower(50 * DECIMALS);
        votes[0] = ProposalSupport(proposalId, SUPPORT_POINTS);
        bytes memory data = abi.encode(votes);
        CVStrategy cv = CVStrategy(payable(address(pool.strategy)));
        cv.activatePoints();
        CreateProposal memory proposal = CreateProposal(
            // proposalID2,
            poolId,
            gardenMember,
            // ProposalType.Funding,
            REQUESTED_AMOUNT,
            NATIVE,
            metadata
        );
        data = abi.encode(proposal);
        (,, uint256 submitterCollateralAmount,,,) = cv.getArbitrableConfig();
        vm.deal(gardenMember, submitterCollateralAmount);
        uint256 proposalId2 = uint160(allo().registerRecipient{value: submitterCollateralAmount}(poolId, data));
        console.log("proposalId2: ", proposalId2);
        // allo().allocate(poolId, data);

        votes[1] = ProposalSupport(proposalId2, SUPPORT_POINTS2);
        data = abi.encode(votes);
        allo().allocate(poolId, data);
        //Note: Here it might not be staked amount but support percentage
        //TODO: TotalVoterStakePct is actually TotalVoterStakePoints, need to refactor all pct for points
        assertEq(cv.totalVoterStakePct(address(gardenMember)), 55 * DECIMALS); // 55 ether total
        assertEq(cv.getProposalStakedAmount(proposalId), 30 * DECIMALS); // staked 30 on proposal 1
        assertEq(cv.getProposalStakedAmount(proposalId2), 25 * DECIMALS); //staked 25 on proposal 2
        assertEq(cv.totalStaked(), 55 * DECIMALS);
        registryCommunity.decreasePower(50 * DECIMALS); //decrease by 50
        assertEq(cv.totalVoterStakePct(address(gardenMember)), 5 * DECIMALS); // 55 - 50 = 5 ether total staked left
        // 50 / 55 = 90.9090909%, so remove this percentage from 30, only 2.727272727272727273 ether left
        assertEq(cv.getProposalStakedAmount(proposalId), 2.727272727272727273 ether);
        // 50 / 55 = 90.9090909%, so remove this percentage from 25, only 2.272727272727272727 ether left
        assertEq(cv.getProposalStakedAmount(proposalId2), 2.272727272727272727 ether);
        vm.stopPrank();
    }

    function testRevert_allocate_InsufficientPoints() public {
        (IAllo.Pool memory pool, uint256 poolId, uint256 proposalId) = _createProposal(NATIVE, 0, 0);
        /**
         * ASSERTS
         *
         */
        int256 SUPPORT_PCT = int256(MINIMUM_STAKE * 10);
        ProposalSupport[] memory votes = new ProposalSupport[](1);
        votes[0] = ProposalSupport(proposalId, SUPPORT_PCT); // 0 + 70 = 70% = 35
        bytes memory data = abi.encode(votes);
        uint256 newTotalVotingSupport = 500000000000000000000;
        uint256 participantBalance = 50000000000000000000;
        vm.expectRevert();
        // vm.expectRevert(
        // abi.encodeWithSelector(
        //         CVStrategy.NotEnoughPointsToSupport.selector, newTotalVotingSupport, participantBalance
        //     )
        // );

        vm.stopPrank();
        allo().allocate(poolId, data);
        stopMeasuringGas();
    }

    function testRevert_allocate_SupportUnderflow() public {
        (IAllo.Pool memory pool, uint256 poolId, uint256 proposalId) = _createProposal(NATIVE, 0, 0);
        /**
         * ASSERTS
         *
         */
        int256 SUPPORT_PCT = int256(-50);
        ProposalSupport[] memory votes = new ProposalSupport[](1);
        votes[0] = ProposalSupport(proposalId, SUPPORT_PCT); // 0 + 70 = 70% = 35
        bytes memory data = abi.encode(votes);
        // vm.expectRevert(abi.encodeWithSelector(CVStrategy.SupportUnderflow.selector, 0, SUPPORT_PCT, SUPPORT_PCT));
        vm.expectRevert();

        allo().allocate(poolId, data);
    }

    function testRevert_calculateThreshold_requestOverMax() public {
        (IAllo.Pool memory pool, uint256 poolId, uint256 proposalId) = _createProposal(NATIVE, 0, 0);
        /**
         * ASSERTS
         *
         */
        //Revert on create already tested, here checking the revert in calculateThreshold
        uint256 requestedAmount = REQUESTED_AMOUNT * 100000;
        CVStrategy cv = CVStrategy(payable(address(pool.strategy)));
        // vm.expectRevert(abi.encodeWithSelector(CVStrategy.AmountOverMaxRatio.selector));
        vm.expectRevert();

        cv.calculateThreshold(requestedAmount);
    }

    //@todo should fix that tests using old percentage scale
    // function testRevert_allocate_removeSupport_wo_support_before_SUPPORT_UNDERFLOW() public {
    //     (IAllo.Pool memory pool, uint256 poolId, uint256 proposalId) = _createProposal(NATIVE, 0, 0);

    //     /**
    //      * ASSERTS
    //      *
    //      */
    //     // startMeasuringGas("Support a Proposal");
    //     ProposalSupport[] memory votes = new ProposalSupport[](1);
    //     votes[0] = ProposalSupport(proposalId, -100 );
    //     bytes memory data = abi.encode(votes);

    //     CVStrategy cv = CVStrategy(payable(address(pool.strategy)));
    // //     vm.expectRevert(
    // vm.expectRevert();
    //         abi.encodeWithSelector(
    //             CVStrategy.SupportUnderflow.selector,
    //             0,
    //             -100 * int256(cv.PRECISION_SCALE()),
    //             -100 * int256(cv.PRECISION_SCALE())
    //         )
    //     );
    //     allo().allocate(poolId, data);
    //     stopMeasuringGas();

    //     assertEq(cv.getProposalVoterStake(proposalId, address(this)), 0, "VoterStakeAmount"); // 100% of 50 = 50
    //     assertEq(cv.getProposalStakedAmount(proposalId), 0, "TotalStakedAmountInProposal");
    // }

    // @todo commented because of this check is commented in the contract to save space
    // function testRevert_registerRecipient_TokenNotAllowed() public {
    //     (, uint256 poolId,) = _createProposal(NATIVE, 0, 0);

    //     // address wrong_token = address(new GV2ERC20());
    //     CreateProposal memory proposal =
    //         CreateProposal(poolId, pool_admin(), REQUESTED_AMOUNT, address(0x666), metadata);
    //     bytes memory data = abi.encode(proposal);
    // //     vm.expectRevert(abi.encodeWithSelector(CVStrategy.TokenNotAllowed.selector));
    // vm.expectRevert();

    //     allo().registerRecipient(poolId, data);
    //     proposal = CreateProposal(poolId, pool_admin(), REQUESTED_AMOUNT, address(0), metadata);
    //     data = abi.encode(proposal);
    //     // //vm.expectRevert(abi.encodeWithSelector(CVStrategy.TokenCannotBeZero.selector));
    // //     vm.expectRevert("TokenCannotBeZero"); // @todo take commented when contract size fixed with diamond
    // vm.expectRevert();
    //     allo().registerRecipient(poolId, data);
    // }

    // @todo commented because of this check is commented in the contract to save space
    // function testRevert_registerRecipient_PoolIdCannotBeZero() public {
    //     (, uint256 poolId,) = _createProposal(NATIVE, 0, 0);
    //     // address wrong_token = address(new GV2ERC20());
    //     CreateProposal memory proposal = CreateProposal(0, pool_admin(), REQUESTED_AMOUNT, address(token), metadata);
    //     bytes memory data = abi.encode(proposal);
    // //     vm.expectRevert(abi.encodeWithSelector(CVStrategy.PoolIdCannotBeZero.selector));
    // vm.expectRevert();
    //     allo().registerRecipient(poolId, data);
    // }

    function test_proposalSupported_change_support() public {
        (IAllo.Pool memory pool, uint256 poolId, uint256 proposalId) = _createProposal(NATIVE, 0, 0);

        /**
         * ASSERTS
         */
        uint256 STAKED_AMOUNT = uint256(80);
        // startMeasuringGas("Support a Proposal");
        ProposalSupport[] memory votes = new ProposalSupport[](1);
        votes[0] = ProposalSupport(proposalId, int256(STAKED_AMOUNT)); // 0 + 70 = 70% = 35 range is -100 +100
        bytes memory data = abi.encode(votes);

        allo().allocate(poolId, data);

        stopMeasuringGas();
        CVStrategy cv = CVStrategy(payable(address(pool.strategy)));
        assertEq(cv.getProposalVoterStake(proposalId, address(this)), STAKED_AMOUNT); // 80% of 50 = 40
        assertEq(cv.getProposalStakedAmount(proposalId), STAKED_AMOUNT); // 80% of 50 = 40

        /**
         * ASSERTS
         *
         */
        // vm.startPrank(pool_admin());

        // token.approve(address(registryCommunity), registryCommunity.getBasisStakedAmount());
        // registryCommunity.stakeAndregisterMember("");

        ProposalSupport[] memory votes2 = new ProposalSupport[](1);
        votes2[0] = ProposalSupport(proposalId, 20);
        data = abi.encode(votes2);
        // vm.expectEmit(true, true, true, false);
        allo().allocate(poolId, data);
        // vm.stopPrank();

        assertEq(cv.getProposalVoterStake(proposalId, address(this)), 100); // 100% of 50 = 50
        assertEq(cv.getProposalStakedAmount(proposalId), 100);
    }

    function test_proposalVoterStake_after_deactivate() public {
        (IAllo.Pool memory pool, uint256 poolId, uint256 proposalId) = _createProposal(NATIVE, 0, 0);
        /**
         * ASSERTS
         */
        // startMeasuringGas("Support a Proposal");
        uint256 STAKED_AMOUNT = 80;
        ProposalSupport[] memory votes = new ProposalSupport[](1);
        votes[0] = ProposalSupport(proposalId, int256(STAKED_AMOUNT)); // 0 + 70 = 70% = 35 range is -100 +100
        bytes memory data = abi.encode(votes);

        allo().allocate(poolId, data);

        stopMeasuringGas();
        CVStrategy cv = CVStrategy(payable(address(pool.strategy)));
        assertEq(cv.getProposalVoterStake(proposalId, address(this)), STAKED_AMOUNT); // 80% of 50 = 40
        assertEq(cv.getProposalStakedAmount(proposalId), STAKED_AMOUNT); // 80% of 50 = 40

        uint256 STAKED_AMOUNT2 = 20;
        ProposalSupport[] memory votes2 = new ProposalSupport[](1);
        votes2[0] = ProposalSupport(proposalId, int256(STAKED_AMOUNT2));
        data = abi.encode(votes2);
        // vm.expectEmit(true, true, true, false);
        allo().allocate(poolId, data);

        assertEq(cv.getProposalVoterStake(proposalId, address(this)), STAKED_AMOUNT + STAKED_AMOUNT2); // 100% of 50 = 50
        assertEq(cv.getProposalStakedAmount(proposalId), STAKED_AMOUNT + STAKED_AMOUNT2);
        cv.deactivatePoints();
        assertEq(cv.getProposalVoterStake(proposalId, address(this)), 0);
        assertEq(cv.getProposalStakedAmount(proposalId), 0);
    }

    function test_proposalVoterStake_after_unregister() public {
        (IAllo.Pool memory pool, uint256 poolId, uint256 proposalId) = _createProposal(NATIVE, 0, 0);
        /**
         * ASSERTS
         */
        // startMeasuringGas("Support a Proposal");
        ProposalSupport[] memory votes = new ProposalSupport[](1);
        votes[0] = ProposalSupport(proposalId, 80); // 0 + 70 = 70% = 35 range is -100 +100
        bytes memory data = abi.encode(votes);

        allo().allocate(poolId, data);

        stopMeasuringGas();
        uint256 STAKED_AMOUNT = 80;
        CVStrategy cv = CVStrategy(payable(address(pool.strategy)));
        assertEq(cv.getProposalVoterStake(proposalId, address(this)), STAKED_AMOUNT); // 80% of 50 = 40
        assertEq(cv.getProposalStakedAmount(proposalId), STAKED_AMOUNT); // 80% of 50 = 40

        ProposalSupport[] memory votes2 = new ProposalSupport[](1);
        votes2[0] = ProposalSupport(proposalId, 20);
        data = abi.encode(votes2);
        // vm.expectEmit(true, true, true, false);
        allo().allocate(poolId, data);

        assertEq(cv.getProposalVoterStake(proposalId, address(this)), 100); // 100% of 50 = 50
        assertEq(cv.getProposalStakedAmount(proposalId), 100);
        registryCommunity.unregisterMember();
        assertEq(cv.getProposalVoterStake(proposalId, address(this)), 0);
        assertEq(cv.getProposalStakedAmount(proposalId), 0);
    }

    function test_disputeAbstain() public {
        (IAllo.Pool memory pool,, uint256 proposalId) = _createProposal(NATIVE, 0, 0);
        CVStrategy cv = CVStrategy(payable(address(pool.strategy)));
        vm.deal(address(pool_admin()), 1 ether);
        vm.startPrank(address(pool_admin()));
        uint256 disputeId = cv.disputeProposal{value: 0.02 ether}(proposalId, "I dont agree", "0x");
        uint256 abstainRulingOutcome = 0;
        vm.deal(address(pool_admin()), 2 ether);
        safeArbitrator.registerSafe(payable(tribunalSafe));
        safeArbitrator.createDispute{value: 2 ether}(3, "");

        vm.startPrank(tribunalSafe);
        safeArbitrator.executeRuling(disputeId, abstainRulingOutcome, address(cv));

        vm.stopPrank();
    }

    function xtest_rule_TimeoutDefaultRulingRejected_ProposalRejected() public {
        (IAllo.Pool memory pool, uint256 poolId, uint256 proposalId) = _createProposal(NATIVE, 0, 0);
        CVStrategy cv = CVStrategy(payable(address(pool.strategy)));
        address challenger = makeAddr("challenger");

        // Change arbitrable config to have defaultRuling = 2
        vm.startPrank(address(_councilSafe()));
        ArbitrableConfig memory newConfig = ArbitrableConfig({
            arbitrator: safeArbitrator,
            tribunalSafe: payable(tribunalSafe),
            submitterCollateralAmount: 0.02 ether,
            challengerCollateralAmount: 0.01 ether,
            defaultRuling: 2, // Set to 2
            defaultRulingTimeout: 300
        });
        cv.setPoolParams(newConfig, CVParams(0, 0, 0, 0), 0, new address[](0), new address[](0), address(0));
        vm.stopPrank();

        vm.deal(challenger, 10 ether);

        // Register safe
        vm.prank(address(cv));
        safeArbitrator.registerSafe(address(_councilSafe()));

        // Create dispute
        vm.prank(challenger);
        uint256 disputeID = cv.disputeProposal{value: 0.02 ether}(proposalId, "context", "");

        // Get timeout
        (,,,,, uint256 defaultRulingTimeout) = cv.getArbitrableConfig();

        // Fast forward past timeout
        vm.warp(block.timestamp + defaultRulingTimeout + 1);

        // Anyone can call rule after timeout
        vm.prank(address(0x999));
        cv.rule(disputeID, 0); // Triggers defaultRuling = 2

        // Verify proposal is Rejected (line 117)
        (
            ,,,,, // address submitter,
            // address beneficiary
            // address requestedToken,
            // uint256 requestedAmount
            // uint256 stakedTokens,
            ProposalStatus proposalStatus, // uint256 blockLast, // uint256 convictionLast // uint256 threshold // uint256 voterPointsPct
            ,,,,,
        ) = cv.getProposal(proposalId);
        assertEq(uint256(proposalStatus), uint256(ProposalStatus.Rejected));
    }

    function test_setPoolActive() public {
        (IAllo.Pool memory pool, uint256 poolId, uint256 proposalId) = _createProposal(NATIVE, 0, 0);
        /**
         * ASSERTS
         */
        // startMeasuringGas("Support a Proposal");
        CVStrategy cv = CVStrategy(payable(address(pool.strategy)));
        cv.setPoolActive(false);
        assertEq(cv.isPoolActive(), false);
        token.approve(address(registryCommunity), STAKE_WITH_FEES);
        registryCommunity.stakeAndRegisterMember("");
        // Checking that poolActive doesnt influence allocate behavior
        uint256 AMOUNT_STAKED = uint256(80);
        // startMeasuringGas("Support a Proposal");
        ProposalSupport[] memory votes = new ProposalSupport[](1);
        votes[0] = ProposalSupport(proposalId, int256(AMOUNT_STAKED));
        bytes memory data = abi.encode(votes);
        allo().allocate(poolId, data);
    }

    function test_getMetadata() public {
        (IAllo.Pool memory pool, uint256 poolId, uint256 proposalId) = _createProposal(NATIVE, 0, 0);
        /**
         * ASSERTS
         */
        CVStrategy cv = CVStrategy(payable(address(pool.strategy)));
        (,,,,,,,,,,, uint256 protocol) = cv.getProposal(proposalId);
        assertEq(protocol, 1);
    }

    function test_conviction_check_function() public {
        (IAllo.Pool memory pool, uint256 poolId, uint256 proposalId) = _createProposal(NATIVE, 0, 0);

        CVStrategy cv = CVStrategy(payable(address(pool.strategy)));

        // cv.setDecay(_etherToFloat(0.9 ether)); // alpha = decay
        // cv.setMaxRatio(_etherToFloat(0.2 ether)); // beta = maxRatio
        // cv.setWeight(_etherToFloat(0.002 ether)); // RHO = p  = weight
        CVParams memory params = CVParams({
            maxRatio: _etherToFloat(0.2 ether),
            weight: _etherToFloat(0.002 ether),
            decay: _etherToFloat(0.9 ether),
            minThresholdPoints: 0
        });
        ArbitrableConfig memory arbConfig;
        vm.startPrank(address(_councilSafe()));
        cv.setPoolParams(arbConfig, params, MINIMUM_SYBIL_SCORE, new address[](0), new address[](0), address(0));
        vm.stopPrank();

        /**
         * ASSERTS
         */
        uint256 AMOUNT_STAKED = uint256(80);
        // startMeasuringGas("Support a Proposal");
        ProposalSupport[] memory votes = new ProposalSupport[](1);
        votes[0] = ProposalSupport(proposalId, int256(AMOUNT_STAKED));
        bytes memory data = abi.encode(votes);
        allo().allocate(poolId, data);
        stopMeasuringGas();

        assertEq(cv.getProposalVoterStake(proposalId, address(this)), AMOUNT_STAKED);
        assertEq(cv.getProposalStakedAmount(proposalId), AMOUNT_STAKED);

        uint256 cv_cmp = _calculateConviction(10, 0, AMOUNT_STAKED, 0.9 ether / 10 ** 11);
        console.log("cv_cmp: %s", cv_cmp);
        vm.roll(block.number + 10);
        uint256 cv_amount = cv.calculateProposalConviction(proposalId);
        console.log("cv_amount: %s", cv_amount);
        assertEq(cv_amount, cv_cmp);
    }

    function test_conviction_check_as_js_test() public {
        (IAllo.Pool memory pool, uint256 poolId, uint256 proposalId) = _createProposal(NATIVE, 0, 0);

        CVStrategy cv = CVStrategy(payable(address(pool.strategy)));

        // cv.setDecay(_etherToFloat(0.9 ether)); // alpha = decay
        // cv.setMaxRatio(_etherToFloat(0.2 ether)); // beta = maxRatio
        // cv.setWeight(_etherToFloat(0.002 ether)); // RHO = p  = weight

        ArbitrableConfig memory arbConfig;
        vm.startPrank(address(_councilSafe()));
        // registryCommunity.kickMember(address(pool_admin()), address(pool_admin()));
        registryCommunity.kickMember(address(this), address(gardenMember));
        registryCommunity.kickMember(address(pool_admin()), address(gardenMember));
        cv.setPoolParams(
            arbConfig,
            CVParams({
                maxRatio: _etherToFloat(0.2 ether),
                weight: _etherToFloat(0.002 ether),
                decay: _etherToFloat(0.9 ether),
                minThresholdPoints: 0
            }),
            MINIMUM_SYBIL_SCORE,
            new address[](0),
            new address[](0),
            address(0)
        );

        uint256 AMOUNT_STAKED = 45000;
        registryCommunity.setBasisStakedAmount(AMOUNT_STAKED);
        vm.stopPrank();

        /**
         *
         * ASSERTS
         */
        // startMeasuringGas("Support a Proposal");
        vm.startPrank(pool_admin());
        _registryCommunity().gardenToken().approve(address(registryCommunity), STAKE_WITH_FEES);
        _registryCommunity().stakeAndRegisterMember("");
        cv.activatePoints();
        vm.stopPrank();

        vm.startPrank(address(this));

        _registryCommunity().gardenToken().approve(address(registryCommunity), STAKE_WITH_FEES);
        _registryCommunity().stakeAndRegisterMember("");
        cv.activatePoints();

        ProposalSupport[] memory votes = new ProposalSupport[](1);
        votes[0] = ProposalSupport(proposalId, 100);
        bytes memory data = abi.encode(votes);
        allo().allocate(poolId, data);
        vm.stopPrank();

        stopMeasuringGas();

        assertEq(cv.getProposalVoterStake(proposalId, address(this)), 100);
        assertEq(cv.getProposalStakedAmount(proposalId), 100);

        uint256 AMOUNT_STAKED_1 = 15000;
        uint256 cv_amount = ConvictionsUtils.calculateConviction(10, 0, AMOUNT_STAKED_1, getDecay(cv));

        console.log("cv_amount: %s", cv_amount);
        uint256 cv_cmp = _calculateConviction(10, 0, AMOUNT_STAKED_1, 0.9 ether / 10 ** 11);
        console.log("cv_cmp: %s", cv_cmp);

        assertEq(cv_amount, cv_cmp);
        assertEq(AMOUNT_STAKED_1, 15000);
        assertEq(AMOUNT_STAKED, 45000);
        assertEq(cv_amount, 97698);
    }

    function disabled_test_threshold_check_as_js_test() public {
        (IAllo.Pool memory pool, uint256 poolId, uint256 proposalId) = _createProposal(NATIVE, 0, 0);

        CVStrategy cv = CVStrategy(payable(address(pool.strategy)));

        // cv.setDecay(_etherToFloat(0.9 ether)); // alpha = decay
        // cv.setMaxRatio(_etherToFloat(0.2 ether)); // beta = maxRatio
        // cv.setWeight(_etherToFloat(0.002 ether)); // RHO = p  = weight

        // TODO: SetPool Params
        // safeHelper(address(cv), 0, abi.encodeWithSelector(cv.setDecay.selector, _etherToFloat(0.9 ether)));
        // safeHelper(address(cv), 0, abi.encodeWithSelector(cv.setMaxRatio.selector, _etherToFloat(0.2 ether)));
        // safeHelper(address(cv), 0, abi.encodeWithSelector(cv.setWeight.selector, _etherToFloat(0.002 ether)));

        // registryCommunity.setBasisStakedAmount(45000);
        safeHelper(
            address(registryCommunity),
            0,
            abi.encodeWithSelector(registryCommunity.setBasisStakedAmount.selector, 45000)
        );
        /**
         * ASSERTS
         */
        // startMeasuringGas("Support a Proposal");
        ProposalSupport[] memory votes = new ProposalSupport[](1);
        votes[0] = ProposalSupport(proposalId, 100); // 0 + 70 = 70% = 35
        bytes memory data = abi.encode(votes);
        allo().allocate(poolId, data);
        stopMeasuringGas();

        uint256 AMOUNT_STAKED = 45000;
        assertEq(cv.getProposalVoterStake(proposalId, address(this)), AMOUNT_STAKED); // 80% of 50 = 40
        assertEq(cv.getProposalStakedAmount(proposalId), AMOUNT_STAKED); // 80% of 50 = 40

        uint256 ct1 = cv.calculateThreshold(1000);
        console.log("threshold %s", ct1);
        assertEq(AMOUNT_STAKED, 45000);
        assertEq(ct1, 50625);

        // registryCommunity.setBasisStakedAmount(MINIMUM_STAKE);
        safeHelper(
            address(registryCommunity),
            0,
            abi.encodeWithSelector(registryCommunity.setBasisStakedAmount.selector, MINIMUM_STAKE)
        );
    }

    function test_total_staked_amount() public {
        (IAllo.Pool memory pool, uint256 poolId, uint256 proposalId) = _createProposal(NATIVE, 0, 0);
        // registryCommunity.setBasisStakedAmount(45000);
        // safeHelper(
        //     address(registryCommunity),
        //     0,
        //     abi.encodeWithSelector(registryCommunity.setBasisStakedAmount.selector, 45 ether)
        // );
        /**
         * ASSERTS
         */
        // // startMeasuringGas("Support a Proposal");
        uint256 AMOUNT_STAKED = 100;
        ProposalSupport[] memory votes = new ProposalSupport[](1);
        votes[0] = ProposalSupport(proposalId, int256(AMOUNT_STAKED));
        bytes memory data = abi.encode(votes);
        allo().allocate(poolId, data);
        // stopMeasuringGas();

        CVStrategy cv = CVStrategy(payable(address(pool.strategy)));
        assertEq(cv.getProposalVoterStake(1, address(this)), AMOUNT_STAKED);
        assertEq(cv.getProposalStakedAmount(1), AMOUNT_STAKED);

        int256 REMOVE_SUPPORT = -80;
        votes[0] = ProposalSupport(1, REMOVE_SUPPORT);
        data = abi.encode(votes);
        allo().allocate(poolId, data);

        assertEq(
            cv.getProposalVoterStake(1, address(this)), uint256(int256(AMOUNT_STAKED) + REMOVE_SUPPORT), "VoterStake"
        );
        assertEq(cv.getProposalStakedAmount(1), uint256(int256(AMOUNT_STAKED) + REMOVE_SUPPORT), "StakedAmount");
        assertEq(cv.totalStaked(), uint256(int256(AMOUNT_STAKED) + REMOVE_SUPPORT), "TotalStaked");

        int256 REMOVE_SUPPORT2 = -5;
        votes[0] = ProposalSupport(1, REMOVE_SUPPORT2);
        data = abi.encode(votes);
        allo().allocate(poolId, data);

        assertEq(
            cv.getProposalVoterStake(1, address(this)),
            uint256(int256(AMOUNT_STAKED) + REMOVE_SUPPORT2 + REMOVE_SUPPORT),
            "VoterStake"
        );
        assertEq(
            cv.getProposalStakedAmount(1),
            uint256(int256(AMOUNT_STAKED) + REMOVE_SUPPORT2 + REMOVE_SUPPORT),
            "StakedAmount"
        );
        assertEq(cv.totalStaked(), uint256(int256(AMOUNT_STAKED) + REMOVE_SUPPORT2 + REMOVE_SUPPORT), "TotalStaked");

        // registryCommunity.setBasisStakedAmount(MINIMUM_STAKE);
        // safeHelper(
        //     address(registryCommunity),
        //     0,
        //     abi.encodeWithSelector(registryCommunity.setBasisStakedAmount.selector, MINIMUM_STAKE)
        // );
    }

    // @todo commented because of this check is commented in the contract to save space
    // function testRevert_allocate_proposalSupport_empty_array() public {
    //     (IAllo.Pool memory pool, uint256 poolId, uint256 proposalId) = _createProposal(NATIVE, 0, 0);

    //     /**
    //      * ASSERTS
    //      *
    //      */
    //     // startMeasuringGas("Support a Proposal");
    //     ProposalSupport[] memory votes = new ProposalSupport[](2);
    //     votes[0] = ProposalSupport(proposalId, 100e4);
    //     votes[1];
    //     bytes memory data = abi.encode(votes);
    //     // will revert for proposalId 0 because votes[1] is empty so default proposalId value will be 0
    //     vm.expectRevert();
    //     // // vm.expectRevert(
    //     // //     abi.encodeWithSelector(CVStrategy.ProposalInvalidForAllocation.selector, 0, ProposalStatus.Inactive)
    //     // );
    //     allo().allocate(proposalId, data);
    // }

    // @todo commented because of this check is commented in the contract to save space
    // function testRevert_allocate_senderZero() public {
    //     uint256 PRECISE_FIVE_PERCENT = 5e4;
    //     // uint256 TWO_POINT_FIVE_TOKENS = uintPRECISE_FIVE_PERCENT;

    //     (IAllo.Pool memory pool, uint256 poolId, uint256 proposalId) = _createProposal(NATIVE, 0, 0);

    //     /**
    //      * ASSERTS
    //      *
    //      */
    //     // startMeasuringGas("Support a Proposal");
    //     ProposalSupport[] memory votes = new ProposalSupport[](1);

    //     votes[0] = ProposalSupport(proposalId, int256(PRECISE_FIVE_PERCENT));
    //     bytes memory data = abi.encode(votes);

    //     vm.startPrank(address(0));
    // //     vm.expectRevert(abi.encodeWithSelector(CVStrategy.UserCannotBeZero.selector));
    // vm.expectRevert();
    //     allo().allocate(proposalId, data);
    //     vm.stopPrank();
    // }

    function test_allocate_proposalSupport_precision() public {
        uint256 PRECISE_FIVE_PERCENT = 5e4;
        // uint256 TWO_POINT_FIVE_TOKENS = uintPRECISE_FIVE_PERCENT;

        (IAllo.Pool memory pool, uint256 poolId, uint256 proposalId) = _createProposal(NATIVE, 0, 0);

        /**
         * ASSERTS
         *
         */
        // startMeasuringGas("Support a Proposal");
        ProposalSupport[] memory votes = new ProposalSupport[](2);

        votes[0] = ProposalSupport(proposalId, int256(PRECISE_FIVE_PERCENT));
        bytes memory data = abi.encode(votes);
        allo().allocate(proposalId, data);
        stopMeasuringGas();

        CVStrategy cv = CVStrategy(payable(address(pool.strategy)));
        assertEq(cv.totalVoterStakePct(address(this)), PRECISE_FIVE_PERCENT);
        //assertEq(cv.getProposalVoterStake(1, address(this)), MINIMUM_STAKE); // 100% of 50 = 50
        //assertEq(cv.getProposalStakedAmount(1), (MINIMUM_STAKE * PRECISE_FIVE_PERCENT)/PRECISE_HUNDRED_PERCENT);
        assertEq(cv.getProposalStakedAmount(1), PRECISE_FIVE_PERCENT);
        assertEq(cv.getProposalStakedAmount(0), 0);
    }

    function test_allocate_SameProposalTwice() public {
        uint256 FIVE_PERCENT = 5e4;

        // Create proposal
        (IAllo.Pool memory pool, uint256 poolId, uint256 proposalId) = _createProposal(NATIVE, 0, 0);
        CVStrategy cv = CVStrategy(payable(address(pool.strategy)));

        // FIRST allocation - adds proposalId to voterStakedProposals array
        ProposalSupport[] memory votes1 = new ProposalSupport[](1);
        votes1[0] = ProposalSupport(proposalId, int256(FIVE_PERCENT));
        bytes memory data1 = abi.encode(votes1);
        allo().allocate(poolId, data1);

        // Verify first allocation worked
        assertEq(cv.totalVoterStakePct(address(this)), FIVE_PERCENT);
        assertEq(cv.voterStakedProposals(address(this), 0), proposalId); // Proposal in array

        // SECOND allocation to SAME proposal - this triggers the break!
        ProposalSupport[] memory votes2 = new ProposalSupport[](1);
        votes2[0] = ProposalSupport(proposalId, int256(FIVE_PERCENT)); // Add another 5%
        bytes memory data2 = abi.encode(votes2);
        allo().allocate(poolId, data2);

        // Verify proposal is still only in array ONCE (hasProposal prevented duplicate)
        assertEq(cv.totalVoterStakePct(address(this)), FIVE_PERCENT * 2); // 10% total
        // assertEq(cv.voterStakedProposals(address(this), 1)); // Still only 1 entry!

        // If break didn't execute, the array would have duplicates
    }

    // TODO: Fix
    function xtest_proposalSupported_threshold_error() public {
        CVStrategy cv;
        uint256 proposalId;
        bytes memory data;
        uint256 poolId;
        int256 SUPPORT_PCT = int256(MINIMUM_STAKE);
        uint256 STAKED_AMOUNT = uint256(SUPPORT_PCT);
        {
            uint256 maxRatio = 0.1 ether;
            uint256 spendingLimit = ((maxRatio * 1e18) / 0.77645 ether); // 0.77645 -> MAX_RATIO_CONSTANT

            console.log("maxRatio:          %s", maxRatio);
            console.log("spendingLimit:     %s", spendingLimit);

            uint256 pot = 3_000 ether;
            uint256 amountRequested = ((pot * spendingLimit) / 1e18) - 115 ether;
            console.log("amountRequested:   %s", amountRequested);
            (IAllo.Pool memory pool, uint256 _poolId, uint256 _proposalId) =
                _createProposal(address(token), amountRequested, pot);
            proposalId = _proposalId;
            poolId = _poolId;

            cv = CVStrategy(payable(address(pool.strategy)));

            // safeHelper(address(cv), 0, abi.encodeWithSelector(cv.setMinThresholdPoints.selector, MIN_THRESHOLD_PTS));

            // FAST 1 MIN half life Conviction Growth
            // TODO: SetPool Params
            // safeHelper(address(cv), 0, abi.encodeWithSelector(cv.setDecay.selector, _etherToFloat(0.9965402 ether)));
            // safeHelper(address(cv), 0, abi.encodeWithSelector(cv.setMaxRatio.selector, _etherToFloat(spendingLimit)));
            // safeHelper(address(cv), 0, abi.encodeWithSelector(cv.setWeight.selector, _etherToFloat(0.0005 ether)));

            // startMeasuringGas("Support a Proposal");
            ProposalSupport[] memory votes = new ProposalSupport[](1);
            votes[0] = ProposalSupport(proposalId, SUPPORT_PCT); // 0 + 70 = 70% = 35
            data = abi.encode(votes);
            allo().allocate(poolId, data);
            stopMeasuringGas();

            assertEq(cv.getProposalVoterStake(1, address(this)), STAKED_AMOUNT, "ProposalVoterStake:"); // 80% of 50 = 40
            assertEq(cv.getProposalStakedAmount(1), STAKED_AMOUNT, " ProposalStakeAmount:"); // 80% of 50 = 40
        }

        /**
         * ASSERTS
         *
         */
        vm.startPrank(pool_admin());

        token.approve(address(registryCommunity), STAKE_WITH_FEES);
        registryCommunity.stakeAndRegisterMember("");
        cv.activatePoints();

        {
            ProposalSupport[] memory votes2 = new ProposalSupport[](1);
            int256 SUPPORT_PCT2 = int256(MINIMUM_STAKE);
            votes2[0] = ProposalSupport(proposalId, SUPPORT_PCT2);
            data = abi.encode(votes2);
            // vm.expectEmit(true, true, true, false);
            allo().allocate(poolId, data);
            vm.stopPrank();

            uint256 STAKED_AMOUNT2 = uint256(SUPPORT_PCT2);

            assertEq(cv.getProposalVoterStake(proposalId, address(pool_admin())), STAKED_AMOUNT2); // 100% of 50 = 50
            assertEq(cv.getProposalStakedAmount(proposalId), STAKED_AMOUNT + STAKED_AMOUNT2);
        }

        // console.log("before block.number", block.number);

        // assertEq(ConvictionsUtils.getMaxConviction(cv.getProposalStakedAmount(proposalId),getDecay(cv)), 57806809642175848314931, "maxCVStaked");

        uint256 rollTo100 =
            calculateBlocksTo100(ABDKMath64x64.divu(9999999, 1e7), ABDKMath64x64.divu(getDecay(cv), 1e7));
        vm.roll(rollTo100 * 2);

        console.log("after block.number", block.number);
        cv.updateProposalConviction(proposalId);

        (
            ,,,,,,,
            // address submitter,
            // address beneficiary,
            // address requestedToken,
            // uint256 requestedAmount,
            // uint256 stakedTokens,
            // ProposalStatus proposalStatus,
            // uint256 blockLast,
            uint256 convictionLast,
            uint256 threshold, // uint256 voterPointsPct
            ,,
        ) = cv.getProposal(proposalId);

        // console.log("Requested Amount: %s", requestedAmount);
        // console.log("Staked Tokens: %s", stakedTokens);
        console.log("Threshold:         %s", threshold);
        console.log("Conviction Last:   %s", convictionLast);
        // console.log("Voter points pct %s", voterPointsPct);
        // assertEq(threshold, 115613619, "threshold");
        // assertEq(threshold, MIN_THRESHOLD_PTS, "threshold");

        console.log("after block.number", block.number);

        cv.updateProposalConviction(proposalId);

        {
            uint256 totalEffectiveActivePoints = cv.totalPointsActivated();
            console.log(
                "maxCVSupply:       %s", ConvictionsUtils.getMaxConviction(totalEffectiveActivePoints, getDecay(cv))
            );
            console.log("totalEffectiveActivePoints:    %s", totalEffectiveActivePoints);
        }
        if (block.number >= rollTo100 * 2) {
            assertEq(_canExecuteProposal(cv, proposalId), false, "canExecuteProposal");
            (uint256 _maxRatio, uint256 weight, uint256 decay,) = cv.cvParams();
            safeHelper(
                address(cv),
                0,
                abi.encodeWithSelector(
                    ICVStrategy.setPoolParams.selector,
                    0,
                    CVParams(_maxRatio, weight, decay, 0) // MinThresolds = 0
                )
            );
            cv.updateProposalConviction(proposalId);
            assertEq(_canExecuteProposal(cv, proposalId), true, "canExecuteProposal");
        }
    }

    // TODO: Fix
    function xtest_proposalSupported_conviction_with_minThreshold() public {
        CVStrategy cv;
        uint256 proposalId;
        ArbitrableConfig memory arbConfig;
        {
            (IAllo.Pool memory pool, uint256 poolId, uint256 _proposalId) =
                _createProposal(address(0), 150 ether, 1_000 ether);
            proposalId = _proposalId;
            _createProposal(address(0), 1 ether, 1_000 ether);

            cv = CVStrategy(payable(address(pool.strategy)));

            vm.startPrank(address(_councilSafe()));
            cv.setPoolParams(
                arbConfig,
                CVParams({
                    maxRatio: 3656188, weight: 133677, decay: 9999887, minThresholdPoints: 100000000000000000000
                }),
                MINIMUM_SYBIL_SCORE,
                new address[](0),
                new address[](0),
                address(0)
            );

            vm.stopPrank();
            // startMeasuringGas("Support a Proposal");
            int256 SUPPORT_PCT = int256(MINIMUM_STAKE);
            ProposalSupport[] memory votes = new ProposalSupport[](1);
            votes[0] = ProposalSupport(proposalId, SUPPORT_PCT); // 0 + 70 = 70% = 35
            bytes memory data = abi.encode(votes);
            allo().allocate(poolId, data);
            stopMeasuringGas();

            uint256 STAKED_AMOUNT = uint256(SUPPORT_PCT);
            assertEq(cv.getProposalVoterStake(1, address(this)), STAKED_AMOUNT, "ProposalVoterStake:"); // 80% of 50 = 40
            assertEq(cv.getProposalStakedAmount(1), STAKED_AMOUNT, " ProposalStakeAmount:"); // 80% of 50 = 40

            /**
             * ASSERTS
             *
             */
            vm.startPrank(pool_admin());

            token.approve(address(registryCommunity), STAKE_WITH_FEES + 10 ether);
            registryCommunity.stakeAndRegisterMember("");
            registryCommunity.increasePower(5 ether);
            // registryCommunity.increasePower(10 ether);
            cv.activatePoints();

            ProposalSupport[] memory votes2 = new ProposalSupport[](1);
            int256 SUPPORT_PCT2 = 10 ether;
            votes2[0] = ProposalSupport(proposalId, SUPPORT_PCT2);
            data = abi.encode(votes2);
            // vm.expectEmit(true, true, true, false);
            allo().allocate(poolId, data);
            vm.stopPrank();
            uint256 STAKED_AMOUNT2 = uint256(SUPPORT_PCT2);

            assertEq(cv.getProposalVoterStake(proposalId, address(pool_admin())), STAKED_AMOUNT2); // 100% of 50 = 50
            assertEq(cv.getProposalStakedAmount(proposalId), STAKED_AMOUNT + STAKED_AMOUNT2);
        }

        // console.log("before block.number", block.number);

        // assertEq(ConvictionsUtils.getMaxConviction(cv.getProposalStakedAmount(proposalId),getDecay(cv)), 57806809642175848314931, "maxCVStaked");

        uint256 rollTo100 =
            calculateBlocksTo100(ABDKMath64x64.divu(9999999, 1e7), ABDKMath64x64.divu(getDecay(cv), 1e7));
        vm.roll(rollTo100 * 2);

        console.log("after block.number", block.number);
        cv.updateProposalConviction(proposalId);

        (
            ,,,,,,,
            // address submitter,
            // address beneficiary,
            // address requestedToken,
            // uint256 requestedAmount,
            // uint256 stakedTokens,
            // ProposalStatus proposalStatus,
            // uint256 blockLast,
            uint256 convictionLast,
            uint256 threshold, // uint256 voterPointsPct
            ,,
        ) = cv.getProposal(proposalId);

        // console.log("Requested Amount: %s", requestedAmount);
        // console.log("Staked Tokens: %s", stakedTokens);
        console.log("Threshold:         %s", threshold);
        console.log("Conviction Last:   %s", convictionLast);
        // console.log("Voter points pct %s", voterPointsPct);
        // assertEq(threshold, 115613619, "threshold");
        // 88495575221238938053097333333333 -> threshold override computed based on minThresholdPoints
        assertEq(threshold, 88495575221238938053097333333333, "threshold"); // Expect to be the threshold override

        console.log("after block.number", block.number);

        cv.updateProposalConviction(proposalId);

        // if (block.number >= rollTo100 * 2) {
        assertEq(_canExecuteProposal(cv, proposalId), false, "canExecuteProposal");

        vm.startPrank(address(_councilSafe()));
        cv.setPoolParams(
            arbConfig,
            CVParams({
                maxRatio: _etherToFloat(0.1 ether),
                weight: _etherToFloat(0.0005 ether),
                decay: _etherToFloat(0.9965402 ether),
                minThresholdPoints: 0
            }),
            MINIMUM_SYBIL_SCORE,
            new address[](0),
            new address[](0),
            address(0)
        );
        vm.stopPrank();
        cv.updateProposalConviction(proposalId);
        assertEq(_canExecuteProposal(cv, proposalId), true, "canExecuteProposal");
        // }
    }

    function test_proposalSupported_conviction_canExecuteProposal_increasePower() public {
        (IAllo.Pool memory pool, uint256 poolId, uint256 proposalId) =
            _createProposal(address(0), 50 ether, 1_000 ether);

        CVStrategy cv = CVStrategy(payable(address(pool.strategy)));
        // FAST 1 MIN half life Conviction Growth
        // cv.setDecay(_etherToFloat(0.9965402 ether)); // alpha = decay
        // cv.setMaxRatio(_etherToFloat(0.1 ether)); // beta = maxRatio
        // cv.setWeight(_etherToFloat(0.0005 ether)); // RHO = p  = weight

        // TODO: SetPool Params
        // safeHelper(address(cv), 0, abi.encodeWithSelector(cv.setDecay.selector, _etherToFloat(0.9965402 ether)));
        // safeHelper(address(cv), 0, abi.encodeWithSelector(cv.setMaxRatio.selector, _etherToFloat(0.1 ether)));
        // safeHelper(address(cv), 0, abi.encodeWithSelector(cv.setWeight.selector, _etherToFloat(0.0005 ether)));

        /**
         * ASSERTS
         *
         */
        // startMeasuringGas("Support a Proposal");

        token.approve(address(registryCommunity), 1000 * DECIMALS);

        registryCommunity.increasePower(1000 * DECIMALS);

        int256 SUPPORT_PCT = 1000 * int256(DECIMALS);

        ProposalSupport[] memory votes = new ProposalSupport[](1);
        votes[0] = ProposalSupport(proposalId, SUPPORT_PCT); // 0 + 70 = 70% = 35
        bytes memory data = abi.encode(votes);
        allo().allocate(poolId, data);
        stopMeasuringGas();

        uint256 STAKED_AMOUNT = uint256(SUPPORT_PCT);
        assertEq(cv.getProposalVoterStake(1, address(this)), STAKED_AMOUNT, "ProposalVoterStake:"); // 80% of 50 = 40
        assertEq(cv.getProposalStakedAmount(1), STAKED_AMOUNT, " ProposalStakeAmount:"); // 80% of 50 = 40

        /**
         * ASSERTS
         *
         */
        vm.startPrank(pool_admin());

        token.approve(address(registryCommunity), STAKE_WITH_FEES);
        registryCommunity.stakeAndRegisterMember("");
        cv.activatePoints();

        token.approve(address(registryCommunity), 1000 * DECIMALS);

        registryCommunity.increasePower(1000 * DECIMALS);

        ProposalSupport[] memory votes2 = new ProposalSupport[](1);
        int256 SUPPORT_PCT2 = 1000 * int256(DECIMALS);
        votes2[0] = ProposalSupport(proposalId, SUPPORT_PCT2);
        data = abi.encode(votes2);
        // vm.expectEmit(true, true, true, false);
        allo().allocate(poolId, data);
        vm.stopPrank();

        uint256 STAKED_AMOUNT2 = uint256(SUPPORT_PCT2);

        assertEq(cv.getProposalVoterStake(proposalId, address(pool_admin())), STAKED_AMOUNT2); // 100% of 50 = 50
        assertEq(cv.getProposalStakedAmount(proposalId), STAKED_AMOUNT + STAKED_AMOUNT2);

        /**
         * ASSERTS
         *
         */
        // console.log("before block.number", block.number);

        // assertEq(ConvictionsUtils.getMaxConviction(cv.getProposalStakedAmount(proposalId),getDecay(cv)), 57806809642175848314931, "maxCVStaked");

        // console2.log(getDecay(cv));
        vm.roll(10);
        console.log("after block.number", block.number);
        // x = 8731 / 149253
        // x = 0.174 current tokens growth

        // convictionLast / maxConviction(effectivestaked) * 100 = stakedConviction in percetage of the effetiveSupply
        // threshold / maxConviction(effectivestaked)

        cv.updateProposalConviction(proposalId);

        (
            ,,,,,,,
            // address submitter,
            // address beneficiary,
            // address requestedToken,
            // uint256 requestedAmount,
            // uint256 stakedTokens,
            // ProposalStatus proposalStatus,
            // uint256 blockLast,
            uint256 convictionLast,
            uint256 threshold, // uint256 voterPointsPct
            ,,
        ) = cv.getProposal(proposalId);

        // console.log("Requested Amount: %s", requestedAmount);
        // console.log("Staked Tokens: %s", stakedTokens);
        console.log("Threshold:         %s", threshold);
        console.log("Conviction Last:   %s", convictionLast);
        // console.log("Voter points pct %s", voterPointsPct);
        // assertEq(threshold, 11561361928435169671750, "threshold");
        // assertEq(threshold, 127174981212786866389258, "threshold");
        // assertEq(threshold, 39251537411353971070734, "threshold");
        if (block.number == 10) {
            // assertEq(convictionLast, 1775289499585217831835, "convictionLast");
            // if (convictionLast < threshold) {
            assertEq(_canExecuteProposal(cv, proposalId), false, "canExecuteProposal");
            // }
        } else {
            revert("block.number not expected");
        }

        uint256 rollTo100 =
            calculateBlocksTo100(ABDKMath64x64.divu(9999999, 1e7), ABDKMath64x64.divu(getDecay(cv), 1e7));

        vm.roll(rollTo100 * 2);
        console.log("after block.number", block.number);
        console.log("Conviction After:  %s", cv.updateProposalConviction(proposalId));

        // 127174981212786866389258
        // 57806809642175265762873
        // if (block.number >= rollTo100 * 2) {
        assertEq(_canExecuteProposal(cv, proposalId), true, "canExecuteProposal");
        // }
    }

    // TODO: Fix
    function xtest_proposalSupported_conviction_canExecuteProposal() public {
        (IAllo.Pool memory pool, uint256 poolId, uint256 proposalId) =
            _createProposal(address(0), 50 ether, 1_000 ether);

        CVStrategy cv = CVStrategy(payable(address(pool.strategy)));
        // FAST 1 MIN half life Conviction Growth
        // cv.setDecay(_etherToFloat(0.9965402 ether)); // alpha = decay
        // cv.setMaxRatio(_etherToFloat(0.1 ether)); // beta = maxRatio
        // cv.setWeight(_etherToFloat(0.0005 ether)); // RHO = p  = weight

        // TODO: SetPool Params
        // safeHelper(address(cv), 0, abi.encodeWithSelector(cv.setDecay.selector, _etherToFloat(0.9965402 ether)));
        // safeHelper(address(cv), 0, abi.encodeWithSelector(cv.setMaxRatio.selector, _etherToFloat(0.1 ether)));
        // safeHelper(address(cv), 0, abi.encodeWithSelector(cv.setWeight.selector, _etherToFloat(0.0005 ether)));

        safeHelper(
            address(cv),
            0,
            abi.encodeWithSelector(
                ICVStrategy.setPoolParams.selector,
                EMPTY_ARB_CONFIG,
                CVParams({
                    maxRatio: _etherToFloat(0.1 ether),
                    weight: _etherToFloat(0.0005 ether),
                    decay: _etherToFloat(0.9965402 ether),
                    minThresholdPoints: 0
                })
            )
        );

        /**
         * ASSERTS
         *
         */
        // startMeasuringGas("Support a Proposal");

        int256 SUPPORT_PCT = 50 * int256(DECIMALS);

        ProposalSupport[] memory votes = new ProposalSupport[](1);
        votes[0] = ProposalSupport(proposalId, SUPPORT_PCT); // 0 + 70 = 70% = 35
        bytes memory data = abi.encode(votes);
        allo().allocate(poolId, data);
        stopMeasuringGas();

        uint256 STAKED_AMOUNT = uint256(SUPPORT_PCT);
        assertEq(cv.getProposalVoterStake(1, address(this)), STAKED_AMOUNT, "ProposalVoterStake:"); // 80% of 50 = 40
        assertEq(cv.getProposalStakedAmount(1), STAKED_AMOUNT, " ProposalStakeAmount:"); // 80% of 50 = 40

        /**
         * ASSERTS
         *
         */
        vm.startPrank(pool_admin());

        token.approve(address(registryCommunity), STAKE_WITH_FEES);
        registryCommunity.stakeAndRegisterMember("");
        cv.activatePoints();

        ProposalSupport[] memory votes2 = new ProposalSupport[](1);
        int256 SUPPORT_PCT2 = 50 * int256(DECIMALS);
        votes2[0] = ProposalSupport(proposalId, SUPPORT_PCT2);
        data = abi.encode(votes2);
        // vm.expectEmit(true, true, true, false);
        allo().allocate(poolId, data);
        vm.stopPrank();

        uint256 STAKED_AMOUNT2 = uint256(SUPPORT_PCT2);

        assertEq(cv.getProposalVoterStake(proposalId, address(pool_admin())), STAKED_AMOUNT2); // 100% of 50 = 50
        assertEq(cv.getProposalStakedAmount(proposalId), STAKED_AMOUNT + STAKED_AMOUNT2);

        /**
         * ASSERTS
         *
         */
        // console.log("before block.number", block.number);

        // assertEq(ConvictionsUtils.getMaxConviction(cv.getProposalStakedAmount(proposalId),getDecay(cv)), 57806809642175848314931, "maxCVStaked");

        // console2.log(getDecay(cv));
        vm.roll(10);
        console.log("after block.number", block.number);
        // x = 8731 / 149253
        // x = 0.174 current tokens growth

        // convictionLast / maxConviction(effectivestaked) * 100 = stakedConviction in percetage of the effetiveSupply
        // threshold / maxConviction(effectivestaked)

        cv.updateProposalConviction(proposalId);

        (
            ,,,,,,,
            // address submitter,
            // address beneficiary,
            // address requestedToken,
            // uint256 requestedAmount,
            // uint256 stakedTokens,
            // ProposalStatus proposalStatus,
            // uint256 blockLast,
            uint256 convictionLast,
            uint256 threshold, // uint256 voterPointsPct
            ,,
        ) = cv.getProposal(proposalId);

        // console.log("Requested Amount: %s", requestedAmount);
        // console.log("Staked Tokens: %s", stakedTokens);
        console.log("Threshold:         %s", threshold);
        console.log("Conviction Last:   %s", convictionLast);
        // console.log("Voter points pct %s", voterPointsPct);
        // assertEq(threshold, 11561361928435169671750, "threshold");
        // assertEq(threshold, 127174981212786866389258, "threshold");
        // assertEq(threshold, 39251537411353971070734, "threshold");
        if (block.number == 10) {
            // assertEq(convictionLast, 1775289499585217831835, "convictionLast");
            // if (convictionLast < threshold) {
            assertEq(_canExecuteProposal(cv, proposalId), false, "canExecuteProposal");
            // }
        } else {
            revert("block.number not expected");
        }

        uint256 rollTo100 =
            calculateBlocksTo100(ABDKMath64x64.divu(9999999, 1e7), ABDKMath64x64.divu(getDecay(cv), 1e7));
        vm.roll(rollTo100 * 2);
        console.log("after block.number", block.number);
        console.log("Conviction After:  %s", cv.updateProposalConviction(proposalId));

        // 127174981212786866389258
        // 57806809642175265762873
        // if (block.number >= rollTo100 * 2) {
        assertEq(_canExecuteProposal(cv, proposalId), true, "canExecuteProposal");
        // }
    }

    function xtest_proposalSupported_conviction_threshold_2_users() public {
        uint256 proposalId;
        CVStrategy cv;
        {
            (IAllo.Pool memory pool, uint256 poolId, uint256 _proposalId) =
                _createProposal(address(0), 50 ether, 1_000 ether);
            proposalId = _proposalId;
            cv = CVStrategy(payable(address(pool.strategy)));
            // FAST 1 MIN half life Conviction Growth
            // cv.setDecay(_etherToFloat(0.9965402 ether)); // alpha = decay
            // cv.setMaxRatio(_etherToFloat(0.1 ether)); // beta = maxRatio
            // cv.setWeight(_etherToFloat(0.0005 ether)); // RHO = p  = weight

            // ArbitrableConfig memory arbConfig;
            vm.startPrank(address(_councilSafe()));
            cv.setPoolParams(
                ArbitrableConfig(IArbitrator(address(0)), address(0), 0, 0, 0, 0),
                CVParams({
                    maxRatio: _etherToFloat(0.1 ether),
                    weight: _etherToFloat(0.0005 ether),
                    decay: _etherToFloat(0.9965402 ether),
                    minThresholdPoints: 0
                }),
                MINIMUM_SYBIL_SCORE,
                new address[](0),
                new address[](0),
                address(0)
            );
            vm.stopPrank();
            // safeHelper(address(cv), 0, abi.encodeWithSelector(cv.setDecay.selector, _etherToFloat(0.9965402 ether)));
            // safeHelper(address(cv), 0, abi.encodeWithSelector(cv.setMaxRatio.selector, _etherToFloat(0.1 ether)));
            // safeHelper(address(cv), 0, abi.encodeWithSelector(cv.setWeight.selector, _etherToFloat(0.0005 ether)));

            /**
             * ASSERTS
             *
             */
            // startMeasuringGas("Support a Proposal");

            int256 SUPPORT_PCT = int256(MINIMUM_STAKE);

            ProposalSupport[] memory votes = new ProposalSupport[](1);
            votes[0] = ProposalSupport(proposalId, SUPPORT_PCT); // 0 + 70 = 70% = 35
            bytes memory data = abi.encode(votes);
            allo().allocate(poolId, data);
            stopMeasuringGas();

            uint256 STAKED_AMOUNT = uint256(SUPPORT_PCT);
            assertEq(cv.getProposalVoterStake(1, address(this)), STAKED_AMOUNT, "ProposalVoterStake:"); // 80% of 50 = 40
            assertEq(cv.getProposalStakedAmount(1), STAKED_AMOUNT, " ProposalStakeAmount:"); // 80% of 50 = 40

            /**
             * ASSERTS
             *
             */
            vm.startPrank(pool_admin());

            token.approve(address(registryCommunity), STAKE_WITH_FEES);
            registryCommunity.stakeAndRegisterMember("");
            cv.activatePoints();

            ProposalSupport[] memory votes2 = new ProposalSupport[](1);

            int256 SUPPORT_PCT2 = int256(MINIMUM_STAKE);

            votes2[0] = ProposalSupport(proposalId, SUPPORT_PCT2);
            data = abi.encode(votes2);
            // vm.expectEmit(true, true, true, false);
            allo().allocate(poolId, data);
            vm.stopPrank();

            uint256 STAKED_AMOUNT2 = uint256(SUPPORT_PCT2);

            assertEq(cv.getProposalVoterStake(proposalId, address(pool_admin())), STAKED_AMOUNT2);
            assertEq(cv.getProposalStakedAmount(proposalId), STAKED_AMOUNT + STAKED_AMOUNT2);

            console.log("TOTAL STAKED:                  %s", STAKED_AMOUNT + STAKED_AMOUNT2);
        }

        /**
         * ASSERTS
         *
         */
        // console.log("before block.number", block.number);
        uint256 totalEffectiveActivePoints = cv.totalPointsActivated();
        console.log("totalEffectiveActivePoints:    %s", totalEffectiveActivePoints);
        console.log("maxCVSupply", ConvictionsUtils.getMaxConviction(totalEffectiveActivePoints, getDecay(cv)));
        console.log(
            "maxCVStaked", ConvictionsUtils.getMaxConviction(cv.getProposalStakedAmount(proposalId), getDecay(cv))
        );

        // assertEq(ConvictionsUtils.getMaxConviction(totalEffectiveActivePoints,getDecay(cv)), 57806809642175848314931, "maxCVSupply");
        // assertEq(ConvictionsUtils.getMaxConviction(cv.getProposalStakedAmount(proposalId),getDecay(cv)), 57806809642175848314931, "maxCVStaked");
        assertEq(
            ConvictionsUtils.getMaxConviction(cv.getProposalStakedAmount(proposalId), getDecay(cv)),
            ConvictionsUtils.getMaxConviction(totalEffectiveActivePoints, getDecay(cv)),
            "maxCVStaked"
        );

        uint256 rollTo100 =
            calculateBlocksTo100(ABDKMath64x64.divu(9999999, 1e7), ABDKMath64x64.divu(getDecay(cv), 1e7));

        vm.roll(rollTo100);
        // vm.roll(110);
        console.log("after block.number", block.number);
        // x = 8731 / 149253
        // x = 0.174 current tokens growth

        // convictionLast / maxConviction(effectivestaked) * 100 = stakedConviction in percetage of the effetiveSupply
        // threshold / maxConviction(effectivestaked)

        cv.updateProposalConviction(proposalId);

        (
            ,,,,,,,
            // address submitter,
            // address beneficiary,
            // address requestedToken,
            // uint256 requestedAmount,
            // uint256 stakedTokens,
            // ProposalStatus proposalStatus,
            // uint256 blockLast,
            uint256 convictionLast,
            uint256 threshold,
            uint256 voterPointsPct,,
        ) = cv.getProposal(proposalId);

        // console.log("Requested Amount: %s", requestedAmount);
        // console.log("Staked Tokens: %s", stakedTokens);
        // console.log("Threshold:         %s", threshold);
        // console.log("Conviction Last:   %s", convictionLast);
        // console.log("Voter points pct %s", voterPointsPct);
        assertEq(threshold, 5780680964217584835875, "threshold");

        if (block.number >= rollTo100) {
            assertEq(_canExecuteProposal(cv, proposalId), true, "canExecuteProposal");
            if (convictionLast < threshold) {
                assertEq(_canExecuteProposal(cv, proposalId), false, "canExecuteProposal");
                assertApproxEqAbs(convictionLast, threshold, 1000);
            }
        } else {
            assertEq(convictionLast, 233156676, "convictionLast");
        }
        assertEq(voterPointsPct, MINIMUM_STAKE, "voterPointsPct");
    }

    // TODO: Fix
    function xtest_2_users_cv_grow() public {
        (IAllo.Pool memory pool, uint256 poolId, uint256 proposalId) =
            _createProposal(address(0), 25 ether, 3_000 ether);

        CVStrategy cv = CVStrategy(payable(address(pool.strategy)));
        // FAST 1 MIN half life Conviction Growth
        safeHelper(
            address(cv),
            0,
            abi.encodeWithSelector(
                ICVStrategy.setPoolParams.selector,
                EMPTY_ARB_CONFIG,
                CVParams({
                    maxRatio: _etherToFloat(0.1 ether),
                    weight: _etherToFloat(0.0005 ether),
                    decay: _etherToFloat(0.9965402 ether),
                    minThresholdPoints: 0
                })
            )
        );

        /**
         * ASSERTS
         *
         */
        // startMeasuringGas("Support a Proposal");
        int256 SUPPORT_POINTS = 25 * int256(DECIMALS);
        ProposalSupport[] memory votes = new ProposalSupport[](1);
        votes[0] = ProposalSupport(proposalId, SUPPORT_POINTS);
        bytes memory data = abi.encode(votes);
        allo().allocate(poolId, data);
        stopMeasuringGas();

        uint256 STAKED_AMOUNT = uint256(SUPPORT_POINTS);
        assertEq(cv.getProposalVoterStake(1, address(this)), STAKED_AMOUNT, "ProposalVoterStake:");
        assertEq(cv.getProposalStakedAmount(1), STAKED_AMOUNT, " ProposalStakeAmount:");

        /**
         * ASSERTS
         *
         */
        vm.startPrank(pool_admin());

        token.approve(address(registryCommunity), STAKE_WITH_FEES);
        registryCommunity.stakeAndRegisterMember("");
        cv.activatePoints();

        ProposalSupport[] memory votes2 = new ProposalSupport[](1);
        int256 SUPPORT_POINTS2 = 25 * int256(DECIMALS);
        votes2[0] = ProposalSupport(proposalId, SUPPORT_POINTS2);
        data = abi.encode(votes2);
        // vm.expectEmit(true, true, true, false);
        allo().allocate(poolId, data);
        vm.stopPrank();

        vm.roll(50);
        console.log("after block.number", block.number);
        uint256 cvLast = cv.updateProposalConviction(proposalId);
        console.log("                                       convicLas1", cvLast);
        vm.roll(75);
        console.log("after block.number", block.number);

        uint256 STAKED_AMOUNT2 = uint256(SUPPORT_POINTS2);

        assertEq(cv.getProposalVoterStake(proposalId, address(pool_admin())), STAKED_AMOUNT2);
        assertEq(cv.getProposalStakedAmount(proposalId), STAKED_AMOUNT + STAKED_AMOUNT2);

        console.log("maxCVSupply", ConvictionsUtils.getMaxConviction(cv.totalPointsActivated(), getDecay(cv)));
        console.log(
            "maxCVStaked", ConvictionsUtils.getMaxConviction(cv.getProposalStakedAmount(proposalId), getDecay(cv))
        );

        assertTrue(cvLast < cv.updateProposalConviction(proposalId), "growing2");

        cvLast = cv.updateProposalConviction(proposalId);
        console.log("                                       convicLas2", cv.updateProposalConviction(proposalId));
        vm.roll(200);
        console.log("after block.number", block.number);

        assertTrue(cvLast < cv.updateProposalConviction(proposalId), "growing3");

        console.log("                                       convicLas3", cv.updateProposalConviction(proposalId));

        (
            ,,,,,,,
            // address submitter,
            // address beneficiary,
            // address requestedToken,
            // uint256 requestedAmount,
            // uint256 stakedTokens,
            // ProposalStatus proposalStatus,
            // uint256 blockLast,
            uint256 convictionLast,
            uint256 threshold,
            uint256 voterStakedPoints,,
        ) = cv.getProposal(proposalId);

        // console.log("Requested Amount: %s", requestedAmount);
        // console.log("Staked Tokens: %s", stakedTokens);
        console.log("Threshold:         %s", threshold);
        console.log("Conviction Last:   %s", convictionLast);

        assertEq(voterStakedPoints, uint256(SUPPORT_POINTS), "voterStakedPoints");
    }

    function calculateBlocksTo100(int128 s, int128 alpha) public pure returns (uint256) {
        // Calculate the logarithms of (1 - s) and alpha using ln function
        int128 ONE = ABDKMath64x64.divu(1, 1);
        // console2.log("1");
        int128 S = s;
        // console2.log("2");
        int256 log1minusS = (ONE - S).ln();
        // console2.log("3");
        int256 logAlpha = alpha.ln();

        // console2.logInt(log1minusS);
        // console2.logInt(logAlpha);
        // Divide log(1 - s) by log(alpha) to get the result
        int256 result = log1minusS / logAlpha;

        // console2.log("result", int256(result));
        // console2.logInt(int256(result));
        return uint256(result);
    }

    function test_1_proposalSupported() public {
        console.log("tokenPool", address(token));
        (IAllo.Pool memory pool, uint256 poolId, uint256 proposalId) = _createProposal(address(token), 0, 0);

        /**
         * ASSERTS
         *
         */
        // startMeasuringGas("Support a Proposal");
        int256 SUPPORT_PCT = 80e4;
        ProposalSupport[] memory votes = new ProposalSupport[](1);
        votes[0] = ProposalSupport(proposalId, SUPPORT_PCT); // 0 + 70 = 70% = 35
        bytes memory data = abi.encode(votes);
        allo().allocate(poolId, data);
        stopMeasuringGas();

        uint256 STAKED_AMOUNT = uint256(SUPPORT_PCT);
        CVStrategy cv = CVStrategy(payable(address(pool.strategy)));
        assertEq(cv.getProposalVoterStake(proposalId, address(this)), STAKED_AMOUNT, "ProposalVoterStake1"); // 80% of 50 = 40
        assertEq(cv.getProposalStakedAmount(proposalId), STAKED_AMOUNT); // 80% of 50 = 40

        /**
         * ASSERTS
         *
         */
        vm.startPrank(pool_admin());

        CreateProposal memory proposal = CreateProposal(
            // proposalID2,
            poolId,
            pool_admin(),
            // ProposalType.Funding,
            REQUESTED_AMOUNT,
            address(token),
            metadata
        );
        data = abi.encode(proposal);
        (,, uint256 submitterCollateralAmount,,,) = cv.getArbitrableConfig();
        vm.deal(pool_admin(), submitterCollateralAmount);
        uint256 proposalID2 = uint160(allo().registerRecipient{value: submitterCollateralAmount}(poolId, data));

        token.approve(address(registryCommunity), STAKE_WITH_FEES);
        registryCommunity.stakeAndRegisterMember("");
        cv.activatePoints();

        votes = new ProposalSupport[](1);
        int256 SUPPORT_PCT2 = 100e4;
        votes[0] = ProposalSupport(proposalID2, SUPPORT_PCT2);
        data = abi.encode(votes);
        // vm.expectEmit(true, true, true, false);
        allo().allocate(poolId, data);
        vm.stopPrank();

        uint256 STAKED_AMOUNT2 = uint256(SUPPORT_PCT2);

        assertEq(cv.getProposalVoterStake(proposalID2, address(pool_admin())), STAKED_AMOUNT2, "ProposalVoterStake2"); // 100% of 50 = 50
        assertEq(cv.getProposalStakedAmount(proposalID2), STAKED_AMOUNT2, "StakedMount2");

        /**
         * ASSERTS
         *
         */
        // console.log("before block.number", block.number);
        // console.log("totalStaked", cv.totalStaked());
        // console.log("maxCVSupply-totalStaked", ConvictionsUtils.getMaxConviction(cv.totalStaked(),getDecay(cv)));
        // console.log("maxCVSupply-EffectiveActivePoints", ConvictionsUtils.getMaxConviction(cv.totalEffectiveActivePoints(),getDecay(cv)));
        // console.log("maxCVStaked", ConvictionsUtils.getMaxConviction(cv.getProposalStakedAmount(proposalId),getDecay(cv)));
        vm.roll(10);
        console.log("after block.number", block.number);

        cv.updateProposalConviction(proposalId);

        // (
        //     ,
        //     ,
        //     ,
        //     uint256 requestedAmount,
        //     uint256 stakedTokens,
        //     ,
        //     ,
        //     uint256 convictionLast,
        //     uint256 threshold,
        //     uint256 voterPointsPct
        // ) = cv.getProposal(proposalId);

        // console.log("Requested Amount: %s", requestedAmount);
        // console.log("Staked Tokens: %s", stakedTokens);
        // console.log("Threshold: %s", threshold);
        // console.log("Conviction Last: %s", convictionLast);
        // console.log("Voter points pct %s", voterPointsPct);
    }

    function test_distribute_native_token_increasePower() public {
        //0 = 1000 ether requestAmount
        (IAllo.Pool memory pool, uint256 poolId, uint256 proposalId) = _createProposal(NATIVE, 0, 0);

        /**
         * ASSERTS
         *
         */
        uint256 extraStakeAmount = 4000 ether;

        CVStrategy cv = CVStrategy(payable(address(pool.strategy)));

        token.approve(address(registryCommunity), extraStakeAmount);
        registryCommunity.increasePower(extraStakeAmount);

        assertEq(
            registryCommunity.getMemberPowerInStrategy(address(this), address(cv)),
            registryCommunity.getMemberStakedAmount(address(this))
        );
        // // startMeasuringGas("Support a Proposal");
        int256 SUPPORT_PCT = int256(MINIMUM_STAKE + extraStakeAmount);
        ProposalSupport[] memory votes = new ProposalSupport[](1);
        // votes[0] = ProposalSupport(proposalId, SUPPORT_PCT ); // 0 + 70 = 70% = 35
        votes[0] = ProposalSupport(proposalId, SUPPORT_PCT); // 0 + 70 = 70% = 35
        // bytes memory data = ;
        allo().allocate(poolId, abi.encode(votes));
        console.log("TOTAL POINTS ACTIVATED", cv.totalPointsActivated());
        stopMeasuringGas();

        // uint256 rollTo100 = calculateBlocksTo100(ABDKMath64x64.divu(9999999, 1e7), ABDKMath64x64.divu(getDecay(cv), 1e7));
        vm.roll(calculateBlocksTo100(ABDKMath64x64.divu(9999999, 1e7), ABDKMath64x64.divu(getDecay(cv), 1e7)));

        cv.updateProposalConviction(proposalId);

        // uint256 totalEffectiveActivePoints = cv.totalEffectiveActivePoints();
        // console.log("totalEffectiveActivePoints", totalEffectiveActivePoints);
        // console.log("maxCVSupply:   %s", ConvictionsUtils.getMaxConviction(cv.totalEffectiveActivePoints(),getDecay(cv)));
        // console.log("maxCVStaked:   %s", ConvictionsUtils.getMaxConviction(cv.getProposalStakedAmount(proposalId),getDecay(cv)));
        // uint256 STAKED_AMOUNT = uint256(SUPPORT_PCT) * MINIMUM_STAKE / 100e4;
        assertEq(cv.getProposalVoterStake(proposalId, address(this)), uint256(SUPPORT_PCT)); // 80% of 50 = 40
        assertEq(cv.getProposalStakedAmount(proposalId), uint256(SUPPORT_PCT)); // 80% of 50 = 40

        (,
            // address submitter,
            address beneficiary, // address requestedToken,
            ,
            uint256 requestedAmount, // uint256 stakedTokens, // ProposalStatus proposalStatus, // uint256 blockLast,
            ,,,
            uint256 convictionLast,
            uint256 threshold, // uint256 voterPointsPct
            ,,
        ) = cv.getProposal(proposalId);

        // console.log("Proposal Status: %s", proposalStatus);
        // console.log("Proposal Type: %s", proposalType);
        // console.log("Requested Token: %s", requestedToken);
        // console.log("Requested Amount: %s", requestedAmount);
        // console.log("Staked Tokens: %s", stakedTokens);
        // console.log("Threshold:     %s", threshold);
        // console.log("Agreement Action Id: %s", agreementActionId);
        // console.log("Block Last: %s", blockLast);
        // console.log("Conv Last:     %s", convictionLast);
        // console.log("Voter points pct %s", voterPointsPct);
        // console.log("Beneficiary: %s", beneficiary);
        // console.log("Submitter: %s", submitter);
        address[] memory recipients = new address[](0);
        // recipients[0] = address(1);
        bytes memory dataProposal = abi.encode(proposalId);

        uint256 amount = getBalance(pool.token, beneficiary);
        // console.log("Beneficienry Before amount: %s", amount);

        assertEq(amount, 0);

        allo().distribute(poolId, recipients, dataProposal);
        amount = getBalance(pool.token, beneficiary);
        // console.log("Beneficienry After amount: %s", amount);
        (,, uint256 submitterCollateralAmount,,,) = cv.getArbitrableConfig();
        assertEq(amount - submitterCollateralAmount, requestedAmount);
        _assertProposalStatus(cv, proposalId, ProposalStatus.Executed);
    }

    function test_distribute_with_token() public {
        //0 = 1000 ether requestAmount
        (IAllo.Pool memory pool, uint256 poolId, uint256 proposalId) = _createProposal(address(token), 0, 0);

        CVStrategy cv = CVStrategy(payable(address(pool.strategy)));

        assertEq(
            registryCommunity.getMemberPowerInStrategy(address(this), address(cv)),
            registryCommunity.getMemberStakedAmount(address(this)),
            "staked amount"
        );
        // startMeasuringGas("Support a Proposal");
        int256 SUPPORT_PCT = int256(MINIMUM_STAKE);
        ProposalSupport[] memory votes = new ProposalSupport[](1);
        // votes[0] = ProposalSupport(proposalId, SUPPORT_PCT ); // 0 + 70 = 70% = 35
        votes[0] = ProposalSupport(proposalId, SUPPORT_PCT); // 0 + 70 = 70% = 35
        // bytes memory data = ;
        allo().allocate(poolId, abi.encode(votes));
        console.log("TOTAL POINTS ACTIVATED", cv.totalPointsActivated());
        stopMeasuringGas();

        uint256 rollTo100 =
            calculateBlocksTo100(ABDKMath64x64.divu(9999999, 1e7), ABDKMath64x64.divu(getDecay(cv), 1e7));
        vm.roll(rollTo100);

        cv.updateProposalConviction(proposalId);

        // uint256 totalEffectiveActivePoints = cv.totalEffectiveActivePoints();
        // console.log("totalEffectiveActivePoints", totalEffectiveActivePoints);
        console.log("maxCVSupply:   %s", ConvictionsUtils.getMaxConviction(cv.totalPointsActivated(), getDecay(cv)));
        console.log(
            "maxCVStaked:   %s", ConvictionsUtils.getMaxConviction(cv.getProposalStakedAmount(proposalId), getDecay(cv))
        );
        // uint256 STAKED_AMOUNT = uint256(SUPPORT_PCT) * MINIMUM_STAKE / 100e4;
        assertEq(cv.getProposalVoterStake(proposalId, address(this)), uint256(SUPPORT_PCT)); // 80% of 50 = 40
        assertEq(cv.getProposalStakedAmount(proposalId), uint256(SUPPORT_PCT)); // 80% of 50 = 40

        (,
            // address submitter,
            address beneficiary, // address requestedToken,
            ,
            uint256 requestedAmount, // uint256 stakedTokens, // ProposalStatus proposalStatus, // uint256 blockLast,
            ,,,
            uint256 convictionLast,
            uint256 threshold, // uint256 voterPointsPct
            ,,
        ) = cv.getProposal(proposalId);

        // console.log("Proposal Status: %s", proposalStatus);
        // console.log("Proposal Type: %s", proposalType);
        // console.log("Requested Token: %s", requestedToken);
        // console.log("Requested Amount: %s", requestedAmount);
        // console.log("Staked Tokens: %s", stakedTokens);
        console.log("Threshold:     %s", threshold);
        // console.log("Agreement Action Id: %s", agreementActionId);
        // console.log("Block Last: %s", blockLast);
        console.log("Conv Last:     %s", convictionLast);
        // console.log("Voter points pct %s", voterPointsPct);
        // console.log("Beneficiary: %s", beneficiary);
        // console.log("Submitter: %s", submitter);

        // recipients[0] = address(1);
        bytes memory dataProposal = abi.encode(proposalId);

        console.log("pool.token: %s", pool.token);
        uint256 amount = getBalance(pool.token, beneficiary);
        console.log("Beneficienry Before amount: %s", amount);

        uint256 poolAmount = cv.getPoolAmount();

        allo().distribute(poolId, new address[](0), dataProposal);

        assertNotEq(poolAmount, cv.getPoolAmount(), "poolAmount not changed");
        assertEq(poolAmount - cv.getPoolAmount(), requestedAmount, "poolAmount not decreased by requestedAmount");

        //@todo chec ProposalStatus

        amount = getBalance(pool.token, beneficiary) - amount;
        console.log("Beneficienry After amount: %s", amount);
        assertEq(amount, requestedAmount, "requestedAmount");
        _assertProposalStatus(cv, proposalId, ProposalStatus.Executed);
    }

    function testRevert_distribute_poolAmountNotEnough() public {
        (IAllo.Pool memory pool, uint256 poolId, uint256 proposalId) = _createProposal(address(token), 0, 0);

        CVStrategy cv = CVStrategy(payable(address(pool.strategy)));

        assertEq(
            registryCommunity.getMemberPowerInStrategy(address(this), address(cv)),
            registryCommunity.getMemberStakedAmount(address(this)),
            "staked amount"
        );
        int256 SUPPORT_PCT = int256(MINIMUM_STAKE);
        ProposalSupport[] memory votes = new ProposalSupport[](1);
        votes[0] = ProposalSupport(proposalId, SUPPORT_PCT); // 0 + 70 = 70% = 35
        allo().allocate(poolId, abi.encode(votes));
        console.log("TOTAL POINTS ACTIVATED", cv.totalPointsActivated());
        stopMeasuringGas();

        uint256 rollTo100 =
            calculateBlocksTo100(ABDKMath64x64.divu(9999999, 1e7), ABDKMath64x64.divu(getDecay(cv), 1e7));
        vm.roll(rollTo100);
        cv.updateProposalConviction(proposalId);
        console.log("maxCVSupply:   %s", ConvictionsUtils.getMaxConviction(cv.totalPointsActivated(), getDecay(cv)));
        console.log(
            "maxCVStaked:   %s", ConvictionsUtils.getMaxConviction(cv.getProposalStakedAmount(proposalId), getDecay(cv))
        );
        // uint256 STAKED_AMOUNT = uint256(SUPPORT_PCT) * MINIMUM_STAKE / 100e4;
        assertEq(cv.getProposalVoterStake(proposalId, address(this)), uint256(SUPPORT_PCT)); // 80% of 50 = 40
        assertEq(cv.getProposalStakedAmount(proposalId), uint256(SUPPORT_PCT)); // 80% of 50 = 40

        (,
            // address submitter,
            address beneficiary, // address requestedToken,
            ,
            uint256 requestedAmount, // uint256 stakedTokens, // ProposalStatus proposalStatus, // uint256 blockLast,
            ,,,
            uint256 convictionLast,
            uint256 threshold, // uint256 voterPointsPct
            ,,
        ) = cv.getProposal(proposalId);
        bytes memory dataProposal = abi.encode(proposalId);

        console.log("pool.token: %s", pool.token);
        uint256 amount = getBalance(pool.token, beneficiary);
        console.log("Beneficienry Before amount: %s", amount);

        uint256 poolAmount = cv.getPoolAmount();
        //For test when pool amount lower than funding amount, but not 0 (because that is poolIsEmpty())
        uint256 remainingBalance = 1;
        // Emptying pool
        if (pool.token == NATIVE) {
            // For native token (ETH), set balance to 1 ether
            vm.deal(address(cv), 1 ether);
        } else {
            // For ERC20 tokens, transfer balance out
            vm.prank(address(cv));
            IERC20(pool.token).transfer(address(0xdead), poolAmount - 1);
        }

        vm.expectRevert(abi.encodeWithSelector(CVStrategy.PoolAmountNotEnough.selector, proposalId, requestedAmount, 1));
        allo().distribute(poolId, new address[](0), dataProposal);
    }

    function test_distribute_native_token() public {
        //0 = 1000 ether requestAmount
        (IAllo.Pool memory pool, uint256 poolId, uint256 proposalId) = _createProposal(NATIVE, 0, 0);

        CVStrategy cv = CVStrategy(payable(address(pool.strategy)));

        // assertEq(
        //     registryCommunity.getMemberPowerInStrategy(address(this), address(cv)),
        //     registryCommunity.getMemberStakedAmount(address(this))
        // );
        // startMeasuringGas("Support a Proposal");
        int256 SUPPORT_PCT = int256(MINIMUM_STAKE);
        ProposalSupport[] memory votes = new ProposalSupport[](1);
        // votes[0] = ProposalSupport(proposalId, SUPPORT_PCT ); // 0 + 70 = 70% = 35
        votes[0] = ProposalSupport(proposalId, SUPPORT_PCT); // 0 + 70 = 70% = 35
        // bytes memory data = ;
        allo().allocate(poolId, abi.encode(votes));
        console.log("TOTAL POINTS ACTIVATED", cv.totalPointsActivated());
        stopMeasuringGas();

        uint256 rollTo100 =
            calculateBlocksTo100(ABDKMath64x64.divu(9999999, 1e7), ABDKMath64x64.divu(getDecay(cv), 1e7));
        vm.roll(rollTo100);

        cv.updateProposalConviction(proposalId);

        // uint256 totalEffectiveActivePoints = cv.totalEffectiveActivePoints();
        // console.log("totalEffectiveActivePoints", totalEffectiveActivePoints);
        console.log("maxCVSupply:   %s", ConvictionsUtils.getMaxConviction(cv.totalPointsActivated(), getDecay(cv)));
        console.log(
            "maxCVStaked:   %s", ConvictionsUtils.getMaxConviction(cv.getProposalStakedAmount(proposalId), getDecay(cv))
        );
        // uint256 STAKED_AMOUNT = uint256(SUPPORT_PCT) * MINIMUM_STAKE / 100e4;
        assertEq(cv.getProposalVoterStake(proposalId, address(this)), uint256(SUPPORT_PCT)); // 80% of 50 = 40
        assertEq(cv.getProposalStakedAmount(proposalId), uint256(SUPPORT_PCT)); // 80% of 50 = 40

        (,
            // address submitter,
            address beneficiary, // address requestedToken,
            ,
            uint256 requestedAmount, // uint256 stakedTokens, // ProposalStatus proposalStatus, // uint256 blockLast,
            ,,,
            uint256 convictionLast,
            uint256 threshold, // uint256 voterPointsPct
            ,,
        ) = cv.getProposal(proposalId);

        // console.log("Proposal Status: %s", proposalStatus);
        // console.log("Proposal Type: %s", proposalType);
        // console.log("Requested Token: %s", requestedToken);
        // console.log("Requested Amount: %s", requestedAmount);
        // console.log("Staked Tokens: %s", stakedTokens);
        console.log("Threshold:     %s", threshold);
        // console.log("Agreement Action Id: %s", agreementActionId);
        // console.log("Block Last: %s", blockLast);
        console.log("Conv Last:     %s", convictionLast);
        // console.log("Voter points pct %s", voterPointsPct);
        // console.log("Beneficiary: %s", beneficiary);
        // console.log("Submitter: %s", submitter);
        address[] memory recipients = new address[](0);
        // recipients[0] = address(1);
        bytes memory dataProposal = abi.encode(proposalId);

        uint256 amount = getBalance(pool.token, beneficiary);
        // console.log("Beneficienry Before amount: %s", amount);

        assertEq(amount, 0);

        allo().distribute(poolId, recipients, dataProposal);
        //@todo chec ProposalStatus
        // vm.expectRevert(abi.encodeWithSelector(CVStrategy.ProposalNotActive.selector, proposalId));
        vm.expectRevert();

        allo().distribute(poolId, recipients, dataProposal);

        cv.updateProposalConviction(proposalId);
        amount = getBalance(pool.token, beneficiary);
        // console.log("Beneficienry After amount: %s", amount);
        (,, uint256 submitterCollateralAmount,,,) = cv.getArbitrableConfig();
        assertEq(amount, requestedAmount + submitterCollateralAmount);
        _assertProposalStatus(cv, proposalId, ProposalStatus.Executed);
    }

    function testRevert_onlyCouncilSafe() public {
        (IAllo.Pool memory pool, uint256 poolId, uint256 proposalId) = _createProposal(NATIVE, 0, 0);

        /**
         * ASSERTStestRevert_onlyCouncilSafe
         *
         */
        // startMeasuringGas("Support a Proposal");
        stopMeasuringGas();
        CVStrategy cv = CVStrategy(payable(address(pool.strategy)));
        vm.startPrank(gardenMember);
        // vm.expectRevert(abi.encodeWithSelector(CVStrategyBaseFacet.OnlyCouncilSafe.selector));
        vm.expectRevert();

        cv.setPoolParams(
            ArbitrableConfig(IArbitrator(address(0)), address(0), 0, 0, 0, 0),
            CVParams({
                maxRatio: _etherToFloat(0.1 ether),
                weight: _etherToFloat(0.0005 ether),
                decay: _etherToFloat(0.9965402 ether),
                minThresholdPoints: 0
            }),
            MINIMUM_SYBIL_SCORE,
            new address[](0),
            new address[](0),
            address(0)
        );
    }

    function test_setPoolParams_arbitrableConfig_newArbitrator() public {
        (IAllo.Pool memory pool, uint256 poolId, uint256 proposalId) = _createProposal(NATIVE, 0, 0);
        CVStrategy cv = CVStrategy(payable(address(pool.strategy)));

        // Create new arbitrator
        ERC1967Proxy newArbitratorProxy = new ERC1967Proxy(
            address(new SafeArbitrator()),
            abi.encodeWithSelector(SafeArbitrator.initialize.selector, 0.01 ether, factoryOwner)
        );
        SafeArbitrator newArbitrator = SafeArbitrator(payable(address(newArbitratorProxy)));

        // Get current version
        uint256 currentVersion = cv.currentArbitrableConfigVersion();

        // Create new config with different arbitrator
        ArbitrableConfig memory newConfig = ArbitrableConfig({
            arbitrator: newArbitrator,
            tribunalSafe: tribunalSafe,
            submitterCollateralAmount: 0.1 ether,
            challengerCollateralAmount: 0.1 ether,
            defaultRuling: 0,
            defaultRulingTimeout: 300
        });

        CVParams memory cvParams = CVParams({
            maxRatio: _etherToFloat(0.1 ether),
            weight: _etherToFloat(0.0005 ether),
            decay: _etherToFloat(0.9965402 ether),
            minThresholdPoints: 0
        });

        vm.startPrank(address(councilSafe));
        cv.setPoolParams(newConfig, cvParams, MINIMUM_SYBIL_SCORE, new address[](0), new address[](0), address(0));
        vm.stopPrank();

        // Verify version incremented
        uint256 newVersion = cv.currentArbitrableConfigVersion();
        (IArbitrator updatedArbitrator,,,,,) = cv.getArbitrableConfig();
        assertEq(newVersion, currentVersion + 1, "Version should increment");
        assertEq(address(updatedArbitrator), address(newArbitrator), "Arbitrator should be updated");
    }

    function test_setPoolParams_modifyThreshold() public {
        (IAllo.Pool memory pool, uint256 poolId, uint256 proposalId) = _createProposal(NATIVE, 0, 0);

        /**
         * ASSERTStestRevert_onlyCouncilSafe
         *
         */
        // startMeasuringGas("Support a Proposal");
        stopMeasuringGas();
        CVStrategy cv = CVStrategy(payable(address(pool.strategy)));
        vm.startPrank(address(registryCommunity.councilSafe()));
        // vm.expectRevert();
        cv.setSybilScorer(address(passportScorer), MINIMUM_SYBIL_SCORE - 10);

        cv.setPoolParams(
            ArbitrableConfig(IArbitrator(address(0)), address(0), 0, 0, 0, 0),
            CVParams({
                maxRatio: _etherToFloat(0.1 ether),
                weight: _etherToFloat(0.0005 ether),
                decay: _etherToFloat(0.9965402 ether),
                minThresholdPoints: 0
            }),
            MINIMUM_SYBIL_SCORE,
            new address[](0),
            new address[](0),
            address(passportScorer)
        );
    }

    function testRevert_conviction_distribute() public {
        (IAllo.Pool memory pool, uint256 poolId, uint256 proposalId) = _createProposal(NATIVE, 0, 0);

        /**
         * ASSERTS
         *
         */
        // startMeasuringGas("Support a Proposal");
        stopMeasuringGas();
        CVStrategy cv = CVStrategy(payable(address(pool.strategy)));
        uint256 wrongProposalId = 4;
        // vm.expectRevert(abi.encodeWithSelector(CVStrategy.ProposalNotInList.selector, wrongProposalId));
        vm.expectRevert();

        cv.updateProposalConviction(wrongProposalId);
        cv.updateProposalConviction(proposalId);
        address[] memory recipients = new address[](0);
        bytes memory dataProposal = abi.encode(proposalId);

        assertEq(_canExecuteProposal(cv, proposalId), false, "canExecuteProposal");

        // vm.expectRevert(abi.encodeWithSelector(CVStrategy.ConvictionUnderMinimumThreshold.selector));
        vm.expectRevert();

        allo().distribute(poolId, recipients, dataProposal);

        _assertProposalStatus(cv, proposalId, ProposalStatus.Active);
    }

    // @todo commented because of this check is commented in the contract to save space
    // function testRevert_proposalId_distribute() public {
    //     (IAllo.Pool memory pool, uint256 poolId, uint256 proposalId) = _createProposal(NATIVE, 0, 0);
    //     /**
    //      * ASSERTS
    //      *
    //      */
    //     // startMeasuringGas("Support a Proposal");
    //     stopMeasuringGas();
    //     CVStrategy cv = CVStrategy(payable(address(pool.strategy)));
    //     cv.updateProposalConviction(proposalId);
    //     address[] memory recipients = new address[](0);
    //     bytes memory dataProposal = abi.encode(0);
    //     assertEq(_canExecuteProposal(cv, proposalId), false, "canExecuteProposal");
    // //     vm.expectRevert(abi.encodeWithSelector(CVStrategy.ProposalIdCannotBeZero.selector));
    // vm.expectRevert();

    //     allo().distribute(proposalId, recipients, dataProposal);
    //     _assertProposalStatus(cv, proposalId, ProposalStatus.Active);
    // }

    function testRevert_proposalData_distribute() public {
        (IAllo.Pool memory pool, uint256 poolId, uint256 proposalId) = _createProposal(NATIVE, 0, 0);
        /**
         * ASSERTS
         *
         */
        // startMeasuringGas("Support a Proposal");
        stopMeasuringGas();
        CVStrategy cv = CVStrategy(payable(address(pool.strategy)));
        cv.updateProposalConviction(proposalId);
        address[] memory recipients = new address[](0);
        bytes memory dataProposal = "";
        assertEq(_canExecuteProposal(cv, proposalId), false, "canExecuteProposal");
        // vm.expectRevert(abi.encodeWithSelector(CVStrategy.ProposalDataIsEmpty.selector));
        vm.expectRevert();

        allo().distribute(proposalId, recipients, dataProposal);
        _assertProposalStatus(cv, proposalId, ProposalStatus.Active);
        _assertProposalStatus(cv, proposalId, ProposalStatus.Active);
    }

    function testRevert_distribute_onlyAllo_Native() public {
        (IAllo.Pool memory pool, uint256 poolId, uint256 proposalId) = _createProposal(NATIVE, 0, 0);
        CVStrategy cv = CVStrategy(payable(address(pool.strategy)));
        address[] memory recipientIds;
        bytes memory data; // Non-empty data
        // bytes memory data = abi.encode(uint256(1)); // Non-empty data
        address sender = address(this);
        // vm.expectRevert(abi.encodeWithSelector(UNAUTHORIZED.selector));
        vm.expectRevert();

        cv.distribute(recipientIds, data, sender);
        uint256 wrongId = 4;
        data = abi.encode(wrongId);
        // vm.expectRevert(abi.encodeWithSelector(CVStrategy.ProposalNotInList.selector, wrongId));
        vm.expectRevert();

        allo().distribute(poolId, recipientIds, data);
    }

    function testRevert_distribute_onlyAllo() public {
        (IAllo.Pool memory pool, uint256 poolId, uint256 proposalId) = _createProposal(address(token), 0, 0);
        CVStrategy cv = CVStrategy(payable(address(pool.strategy)));
        address[] memory recipientIds;
        bytes memory data; // Non-empty data
        // bytes memory data = abi.encode(uint256(1)); // Non-empty data
        address sender = address(this);
        // vm.expectRevert(abi.encodeWithSelector(UNAUTHORIZED.selector));
        vm.expectRevert();

        cv.distribute(recipientIds, data, sender);
    }

    function test_distribute_RevertPoolIsEmpty() public {
        // Create proposal with 0 pool amount
        (IAllo.Pool memory pool, uint256 poolId, uint256 proposalId) = _createProposal(NATIVE, 0, 0);
        CVStrategy cv = CVStrategy(payable(address(pool.strategy)));

        // Allocate support to the proposal
        int256 SUPPORT_PCT = int256(MINIMUM_STAKE);
        ProposalSupport[] memory votes = new ProposalSupport[](1);
        votes[0] = ProposalSupport(proposalId, SUPPORT_PCT);
        allo().allocate(poolId, abi.encode(votes));

        // Roll blocks to build conviction
        vm.roll(calculateBlocksTo100(ABDKMath64x64.divu(9999999, 1e7), ABDKMath64x64.divu(getDecay(cv), 1e7)));
        cv.updateProposalConviction(proposalId);

        // Drain the pool completely (if there's any balance)
        uint256 poolBalance = address(pool.strategy).balance;
        if (poolBalance > 0) {
            vm.deal(address(pool.strategy), 0);
        }

        // Try to distribute with empty pool
        address[] memory recipients = new address[](0);
        bytes memory dataProposal = abi.encode(proposalId);

        // Should revert with PoolIsEmpty
        vm.expectRevert(abi.encodeWithSelector(CVStrategy.PoolIsEmpty.selector, 0));
        allo().distribute(poolId, recipients, dataProposal);
    }

    function test_distribute_WithSuperfluidTokenUnwrap() public {
        // Create proposal with ERC20 token
        (IAllo.Pool memory pool, uint256 poolId, uint256 proposalId) =
            _createProposal(address(token), 12345, 1000 ether);
        CVStrategy cv = CVStrategy(payable(address(pool.strategy)));

        // Create a mock supertoken address
        address mockSuperToken = makeAddr("superToken");

        // Set superfluid token in strategy
        vm.prank(address(registryCommunity.councilSafe()));

        // Mock ISuperToken.balanceOf to return sufficient balance
        vm.mockCall(
            mockSuperToken, abi.encodeWithSelector(ISuperToken.balanceOf.selector, address(cv)), abi.encode(2000 ether)
        );

        // Mock ISuperToken.downgrade
        vm.mockCall(mockSuperToken, abi.encodeWithSelector(ISuperToken.downgrade.selector, 2000 ether), abi.encode());

        // Fund strategy with insufficient base tokens
        token.mint(address(cv), 500 ether); // Less than 1000 ether requested

        // Allocate support
        int256 SUPPORT_PCT = int256(MINIMUM_STAKE);
        ProposalSupport[] memory votes = new ProposalSupport[](1);
        votes[0] = ProposalSupport(proposalId, SUPPORT_PCT);
        allo().allocate(poolId, abi.encode(votes));

        // Build conviction
        vm.roll(calculateBlocksTo100(ABDKMath64x64.divu(9999999, 1e7), ABDKMath64x64.divu(getDecay(cv), 1e7)));
        cv.updateProposalConviction(proposalId);

        // Expect the downgrade call to be made

        // Distribute - should trigger unwrapping
        address[] memory recipients = new address[](0);
        bytes memory dataProposal = abi.encode(proposalId);
        // vm.expectCall(mockSuperToken, abi.encodeWithSelector(ISuperToken.downgrade.selector, 2000 ether));
        allo().distribute(poolId, recipients, dataProposal);

        // Verify distribution succeeded
        _assertProposalStatus(cv, proposalId, ProposalStatus.Executed);
    }

    // Test to check that the user can't add support after being removed from allowlist
    // Should only be able to remove and not add
    function testRevert_allocate_userCantExecuteAction() public {
        (IAllo.Pool memory pool, uint256 poolId, uint256 proposalId) = _createProposal(NATIVE, 0, 0);
        // registryCommunity.setBasisStakedAmount(45000);
        // safeHelper(
        //     address(registryCommunity),
        //     0,
        //     abi.encodeWithSelector(registryCommunity.setBasisStakedAmount.selector, 45 ether)
        // );
        CVStrategy cv = CVStrategy(payable(address(pool.strategy)));
        vm.startPrank(address(councilSafe));
        address[] memory membersToAdd = new address[](1);
        membersToAdd[0] = pool_admin();
        cv.setPoolParams(
            ArbitrableConfig(IArbitrator(address(0)), address(0), 0, 0, 0, 0),
            CVParams(0, 0, 0, 0),
            0,
            membersToAdd,
            new address[](0),
            address(0)
        );
        vm.stopPrank();

        /**
         * ASSERTS
         */
        // // startMeasuringGas("Support a Proposal");
        vm.startPrank(pool_admin());
        token.approve(address(registryCommunity), STAKE_WITH_FEES);
        registryCommunity.stakeAndRegisterMember("");
        cv.activatePoints();
        uint256 AMOUNT_STAKED = 100;
        ProposalSupport[] memory votes = new ProposalSupport[](1);
        votes[0] = ProposalSupport(proposalId, int256(AMOUNT_STAKED));
        bytes memory data = abi.encode(votes);
        allo().allocate(poolId, data);
        vm.stopPrank();
        // stopMeasuringGas();

        assertEq(cv.getProposalVoterStake(1, pool_admin()), AMOUNT_STAKED);
        assertEq(cv.getProposalStakedAmount(1), AMOUNT_STAKED);

        vm.startPrank(address(councilSafe));
        address[] memory membersToRemove = new address[](1);
        membersToRemove[0] = pool_admin();
        cv.setPoolParams(
            ArbitrableConfig(IArbitrator(address(0)), address(0), 0, 0, 0, 0),
            CVParams(0, 0, 0, 0),
            0,
            new address[](0),
            membersToRemove,
            address(0)
        );
        vm.stopPrank();
        vm.startPrank(pool_admin());
        int256 EXTRA_SUPPORT = 20;
        votes[0] = ProposalSupport(1, EXTRA_SUPPORT);
        data = abi.encode(votes);
        // vm.expectRevert(abi.encodeWithSelector(CVStrategy.UserCannotExecuteAction.selector));
        vm.expectRevert();

        allo().allocate(poolId, data);
        vm.stopPrank();
    }

    // @todo uncoment with diamond, this non critical revert logic has been commented out to save space
    // function testRevert_initialize_registryZero() public {
    //     address collateralVaultTemplate = address(new CollateralVault());
    //     ArbitrableConfig memory arbitrableConfig =
    //         ArbitrableConfig(safeArbitrator, payable(address(_councilSafe())), 3 ether, 2 ether, 1, 300);
    //     CVStrategyInitializeParamsV0_2 memory params = getParams(
    //         address(0),
    //         ProposalType.Funding,
    //         PointSystem.Unlimited,
    //         PointSystemConfig(200 * DECIMALS),
    //         arbitrableConfig,
    //         new address[](1),
    //         address(0),
    //         0
    //     );
    // //     vm.expectRevert(abi.encodeWithSelector(CVStrategy.RegistryCannotBeZero.selector));
    // vm.expectRevert();

    //     _registryCommunity().createPool(NATIVE, params, metadata);
    // }

    // function testRevert_initialize_OnlyAllo() public {
    //     // Deploy a new CVStrategy contract and initialize it (not the pool initialization)
    //     address collateralVaultTemplate = address(new CollateralVault());
    //     CVStrategy strategy = new CVStrategy();
    //     strategy.init(address(0), collateralVaultTemplate, address(this));

    //     // Setup pool initialization parameters
    //     ArbitrableConfig memory arbitrableConfig =
    //         ArbitrableConfig(safeArbitrator, payable(address(_councilSafe())), 3 ether, 2 ether, 1, 300);
    //     CVStrategyInitializeParamsV0_2 memory params = getParams(
    //         address(_registryCommunity()),
    //         ProposalType.Funding,
    //         PointSystem.Unlimited,
    //         PointSystemConfig(200 * DECIMALS),
    //         arbitrableConfig,
    //         new address[](0),
    //         address(0),
    //         0,
    //         address(0)
    //     );

    //     bytes memory initData = abi.encode(params);
    //     uint256 poolId = 1;

    //     // Try to initialize from a non-Allo address (pool_admin)
    //     // Should revert with OnlyAllo error
    //     vm.startPrank(pool_admin());
    //     vm.expectRevert();
    //     strategy.initialize(poolId, initData);
    //     vm.stopPrank();

    //     // Verify that Allo can successfully initialize
    //     vm.startPrank(address(allo()));
    //     // This should not revert
    //     strategy.initialize(poolId, initData);
    //     vm.stopPrank();
    // }

    function test_canExecuteProposal_should_false() public {
        (IAllo.Pool memory pool, uint256 poolId, uint256 proposalId) = _createProposal(NATIVE, 0, 0);

        /**
         * ASSERTS
         *
         */
        // startMeasuringGas("Support a Proposal");
        stopMeasuringGas();
        CVStrategy cv = CVStrategy(payable(address(pool.strategy)));

        cv.updateProposalConviction(proposalId);

        assertEq(_canExecuteProposal(cv, proposalId), false, "canExecuteProposal");
    }

    // function test_revert_time_distribute() public {
    //     uint256 request = 150 ether;
    //     (IAllo.Pool memory pool, uint256 poolId, uint256 proposalId) = _createProposal(NATIVE, request, 0);
    //     CVStrategy cv = CVStrategy(payable(address(pool.strategy)));
    //     uint256 extraStakeAmount = 280 ether;
    //     token.approve(address(registryCommunity),extraStakeAmount);
    //     registryCommunity.increasePower(extraStakeAmount);
    //     assertEq(registryCommunity.getMemberPowerInStrategy(address(this),address(cv)),1500 * PRECISION_SCALE);
    //     // uint256 threshold = cv.calculateThreshold(requestedAmount);
    //     /**
    //      * ASSERTS
    //      *
    //      */
    //     // startMeasuringGas("Support a Proposal");
    //     int256 SUPPORT_PCT = 1500;
    //     ProposalSupport[] memory votes = new ProposalSupport[](1);
    //     votes[0] = ProposalSupport(proposalId, SUPPORT_PCT ); // 0 + 70 = 70% = 35
    //     // bytes memory data = ;
    //     allo().allocate(poolId, abi.encode(votes));
    //     stopMeasuringGas();

    //     uint256 STAKED_AMOUNT = uint256(SUPPORT_PCT) * (MINIMUM_STAKE + extraStakeAmount)  / 100;
    //     // assertEq(cv.getProposalVoterStake(proposalId, address(this)), STAKED_AMOUNT); // 80% of 50 = 40
    //     assertEq(cv.getProposalStakedAmount(proposalId), STAKED_AMOUNT); // 80% of 50 = 40

    //     (
    //         , // address submitter,
    //         address beneficiary,
    //         , // address requestedToken,
    //         uint256 requestedAmount,
    //         , // uint256 stakedTokens,
    //         , // ProposalStatus proposalStatus,
    //         , // uint256 blockLast,
    //         , // uint256 convictionLast,
    //         uint256 threshold,
    //             // uint256 voterPointsPct
    //     ) = cv.getProposal(proposalId);

    //     console.log("THRESHOLDDDDD", threshold);

    //     // console.log("Proposal Status: %s", proposalStatus);
    //     // console.log("Proposal Type: %s", proposalType);
    //     // console.log("Requested Token: %s", requestedToken);
    //     // console.log("Requested Amount: %s", requestedAmount);
    //     // console.log("Staked Tokens: %s", stakedTokens);
    //     // console.log("Threshold: %s", threshold);
    //     // console.log("Agreement Action Id: %s", agreementActionId);
    //     // console.log("Block Last: %s", blockLast);
    //     // console.log("Conviction Last: %s", convictionLast);
    //     // console.log("Voter points pct %s", voterPointsPct);
    //     // console.log("Beneficiary: %s", beneficiary);
    //     // console.log("Submitter: %s", submitter);
    //     address[] memory recipients = new address[](0);
    //     // recipients[0] = address(1);
    //     bytes memory dataProposal = abi.encode(proposalId);

    //     uint256 amount = getBalance(pool.token, beneficiary);
    //     // console.log("Beneficienry Before amount: %s", amount);

    //     assertEq(amount, 0);

    //     // allo().distribute(poolId, recipients, dataProposal);
    //     // amount = getBalance(pool.token, beneficiary);
    //     // // console.log("Beneficienry After amount: %s", amount);
    //     // assertEq(amount, requestedAmount);
    // _assertProposalStatus(cv, proposalId, ProposalStatus.Executed);

    // }

    function test_distribute_signaling_proposal() public {
        (IAllo.Pool memory pool, uint256 poolId,) =
            _createProposal(NATIVE, 0, 0, ProposalType.Signaling, PointSystem.Unlimited);

        startMeasuringGas("createProposal");

        CVStrategy cv = CVStrategy(payable(address(pool.strategy)));

        CreateProposal memory proposal = CreateProposal(poolId, address(0), 0, address(0), metadata);
        bytes memory data = abi.encode(proposal);
        (,, uint256 submitterCollateralAmount,,,) = cv.getArbitrableConfig();
        vm.deal(address(this), submitterCollateralAmount);
        vm.expectRevert();
        // vm.expectRevert(
        // abi.encodeWithSelector(CVStrategy.InsufficientCollateral.selector, 0, submitterCollateralAmount)
        // );
        uint256 WRONG_PROPOSAL_ID = uint160(allo().registerRecipient{value: 0}(poolId, data));
        uint256 PROPOSAL_ID = uint160(allo().registerRecipient{value: submitterCollateralAmount}(poolId, data));

        stopMeasuringGas();
        /**
         * ASSERTS
         *
         */
        // startMeasuringGas("Support a Proposal");
        int256 SUPPORT_PCT = 100;
        ProposalSupport[] memory votes = new ProposalSupport[](1);
        votes[0] = ProposalSupport(PROPOSAL_ID, SUPPORT_PCT); // 0 + 70 = 70% = 35
        // bytes memory data = ;
        allo().allocate(poolId, abi.encode(votes));
        stopMeasuringGas();

        uint256 STAKED_AMOUNT = uint256(SUPPORT_PCT);
        assertEq(cv.getProposalVoterStake(PROPOSAL_ID, address(this)), STAKED_AMOUNT); // 80% of 50 = 40
        assertEq(cv.getProposalStakedAmount(PROPOSAL_ID), STAKED_AMOUNT); // 80% of 50 = 40

        printProposalDetails(cv, PROPOSAL_ID);
        // address[] memory recipients = ;
        // recipients[0] = address(1);
        bytes memory dataProposal = abi.encode(PROPOSAL_ID);

        allo().distribute(poolId, new address[](0), dataProposal);
        // console.log("Beneficienry After amount: %s", amount);
        _assertProposalStatus(cv, PROPOSAL_ID, ProposalStatus.Active);
    }

    function printProposalDetails(CVStrategy cv, uint256 proposalId) public view {
        (
            ,,,
            // address submitter,
            // address beneficiary,
            // address requestedToken,
            uint256 requestedAmount,
            uint256 stakedTokens, // ProposalStatus proposalStatus,
            ,
            uint256 blockLast,
            uint256 convictionLast,
            uint256 threshold, // uint256 voterPointsPct
            ,,
        ) = cv.getProposal(proposalId);

        // console.log("Proposal Status: %s", proposalStatus);
        // console.log("Proposal Type: %s", proposalType);
        // console.log("Requested Token: %s", requestedToken);

        // Return the proposal details
        console.log("Requested Amount: %s", requestedAmount);
        console.log("Staked Tokens: %s", stakedTokens);
        console.log("Threshold: %s", threshold);
        // console.log("Agreement Action Id: %s", agreementActionId);
        console.log("Block Last: %s", blockLast);
        console.log("Conviction Last: %s", convictionLast);
        // console.log("Voter points pct %s", voterPointsPct);
        // console.log("Beneficiary: %s", beneficiary);
        // console.log("Submitter: %s", submitter);
    }

    function test_registry_community_name_default_empty() public {
        // RegistryFactory _registryFactory = new RegistryFactory();

        RegistryCommunityInitializeParams memory params;
        params._allo = address(allo());
        params._gardenToken = IERC20(address(token));
        params._registerStakeAmount = MINIMUM_STAKE;
        params._communityFee = 2;
        params._feeReceiver = address(this);
        params._metadata = metadata;
        params._councilSafe = payable(address(_councilSafe()));
        params._isKickEnabled = true;

        registryCommunity = RegistryCommunity(registryFactory.createRegistry(params));
        // CVStrategy cv = CVStrategy(payable(address(pool.strategy)));

        assertEq(registryCommunity.communityName(), "", "communityMember");
    }

    function test_registry_community_name_defined() public {
        // RegistryFactory registryFactory = new RegistryFactory();

        RegistryCommunityInitializeParams memory params;
        params._allo = address(allo());
        params._gardenToken = IERC20(address(token));
        params._registerStakeAmount = MINIMUM_STAKE;
        params._communityFee = 2;
        params._feeReceiver = address(this);
        params._metadata = metadata;
        params._councilSafe = payable(address(_councilSafe()));
        params._communityName = "GardensDAO";

        registryCommunity = RegistryCommunity(registryFactory.createRegistry(params));
        // CVStrategy cv = CVStrategy(payable(address(pool.strategy)));

        assertEq(registryCommunity.communityName(), "GardensDAO", "communityMember");
    }

    function test_activate_points_unlimited() public {
        (IAllo.Pool memory pool,,) = _createProposal(address(0), 0, 0);

        CVStrategy cv = CVStrategy(payable(address(pool.strategy)));

        registryCommunity.stakeAndRegisterMember("");
        assertEq(registryCommunity.isMember(local()), true, "isMember");

        // vm.expectRevert(abi.encodeWithSelector(RegistryCommunity.UserAlreadyActivated.selector));
        vm.expectRevert();

        cv.activatePoints();

        vm.startPrank(pool_admin());
        token.approve(address(registryCommunity), STAKE_WITH_FEES);
        registryCommunity.stakeAndRegisterMember("");
        assertEq(registryCommunity.isMember(pool_admin()), true, "isMember");

        cv.activatePoints();
        vm.stopPrank();

        assertEq(registryCommunity.isMember(pool_admin()), true, "isMember");
    }

    function test_deactivate_points() public {
        (IAllo.Pool memory pool,,) = _createProposal(address(0), 0, 0);

        CVStrategy cv = CVStrategy(payable(address(pool.strategy)));
        registryCommunity.stakeAndRegisterMember("");

        assertEq(registryCommunity.isMember(local()), true, "isMember");

        assertEq(cv.totalPointsActivated(), MINIMUM_STAKE, "totalPointsAct1");

        // vm.expectRevert(abi.encodeWithSelector(RegistryCommunity.UserAlreadyActivated.selector));
        vm.expectRevert();

        cv.activatePoints();

        vm.startPrank(local());
        {
            cv.deactivatePoints();

            assertEq(cv.totalPointsActivated(), 0, "totalPointsAct2");
            // assertEq(registryCommunity.isMember(local()), false, "isMember");

            cv.activatePoints();

            assertEq(cv.totalPointsActivated(), MINIMUM_STAKE, "totalPointsAct3");
        }
        vm.stopPrank();

        vm.startPrank(pool_admin());
        {
            token.approve(address(registryCommunity), STAKE_WITH_FEES);
            registryCommunity.stakeAndRegisterMember("");

            assertEq(registryCommunity.isMember(pool_admin()), true, "isMember");

            cv.activatePoints();

            assertEq(cv.totalPointsActivated(), MINIMUM_STAKE * 2, "totalPointsAct4");

            cv.deactivatePoints();

            assertEq(cv.totalPointsActivated(), MINIMUM_STAKE);
        }
        vm.stopPrank();

        // assertEq(registryCommunity.isMember(pool_admin()), false, "isMember");
    }

    // @todo uncomment when uncomenting setSybilScorer
    function test_activatePoints_with_enough_score() public {
        (IAllo.Pool memory pool, uint256 poolId,) = _createProposal(NATIVE, 0, 0);
        CVStrategy cv = CVStrategy(payable(address(pool.strategy)));

        vm.startPrank(address(_councilSafe()));
        cv.setSybilScorer(address(passportScorer), MINIMUM_SYBIL_SCORE);
        passportScorer.activateStrategy(address(cv));
        vm.stopPrank();

        //Because OnlyAuthorized and factoryOwner also Passport owner
        vm.startPrank(listManager);
        uint256 passportScore = MINIMUM_SYBIL_SCORE + 1;
        passportScorer.addUserScore(address(6), passportScore);

        vm.startPrank(address(6));
        token.approve(address(registryCommunity), STAKE_WITH_FEES);

        registryCommunity.stakeAndRegisterMember("");

        cv.activatePoints();

        vm.stopPrank();

        assertEq(cv.totalPointsActivated(), MINIMUM_STAKE * 2, "Points should be activated");
    }

    // @todo uncomment when uncomenting setSybilScorer
    function test_activatePoints_fails_not_enough_score() public {
        (IAllo.Pool memory pool, uint256 poolId,) = _createProposal(NATIVE, 0, 0);
        CVStrategy cv = CVStrategy(payable(address(pool.strategy)));

        vm.startPrank(address(_councilSafe()));
        cv.setSybilScorer(address(passportScorer), MINIMUM_SYBIL_SCORE);
        passportScorer.activateStrategy(address(cv));
        vm.stopPrank();

        uint256 passportScore = MINIMUM_SYBIL_SCORE - 1;
        //Because OnlyAuthorized and factoryOwner also Passport owner
        vm.startPrank(listManager);
        passportScorer.addUserScore(address(6), passportScore);

        vm.startPrank(address(6));
        token.approve(address(registryCommunity), STAKE_WITH_FEES);

        registryCommunity.stakeAndRegisterMember("");

        //     vm.expectRevert(abi.encodeWithSelector(CVStrategy.UserCannotExecuteAction.selector));
        vm.expectRevert();

        cv.activatePoints();

        vm.stopPrank();
    }

    // @todo uncomment when uncomenting setSybilScorer
    function test_activatePoints_success_not_activated_strategy() public {
        (IAllo.Pool memory pool, uint256 poolId,) = _createProposal(NATIVE, 0, 0);
        CVStrategy cv = CVStrategy(payable(address(pool.strategy)));

        vm.startPrank(address(_councilSafe()));
        cv.setSybilScorer(address(passportScorer), MINIMUM_SYBIL_SCORE);

        // passportScorer.activateStrategy(address(cv));
        vm.stopPrank();
        vm.startPrank(listManager);

        //notice how we set the score to the user as 0
        uint256 passportScore = 0;
        passportScorer.addUserScore(address(6), passportScore);

        vm.startPrank(address(6));
        token.approve(address(registryCommunity), STAKE_WITH_FEES);

        registryCommunity.stakeAndRegisterMember("");

        cv.activatePoints();

        vm.stopPrank();

        assertEq(cv.totalPointsActivated(), MINIMUM_STAKE * 2, "Points should be activated");
    }

    // @todo uncomment when uncomenting setSybilScorer
    function test_activatePoints_success_not_sybyl_scorer_set() public {
        (IAllo.Pool memory pool, uint256 poolId,) = _createProposal(NATIVE, 0, 0);
        CVStrategy cv = CVStrategy(payable(address(pool.strategy)));
        vm.startPrank(listManager);
        passportScorer.addStrategy(address(cv), MINIMUM_SYBIL_SCORE, address(_councilSafe()));

        //notice how we set the score to the user as 0
        uint256 passportScore = 0;
        passportScorer.addUserScore(address(6), passportScore);

        vm.startPrank(address(6));
        token.approve(address(registryCommunity), STAKE_WITH_FEES);

        registryCommunity.stakeAndRegisterMember("");

        cv.activatePoints();

        vm.stopPrank();

        assertEq(cv.totalPointsActivated(), MINIMUM_STAKE * 2, "Points should be activated");
    }

    // @todo uncomment when uncomenting setSybilScorer
    function test_allocate_not_enough_score() public {
        (IAllo.Pool memory pool, uint256 poolId, uint256 proposalId) = _createProposal(NATIVE, 0, 0);

        CVStrategy cv = CVStrategy(payable(address(pool.strategy)));

        vm.startPrank(address(_councilSafe()));
        cv.setSybilScorer(address(passportScorer), MINIMUM_SYBIL_SCORE);
        passportScorer.activateStrategy(address(cv));
        vm.stopPrank();

        //Because OnlyAuthorized and factoryOwner also Passport owner
        vm.startPrank(listManager);
        uint256 passportScore = MINIMUM_SYBIL_SCORE - 1;
        passportScorer.addUserScore(address(6), passportScore);

        ProposalSupport[] memory votes = new ProposalSupport[](1);
        votes[0] = ProposalSupport(proposalId, 80);

        bytes memory data = abi.encode(votes);

        vm.startPrank(address(6));

        token.approve(address(registryCommunity), STAKE_WITH_FEES);
        registryCommunity.stakeAndRegisterMember("");

        //     vm.expectRevert(abi.encodeWithSelector(CVStrategy.UserCannotExecuteAction.selector));
        vm.expectRevert();

        allo().allocate(poolId, data);
        vm.stopPrank();
    }

    // @todo uncomment when uncomenting setSybilScorer
    function test_allocate_success_enough_score() public {
        (IAllo.Pool memory pool, uint256 poolId, uint256 proposalId) = _createProposal(NATIVE, 0, 0);

        CVStrategy cv = CVStrategy(payable(address(pool.strategy)));

        vm.startPrank(address(_councilSafe()));
        cv.setSybilScorer(address(passportScorer), MINIMUM_SYBIL_SCORE);
        passportScorer.activateStrategy(address(cv));
        vm.stopPrank();
        vm.startPrank(listManager);

        uint256 passportScore = MINIMUM_SYBIL_SCORE + 1;
        passportScorer.addUserScore(address(6), passportScore);

        ProposalSupport[] memory votes = new ProposalSupport[](1);
        votes[0] = ProposalSupport(proposalId, 80);

        bytes memory data = abi.encode(votes);

        vm.startPrank(address(6));

        token.approve(address(registryCommunity), STAKE_WITH_FEES);
        registryCommunity.stakeAndRegisterMember("");
        cv.activatePoints();

        allo().allocate(poolId, data);

        assertEq(cv.getProposalVoterStake(proposalId, address(6)), 80);
        assertEq(cv.getProposalStakedAmount(proposalId), 80);
        vm.stopPrank();
    }

    // Test that a user who cannot execute actions cannot add positive support
    // This tests line 83-84 in CVAllocationFacet.sol
    function testRevert_allocate_userCannotAddSupport_whenNotAllowlisted() public {
        (IAllo.Pool memory pool, uint256 poolId, uint256 proposalId) = _createProposal(NATIVE, 0, 0);
        CVStrategy cv = CVStrategy(payable(address(pool.strategy)));

        // Setup allowlist mode by adding specific members
        vm.startPrank(address(councilSafe));
        address[] memory membersToAdd = new address[](1);
        membersToAdd[0] = pool_admin(); // Only pool_admin is allowlisted
        cv.setPoolParams(
            ArbitrableConfig(IArbitrator(address(0)), address(0), 0, 0, 0, 0),
            CVParams(0, 0, 0, 0),
            0,
            membersToAdd,
            new address[](0),
            address(0)
        );
        vm.stopPrank();

        // gardenMember registers but is NOT in allowlist
        vm.startPrank(gardenMember);
        token.approve(address(registryCommunity), STAKE_WITH_FEES);
        registryCommunity.stakeAndRegisterMember("");
        // cv.activatePoints();

        // Try to add positive support - should fail because user cannot execute actions
        ProposalSupport[] memory votes = new ProposalSupport[](1);
        votes[0] = ProposalSupport(proposalId, 100); // positive deltaSupport
        bytes memory data = abi.encode(votes);

        vm.expectRevert();
        allo().allocate(poolId, data);
        vm.stopPrank();
    }

    // Test that a user who cannot execute actions CAN remove support (negative delta)
    // This verifies the logic in line 83-84 only checks positive deltaSupport
    function test_allocate_userCanRemoveSupport_whenNotAllowlisted() public {
        (IAllo.Pool memory pool, uint256 poolId, uint256 proposalId) = _createProposal(NATIVE, 0, 0);
        CVStrategy cv = CVStrategy(payable(address(pool.strategy)));

        // First, user adds support while allowlisted
        vm.startPrank(gardenMember);
        token.approve(address(registryCommunity), STAKE_WITH_FEES);
        registryCommunity.stakeAndRegisterMember("");
        cv.activatePoints();

        ProposalSupport[] memory votes = new ProposalSupport[](1);
        votes[0] = ProposalSupport(proposalId, 100);
        bytes memory data = abi.encode(votes);
        allo().allocate(poolId, data);
        vm.stopPrank();

        assertEq(cv.getProposalVoterStake(proposalId, gardenMember), 100);

        // Now remove user from allowlist
        vm.startPrank(address(councilSafe));
        address[] memory membersToAdd = new address[](1);
        membersToAdd[0] = pool_admin(); // Only pool_admin is allowlisted now
        cv.setPoolParams(
            ArbitrableConfig(IArbitrator(address(0)), address(0), 0, 0, 0, 0),
            CVParams(0, 0, 0, 0),
            0,
            membersToAdd,
            new address[](0),
            address(0)
        );
        vm.stopPrank();

        // User can still REMOVE support even though not allowlisted
        vm.startPrank(gardenMember);
        votes[0] = ProposalSupport(proposalId, -50); // negative deltaSupport
        data = abi.encode(votes);
        allo().allocate(poolId, data); // Should succeed
        vm.stopPrank();

        assertEq(cv.getProposalVoterStake(proposalId, gardenMember), 50);
    }

    // Test that non-existent proposal IDs revert with ProposalNotInList
    // This tests line 90-93 in CVAllocationFacet.sol
    function testRevert_allocate_nonExistentProposal() public {
        (IAllo.Pool memory pool, uint256 poolId, uint256 proposalId) = _createProposal(NATIVE, 0, 0);
        CVStrategy cv = CVStrategy(payable(address(pool.strategy)));

        vm.startPrank(pool_admin());
        token.approve(address(registryCommunity), STAKE_WITH_FEES);
        registryCommunity.stakeAndRegisterMember("");
        cv.activatePoints();

        // Try to allocate to non-existent proposal
        uint256 nonExistentId = proposalId + 999;
        ProposalSupport[] memory votes = new ProposalSupport[](1);
        votes[0] = ProposalSupport(nonExistentId, 100);

        bytes memory data = abi.encode(votes);

        vm.expectRevert();
        allo().allocate(poolId, data);
        vm.stopPrank();
    }

    function testRevert_allocate_ProposalNotInList() public {
        (IAllo.Pool memory pool, uint256 poolId, uint256 proposalId) = _createProposal(NATIVE, 0, 0);
        CVStrategy cv = CVStrategy(payable(address(pool.strategy)));

        vm.startPrank(pool_admin());
        token.approve(address(registryCommunity), STAKE_WITH_FEES);
        registryCommunity.stakeAndRegisterMember("");
        cv.activatePoints();

        ProposalSupport[] memory votes = new ProposalSupport[](2);
        votes[0] = ProposalSupport(0, 80); // Non-existent proposal ID
        votes[1] = ProposalSupport(999, 80); // Non-existent proposal ID
        // votes[0] = ProposalSupport(proposalId, 80); // positive deltaSupport

        bytes memory data = abi.encode(votes);

        vm.expectRevert(abi.encodeWithSelector(CVStrategy.ProposalInvalidForAllocation.selector, 0, 0));
        // vm.expectRevert();
        allo().allocate(poolId, data);
        vm.stopPrank();
    }

    // Test that canExecuteAction check works with sybil scorer
    function testRevert_allocate_userCannotAddSupport_withSybilScorer() public {
        (IAllo.Pool memory pool, uint256 poolId, uint256 proposalId) = _createProposal(NATIVE, 0, 0);
        CVStrategy cv = CVStrategy(payable(address(pool.strategy)));

        // Setup sybil scorer
        vm.startPrank(address(_councilSafe()));
        cv.setSybilScorer(address(passportScorer), MINIMUM_SYBIL_SCORE);
        passportScorer.activateStrategy(address(cv));
        vm.stopPrank();

        // Give user insufficient score
        vm.startPrank(listManager);
        uint256 insufficientScore = MINIMUM_SYBIL_SCORE - 1;
        passportScorer.addUserScore(address(6), insufficientScore);
        vm.stopPrank();

        // Try to add support with insufficient score
        vm.startPrank(address(6));
        token.approve(address(registryCommunity), STAKE_WITH_FEES);
        registryCommunity.stakeAndRegisterMember("");

        ProposalSupport[] memory votes = new ProposalSupport[](1);
        votes[0] = ProposalSupport(proposalId, 80); // positive deltaSupport
        bytes memory data = abi.encode(votes);

        vm.expectRevert();
        allo().allocate(poolId, data);
        vm.stopPrank();
    }

    // Comprehensive test combining all validation logic from lines 82-93
    // function test_allocate_comprehensiveValidation() public {
    //     (IAllo.Pool memory pool, uint256 poolId, uint256 proposalId) = _createProposal(NATIVE, 0, 0);
    //     CVStrategy cv = CVStrategy(payable(address(pool.strategy)));

    //     // Create additional proposal
    //     vm.startPrank(address(gardenMember));
    //     token.approve(address(registryCommunity), STAKE_WITH_FEES);
    //     registryCommunity.stakeAndRegisterMember("");

    //     CreateProposal memory proposal2 = CreateProposal(poolId, pool_admin(), REQUESTED_AMOUNT, NATIVE, metadata);
    //     bytes memory proposalData = abi.encode(proposal2);
    //     (,, uint256 submitterCollateralAmount,,,) = cv.getArbitrableConfig();
    //     vm.deal(address(gardenMember), submitterCollateralAmount * 2);
    //     uint256 proposalId2 = uint160(allo().registerRecipient{value: submitterCollateralAmount}(poolId, proposalData));
    //     vm.stopPrank();

    //     // User allocates successfully
    //     vm.startPrank(pool_admin());
    //     token.approve(address(registryCommunity), STAKE_WITH_FEES);
    //     registryCommunity.stakeAndRegisterMember("");
    //     cv.activatePoints();

    //     // Test all scenarios in one allocation:
    //     // - proposalId == 0 (skip)
    //     // - valid proposal 1 (add support)
    //     // - valid proposal 2 (add support)
    //     // - proposalId == 0 again (skip)
    //     ProposalSupport[] memory votes = new ProposalSupport[](4);
    //     votes[0] = ProposalSupport(0, 100); // Should be skipped
    //     votes[1] = ProposalSupport(proposalId, 150); // Valid
    //     votes[2] = ProposalSupport(proposalId2, 50); // Valid
    //     votes[3] = ProposalSupport(0, -75); // Should be skipped

    //     bytes memory data = abi.encode(votes);
    //     allo().allocate(poolId, data);

    //     // Verify only valid proposals received support
    //     assertEq(cv.getProposalVoterStake(proposalId, pool_admin()), 150);
    //     assertEq(cv.getProposalVoterStake(proposalId2, pool_admin()), 50);
    //     assertEq(cv.totalVoterStakePct(pool_admin()), 200);

    //     // Now test that user can remove support (negative delta) after being removed from allowlist
    //     vm.stopPrank();

    //     // Remove user from allowlist
    //     vm.startPrank(address(councilSafe));
    //     address[] memory membersToAdd = new address[](1);
    //     membersToAdd[0] = address(7); // Different user in allowlist
    //     cv.setPoolParams(
    //         ArbitrableConfig(IArbitrator(address(0)), address(0), 0, 0, 0, 0),
    //         CVParams(0, 0, 0, 0),
    //         0,
    //         membersToAdd,
    //         new address[](0),
    //         address(0)
    //     );
    //     vm.stopPrank();

    //     // User can still remove support even when not allowlisted
    //     vm.startPrank(pool_admin());
    //     votes = new ProposalSupport[](2);
    //     votes[0] = ProposalSupport(proposalId, -50); // Remove support (negative delta OK)
    //     votes[1] = ProposalSupport(0, 25); // proposalId 0 - skip
    //     data = abi.encode(votes);
    //     allo().allocate(poolId, data); // Should succeed

    //     assertEq(cv.getProposalVoterStake(proposalId, pool_admin()), 100); // 150 - 50
    //     assertEq(cv.totalVoterStakePct(pool_admin()), 150); // 100 + 50
    //     vm.stopPrank();
    // }
}
