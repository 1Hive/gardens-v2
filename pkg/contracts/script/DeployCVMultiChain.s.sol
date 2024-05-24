// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/console2.sol";
import "forge-std/Script.sol";
import "forge-std/StdJson.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "@openzeppelin/contracts/utils/Strings.sol";
import "../src/CVStrategy.sol";
import {IAllo} from "allo-v2-contracts/core/interfaces/IAllo.sol";
import {Allo} from "allo-v2-contracts/core/Allo.sol";
import {IRegistry} from "allo-v2-contracts/core/interfaces/IRegistry.sol";
import {Registry} from "allo-v2-contracts/core/Registry.sol";
import {Native} from "allo-v2-contracts/core/libraries/Native.sol";
import {CVStrategyHelpers} from "../test/CVStrategyHelpers.sol";
// import {MockERC20 as AMockERC20} from "allo-v2-test/utils/MockERC20.sol";
import {GV2ERC20} from "./GV2ERC20.sol";
import {RegistryFactory} from "../src/RegistryFactory.sol";
import {SafeSetup} from "../test/shared/SafeSetup.sol";
import {Metadata} from "allo-v2-contracts/core/libraries/Metadata.sol";
import {Accounts} from "allo-v2-test/foundry/shared/Accounts.sol";

import {Safe} from "safe-contracts/contracts/Safe.sol";

import {SafeProxyFactory} from "safe-contracts/contracts/proxies/SafeProxyFactory.sol";

contract DeployCVMultiChain is Native, CVStrategyHelpers, Script, SafeSetup {
    using stdJson for string;

    uint256 public MINIMUM_STAKE = 1 ether;

    address public SENDER = 0x2F9e113434aeBDd70bB99cB6505e1F726C578D6d;
    address public TOKEN; // check networks.json file
    address public COUNCIL_SAFE; // check networks.json file
    address public SAFE_PROXY_FACTORY; // check networks.json file

    string public CURRENT_NETWORK = "arbsepolia";

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
            token = new GV2ERC20("HoneyV2", "HNYV2", 18);
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

        RegistryFactory registryFactory = new RegistryFactory();

        RegistryCommunity.InitializeParams memory params;

        metadata = Metadata({protocol: 1, pointer: "QmX5jPva6koRnn88s7ZcPnNXKg1UzmYaZu9h15d8kzH1CN"});
        params._metadata = metadata; // convenant ipfs

        params._communityName = "Alpha Centaurians";
        params._allo = address(allo);
        params._strategyTemplate = address(new CVStrategy(address(allo)));
        params._gardenToken = IERC20(address(token));
        params._registerStakeAmount = MINIMUM_STAKE;
        params._communityFee = 0;
        params._councilSafe = payable(COUNCIL_SAFE);

        assertTrue(params._councilSafe != address(0));

        RegistryCommunity registryCommunity = RegistryCommunity(registryFactory.createRegistry(params));

        StrategyStruct.PointSystemConfig memory pointConfig;
        pointConfig.maxAmount = MINIMUM_STAKE * 2;

        StrategyStruct.InitializeParams memory paramsCV = getParams(
            address(registryCommunity),
            StrategyStruct.ProposalType.Funding,
            StrategyStruct.PointSystem.Fixed,
            pointConfig
        );

        paramsCV.decay = _etherToFloat(0.9965402 ether); // alpha = decay
        paramsCV.maxRatio = _etherToFloat(0.2 ether); // beta = maxRatio
        paramsCV.weight = _etherToFloat(0.001 ether); // RHO = p  = weight

        (uint256 poolId, address _strategy1) = registryCommunity.createPool(address(token), paramsCV, metadata);

        safeHelper(
            Safe(payable(COUNCIL_SAFE)),
            councilMemberPKEnv,
            address(registryCommunity),
            abi.encodeWithSelector(registryCommunity.addStrategy.selector, _strategy1)
        );

        CVStrategy strategy1 = CVStrategy(payable(_strategy1));

        strategy1.setDecay(_etherToFloat(0.9965402 ether));
        // alpha = decay
        strategy1.setMaxRatio(_etherToFloat(0.1 ether)); // beta = maxRatio
        strategy1.setWeight(_etherToFloat(0.0005 ether)); // RHO = p  = weight

        paramsCV.proposalType = StrategyStruct.ProposalType.Signaling;
        paramsCV.pointSystem = StrategyStruct.PointSystem.Unlimited;

        (uint256 poolIdSignaling, address _strategy2) = registryCommunity.createPool(address(0), paramsCV, metadata);

        safeHelper(
            Safe(payable(COUNCIL_SAFE)),
            councilMemberPKEnv,
            address(registryCommunity),
            abi.encodeWithSelector(registryCommunity.addStrategy.selector, _strategy2)
        );

        CVStrategy strategy2 = CVStrategy(payable(_strategy2));

        // FAST 1 MIN GROWTH
        strategy2.setDecay(_etherToFloat(0.9965402 ether)); // alpha = decay
        strategy2.setMaxRatio(_etherToFloat(0.1 ether)); // beta = maxRatio
        strategy2.setWeight(_etherToFloat(0.0005 ether)); // RHO = p  = weight

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
        allo.fundPool(poolId, 1_000 ether);

        StrategyStruct.CreateProposal memory proposal =
            StrategyStruct.CreateProposal(poolId, pool_admin(), 50 ether, address(token), metadata);
        bytes memory data = abi.encode(proposal);
        allo.registerRecipient(poolId, data);

        proposal = StrategyStruct.CreateProposal(poolId, pool_admin(), 25 ether, address(token), metadata);
        data = abi.encode(proposal);
        allo.registerRecipient(poolId, data);

        proposal = StrategyStruct.CreateProposal(poolId, pool_admin(), 10 ether, address(token), metadata);
        data = abi.encode(proposal);
        allo.registerRecipient(poolId, data);

        // Strategy with Signaling
        StrategyStruct.CreateProposal memory proposal2 =
            StrategyStruct.CreateProposal(poolIdSignaling, pool_admin(), 0, address(0), metadata);
        bytes memory data2 = abi.encode(proposal2);
        allo.registerRecipient(poolIdSignaling, data2);

        vm.stopBroadcast();
    }
}
