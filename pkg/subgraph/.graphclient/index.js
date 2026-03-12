import { gql } from '@graphql-mesh/utils';
import { PubSub } from '@graphql-mesh/utils';
import { DefaultLogger } from '@graphql-mesh/utils';
import MeshCache from "@graphql-mesh/cache-localforage";
import { fetch as fetchFn } from '@whatwg-node/fetch';
import GraphqlHandler from "@graphql-mesh/graphql";
import BareMerger from "@graphql-mesh/merger-bare";
import { printWithCache } from '@graphql-mesh/utils';
import { usePersistedOperations } from '@graphql-yoga/plugin-persisted-operations';
import { createMeshHTTPHandler } from '@graphql-mesh/http';
import { getMesh } from '@graphql-mesh/runtime';
import { MeshStore, FsStoreStorageAdapter } from '@graphql-mesh/store';
import { path as pathModule } from '@graphql-mesh/cross-helpers';
import * as importedModule$0 from "./sources/gv2/introspectionSchema.js";
import { fileURLToPath } from '@graphql-mesh/utils';
const baseDir = pathModule.join(pathModule.dirname(fileURLToPath(import.meta.url)), '..');
const importFn = (moduleId) => {
    const relativeModuleId = (pathModule.isAbsolute(moduleId) ? pathModule.relative(baseDir, moduleId) : moduleId).split('\\').join('/').replace(baseDir + '/', '');
    switch (relativeModuleId) {
        case ".graphclient/sources/gv2/introspectionSchema.js":
            return Promise.resolve(importedModule$0);
        default:
            return Promise.reject(new Error(`Cannot find module '${relativeModuleId}'.`));
    }
};
const rootStore = new MeshStore('.graphclient', new FsStoreStorageAdapter({
    cwd: baseDir,
    importFn,
    fileType: "js",
}), {
    readonly: true,
    validate: false
});
export const rawServeConfig = undefined;
export async function getMeshOptions() {
    const pubsub = new PubSub();
    const sourcesStore = rootStore.child('sources');
    const logger = new DefaultLogger("GraphClient");
    const cache = new MeshCache({
        ...{},
        importFn,
        store: rootStore.child('cache'),
        pubsub,
        logger,
    });
    const sources = [];
    const transforms = [];
    const additionalEnvelopPlugins = [];
    const gv2Transforms = [];
    const additionalTypeDefs = [];
    const gv2Handler = new GraphqlHandler({
        name: "gv2",
        config: { "endpoint": "https://api.studio.thegraph.com/query/70985/gardens-v-2-optimism-sepolia/version/latest" },
        baseDir,
        cache,
        pubsub,
        store: sourcesStore.child("gv2"),
        logger: logger.child("gv2"),
        importFn,
    });
    sources[0] = {
        name: 'gv2',
        handler: gv2Handler,
        transforms: gv2Transforms
    };
    const additionalResolvers = [];
    const merger = new BareMerger({
        cache,
        pubsub,
        logger: logger.child('bareMerger'),
        store: rootStore.child('bareMerger')
    });
    const documentHashMap = {
        "93f0d2cd75a9946cc429b26795a7debe33e77219af541c30c2960d5b7741fff3": GetFactoriesDocument,
        "93f0d2cd75a9946cc429b26795a7debe33e77219af541c30c2960d5b7741fff3": GetTokenGardensDocument,
        "93f0d2cd75a9946cc429b26795a7debe33e77219af541c30c2960d5b7741fff3": GetMembersStrategyDocument,
        "93f0d2cd75a9946cc429b26795a7debe33e77219af541c30c2960d5b7741fff3": GetMemberStrategyDocument,
        "93f0d2cd75a9946cc429b26795a7debe33e77219af541c30c2960d5b7741fff3": IsMemberDocument,
        "93f0d2cd75a9946cc429b26795a7debe33e77219af541c30c2960d5b7741fff3": GetMemberDocument,
        "93f0d2cd75a9946cc429b26795a7debe33e77219af541c30c2960d5b7741fff3": GetPoolCreationDataDocument,
        "93f0d2cd75a9946cc429b26795a7debe33e77219af541c30c2960d5b7741fff3": GetProposalSupportersDocument,
        "93f0d2cd75a9946cc429b26795a7debe33e77219af541c30c2960d5b7741fff3": GetGardenCommunitiesDocument,
        "93f0d2cd75a9946cc429b26795a7debe33e77219af541c30c2960d5b7741fff3": GetCommunitiesDocument,
        "93f0d2cd75a9946cc429b26795a7debe33e77219af541c30c2960d5b7741fff3": GetCommunityDocument,
        "93f0d2cd75a9946cc429b26795a7debe33e77219af541c30c2960d5b7741fff3": GetCommunityCreationDataDocument,
        "93f0d2cd75a9946cc429b26795a7debe33e77219af541c30c2960d5b7741fff3": GetRegistryFactoryDataDocument,
        "93f0d2cd75a9946cc429b26795a7debe33e77219af541c30c2960d5b7741fff3": GetPoolDataDocument,
        "93f0d2cd75a9946cc429b26795a7debe33e77219af541c30c2960d5b7741fff3": GetProposalDataDocument,
        "93f0d2cd75a9946cc429b26795a7debe33e77219af541c30c2960d5b7741fff3": GetAlloDocument,
        "93f0d2cd75a9946cc429b26795a7debe33e77219af541c30c2960d5b7741fff3": GetStrategyByPoolDocument,
        "93f0d2cd75a9946cc429b26795a7debe33e77219af541c30c2960d5b7741fff3": GetTokenTitleDocument,
        "93f0d2cd75a9946cc429b26795a7debe33e77219af541c30c2960d5b7741fff3": GetCommunityTitlesDocument,
        "93f0d2cd75a9946cc429b26795a7debe33e77219af541c30c2960d5b7741fff3": GetPoolTitlesDocument,
        "93f0d2cd75a9946cc429b26795a7debe33e77219af541c30c2960d5b7741fff3": GetProposalTitlesDocument,
        "93f0d2cd75a9946cc429b26795a7debe33e77219af541c30c2960d5b7741fff3": GetPassportStrategyDocument,
        "93f0d2cd75a9946cc429b26795a7debe33e77219af541c30c2960d5b7741fff3": GetPassportUserDocument,
        "93f0d2cd75a9946cc429b26795a7debe33e77219af541c30c2960d5b7741fff3": GetGoodDollarStrategyDocument,
        "93f0d2cd75a9946cc429b26795a7debe33e77219af541c30c2960d5b7741fff3": GetGoodDollarUserDocument,
        "93f0d2cd75a9946cc429b26795a7debe33e77219af541c30c2960d5b7741fff3": GetProposalDisputesDocument,
        "93f0d2cd75a9946cc429b26795a7debe33e77219af541c30c2960d5b7741fff3": GetArbitrableConfigsDocument,
        "93f0d2cd75a9946cc429b26795a7debe33e77219af541c30c2960d5b7741fff3": GetMemberPassportAndCommunitiesDocument,
        "93f0d2cd75a9946cc429b26795a7debe33e77219af541c30c2960d5b7741fff3": GetCommunityNameDocument,
        "93f0d2cd75a9946cc429b26795a7debe33e77219af541c30c2960d5b7741fff3": GetPoolTitleDocument,
        "93f0d2cd75a9946cc429b26795a7debe33e77219af541c30c2960d5b7741fff3": GetProposalTitleDocument
    };
    additionalEnvelopPlugins.push(usePersistedOperations({
        getPersistedOperation(key) {
            return documentHashMap[key];
        },
        ...{}
    }));
    return {
        sources,
        transforms,
        additionalTypeDefs,
        additionalResolvers,
        cache,
        pubsub,
        merger,
        logger,
        additionalEnvelopPlugins,
        get documents() {
            return [
                {
                    document: GetFactoriesDocument,
                    get rawSDL() {
                        return printWithCache(GetFactoriesDocument);
                    },
                    location: 'GetFactoriesDocument.graphql',
                    sha256Hash: '93f0d2cd75a9946cc429b26795a7debe33e77219af541c30c2960d5b7741fff3'
                }, {
                    document: GetTokenGardensDocument,
                    get rawSDL() {
                        return printWithCache(GetTokenGardensDocument);
                    },
                    location: 'GetTokenGardensDocument.graphql',
                    sha256Hash: '93f0d2cd75a9946cc429b26795a7debe33e77219af541c30c2960d5b7741fff3'
                }, {
                    document: GetMembersStrategyDocument,
                    get rawSDL() {
                        return printWithCache(GetMembersStrategyDocument);
                    },
                    location: 'GetMembersStrategyDocument.graphql',
                    sha256Hash: '93f0d2cd75a9946cc429b26795a7debe33e77219af541c30c2960d5b7741fff3'
                }, {
                    document: GetMemberStrategyDocument,
                    get rawSDL() {
                        return printWithCache(GetMemberStrategyDocument);
                    },
                    location: 'GetMemberStrategyDocument.graphql',
                    sha256Hash: '93f0d2cd75a9946cc429b26795a7debe33e77219af541c30c2960d5b7741fff3'
                }, {
                    document: IsMemberDocument,
                    get rawSDL() {
                        return printWithCache(IsMemberDocument);
                    },
                    location: 'IsMemberDocument.graphql',
                    sha256Hash: '93f0d2cd75a9946cc429b26795a7debe33e77219af541c30c2960d5b7741fff3'
                }, {
                    document: GetMemberDocument,
                    get rawSDL() {
                        return printWithCache(GetMemberDocument);
                    },
                    location: 'GetMemberDocument.graphql',
                    sha256Hash: '93f0d2cd75a9946cc429b26795a7debe33e77219af541c30c2960d5b7741fff3'
                }, {
                    document: GetPoolCreationDataDocument,
                    get rawSDL() {
                        return printWithCache(GetPoolCreationDataDocument);
                    },
                    location: 'GetPoolCreationDataDocument.graphql',
                    sha256Hash: '93f0d2cd75a9946cc429b26795a7debe33e77219af541c30c2960d5b7741fff3'
                }, {
                    document: GetProposalSupportersDocument,
                    get rawSDL() {
                        return printWithCache(GetProposalSupportersDocument);
                    },
                    location: 'GetProposalSupportersDocument.graphql',
                    sha256Hash: '93f0d2cd75a9946cc429b26795a7debe33e77219af541c30c2960d5b7741fff3'
                }, {
                    document: GetGardenCommunitiesDocument,
                    get rawSDL() {
                        return printWithCache(GetGardenCommunitiesDocument);
                    },
                    location: 'GetGardenCommunitiesDocument.graphql',
                    sha256Hash: '93f0d2cd75a9946cc429b26795a7debe33e77219af541c30c2960d5b7741fff3'
                }, {
                    document: GetCommunitiesDocument,
                    get rawSDL() {
                        return printWithCache(GetCommunitiesDocument);
                    },
                    location: 'GetCommunitiesDocument.graphql',
                    sha256Hash: '93f0d2cd75a9946cc429b26795a7debe33e77219af541c30c2960d5b7741fff3'
                }, {
                    document: GetCommunityDocument,
                    get rawSDL() {
                        return printWithCache(GetCommunityDocument);
                    },
                    location: 'GetCommunityDocument.graphql',
                    sha256Hash: '93f0d2cd75a9946cc429b26795a7debe33e77219af541c30c2960d5b7741fff3'
                }, {
                    document: GetCommunityCreationDataDocument,
                    get rawSDL() {
                        return printWithCache(GetCommunityCreationDataDocument);
                    },
                    location: 'GetCommunityCreationDataDocument.graphql',
                    sha256Hash: '93f0d2cd75a9946cc429b26795a7debe33e77219af541c30c2960d5b7741fff3'
                }, {
                    document: GetRegistryFactoryDataDocument,
                    get rawSDL() {
                        return printWithCache(GetRegistryFactoryDataDocument);
                    },
                    location: 'GetRegistryFactoryDataDocument.graphql',
                    sha256Hash: '93f0d2cd75a9946cc429b26795a7debe33e77219af541c30c2960d5b7741fff3'
                }, {
                    document: GetPoolDataDocument,
                    get rawSDL() {
                        return printWithCache(GetPoolDataDocument);
                    },
                    location: 'GetPoolDataDocument.graphql',
                    sha256Hash: '93f0d2cd75a9946cc429b26795a7debe33e77219af541c30c2960d5b7741fff3'
                }, {
                    document: GetProposalDataDocument,
                    get rawSDL() {
                        return printWithCache(GetProposalDataDocument);
                    },
                    location: 'GetProposalDataDocument.graphql',
                    sha256Hash: '93f0d2cd75a9946cc429b26795a7debe33e77219af541c30c2960d5b7741fff3'
                }, {
                    document: GetAlloDocument,
                    get rawSDL() {
                        return printWithCache(GetAlloDocument);
                    },
                    location: 'GetAlloDocument.graphql',
                    sha256Hash: '93f0d2cd75a9946cc429b26795a7debe33e77219af541c30c2960d5b7741fff3'
                }, {
                    document: GetStrategyByPoolDocument,
                    get rawSDL() {
                        return printWithCache(GetStrategyByPoolDocument);
                    },
                    location: 'GetStrategyByPoolDocument.graphql',
                    sha256Hash: '93f0d2cd75a9946cc429b26795a7debe33e77219af541c30c2960d5b7741fff3'
                }, {
                    document: GetTokenTitleDocument,
                    get rawSDL() {
                        return printWithCache(GetTokenTitleDocument);
                    },
                    location: 'GetTokenTitleDocument.graphql',
                    sha256Hash: '93f0d2cd75a9946cc429b26795a7debe33e77219af541c30c2960d5b7741fff3'
                }, {
                    document: GetCommunityTitlesDocument,
                    get rawSDL() {
                        return printWithCache(GetCommunityTitlesDocument);
                    },
                    location: 'GetCommunityTitlesDocument.graphql',
                    sha256Hash: '93f0d2cd75a9946cc429b26795a7debe33e77219af541c30c2960d5b7741fff3'
                }, {
                    document: GetPoolTitlesDocument,
                    get rawSDL() {
                        return printWithCache(GetPoolTitlesDocument);
                    },
                    location: 'GetPoolTitlesDocument.graphql',
                    sha256Hash: '93f0d2cd75a9946cc429b26795a7debe33e77219af541c30c2960d5b7741fff3'
                }, {
                    document: GetProposalTitlesDocument,
                    get rawSDL() {
                        return printWithCache(GetProposalTitlesDocument);
                    },
                    location: 'GetProposalTitlesDocument.graphql',
                    sha256Hash: '93f0d2cd75a9946cc429b26795a7debe33e77219af541c30c2960d5b7741fff3'
                }, {
                    document: GetPassportStrategyDocument,
                    get rawSDL() {
                        return printWithCache(GetPassportStrategyDocument);
                    },
                    location: 'GetPassportStrategyDocument.graphql',
                    sha256Hash: '93f0d2cd75a9946cc429b26795a7debe33e77219af541c30c2960d5b7741fff3'
                }, {
                    document: GetPassportUserDocument,
                    get rawSDL() {
                        return printWithCache(GetPassportUserDocument);
                    },
                    location: 'GetPassportUserDocument.graphql',
                    sha256Hash: '93f0d2cd75a9946cc429b26795a7debe33e77219af541c30c2960d5b7741fff3'
                }, {
                    document: GetGoodDollarStrategyDocument,
                    get rawSDL() {
                        return printWithCache(GetGoodDollarStrategyDocument);
                    },
                    location: 'GetGoodDollarStrategyDocument.graphql',
                    sha256Hash: '93f0d2cd75a9946cc429b26795a7debe33e77219af541c30c2960d5b7741fff3'
                }, {
                    document: GetGoodDollarUserDocument,
                    get rawSDL() {
                        return printWithCache(GetGoodDollarUserDocument);
                    },
                    location: 'GetGoodDollarUserDocument.graphql',
                    sha256Hash: '93f0d2cd75a9946cc429b26795a7debe33e77219af541c30c2960d5b7741fff3'
                }, {
                    document: GetProposalDisputesDocument,
                    get rawSDL() {
                        return printWithCache(GetProposalDisputesDocument);
                    },
                    location: 'GetProposalDisputesDocument.graphql',
                    sha256Hash: '93f0d2cd75a9946cc429b26795a7debe33e77219af541c30c2960d5b7741fff3'
                }, {
                    document: GetArbitrableConfigsDocument,
                    get rawSDL() {
                        return printWithCache(GetArbitrableConfigsDocument);
                    },
                    location: 'GetArbitrableConfigsDocument.graphql',
                    sha256Hash: '93f0d2cd75a9946cc429b26795a7debe33e77219af541c30c2960d5b7741fff3'
                }, {
                    document: GetMemberPassportAndCommunitiesDocument,
                    get rawSDL() {
                        return printWithCache(GetMemberPassportAndCommunitiesDocument);
                    },
                    location: 'GetMemberPassportAndCommunitiesDocument.graphql',
                    sha256Hash: '93f0d2cd75a9946cc429b26795a7debe33e77219af541c30c2960d5b7741fff3'
                }, {
                    document: GetCommunityNameDocument,
                    get rawSDL() {
                        return printWithCache(GetCommunityNameDocument);
                    },
                    location: 'GetCommunityNameDocument.graphql',
                    sha256Hash: '93f0d2cd75a9946cc429b26795a7debe33e77219af541c30c2960d5b7741fff3'
                }, {
                    document: GetPoolTitleDocument,
                    get rawSDL() {
                        return printWithCache(GetPoolTitleDocument);
                    },
                    location: 'GetPoolTitleDocument.graphql',
                    sha256Hash: '93f0d2cd75a9946cc429b26795a7debe33e77219af541c30c2960d5b7741fff3'
                }, {
                    document: GetProposalTitleDocument,
                    get rawSDL() {
                        return printWithCache(GetProposalTitleDocument);
                    },
                    location: 'GetProposalTitleDocument.graphql',
                    sha256Hash: '93f0d2cd75a9946cc429b26795a7debe33e77219af541c30c2960d5b7741fff3'
                }
            ];
        },
        fetchFn,
    };
}
export function createBuiltMeshHTTPHandler() {
    return createMeshHTTPHandler({
        baseDir,
        getBuiltMesh: getBuiltGraphClient,
        rawServeConfig: undefined,
    });
}
let meshInstance$;
export const pollingInterval = null;
export function getBuiltGraphClient() {
    if (meshInstance$ == null) {
        if (pollingInterval) {
            setInterval(() => {
                getMeshOptions()
                    .then(meshOptions => getMesh(meshOptions))
                    .then(newMesh => meshInstance$.then(oldMesh => {
                    oldMesh.destroy();
                    meshInstance$ = Promise.resolve(newMesh);
                })).catch(err => {
                    console.error("Mesh polling failed so the existing version will be used:", err);
                });
            }, pollingInterval);
        }
        meshInstance$ = getMeshOptions().then(meshOptions => getMesh(meshOptions)).then(mesh => {
            const id = mesh.pubsub.subscribe('destroy', () => {
                meshInstance$ = undefined;
                mesh.pubsub.unsubscribe(id);
            });
            return mesh;
        });
    }
    return meshInstance$;
}
export const execute = (...args) => getBuiltGraphClient().then(({ execute }) => execute(...args));
export const subscribe = (...args) => getBuiltGraphClient().then(({ subscribe }) => subscribe(...args));
export function getBuiltGraphSDK(globalContext) {
    const sdkRequester$ = getBuiltGraphClient().then(({ sdkRequesterFactory }) => sdkRequesterFactory(globalContext));
    return getSdk((...args) => sdkRequester$.then(sdkRequester => sdkRequester(...args)));
}
export const getFactoriesDocument = gql `
    query getFactories {
  registryFactories(first: 1000) {
    id
    registryCommunities(first: 1000) {
      id
      chainId
      isValid
      communityName
      covenantIpfsHash
      covenant {
        text
      }
      registerToken
      alloAddress
      members(first: 1000) {
        memberAddress
      }
      strategies(first: 1000) {
        id
        poolId
        isEnabled
        config {
          id
          decay
          maxRatio
          weight
          minThresholdPoints
        }
      }
      membersCount
    }
  }
}
    `;
