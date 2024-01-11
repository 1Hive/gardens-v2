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

contract DeployCVArbSepolia is Native, CVStrategyHelpers, Script, SafeSetup {
    uint256 public constant MINIMUM_STAKE = 50;

    AMockERC20 public token;

    Allo _allo_;
    Registry _registry_;

    address public constant SENDER = 0x2F9e113434aeBDd70bB99cB6505e1F726C578D6d;

    function pool_admin() public virtual override returns (address) {
        return address(SENDER);
    }

    function allo_owner() public virtual override returns (address) {
        return address(SENDER);
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
        params._protocolFee = 0;
        params._metadata = metadata; // convenant ipfs
        params._councilSafe = payable(address(_councilSafe()));

        RegistryGardens registryGardens = RegistryGardens(registryFactory.createRegistry(params)); //@todo rename To RegistryCOmmunity

        // vm.stopBroadcast();

        // address[] memory membersStaked = new address[](2);

        // membersStaked[0] = address(SENDER);
        // membersStaked[1] = address(0x3CeeF2C35d55a61514CeCe32C165fB96536d76c4);

        // for (uint256 i = 0; i < membersStaked.length; i++) {
        // vm.startBroadcast();
        token.mint(address(allo_owner()), 100 ether);

        token.approve(address(registryGardens), MINIMUM_STAKE);
        registryGardens.stakeAndRegisterMember();

        CVStrategy strategy1 = new CVStrategy(address(allo));
        uint256 poolId =
            createPool(Allo(address(allo)), address(strategy1), address(registryGardens), registry, address(token));
        token.approve(address(allo), 100 ether);
        allo.fundPool(poolId, 0.1 ether);

        CVStrategy strategy2 = new CVStrategy(address(allo));
        uint256 poolIdNative =
            createPool(Allo(address(allo)), address(strategy2), address(registryGardens), registry, address(0));

        allo.fundPool{value: 0.1 ether}(poolIdNative, 0.1 ether);

        CVStrategy.CreateProposal memory proposal = CVStrategy.CreateProposal(
            1, poolId, pool_admin(), CVStrategy.ProposalType.Funding, 1000 wei, address(token)
        );
        bytes memory data = abi.encode(proposal);
        allo.registerRecipient(poolId, data);

        proposal =
            CVStrategy.CreateProposal(2, poolId, pool_admin(), CVStrategy.ProposalType.Funding, 500 wei, address(token));
        data = abi.encode(proposal);
        allo.registerRecipient(poolId, data);

        proposal =
            CVStrategy.CreateProposal(3, poolId, pool_admin(), CVStrategy.ProposalType.Funding, 900 wei, address(token));
        data = abi.encode(proposal);
        allo.registerRecipient(poolId, data);

        vm.stopBroadcast();

        console2.log("PoolId: %s", poolId);
        console2.log("Strategy1 Addr: %s", address(strategy1));

        console2.log("PoolIdNative: %s", poolIdNative);
        console2.log("Strategy2 Addr: %s", address(strategy2));

        console2.log("Allo Addr: %s", address(allo));
        console2.log("Token Addr: %s", address(token));
        console2.log("Token Native Addr: %s", address(NATIVE));

        console2.log("Registry Gardens Addr: %s", address(registryGardens));

        console2.log("Allo Registry Addr: %s", address(registry));
        console2.log("Pool Admin Addr: %s", pool_admin());
        console2.log("Council Safe Addr: %s", address(_councilSafe()));
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
