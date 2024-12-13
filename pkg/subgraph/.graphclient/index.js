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
        config: { "endpoint": "https://api.studio.thegraph.com/query/70985/gardens-v2---arbitrum-sepolia/0.3.0" },
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
        "e2a2c42ee04cf5dee75a7583c1f1b444a0c51e2d12801f4498ba7cf6d3830aa2": GetFactoriesDocument,
        "e2a2c42ee04cf5dee75a7583c1f1b444a0c51e2d12801f4498ba7cf6d3830aa2": GetTokenGardensDocument,
        "e2a2c42ee04cf5dee75a7583c1f1b444a0c51e2d12801f4498ba7cf6d3830aa2": GetMembersStrategyDocument,
        "e2a2c42ee04cf5dee75a7583c1f1b444a0c51e2d12801f4498ba7cf6d3830aa2": GetMemberStrategyDocument,
        "e2a2c42ee04cf5dee75a7583c1f1b444a0c51e2d12801f4498ba7cf6d3830aa2": IsMemberDocument,
        "e2a2c42ee04cf5dee75a7583c1f1b444a0c51e2d12801f4498ba7cf6d3830aa2": GetMemberDocument,
        "e2a2c42ee04cf5dee75a7583c1f1b444a0c51e2d12801f4498ba7cf6d3830aa2": GetPoolCreationDataDocument,
        "e2a2c42ee04cf5dee75a7583c1f1b444a0c51e2d12801f4498ba7cf6d3830aa2": GetProposalSupportersDocument,
        "e2a2c42ee04cf5dee75a7583c1f1b444a0c51e2d12801f4498ba7cf6d3830aa2": GetGardenCommunitiesDocument,
        "e2a2c42ee04cf5dee75a7583c1f1b444a0c51e2d12801f4498ba7cf6d3830aa2": GetCommunityDocument,
        "e2a2c42ee04cf5dee75a7583c1f1b444a0c51e2d12801f4498ba7cf6d3830aa2": GetCommunityCreationDataDocument,
        "e2a2c42ee04cf5dee75a7583c1f1b444a0c51e2d12801f4498ba7cf6d3830aa2": GetPoolDataDocument,
        "e2a2c42ee04cf5dee75a7583c1f1b444a0c51e2d12801f4498ba7cf6d3830aa2": GetProposalDataDocument,
        "e2a2c42ee04cf5dee75a7583c1f1b444a0c51e2d12801f4498ba7cf6d3830aa2": GetAlloDocument,
        "e2a2c42ee04cf5dee75a7583c1f1b444a0c51e2d12801f4498ba7cf6d3830aa2": GetStrategyByPoolDocument,
        "e2a2c42ee04cf5dee75a7583c1f1b444a0c51e2d12801f4498ba7cf6d3830aa2": GetTokenTitleDocument,
        "e2a2c42ee04cf5dee75a7583c1f1b444a0c51e2d12801f4498ba7cf6d3830aa2": GetCommunityTitlesDocument,
        "e2a2c42ee04cf5dee75a7583c1f1b444a0c51e2d12801f4498ba7cf6d3830aa2": GetPoolTitlesDocument,
        "e2a2c42ee04cf5dee75a7583c1f1b444a0c51e2d12801f4498ba7cf6d3830aa2": GetProposalTitlesDocument,
        "e2a2c42ee04cf5dee75a7583c1f1b444a0c51e2d12801f4498ba7cf6d3830aa2": GetPassportScorerDocument,
        "e2a2c42ee04cf5dee75a7583c1f1b444a0c51e2d12801f4498ba7cf6d3830aa2": GetPassportStrategyDocument,
        "e2a2c42ee04cf5dee75a7583c1f1b444a0c51e2d12801f4498ba7cf6d3830aa2": GetPassportUserDocument,
        "e2a2c42ee04cf5dee75a7583c1f1b444a0c51e2d12801f4498ba7cf6d3830aa2": GetProposalDisputesDocument,
        "e2a2c42ee04cf5dee75a7583c1f1b444a0c51e2d12801f4498ba7cf6d3830aa2": GetArbitrableConfigsDocument,
        "e2a2c42ee04cf5dee75a7583c1f1b444a0c51e2d12801f4498ba7cf6d3830aa2": GetMemberPassportAndCommunitiesDocument
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
                    sha256Hash: 'e2a2c42ee04cf5dee75a7583c1f1b444a0c51e2d12801f4498ba7cf6d3830aa2'
                }, {
                    document: GetTokenGardensDocument,
                    get rawSDL() {
                        return printWithCache(GetTokenGardensDocument);
                    },
                    location: 'GetTokenGardensDocument.graphql',
                    sha256Hash: 'e2a2c42ee04cf5dee75a7583c1f1b444a0c51e2d12801f4498ba7cf6d3830aa2'
                }, {
                    document: GetMembersStrategyDocument,
                    get rawSDL() {
                        return printWithCache(GetMembersStrategyDocument);
                    },
                    location: 'GetMembersStrategyDocument.graphql',
                    sha256Hash: 'e2a2c42ee04cf5dee75a7583c1f1b444a0c51e2d12801f4498ba7cf6d3830aa2'
                }, {
                    document: GetMemberStrategyDocument,
                    get rawSDL() {
                        return printWithCache(GetMemberStrategyDocument);
                    },
                    location: 'GetMemberStrategyDocument.graphql',
                    sha256Hash: 'e2a2c42ee04cf5dee75a7583c1f1b444a0c51e2d12801f4498ba7cf6d3830aa2'
                }, {
                    document: IsMemberDocument,
                    get rawSDL() {
                        return printWithCache(IsMemberDocument);
                    },
                    location: 'IsMemberDocument.graphql',
                    sha256Hash: 'e2a2c42ee04cf5dee75a7583c1f1b444a0c51e2d12801f4498ba7cf6d3830aa2'
                }, {
                    document: GetMemberDocument,
                    get rawSDL() {
                        return printWithCache(GetMemberDocument);
                    },
                    location: 'GetMemberDocument.graphql',
                    sha256Hash: 'e2a2c42ee04cf5dee75a7583c1f1b444a0c51e2d12801f4498ba7cf6d3830aa2'
                }, {
                    document: GetPoolCreationDataDocument,
                    get rawSDL() {
                        return printWithCache(GetPoolCreationDataDocument);
                    },
                    location: 'GetPoolCreationDataDocument.graphql',
                    sha256Hash: 'e2a2c42ee04cf5dee75a7583c1f1b444a0c51e2d12801f4498ba7cf6d3830aa2'
                }, {
                    document: GetProposalSupportersDocument,
                    get rawSDL() {
                        return printWithCache(GetProposalSupportersDocument);
                    },
                    location: 'GetProposalSupportersDocument.graphql',
                    sha256Hash: 'e2a2c42ee04cf5dee75a7583c1f1b444a0c51e2d12801f4498ba7cf6d3830aa2'
                }, {
                    document: GetGardenCommunitiesDocument,
                    get rawSDL() {
                        return printWithCache(GetGardenCommunitiesDocument);
                    },
                    location: 'GetGardenCommunitiesDocument.graphql',
                    sha256Hash: 'e2a2c42ee04cf5dee75a7583c1f1b444a0c51e2d12801f4498ba7cf6d3830aa2'
                }, {
                    document: GetCommunityDocument,
                    get rawSDL() {
                        return printWithCache(GetCommunityDocument);
                    },
                    location: 'GetCommunityDocument.graphql',
                    sha256Hash: 'e2a2c42ee04cf5dee75a7583c1f1b444a0c51e2d12801f4498ba7cf6d3830aa2'
                }, {
                    document: GetCommunityCreationDataDocument,
                    get rawSDL() {
                        return printWithCache(GetCommunityCreationDataDocument);
                    },
                    location: 'GetCommunityCreationDataDocument.graphql',
                    sha256Hash: 'e2a2c42ee04cf5dee75a7583c1f1b444a0c51e2d12801f4498ba7cf6d3830aa2'
                }, {
                    document: GetPoolDataDocument,
                    get rawSDL() {
                        return printWithCache(GetPoolDataDocument);
                    },
                    location: 'GetPoolDataDocument.graphql',
                    sha256Hash: 'e2a2c42ee04cf5dee75a7583c1f1b444a0c51e2d12801f4498ba7cf6d3830aa2'
                }, {
                    document: GetProposalDataDocument,
                    get rawSDL() {
                        return printWithCache(GetProposalDataDocument);
                    },
                    location: 'GetProposalDataDocument.graphql',
                    sha256Hash: 'e2a2c42ee04cf5dee75a7583c1f1b444a0c51e2d12801f4498ba7cf6d3830aa2'
                }, {
                    document: GetAlloDocument,
                    get rawSDL() {
                        return printWithCache(GetAlloDocument);
                    },
                    location: 'GetAlloDocument.graphql',
                    sha256Hash: 'e2a2c42ee04cf5dee75a7583c1f1b444a0c51e2d12801f4498ba7cf6d3830aa2'
                }, {
                    document: GetStrategyByPoolDocument,
                    get rawSDL() {
                        return printWithCache(GetStrategyByPoolDocument);
                    },
                    location: 'GetStrategyByPoolDocument.graphql',
                    sha256Hash: 'e2a2c42ee04cf5dee75a7583c1f1b444a0c51e2d12801f4498ba7cf6d3830aa2'
                }, {
                    document: GetTokenTitleDocument,
                    get rawSDL() {
                        return printWithCache(GetTokenTitleDocument);
                    },
                    location: 'GetTokenTitleDocument.graphql',
                    sha256Hash: 'e2a2c42ee04cf5dee75a7583c1f1b444a0c51e2d12801f4498ba7cf6d3830aa2'
                }, {
                    document: GetCommunityTitlesDocument,
                    get rawSDL() {
                        return printWithCache(GetCommunityTitlesDocument);
                    },
                    location: 'GetCommunityTitlesDocument.graphql',
                    sha256Hash: 'e2a2c42ee04cf5dee75a7583c1f1b444a0c51e2d12801f4498ba7cf6d3830aa2'
                }, {
                    document: GetPoolTitlesDocument,
                    get rawSDL() {
                        return printWithCache(GetPoolTitlesDocument);
                    },
                    location: 'GetPoolTitlesDocument.graphql',
                    sha256Hash: 'e2a2c42ee04cf5dee75a7583c1f1b444a0c51e2d12801f4498ba7cf6d3830aa2'
                }, {
                    document: GetProposalTitlesDocument,
                    get rawSDL() {
                        return printWithCache(GetProposalTitlesDocument);
                    },
                    location: 'GetProposalTitlesDocument.graphql',
                    sha256Hash: 'e2a2c42ee04cf5dee75a7583c1f1b444a0c51e2d12801f4498ba7cf6d3830aa2'
                }, {
                    document: GetPassportScorerDocument,
                    get rawSDL() {
                        return printWithCache(GetPassportScorerDocument);
                    },
                    location: 'GetPassportScorerDocument.graphql',
                    sha256Hash: 'e2a2c42ee04cf5dee75a7583c1f1b444a0c51e2d12801f4498ba7cf6d3830aa2'
                }, {
                    document: GetPassportStrategyDocument,
                    get rawSDL() {
                        return printWithCache(GetPassportStrategyDocument);
                    },
                    location: 'GetPassportStrategyDocument.graphql',
                    sha256Hash: 'e2a2c42ee04cf5dee75a7583c1f1b444a0c51e2d12801f4498ba7cf6d3830aa2'
                }, {
                    document: GetPassportUserDocument,
                    get rawSDL() {
                        return printWithCache(GetPassportUserDocument);
                    },
                    location: 'GetPassportUserDocument.graphql',
                    sha256Hash: 'e2a2c42ee04cf5dee75a7583c1f1b444a0c51e2d12801f4498ba7cf6d3830aa2'
                }, {
                    document: GetProposalDisputesDocument,
                    get rawSDL() {
                        return printWithCache(GetProposalDisputesDocument);
                    },
                    location: 'GetProposalDisputesDocument.graphql',
                    sha256Hash: 'e2a2c42ee04cf5dee75a7583c1f1b444a0c51e2d12801f4498ba7cf6d3830aa2'
                }, {
                    document: GetArbitrableConfigsDocument,
                    get rawSDL() {
                        return printWithCache(GetArbitrableConfigsDocument);
                    },
                    location: 'GetArbitrableConfigsDocument.graphql',
                    sha256Hash: 'e2a2c42ee04cf5dee75a7583c1f1b444a0c51e2d12801f4498ba7cf6d3830aa2'
                }, {
                    document: GetMemberPassportAndCommunitiesDocument,
                    get rawSDL() {
                        return printWithCache(GetMemberPassportAndCommunitiesDocument);
                    },
                    location: 'GetMemberPassportAndCommunitiesDocument.graphql',
                    sha256Hash: 'e2a2c42ee04cf5dee75a7583c1f1b444a0c51e2d12801f4498ba7cf6d3830aa2'
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
export const getMembersStrategyDocument = gql `
    query getMembersStrategy($strategyId: String!) {
  memberStrategies(where: {strategy: $strategyId}) {
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
  members {
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
    `;
export const getCommunityDocument = gql `
    query getCommunity($communityAddr: ID!, $tokenAddr: ID!) {
  registryCommunity(id: $communityAddr) {
    communityName
    id
    members(
      where: {stakedTokens_gt: "0"}
      orderBy: stakedTokens
      orderDirection: desc
    ) {
      memberAddress
      stakedTokens
    }
    strategies(orderBy: poolId, orderDirection: desc, where: {archived: false}) {
      id
      proposals {
        id
      }
      isEnabled
      poolAmount
      poolId
      token
      metadata
      config {
        proposalType
        pointSystem
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
    query getCommunityCreationData {
  registryFactories {
    id
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
    poolAmount
    metadata
    id
    poolId
    totalEffectiveActivePoints
    isEnabled
    maxCVSupply
    archived
    sybilScorer {
      id
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
    }
    proposals(orderBy: createdAt, orderDirection: desc) {
      id
      proposalNumber
      metadata {
        title
        description
      }
      metadataHash
      beneficiary
      requestedAmount
      requestedToken
      proposalStatus
      stakedAmount
      convictionLast
      createdAt
      blockLast
      threshold
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
    metadata {
      title
      description
    }
    metadataHash
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
      token
      maxCVSupply
      totalEffectiveActivePoints
      poolId
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
      metadata {
        title
        description
      }
      metadataHash
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
    metadata {
      title
      description
    }
    metadataHash
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
export const getProposalDisputesDocument = gql `
    query getProposalDisputes($proposalId: ID!) {
  proposalDisputes(where: {proposal_: {id: $proposalId}}) {
    id
    disputeId
    status
    challenger
    context
    metadata {
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
        },
        getProposalDisputes(variables, options) {
            return requester(getProposalDisputesDocument, variables, options);
        },
        getArbitrableConfigs(variables, options) {
            return requester(getArbitrableConfigsDocument, variables, options);
        },
        getMemberPassportAndCommunities(variables, options) {
            return requester(getMemberPassportAndCommunitiesDocument, variables, options);
        }
    };
}