export const getTokenGardensDocument = gql `
    query getTokenGardens {
  tokenGardens(first: 1000) {
    id
    chainId
    name
    symbol
    decimals
    totalBalance
    communities(first: 1000) {
      id
      chainId
      covenantIpfsHash
      covenant {
        text
      }
      communityFee
      isValid
      communityName
      strategies(first: 1000) {
        id
      }
      members(first: 1000) {
        id
        memberAddress
      }
    }
  }
}
    `;
export const getMembersStrategyDocument = gql `
    query getMembersStrategy($strategyId: String!) {
  memberStrategies(first: 1000, where: {strategy: $strategyId}) {
    activatedPoints
    member {
      memberCommunity {
        memberAddress
        isRegistered
      }
      stakes(
        first: 1000
        where: {proposal_: {strategy: $strategyId, proposalStatus_in: [1, 5]}}
      ) {
        amount
        proposal {
          proposalStatus
        }
      }
    }
    totalStakedPoints
    id
  }
}
    `;
export const getMemberStrategyDocument = gql `
    query getMemberStrategy($member_strategy: ID!) {
  memberStrategy(id: $member_strategy) {
    id
    totalStakedPoints
    activatedPoints
    strategy {
      id
    }
    member {
      id
    }
  }
}
    `;
export const isMemberDocument = gql `
    query isMember($me: ID!, $comm: String!) {
  member(id: $me) {
    id
    stakes(first: 1000) {
      id
      amount
      proposal {
        id
        proposalNumber
        stakedAmount
        proposalStatus
        strategy {
          id
          poolId
          registryCommunity {
            id
            isValid
            garden {
              id
              symbol
              decimals
            }
          }
        }
      }
    }
    memberCommunity(first: 1000, where: {registryCommunity_contains: $comm}) {
      stakedTokens
      isRegistered
      registryCommunity {
        id
      }
    }
  }
}
    `;
