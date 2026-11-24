
// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import "forge-std/Test.sol";

import {CVStreamingFacet} from "../src/CVStrategy/facets/CVStreamingFacet.sol";
import {ProposalStatus} from "../src/CVStrategy/ICVStrategy.sol";
import {LibDiamond} from "../src/diamonds/libraries/LibDiamond.sol";
import {RegistryCommunity} from "../src/RegistryCommunity/RegistryCommunity.sol";
import {StreamingEscrow} from "../src/CVStrategy/StreamingEscrow.sol";
import {StreamingEscrowFactory} from "../src/CVStrategy/StreamingEscrowFactory.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import {ERC1820RegistryCompiled} from "@superfluid-finance/ethereum-contracts/contracts/libs/ERC1820RegistryCompiled.sol";
import {
    SuperfluidFrameworkDeployer
} from "@superfluid-finance/ethereum-contracts/contracts/utils/SuperfluidFrameworkDeployer.t.sol";
import {TestToken} from "@superfluid-finance/ethereum-contracts/contracts/utils/TestToken.sol";
import {SuperToken} from "@superfluid-finance/ethereum-contracts/contracts/superfluid/SuperToken.sol";
import {ISuperToken} from "@superfluid-finance/ethereum-contracts/contracts/interfaces/superfluid/ISuperToken.sol";
import {
    ISuperfluidToken
} from "@superfluid-finance/ethereum-contracts/contracts/interfaces/superfluid/ISuperfluidToken.sol";
import {
    ISuperfluid
} from "@superfluid-finance/ethereum-contracts/contracts/interfaces/superfluid/ISuperfluid.sol";
import {
    IGeneralDistributionAgreementV1,
    PoolConfig
} from "@superfluid-finance/ethereum-contracts/contracts/interfaces/agreements/gdav1/IGeneralDistributionAgreementV1.sol";
import {
    IConstantFlowAgreementV1
} from "@superfluid-finance/ethereum-contracts/contracts/interfaces/agreements/IConstantFlowAgreementV1.sol";
import {
    ISuperfluidPool
} from "@superfluid-finance/ethereum-contracts/contracts/interfaces/agreements/gdav1/ISuperfluidPool.sol";
import {IAllo} from "allo-v2-contracts/core/interfaces/IAllo.sol";
import {IStrategy} from "allo-v2-contracts/core/interfaces/IStrategy.sol";
import {Metadata} from "allo-v2-contracts/core/libraries/Metadata.sol";

/*//////////////////////////////////////////////////////////////
        MINIMAL MOCKS (Allo + RegistryCommunity only — same
        substitution the repo's own streaming tests make;
        neither mock is on the vulnerable path)
//////////////////////////////////////////////////////////////*/

contract R5MockAllo {
    address public poolToken;

    function setPoolToken(address token) external {
        poolToken = token;
    }

    function getPool(uint256) external view returns (IAllo.Pool memory) {
        return IAllo.Pool({
            profileId: bytes32(0),
            strategy: IStrategy(address(0)),
            token: poolToken,
            metadata: Metadata({protocol: 0, pointer: ""}),
            managerRole: bytes32(0),
            adminRole: bytes32(0)
        });
    }
}

contract R5MockRegistryCommunity {
    address public factory;

    function setFactory(address factory_) external {
        factory = factory_;
    }

    function councilSafe() external pure returns (address) {
        return address(0);
    }

    function registryFactory() external view returns (address) {
        return factory;
    }

    function enabledStrategies(address) external pure returns (bool) {
        return true;
    }

    function onlyStrategyEnabled(address) external pure {}
}

contract R5MockRegistryFactory {
    function isAuthorizedWallet(address) external pure returns (bool) {
        return false;
    }

    function isStreamRebalanceCallerAllowed(address) external pure returns (bool) {
        return false;
    }
}

/*//////////////////////////////////////////////////////////////
        FACET HARNESS — the real CVStreamingFacet, driven
        standalone exactly like the repo's CVStreamingFacet.t.sol
//////////////////////////////////////////////////////////////*/

