// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/console2.sol";
import "forge-std/Script.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../src/CVStrategy.sol";
import {IAllo} from "allo-v2-contracts/core/interfaces/IAllo.sol";
import {Allo} from "allo-v2-contracts/core/Allo.sol";
import {IRegistry} from "allo-v2-contracts/core/interfaces/IRegistry.sol";
import {Registry} from "allo-v2-contracts/core/Registry.sol";
import {Native} from "allo-v2-contracts/core/libraries/Native.sol";
import {CVStrategyHelpers} from "../test/CVStrategyHelpers.sol";
import {MockERC20 as AMockERC20} from "allo-v2-test/utils/MockERC20.sol";
import {RegistryFactory} from "../src/RegistryFactory.sol";
import {SafeSetup} from "../test/shared/SafeSetup.sol";
import {Metadata} from "allo-v2-contracts/core/libraries/Metadata.sol";
import {Accounts} from "allo-v2-test/foundry/shared/Accounts.sol";

contract DeployCV is Native, CVStrategyHelpers, Script, SafeSetup {
    uint256 public constant MINIMUM_STAKE = 50;

    AMockERC20 public token;

    Allo _allo_;
    Registry _registry_;

    function pool_admin() public virtual override returns (address) {
        return address(0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266);
    }

    function allo_owner() public virtual override returns (address) {
        return address(0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266);
    }

    function run() public {
        vm.startBroadcast(pool_admin());

        Allo allo = Allo(deployAllo());

        token = new AMockERC20();

        IRegistry registry = allo.getRegistry();
        RegistryFactory registryFactory = new RegistryFactory();

        RegistryGardens.InitializeParams memory params;
        params._allo = address(allo);
        params._gardenToken = IERC20(address(token));
        params._minimumStakeAmount = MINIMUM_STAKE;
        params._protocolFee = 2;
        params._metadata = metadata;
        params._councilSafe = payable(address(_councilSafe()));

        RegistryGardens registryGardens = RegistryGardens(registryFactory.createRegistry(params));

        CVStrategy strategy = new CVStrategy(address(allo));

        vm.stopBroadcast();

        address[] memory membersStaked = new address[](4);

        membersStaked[0] = address(0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266);
        membersStaked[1] = address(0x70997970C51812dc3A010C7d01b50e0d17dc79C8);
        membersStaked[2] = address(0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC);
        membersStaked[3] = address(0x90F79bf6EB2c4f870365E785982E1f101E93b906);

        for (uint256 i = 0; i < membersStaked.length; i++) {
            vm.startBroadcast(address(membersStaked[i]));
            token.mint(address(membersStaked[i]), 100 ether);
            token.approve(address(registryGardens), MINIMUM_STAKE);
            registryGardens.stakeAndregisterMember();
            vm.stopBroadcast();
        }

        vm.startBroadcast(allo.owner());
        allo.addToCloneableStrategies(address(strategy));
        vm.stopBroadcast();

        vm.startBroadcast(pool_admin());

        token.mint(address(pool_admin()), 100 ether);

        uint256 poolId = createPool(Allo(address(allo)), address(strategy), address(0), registry, address(token));
        token.approve(address(allo), 100 ether);
        allo.fundPool(poolId, 0.1 ether);

        uint256 poolIdNative = createPool(Allo(address(allo)), address(strategy), address(0), registry, address(0));
        allo.fundPool{value: 0.1 ether}(poolIdNative, 0.1 ether);

        vm.stopBroadcast();

        console2.log("PoolId: %s", poolId);
        console2.log("Allo Addr: %s", address(allo));
        console2.log("Strategy Addr: %s", address(strategy));
        console2.log("Token Addr: %s", address(token));

        console2.log("Registry Gardens Addr: %s", address(registryGardens));

        console2.log("Registry Addr: %s", address(registry));
        console2.log("Pool Admin: %s", pool_admin());
        console2.log("Council Safe: %s", address(_councilSafe()));
    }

    function deployAllo() public returns (address) {
        _registry_ = new Registry();
        _registry_.initialize(registry_owner());
        _allo_ = new Allo();

        _allo_.initialize(
            allo_owner(), // _owner
            address(_registry_), // _registry
            allo_treasury(), // _treasury
            0, // _percentFee
            0 // _baseFee
        );

        return address(_allo_);
    }
}