export const getMemberDocument = gql `
    query getMember($me: ID!) {
  member(id: $me) {
    id
    memberCommunity(first: 1000) {
      id
      stakedTokens
      isRegistered
      registryCommunity {
        id
        isValid
      }
    }
    stakes(first: 1000) {
      id
      proposal {
        proposalNumber
        id
      }
      amount
      createdAt
    }
  }
}
    `;
export const getPoolCreationDataDocument = gql `
    query getPoolCreationData($communityAddr: ID!) {
  allos(first: 1000) {
    id
  }
  registryCommunity(id: $communityAddr) {
    communityName
    isValid
    garden {
      id
      symbol
      decimals
    }
  }
}
    `;
export const getProposalSupportersDocument = gql `
    query getProposalSupporters($proposalId: String!) {
  members(first: 1000) {
    id
    stakes(where: {proposal: $proposalId}, first: 1000) {
      amount
      proposal {
        proposalNumber
        id
      }
    }
  }
}
    `;
export const getGardenCommunitiesDocument = gql `
    query getGardenCommunities($chainId: BigInt!, $tokenGarden: ID!) {
  registryCommunities(
    first: 1000
    where: {chainId: $chainId, garden_: {id: $tokenGarden}}
  ) {
    id
    garden {
      id
    }
    chainId
    isValid
    covenantIpfsHash
    covenant {
      text
    }
    communityName
    protocolFee
    communityFee
    registerToken
    registerStakeAmount
    alloAddress
    members(first: 1000, where: {stakedTokens_gt: "0"}) {
      id
      memberAddress
    }
    strategies(first: 1000, where: {isEnabled: true}) {
      id
      totalEffectiveActivePoints
      poolId
    }
    membersCount
  }
}
    `;
