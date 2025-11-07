// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/console2.sol";
import "forge-std/Script.sol";
import "forge-std/StdJson.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "@openzeppelin/contracts/utils/Strings.sol";
import "../src/CVStrategy/CVStrategy.sol";
import {SafeArbitrator} from "../src/SafeArbitrator.sol";
import {IAllo} from "allo-v2-contracts/core/interfaces/IAllo.sol";
import {Allo} from "allo-v2-contracts/core/Allo.sol";
import {IRegistry} from "allo-v2-contracts/core/interfaces/IRegistry.sol";
import {Registry} from "allo-v2-contracts/core/Registry.sol";
import {Native} from "allo-v2-contracts/core/libraries/Native.sol";
import {CVStrategyHelpers, CVStrategy} from "../test/CVStrategyHelpers.sol";
import {GV2ERC20} from "./GV2ERC20.sol";
import {SafeSetup} from "../test/shared/SafeSetup.sol";
import {Metadata} from "allo-v2-contracts/core/libraries/Metadata.sol";
import {Accounts} from "allo-v2-test/foundry/shared/Accounts.sol";

import {RegistryFactory} from "../src/RegistryFactory/RegistryFactory.sol";

import {RegistryCommunity} from "../src/RegistryCommunity/RegistryCommunity.sol";
import {ISafe as Safe, SafeProxyFactory, Enum} from "../src/interfaces/ISafe.sol";
import {CollateralVault} from "../src/CollateralVault.sol";
// import {SafeProxyFactory} from "safe-smart-account/contracts/proxies/SafeProxyFactory.sol";
import {Upgrades} from "@openzeppelin/foundry/LegacyUpgrades.sol";

import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {PassportScorer} from "../src/PassportScorer.sol";
import {ISybilScorer} from "../src/ISybilScorer.sol";

