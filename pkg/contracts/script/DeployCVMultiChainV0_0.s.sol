// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/console2.sol";
import "forge-std/Script.sol";
import "forge-std/StdJson.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "@openzeppelin/contracts/utils/Strings.sol";
import "../src/CVStrategyV0_0.sol";
import {IAllo} from "allo-v2-contracts/core/interfaces/IAllo.sol";
import {Allo} from "allo-v2-contracts/core/Allo.sol";
import {IRegistry} from "allo-v2-contracts/core/interfaces/IRegistry.sol";
import {Registry} from "allo-v2-contracts/core/Registry.sol";
import {Native} from "allo-v2-contracts/core/libraries/Native.sol";
import {CVStrategyHelpersV0_0, CVStrategyV0_0} from "../test/CVStrategyHelpersV0_0.sol";
import {GV2ERC20} from "./GV2ERC20.sol";
import {SafeSetup} from "../test/shared/SafeSetup.sol";
import {Metadata} from "allo-v2-contracts/core/libraries/Metadata.sol";
import {Accounts} from "allo-v2-test/foundry/shared/Accounts.sol";

import {RegistryFactoryV0_0} from "../src/RegistryFactoryV0_0.sol";

import {RegistryCommunityV0_0} from "../src/RegistryCommunityV0_0.sol";
import {Safe} from "safe-contracts/contracts/Safe.sol";

import {SafeProxyFactory} from "safe-contracts/contracts/proxies/SafeProxyFactory.sol";

import {Upgrades} from "@openzeppelin/foundry/LegacyUpgrades.sol";