export const getCommunitiesDocument = gql `
    query getCommunities {
  registryCommunities(first: 1000, where: {isValid: true}) {
    id
    councilSafe
    communityName
    archived
    garden {
      address
      chainId
      symbol
      name
      decimals
    }
    strategies(first: 1000, where: {isEnabled: true}) {
      id
      totalEffectiveActivePoints
      poolId
      proposals(first: 1000, where: {proposalStatus: 1}) {
        id
        proposalStatus
      }
    }
    members(first: 1000, where: {stakedTokens_gt: "0"}) {
      id
      memberAddress
      stakedTokens
    }
    membersCount
  }
}
    `;
export const getCommunityDocument = gql `
    query getCommunity($communityAddr: ID!) {
  registryCommunity(id: $communityAddr) {
    communityName
    id
    archived
    members(
      first: 1000
      where: {stakedTokens_gt: "0"}
      orderBy: stakedTokens
      orderDirection: desc
    ) {
      memberAddress
      stakedTokens
    }
    strategies(first: 1000, orderBy: poolId, orderDirection: desc) {
      id
      proposals(first: 1000) {
        id
        proposalStatus
      }
      archived
      isEnabled
      poolId
      token
      metadataHash
      metadata {
        title
        description
      }
      config {
        proposalType
        pointSystem
      }
    }
    covenantIpfsHash
    covenant {
      text
    }
    communityFee
    protocolFee
    registerStakeAmount
    registerToken
    councilSafe
    membersCount
    garden {
      id
      symbol
      decimals
      address
      chainId
    }
  }
}
    `;
