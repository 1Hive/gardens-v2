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
        config: { "endpoint": "http://localhost:8000/subgraphs/name/kamikazebr/gv2" },
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
        "0b0c6d4cb864e6968e19a520fd2e5ca1d9341c99e575133c433f5fd0e25f4bbf": GetFactoriesDocument,
        "0b0c6d4cb864e6968e19a520fd2e5ca1d9341c99e575133c433f5fd0e25f4bbf": GetTokenGardensDocument,
        "0b0c6d4cb864e6968e19a520fd2e5ca1d9341c99e575133c433f5fd0e25f4bbf": GetMemberStrategyDocument,
        "0b0c6d4cb864e6968e19a520fd2e5ca1d9341c99e575133c433f5fd0e25f4bbf": IsMemberDocument,
        "0b0c6d4cb864e6968e19a520fd2e5ca1d9341c99e575133c433f5fd0e25f4bbf": GetMemberDocument,
        "0b0c6d4cb864e6968e19a520fd2e5ca1d9341c99e575133c433f5fd0e25f4bbf": GetPoolCreationDataDocument,
        "0b0c6d4cb864e6968e19a520fd2e5ca1d9341c99e575133c433f5fd0e25f4bbf": GetGardenDocument,
        "0b0c6d4cb864e6968e19a520fd2e5ca1d9341c99e575133c433f5fd0e25f4bbf": GetCommunityDocument,
        "0b0c6d4cb864e6968e19a520fd2e5ca1d9341c99e575133c433f5fd0e25f4bbf": GetCommunityCreationDataDocument,
        "0b0c6d4cb864e6968e19a520fd2e5ca1d9341c99e575133c433f5fd0e25f4bbf": GetPoolDataDocument,
        "0b0c6d4cb864e6968e19a520fd2e5ca1d9341c99e575133c433f5fd0e25f4bbf": GetProposalDataDocument,
        "0b0c6d4cb864e6968e19a520fd2e5ca1d9341c99e575133c433f5fd0e25f4bbf": GetAlloDocument,
        "0b0c6d4cb864e6968e19a520fd2e5ca1d9341c99e575133c433f5fd0e25f4bbf": GetStrategyByPoolDocument,
        "0b0c6d4cb864e6968e19a520fd2e5ca1d9341c99e575133c433f5fd0e25f4bbf": GetTokenTitleDocument,
        "0b0c6d4cb864e6968e19a520fd2e5ca1d9341c99e575133c433f5fd0e25f4bbf": GetCommunityTitlesDocument,
        "0b0c6d4cb864e6968e19a520fd2e5ca1d9341c99e575133c433f5fd0e25f4bbf": GetPoolTitlesDocument,
        "0b0c6d4cb864e6968e19a520fd2e5ca1d9341c99e575133c433f5fd0e25f4bbf": GetProposalTitlesDocument,
        "0b0c6d4cb864e6968e19a520fd2e5ca1d9341c99e575133c433f5fd0e25f4bbf": GetPassportScorerDocument,
        "0b0c6d4cb864e6968e19a520fd2e5ca1d9341c99e575133c433f5fd0e25f4bbf": GetPassportStrategyDocument,
        "0b0c6d4cb864e6968e19a520fd2e5ca1d9341c99e575133c433f5fd0e25f4bbf": GetPassportUserDocument
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
                    sha256Hash: '0b0c6d4cb864e6968e19a520fd2e5ca1d9341c99e575133c433f5fd0e25f4bbf'
                }, {
                    document: GetTokenGardensDocument,
                    get rawSDL() {
                        return printWithCache(GetTokenGardensDocument);
                    },
                    location: 'GetTokenGardensDocument.graphql',
                    sha256Hash: '0b0c6d4cb864e6968e19a520fd2e5ca1d9341c99e575133c433f5fd0e25f4bbf'
                }, {
                    document: GetMemberStrategyDocument,
                    get rawSDL() {
                        return printWithCache(GetMemberStrategyDocument);
                    },
                    location: 'GetMemberStrategyDocument.graphql',
                    sha256Hash: '0b0c6d4cb864e6968e19a520fd2e5ca1d9341c99e575133c433f5fd0e25f4bbf'
                }, {
                    document: IsMemberDocument,
                    get rawSDL() {
                        return printWithCache(IsMemberDocument);
                    },
                    location: 'IsMemberDocument.graphql',
                    sha256Hash: '0b0c6d4cb864e6968e19a520fd2e5ca1d9341c99e575133c433f5fd0e25f4bbf'
                }, {
                    document: GetMemberDocument,
                    get rawSDL() {
                        return printWithCache(GetMemberDocument);
                    },
                    location: 'GetMemberDocument.graphql',
                    sha256Hash: '0b0c6d4cb864e6968e19a520fd2e5ca1d9341c99e575133c433f5fd0e25f4bbf'
                }, {
                    document: GetPoolCreationDataDocument,
                    get rawSDL() {
                        return printWithCache(GetPoolCreationDataDocument);
                    },
                    location: 'GetPoolCreationDataDocument.graphql',
                    sha256Hash: '0b0c6d4cb864e6968e19a520fd2e5ca1d9341c99e575133c433f5fd0e25f4bbf'
                }, {
                    document: GetGardenDocument,
                    get rawSDL() {
                        return printWithCache(GetGardenDocument);
                    },
                    location: 'GetGardenDocument.graphql',
                    sha256Hash: '0b0c6d4cb864e6968e19a520fd2e5ca1d9341c99e575133c433f5fd0e25f4bbf'
                }, {
                    document: GetCommunityDocument,
                    get rawSDL() {
                        return printWithCache(GetCommunityDocument);
                    },
                    location: 'GetCommunityDocument.graphql',
                    sha256Hash: '0b0c6d4cb864e6968e19a520fd2e5ca1d9341c99e575133c433f5fd0e25f4bbf'
                }, {
                    document: GetCommunityCreationDataDocument,
                    get rawSDL() {
                        return printWithCache(GetCommunityCreationDataDocument);
                    },
                    location: 'GetCommunityCreationDataDocument.graphql',
                    sha256Hash: '0b0c6d4cb864e6968e19a520fd2e5ca1d9341c99e575133c433f5fd0e25f4bbf'
                }, {
                    document: GetPoolDataDocument,
                    get rawSDL() {
                        return printWithCache(GetPoolDataDocument);
                    },
                    location: 'GetPoolDataDocument.graphql',
                    sha256Hash: '0b0c6d4cb864e6968e19a520fd2e5ca1d9341c99e575133c433f5fd0e25f4bbf'
                }, {
                    document: GetProposalDataDocument,
                    get rawSDL() {
                        return printWithCache(GetProposalDataDocument);
                    },
                    location: 'GetProposalDataDocument.graphql',
                    sha256Hash: '0b0c6d4cb864e6968e19a520fd2e5ca1d9341c99e575133c433f5fd0e25f4bbf'
                }, {
                    document: GetAlloDocument,
                    get rawSDL() {
                        return printWithCache(GetAlloDocument);
                    },
                    location: 'GetAlloDocument.graphql',
                    sha256Hash: '0b0c6d4cb864e6968e19a520fd2e5ca1d9341c99e575133c433f5fd0e25f4bbf'
                }, {
                    document: GetStrategyByPoolDocument,
                    get rawSDL() {
                        return printWithCache(GetStrategyByPoolDocument);
                    },
                    location: 'GetStrategyByPoolDocument.graphql',
                    sha256Hash: '0b0c6d4cb864e6968e19a520fd2e5ca1d9341c99e575133c433f5fd0e25f4bbf'
                }, {
                    document: GetTokenTitleDocument,
                    get rawSDL() {
                        return printWithCache(GetTokenTitleDocument);
                    },
                    location: 'GetTokenTitleDocument.graphql',
                    sha256Hash: '0b0c6d4cb864e6968e19a520fd2e5ca1d9341c99e575133c433f5fd0e25f4bbf'
                }, {
                    document: GetCommunityTitlesDocument,
                    get rawSDL() {
                        return printWithCache(GetCommunityTitlesDocument);
                    },
                    location: 'GetCommunityTitlesDocument.graphql',
                    sha256Hash: '0b0c6d4cb864e6968e19a520fd2e5ca1d9341c99e575133c433f5fd0e25f4bbf'
                }, {
                    document: GetPoolTitlesDocument,
                    get rawSDL() {
                        return printWithCache(GetPoolTitlesDocument);
                    },
                    location: 'GetPoolTitlesDocument.graphql',
                    sha256Hash: '0b0c6d4cb864e6968e19a520fd2e5ca1d9341c99e575133c433f5fd0e25f4bbf'
                }, {
                    document: GetProposalTitlesDocument,
                    get rawSDL() {
                        return printWithCache(GetProposalTitlesDocument);
                    },
                    location: 'GetProposalTitlesDocument.graphql',
                    sha256Hash: '0b0c6d4cb864e6968e19a520fd2e5ca1d9341c99e575133c433f5fd0e25f4bbf'
                }, {
                    document: GetPassportScorerDocument,
                    get rawSDL() {
                        return printWithCache(GetPassportScorerDocument);
                    },
                    location: 'GetPassportScorerDocument.graphql',
                    sha256Hash: '0b0c6d4cb864e6968e19a520fd2e5ca1d9341c99e575133c433f5fd0e25f4bbf'
                }, {
                    document: GetPassportStrategyDocument,
                    get rawSDL() {
                        return printWithCache(GetPassportStrategyDocument);
                    },
                    location: 'GetPassportStrategyDocument.graphql',
                    sha256Hash: '0b0c6d4cb864e6968e19a520fd2e5ca1d9341c99e575133c433f5fd0e25f4bbf'
                }, {
                    document: GetPassportUserDocument,
                    get rawSDL() {
                        return printWithCache(GetPassportUserDocument);
                    },
                    location: 'GetPassportUserDocument.graphql',
                    sha256Hash: '0b0c6d4cb864e6968e19a520fd2e5ca1d9341c99e575133c433f5fd0e25f4bbf'
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
      registerToken
      alloAddress
      members {
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
      communityFee
      isValid
      communityName
      strategies {
        id
      }
      members {
        id
        memberAddress
      }
    }
  }
}
    `;
export const getMemberStrategyDocument = gql `
    query getMemberStrategy($wallet: ID!) {
  memberStrategy(id: $wallet) {
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
  members(where: {id: $me}) {
    id
    stakes {
      id
      amount
      proposal {
        id
        proposalNumber
        stakedAmount
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
export const getGardenDocument = gql `
    query getGarden($addr: ID!) {
  tokenGarden(id: $addr) {
    id
    name
    symbol
    decimals
    chainId
    communities {
      id
      isValid
      covenantIpfsHash
      communityName
      protocolFee
      communityFee
      registerToken
      registerStakeAmount
      alloAddress
      members(where: {stakedTokens_gt: "0"}) {
        id
        memberAddress
      }
      strategies(where: {isEnabled: true}) {
        id
        totalEffectiveActivePoints
        poolId
        poolAmount
      }
    }
  }
}
    `;
export const getCommunityDocument = gql `
    query getCommunity($communityAddr: ID!, $tokenAddr: ID!) {
  registryCommunity(id: $communityAddr) {
    communityName
    id
    members(where: {stakedTokens_gt: "0"}) {
      id
      stakedTokens
    }
    strategies {
      id
      proposals {
        id
      }
      isEnabled
      poolAmount
      poolId
      metadata
      config {
        proposalType
      }
      proposals {
        id
      }
    }
    covenantIpfsHash
    communityFee
    protocolFee
    registerStakeAmount
    registerToken
  }
  tokenGarden(id: $tokenAddr) {
    symbol
    decimals
    id
  }
}
    `;
export const getCommunityCreationDataDocument = gql `
    query getCommunityCreationData($addr: ID!) {
  registryFactories {
    id
  }
  tokenGarden(id: $addr) {
    id
    name
    symbol
    decimals
    chainId
    communities {
      alloAddress
      isValid
    }
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
    poolAmount
    metadata
    id
    poolId
    totalEffectiveActivePoints
    isEnabled
    memberActive {
      id
    }
    config {
      id
      proposalType
      pointSystem
      maxRatio
      minThresholdPoints
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
      metadata
      beneficiary
      requestedAmount
      requestedToken
      proposalStatus
      stakedAmount
      convictionLast
      threshold
      strategy {
        id
        maxCVSupply
        totalEffectiveActivePoints
      }
    }
  }
}
    `;
export const getProposalDataDocument = gql `
    query getProposalData($garden: ID!, $proposalId: ID!) {
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
  cvproposal(id: $proposalId) {
    proposalNumber
    beneficiary
    blockLast
    convictionLast
    createdAt
    metadata
    proposalStatus
    requestedAmount
    requestedToken
    stakedAmount
    submitter
    threshold
    updatedAt
    version
    strategy {
      id
      maxCVSupply
      totalEffectiveActivePoints
      config {
        proposalType
        pointSystem
        minThresholdPoints
      }
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
      metadata
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
    metadata
    registryCommunity {
      communityName
      garden {
        name
      }
    }
    metadata
  }
}
    `;
export const getProposalTitlesDocument = gql `
    query getProposalTitles($proposalId: ID!) {
  cvproposal(id: $proposalId) {
    proposalNumber
    metadata
    strategy {
      poolId
      metadata
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
export const getPassportScorerDocument = gql `
    query getPassportScorer($scorerId: ID!) {
  passportScorer(id: $scorerId) {
    id
    strategies {
      id
      strategy {
        id
      }
      threshold
      councilSafe
      active
    }
    users {
      id
      userAddress
      score
      lastUpdated
    }
  }
}
    `;
export const getPassportStrategyDocument = gql `
    query getPassportStrategy($strategyId: ID!) {
  passportStrategy(id: $strategyId) {
    id
    strategy {
      id
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
export function getSdk(requester) {
    return {
        getFactories(variables, options) {
            return requester(getFactoriesDocument, variables, options);
        },
        getTokenGardens(variables, options) {
            return requester(getTokenGardensDocument, variables, options);
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
        getGarden(variables, options) {
            return requester(getGardenDocument, variables, options);
        },
        getCommunity(variables, options) {
            return requester(getCommunityDocument, variables, options);
        },
        getCommunityCreationData(variables, options) {
            return requester(getCommunityCreationDataDocument, variables, options);
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
        getPassportScorer(variables, options) {
            return requester(getPassportScorerDocument, variables, options);
        },
        getPassportStrategy(variables, options) {
            return requester(getPassportStrategyDocument, variables, options);
        },
        getPassportUser(variables, options) {
            return requester(getPassportUserDocument, variables, options);
        }
    };
}
