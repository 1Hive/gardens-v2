// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

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

import {RegistryCommunity, RegistryCommunityInitializeParams} from "../src/RegistryCommunity/RegistryCommunity.sol";
import {RegistryCommunityDiamondInit} from "../src/RegistryCommunity/RegistryCommunityDiamondInit.sol";
import {CVStrategyDiamondInit} from "../src/CVStrategy/CVStrategyDiamondInit.sol";
import {ISafe as Safe, SafeProxyFactory, Enum} from "../src/interfaces/ISafe.sol";
import {CollateralVault} from "../src/CollateralVault.sol";
import {CommunityDiamondConfigurator} from "../test/helpers/CommunityDiamondConfigurator.sol";
import {StrategyDiamondConfigurator} from "../test/helpers/StrategyDiamondConfigurator.sol";
// import {SafeProxyFactory} from "safe-smart-account/contracts/proxies/SafeProxyFactory.sol";
import {Upgrades} from "@openzeppelin/foundry/LegacyUpgrades.sol";

import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {PassportScorer} from "../src/PassportScorer.sol";
import {ISybilScorer} from "../src/ISybilScorer.sol";
import {ProxyOwner} from "../src/ProxyOwner.sol";

contract DeployCVMultiChain is Native, CVStrategyHelpers, Script, SafeSetup {
    using stdJson for string;

    uint256 public MINIMUM_STAKE = 1 ether;

    address public SENDER = 0xb05A948B5c1b057B88D381bDe3A375EfEA87EbAD;
    address public TOKEN; // check networks.json file
    address public COUNCIL_SAFE; // check networks.json file
    address public SAFE_PROXY_FACTORY; // check networks.json file
    // address public REGISTRY_FACTORY = 0xC98c004A1d6c62E0C42ECEe1a924dc216aac2094;

    uint256 public WAIT_TIME = 20000;

    string public CURRENT_NETWORK = "arbsepolia";

    address BENEFICIARY = 0xb05A948B5c1b057B88D381bDe3A375EfEA87EbAD;

    address public PROXY_OWNER;
    RegistryFactory public REGISTRY_FACTORY; // = RegistryFactory(0xd7b72Fcb6A4e2857685175F609D1498ff5392E46);
    PassportScorer PASSPORT_SCORER;
    SafeArbitrator ARBITRATOR;

    uint256 councilMemberPKEnv;
    address allo_proxy;
    Allo allo;
    GV2ERC20 token;

    function pool_admin() public virtual override returns (address) {
        return address(SENDER);
    }

    function executeJq(string memory command) internal returns (bytes memory) {
        string[] memory inputs = new string[](3);

        inputs[0] = "bash";
        inputs[1] = "-c";
        inputs[2] = command;

        bytes memory result = vm.ffi(inputs);
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

    function isTestnet() internal view returns (bool) {
        string memory json = getNetworkJson();
        return json.readBool(getKeyNetwork(".testnet"));
    }

    function isNoSafe() internal view returns (bool) {
        string memory json = getNetworkJson();
        return json.readBool(getKeyNetwork(".no-safe"));
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


        allo_proxy = json.readAddress(getKeyNetwork(".ENVS.ALLO_PROXY"));

        if (allo_proxy == address(0)) {
            revert("ALLO_PROXY not set");
        }
        // get PK from env
        // councilMemberPKEnv = vm.envUint("PK");
        // if (councilMemberPKEnv == 0) {
        //     revert("PK not set");
        // }

        allo = Allo(allo_proxy);

        assertTrue(address(allo) != address(0));


        if (address(PROXY_OWNER) == address(0)) {
            PROXY_OWNER = json.readAddress(getKeyNetwork(".ENVS.PROXY_OWNER"));
            if (address(PROXY_OWNER) == address(0)) {
                ERC1967Proxy proxyOwnerProxy = new ERC1967Proxy(
                    address(new ProxyOwner()), abi.encodeWithSelector(ProxyOwner.initialize.selector, SENDER)
                );

                PROXY_OWNER = address(proxyOwnerProxy);
            }
        }

        if (address(PASSPORT_SCORER) == address(0)) {
            PASSPORT_SCORER = PassportScorer(json.readAddress(getKeyNetwork(".ENVS.PASSPORT_SCORER")));
            if (address(PASSPORT_SCORER) == address(0)) {
                ERC1967Proxy scorerProxy = new ERC1967Proxy(
                    address(new PassportScorer()),
                    abi.encodeWithSelector(PassportScorer.initialize.selector, SENDER, SENDER)
                );

                PASSPORT_SCORER = PassportScorer(payable(address(scorerProxy)));
            }
        }

        if (address(ARBITRATOR) == address(0)) {
            ARBITRATOR = SafeArbitrator(json.readAddress(getKeyNetwork(".ENVS.ARBITRATOR")));
            if (address(ARBITRATOR) == address(0)) {
                proxy = new ERC1967Proxy(
                    address(new SafeArbitrator()),
                    abi.encodeWithSelector(SafeArbitrator.initialize.selector, 0.001 ether, SENDER)
                );
                ARBITRATOR = SafeArbitrator(payable(address(proxy)));
            }
        }

        if (address(REGISTRY_FACTORY) == address(0)) {
            // REGISTRY_FACTORY = RegistryFactory(json.readAddress(getKeyNetwork(".PROXIES.REGISTRY_FACTORY")));
            if (address(REGISTRY_FACTORY) == address(0)) {
                proxy = new ERC1967Proxy(
                    address(new RegistryFactory()),
                    abi.encodeWithSelector(
                        RegistryFactory.initialize.selector,
                        address(PROXY_OWNER),
                        address(SENDER),
                        address(new RegistryCommunity()),
                        address(new CVStrategy()),
                        address(new CollateralVault())
                    )
                );
                REGISTRY_FACTORY = RegistryFactory(address(proxy));
            }
        }

        CommunityDiamondConfigurator communityDiamondConfigurator = new CommunityDiamondConfigurator();
        StrategyDiamondConfigurator diamondConfigurator = new StrategyDiamondConfigurator();
        try REGISTRY_FACTORY.initializeV2(
            communityDiamondConfigurator.getFacetCuts(),
            address(communityDiamondConfigurator.diamondInit()),
            abi.encodeCall(RegistryCommunityDiamondInit.init, ()),
            diamondConfigurator.getFacetCuts(),
            address(diamondConfigurator.diamondInit()),
            abi.encodeCall(CVStrategyDiamondInit.init, ())
        ) {}
            catch {}

        assertTrue(REGISTRY_FACTORY.registryCommunityTemplate() != address(0x0), "Registry Community Template not set");
        assertTrue(REGISTRY_FACTORY.collateralVaultTemplate() != address(0x0), "Collateral Vault Template not set");

        // Add dummy data for testing
        if (isTestnet()) {
            TOKEN = json.readAddress(getKeyNetwork(".ENVS.TOKEN"));

            COUNCIL_SAFE = json.readAddress(getKeyNetwork(".ENVS.COUNCIL_SAFE"));
            assertTrue(COUNCIL_SAFE != address(0), "Council Safe not set");

            if (TOKEN == address(0)) {
                // token = new GV2ERC20("HoneyV2", "HNYV2", 18);
                token = new GV2ERC20("Seedling", "SEED", 18);
                TOKEN = address(token);
            } else {
                token = GV2ERC20(TOKEN);
            }

            assertTrue(token != GV2ERC20(address(0)));
            assertTrue(TOKEN != address(0));

            RegistryCommunityInitializeParams memory params;

            metadata = Metadata({protocol: 1, pointer: "QmX5jPva6koRnn88s7ZcPnNXKg1UzmYaZu9h15d8kzH1CN"});
            params._metadata = metadata; // convenant ipfs
            params.covenantIpfsHash = "QmX5jPva6koRnn88s7ZcPnNXKg1UzmYaZu9h15d8kzH1CN";

            // params._communityName = "Alpha Seedling";
            params._communityName = "Alpha Centaurians";
            params._allo = address(allo);
            params._gardenToken = IERC20(address(token));
            params._registerStakeAmount = MINIMUM_STAKE;
            params._communityFee = 0;
            params._councilSafe = payable(COUNCIL_SAFE);

            assertTrue(params._councilSafe != address(0));

            RegistryCommunity registryCommunity = RegistryCommunity(REGISTRY_FACTORY.createRegistry(params));

            // PointSystemConfig memory pointConfig;
            // pointConfig.maxAmount = MINIMUM_STAKE * 2;

            // CVStrategyInitializeParamsV0_1 memory paramsCV = getParams(
            //     address(registryCommunity),
            //     ProposalType.Funding,
            //     PointSystem.Fixed,
            //     pointConfig,
            //     ArbitrableConfig(
            //         IArbitrator(address(ARBITRATOR)), payable(COUNCIL_SAFE), 0.002 ether, 0.001 ether, 1, 300
            //     ),
            //     new address[](1),
            //     address(0),
            //     0
            // );

            // (uint256 poolId, address _strategy1) = registryCommunity.createPool(
            //     address(token),
            //     paramsCV,
            //     Metadata({protocol: 1, pointer: "QmVtM9MpAJLre2TZXqRc2FTeEdseeY1HTkQUe7QuwGcEAN"})
            // );

            // paramsCV.proposalType = ProposalType.Signaling;
            // paramsCV.pointSystem = PointSystem.Unlimited;
            // paramsCV.sybilScorer = address(PASSPORT_SCORER);

            // (uint256 poolIdSignaling, address _strategy2) = registryCommunity.createPool(
            //     address(0), paramsCV, Metadata({protocol: 1, pointer: "QmReQ5dwWgVZTMKkJ4EWHSM6MBmKN21PQN45YtRRAUHiLG"})
            // );

            // CVStrategy strategy2 = CVStrategy(payable(_strategy2));

            // CVStrategy strategy1 = CVStrategy(payable(_strategy1));

            // if (isNoSafe()) {
            //     registryCommunity.addStrategy(_strategy1);
            // } else {
            //     safeHelper(
            //         Safe(payable(COUNCIL_SAFE)),
            //         councilMemberPKEnv,
            //         address(registryCommunity),
            //         abi.encodeWithSelector(registryCommunity.addStrategy.selector, _strategy1)
            //     );
            // }

            // if (isNoSafe()) {
            //     registryCommunity.addStrategy(_strategy2);
            // } else {
            //     safeHelper(
            //         Safe(payable(COUNCIL_SAFE)),
            //         councilMemberPKEnv,
            //         address(registryCommunity),
            //         abi.encodeWithSelector(registryCommunity.addStrategy.selector, _strategy2)
            //     );
            // }

            // token.mint(address(pool_admin()), 10_000 ether);
            // token.approve(address(registryCommunity), type(uint256).max);
            // // token.mint(address(pool_admin()), 100);
            // //@todo get correct value instead infinite approval
            // registryCommunity.stakeAndRegisterMember("");

            // assertEq(registryCommunity.isMember(address(pool_admin())), true, "Not a member");

            // strategy1.activatePoints();
            // strategy2.activatePoints();

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

            // if (isNoSafe()) {
            //     registryCommunity.removeStrategy(_strategy1);
            //     registryCommunity.removeStrategy(_strategy2);
            // } else {
            //     safeHelper(
            //         Safe(payable(COUNCIL_SAFE)),
            //         councilMemberPKEnv,
            //         address(registryCommunity),
            //         abi.encodeWithSelector(registryCommunity.removeStrategy.selector, _strategy1)
            //     );
            //     safeHelper(
            //         Safe(payable(COUNCIL_SAFE)),
            //         councilMemberPKEnv,
            //         address(registryCommunity),
            //         abi.encodeWithSelector(registryCommunity.removeStrategy.selector, _strategy2)
            //     );
            // }
        }
        vm.stopBroadcast();
    }
}