export const getCommunityCreationDataDocument = gql `
    query getCommunityCreationData {
  registryFactories(first: 1000) {
    id
  }
}
    `;
export const getRegistryFactoryDataDocument = gql `
    query getRegistryFactoryData {
  registryFactories(first: 1000) {
    id
    chainId
  }
}
    `;
export const getPoolDataDocument = gql `
    query getPoolData($strategyId: ID!) {
  allos(first: 1000) {
    id
    chainId
    tokenNative
  }
  cvstrategies(first: 1000, where: {id: $strategyId}) {
    token
    metadataHash
    metadata {
      title
      description
    }
    id
    poolId
    totalEffectiveActivePoints
    isEnabled
    maxCVSupply
    archived
    sybil {
      id
      type
    }
    memberActive(first: 1000) {
      id
    }
    config {
      id
      weight
      decay
      maxAmount
      maxRatio
      minThresholdPoints
      pointSystem
      proposalType
      allowlist
      superfluidToken
    }
    registryCommunity {
      id
      councilSafe
      isValid
      garden {
        id
        symbol
        decimals
        address
        chainId
      }
      members(first: 1000) {
        memberAddress
      }
    }
    proposals(first: 1000, orderBy: convictionLast, orderDirection: desc) {
      id
      proposalNumber
      metadataHash
      metadata {
        title
        description
      }
      beneficiary
      requestedAmount
      requestedToken
      proposalStatus
      stakedAmount
      convictionLast
      createdAt
      executedAt
      blockLast
      submitter
      strategy {
        id
        maxCVSupply
        totalEffectiveActivePoints
      }
    }
  }
  arbitrableConfigs(
    first: 1
    orderBy: version
    orderDirection: desc
    where: {strategy_: {id: $strategyId}}
  ) {
    submitterCollateralAmount
    challengerCollateralAmount
    arbitrator
    defaultRuling
    defaultRulingTimeout
    tribunalSafe
  }
}
    `;
