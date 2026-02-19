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
        config: { "endpoint": "https://api.studio.thegraph.com/query/70985/gardens-v-2-sepolia/version/latest" },
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
        "0dad7d30121dc9094a2730e79f82879dda30e324165116a889c82cced7b94801": GetFactoriesDocument,
        "0dad7d30121dc9094a2730e79f82879dda30e324165116a889c82cced7b94801": GetTokenGardensDocument,
        "0dad7d30121dc9094a2730e79f82879dda30e324165116a889c82cced7b94801": GetMembersStrategyDocument,
        "0dad7d30121dc9094a2730e79f82879dda30e324165116a889c82cced7b94801": GetMemberStrategyDocument,
        "0dad7d30121dc9094a2730e79f82879dda30e324165116a889c82cced7b94801": IsMemberDocument,
        "0dad7d30121dc9094a2730e79f82879dda30e324165116a889c82cced7b94801": GetMemberDocument,
        "0dad7d30121dc9094a2730e79f82879dda30e324165116a889c82cced7b94801": GetPoolCreationDataDocument,
        "0dad7d30121dc9094a2730e79f82879dda30e324165116a889c82cced7b94801": GetProposalSupportersDocument,
        "0dad7d30121dc9094a2730e79f82879dda30e324165116a889c82cced7b94801": GetGardenCommunitiesDocument,
        "0dad7d30121dc9094a2730e79f82879dda30e324165116a889c82cced7b94801": GetCommunitiesDocument,
        "0dad7d30121dc9094a2730e79f82879dda30e324165116a889c82cced7b94801": GetCommunityDocument,
        "0dad7d30121dc9094a2730e79f82879dda30e324165116a889c82cced7b94801": GetCommunityCreationDataDocument,
        "0dad7d30121dc9094a2730e79f82879dda30e324165116a889c82cced7b94801": GetRegistryFactoryDataDocument,
        "0dad7d30121dc9094a2730e79f82879dda30e324165116a889c82cced7b94801": GetPoolDataDocument,
        "0dad7d30121dc9094a2730e79f82879dda30e324165116a889c82cced7b94801": GetProposalDataDocument,
        "0dad7d30121dc9094a2730e79f82879dda30e324165116a889c82cced7b94801": GetAlloDocument,
        "0dad7d30121dc9094a2730e79f82879dda30e324165116a889c82cced7b94801": GetStrategyByPoolDocument,
        "0dad7d30121dc9094a2730e79f82879dda30e324165116a889c82cced7b94801": GetTokenTitleDocument,
        "0dad7d30121dc9094a2730e79f82879dda30e324165116a889c82cced7b94801": GetCommunityTitlesDocument,
        "0dad7d30121dc9094a2730e79f82879dda30e324165116a889c82cced7b94801": GetPoolTitlesDocument,
        "0dad7d30121dc9094a2730e79f82879dda30e324165116a889c82cced7b94801": GetProposalTitlesDocument,
        "0dad7d30121dc9094a2730e79f82879dda30e324165116a889c82cced7b94801": GetPassportStrategyDocument,
        "0dad7d30121dc9094a2730e79f82879dda30e324165116a889c82cced7b94801": GetPassportUserDocument,
        "0dad7d30121dc9094a2730e79f82879dda30e324165116a889c82cced7b94801": GetGoodDollarStrategyDocument,
        "0dad7d30121dc9094a2730e79f82879dda30e324165116a889c82cced7b94801": GetGoodDollarUserDocument,
        "0dad7d30121dc9094a2730e79f82879dda30e324165116a889c82cced7b94801": GetProposalDisputesDocument,
        "0dad7d30121dc9094a2730e79f82879dda30e324165116a889c82cced7b94801": GetArbitrableConfigsDocument,
        "0dad7d30121dc9094a2730e79f82879dda30e324165116a889c82cced7b94801": GetMemberPassportAndCommunitiesDocument,
        "0dad7d30121dc9094a2730e79f82879dda30e324165116a889c82cced7b94801": GetCommunityNameDocument,
        "0dad7d30121dc9094a2730e79f82879dda30e324165116a889c82cced7b94801": GetPoolTitleDocument,
        "0dad7d30121dc9094a2730e79f82879dda30e324165116a889c82cced7b94801": GetProposalTitleDocument
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
                    sha256Hash: '0dad7d30121dc9094a2730e79f82879dda30e324165116a889c82cced7b94801'
                }, {
                    document: GetTokenGardensDocument,
                    get rawSDL() {
                        return printWithCache(GetTokenGardensDocument);
                    },
                    location: 'GetTokenGardensDocument.graphql',
                    sha256Hash: '0dad7d30121dc9094a2730e79f82879dda30e324165116a889c82cced7b94801'
                }, {
                    document: GetMembersStrategyDocument,
                    get rawSDL() {
                        return printWithCache(GetMembersStrategyDocument);
                    },
                    location: 'GetMembersStrategyDocument.graphql',
                    sha256Hash: '0dad7d30121dc9094a2730e79f82879dda30e324165116a889c82cced7b94801'
                }, {
                    document: GetMemberStrategyDocument,
                    get rawSDL() {
                        return printWithCache(GetMemberStrategyDocument);
                    },
                    location: 'GetMemberStrategyDocument.graphql',
                    sha256Hash: '0dad7d30121dc9094a2730e79f82879dda30e324165116a889c82cced7b94801'
                }, {
                    document: IsMemberDocument,
                    get rawSDL() {
                        return printWithCache(IsMemberDocument);
                    },
                    location: 'IsMemberDocument.graphql',
                    sha256Hash: '0dad7d30121dc9094a2730e79f82879dda30e324165116a889c82cced7b94801'
                }, {
                    document: GetMemberDocument,
                    get rawSDL() {
                        return printWithCache(GetMemberDocument);
                    },
                    location: 'GetMemberDocument.graphql',
                    sha256Hash: '0dad7d30121dc9094a2730e79f82879dda30e324165116a889c82cced7b94801'
                }, {
                    document: GetPoolCreationDataDocument,
                    get rawSDL() {
                        return printWithCache(GetPoolCreationDataDocument);
                    },
                    location: 'GetPoolCreationDataDocument.graphql',
                    sha256Hash: '0dad7d30121dc9094a2730e79f82879dda30e324165116a889c82cced7b94801'
                }, {
                    document: GetProposalSupportersDocument,
                    get rawSDL() {
                        return printWithCache(GetProposalSupportersDocument);
                    },
                    location: 'GetProposalSupportersDocument.graphql',
                    sha256Hash: '0dad7d30121dc9094a2730e79f82879dda30e324165116a889c82cced7b94801'
                }, {
                    document: GetGardenCommunitiesDocument,
                    get rawSDL() {
                        return printWithCache(GetGardenCommunitiesDocument);
                    },
                    location: 'GetGardenCommunitiesDocument.graphql',
                    sha256Hash: '0dad7d30121dc9094a2730e79f82879dda30e324165116a889c82cced7b94801'
                }, {
                    document: GetCommunitiesDocument,
                    get rawSDL() {
                        return printWithCache(GetCommunitiesDocument);
                    },
                    location: 'GetCommunitiesDocument.graphql',
                    sha256Hash: '0dad7d30121dc9094a2730e79f82879dda30e324165116a889c82cced7b94801'
                }, {
                    document: GetCommunityDocument,
                    get rawSDL() {
                        return printWithCache(GetCommunityDocument);
                    },
                    location: 'GetCommunityDocument.graphql',
                    sha256Hash: '0dad7d30121dc9094a2730e79f82879dda30e324165116a889c82cced7b94801'
                }, {
                    document: GetCommunityCreationDataDocument,
                    get rawSDL() {
                        return printWithCache(GetCommunityCreationDataDocument);
                    },
                    location: 'GetCommunityCreationDataDocument.graphql',
                    sha256Hash: '0dad7d30121dc9094a2730e79f82879dda30e324165116a889c82cced7b94801'
                }, {
                    document: GetRegistryFactoryDataDocument,
                    get rawSDL() {
                        return printWithCache(GetRegistryFactoryDataDocument);
                    },
                    location: 'GetRegistryFactoryDataDocument.graphql',
                    sha256Hash: '0dad7d30121dc9094a2730e79f82879dda30e324165116a889c82cced7b94801'
                }, {
                    document: GetPoolDataDocument,
                    get rawSDL() {
                        return printWithCache(GetPoolDataDocument);
                    },
                    location: 'GetPoolDataDocument.graphql',
                    sha256Hash: '0dad7d30121dc9094a2730e79f82879dda30e324165116a889c82cced7b94801'
                }, {
                    document: GetProposalDataDocument,
                    get rawSDL() {
                        return printWithCache(GetProposalDataDocument);
                    },
                    location: 'GetProposalDataDocument.graphql',
                    sha256Hash: '0dad7d30121dc9094a2730e79f82879dda30e324165116a889c82cced7b94801'
                }, {
                    document: GetAlloDocument,
                    get rawSDL() {
                        return printWithCache(GetAlloDocument);
                    },
                    location: 'GetAlloDocument.graphql',
                    sha256Hash: '0dad7d30121dc9094a2730e79f82879dda30e324165116a889c82cced7b94801'
                }, {
                    document: GetStrategyByPoolDocument,
                    get rawSDL() {
                        return printWithCache(GetStrategyByPoolDocument);
                    },
                    location: 'GetStrategyByPoolDocument.graphql',
                    sha256Hash: '0dad7d30121dc9094a2730e79f82879dda30e324165116a889c82cced7b94801'
                }, {
                    document: GetTokenTitleDocument,
                    get rawSDL() {
                        return printWithCache(GetTokenTitleDocument);
                    },
                    location: 'GetTokenTitleDocument.graphql',
                    sha256Hash: '0dad7d30121dc9094a2730e79f82879dda30e324165116a889c82cced7b94801'
                }, {
                    document: GetCommunityTitlesDocument,
                    get rawSDL() {
                        return printWithCache(GetCommunityTitlesDocument);
                    },
                    location: 'GetCommunityTitlesDocument.graphql',
                    sha256Hash: '0dad7d30121dc9094a2730e79f82879dda30e324165116a889c82cced7b94801'
                }, {
                    document: GetPoolTitlesDocument,
                    get rawSDL() {
                        return printWithCache(GetPoolTitlesDocument);
                    },
                    location: 'GetPoolTitlesDocument.graphql',
                    sha256Hash: '0dad7d30121dc9094a2730e79f82879dda30e324165116a889c82cced7b94801'
                }, {
                    document: GetProposalTitlesDocument,
                    get rawSDL() {
                        return printWithCache(GetProposalTitlesDocument);
                    },
                    location: 'GetProposalTitlesDocument.graphql',
                    sha256Hash: '0dad7d30121dc9094a2730e79f82879dda30e324165116a889c82cced7b94801'
                }, {
                    document: GetPassportStrategyDocument,
                    get rawSDL() {
                        return printWithCache(GetPassportStrategyDocument);
                    },
                    location: 'GetPassportStrategyDocument.graphql',
                    sha256Hash: '0dad7d30121dc9094a2730e79f82879dda30e324165116a889c82cced7b94801'
                }, {
                    document: GetPassportUserDocument,
                    get rawSDL() {
                        return printWithCache(GetPassportUserDocument);
                    },
                    location: 'GetPassportUserDocument.graphql',
                    sha256Hash: '0dad7d30121dc9094a2730e79f82879dda30e324165116a889c82cced7b94801'
                }, {
                    document: GetGoodDollarStrategyDocument,
                    get rawSDL() {
                        return printWithCache(GetGoodDollarStrategyDocument);
                    },
                    location: 'GetGoodDollarStrategyDocument.graphql',
                    sha256Hash: '0dad7d30121dc9094a2730e79f82879dda30e324165116a889c82cced7b94801'
                }, {
                    document: GetGoodDollarUserDocument,
                    get rawSDL() {
                        return printWithCache(GetGoodDollarUserDocument);
                    },
                    location: 'GetGoodDollarUserDocument.graphql',
                    sha256Hash: '0dad7d30121dc9094a2730e79f82879dda30e324165116a889c82cced7b94801'
                }, {
                    document: GetProposalDisputesDocument,
                    get rawSDL() {
                        return printWithCache(GetProposalDisputesDocument);
                    },
                    location: 'GetProposalDisputesDocument.graphql',
                    sha256Hash: '0dad7d30121dc9094a2730e79f82879dda30e324165116a889c82cced7b94801'
                }, {
                    document: GetArbitrableConfigsDocument,
                    get rawSDL() {
                        return printWithCache(GetArbitrableConfigsDocument);
                    },
                    location: 'GetArbitrableConfigsDocument.graphql',
                    sha256Hash: '0dad7d30121dc9094a2730e79f82879dda30e324165116a889c82cced7b94801'
                }, {
                    document: GetMemberPassportAndCommunitiesDocument,
                    get rawSDL() {
                        return printWithCache(GetMemberPassportAndCommunitiesDocument);
                    },
                    location: 'GetMemberPassportAndCommunitiesDocument.graphql',
                    sha256Hash: '0dad7d30121dc9094a2730e79f82879dda30e324165116a889c82cced7b94801'
                }, {
                    document: GetCommunityNameDocument,
                    get rawSDL() {
                        return printWithCache(GetCommunityNameDocument);
                    },
                    location: 'GetCommunityNameDocument.graphql',
                    sha256Hash: '0dad7d30121dc9094a2730e79f82879dda30e324165116a889c82cced7b94801'
                }, {
                    document: GetPoolTitleDocument,
                    get rawSDL() {
                        return printWithCache(GetPoolTitleDocument);
                    },
                    location: 'GetPoolTitleDocument.graphql',
                    sha256Hash: '0dad7d30121dc9094a2730e79f82879dda30e324165116a889c82cced7b94801'
                }, {
                    document: GetProposalTitleDocument,
                    get rawSDL() {
                        return printWithCache(GetProposalTitleDocument);
                    },
                    location: 'GetProposalTitleDocument.graphql',
                    sha256Hash: '0dad7d30121dc9094a2730e79f82879dda30e324165116a889c82cced7b94801'
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
    query getPoolCreationData($communityAddr: ID!, $tokenAddr: ID!) {
  tokenGarden(id: $tokenAddr) {
    decimals
    id
    symbol
  }
  allos(first: 1000) {
    id
  }
  registryCommunity(id: $communityAddr) {
    communityName
    isValid
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
    query getCommunity($communityAddr: ID!, $tokenAddr: ID!) {
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
      proposals(first: 1000) {
        id
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
  }
  tokenGarden(id: $tokenAddr) {
    symbol
    decimals
    id
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
    query getPoolData($garden: ID!, $poolId: BigInt!) {
  allos(first: 1000) {
    id
    chainId
    tokenNative
  }
  tokenGarden(id: $garden) {
    address
    name
    symbol
    description
    totalBalance
    ipfsCovenant
    decimals
  }
  cvstrategies(first: 1000, where: {poolId: $poolId}) {
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
    stream {
      id
      contractAddress
      contractType
      superfluidToken
      maxFlowRate
      superfluidGDA
      streamLastFlowRate
      createdAt
      updatedAt
    }
    registryCommunity {
      id
      councilSafe
      isValid
      garden {
        id
        symbol
        decimals
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
    where: {strategy_: {poolId: $poolId}}
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
    query getProposalData($garden: ID!, $proposalId: ID!, $communityId: ID!) {
  allos(first: 1000) {
    id
    chainId
    tokenNative
  }
  tokenGarden(id: $garden) {
    name
    symbol
    decimals
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
    }
  }
}
    `;
export const getPoolTitlesDocument = gql `
    query getPoolTitles($poolId: BigInt!) {
  cvstrategies(first: 1000, where: {poolId: $poolId}) {
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
  }
}
    `;
export const getPoolTitleDocument = gql `
    query getPoolTitle($poolId: BigInt!) {
  cvstrategies(first: 1, where: {poolId: $poolId}) {
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