contract R5StreamingHarness is CVStreamingFacet {
    function setupAllo(address _allo) external {
        allo = IAllo(_allo);
    }

    function setupRegistryCommunity(address _registry) external {
        registryCommunity = RegistryCommunity(_registry);
    }

    function setupPool(uint256 _poolId) external {
        poolId = _poolId;
    }

    function setupSuperfluidToken(address _token) external {
        superfluidToken = ISuperToken(_token);
    }

    function setupSuperfluidGDA(address _gda) external {
        superfluidGDA = ISuperfluidPool(_gda);
    }

    function setupCVParams(uint256 decay) external {
        cvParams.decay = decay;
    }

    function setupThresholdParams(uint256 maxRatio, uint256 weight, uint256 minThresholdPoints) external {
        cvParams.maxRatio = maxRatio;
        cvParams.weight = weight;
        cvParams.minThresholdPoints = minThresholdPoints;
    }

    function setupStreamingRatePerSecond(uint256 rate) external {
        streamingRatePerSecond = rate;
    }

    function setupTotalPointsActivated(uint256 points) external {
        totalPointsActivated = points;
    }

    function setupProposal(uint256 proposalId, ProposalStatus status, uint256 stakedAmount, uint256 blockLast)
        external
    {
        proposalCounter = proposalId > proposalCounter ? proposalId : proposalCounter;
        proposals[proposalId].proposalId = proposalId;
        proposals[proposalId].proposalStatus = status;
        proposals[proposalId].stakedAmount = stakedAmount;
        proposals[proposalId].convictionLast = 0;
        proposals[proposalId].blockLast = blockLast;
        proposals[proposalId].submitter = address(0x1);
    }

    function setStreamingEscrowExternal(uint256 proposalId, address escrow) external {
        setStreamingEscrow(proposalId, escrow);
        if (proposals[proposalId].proposalId != 0 && !_isTerminalProposalStatus(proposals[proposalId].proposalStatus)) {
            _addOpenStreamingProposal(proposalId);
            openStreamingProposalsInitialized = true;
        }
    }

    function setDiamondOwner(address owner_) external {
        LibDiamond.setContractOwner(owner_);
    }

    function setProxyOwner(address owner_) external {
        _owner = owner_;
    }

    function exposedCalculateProposalConviction(uint256 proposalId) external view returns (uint256) {
        return calculateProposalConviction(proposalId);
    }

    /// @dev Mirrors the production call path: the strategy (this contract) asks the
    /// StreamingEscrowFactory to deploy + register the escrow SuperApp.
    function deployEscrow(address factory_, address token_, address pool_, address beneficiary_)
        external
        returns (address)
    {
        return StreamingEscrowFactory(factory_).deployEscrow(
            ISuperToken(token_), ISuperfluidPool(pool_), beneficiary_, address(this)
        );
    }
}

/*//////////////////////////////////////////////////////////////
                            POC
//////////////////////////////////////////////////////////////*/