export const getProposalDataDocument = gql `
    query getProposalData($proposalId: ID!, $communityId: ID!) {
  allos(first: 1000) {
    id
    chainId
    tokenNative
  }
  registryCommunity(id: $communityId) {
    councilSafe
  }
  cvproposal(id: $proposalId) {
    id
    proposalNumber
    beneficiary
    blockLast
    convictionLast
    createdAt
    metadataHash
    metadata {
      title
      description
    }
    proposalStatus
    requestedAmount
    requestedToken
    stakedAmount
    submitter
    updatedAt
    executedAt
    version
    strategy {
      id
      token
      maxCVSupply
      totalEffectiveActivePoints
      poolId
      isEnabled
      registryCommunity {
        id
        councilSafe
        isValid
        garden {
          id
          symbol
          decimals
          address
          chainId
        }
        members(first: 1000) {
          memberAddress
        }
      }
      config {
        proposalType
        pointSystem
        minThresholdPoints
        decay
        weight
        maxRatio
        maxAmount
        allowlist
        superfluidToken
      }
    }
    arbitrableConfig {
      arbitrator
      defaultRuling
      defaultRulingTimeout
      challengerCollateralAmount
      submitterCollateralAmount
      tribunalSafe
    }
  }
}
    `;
export const getAlloDocument = gql `
    query getAllo {
  allos(first: 1000) {
    id
    chainId
    tokenNative
  }
}
    `;
