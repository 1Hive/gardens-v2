// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.19;

import "forge-std/Test.sol";

import {CVProposalFacet} from "../src/CVStrategy/facets/CVProposalFacet.sol";
import {ProposalType, ArbitrableConfig, CreateProposal} from "../src/CVStrategy/ICVStrategy.sol";
import {IArbitrator} from "../src/interfaces/IArbitrator.sol";
import {Metadata} from "allo-v2-contracts/core/interfaces/IRegistry.sol";
import {IAllo} from "allo-v2-contracts/core/interfaces/IAllo.sol";
import {ICollateralVault} from "../src/interfaces/ICollateralVault.sol";
import {IVotingPowerRegistry} from "../src/interfaces/IVotingPowerRegistry.sol";
import {RegistryCommunity} from "../src/RegistryCommunity/RegistryCommunity.sol";

import {StreamingEscrow} from "../src/CVStrategy/StreamingEscrow.sol";
import {StreamingEscrowFactory} from "../src/CVStrategy/StreamingEscrowFactory.sol";

import "@superfluid-finance/ethereum-contracts/contracts/interfaces/superfluid/ISuperApp.sol";
import "@superfluid-finance/ethereum-contracts/contracts/interfaces/superfluid/ISuperAgreement.sol";
import "@superfluid-finance/ethereum-contracts/contracts/interfaces/superfluid/ISuperToken.sol";
import "@superfluid-finance/ethereum-contracts/contracts/interfaces/agreements/gdav1/ISuperfluidPool.sol";
import "@superfluid-finance/ethereum-contracts/contracts/interfaces/superfluid/ISuperfluid.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract MockCollateralVault {
    function depositCollateral(uint256, address) external payable {}
}

contract MockRegistryFactory {
    address public factory;

    function set(address _factory) external {
        factory = _factory;
    }

    function getStreamingEscrowFactory() external view returns (address) {
        return factory;
    }
}

contract MockRegistryCommunity {
    address public registryFactory;

    constructor(address _registryFactory) {
        registryFactory = _registryFactory;
    }

    function isMember(address) external pure returns (bool) {
        return true;
    }

    function onlyStrategyEnabled(address) external pure {}

    // IVotingPowerRegistry compatibility stubs
    function getMemberPowerInStrategy(address, address) external pure returns (uint256) {
        return 1;
    }

    function getMemberStakedAmount(address) external pure returns (uint256) {
        return 0;
    }

    function ercAddress() external pure returns (address) {
        return address(0);
    }
}

contract MockGDA {
    function getAccountFlowInfo(ISuperfluidToken, address) external pure returns (uint256, int96, uint256) {
        return (0, 0, 0);
    }
}

contract MockHost {
    address public gda;
    address public lastApp;

    constructor(address _gda) {
        gda = _gda;
    }

    function getAgreementClass(bytes32) external view returns (address) {
        return gda;
    }

    function callAgreement(ISuperAgreement, bytes calldata, bytes calldata) external pure returns (bytes memory) {
        return "";
    }

    function registerAppByFactory(ISuperApp app, uint256) external {
        lastApp = address(app);
    }
}

contract MockPool {
    address public lastMember;
    uint128 public lastUnits;

    function updateMemberUnits(address member, uint128 units) external returns (bool) {
        lastMember = member;
        lastUnits = units;
        return true;
    }
}

contract MockSuperToken {
    address public host;

    constructor(address _host) {
        host = _host;
    }

    function getHost() external view returns (address) {
        return host;
    }

    function connectPool(ISuperfluidPool) external pure returns (bool) {
        return true;
    }
}