contract StreamingSolvencyTest is Test {
    // Canonical mainnet CFAv1Forwarder — hardcoded in StreamingEscrow.depositAmount()
    address internal constant CFA_FORWARDER_CANONICAL = 0xcfA132E353cB4E398080B9700609bb008eceB125;

    uint256 internal constant DECAY = 9940581;
    uint256 internal constant D = 10 ** 7;
    int96 internal constant RATE = 1e15; // 0.001 token / second
    uint256 internal constant LIQUIDATION_PERIOD = 4 hours; // test-governance default
    uint256 internal constant DEPOSIT = uint256(int256(RATE)) * LIQUIDATION_PERIOD; // 14.4 tokens

    SuperfluidFrameworkDeployer internal deployer;
    SuperfluidFrameworkDeployer.Framework internal sf;

    TestToken internal underlying;
    SuperToken internal superToken;

    R5StreamingHarness internal strategy;
    R5MockAllo internal alloMock;
    R5MockRegistryCommunity internal registryMock;
    R5MockRegistryFactory internal factoryMock;
    StreamingEscrowFactory internal escrowFactory;
    ISuperfluidPool internal pool;
    address internal escrow;

    address internal beneficiary = makeAddr("beneficiary");
    address internal liquidator = makeAddr("liquidator");

    function _deployWorld(uint256 fundAmount) internal {
        vm.roll(1000);
        vm.warp(1_000_000);

        // --- Real Superfluid framework (vendored protocol-monorepo code) ---
        vm.etch(ERC1820RegistryCompiled.at, ERC1820RegistryCompiled.bin);
        deployer = new SuperfluidFrameworkDeployer();
        deployer.deployTestFramework();
        sf = deployer.getFramework();

        // StreamingEscrow.depositAmount() hardcodes the canonical forwarder address;
        // etch the framework's real CFAv1Forwarder code there (host is immutable in
        // ForwarderBase, so the etched code points at this local host).
        vm.etch(CFA_FORWARDER_CANONICAL, address(sf.cfaV1Forwarder).code);

        (underlying, superToken) = deployer.deployWrapperSuperToken(
            "Garden Token", "GRDN", 18, type(uint128).max, address(this)
        );
        underlying.mint(address(this), 10_000 ether);

        // --- Real Gardens streaming stack ---
        strategy = new R5StreamingHarness();
        alloMock = new R5MockAllo();
        alloMock.setPoolToken(address(underlying));
        registryMock = new R5MockRegistryCommunity();
        factoryMock = new R5MockRegistryFactory();
        registryMock.setFactory(address(factoryMock));

        // Real GDA pool, created through the real GDAv1Forwarder with production PoolConfig
        (bool ok, ISuperfluidPool createdPool) = sf.gdaV1Forwarder.createPool(
            ISuperfluidToken(address(superToken)),
            address(strategy),
            PoolConfig({transferabilityForUnitsOwner: false, distributionFromAnyAddress: false})
        );
        require(ok, "pool creation failed");
        pool = createdPool;

        // Real escrow factory + escrow (registered as SuperApp by the factory)
        StreamingEscrow escrowImpl = new StreamingEscrow();
        escrowFactory = StreamingEscrowFactory(
            address(
                new ERC1967Proxy(
                    address(new StreamingEscrowFactory()),
                    abi.encodeWithSelector(
                        StreamingEscrowFactory.initialize.selector,
                        address(this),
                        ISuperfluid(address(sf.host)),
                        address(escrowImpl)
                    )
                )
            )
        );
        escrow = strategy.deployEscrow(address(escrowFactory), address(superToken), address(pool), beneficiary);

        // --- Wire the facet harness (same parameters as the repo's streaming tests) ---
        strategy.setupAllo(address(alloMock));
        strategy.setupRegistryCommunity(address(registryMock));
        strategy.setupPool(1);
        strategy.setupSuperfluidToken(address(superToken));
        strategy.setupSuperfluidGDA(address(pool));
        strategy.setupCVParams(DECAY);
        strategy.setupThresholdParams(9_000_000, 1_000_000, 0);
        strategy.setupStreamingRatePerSecond(uint256(int256(RATE)));
        strategy.setupTotalPointsActivated(1000 * D);
        strategy.setDiamondOwner(address(this));
        strategy.setProxyOwner(address(this));
        strategy.setupProposal(1, ProposalStatus.Active, 100 ether, block.number - 10);
        strategy.setStreamingEscrowExternal(1, escrow);

        // Fund the pool (underlying; wrapIfNeeded upgrades it inside rebalance)
        underlying.transfer(address(strategy), fundAmount);

        console.log("deposit per leg (RATE x LP):", DEPOSIT);
        console.log("conviction:", strategy.exposedCalculateProposalConviction(1));
        console.log("escrow depositAmount():", StreamingEscrow(escrow).depositAmount());
    }

    function _gdaFlowRate() internal view returns (int96) {
        return sf.gda.getFlowRate(ISuperfluidToken(address(superToken)), address(strategy), pool);
    }

    function _escrowFlowRate() internal view returns (int96) {
        (, int96 rate,,) = sf.cfa.getFlow(ISuperfluidToken(address(superToken)), escrow, beneficiary);
        return rate;
    }

    function _liquidateEscrowFlow() internal {
        // Direct host.callAgreement deleteFlow — the permissionless liquidation
        // entry for critical CFA flows (the forwarder's deleteFlow goes through
        // the ACL operator path and is not usable by third parties).
        vm.prank(liquidator);
        ISuperfluid(address(sf.host)).callAgreement(
            sf.cfa,
            abi.encodeCall(
                IConstantFlowAgreementV1.deleteFlow,
                (ISuperfluidToken(address(superToken)), escrow, beneficiary, new bytes(0))
            ),
            ""
        );
    }

    function _liquidateStrategyFlow() internal {
        vm.prank(liquidator);
        ISuperfluid(address(sf.host)).callAgreement(
            sf.gda,
            abi.encodeCall(
                IGeneralDistributionAgreementV1.distributeFlow,
                (ISuperfluidToken(address(superToken)), address(strategy), pool, int96(0), new bytes(0))
            ),
            ""
        );
    }

    function _availableBalance(address account) internal view returns (int256 available) {
        (available,,) = ISuperToken(address(superToken)).realtimeBalanceOf(account, block.timestamp);
    }

    function test_underfundedPoolCapsBothLegsAndKeepsRunway() public {
        _deployWorld(20 ether);

        strategy.rebalance();
        int96 rate = _gdaFlowRate();
        assertGt(rate, 0, "some stream remains affordable");
        assertLt(rate, RATE, "the conviction rate exceeds available backing");
        assertGt(_escrowFlowRate(), 0, "beneficiary outflow starts with funded deposit");
        assertGe(_availableBalance(address(strategy)), 0, "strategy starts solvent");
        assertGe(_availableBalance(escrow), 0, "escrow starts solvent");

        vm.warp(block.timestamp + 1 hours);
        assertGt(_availableBalance(address(strategy)), 0, "one-hour keeper interval stays solvent");
        vm.expectRevert();
        _liquidateStrategyFlow();
    }

    function test_fullyFundedPoolKeepsConvictionRate() public {
        _deployWorld(100 ether);

        strategy.rebalance();
        assertEq(_gdaFlowRate(), RATE, "fully funded GDA rate is unchanged");
        assertEq(_escrowFlowRate(), RATE, "fully funded beneficiary rate is unchanged");

        vm.warp(block.timestamp + 1 hours);
        vm.expectRevert();
        _liquidateStrategyFlow();
    }

    function test_spendDownRebalanceLowersRateBeforeLiquidation() public {
        _deployWorld(40 ether);
        strategy.rebalance();
        int96 firstRate = _gdaFlowRate();
        assertGt(firstRate, 0);
        assertGe(_availableBalance(address(strategy)), 0);

        vm.warp(block.timestamp + 2 hours);
        assertGt(_availableBalance(address(strategy)), 0, "keeper acts within reserved runway");
        strategy.rebalance();
        int96 secondRate = _gdaFlowRate();
        assertGt(secondRate, 0);
        assertLt(secondRate, firstRate, "spend-down must lower the rate");
        assertGe(_availableBalance(address(strategy)), 0);
        assertGe(_availableBalance(escrow), 0);
    }

    function test_emptyPoolStopsRatherThanStartingAnUnfundedFlow() public {
        _deployWorld(0);
        strategy.rebalance();
        assertEq(_gdaFlowRate(), 0);
        assertEq(_escrowFlowRate(), 0);
    }

    function test_newBeneficiaryIsFundedBeforePoolUnitsIncrease() public {
        _deployWorld(100 ether);
        strategy.rebalance();

        address secondEscrow = strategy.deployEscrow(
            address(escrowFactory), address(superToken), address(pool), makeAddr("second beneficiary")
        );
        strategy.setupProposal(2, ProposalStatus.Active, 100 ether, block.number - 10);
        strategy.setStreamingEscrowExternal(2, secondEscrow);

        strategy.rebalance();
        (, int96 secondRate,,) = sf.cfa.getFlow(
            ISuperfluidToken(address(superToken)), secondEscrow, StreamingEscrow(secondEscrow).beneficiary()
        );
        assertGt(secondRate, 0, "new beneficiary stream must start");
        assertGe(_availableBalance(secondEscrow), 0);
        assertGe(_availableBalance(address(strategy)), 0);
    }

    function test_underfundedPoolWithTwoBeneficiariesFundsBothDeposits() public {
        _deployWorld(30 ether);
        address secondEscrow = strategy.deployEscrow(
            address(escrowFactory), address(superToken), address(pool), makeAddr("second beneficiary")
        );
        strategy.setupProposal(2, ProposalStatus.Active, 100 ether, block.number - 10);
        strategy.setStreamingEscrowExternal(2, secondEscrow);

        strategy.rebalance();
        (, int96 secondRate,,) = sf.cfa.getFlow(
            ISuperfluidToken(address(superToken)), secondEscrow, StreamingEscrow(secondEscrow).beneficiary()
        );
        assertGt(_gdaFlowRate(), 0);
        assertLt(_gdaFlowRate(), RATE);
        assertGt(_escrowFlowRate(), 0);
        assertGt(secondRate, 0);
        assertGe(_availableBalance(address(strategy)), 0);
        assertGe(_availableBalance(escrow), 0);
        assertGe(_availableBalance(secondEscrow), 0);
    }
}
