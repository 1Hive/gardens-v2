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

import {RegistryCommunity} from "../src/RegistryCommunity/RegistryCommunity.sol";
import {ISafe as Safe, SafeProxyFactory, Enum} from "../src/interfaces/ISafe.sol";
import {CollateralVault} from "../src/CollateralVault.sol";
// import {SafeProxyFactory} from "safe-smart-account/contracts/proxies/SafeProxyFactory.sol";
import {Upgrades} from "@openzeppelin/foundry/LegacyUpgrades.sol";

import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {PassportScorer} from "../src/PassportScorer.sol";
import {ISybilScorer} from "../src/ISybilScorer.sol";

interface VmContext {
    enum ForgeContext {
        TestGroup,
        Test,
        Coverage,
        Snapshot,
        ScriptGroup,
        ScriptDryRun,
        ScriptBroadcast,
        ScriptResume,
        Unknown
    }

    function isContext(ForgeContext context) external view returns (bool result);
}

abstract contract BaseMultiChain is Native, CVStrategyHelpers, Script, SafeSetup {
    using stdJson for string;

    struct PendingNetworkWrite {
        string key;
        string value;
    }

    uint256 public MINIMUM_STAKE = 1 ether;

    address public SENDER;
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
    PendingNetworkWrite[] internal pendingNetworkWrites;

    function pool_admin() public virtual override returns (address) {
        return SENDER == address(0) ? _senderFromEnv() : SENDER;
    }

    function executeJq(string memory command) internal returns (bytes memory) {
        string[] memory inputs = new string[](3);

        inputs[0] = "bash";
        inputs[1] = "-c";
        inputs[2] = command;

        bytes memory result = vm.ffi(inputs);
        return result;
    }

    function _networksJsonPath() internal view virtual returns (string memory) {
        string memory overridePath = vm.envOr("NETWORKS_JSON_PATH", string(""));
        if (bytes(overridePath).length != 0) {
            return overridePath;
        }
        string memory root = vm.projectRoot();
        return string.concat(root, "/pkg/contracts/config/networks.json");
    }

    function getKeyNetwork(string memory key) internal view returns (string memory) {
        string memory networkSelected = CURRENT_NETWORK;
        string memory jqNetworkSelected = string.concat("$.networks[?(@.name=='", networkSelected, "')]");
        return string.concat(jqNetworkSelected, key);
    }

    function getNetworkJson() internal view returns (string memory) {
        string memory json = vm.readFile(_networksJsonPath());
        return json;
    }

    function run() public virtual {
        // string memory net = vm.prompt("Enter network name");
        string memory net = "";
        run(net);
    }

    function runCurrentNetwork(string memory networkJson) public virtual;

    function _flagEnabled(string memory) internal view virtual returns (bool) {
        return false;
    }

    function run(string memory network) public virtual {
        delete pendingNetworkWrites;

        if (bytes(network).length != 0) {
            CURRENT_NETWORK = network;
        }

        string memory json = getNetworkJson();

        chainId = json.readUint(getKeyNetwork(".chainId"));
        chainName = json.readString(getKeyNetwork(".name"));
        SENDER = _senderFromEnv();

        vm.startBroadcast();


        runCurrentNetwork(json);
        _flushPendingNetworkWrites();

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
        //     TOKEN = address(token);
        // } else {
        //     token = GV2ERC20(TOKEN);
        // }

        // assertTrue(token != GV2ERC20(address(0)));
        // assertTrue(TOKEN != address(0));


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

    function _senderFromEnv() internal view returns (address) {
        return vm.envAddress("DEPLOYER_ADDRESS");
    }

    function _readAddressOrZero(string memory key) internal returns (address) {
        string memory pending = _readPendingNetworkValue(key);
        if (bytes(pending).length != 0) {
            return _parseAddress(pending);
        }

        string memory path = _networksJsonPath();
        string memory command = string.concat(
            "jq -r '(.networks[] | select(.name==\"", CURRENT_NETWORK, "\") | ", key, " // empty)' ", path
        );

        string[] memory inputs = new string[](3);
        inputs[0] = "bash";
        inputs[1] = "-c";
        inputs[2] = command;
        bytes memory result = vm.ffi(inputs);

        if (result.length == 20) {
            return address(bytes20(result));
        }

        string memory value = _trim(string(result));
        if (bytes(value).length == 0 || keccak256(bytes(value)) == keccak256(bytes("null"))) {
            return address(0);
        }
        return _parseAddress(value);
    }

    function _readStringOrEmpty(string memory key) internal returns (string memory) {
        string memory pending = _readPendingNetworkValue(key);
        if (bytes(pending).length != 0) {
            return pending;
        }

        string memory path = _networksJsonPath();
        string memory command = string.concat(
            "v=$(jq -r '(.networks[] | select(.name==\"",
            CURRENT_NETWORK,
            "\") | ",
            key,
            " // empty)' ",
            path,
            "); if [ -n \"$v\" ]; then echo \"str:$v\"; fi"
        );

        string[] memory inputs = new string[](3);
        inputs[0] = "bash";
        inputs[1] = "-c";
        inputs[2] = command;
        bytes memory result = vm.ffi(inputs);
        string memory value = _trim(string(result));
        if (bytes(value).length == 0) return "";

        bytes memory valueBytes = bytes(value);
        if (valueBytes.length < 4) return "";
        if (valueBytes[0] != "s" || valueBytes[1] != "t" || valueBytes[2] != "r" || valueBytes[3] != ":") return "";

        bytes memory trimmed = new bytes(valueBytes.length - 4);
        for (uint256 i = 0; i < trimmed.length; i++) {
            trimmed[i] = valueBytes[i + 4];
        }
        return string(trimmed);
    }

    function _writeNetworkAddress(string memory key, address value) internal {
        _stageNetworkWrite(key, _addressToString(value));
    }

    function _writeNetworkString(string memory key, string memory value) internal {
        _stageNetworkWrite(key, value);
    }

    function _stageNetworkWrite(string memory key, string memory value) internal {
        bytes32 targetHash = keccak256(bytes(key));
        for (uint256 i = 0; i < pendingNetworkWrites.length; i++) {
            if (keccak256(bytes(pendingNetworkWrites[i].key)) == targetHash) {
                pendingNetworkWrites[i].value = value;
                return;
            }
        }
        pendingNetworkWrites.push(PendingNetworkWrite({key: key, value: value}));
    }

    function _readPendingNetworkValue(string memory key) internal view returns (string memory) {
        bytes32 targetHash = keccak256(bytes(key));
        for (uint256 i = pendingNetworkWrites.length; i > 0; i--) {
            PendingNetworkWrite storage entry = pendingNetworkWrites[i - 1];
            if (keccak256(bytes(entry.key)) == targetHash) {
                return entry.value;
            }
        }
        return "";
    }

    function _flushPendingNetworkWrites() internal {
        if (_flagEnabled("SKIP_NETWORK_WRITES")) {
            delete pendingNetworkWrites;
            return;
        }
        if (!_shouldPersistNetworkWrites()) {
            delete pendingNetworkWrites;
            return;
        }
        for (uint256 i = 0; i < pendingNetworkWrites.length; i++) {
            _applyNetworkWrite(pendingNetworkWrites[i].key, pendingNetworkWrites[i].value);
        }
        delete pendingNetworkWrites;
    }

    function _shouldPersistNetworkWrites() internal view virtual returns (bool) {
        if (_flagEnabled("FORCE_NETWORK_WRITES")) {
            return true;
        }

        try VmContext(address(vm)).isContext(VmContext.ForgeContext.ScriptBroadcast) returns (bool isBroadcast) {
            if (isBroadcast) return true;
        } catch {}

        try VmContext(address(vm)).isContext(VmContext.ForgeContext.ScriptResume) returns (bool isResume) {
            if (isResume) return true;
        } catch {}

        return false;
    }

    function _applyNetworkWrite(string memory key, string memory value) internal {
        string memory path = _networksJsonPath();
        string memory sanitizedKey = _sanitizeJsonPathKey(key);
        // Include network in tmp filename to avoid collisions across parallel chain tasks.
        string memory tmpPath = string.concat(path, ".", CURRENT_NETWORK, ".", sanitizedKey, ".tmp");
        string memory command = string.concat(
            "jq '(.networks[] | select(.name==\"",
            CURRENT_NETWORK,
            "\") | ",
            key,
            ") = \"",
            value,
            "\"' '",
            path,
            "' > '",
            tmpPath,
            "' && mv '",
            tmpPath,
            "' '",
            path,
            "'"
        );

        string[] memory inputs = new string[](3);
        inputs[0] = "bash";
        inputs[1] = "-c";
        inputs[2] = command;
        vm.ffi(inputs);
    }

    function _sanitizeJsonPathKey(string memory key) internal pure returns (string memory) {
        bytes memory source = bytes(key);
        bytes memory sanitized = new bytes(source.length);
        for (uint256 i = 0; i < source.length; i++) {
            bytes1 char = source[i];
            if (
                (char >= 0x30 && char <= 0x39) || (char >= 0x41 && char <= 0x5A) || (char >= 0x61 && char <= 0x7A)
            ) {
                sanitized[i] = char;
            } else {
                sanitized[i] = "_";
            }
        }
        return string(sanitized);
    }

    function _trim(string memory input) internal pure returns (string memory) {
        bytes memory inputBytes = bytes(input);
        uint256 start = 0;
        uint256 end = inputBytes.length;
        while (start < end && _isWhitespace(inputBytes[start])) start++;
        while (end > start && _isWhitespace(inputBytes[end - 1])) end--;

        bytes memory trimmed = new bytes(end - start);
        for (uint256 i = 0; i < trimmed.length; i++) {
            trimmed[i] = inputBytes[start + i];
        }
        return string(trimmed);
    }

    function _artifactJsonPath(string memory artifactId) internal view returns (string memory) {
        bytes memory artifactBytes = bytes(artifactId);
        uint256 colonIndex = artifactBytes.length;
        uint256 slashIndex = 0;

        for (uint256 i = 0; i < artifactBytes.length; i++) {
            if (artifactBytes[i] == ":") {
                colonIndex = i;
                break;
            }
            if (artifactBytes[i] == "/") {
                slashIndex = i + 1;
            }
        }

        require(colonIndex < artifactBytes.length, "artifact id missing contract name");

        bytes memory fileName = new bytes(colonIndex - slashIndex);
        for (uint256 i = 0; i < fileName.length; i++) {
            fileName[i] = artifactBytes[slashIndex + i];
        }

        bytes memory contractName = new bytes(artifactBytes.length - colonIndex - 1);
        for (uint256 i = 0; i < contractName.length; i++) {
            contractName[i] = artifactBytes[colonIndex + 1 + i];
        }

        return string.concat(vm.projectRoot(), "/pkg/contracts/out/", string(fileName), "/", string(contractName), ".json");
    }

    function _immutableReferences(string memory artifactId) internal returns (string memory) {
        string memory command = string.concat(
            "jq -r 'if .deployedBytecode.immutableReferences == null then \"\" else [.deployedBytecode.immutableReferences | to_entries[]?.value[]? | \"\\(.start):\\(.length)\"] | join(\";\") end' '",
            _artifactJsonPath(artifactId),
            "'"
        );

        string[] memory inputs = new string[](3);
        inputs[0] = "bash";
        inputs[1] = "-c";
        inputs[2] = command;

        return _trim(string(vm.ffi(inputs)));
    }

    function _normalizedCodeHash(bytes memory code, string memory artifactId) internal returns (bytes32) {
        string memory refs = _immutableReferences(artifactId);
        if (bytes(refs).length == 0) {
            return keccak256(code);
        }

        bytes memory refsBytes = bytes(refs);
        uint256 cursor = 0;
        while (cursor < refsBytes.length) {
            uint256 start = 0;
            while (cursor < refsBytes.length && refsBytes[cursor] != ":") {
                start = (start * 10) + (uint8(refsBytes[cursor]) - 48);
                cursor++;
            }
            require(cursor < refsBytes.length && refsBytes[cursor] == ":", "invalid immutable refs");
            cursor++;

            uint256 len = 0;
            while (cursor < refsBytes.length && refsBytes[cursor] != ";") {
                len = (len * 10) + (uint8(refsBytes[cursor]) - 48);
                cursor++;
            }

            uint256 end = start + len;
            require(end <= code.length, "immutable ref out of bounds");
            for (uint256 i = start; i < end; i++) {
                code[i] = 0x00;
            }

            if (cursor < refsBytes.length && refsBytes[cursor] == ";") {
                cursor++;
            }
        }

        return keccak256(code);
    }

    function _deployedCodeHash(string memory artifactId) internal returns (bytes32) {
        bytes memory deployedCode = vm.getDeployedCode(artifactId);
        if (deployedCode.length == 0) {
            revert("missing deployed bytecode for artifact");
        }
        return _normalizedCodeHash(deployedCode, artifactId);
    }

    function _addressCodeHash(address target, string memory artifactId) internal returns (bytes32) {
        return _normalizedCodeHash(target.code, artifactId);
    }

    function _isWhitespace(bytes1 char) internal pure returns (bool) {
        return char == 0x20 || char == 0x0a || char == 0x0d || char == 0x09;
    }

    function _parseAddress(string memory value) internal pure returns (address) {
        bytes memory data = bytes(value);
        if (data.length != 42 || data[0] != "0" || data[1] != "x") {
            return address(0);
        }
        uint160 result = 0;
        for (uint256 i = 2; i < 42; i++) {
            uint8 nibble = _fromHexChar(data[i]);
            if (nibble > 15) {
                return address(0);
            }
            result = (result << 4) | uint160(nibble);
        }
        return address(result);
    }

    function _fromHexChar(bytes1 char) internal pure returns (uint8) {
        uint8 value = uint8(char);
        if (value >= 48 && value <= 57) return value - 48;
        if (value >= 65 && value <= 70) return value - 55;
        if (value >= 97 && value <= 102) return value - 87;
        return 255;
    }

    function _addressToString(address account) internal pure returns (string memory) {
        return Strings.toHexString(uint160(account), 20);
    }

    function _isEqual(string memory a, string memory b) internal pure returns (bool) {
        return (keccak256(abi.encodePacked(a)) == keccak256(abi.encodePacked(b)));
    }

    function _sleepIfNetwork(string memory network, string memory networkName) internal {
        if (_isEqual(network, networkName)) {
            vm.sleep(WAIT_TIME);
        }
    }
}
