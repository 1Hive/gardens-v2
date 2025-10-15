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
        config: { "endpoint": "https://api.studio.thegraph.com/query/70985/gardens-v2---arbitrum-sepolia/0.6.10" },
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
        "9d6660fc8442df1ba6214712aeef98ce546d286314ac0ed3ced2a20d05d84b1b": GetFactoriesDocument,
        "9d6660fc8442df1ba6214712aeef98ce546d286314ac0ed3ced2a20d05d84b1b": GetTokenGardensDocument,
        "9d6660fc8442df1ba6214712aeef98ce546d286314ac0ed3ced2a20d05d84b1b": GetMembersStrategyDocument,
        "9d6660fc8442df1ba6214712aeef98ce546d286314ac0ed3ced2a20d05d84b1b": GetMemberStrategyDocument,
        "9d6660fc8442df1ba6214712aeef98ce546d286314ac0ed3ced2a20d05d84b1b": IsMemberDocument,
        "9d6660fc8442df1ba6214712aeef98ce546d286314ac0ed3ced2a20d05d84b1b": GetMemberDocument,
        "9d6660fc8442df1ba6214712aeef98ce546d286314ac0ed3ced2a20d05d84b1b": GetPoolCreationDataDocument,
        "9d6660fc8442df1ba6214712aeef98ce546d286314ac0ed3ced2a20d05d84b1b": GetProposalSupportersDocument,
        "9d6660fc8442df1ba6214712aeef98ce546d286314ac0ed3ced2a20d05d84b1b": GetGardenCommunitiesDocument,
        "9d6660fc8442df1ba6214712aeef98ce546d286314ac0ed3ced2a20d05d84b1b": GetCommunitiesDocument,
        "9d6660fc8442df1ba6214712aeef98ce546d286314ac0ed3ced2a20d05d84b1b": GetCommunityDocument,
        "9d6660fc8442df1ba6214712aeef98ce546d286314ac0ed3ced2a20d05d84b1b": GetCommunityCreationDataDocument,
        "9d6660fc8442df1ba6214712aeef98ce546d286314ac0ed3ced2a20d05d84b1b": GetRegistryFactoryDataDocument,
        "9d6660fc8442df1ba6214712aeef98ce546d286314ac0ed3ced2a20d05d84b1b": GetPoolDataDocument,
        "9d6660fc8442df1ba6214712aeef98ce546d286314ac0ed3ced2a20d05d84b1b": GetProposalDataDocument,
        "9d6660fc8442df1ba6214712aeef98ce546d286314ac0ed3ced2a20d05d84b1b": GetAlloDocument,
        "9d6660fc8442df1ba6214712aeef98ce546d286314ac0ed3ced2a20d05d84b1b": GetStrategyByPoolDocument,
        "9d6660fc8442df1ba6214712aeef98ce546d286314ac0ed3ced2a20d05d84b1b": GetTokenTitleDocument,
        "9d6660fc8442df1ba6214712aeef98ce546d286314ac0ed3ced2a20d05d84b1b": GetCommunityTitlesDocument,
        "9d6660fc8442df1ba6214712aeef98ce546d286314ac0ed3ced2a20d05d84b1b": GetPoolTitlesDocument,
        "9d6660fc8442df1ba6214712aeef98ce546d286314ac0ed3ced2a20d05d84b1b": GetProposalTitlesDocument,
        "9d6660fc8442df1ba6214712aeef98ce546d286314ac0ed3ced2a20d05d84b1b": GetPassportStrategyDocument,
        "9d6660fc8442df1ba6214712aeef98ce546d286314ac0ed3ced2a20d05d84b1b": GetPassportUserDocument,
        "9d6660fc8442df1ba6214712aeef98ce546d286314ac0ed3ced2a20d05d84b1b": GetGoodDollarStrategyDocument,
        "9d6660fc8442df1ba6214712aeef98ce546d286314ac0ed3ced2a20d05d84b1b": GetGoodDollarUserDocument,
        "9d6660fc8442df1ba6214712aeef98ce546d286314ac0ed3ced2a20d05d84b1b": GetProposalDisputesDocument,
        "9d6660fc8442df1ba6214712aeef98ce546d286314ac0ed3ced2a20d05d84b1b": GetArbitrableConfigsDocument,
        "9d6660fc8442df1ba6214712aeef98ce546d286314ac0ed3ced2a20d05d84b1b": GetMemberPassportAndCommunitiesDocument,
        "9d6660fc8442df1ba6214712aeef98ce546d286314ac0ed3ced2a20d05d84b1b": GetCommunityNameDocument,
        "9d6660fc8442df1ba6214712aeef98ce546d286314ac0ed3ced2a20d05d84b1b": GetPoolTitleDocument,
        "9d6660fc8442df1ba6214712aeef98ce546d286314ac0ed3ced2a20d05d84b1b": GetProposalTitleDocument
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
                    sha256Hash: '9d6660fc8442df1ba6214712aeef98ce546d286314ac0ed3ced2a20d05d84b1b'
                }, {
                    document: GetTokenGardensDocument,
                    get rawSDL() {
                        return printWithCache(GetTokenGardensDocument);
                    },
                    location: 'GetTokenGardensDocument.graphql',
                    sha256Hash: '9d6660fc8442df1ba6214712aeef98ce546d286314ac0ed3ced2a20d05d84b1b'
                }, {
                    document: GetMembersStrategyDocument,
                    get rawSDL() {
                        return printWithCache(GetMembersStrategyDocument);
                    },
                    location: 'GetMembersStrategyDocument.graphql',
                    sha256Hash: '9d6660fc8442df1ba6214712aeef98ce546d286314ac0ed3ced2a20d05d84b1b'
                }, {
                    document: GetMemberStrategyDocument,
                    get rawSDL() {
                        return printWithCache(GetMemberStrategyDocument);
                    },
                    location: 'GetMemberStrategyDocument.graphql',
                    sha256Hash: '9d6660fc8442df1ba6214712aeef98ce546d286314ac0ed3ced2a20d05d84b1b'
                }, {
                    document: IsMemberDocument,
                    get rawSDL() {
                        return printWithCache(IsMemberDocument);
                    },
                    location: 'IsMemberDocument.graphql',
                    sha256Hash: '9d6660fc8442df1ba6214712aeef98ce546d286314ac0ed3ced2a20d05d84b1b'
                }, {
                    document: GetMemberDocument,
                    get rawSDL() {
                        return printWithCache(GetMemberDocument);
                    },
                    location: 'GetMemberDocument.graphql',
                    sha256Hash: '9d6660fc8442df1ba6214712aeef98ce546d286314ac0ed3ced2a20d05d84b1b'
                }, {
                    document: GetPoolCreationDataDocument,
                    get rawSDL() {
                        return printWithCache(GetPoolCreationDataDocument);
                    },
                    location: 'GetPoolCreationDataDocument.graphql',
                    sha256Hash: '9d6660fc8442df1ba6214712aeef98ce546d286314ac0ed3ced2a20d05d84b1b'
                }, {
                    document: GetProposalSupportersDocument,
                    get rawSDL() {
                        return printWithCache(GetProposalSupportersDocument);
                    },
                    location: 'GetProposalSupportersDocument.graphql',
                    sha256Hash: '9d6660fc8442df1ba6214712aeef98ce546d286314ac0ed3ced2a20d05d84b1b'
                }, {
                    document: GetGardenCommunitiesDocument,
                    get rawSDL() {
                        return printWithCache(GetGardenCommunitiesDocument);
                    },
                    location: 'GetGardenCommunitiesDocument.graphql',
                    sha256Hash: '9d6660fc8442df1ba6214712aeef98ce546d286314ac0ed3ced2a20d05d84b1b'
                }, {
                    document: GetCommunitiesDocument,
                    get rawSDL() {
                        return printWithCache(GetCommunitiesDocument);
                    },
                    location: 'GetCommunitiesDocument.graphql',
                    sha256Hash: '9d6660fc8442df1ba6214712aeef98ce546d286314ac0ed3ced2a20d05d84b1b'
                }, {
                    document: GetCommunityDocument,
                    get rawSDL() {
                        return printWithCache(GetCommunityDocument);
                    },
                    location: 'GetCommunityDocument.graphql',
                    sha256Hash: '9d6660fc8442df1ba6214712aeef98ce546d286314ac0ed3ced2a20d05d84b1b'
                }, {
                    document: GetCommunityCreationDataDocument,
                    get rawSDL() {
                        return printWithCache(GetCommunityCreationDataDocument);
                    },
                    location: 'GetCommunityCreationDataDocument.graphql',
                    sha256Hash: '9d6660fc8442df1ba6214712aeef98ce546d286314ac0ed3ced2a20d05d84b1b'
                }, {
                    document: GetRegistryFactoryDataDocument,
                    get rawSDL() {
                        return printWithCache(GetRegistryFactoryDataDocument);
                    },
                    location: 'GetRegistryFactoryDataDocument.graphql',
                    sha256Hash: '9d6660fc8442df1ba6214712aeef98ce546d286314ac0ed3ced2a20d05d84b1b'
                }, {
                    document: GetPoolDataDocument,
                    get rawSDL() {
                        return printWithCache(GetPoolDataDocument);
                    },
                    location: 'GetPoolDataDocument.graphql',
                    sha256Hash: '9d6660fc8442df1ba6214712aeef98ce546d286314ac0ed3ced2a20d05d84b1b'
                }, {
                    document: GetProposalDataDocument,
                    get rawSDL() {
                        return printWithCache(GetProposalDataDocument);
                    },
                    location: 'GetProposalDataDocument.graphql',
                    sha256Hash: '9d6660fc8442df1ba6214712aeef98ce546d286314ac0ed3ced2a20d05d84b1b'
                }, {
                    document: GetAlloDocument,
                    get rawSDL() {
                        return printWithCache(GetAlloDocument);
                    },
                    location: 'GetAlloDocument.graphql',
                    sha256Hash: '9d6660fc8442df1ba6214712aeef98ce546d286314ac0ed3ced2a20d05d84b1b'
                }, {
                    document: GetStrategyByPoolDocument,
                    get rawSDL() {
                        return printWithCache(GetStrategyByPoolDocument);
                    },
                    location: 'GetStrategyByPoolDocument.graphql',
                    sha256Hash: '9d6660fc8442df1ba6214712aeef98ce546d286314ac0ed3ced2a20d05d84b1b'
                }, {
                    document: GetTokenTitleDocument,
                    get rawSDL() {
                        return printWithCache(GetTokenTitleDocument);
                    },
                    location: 'GetTokenTitleDocument.graphql',
                    sha256Hash: '9d6660fc8442df1ba6214712aeef98ce546d286314ac0ed3ced2a20d05d84b1b'
                }, {
                    document: GetCommunityTitlesDocument,
                    get rawSDL() {
                        return printWithCache(GetCommunityTitlesDocument);
                    },
                    location: 'GetCommunityTitlesDocument.graphql',
                    sha256Hash: '9d6660fc8442df1ba6214712aeef98ce546d286314ac0ed3ced2a20d05d84b1b'
                }, {
                    document: GetPoolTitlesDocument,
                    get rawSDL() {
                        return printWithCache(GetPoolTitlesDocument);
                    },
                    location: 'GetPoolTitlesDocument.graphql',
                    sha256Hash: '9d6660fc8442df1ba6214712aeef98ce546d286314ac0ed3ced2a20d05d84b1b'
                }, {
                    document: GetProposalTitlesDocument,
                    get rawSDL() {
                        return printWithCache(GetProposalTitlesDocument);
                    },
                    location: 'GetProposalTitlesDocument.graphql',
                    sha256Hash: '9d6660fc8442df1ba6214712aeef98ce546d286314ac0ed3ced2a20d05d84b1b'
                }, {
                    document: GetPassportStrategyDocument,
                    get rawSDL() {
                        return printWithCache(GetPassportStrategyDocument);
                    },
                    location: 'GetPassportStrategyDocument.graphql',
                    sha256Hash: '9d6660fc8442df1ba6214712aeef98ce546d286314ac0ed3ced2a20d05d84b1b'
                }, {
                    document: GetPassportUserDocument,
                    get rawSDL() {
                        return printWithCache(GetPassportUserDocument);
                    },
                    location: 'GetPassportUserDocument.graphql',
                    sha256Hash: '9d6660fc8442df1ba6214712aeef98ce546d286314ac0ed3ced2a20d05d84b1b'
                }, {
                    document: GetGoodDollarStrategyDocument,
                    get rawSDL() {
                        return printWithCache(GetGoodDollarStrategyDocument);
                    },
                    location: 'GetGoodDollarStrategyDocument.graphql',
                    sha256Hash: '9d6660fc8442df1ba6214712aeef98ce546d286314ac0ed3ced2a20d05d84b1b'
                }, {
                    document: GetGoodDollarUserDocument,
                    get rawSDL() {
                        return printWithCache(GetGoodDollarUserDocument);
                    },
                    location: 'GetGoodDollarUserDocument.graphql',
                    sha256Hash: '9d6660fc8442df1ba6214712aeef98ce546d286314ac0ed3ced2a20d05d84b1b'
                }, {
                    document: GetProposalDisputesDocument,
                    get rawSDL() {
                        return printWithCache(GetProposalDisputesDocument);
                    },
                    location: 'GetProposalDisputesDocument.graphql',
                    sha256Hash: '9d6660fc8442df1ba6214712aeef98ce546d286314ac0ed3ced2a20d05d84b1b'
                }, {
                    document: GetArbitrableConfigsDocument,
                    get rawSDL() {
                        return printWithCache(GetArbitrableConfigsDocument);
                    },
                    location: 'GetArbitrableConfigsDocument.graphql',
                    sha256Hash: '9d6660fc8442df1ba6214712aeef98ce546d286314ac0ed3ced2a20d05d84b1b'
                }, {
                    document: GetMemberPassportAndCommunitiesDocument,
                    get rawSDL() {
                        return printWithCache(GetMemberPassportAndCommunitiesDocument);
                    },
                    location: 'GetMemberPassportAndCommunitiesDocument.graphql',
                    sha256Hash: '9d6660fc8442df1ba6214712aeef98ce546d286314ac0ed3ced2a20d05d84b1b'
                }, {
                    document: GetCommunityNameDocument,
                    get rawSDL() {
                        return printWithCache(GetCommunityNameDocument);
                    },
                    location: 'GetCommunityNameDocument.graphql',
                    sha256Hash: '9d6660fc8442df1ba6214712aeef98ce546d286314ac0ed3ced2a20d05d84b1b'
                }, {
                    document: GetPoolTitleDocument,
                    get rawSDL() {
                        return printWithCache(GetPoolTitleDocument);
                    },
                    location: 'GetPoolTitleDocument.graphql',
                    sha256Hash: '9d6660fc8442df1ba6214712aeef98ce546d286314ac0ed3ced2a20d05d84b1b'
                }, {
                    document: GetProposalTitleDocument,
                    get rawSDL() {
                        return printWithCache(GetProposalTitleDocument);
                    },
                    location: 'GetProposalTitleDocument.graphql',
                    sha256Hash: '9d6660fc8442df1ba6214712aeef98ce546d286314ac0ed3ced2a20d05d84b1b'
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
  registryFactories {
    id
    registryCommunities {
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
      strategies {
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
    }
  }
}
    `;
export const getTokenGardensDocument = gql `
    query getTokenGardens {
  tokenGardens {
    id
    chainId
    name
    symbol
    decimals
    totalBalance
    communities {
      id
      chainId
      covenantIpfsHash
      covenant {
        text
      }
      communityFee
      isValid
      communityName
      strategies {
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
    stakes {
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
    memberCommunity(where: {registryCommunity_contains: $comm}) {
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
    memberCommunity {
      id
      stakedTokens
      isRegistered
      registryCommunity {
        id
        isValid
      }
    }
    stakes {
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
  allos {
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
    stakes(where: {proposal: $proposalId}) {
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
  registryCommunities(where: {chainId: $chainId, garden_: {id: $tokenGarden}}) {
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
    strategies(where: {isEnabled: true}) {
      id
      totalEffectiveActivePoints
      poolId
    }
  }
}
    `;
export const getCommunitiesDocument = gql `
    query getCommunities {
  registryCommunities(where: {isValid: true}) {
    id
    councilSafe
    communityName
    archived
    garden {
      address
      chainId
      symbol
      name
    }
    strategies(where: {isEnabled: true}) {
      id
      totalEffectiveActivePoints
      poolId
    }
    members(first: 1000, where: {stakedTokens_gt: "0"}) {
      id
      memberAddress
    }
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
    strategies(orderBy: poolId, orderDirection: desc) {
      id
      proposals {
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
      proposals {
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
  registryFactories {
    id
  }
}
    `;
export const getRegistryFactoryDataDocument = gql `
    query getRegistryFactoryData {
  registryFactories {
    id
    chainId
  }
}
    `;
export const getPoolDataDocument = gql `
    query getPoolData($garden: ID!, $poolId: BigInt!) {
  allos {
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
  cvstrategies(where: {poolId: $poolId}) {
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
    memberActive {
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
      }
      members {
        memberAddress
      }
    }
    proposals(orderBy: createdAt, orderDirection: desc) {
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
  allos {
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
    version
    strategy {
      id
      token
      maxCVSupply
      totalEffectiveActivePoints
      poolId
      isEnabled
      config {
        proposalType
        pointSystem
        minThresholdPoints
        decay
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
  allos {
    id
    chainId
    tokenNative
  }
}
    `;
export const getStrategyByPoolDocument = gql `
    query getStrategyByPool($poolId: BigInt!) {
  cvstrategies(where: {poolId: $poolId}) {
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
    memberActive {
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
    proposals {
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
  cvstrategies(where: {poolId: $poolId}) {
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
  proposalDisputes(where: {proposal_: {id: $proposalId}}) {
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
  arbitrableConfigs(where: {strategy: $strategyId}) {
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
    memberCommunity {
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