export const getStrategyByPoolDocument = gql `
    query getStrategyByPool($poolId: BigInt!) {
  cvstrategies(first: 1000, where: {poolId: $poolId}) {
    id
    poolId
    totalEffectiveActivePoints
    isEnabled
    archived
    config {
      id
      proposalType
      pointSystem
      minThresholdPoints
    }
    memberActive(first: 1000) {
      id
    }
    registryCommunity {
      id
      isValid
      garden {
        id
        symbol
        decimals
      }
    }
    proposals(first: 1000) {
      id
      proposalNumber
      metadataHash
      metadata {
        title
        description
      }
      beneficiary
      requestedAmount
      requestedToken
      proposalStatus
      stakedAmount
    }
  }
}
    `;
export const getTokenTitleDocument = gql `
    query getTokenTitle($tokenAddr: ID!) {
  tokenGarden(id: $tokenAddr) {
    name
  }
}
    `;
export const getCommunityTitlesDocument = gql `
    query getCommunityTitles($communityAddr: ID!) {
  registryCommunity(id: $communityAddr) {
    communityName
    garden {
      name
      id
    }
  }
}
    `;
export const getPoolTitlesDocument = gql `
    query getPoolTitles($strategyId: ID!) {
  cvstrategies(first: 1000, where: {id: $strategyId}) {
    poolId
    metadataHash
    metadata {
      title
      description
    }
    registryCommunity {
      communityName
      garden {
        name
      }
    }
  }
}
    `;
export const getProposalTitlesDocument = gql `
    query getProposalTitles($proposalId: ID!) {
  cvproposal(id: $proposalId) {
    proposalNumber
    metadataHash
    metadata {
      title
      description
    }
    strategy {
      poolId
      metadataHash
      metadata {
        title
        description
      }
      registryCommunity {
        communityName
        garden {
          name
        }
      }
    }
  }
}
    `;
export const getPassportStrategyDocument = gql `
    query getPassportStrategy($strategyId: ID!) {
  passportStrategy(id: $strategyId) {
    id
    passportScorer {
      id
      type
    }
    threshold
    councilSafe
    active
  }
}
    `;
export const getPassportUserDocument = gql `
    query getPassportUser($userId: ID!) {
  passportUser(id: $userId) {
    id
    userAddress
    score
    lastUpdated
  }
}
    `;
export const getGoodDollarStrategyDocument = gql `
    query getGoodDollarStrategy($strategyId: ID!) {
  goodDollarStrategy(id: $strategyId) {
    id
    sybilProtection {
      id
      type
    }
    councilSafe
    active
  }
}
    `;
export const getGoodDollarUserDocument = gql `
    query getGoodDollarUser($userId: ID!) {
  goodDollarUser(id: $userId) {
    id
    userAddress
    verified
    lastUpdated
  }
}
    `;
export const getProposalDisputesDocument = gql `
    query getProposalDisputes($proposalId: ID!) {
  proposalDisputes(first: 1000, where: {proposal_: {id: $proposalId}}) {
    id
    disputeId
    status
    challenger
    context
    metadata {
      id
      reason
    }
    createdAt
    ruledAt
    rulingOutcome
  }
}
    `;
export const getArbitrableConfigsDocument = gql `
    query getArbitrableConfigs($strategyId: String!) {
  arbitrableConfigs(first: 1000, where: {strategy: $strategyId}) {
    arbitrator
    challengerCollateralAmount
    submitterCollateralAmount
    tribunalSafe
    defaultRuling
    defaultRulingTimeout
  }
}
    `;