contract CVProposalFacetHarness is CVProposalFacet {
    function setAllo(address _allo) external {
        allo = IAllo(_allo);
    }

    function setPoolId(uint256 _poolId) external {
        poolId = _poolId;
    }

    function setRegistryCommunity(address _registryCommunity) external {
        registryCommunity = RegistryCommunity(_registryCommunity);
    }

    function setVotingPowerRegistry(address registry) external {
        votingPowerRegistry = IVotingPowerRegistry(registry);
    }

    function setProposalType(ProposalType _type) external {
        proposalType = _type;
    }

    function setArbitrableConfig(ArbitrableConfig memory cfg) external {
        currentArbitrableConfigVersion = 1;
        arbitrableConfigs[1] = cfg;
    }

    function setCollateralVault(address _vault) external {
        collateralVault = ICollateralVault(_vault);
    }

    function setSuperfluid(ISuperToken token, ISuperfluidPool gda) external {
        superfluidToken = token;
        superfluidGDA = gda;
    }
}

contract CVStrategyStreamingEscrowTest is Test {
    CVProposalFacetHarness harness;
    MockRegistryFactory registryFactory;
    MockRegistryCommunity registryCommunity;
    MockCollateralVault collateralVault;

    MockGDA gda;
    MockHost host;
    MockSuperToken token;
    MockPool pool;

    StreamingEscrow escrowImpl;
    StreamingEscrowFactory factory;

    address beneficiary = address(0xBEEF);

    function setUp() public {
        registryFactory = new MockRegistryFactory();
        registryCommunity = new MockRegistryCommunity(address(registryFactory));
        collateralVault = new MockCollateralVault();

        gda = new MockGDA();
        host = new MockHost(address(gda));
        token = new MockSuperToken(address(host));
        pool = new MockPool();

        harness = new CVProposalFacetHarness();

        escrowImpl = new StreamingEscrow();
        factory = StreamingEscrowFactory(
            address(
                new ERC1967Proxy(
                    address(new StreamingEscrowFactory()),
                    abi.encodeWithSelector(
                        StreamingEscrowFactory.initialize.selector,
                        address(harness),
                        ISuperfluid(address(host)),
                        address(escrowImpl)
                    )
                )
            )
        );

        registryFactory.set(address(factory));

        harness.setAllo(address(this));
        harness.setPoolId(1);
        harness.setRegistryCommunity(address(registryCommunity));
        harness.setVotingPowerRegistry(address(registryCommunity));
        harness.setProposalType(ProposalType.Streaming);
        harness.setArbitrableConfig(
            ArbitrableConfig({arbitrator: IArbitrator(address(0x1234)), tribunalSafe: address(0), submitterCollateralAmount: 0, challengerCollateralAmount: 0, defaultRuling: 0, defaultRulingTimeout: 0})
        );
        harness.setCollateralVault(address(collateralVault));
        harness.setSuperfluid(ISuperToken(address(token)), ISuperfluidPool(address(pool)));
    }

    function test_registerRecipient_usesFactoryAndEscrowMember() public {
        CreateProposal memory proposal = CreateProposal({
            poolId: 1,
            beneficiary: beneficiary,
            amountRequested: 0,
            requestedToken: address(0),
            metadata: Metadata({protocol: 1, pointer: "ipfs"})
        });

        bytes memory data = abi.encode(proposal);

        address recipient = harness.registerRecipient(data, address(0xCAFE));

        assertTrue(recipient != address(0));
        assertEq(pool.lastMember(), host.lastApp());
        assertTrue(pool.lastMember() != beneficiary);
    }

    function test_registerRecipient_revertsWhenFactoryMissing() public {
        registryFactory.set(address(0));

        CreateProposal memory proposal = CreateProposal({
            poolId: 1,
            beneficiary: beneficiary,
            amountRequested: 0,
            requestedToken: address(0),
            metadata: Metadata({protocol: 1, pointer: "ipfs"})
        });

        bytes memory data = abi.encode(proposal);

        vm.expectRevert(CVProposalFacet.StreamingEscrowFactoryNotSet.selector);
        harness.registerRecipient(data, address(0xCAFE));
    }
}
