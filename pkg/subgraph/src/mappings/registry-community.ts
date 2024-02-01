import { CVStrategy as CVStrategyTemplate  } from "../../generated/templates";
import {  CVStrategy,  MembersCommunities, RegistryCommunity } from "../../generated/schema";

import { dataSource, log } from '@graphprotocol/graph-ts'
import {RegistryInitialized, RegistryCommunity as RegistryCommunityContract, MemberRegistered, StrategyAdded}from "../../generated/RegistryCommunity/RegistryCommunity";
import { CTX_FACTORY_ADDRESS } from "./registry-factory";

export function handleInitialized(event: RegistryInitialized): void {
    log.debug("RegistryCommunity: handleInitialized: {}", [event.address.toHexString()]);
   const rc =  RegistryCommunity.load(event.address.toHex());
   const factoryAddress = dataSource.context().getString(CTX_FACTORY_ADDRESS);
    if(rc == null){
        let newRC = new RegistryCommunity(event.address.toHex());
        
        
        newRC.communityName = event.params._communityName;
        newRC.profileId = event.params._profileId.toHexString();
        newRC.covenantIpfsHash = event.params._metadata.pointer;
        
        const rcc = RegistryCommunityContract.bind(event.address);
        
        newRC.registerStakeAmount = rcc.registerStakeAmount();
        newRC.councilSafe = rcc.councilSafe().toHexString();

        newRC.alloAddress = rcc.allo().toHexString();
        newRC.isKickEnabled = rcc.isKickEnabled();
        newRC.protocolFee = rcc.communityFee();
        newRC.registerToken = rcc.gardenToken().toHexString();
        newRC.registryFactory = factoryAddress;
        // newRC.strategies = rcc.enabledStrategies();
        // const mc = new MembersCommunities(`${event.address.toHex()}-members`);
        // newRC.members. = [mc];
        // newRC.members
    
        newRC.save();
    }
}

// // handleMemberRegistered
// export function handleMemberRegistered(event: MemberRegistered): void {
//     const community = event.address.toHex();
//     const memberAddress = event.params._member.toHexString();
//     const id =`${memberAddress}-${community}`;
//     const member = MembersCommunities.load(id);
//     if (member == null) {
//         let newMember = new MembersCommunities(id);
//         newMember.member = memberAddress;
//         newMember.registryCommunity = community;
//         newMember.save();
//     }
// }

// //  handleStrategyAdded
export function handleStrategyAdded(event: StrategyAdded): void {
    log.debug('handleStrategyAdded',[event.params._strategy.toHexString()]);
    const strategyAddress = event.params._strategy;

    CVStrategyTemplate.create(strategyAddress);
}