export const getMemberPassportAndCommunitiesDocument = gql `
    query getMemberPassportAndCommunities($memberId: ID!) {
  member(id: $memberId) {
    memberCommunity(first: 1000) {
      id
    }
  }
  passportUser(id: $memberId) {
    lastUpdated
    score
  }
}
    `;
export const getCommunityNameDocument = gql `
    query getCommunityName($communityAddr: ID!) {
  registryCommunity(id: $communityAddr) {
    communityName
    garden {
      id
    }
  }
}
    `;
export const getPoolTitleDocument = gql `
    query getPoolTitle($strategyId: ID!) {
  cvstrategies(first: 1, where: {id: $strategyId}) {
    metadata {
      title
    }
    archived
    isEnabled
    config {
      proposalType
    }
    registryCommunity {
      communityName
    }
  }
}
    `;
export const getProposalTitleDocument = gql `
    query getProposalTitle($proposalId: ID!) {
  cvproposal(id: $proposalId) {
    metadata {
      title
    }
    proposalStatus
    strategy {
      metadata {
        title
      }
      registryCommunity {
        communityName
      }
      config {
        proposalType
      }
    }
  }
}
    `;
export function getSdk(requester) {
    return {
        getFactories(variables, options) {
            return requester(getFactoriesDocument, variables, options);
        },
        getTokenGardens(variables, options) {
            return requester(getTokenGardensDocument, variables, options);
        },
        getMembersStrategy(variables, options) {
            return requester(getMembersStrategyDocument, variables, options);
        },
        getMemberStrategy(variables, options) {
            return requester(getMemberStrategyDocument, variables, options);
        },
        isMember(variables, options) {
            return requester(isMemberDocument, variables, options);
        },
        getMember(variables, options) {
            return requester(getMemberDocument, variables, options);
        },
        getPoolCreationData(variables, options) {
            return requester(getPoolCreationDataDocument, variables, options);
        },
        getProposalSupporters(variables, options) {
            return requester(getProposalSupportersDocument, variables, options);
        },
        getGardenCommunities(variables, options) {
            return requester(getGardenCommunitiesDocument, variables, options);
        },
        getCommunities(variables, options) {
            return requester(getCommunitiesDocument, variables, options);
        },
        getCommunity(variables, options) {
            return requester(getCommunityDocument, variables, options);
        },
        getCommunityCreationData(variables, options) {
            return requester(getCommunityCreationDataDocument, variables, options);
        },
        getRegistryFactoryData(variables, options) {
            return requester(getRegistryFactoryDataDocument, variables, options);
        },
        getPoolData(variables, options) {
            return requester(getPoolDataDocument, variables, options);
        },
        getProposalData(variables, options) {
            return requester(getProposalDataDocument, variables, options);
        },
        getAllo(variables, options) {
            return requester(getAlloDocument, variables, options);
        },
        getStrategyByPool(variables, options) {
            return requester(getStrategyByPoolDocument, variables, options);
        },
        getTokenTitle(variables, options) {
            return requester(getTokenTitleDocument, variables, options);
        },
        getCommunityTitles(variables, options) {
            return requester(getCommunityTitlesDocument, variables, options);
        },
        getPoolTitles(variables, options) {
            return requester(getPoolTitlesDocument, variables, options);
        },
        getProposalTitles(variables, options) {
            return requester(getProposalTitlesDocument, variables, options);
        },
        getPassportStrategy(variables, options) {
            return requester(getPassportStrategyDocument, variables, options);
        },
        getPassportUser(variables, options) {
            return requester(getPassportUserDocument, variables, options);
        },
        getGoodDollarStrategy(variables, options) {
            return requester(getGoodDollarStrategyDocument, variables, options);
        },
        getGoodDollarUser(variables, options) {
            return requester(getGoodDollarUserDocument, variables, options);
        },
        getProposalDisputes(variables, options) {
            return requester(getProposalDisputesDocument, variables, options);
        },
        getArbitrableConfigs(variables, options) {
            return requester(getArbitrableConfigsDocument, variables, options);
        },
        getMemberPassportAndCommunities(variables, options) {
            return requester(getMemberPassportAndCommunitiesDocument, variables, options);
        },
        getCommunityName(variables, options) {
            return requester(getCommunityNameDocument, variables, options);
        },
        getPoolTitle(variables, options) {
            return requester(getPoolTitleDocument, variables, options);
        },
        getProposalTitle(variables, options) {
            return requester(getProposalTitleDocument, variables, options);
        }
    };
}