abstract contract BaseMultiChain is Native, CVStrategyHelpers, Script, SafeSetup {
    using stdJson for string;

    uint256 public MINIMUM_STAKE = 1 ether;

    address public SENDER = 0xb05A948B5c1b057B88D381bDe3A375EfEA87EbAD;
    address public TOKEN; // check networks.json file
    address public COUNCIL_SAFE; // check networks.json file
    address public SAFE_PROXY_FACTORY; // check networks.json file
    // address public REGISTRY_FACTORY = 0xC98c004A1d6c62E0C42ECEe1a924dc216aac2094;
    address public REGISTRY_FACTORY;

    uint256 public WAIT_TIME = 20000;

    string public CURRENT_NETWORK = "arbsepolia";
    string public ETH_SEPOLIA = "sepolia";

    address public BENEFICIARY = 0xc583789751910E39Fd2Ddb988AD05567Bcd81334;

    uint256 councilMemberPKEnv;
    address allo_proxy;
    Allo allo;
    GV2ERC20 token;
    IArbitrator arbitrator;
    ISybilScorer sybilScorer;
    uint256 chainId;
    string chainName;

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

    function run() public virtual {
        // string memory net = vm.prompt("Enter network name");
        string memory net = "";
        run(net);
    }

    function runCurrentNetwork(string memory networkJson) public virtual;

    function run(string memory network) public virtual {
        vm.startBroadcast(pool_admin());

        if (bytes(network).length != 0) {
            CURRENT_NETWORK = network;
        }

        string memory json = getNetworkJson();

        chainId = json.readUint(getKeyNetwork(".chainId"));
        chainName = json.readString(getKeyNetwork(".name"));
        SENDER = json.readAddress(getKeyNetwork(".ENVS.SENDER"));

        console2.log("name: %s", chainName);
        console2.log("sender: %s", SENDER);
        console2.log("chainId : %s", chainId);

        runCurrentNetwork(json);

        // allo_proxy = json.readAddress(getKeyNetwork(".ENVS.ALLO_PROXY"));

        // if (allo_proxy == address(0)) {
        //     revert("ALLO_PROXY not set");
        // }
        // // get PK from env
        // councilMemberPKEnv = vm.envUint("PK");
        // if (councilMemberPKEnv == 0) {
        //     revert("PK not set");
        // }

        // allo = Allo(allo_proxy);

        // assertTrue(address(allo) != address(0));

        // TOKEN = json.readAddress(getKeyNetwork(".ENVS.TOKEN"));

        // if (TOKEN == address(0)) {
        //     // token = new GV2ERC20("HoneyV2", "HNYV2", 18);
        //     token = new GV2ERC20("Seedling", "SEED", 18);
        //     console2.log("Created Token Addr: %s", address(token));
        //     TOKEN = address(token);
        // } else {
        //     token = GV2ERC20(TOKEN);
        // }

        // assertTrue(token != GV2ERC20(address(0)));
        // assertTrue(TOKEN != address(0));

        // console2.log("Allo Addr: %s", address(allo));

        // COUNCIL_SAFE = json.readAddress(getKeyNetwork(".ENVS.COUNCIL_SAFE"));

        // assertTrue(COUNCIL_SAFE != address(0), "Council Safe not set");

        // ERC1967Proxy scorerProxy = new ERC1967Proxy(
        //     address(new PassportScorer()), abi.encodeWithSelector(PassportScorer.initialize.selector, COUNCIL_SAFE)
        // );

        // sybilScorer = PassportScorer(payable(address(scorerProxy)));

        // // if (COUNCIL_SAFE == address(0)) {
        // //     Safe councilSafeDeploy = _councilSafeWithOwner(pool_admin(), SafeProxyFactory(SAFE_PROXY_FACTORY));
        // //     COUNCIL_SAFE = address(councilSafeDeploy);
        // // }
        // // Safe councilSafeDeploy = _councilSafeWithOwner(pool_admin());

        // // if (REGISTRY_FACTORY == address(0)) {
        // //     REGISTRY_FACTORY = json.readAddress(getKeyNetwork(".ENVS.REGISTRY_FACTORY"));
        // // }
        // ERC1967Proxy proxy;

        // if (REGISTRY_FACTORY == address(0)) {
        //     // registryFactory = new RegistryFactory();
        //     RegistryCommunity comm = new RegistryCommunity();
        //     console2.log("Registry Community Addr: %s", address(comm));
        //     proxy = new ERC1967Proxy(
        //         address(new RegistryFactory()),
        //         abi.encodeWithSelector(
        //             RegistryFactory.initialize.selector,
        //             address(SENDER),
        //             address(SENDER),
        //             address(comm),
        //             address(new CollateralVault())
        //         )
        //     );

        //     registryFactory = RegistryFactory(address(proxy));
        // } else {
        //     registryFactory = RegistryFactory(REGISTRY_FACTORY);
        // }

        // assertTrue(registryFactory.registryCommunityTemplate() != address(0x0), "Registry Community Template not set");
        // assertTrue(registryFactory.collateralVaultTemplate() != address(0x0), "Collateral Vault Template not set");

        // RegistryCommunityInitializeParams memory params;

        // metadata = Metadata({protocol: 1, pointer: "QmX5jPva6koRnn88s7ZcPnNXKg1UzmYaZu9h15d8kzH1CN"});
        // params._metadata = metadata; // convenant ipfs
        // params.covenantIpfsHash = "QmX5jPva6koRnn88s7ZcPnNXKg1UzmYaZu9h15d8kzH1CN";

        // // params._communityName = "Alpha Seedling";
        // params._communityName = "Alpha Centaurians";
        // params._allo = address(allo);
        // params._gardenToken = IERC20(address(token));
        // params._registerStakeAmount = MINIMUM_STAKE;
        // params._communityFee = 0;
        // params._councilSafe = payable(COUNCIL_SAFE);

        // assertTrue(params._councilSafe != address(0));

        // RegistryCommunity registryCommunity = RegistryCommunity(registryFactory.createRegistry(params));

        // PointSystemConfig memory pointConfig;
        // pointConfig.maxAmount = MINIMUM_STAKE * 2;

        // proxy = new ERC1967Proxy(
        //     address(new SafeArbitrator()), abi.encodeWithSelector(SafeArbitrator.initialize.selector, 0.001 ether)
        // );
        // arbitrator = SafeArbitrator(payable(address(proxy)));

        // CVStrategyInitializeParamsV0_1 memory paramsCV = getParams(
        //     address(registryCommunity),
        //     ProposalType.Funding,
        //     PointSystem.Fixed,
        //     pointConfig,
        //     ArbitrableConfig(
        //         IArbitrator(address(arbitrator)), payable(COUNCIL_SAFE), 0.002 ether, 0.001 ether, 1, 300
        //     )
        // );

        // // paramsCV.decay = _etherToFloat(0.9965402 ether); // alpha = decay
        // // paramsCV.maxRatio = _etherToFloat(0.2 ether); // beta = maxRatio
        // // paramsCV.weight = _etherToFloat(0.001 ether); // RHO = p  = weight

        // // Goss: Commented because already set in getParams
        // // paramsCV.decay = _etherToFloat(0.9999903 ether); // alpha = decay
        // // paramsCV.maxRatio = _etherToFloat(0.3219782 ether); // beta = maxRatio
        // // paramsCV.weight = _etherToFloat(0.010367 ether); // RHO = p  = weight

        // (uint256 poolId, address _strategy1) = registryCommunity.createPool(
        //     address(token), paramsCV, Metadata({protocol: 1, pointer: "QmVtM9MpAJLre2TZXqRc2FTeEdseeY1HTkQUe7QuwGcEAN"})
        // );

        // CVStrategy strategy1 = CVStrategy(payable(_strategy1));

        // // strategy1.setDecay(_etherToFloat(0.9965402 ether));
        // // strategy1.setDecay(_etherToFloat(0.8705505 ether)); // alpha = decay
        // // strategy1.setMaxRatio(_etherToFloat(0.321978234271363 ether)); // beta = maxRatio
        // // strategy1.setWeight(_etherToFloat(0.01036699833 ether)); // RHO = p  = weight
        // // strategy1.setDecay(_etherToFloat(0.9999903 ether)); // alpha = decay
        // // strategy1.setMaxRatio(_etherToFloat(0.3219782 ether)); // beta = maxRatio
        // // strategy1.setWeight(_etherToFloat(0.010367 ether)); // RHO = p  = weight

        // paramsCV.proposalType = ProposalType.Signaling;
        // paramsCV.pointSystem = PointSystem.Unlimited;
        // paramsCV.sybilScorer = address(sybilScorer);

        // (uint256 poolIdSignaling, address _strategy2) = registryCommunity.createPool(
        //     address(0), paramsCV, Metadata({protocol: 1, pointer: "QmReQ5dwWgVZTMKkJ4EWHSM6MBmKN21PQN45YtRRAUHiLG"})
        // );

        // CVStrategy strategy2 = CVStrategy(payable(_strategy2));

        // // Goss: Commented because already set in getParams
        // // strategy2.setDecay(_etherToFloat(0.9999903 ether)); // alpha = decay
        // // strategy2.setMaxRatio(_etherToFloat(0.3219782 ether)); // beta = maxRatio
        // // strategy2.setWeight(_etherToFloat(0.010367 ether)); // RHO = p  = weight

        // _sleepIfNetwork(CURRENT_NETWORK, ETH_SEPOLIA);
        // // Goss: Commented to support EOA as coucilsafe
        // safeHelper(
        //     Safe(payable(COUNCIL_SAFE)),
        //     councilMemberPKEnv,
        //     address(registryCommunity),
        //     abi.encodeWithSelector(registryCommunity.addStrategy.selector, _strategy1)
        // );
        // // registryCommunity.addStrategy(_strategy1);
        // _sleepIfNetwork(CURRENT_NETWORK, ETH_SEPOLIA);

        // // Goss: Commented to support EOA as coucilsafe
        // safeHelper(
        //     Safe(payable(COUNCIL_SAFE)),
        //     councilMemberPKEnv,
        //     address(registryCommunity),
        //     abi.encodeWithSelector(registryCommunity.addStrategy.selector, _strategy2)
        // );
        // _sleepIfNetwork(CURRENT_NETWORK, ETH_SEPOLIA);
        // //registryCommunity.addStrategy(_strategy2);

        // token.mint(address(pool_admin()), 10_000 ether);
        // token.approve(address(registryCommunity), type(uint256).max);
        // // token.mint(address(pool_admin()), 100);
        // //@todo get correct value instead infinite approval
        // registryCommunity.stakeAndRegisterMember("");

        // assertEq(registryCommunity.isMember(address(pool_admin())), true, "Not a member");
        // // assertEq(token.balanceOf(address(this)), registryCommunity.getStakeAmountWithFees(), "Balance not correct");

        // strategy1.activatePoints();
        // strategy2.activatePoints();

        // // allo.fundPool{value: 0.1 ether}(poolIdNative, 0.1 ether);

        // token.approve(address(allo), type(uint256).max);
        // allo.fundPool(poolId, 10_000 ether);

        // CreateProposal memory proposal = CreateProposal(
        //     poolId,
        //     BENEFICIARY,
        //     500 ether,
        //     address(token),
        //     Metadata({protocol: 1, pointer: "QmVi1G1hQX4x8pb4W6KRroxsJjyP1gTkoqkGuyqoiGBPhS"})
        // );
        // bytes memory data = abi.encode(proposal);
        // allo.registerRecipient{value: 0.002 ether}(poolId, data);

        // proposal = CreateProposal(
        //     poolId,
        //     BENEFICIARY,
        //     1500 ether,
        //     address(token),
        //     Metadata({protocol: 1, pointer: "QmQfaGooGAWUHuHbYWzDp1ZHNJpreJP7oBiLjbKvxGwGuG"})
        // );
        // data = abi.encode(proposal);
        // allo.registerRecipient{value: 0.002 ether}(poolId, data);

        // proposal = CreateProposal(
        //     poolId,
        //     BENEFICIARY,
        //     1500 ether,
        //     address(token),
        //     Metadata({protocol: 1, pointer: "QmdGXx4Ff2W1eMZ8HiUg1GPSA4VBEtfTMpkustPNU5YKxp"})
        // );
        // data = abi.encode(proposal);
        // allo.registerRecipient{value: 0.002 ether}(poolId, data);

        // // Strategy with Signaling
        // CreateProposal memory proposal2 = CreateProposal(
        //     poolIdSignaling,
        //     address(0),
        //     0,
        //     address(0),
        //     Metadata({protocol: 1, pointer: "QmSLYbgSsapjdp1VGj3LeQn1hp5jBs4JcWS1zQRRWLLkid"})
        // );
        // bytes memory data2 = abi.encode(proposal2);
        // allo.registerRecipient{value: 0.002 ether}(poolIdSignaling, data2);

        // proposal2 = CreateProposal(
        //     poolIdSignaling,
        //     address(0),
        //     0,
        //     address(0),
        //     Metadata({protocol: 1, pointer: "QmXa5sb2uLiux8ewWt9pcCFdZERisSfY1FiUjEykYnySwz"})
        // );

        // data2 = abi.encode(proposal2);
        // allo.registerRecipient{value: 0.002 ether}(poolIdSignaling, data2);

        // proposal2 = CreateProposal(
        //     poolIdSignaling,
        //     address(0),
        //     0,
        //     address(0),
        //     Metadata({protocol: 1, pointer: "QmTafMKt491NJp5GdcPZpg5SQ1gTsYS7vidCutWcW3KFVg"})
        // );

        // data2 = abi.encode(proposal2);
        // allo.registerRecipient{value: 0.002 ether}(poolIdSignaling, data2);

        // _sleepIfNetwork(CURRENT_NETWORK, ETH_SEPOLIA);
        // safeHelper(
        //     Safe(payable(COUNCIL_SAFE)),
        //     councilMemberPKEnv,
        //     address(registryCommunity),
        //     abi.encodeWithSelector(registryCommunity.removeStrategy.selector, _strategy1)
        // );
        // //registryCommunity.removeStrategy(_strategy1);

        // _sleepIfNetwork(CURRENT_NETWORK, ETH_SEPOLIA);
        // safeHelper(
        //     Safe(payable(COUNCIL_SAFE)),
        //     councilMemberPKEnv,
        //     address(registryCommunity),
        //     abi.encodeWithSelector(registryCommunity.removeStrategy.selector, _strategy2)
        // );
        //registryCommunity.removeStrategy(_strategy2);

        vm.stopBroadcast();
    }

    function _isEqual(string memory a, string memory b) internal pure returns (bool) {
        return (keccak256(abi.encodePacked(a)) == keccak256(abi.encodePacked(b)));
    }

    function _sleepIfNetwork(string memory network, string memory networkName) internal {
        if (_isEqual(network, networkName)) {
            // console2.log("Sleeping for %s", WAIT_TIME);
            vm.sleep(WAIT_TIME);
        }
    }
}