import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract DeployCVMultiChain is Native, CVStrategyHelpersV0_0, Script, SafeSetup {
    using stdJson for string;

    uint256 public MINIMUM_STAKE = 1 ether;

    address public SENDER = 0x2F9e113434aeBDd70bB99cB6505e1F726C578D6d;
    address public TOKEN; // check networks.json file
    address public COUNCIL_SAFE; // check networks.json file
    address public SAFE_PROXY_FACTORY; // check networks.json file
    // address public REGISTRY_FACTORY = 0xC98c004A1d6c62E0C42ECEe1a924dc216aac2094;
    address public REGISTRY_FACTORY;

    uint256 public WAIT_TIME = 20000;

    string public CURRENT_NETWORK = "arbsepolia";

    address BENEFICIARY = 0xc583789751910E39Fd2Ddb988AD05567Bcd81334;

    uint256 councilMemberPKEnv;
    address allo_proxy;
    Allo allo;
    GV2ERC20 token;
    RegistryFactoryV0_0 registryFactory;
    IArbitrator arbitrator;

    function pool_admin() public virtual override returns (address) {
        return address(SENDER);
    }

    function executeJq(string memory command) internal returns (bytes memory) {
        string[] memory inputs = new string[](3);

        inputs[0] = "bash";
        inputs[1] = "-c";
        inputs[2] = command;

        bytes memory result = vm.ffi(inputs);
        console2.logBytes(result);
        return result;
    }

    function getKeyNetwork(string memory key) internal view returns (string memory) {
        string memory networkSelected = CURRENT_NETWORK;
        string memory jqNetworkSelected = string.concat("$.networks[?(@.name=='", networkSelected, "')]");
        return string.concat(jqNetworkSelected, key);
    }

    function getNetworkJson() internal view returns (string memory) {
        string memory root = vm.projectRoot();
        string memory path = string.concat(root, "/pkg/contracts/config/networks.json");
        string memory json = vm.readFile(path);
        return json;
    }

    function run() public {
        // string memory net = vm.prompt("Enter network name");
        string memory net = "";
        run(net);
    }

    function run(string memory network) public {
        vm.startBroadcast(pool_admin());

        if (bytes(network).length != 0) {
            CURRENT_NETWORK = network;
        }

        string memory json = getNetworkJson();

        uint256 chainId = json.readUint(getKeyNetwork(".chainId"));
        string memory name = json.readString(getKeyNetwork(".name"));
        SENDER = json.readAddress(getKeyNetwork(".ENVS.SENDER"));
        ERC1967Proxy proxy;

        console2.log("name: %s", name);
        console2.log("sender: %s", SENDER);
        console2.log("chainId : %s", chainId);

        allo_proxy = json.readAddress(getKeyNetwork(".ENVS.ALLO_PROXY"));

        if (allo_proxy == address(0)) {
            revert("ALLO_PROXY not set");
        }
        // get PK from env
        councilMemberPKEnv = vm.envUint("PK");
        if (councilMemberPKEnv == 0) {
            revert("PK not set");
        }

        allo = Allo(allo_proxy);

        assertTrue(address(allo) != address(0));

        TOKEN = json.readAddress(getKeyNetwork(".ENVS.TOKEN"));

        if (TOKEN == address(0)) {
            // token = new GV2ERC20("HoneyV2", "HNYV2", 18);
            token = new GV2ERC20("Seedling", "SEED", 18);
            console2.log("Created Token Addr: %s", address(token));
            TOKEN = address(token);
        } else {
            token = GV2ERC20(TOKEN);
        }

        assertTrue(token != GV2ERC20(address(0)));
        assertTrue(TOKEN != address(0));

        console2.log("Allo Addr: %s", address(allo));

        COUNCIL_SAFE = json.readAddress(getKeyNetwork(".ENVS.COUNCIL_SAFE"));

        assertTrue(COUNCIL_SAFE != address(0), "Council Safe not set");

        if (COUNCIL_SAFE == address(0)) {
            Safe councilSafeDeploy = _councilSafeWithOwner(pool_admin(), SafeProxyFactory(SAFE_PROXY_FACTORY));
            COUNCIL_SAFE = address(councilSafeDeploy);
        }
        // Safe councilSafeDeploy = _councilSafeWithOwner(pool_admin());

        // if (REGISTRY_FACTORY == address(0)) {
        //     REGISTRY_FACTORY = json.readAddress(getKeyNetwork(".ENVS.REGISTRY_FACTORY"));
        // }
        if (REGISTRY_FACTORY == address(0)) {
            registryFactory = new RegistryFactoryV0_0();
            proxy = new ERC1967Proxy(
                address(new RegistryFactoryV0_0()),
                abi.encodeWithSelector(RegistryFactoryV0_0.initialize.selector, address(0x0))
            );

            registryFactory = RegistryFactoryV0_0(address(proxy));
        } else {
            registryFactory = RegistryFactoryV0_0(REGISTRY_FACTORY);
        }

        RegistryCommunityV0_0.InitializeParams memory params;

        metadata = Metadata({protocol: 1, pointer: "QmX5jPva6koRnn88s7ZcPnNXKg1UzmYaZu9h15d8kzH1CN"});
        params._metadata = metadata; // convenant ipfs
        params.covenantIpfsHash = "QmX5jPva6koRnn88s7ZcPnNXKg1UzmYaZu9h15d8kzH1CN";

        // params._communityName = "Alpha Seedling";
        params._communityName = "Alpha Centaurians";
        params._allo = address(allo);
        params._strategyTemplate = address(new CVStrategyV0_0());
        params._gardenToken = IERC20(address(token));
        params._registerStakeAmount = MINIMUM_STAKE;
        params._communityFee = 0;
        params._councilSafe = payable(COUNCIL_SAFE);

        assertTrue(params._councilSafe != address(0));

        RegistryCommunityV0_0 registryCommunity = RegistryCommunityV0_0(registryFactory.createRegistry(params));

        StrategyStruct.PointSystemConfig memory pointConfig;
        pointConfig.maxAmount = MINIMUM_STAKE * 2;

        proxy = new ERC1967Proxy(
            address(new SafeArbitrator()), abi.encodeWithSelector(SafeArbitrator.initialize.selector, 2 ether)
        );
        arbitrator = SafeArbitrator(payable(address(proxy)));

        StrategyStruct.InitializeParams memory paramsCV = getParams(
            address(registryCommunity),
            StrategyStruct.ProposalType.Funding,
            StrategyStruct.PointSystem.Fixed,
            pointConfig,
            StrategyStruct.ArbitrableConfig(
                IArbitrator(address(arbitrator)),
                // IArbitrator(address(0)),
                payable(address(_councilSafe())),
                3 ether,
                2 ether,
                1,
                300,
                address(new CollateralVault())
            )
        );

        // paramsCV.decay = _etherToFloat(0.9965402 ether); // alpha = decay
        // paramsCV.maxRatio = _etherToFloat(0.2 ether); // beta = maxRatio
        // paramsCV.weight = _etherToFloat(0.001 ether); // RHO = p  = weight

        // Goss: Commented because already set in getParams
        // paramsCV.decay = _etherToFloat(0.9999903 ether); // alpha = decay
        // paramsCV.maxRatio = _etherToFloat(0.3219782 ether); // beta = maxRatio
        // paramsCV.weight = _etherToFloat(0.010367 ether); // RHO = p  = weight

        (uint256 poolId, address _strategy1) = registryCommunity.createPool(
            address(token), paramsCV, Metadata({protocol: 1, pointer: "QmVtM9MpAJLre2TZXqRc2FTeEdseeY1HTkQUe7QuwGcEAN"})
        );

        CVStrategyV0_0 strategy1 = CVStrategyV0_0(payable(_strategy1));

        // strategy1.setDecay(_etherToFloat(0.9965402 ether));
        // strategy1.setDecay(_etherToFloat(0.8705505 ether)); // alpha = decay
        // strategy1.setMaxRatio(_etherToFloat(0.321978234271363 ether)); // beta = maxRatio
        // strategy1.setWeight(_etherToFloat(0.01036699833 ether)); // RHO = p  = weight
        // strategy1.setDecay(_etherToFloat(0.9999903 ether)); // alpha = decay
        // strategy1.setMaxRatio(_etherToFloat(0.3219782 ether)); // beta = maxRatio
        // strategy1.setWeight(_etherToFloat(0.010367 ether)); // RHO = p  = weight

        paramsCV.proposalType = StrategyStruct.ProposalType.Signaling;
        paramsCV.pointSystem = StrategyStruct.PointSystem.Unlimited;

        (uint256 poolIdSignaling, address _strategy2) = registryCommunity.createPool(
            address(0), paramsCV, Metadata({protocol: 1, pointer: "QmReQ5dwWgVZTMKkJ4EWHSM6MBmKN21PQN45YtRRAUHiLG"})
        );

        CVStrategyV0_0 strategy2 = CVStrategyV0_0(payable(_strategy2));

        // Goss: Commented because already set in getParams
        // strategy2.setDecay(_etherToFloat(0.9999903 ether)); // alpha = decay
        // strategy2.setMaxRatio(_etherToFloat(0.3219782 ether)); // beta = maxRatio
        // strategy2.setWeight(_etherToFloat(0.010367 ether)); // RHO = p  = weight

        safeHelper(
            Safe(payable(COUNCIL_SAFE)),
            councilMemberPKEnv,
            address(registryCommunity),
            abi.encodeWithSelector(registryCommunity.addStrategy.selector, _strategy1)
        );

        safeHelper(
            Safe(payable(COUNCIL_SAFE)),
            councilMemberPKEnv,
            address(registryCommunity),
            abi.encodeWithSelector(registryCommunity.addStrategy.selector, _strategy2)
        );

        token.mint(address(pool_admin()), 10_000 ether);
        token.approve(address(registryCommunity), type(uint256).max);
        // token.mint(address(pool_admin()), 100);
        //@todo get correct value instead infinite approval
        registryCommunity.stakeAndRegisterMember();

        assertEq(registryCommunity.isMember(address(pool_admin())), true, "Not a member");
        // assertEq(token.balanceOf(address(this)), registryCommunity.getStakeAmountWithFees(), "Balance not correct");

        strategy1.activatePoints();
        strategy2.activatePoints();

        // allo.fundPool{value: 0.1 ether}(poolIdNative, 0.1 ether);

        token.approve(address(allo), type(uint256).max);
        allo.fundPool(poolId, 10_000 ether);

        StrategyStruct.CreateProposal memory proposal = StrategyStruct.CreateProposal(
            poolId,
            BENEFICIARY,
            500 ether,
            address(token),
            Metadata({protocol: 1, pointer: "QmVi1G1hQX4x8pb4W6KRroxsJjyP1gTkoqkGuyqoiGBPhS"})
        );
        bytes memory data = abi.encode(proposal);
        allo.registerRecipient(poolId, data);

        proposal = StrategyStruct.CreateProposal(
            poolId,
            BENEFICIARY,
            1500 ether,
            address(token),
            Metadata({protocol: 1, pointer: "QmQfaGooGAWUHuHbYWzDp1ZHNJpreJP7oBiLjbKvxGwGuG"})
        );
        data = abi.encode(proposal);
        allo.registerRecipient(poolId, data);

        proposal = StrategyStruct.CreateProposal(
            poolId,
            BENEFICIARY,
            1500 ether,
            address(token),
            Metadata({protocol: 1, pointer: "QmdGXx4Ff2W1eMZ8HiUg1GPSA4VBEtfTMpkustPNU5YKxp"})
        );
        data = abi.encode(proposal);
        allo.registerRecipient(poolId, data);

        // Strategy with Signaling
        StrategyStruct.CreateProposal memory proposal2 = StrategyStruct.CreateProposal(
            poolIdSignaling,
            address(0),
            0,
            address(0),
            Metadata({protocol: 1, pointer: "QmSLYbgSsapjdp1VGj3LeQn1hp5jBs4JcWS1zQRRWLLkid"})
        );
        bytes memory data2 = abi.encode(proposal2);
        allo.registerRecipient(poolIdSignaling, data2);

        proposal2 = StrategyStruct.CreateProposal(
            poolIdSignaling,
            address(0),
            0,
            address(0),
            Metadata({protocol: 1, pointer: "QmXa5sb2uLiux8ewWt9pcCFdZERisSfY1FiUjEykYnySwz"})
        );

        data2 = abi.encode(proposal2);
        allo.registerRecipient(poolIdSignaling, data2);

        proposal2 = StrategyStruct.CreateProposal(
            poolIdSignaling,
            address(0),
            0,
            address(0),
            Metadata({protocol: 1, pointer: "QmTafMKt491NJp5GdcPZpg5SQ1gTsYS7vidCutWcW3KFVg"})
        );

        data2 = abi.encode(proposal2);
        allo.registerRecipient(poolIdSignaling, data2);

        safeHelper(
            Safe(payable(COUNCIL_SAFE)),
            councilMemberPKEnv,
            address(registryCommunity),
            abi.encodeWithSelector(registryCommunity.removeStrategy.selector, _strategy1)
        );

        safeHelper(
            Safe(payable(COUNCIL_SAFE)),
            councilMemberPKEnv,
            address(registryCommunity),
            abi.encodeWithSelector(registryCommunity.removeStrategy.selector, _strategy2)
        );

        vm.stopBroadcast();
    }
}
