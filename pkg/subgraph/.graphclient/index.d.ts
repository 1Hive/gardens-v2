import { GraphQLResolveInfo, SelectionSetNode, FieldNode, GraphQLScalarType, GraphQLScalarTypeConfig } from 'graphql';
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
import type { GetMeshOptions } from '@graphql-mesh/runtime';
import type { YamlConfig } from '@graphql-mesh/types';
import { MeshHTTPHandler } from '@graphql-mesh/http';
import { ExecuteMeshFn, SubscribeMeshFn, MeshContext as BaseMeshContext, MeshInstance } from '@graphql-mesh/runtime';
import type { Gv2Types } from './sources/gv2/types';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends {
    [key: string]: unknown;
}> = {
    [K in keyof T]: T[K];
};
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & {
    [SubKey in K]?: Maybe<T[SubKey]>;
};
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & {
    [SubKey in K]: Maybe<T[SubKey]>;
};
export type RequireFields<T, K extends keyof T> = Omit<T, K> & {
    [P in K]-?: NonNullable<T[P]>;
};
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
    ID: string;
    String: string;
    Boolean: boolean;
    Int: number;
    Float: number;
    BigDecimal: any;
    BigInt: any;
    Bytes: any;
    Int8: any;
};
export type Allo = {
    id: Scalars['ID'];
    chainId: Scalars['BigInt'];
    tokenNative: Scalars['String'];
};
export type Allo_filter = {
    id?: InputMaybe<Scalars['ID']>;
    id_not?: InputMaybe<Scalars['ID']>;
    id_gt?: InputMaybe<Scalars['ID']>;
    id_lt?: InputMaybe<Scalars['ID']>;
    id_gte?: InputMaybe<Scalars['ID']>;
    id_lte?: InputMaybe<Scalars['ID']>;
    id_in?: InputMaybe<Array<Scalars['ID']>>;
    id_not_in?: InputMaybe<Array<Scalars['ID']>>;
    chainId?: InputMaybe<Scalars['BigInt']>;
    chainId_not?: InputMaybe<Scalars['BigInt']>;
    chainId_gt?: InputMaybe<Scalars['BigInt']>;
    chainId_lt?: InputMaybe<Scalars['BigInt']>;
    chainId_gte?: InputMaybe<Scalars['BigInt']>;
    chainId_lte?: InputMaybe<Scalars['BigInt']>;
    chainId_in?: InputMaybe<Array<Scalars['BigInt']>>;
    chainId_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
    tokenNative?: InputMaybe<Scalars['String']>;
    tokenNative_not?: InputMaybe<Scalars['String']>;
    tokenNative_gt?: InputMaybe<Scalars['String']>;
    tokenNative_lt?: InputMaybe<Scalars['String']>;
    tokenNative_gte?: InputMaybe<Scalars['String']>;
    tokenNative_lte?: InputMaybe<Scalars['String']>;
    tokenNative_in?: InputMaybe<Array<Scalars['String']>>;
    tokenNative_not_in?: InputMaybe<Array<Scalars['String']>>;
    tokenNative_contains?: InputMaybe<Scalars['String']>;
    tokenNative_contains_nocase?: InputMaybe<Scalars['String']>;
    tokenNative_not_contains?: InputMaybe<Scalars['String']>;
    tokenNative_not_contains_nocase?: InputMaybe<Scalars['String']>;
    tokenNative_starts_with?: InputMaybe<Scalars['String']>;
    tokenNative_starts_with_nocase?: InputMaybe<Scalars['String']>;
    tokenNative_not_starts_with?: InputMaybe<Scalars['String']>;
    tokenNative_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
    tokenNative_ends_with?: InputMaybe<Scalars['String']>;
    tokenNative_ends_with_nocase?: InputMaybe<Scalars['String']>;
    tokenNative_not_ends_with?: InputMaybe<Scalars['String']>;
    tokenNative_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
    /** Filter for the block changed event. */
    _change_block?: InputMaybe<BlockChangedFilter>;
    and?: InputMaybe<Array<InputMaybe<Allo_filter>>>;
    or?: InputMaybe<Array<InputMaybe<Allo_filter>>>;
};
export type Allo_orderBy = 'id' | 'chainId' | 'tokenNative';
export type BlockChangedFilter = {
    number_gte: Scalars['Int'];
};
export type Block_height = {
    hash?: InputMaybe<Scalars['Bytes']>;
    number?: InputMaybe<Scalars['Int']>;
    number_gte?: InputMaybe<Scalars['Int']>;
};
export type CVProposal = {
    id: Scalars['ID'];
    proposalNumber: Scalars['BigInt'];
    metadata: Scalars['String'];
    version?: Maybe<Scalars['BigInt']>;
    strategy: CVStrategy;
    beneficiary: Scalars['String'];
    requestedAmount: Scalars['BigInt'];
    requestedToken: Scalars['String'];
    proposalStatus: Scalars['BigInt'];
    blockLast: Scalars['BigInt'];
    convictionLast: Scalars['BigInt'];
    threshold: Scalars['BigInt'];
    maxCVStaked: Scalars['BigInt'];
    stakedAmount: Scalars['BigInt'];
    submitter: Scalars['String'];
    createdAt: Scalars['BigInt'];
    updatedAt: Scalars['BigInt'];
};
export type CVProposal_filter = {
    id?: InputMaybe<Scalars['ID']>;
    id_not?: InputMaybe<Scalars['ID']>;
    id_gt?: InputMaybe<Scalars['ID']>;
    id_lt?: InputMaybe<Scalars['ID']>;
    id_gte?: InputMaybe<Scalars['ID']>;
    id_lte?: InputMaybe<Scalars['ID']>;
    id_in?: InputMaybe<Array<Scalars['ID']>>;
    id_not_in?: InputMaybe<Array<Scalars['ID']>>;
    proposalNumber?: InputMaybe<Scalars['BigInt']>;
    proposalNumber_not?: InputMaybe<Scalars['BigInt']>;
    proposalNumber_gt?: InputMaybe<Scalars['BigInt']>;
    proposalNumber_lt?: InputMaybe<Scalars['BigInt']>;
    proposalNumber_gte?: InputMaybe<Scalars['BigInt']>;
    proposalNumber_lte?: InputMaybe<Scalars['BigInt']>;
    proposalNumber_in?: InputMaybe<Array<Scalars['BigInt']>>;
    proposalNumber_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
    metadata?: InputMaybe<Scalars['String']>;
    metadata_not?: InputMaybe<Scalars['String']>;
    metadata_gt?: InputMaybe<Scalars['String']>;
    metadata_lt?: InputMaybe<Scalars['String']>;
    metadata_gte?: InputMaybe<Scalars['String']>;
    metadata_lte?: InputMaybe<Scalars['String']>;
    metadata_in?: InputMaybe<Array<Scalars['String']>>;
    metadata_not_in?: InputMaybe<Array<Scalars['String']>>;
    metadata_contains?: InputMaybe<Scalars['String']>;
    metadata_contains_nocase?: InputMaybe<Scalars['String']>;
    metadata_not_contains?: InputMaybe<Scalars['String']>;
    metadata_not_contains_nocase?: InputMaybe<Scalars['String']>;
    metadata_starts_with?: InputMaybe<Scalars['String']>;
    metadata_starts_with_nocase?: InputMaybe<Scalars['String']>;
    metadata_not_starts_with?: InputMaybe<Scalars['String']>;
    metadata_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
    metadata_ends_with?: InputMaybe<Scalars['String']>;
    metadata_ends_with_nocase?: InputMaybe<Scalars['String']>;
    metadata_not_ends_with?: InputMaybe<Scalars['String']>;
    metadata_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
    version?: InputMaybe<Scalars['BigInt']>;
    version_not?: InputMaybe<Scalars['BigInt']>;
    version_gt?: InputMaybe<Scalars['BigInt']>;
    version_lt?: InputMaybe<Scalars['BigInt']>;
    version_gte?: InputMaybe<Scalars['BigInt']>;
    version_lte?: InputMaybe<Scalars['BigInt']>;
    version_in?: InputMaybe<Array<Scalars['BigInt']>>;
    version_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
    strategy?: InputMaybe<Scalars['String']>;
    strategy_not?: InputMaybe<Scalars['String']>;
    strategy_gt?: InputMaybe<Scalars['String']>;
    strategy_lt?: InputMaybe<Scalars['String']>;
    strategy_gte?: InputMaybe<Scalars['String']>;
    strategy_lte?: InputMaybe<Scalars['String']>;
    strategy_in?: InputMaybe<Array<Scalars['String']>>;
    strategy_not_in?: InputMaybe<Array<Scalars['String']>>;
    strategy_contains?: InputMaybe<Scalars['String']>;
    strategy_contains_nocase?: InputMaybe<Scalars['String']>;
    strategy_not_contains?: InputMaybe<Scalars['String']>;
    strategy_not_contains_nocase?: InputMaybe<Scalars['String']>;
    strategy_starts_with?: InputMaybe<Scalars['String']>;
    strategy_starts_with_nocase?: InputMaybe<Scalars['String']>;
    strategy_not_starts_with?: InputMaybe<Scalars['String']>;
    strategy_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
    strategy_ends_with?: InputMaybe<Scalars['String']>;
    strategy_ends_with_nocase?: InputMaybe<Scalars['String']>;
    strategy_not_ends_with?: InputMaybe<Scalars['String']>;
    strategy_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
    strategy_?: InputMaybe<CVStrategy_filter>;
    beneficiary?: InputMaybe<Scalars['String']>;
    beneficiary_not?: InputMaybe<Scalars['String']>;
    beneficiary_gt?: InputMaybe<Scalars['String']>;
    beneficiary_lt?: InputMaybe<Scalars['String']>;
    beneficiary_gte?: InputMaybe<Scalars['String']>;
    beneficiary_lte?: InputMaybe<Scalars['String']>;
    beneficiary_in?: InputMaybe<Array<Scalars['String']>>;
    beneficiary_not_in?: InputMaybe<Array<Scalars['String']>>;
    beneficiary_contains?: InputMaybe<Scalars['String']>;
    beneficiary_contains_nocase?: InputMaybe<Scalars['String']>;
    beneficiary_not_contains?: InputMaybe<Scalars['String']>;
    beneficiary_not_contains_nocase?: InputMaybe<Scalars['String']>;
    beneficiary_starts_with?: InputMaybe<Scalars['String']>;
    beneficiary_starts_with_nocase?: InputMaybe<Scalars['String']>;
    beneficiary_not_starts_with?: InputMaybe<Scalars['String']>;
    beneficiary_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
    beneficiary_ends_with?: InputMaybe<Scalars['String']>;
    beneficiary_ends_with_nocase?: InputMaybe<Scalars['String']>;
    beneficiary_not_ends_with?: InputMaybe<Scalars['String']>;
    beneficiary_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
    requestedAmount?: InputMaybe<Scalars['BigInt']>;
    requestedAmount_not?: InputMaybe<Scalars['BigInt']>;
    requestedAmount_gt?: InputMaybe<Scalars['BigInt']>;
    requestedAmount_lt?: InputMaybe<Scalars['BigInt']>;
    requestedAmount_gte?: InputMaybe<Scalars['BigInt']>;
    requestedAmount_lte?: InputMaybe<Scalars['BigInt']>;
    requestedAmount_in?: InputMaybe<Array<Scalars['BigInt']>>;
    requestedAmount_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
    requestedToken?: InputMaybe<Scalars['String']>;
    requestedToken_not?: InputMaybe<Scalars['String']>;
    requestedToken_gt?: InputMaybe<Scalars['String']>;
    requestedToken_lt?: InputMaybe<Scalars['String']>;
    requestedToken_gte?: InputMaybe<Scalars['String']>;
    requestedToken_lte?: InputMaybe<Scalars['String']>;
    requestedToken_in?: InputMaybe<Array<Scalars['String']>>;
    requestedToken_not_in?: InputMaybe<Array<Scalars['String']>>;
    requestedToken_contains?: InputMaybe<Scalars['String']>;
    requestedToken_contains_nocase?: InputMaybe<Scalars['String']>;
    requestedToken_not_contains?: InputMaybe<Scalars['String']>;
    requestedToken_not_contains_nocase?: InputMaybe<Scalars['String']>;
    requestedToken_starts_with?: InputMaybe<Scalars['String']>;
    requestedToken_starts_with_nocase?: InputMaybe<Scalars['String']>;
    requestedToken_not_starts_with?: InputMaybe<Scalars['String']>;
    requestedToken_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
    requestedToken_ends_with?: InputMaybe<Scalars['String']>;
    requestedToken_ends_with_nocase?: InputMaybe<Scalars['String']>;
    requestedToken_not_ends_with?: InputMaybe<Scalars['String']>;
    requestedToken_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
    proposalStatus?: InputMaybe<Scalars['BigInt']>;
    proposalStatus_not?: InputMaybe<Scalars['BigInt']>;
    proposalStatus_gt?: InputMaybe<Scalars['BigInt']>;
    proposalStatus_lt?: InputMaybe<Scalars['BigInt']>;
    proposalStatus_gte?: InputMaybe<Scalars['BigInt']>;
    proposalStatus_lte?: InputMaybe<Scalars['BigInt']>;
    proposalStatus_in?: InputMaybe<Array<Scalars['BigInt']>>;
    proposalStatus_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
    blockLast?: InputMaybe<Scalars['BigInt']>;
    blockLast_not?: InputMaybe<Scalars['BigInt']>;
    blockLast_gt?: InputMaybe<Scalars['BigInt']>;
    blockLast_lt?: InputMaybe<Scalars['BigInt']>;
    blockLast_gte?: InputMaybe<Scalars['BigInt']>;
    blockLast_lte?: InputMaybe<Scalars['BigInt']>;
    blockLast_in?: InputMaybe<Array<Scalars['BigInt']>>;
    blockLast_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
    convictionLast?: InputMaybe<Scalars['BigInt']>;
    convictionLast_not?: InputMaybe<Scalars['BigInt']>;
    convictionLast_gt?: InputMaybe<Scalars['BigInt']>;
    convictionLast_lt?: InputMaybe<Scalars['BigInt']>;
    convictionLast_gte?: InputMaybe<Scalars['BigInt']>;
    convictionLast_lte?: InputMaybe<Scalars['BigInt']>;
    convictionLast_in?: InputMaybe<Array<Scalars['BigInt']>>;
    convictionLast_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
    threshold?: InputMaybe<Scalars['BigInt']>;
    threshold_not?: InputMaybe<Scalars['BigInt']>;
    threshold_gt?: InputMaybe<Scalars['BigInt']>;
    threshold_lt?: InputMaybe<Scalars['BigInt']>;
    threshold_gte?: InputMaybe<Scalars['BigInt']>;
    threshold_lte?: InputMaybe<Scalars['BigInt']>;
    threshold_in?: InputMaybe<Array<Scalars['BigInt']>>;
    threshold_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
    maxCVStaked?: InputMaybe<Scalars['BigInt']>;
    maxCVStaked_not?: InputMaybe<Scalars['BigInt']>;
    maxCVStaked_gt?: InputMaybe<Scalars['BigInt']>;
    maxCVStaked_lt?: InputMaybe<Scalars['BigInt']>;
    maxCVStaked_gte?: InputMaybe<Scalars['BigInt']>;
    maxCVStaked_lte?: InputMaybe<Scalars['BigInt']>;
    maxCVStaked_in?: InputMaybe<Array<Scalars['BigInt']>>;
    maxCVStaked_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
    stakedAmount?: InputMaybe<Scalars['BigInt']>;
    stakedAmount_not?: InputMaybe<Scalars['BigInt']>;
    stakedAmount_gt?: InputMaybe<Scalars['BigInt']>;
    stakedAmount_lt?: InputMaybe<Scalars['BigInt']>;
    stakedAmount_gte?: InputMaybe<Scalars['BigInt']>;
    stakedAmount_lte?: InputMaybe<Scalars['BigInt']>;
    stakedAmount_in?: InputMaybe<Array<Scalars['BigInt']>>;
    stakedAmount_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
    submitter?: InputMaybe<Scalars['String']>;
    submitter_not?: InputMaybe<Scalars['String']>;
    submitter_gt?: InputMaybe<Scalars['String']>;
    submitter_lt?: InputMaybe<Scalars['String']>;
    submitter_gte?: InputMaybe<Scalars['String']>;
    submitter_lte?: InputMaybe<Scalars['String']>;
    submitter_in?: InputMaybe<Array<Scalars['String']>>;
    submitter_not_in?: InputMaybe<Array<Scalars['String']>>;
    submitter_contains?: InputMaybe<Scalars['String']>;
    submitter_contains_nocase?: InputMaybe<Scalars['String']>;
    submitter_not_contains?: InputMaybe<Scalars['String']>;
    submitter_not_contains_nocase?: InputMaybe<Scalars['String']>;
    submitter_starts_with?: InputMaybe<Scalars['String']>;
    submitter_starts_with_nocase?: InputMaybe<Scalars['String']>;
    submitter_not_starts_with?: InputMaybe<Scalars['String']>;
    submitter_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
    submitter_ends_with?: InputMaybe<Scalars['String']>;
    submitter_ends_with_nocase?: InputMaybe<Scalars['String']>;
    submitter_not_ends_with?: InputMaybe<Scalars['String']>;
    submitter_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
    createdAt?: InputMaybe<Scalars['BigInt']>;
    createdAt_not?: InputMaybe<Scalars['BigInt']>;
    createdAt_gt?: InputMaybe<Scalars['BigInt']>;
    createdAt_lt?: InputMaybe<Scalars['BigInt']>;
    createdAt_gte?: InputMaybe<Scalars['BigInt']>;
    createdAt_lte?: InputMaybe<Scalars['BigInt']>;
    createdAt_in?: InputMaybe<Array<Scalars['BigInt']>>;
    createdAt_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
    updatedAt?: InputMaybe<Scalars['BigInt']>;
    updatedAt_not?: InputMaybe<Scalars['BigInt']>;
    updatedAt_gt?: InputMaybe<Scalars['BigInt']>;
    updatedAt_lt?: InputMaybe<Scalars['BigInt']>;
    updatedAt_gte?: InputMaybe<Scalars['BigInt']>;
    updatedAt_lte?: InputMaybe<Scalars['BigInt']>;
    updatedAt_in?: InputMaybe<Array<Scalars['BigInt']>>;
    updatedAt_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
    /** Filter for the block changed event. */
    _change_block?: InputMaybe<BlockChangedFilter>;
    and?: InputMaybe<Array<InputMaybe<CVProposal_filter>>>;
    or?: InputMaybe<Array<InputMaybe<CVProposal_filter>>>;
};
export type CVProposal_orderBy = 'id' | 'proposalNumber' | 'metadata' | 'version' | 'strategy' | 'strategy__id' | 'strategy__poolId' | 'strategy__poolAmount' | 'strategy__metadata' | 'strategy__maxCVSupply' | 'strategy__totalEffectiveActivePoints' | 'strategy__isEnabled' | 'beneficiary' | 'requestedAmount' | 'requestedToken' | 'proposalStatus' | 'blockLast' | 'convictionLast' | 'threshold' | 'maxCVStaked' | 'stakedAmount' | 'submitter' | 'createdAt' | 'updatedAt';
export type CVStrategy = {
    id: Scalars['ID'];
    poolId: Scalars['BigInt'];
    poolAmount: Scalars['BigInt'];
    metadata?: Maybe<Scalars['String']>;
    registryCommunity: RegistryCommunity;
    config: CVStrategyConfig;
    proposals: Array<CVProposal>;
    memberActive?: Maybe<Array<Member>>;
    maxCVSupply: Scalars['BigInt'];
    totalEffectiveActivePoints: Scalars['BigInt'];
    isEnabled: Scalars['Boolean'];
};
export type CVStrategyproposalsArgs = {
    skip?: InputMaybe<Scalars['Int']>;
    first?: InputMaybe<Scalars['Int']>;
    orderBy?: InputMaybe<CVProposal_orderBy>;
    orderDirection?: InputMaybe<OrderDirection>;
    where?: InputMaybe<CVProposal_filter>;
};
export type CVStrategymemberActiveArgs = {
    skip?: InputMaybe<Scalars['Int']>;
    first?: InputMaybe<Scalars['Int']>;
    orderBy?: InputMaybe<Member_orderBy>;
    orderDirection?: InputMaybe<OrderDirection>;
    where?: InputMaybe<Member_filter>;
};
export type CVStrategyConfig = {
    id: Scalars['ID'];
    strategy: CVStrategy;
    D: Scalars['BigInt'];
    decay: Scalars['BigInt'];
    maxRatio: Scalars['BigInt'];
    minThresholdPoints: Scalars['BigInt'];
    weight: Scalars['BigInt'];
    proposalType: Scalars['BigInt'];
    pointSystem: Scalars['BigInt'];
    maxAmount?: Maybe<Scalars['BigInt']>;
};
export type CVStrategyConfig_filter = {
    id?: InputMaybe<Scalars['ID']>;
    id_not?: InputMaybe<Scalars['ID']>;
    id_gt?: InputMaybe<Scalars['ID']>;
    id_lt?: InputMaybe<Scalars['ID']>;
    id_gte?: InputMaybe<Scalars['ID']>;
    id_lte?: InputMaybe<Scalars['ID']>;
    id_in?: InputMaybe<Array<Scalars['ID']>>;
    id_not_in?: InputMaybe<Array<Scalars['ID']>>;
    strategy_?: InputMaybe<CVStrategy_filter>;
    D?: InputMaybe<Scalars['BigInt']>;
    D_not?: InputMaybe<Scalars['BigInt']>;
    D_gt?: InputMaybe<Scalars['BigInt']>;
    D_lt?: InputMaybe<Scalars['BigInt']>;
    D_gte?: InputMaybe<Scalars['BigInt']>;
    D_lte?: InputMaybe<Scalars['BigInt']>;
    D_in?: InputMaybe<Array<Scalars['BigInt']>>;
    D_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
    decay?: InputMaybe<Scalars['BigInt']>;
    decay_not?: InputMaybe<Scalars['BigInt']>;
    decay_gt?: InputMaybe<Scalars['BigInt']>;
    decay_lt?: InputMaybe<Scalars['BigInt']>;
    decay_gte?: InputMaybe<Scalars['BigInt']>;
    decay_lte?: InputMaybe<Scalars['BigInt']>;
    decay_in?: InputMaybe<Array<Scalars['BigInt']>>;
    decay_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
    maxRatio?: InputMaybe<Scalars['BigInt']>;
    maxRatio_not?: InputMaybe<Scalars['BigInt']>;
    maxRatio_gt?: InputMaybe<Scalars['BigInt']>;
    maxRatio_lt?: InputMaybe<Scalars['BigInt']>;
    maxRatio_gte?: InputMaybe<Scalars['BigInt']>;
    maxRatio_lte?: InputMaybe<Scalars['BigInt']>;
    maxRatio_in?: InputMaybe<Array<Scalars['BigInt']>>;
    maxRatio_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
    minThresholdPoints?: InputMaybe<Scalars['BigInt']>;
    minThresholdPoints_not?: InputMaybe<Scalars['BigInt']>;
    minThresholdPoints_gt?: InputMaybe<Scalars['BigInt']>;
    minThresholdPoints_lt?: InputMaybe<Scalars['BigInt']>;
    minThresholdPoints_gte?: InputMaybe<Scalars['BigInt']>;
    minThresholdPoints_lte?: InputMaybe<Scalars['BigInt']>;
    minThresholdPoints_in?: InputMaybe<Array<Scalars['BigInt']>>;
    minThresholdPoints_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
    weight?: InputMaybe<Scalars['BigInt']>;
    weight_not?: InputMaybe<Scalars['BigInt']>;
    weight_gt?: InputMaybe<Scalars['BigInt']>;
    weight_lt?: InputMaybe<Scalars['BigInt']>;
    weight_gte?: InputMaybe<Scalars['BigInt']>;
    weight_lte?: InputMaybe<Scalars['BigInt']>;
    weight_in?: InputMaybe<Array<Scalars['BigInt']>>;
    weight_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
    proposalType?: InputMaybe<Scalars['BigInt']>;
    proposalType_not?: InputMaybe<Scalars['BigInt']>;
    proposalType_gt?: InputMaybe<Scalars['BigInt']>;
    proposalType_lt?: InputMaybe<Scalars['BigInt']>;
    proposalType_gte?: InputMaybe<Scalars['BigInt']>;
    proposalType_lte?: InputMaybe<Scalars['BigInt']>;
    proposalType_in?: InputMaybe<Array<Scalars['BigInt']>>;
    proposalType_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
    pointSystem?: InputMaybe<Scalars['BigInt']>;
    pointSystem_not?: InputMaybe<Scalars['BigInt']>;
    pointSystem_gt?: InputMaybe<Scalars['BigInt']>;
    pointSystem_lt?: InputMaybe<Scalars['BigInt']>;
    pointSystem_gte?: InputMaybe<Scalars['BigInt']>;
    pointSystem_lte?: InputMaybe<Scalars['BigInt']>;
    pointSystem_in?: InputMaybe<Array<Scalars['BigInt']>>;
    pointSystem_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
    maxAmount?: InputMaybe<Scalars['BigInt']>;
    maxAmount_not?: InputMaybe<Scalars['BigInt']>;
    maxAmount_gt?: InputMaybe<Scalars['BigInt']>;
    maxAmount_lt?: InputMaybe<Scalars['BigInt']>;
    maxAmount_gte?: InputMaybe<Scalars['BigInt']>;
    maxAmount_lte?: InputMaybe<Scalars['BigInt']>;
    maxAmount_in?: InputMaybe<Array<Scalars['BigInt']>>;
    maxAmount_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
    /** Filter for the block changed event. */
    _change_block?: InputMaybe<BlockChangedFilter>;
    and?: InputMaybe<Array<InputMaybe<CVStrategyConfig_filter>>>;
    or?: InputMaybe<Array<InputMaybe<CVStrategyConfig_filter>>>;
};
export type CVStrategyConfig_orderBy = 'id' | 'strategy' | 'strategy__id' | 'strategy__poolId' | 'strategy__poolAmount' | 'strategy__metadata' | 'strategy__maxCVSupply' | 'strategy__totalEffectiveActivePoints' | 'strategy__isEnabled' | 'D' | 'decay' | 'maxRatio' | 'minThresholdPoints' | 'weight' | 'proposalType' | 'pointSystem' | 'maxAmount';
export type CVStrategy_filter = {
    id?: InputMaybe<Scalars['ID']>;
    id_not?: InputMaybe<Scalars['ID']>;
    id_gt?: InputMaybe<Scalars['ID']>;
    id_lt?: InputMaybe<Scalars['ID']>;
    id_gte?: InputMaybe<Scalars['ID']>;
    id_lte?: InputMaybe<Scalars['ID']>;
    id_in?: InputMaybe<Array<Scalars['ID']>>;
    id_not_in?: InputMaybe<Array<Scalars['ID']>>;
    poolId?: InputMaybe<Scalars['BigInt']>;
    poolId_not?: InputMaybe<Scalars['BigInt']>;
    poolId_gt?: InputMaybe<Scalars['BigInt']>;
    poolId_lt?: InputMaybe<Scalars['BigInt']>;
    poolId_gte?: InputMaybe<Scalars['BigInt']>;
    poolId_lte?: InputMaybe<Scalars['BigInt']>;
    poolId_in?: InputMaybe<Array<Scalars['BigInt']>>;
    poolId_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
    poolAmount?: InputMaybe<Scalars['BigInt']>;
    poolAmount_not?: InputMaybe<Scalars['BigInt']>;
    poolAmount_gt?: InputMaybe<Scalars['BigInt']>;
    poolAmount_lt?: InputMaybe<Scalars['BigInt']>;
    poolAmount_gte?: InputMaybe<Scalars['BigInt']>;
    poolAmount_lte?: InputMaybe<Scalars['BigInt']>;
    poolAmount_in?: InputMaybe<Array<Scalars['BigInt']>>;
    poolAmount_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
    metadata?: InputMaybe<Scalars['String']>;
    metadata_not?: InputMaybe<Scalars['String']>;
    metadata_gt?: InputMaybe<Scalars['String']>;
    metadata_lt?: InputMaybe<Scalars['String']>;
    metadata_gte?: InputMaybe<Scalars['String']>;
    metadata_lte?: InputMaybe<Scalars['String']>;
    metadata_in?: InputMaybe<Array<Scalars['String']>>;
    metadata_not_in?: InputMaybe<Array<Scalars['String']>>;
    metadata_contains?: InputMaybe<Scalars['String']>;
    metadata_contains_nocase?: InputMaybe<Scalars['String']>;
    metadata_not_contains?: InputMaybe<Scalars['String']>;
    metadata_not_contains_nocase?: InputMaybe<Scalars['String']>;
    metadata_starts_with?: InputMaybe<Scalars['String']>;
    metadata_starts_with_nocase?: InputMaybe<Scalars['String']>;
    metadata_not_starts_with?: InputMaybe<Scalars['String']>;
    metadata_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
    metadata_ends_with?: InputMaybe<Scalars['String']>;
    metadata_ends_with_nocase?: InputMaybe<Scalars['String']>;
    metadata_not_ends_with?: InputMaybe<Scalars['String']>;
    metadata_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
    registryCommunity?: InputMaybe<Scalars['String']>;
    registryCommunity_not?: InputMaybe<Scalars['String']>;
    registryCommunity_gt?: InputMaybe<Scalars['String']>;
    registryCommunity_lt?: InputMaybe<Scalars['String']>;
    registryCommunity_gte?: InputMaybe<Scalars['String']>;
    registryCommunity_lte?: InputMaybe<Scalars['String']>;
    registryCommunity_in?: InputMaybe<Array<Scalars['String']>>;
    registryCommunity_not_in?: InputMaybe<Array<Scalars['String']>>;
    registryCommunity_contains?: InputMaybe<Scalars['String']>;
    registryCommunity_contains_nocase?: InputMaybe<Scalars['String']>;
    registryCommunity_not_contains?: InputMaybe<Scalars['String']>;
    registryCommunity_not_contains_nocase?: InputMaybe<Scalars['String']>;
    registryCommunity_starts_with?: InputMaybe<Scalars['String']>;
    registryCommunity_starts_with_nocase?: InputMaybe<Scalars['String']>;
    registryCommunity_not_starts_with?: InputMaybe<Scalars['String']>;
    registryCommunity_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
    registryCommunity_ends_with?: InputMaybe<Scalars['String']>;
    registryCommunity_ends_with_nocase?: InputMaybe<Scalars['String']>;
    registryCommunity_not_ends_with?: InputMaybe<Scalars['String']>;
    registryCommunity_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
    registryCommunity_?: InputMaybe<RegistryCommunity_filter>;
    config?: InputMaybe<Scalars['String']>;
    config_not?: InputMaybe<Scalars['String']>;
    config_gt?: InputMaybe<Scalars['String']>;
    config_lt?: InputMaybe<Scalars['String']>;
    config_gte?: InputMaybe<Scalars['String']>;
    config_lte?: InputMaybe<Scalars['String']>;
    config_in?: InputMaybe<Array<Scalars['String']>>;
    config_not_in?: InputMaybe<Array<Scalars['String']>>;
    config_contains?: InputMaybe<Scalars['String']>;
    config_contains_nocase?: InputMaybe<Scalars['String']>;
    config_not_contains?: InputMaybe<Scalars['String']>;
    config_not_contains_nocase?: InputMaybe<Scalars['String']>;
    config_starts_with?: InputMaybe<Scalars['String']>;
    config_starts_with_nocase?: InputMaybe<Scalars['String']>;
    config_not_starts_with?: InputMaybe<Scalars['String']>;
    config_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
    config_ends_with?: InputMaybe<Scalars['String']>;
    config_ends_with_nocase?: InputMaybe<Scalars['String']>;
    config_not_ends_with?: InputMaybe<Scalars['String']>;
    config_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
    config_?: InputMaybe<CVStrategyConfig_filter>;
    proposals_?: InputMaybe<CVProposal_filter>;
    memberActive?: InputMaybe<Array<Scalars['String']>>;
    memberActive_not?: InputMaybe<Array<Scalars['String']>>;
    memberActive_contains?: InputMaybe<Array<Scalars['String']>>;
    memberActive_contains_nocase?: InputMaybe<Array<Scalars['String']>>;
    memberActive_not_contains?: InputMaybe<Array<Scalars['String']>>;
    memberActive_not_contains_nocase?: InputMaybe<Array<Scalars['String']>>;
    memberActive_?: InputMaybe<Member_filter>;
    maxCVSupply?: InputMaybe<Scalars['BigInt']>;
    maxCVSupply_not?: InputMaybe<Scalars['BigInt']>;
    maxCVSupply_gt?: InputMaybe<Scalars['BigInt']>;
    maxCVSupply_lt?: InputMaybe<Scalars['BigInt']>;
    maxCVSupply_gte?: InputMaybe<Scalars['BigInt']>;
    maxCVSupply_lte?: InputMaybe<Scalars['BigInt']>;
    maxCVSupply_in?: InputMaybe<Array<Scalars['BigInt']>>;
    maxCVSupply_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
    totalEffectiveActivePoints?: InputMaybe<Scalars['BigInt']>;
    totalEffectiveActivePoints_not?: InputMaybe<Scalars['BigInt']>;
    totalEffectiveActivePoints_gt?: InputMaybe<Scalars['BigInt']>;
    totalEffectiveActivePoints_lt?: InputMaybe<Scalars['BigInt']>;
    totalEffectiveActivePoints_gte?: InputMaybe<Scalars['BigInt']>;
    totalEffectiveActivePoints_lte?: InputMaybe<Scalars['BigInt']>;
    totalEffectiveActivePoints_in?: InputMaybe<Array<Scalars['BigInt']>>;
    totalEffectiveActivePoints_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
    isEnabled?: InputMaybe<Scalars['Boolean']>;
    isEnabled_not?: InputMaybe<Scalars['Boolean']>;
    isEnabled_in?: InputMaybe<Array<Scalars['Boolean']>>;
    isEnabled_not_in?: InputMaybe<Array<Scalars['Boolean']>>;
    /** Filter for the block changed event. */
    _change_block?: InputMaybe<BlockChangedFilter>;
    and?: InputMaybe<Array<InputMaybe<CVStrategy_filter>>>;
    or?: InputMaybe<Array<InputMaybe<CVStrategy_filter>>>;
};
export type CVStrategy_orderBy = 'id' | 'poolId' | 'poolAmount' | 'metadata' | 'registryCommunity' | 'registryCommunity__id' | 'registryCommunity__chainId' | 'registryCommunity__strategyTemplate' | 'registryCommunity__profileId' | 'registryCommunity__communityFee' | 'registryCommunity__protocolFee' | 'registryCommunity__communityName' | 'registryCommunity__covenantIpfsHash' | 'registryCommunity__councilSafe' | 'registryCommunity__isKickEnabled' | 'registryCommunity__registerStakeAmount' | 'registryCommunity__registerToken' | 'registryCommunity__alloAddress' | 'registryCommunity__isValid' | 'config' | 'config__id' | 'config__D' | 'config__decay' | 'config__maxRatio' | 'config__minThresholdPoints' | 'config__weight' | 'config__proposalType' | 'config__pointSystem' | 'config__maxAmount' | 'proposals' | 'memberActive' | 'maxCVSupply' | 'totalEffectiveActivePoints' | 'isEnabled';
export type Member = {
    id: Scalars['ID'];
    memberCommunity?: Maybe<Array<MemberCommunity>>;
    stakes?: Maybe<Array<Stake>>;
};
export type MembermemberCommunityArgs = {
    skip?: InputMaybe<Scalars['Int']>;
    first?: InputMaybe<Scalars['Int']>;
    orderBy?: InputMaybe<MemberCommunity_orderBy>;
    orderDirection?: InputMaybe<OrderDirection>;
    where?: InputMaybe<MemberCommunity_filter>;
};
export type MemberstakesArgs = {
    skip?: InputMaybe<Scalars['Int']>;
    first?: InputMaybe<Scalars['Int']>;
    orderBy?: InputMaybe<Stake_orderBy>;
    orderDirection?: InputMaybe<OrderDirection>;
    where?: InputMaybe<Stake_filter>;
};
export type MemberCommunity = {
    id: Scalars['ID'];
    memberAddress?: Maybe<Scalars['String']>;
    stakedTokens?: Maybe<Scalars['BigInt']>;
    isRegistered?: Maybe<Scalars['Boolean']>;
    member: Member;
    registryCommunity: RegistryCommunity;
};
export type MemberCommunity_filter = {
    id?: InputMaybe<Scalars['ID']>;
    id_not?: InputMaybe<Scalars['ID']>;
    id_gt?: InputMaybe<Scalars['ID']>;
    id_lt?: InputMaybe<Scalars['ID']>;
    id_gte?: InputMaybe<Scalars['ID']>;
    id_lte?: InputMaybe<Scalars['ID']>;
    id_in?: InputMaybe<Array<Scalars['ID']>>;
    id_not_in?: InputMaybe<Array<Scalars['ID']>>;
    memberAddress?: InputMaybe<Scalars['String']>;
    memberAddress_not?: InputMaybe<Scalars['String']>;
    memberAddress_gt?: InputMaybe<Scalars['String']>;
    memberAddress_lt?: InputMaybe<Scalars['String']>;
    memberAddress_gte?: InputMaybe<Scalars['String']>;
    memberAddress_lte?: InputMaybe<Scalars['String']>;
    memberAddress_in?: InputMaybe<Array<Scalars['String']>>;
    memberAddress_not_in?: InputMaybe<Array<Scalars['String']>>;
    memberAddress_contains?: InputMaybe<Scalars['String']>;
    memberAddress_contains_nocase?: InputMaybe<Scalars['String']>;
    memberAddress_not_contains?: InputMaybe<Scalars['String']>;
    memberAddress_not_contains_nocase?: InputMaybe<Scalars['String']>;
    memberAddress_starts_with?: InputMaybe<Scalars['String']>;
    memberAddress_starts_with_nocase?: InputMaybe<Scalars['String']>;
    memberAddress_not_starts_with?: InputMaybe<Scalars['String']>;
    memberAddress_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
    memberAddress_ends_with?: InputMaybe<Scalars['String']>;
    memberAddress_ends_with_nocase?: InputMaybe<Scalars['String']>;
    memberAddress_not_ends_with?: InputMaybe<Scalars['String']>;
    memberAddress_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
    stakedTokens?: InputMaybe<Scalars['BigInt']>;
    stakedTokens_not?: InputMaybe<Scalars['BigInt']>;
    stakedTokens_gt?: InputMaybe<Scalars['BigInt']>;
    stakedTokens_lt?: InputMaybe<Scalars['BigInt']>;
    stakedTokens_gte?: InputMaybe<Scalars['BigInt']>;
    stakedTokens_lte?: InputMaybe<Scalars['BigInt']>;
    stakedTokens_in?: InputMaybe<Array<Scalars['BigInt']>>;
    stakedTokens_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
    isRegistered?: InputMaybe<Scalars['Boolean']>;
    isRegistered_not?: InputMaybe<Scalars['Boolean']>;
    isRegistered_in?: InputMaybe<Array<Scalars['Boolean']>>;
    isRegistered_not_in?: InputMaybe<Array<Scalars['Boolean']>>;
    member?: InputMaybe<Scalars['String']>;
    member_not?: InputMaybe<Scalars['String']>;
    member_gt?: InputMaybe<Scalars['String']>;
    member_lt?: InputMaybe<Scalars['String']>;
    member_gte?: InputMaybe<Scalars['String']>;
    member_lte?: InputMaybe<Scalars['String']>;
    member_in?: InputMaybe<Array<Scalars['String']>>;
    member_not_in?: InputMaybe<Array<Scalars['String']>>;
    member_contains?: InputMaybe<Scalars['String']>;
    member_contains_nocase?: InputMaybe<Scalars['String']>;
    member_not_contains?: InputMaybe<Scalars['String']>;
    member_not_contains_nocase?: InputMaybe<Scalars['String']>;
    member_starts_with?: InputMaybe<Scalars['String']>;
    member_starts_with_nocase?: InputMaybe<Scalars['String']>;
    member_not_starts_with?: InputMaybe<Scalars['String']>;
    member_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
    member_ends_with?: InputMaybe<Scalars['String']>;
    member_ends_with_nocase?: InputMaybe<Scalars['String']>;
    member_not_ends_with?: InputMaybe<Scalars['String']>;
    member_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
    member_?: InputMaybe<Member_filter>;
    registryCommunity?: InputMaybe<Scalars['String']>;
    registryCommunity_not?: InputMaybe<Scalars['String']>;
    registryCommunity_gt?: InputMaybe<Scalars['String']>;
    registryCommunity_lt?: InputMaybe<Scalars['String']>;
    registryCommunity_gte?: InputMaybe<Scalars['String']>;
    registryCommunity_lte?: InputMaybe<Scalars['String']>;
    registryCommunity_in?: InputMaybe<Array<Scalars['String']>>;
    registryCommunity_not_in?: InputMaybe<Array<Scalars['String']>>;
    registryCommunity_contains?: InputMaybe<Scalars['String']>;
    registryCommunity_contains_nocase?: InputMaybe<Scalars['String']>;
    registryCommunity_not_contains?: InputMaybe<Scalars['String']>;
    registryCommunity_not_contains_nocase?: InputMaybe<Scalars['String']>;
    registryCommunity_starts_with?: InputMaybe<Scalars['String']>;
    registryCommunity_starts_with_nocase?: InputMaybe<Scalars['String']>;
    registryCommunity_not_starts_with?: InputMaybe<Scalars['String']>;
    registryCommunity_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
    registryCommunity_ends_with?: InputMaybe<Scalars['String']>;
    registryCommunity_ends_with_nocase?: InputMaybe<Scalars['String']>;
    registryCommunity_not_ends_with?: InputMaybe<Scalars['String']>;
    registryCommunity_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
    registryCommunity_?: InputMaybe<RegistryCommunity_filter>;
    /** Filter for the block changed event. */
    _change_block?: InputMaybe<BlockChangedFilter>;
    and?: InputMaybe<Array<InputMaybe<MemberCommunity_filter>>>;
    or?: InputMaybe<Array<InputMaybe<MemberCommunity_filter>>>;
};
export type MemberCommunity_orderBy = 'id' | 'memberAddress' | 'stakedTokens' | 'isRegistered' | 'member' | 'member__id' | 'registryCommunity' | 'registryCommunity__id' | 'registryCommunity__chainId' | 'registryCommunity__strategyTemplate' | 'registryCommunity__profileId' | 'registryCommunity__communityFee' | 'registryCommunity__protocolFee' | 'registryCommunity__communityName' | 'registryCommunity__covenantIpfsHash' | 'registryCommunity__councilSafe' | 'registryCommunity__isKickEnabled' | 'registryCommunity__registerStakeAmount' | 'registryCommunity__registerToken' | 'registryCommunity__alloAddress' | 'registryCommunity__isValid';
export type MemberStrategy = {
    id: Scalars['ID'];
    member: Member;
    strategy: CVStrategy;
    totalStakedPoints: Scalars['BigInt'];
    activatedPoints?: Maybe<Scalars['BigInt']>;
};
export type MemberStrategy_filter = {
    id?: InputMaybe<Scalars['ID']>;
    id_not?: InputMaybe<Scalars['ID']>;
    id_gt?: InputMaybe<Scalars['ID']>;
    id_lt?: InputMaybe<Scalars['ID']>;
    id_gte?: InputMaybe<Scalars['ID']>;
    id_lte?: InputMaybe<Scalars['ID']>;
    id_in?: InputMaybe<Array<Scalars['ID']>>;
    id_not_in?: InputMaybe<Array<Scalars['ID']>>;
    member?: InputMaybe<Scalars['String']>;
    member_not?: InputMaybe<Scalars['String']>;
    member_gt?: InputMaybe<Scalars['String']>;
    member_lt?: InputMaybe<Scalars['String']>;
    member_gte?: InputMaybe<Scalars['String']>;
    member_lte?: InputMaybe<Scalars['String']>;
    member_in?: InputMaybe<Array<Scalars['String']>>;
    member_not_in?: InputMaybe<Array<Scalars['String']>>;
    member_contains?: InputMaybe<Scalars['String']>;
    member_contains_nocase?: InputMaybe<Scalars['String']>;
    member_not_contains?: InputMaybe<Scalars['String']>;
    member_not_contains_nocase?: InputMaybe<Scalars['String']>;
    member_starts_with?: InputMaybe<Scalars['String']>;
    member_starts_with_nocase?: InputMaybe<Scalars['String']>;
    member_not_starts_with?: InputMaybe<Scalars['String']>;
    member_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
    member_ends_with?: InputMaybe<Scalars['String']>;
    member_ends_with_nocase?: InputMaybe<Scalars['String']>;
    member_not_ends_with?: InputMaybe<Scalars['String']>;
    member_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
    member_?: InputMaybe<Member_filter>;
    strategy?: InputMaybe<Scalars['String']>;
    strategy_not?: InputMaybe<Scalars['String']>;
    strategy_gt?: InputMaybe<Scalars['String']>;
    strategy_lt?: InputMaybe<Scalars['String']>;
    strategy_gte?: InputMaybe<Scalars['String']>;
    strategy_lte?: InputMaybe<Scalars['String']>;
    strategy_in?: InputMaybe<Array<Scalars['String']>>;
    strategy_not_in?: InputMaybe<Array<Scalars['String']>>;
    strategy_contains?: InputMaybe<Scalars['String']>;
    strategy_contains_nocase?: InputMaybe<Scalars['String']>;
    strategy_not_contains?: InputMaybe<Scalars['String']>;
    strategy_not_contains_nocase?: InputMaybe<Scalars['String']>;
    strategy_starts_with?: InputMaybe<Scalars['String']>;
    strategy_starts_with_nocase?: InputMaybe<Scalars['String']>;
    strategy_not_starts_with?: InputMaybe<Scalars['String']>;
    strategy_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
    strategy_ends_with?: InputMaybe<Scalars['String']>;
    strategy_ends_with_nocase?: InputMaybe<Scalars['String']>;
    strategy_not_ends_with?: InputMaybe<Scalars['String']>;
    strategy_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
    strategy_?: InputMaybe<CVStrategy_filter>;
    totalStakedPoints?: InputMaybe<Scalars['BigInt']>;
    totalStakedPoints_not?: InputMaybe<Scalars['BigInt']>;
    totalStakedPoints_gt?: InputMaybe<Scalars['BigInt']>;
    totalStakedPoints_lt?: InputMaybe<Scalars['BigInt']>;
    totalStakedPoints_gte?: InputMaybe<Scalars['BigInt']>;
    totalStakedPoints_lte?: InputMaybe<Scalars['BigInt']>;
    totalStakedPoints_in?: InputMaybe<Array<Scalars['BigInt']>>;
    totalStakedPoints_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
    activatedPoints?: InputMaybe<Scalars['BigInt']>;
    activatedPoints_not?: InputMaybe<Scalars['BigInt']>;
    activatedPoints_gt?: InputMaybe<Scalars['BigInt']>;
    activatedPoints_lt?: InputMaybe<Scalars['BigInt']>;
    activatedPoints_gte?: InputMaybe<Scalars['BigInt']>;
    activatedPoints_lte?: InputMaybe<Scalars['BigInt']>;
    activatedPoints_in?: InputMaybe<Array<Scalars['BigInt']>>;
    activatedPoints_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
    /** Filter for the block changed event. */
    _change_block?: InputMaybe<BlockChangedFilter>;
    and?: InputMaybe<Array<InputMaybe<MemberStrategy_filter>>>;
    or?: InputMaybe<Array<InputMaybe<MemberStrategy_filter>>>;
};
export type MemberStrategy_orderBy = 'id' | 'member' | 'member__id' | 'strategy' | 'strategy__id' | 'strategy__poolId' | 'strategy__poolAmount' | 'strategy__metadata' | 'strategy__maxCVSupply' | 'strategy__totalEffectiveActivePoints' | 'strategy__isEnabled' | 'totalStakedPoints' | 'activatedPoints';
export type Member_filter = {
    id?: InputMaybe<Scalars['ID']>;
    id_not?: InputMaybe<Scalars['ID']>;
    id_gt?: InputMaybe<Scalars['ID']>;
    id_lt?: InputMaybe<Scalars['ID']>;
    id_gte?: InputMaybe<Scalars['ID']>;
    id_lte?: InputMaybe<Scalars['ID']>;
    id_in?: InputMaybe<Array<Scalars['ID']>>;
    id_not_in?: InputMaybe<Array<Scalars['ID']>>;
    memberCommunity_?: InputMaybe<MemberCommunity_filter>;
    stakes_?: InputMaybe<Stake_filter>;
    /** Filter for the block changed event. */
    _change_block?: InputMaybe<BlockChangedFilter>;
    and?: InputMaybe<Array<InputMaybe<Member_filter>>>;
    or?: InputMaybe<Array<InputMaybe<Member_filter>>>;
};
export type Member_orderBy = 'id' | 'memberCommunity' | 'stakes';
/** Defines the order direction, either ascending or descending */
export type OrderDirection = 'asc' | 'desc';
export type PassportScorer = {
    id: Scalars['ID'];
    strategies?: Maybe<Array<PassportStrategy>>;
    users?: Maybe<Array<PassportUser>>;
};
export type PassportScorerstrategiesArgs = {
    skip?: InputMaybe<Scalars['Int']>;
    first?: InputMaybe<Scalars['Int']>;
    orderBy?: InputMaybe<PassportStrategy_orderBy>;
    orderDirection?: InputMaybe<OrderDirection>;
    where?: InputMaybe<PassportStrategy_filter>;
};
export type PassportScorerusersArgs = {
    skip?: InputMaybe<Scalars['Int']>;
    first?: InputMaybe<Scalars['Int']>;
    orderBy?: InputMaybe<PassportUser_orderBy>;
    orderDirection?: InputMaybe<OrderDirection>;
    where?: InputMaybe<PassportUser_filter>;
};
export type PassportScorer_filter = {
    id?: InputMaybe<Scalars['ID']>;
    id_not?: InputMaybe<Scalars['ID']>;
    id_gt?: InputMaybe<Scalars['ID']>;
    id_lt?: InputMaybe<Scalars['ID']>;
    id_gte?: InputMaybe<Scalars['ID']>;
    id_lte?: InputMaybe<Scalars['ID']>;
    id_in?: InputMaybe<Array<Scalars['ID']>>;
    id_not_in?: InputMaybe<Array<Scalars['ID']>>;
    strategies_?: InputMaybe<PassportStrategy_filter>;
    users_?: InputMaybe<PassportUser_filter>;
    /** Filter for the block changed event. */
    _change_block?: InputMaybe<BlockChangedFilter>;
    and?: InputMaybe<Array<InputMaybe<PassportScorer_filter>>>;
    or?: InputMaybe<Array<InputMaybe<PassportScorer_filter>>>;
};
export type PassportScorer_orderBy = 'id' | 'strategies' | 'users';
export type PassportStrategy = {
    id: Scalars['ID'];
    passportScorer: PassportScorer;
    strategy: CVStrategy;
    threshold: Scalars['BigInt'];
    councilSafe: Scalars['String'];
    active: Scalars['Boolean'];
};
export type PassportStrategy_filter = {
    id?: InputMaybe<Scalars['ID']>;
    id_not?: InputMaybe<Scalars['ID']>;
    id_gt?: InputMaybe<Scalars['ID']>;
    id_lt?: InputMaybe<Scalars['ID']>;
    id_gte?: InputMaybe<Scalars['ID']>;
    id_lte?: InputMaybe<Scalars['ID']>;
    id_in?: InputMaybe<Array<Scalars['ID']>>;
    id_not_in?: InputMaybe<Array<Scalars['ID']>>;
    passportScorer?: InputMaybe<Scalars['String']>;
    passportScorer_not?: InputMaybe<Scalars['String']>;
    passportScorer_gt?: InputMaybe<Scalars['String']>;
    passportScorer_lt?: InputMaybe<Scalars['String']>;
    passportScorer_gte?: InputMaybe<Scalars['String']>;
    passportScorer_lte?: InputMaybe<Scalars['String']>;
    passportScorer_in?: InputMaybe<Array<Scalars['String']>>;
    passportScorer_not_in?: InputMaybe<Array<Scalars['String']>>;
    passportScorer_contains?: InputMaybe<Scalars['String']>;
    passportScorer_contains_nocase?: InputMaybe<Scalars['String']>;
    passportScorer_not_contains?: InputMaybe<Scalars['String']>;
    passportScorer_not_contains_nocase?: InputMaybe<Scalars['String']>;
    passportScorer_starts_with?: InputMaybe<Scalars['String']>;
    passportScorer_starts_with_nocase?: InputMaybe<Scalars['String']>;
    passportScorer_not_starts_with?: InputMaybe<Scalars['String']>;
    passportScorer_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
    passportScorer_ends_with?: InputMaybe<Scalars['String']>;
    passportScorer_ends_with_nocase?: InputMaybe<Scalars['String']>;
    passportScorer_not_ends_with?: InputMaybe<Scalars['String']>;
    passportScorer_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
    passportScorer_?: InputMaybe<PassportScorer_filter>;
    strategy?: InputMaybe<Scalars['String']>;
    strategy_not?: InputMaybe<Scalars['String']>;
    strategy_gt?: InputMaybe<Scalars['String']>;
    strategy_lt?: InputMaybe<Scalars['String']>;
    strategy_gte?: InputMaybe<Scalars['String']>;
    strategy_lte?: InputMaybe<Scalars['String']>;
    strategy_in?: InputMaybe<Array<Scalars['String']>>;
    strategy_not_in?: InputMaybe<Array<Scalars['String']>>;
    strategy_contains?: InputMaybe<Scalars['String']>;
    strategy_contains_nocase?: InputMaybe<Scalars['String']>;
    strategy_not_contains?: InputMaybe<Scalars['String']>;
    strategy_not_contains_nocase?: InputMaybe<Scalars['String']>;
    strategy_starts_with?: InputMaybe<Scalars['String']>;
    strategy_starts_with_nocase?: InputMaybe<Scalars['String']>;
    strategy_not_starts_with?: InputMaybe<Scalars['String']>;
    strategy_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
    strategy_ends_with?: InputMaybe<Scalars['String']>;
    strategy_ends_with_nocase?: InputMaybe<Scalars['String']>;
    strategy_not_ends_with?: InputMaybe<Scalars['String']>;
    strategy_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
    strategy_?: InputMaybe<CVStrategy_filter>;
    threshold?: InputMaybe<Scalars['BigInt']>;
    threshold_not?: InputMaybe<Scalars['BigInt']>;
    threshold_gt?: InputMaybe<Scalars['BigInt']>;
    threshold_lt?: InputMaybe<Scalars['BigInt']>;
    threshold_gte?: InputMaybe<Scalars['BigInt']>;
    threshold_lte?: InputMaybe<Scalars['BigInt']>;
    threshold_in?: InputMaybe<Array<Scalars['BigInt']>>;
    threshold_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
    councilSafe?: InputMaybe<Scalars['String']>;
    councilSafe_not?: InputMaybe<Scalars['String']>;
    councilSafe_gt?: InputMaybe<Scalars['String']>;
    councilSafe_lt?: InputMaybe<Scalars['String']>;
    councilSafe_gte?: InputMaybe<Scalars['String']>;
    councilSafe_lte?: InputMaybe<Scalars['String']>;
    councilSafe_in?: InputMaybe<Array<Scalars['String']>>;
    councilSafe_not_in?: InputMaybe<Array<Scalars['String']>>;
    councilSafe_contains?: InputMaybe<Scalars['String']>;
    councilSafe_contains_nocase?: InputMaybe<Scalars['String']>;
    councilSafe_not_contains?: InputMaybe<Scalars['String']>;
    councilSafe_not_contains_nocase?: InputMaybe<Scalars['String']>;
    councilSafe_starts_with?: InputMaybe<Scalars['String']>;
    councilSafe_starts_with_nocase?: InputMaybe<Scalars['String']>;
    councilSafe_not_starts_with?: InputMaybe<Scalars['String']>;
    councilSafe_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
    councilSafe_ends_with?: InputMaybe<Scalars['String']>;
    councilSafe_ends_with_nocase?: InputMaybe<Scalars['String']>;
    councilSafe_not_ends_with?: InputMaybe<Scalars['String']>;
    councilSafe_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
    active?: InputMaybe<Scalars['Boolean']>;
    active_not?: InputMaybe<Scalars['Boolean']>;
    active_in?: InputMaybe<Array<Scalars['Boolean']>>;
    active_not_in?: InputMaybe<Array<Scalars['Boolean']>>;
    /** Filter for the block changed event. */
    _change_block?: InputMaybe<BlockChangedFilter>;
    and?: InputMaybe<Array<InputMaybe<PassportStrategy_filter>>>;
    or?: InputMaybe<Array<InputMaybe<PassportStrategy_filter>>>;
};
export type PassportStrategy_orderBy = 'id' | 'passportScorer' | 'passportScorer__id' | 'strategy' | 'strategy__id' | 'strategy__poolId' | 'strategy__poolAmount' | 'strategy__metadata' | 'strategy__maxCVSupply' | 'strategy__totalEffectiveActivePoints' | 'strategy__isEnabled' | 'threshold' | 'councilSafe' | 'active';
export type PassportUser = {
    id: Scalars['ID'];
    passportScorer: PassportScorer;
    userAddress: Scalars['String'];
    score: Scalars['BigInt'];
    lastUpdated: Scalars['BigInt'];
};
export type PassportUser_filter = {
    id?: InputMaybe<Scalars['ID']>;
    id_not?: InputMaybe<Scalars['ID']>;
    id_gt?: InputMaybe<Scalars['ID']>;
    id_lt?: InputMaybe<Scalars['ID']>;
    id_gte?: InputMaybe<Scalars['ID']>;
    id_lte?: InputMaybe<Scalars['ID']>;
    id_in?: InputMaybe<Array<Scalars['ID']>>;
    id_not_in?: InputMaybe<Array<Scalars['ID']>>;
    passportScorer?: InputMaybe<Scalars['String']>;
    passportScorer_not?: InputMaybe<Scalars['String']>;
    passportScorer_gt?: InputMaybe<Scalars['String']>;
    passportScorer_lt?: InputMaybe<Scalars['String']>;
    passportScorer_gte?: InputMaybe<Scalars['String']>;
    passportScorer_lte?: InputMaybe<Scalars['String']>;
    passportScorer_in?: InputMaybe<Array<Scalars['String']>>;
    passportScorer_not_in?: InputMaybe<Array<Scalars['String']>>;
    passportScorer_contains?: InputMaybe<Scalars['String']>;
    passportScorer_contains_nocase?: InputMaybe<Scalars['String']>;
    passportScorer_not_contains?: InputMaybe<Scalars['String']>;
    passportScorer_not_contains_nocase?: InputMaybe<Scalars['String']>;
    passportScorer_starts_with?: InputMaybe<Scalars['String']>;
    passportScorer_starts_with_nocase?: InputMaybe<Scalars['String']>;
    passportScorer_not_starts_with?: InputMaybe<Scalars['String']>;
    passportScorer_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
    passportScorer_ends_with?: InputMaybe<Scalars['String']>;
    passportScorer_ends_with_nocase?: InputMaybe<Scalars['String']>;
    passportScorer_not_ends_with?: InputMaybe<Scalars['String']>;
    passportScorer_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
    passportScorer_?: InputMaybe<PassportScorer_filter>;
    userAddress?: InputMaybe<Scalars['String']>;
    userAddress_not?: InputMaybe<Scalars['String']>;
    userAddress_gt?: InputMaybe<Scalars['String']>;
    userAddress_lt?: InputMaybe<Scalars['String']>;
    userAddress_gte?: InputMaybe<Scalars['String']>;
    userAddress_lte?: InputMaybe<Scalars['String']>;
    userAddress_in?: InputMaybe<Array<Scalars['String']>>;
    userAddress_not_in?: InputMaybe<Array<Scalars['String']>>;
    userAddress_contains?: InputMaybe<Scalars['String']>;
    userAddress_contains_nocase?: InputMaybe<Scalars['String']>;
    userAddress_not_contains?: InputMaybe<Scalars['String']>;
    userAddress_not_contains_nocase?: InputMaybe<Scalars['String']>;
    userAddress_starts_with?: InputMaybe<Scalars['String']>;
    userAddress_starts_with_nocase?: InputMaybe<Scalars['String']>;
    userAddress_not_starts_with?: InputMaybe<Scalars['String']>;
    userAddress_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
    userAddress_ends_with?: InputMaybe<Scalars['String']>;
    userAddress_ends_with_nocase?: InputMaybe<Scalars['String']>;
    userAddress_not_ends_with?: InputMaybe<Scalars['String']>;
    userAddress_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
    score?: InputMaybe<Scalars['BigInt']>;
    score_not?: InputMaybe<Scalars['BigInt']>;
    score_gt?: InputMaybe<Scalars['BigInt']>;
    score_lt?: InputMaybe<Scalars['BigInt']>;
    score_gte?: InputMaybe<Scalars['BigInt']>;
    score_lte?: InputMaybe<Scalars['BigInt']>;
    score_in?: InputMaybe<Array<Scalars['BigInt']>>;
    score_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
    lastUpdated?: InputMaybe<Scalars['BigInt']>;
    lastUpdated_not?: InputMaybe<Scalars['BigInt']>;
    lastUpdated_gt?: InputMaybe<Scalars['BigInt']>;
    lastUpdated_lt?: InputMaybe<Scalars['BigInt']>;
    lastUpdated_gte?: InputMaybe<Scalars['BigInt']>;
    lastUpdated_lte?: InputMaybe<Scalars['BigInt']>;
    lastUpdated_in?: InputMaybe<Array<Scalars['BigInt']>>;
    lastUpdated_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
    /** Filter for the block changed event. */
    _change_block?: InputMaybe<BlockChangedFilter>;
    and?: InputMaybe<Array<InputMaybe<PassportUser_filter>>>;
    or?: InputMaybe<Array<InputMaybe<PassportUser_filter>>>;
};
export type PassportUser_orderBy = 'id' | 'passportScorer' | 'passportScorer__id' | 'userAddress' | 'score' | 'lastUpdated';
export type Query = {
    cvstrategy?: Maybe<CVStrategy>;
    cvstrategies: Array<CVStrategy>;
    cvstrategyConfig?: Maybe<CVStrategyConfig>;
    cvstrategyConfigs: Array<CVStrategyConfig>;
    cvproposal?: Maybe<CVProposal>;
    cvproposals: Array<CVProposal>;
    registryFactory?: Maybe<RegistryFactory>;
    registryFactories: Array<RegistryFactory>;
    registryCommunity?: Maybe<RegistryCommunity>;
    registryCommunities: Array<RegistryCommunity>;
    member?: Maybe<Member>;
    members: Array<Member>;
    stake?: Maybe<Stake>;
    stakes: Array<Stake>;
    memberCommunity?: Maybe<MemberCommunity>;
    memberCommunities: Array<MemberCommunity>;
    memberStrategy?: Maybe<MemberStrategy>;
    memberStrategies: Array<MemberStrategy>;
    tokenGarden?: Maybe<TokenGarden>;
    tokenGardens: Array<TokenGarden>;
    allo?: Maybe<Allo>;
    allos: Array<Allo>;
    passportScorer?: Maybe<PassportScorer>;
    passportScorers: Array<PassportScorer>;
    passportStrategy?: Maybe<PassportStrategy>;
    passportStrategies: Array<PassportStrategy>;
    passportUser?: Maybe<PassportUser>;
    passportUsers: Array<PassportUser>;
    /** Access to subgraph metadata */
    _meta?: Maybe<_Meta_>;
};
export type QuerycvstrategyArgs = {
    id: Scalars['ID'];
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type QuerycvstrategiesArgs = {
    skip?: InputMaybe<Scalars['Int']>;
    first?: InputMaybe<Scalars['Int']>;
    orderBy?: InputMaybe<CVStrategy_orderBy>;
    orderDirection?: InputMaybe<OrderDirection>;
    where?: InputMaybe<CVStrategy_filter>;
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type QuerycvstrategyConfigArgs = {
    id: Scalars['ID'];
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type QuerycvstrategyConfigsArgs = {
    skip?: InputMaybe<Scalars['Int']>;
    first?: InputMaybe<Scalars['Int']>;
    orderBy?: InputMaybe<CVStrategyConfig_orderBy>;
    orderDirection?: InputMaybe<OrderDirection>;
    where?: InputMaybe<CVStrategyConfig_filter>;
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type QuerycvproposalArgs = {
    id: Scalars['ID'];
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type QuerycvproposalsArgs = {
    skip?: InputMaybe<Scalars['Int']>;
    first?: InputMaybe<Scalars['Int']>;
    orderBy?: InputMaybe<CVProposal_orderBy>;
    orderDirection?: InputMaybe<OrderDirection>;
    where?: InputMaybe<CVProposal_filter>;
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type QueryregistryFactoryArgs = {
    id: Scalars['ID'];
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type QueryregistryFactoriesArgs = {
    skip?: InputMaybe<Scalars['Int']>;
    first?: InputMaybe<Scalars['Int']>;
    orderBy?: InputMaybe<RegistryFactory_orderBy>;
    orderDirection?: InputMaybe<OrderDirection>;
    where?: InputMaybe<RegistryFactory_filter>;
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type QueryregistryCommunityArgs = {
    id: Scalars['ID'];
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type QueryregistryCommunitiesArgs = {
    skip?: InputMaybe<Scalars['Int']>;
    first?: InputMaybe<Scalars['Int']>;
    orderBy?: InputMaybe<RegistryCommunity_orderBy>;
    orderDirection?: InputMaybe<OrderDirection>;
    where?: InputMaybe<RegistryCommunity_filter>;
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type QuerymemberArgs = {
    id: Scalars['ID'];
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type QuerymembersArgs = {
    skip?: InputMaybe<Scalars['Int']>;
    first?: InputMaybe<Scalars['Int']>;
    orderBy?: InputMaybe<Member_orderBy>;
    orderDirection?: InputMaybe<OrderDirection>;
    where?: InputMaybe<Member_filter>;
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type QuerystakeArgs = {
    id: Scalars['ID'];
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type QuerystakesArgs = {
    skip?: InputMaybe<Scalars['Int']>;
    first?: InputMaybe<Scalars['Int']>;
    orderBy?: InputMaybe<Stake_orderBy>;
    orderDirection?: InputMaybe<OrderDirection>;
    where?: InputMaybe<Stake_filter>;
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type QuerymemberCommunityArgs = {
    id: Scalars['ID'];
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type QuerymemberCommunitiesArgs = {
    skip?: InputMaybe<Scalars['Int']>;
    first?: InputMaybe<Scalars['Int']>;
    orderBy?: InputMaybe<MemberCommunity_orderBy>;
    orderDirection?: InputMaybe<OrderDirection>;
    where?: InputMaybe<MemberCommunity_filter>;
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type QuerymemberStrategyArgs = {
    id: Scalars['ID'];
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type QuerymemberStrategiesArgs = {
    skip?: InputMaybe<Scalars['Int']>;
    first?: InputMaybe<Scalars['Int']>;
    orderBy?: InputMaybe<MemberStrategy_orderBy>;
    orderDirection?: InputMaybe<OrderDirection>;
    where?: InputMaybe<MemberStrategy_filter>;
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type QuerytokenGardenArgs = {
    id: Scalars['ID'];
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type QuerytokenGardensArgs = {
    skip?: InputMaybe<Scalars['Int']>;
    first?: InputMaybe<Scalars['Int']>;
    orderBy?: InputMaybe<TokenGarden_orderBy>;
    orderDirection?: InputMaybe<OrderDirection>;
    where?: InputMaybe<TokenGarden_filter>;
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type QueryalloArgs = {
    id: Scalars['ID'];
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type QueryallosArgs = {
    skip?: InputMaybe<Scalars['Int']>;
    first?: InputMaybe<Scalars['Int']>;
    orderBy?: InputMaybe<Allo_orderBy>;
    orderDirection?: InputMaybe<OrderDirection>;
    where?: InputMaybe<Allo_filter>;
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type QuerypassportScorerArgs = {
    id: Scalars['ID'];
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type QuerypassportScorersArgs = {
    skip?: InputMaybe<Scalars['Int']>;
    first?: InputMaybe<Scalars['Int']>;
    orderBy?: InputMaybe<PassportScorer_orderBy>;
    orderDirection?: InputMaybe<OrderDirection>;
    where?: InputMaybe<PassportScorer_filter>;
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type QuerypassportStrategyArgs = {
    id: Scalars['ID'];
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type QuerypassportStrategiesArgs = {
    skip?: InputMaybe<Scalars['Int']>;
    first?: InputMaybe<Scalars['Int']>;
    orderBy?: InputMaybe<PassportStrategy_orderBy>;
    orderDirection?: InputMaybe<OrderDirection>;
    where?: InputMaybe<PassportStrategy_filter>;
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type QuerypassportUserArgs = {
    id: Scalars['ID'];
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type QuerypassportUsersArgs = {
    skip?: InputMaybe<Scalars['Int']>;
    first?: InputMaybe<Scalars['Int']>;
    orderBy?: InputMaybe<PassportUser_orderBy>;
    orderDirection?: InputMaybe<OrderDirection>;
    where?: InputMaybe<PassportUser_filter>;
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type Query_metaArgs = {
    block?: InputMaybe<Block_height>;
};
export type RegistryCommunity = {
    id: Scalars['ID'];
    chainId: Scalars['BigInt'];
    strategyTemplate: Scalars['String'];
    profileId?: Maybe<Scalars['String']>;
    communityFee: Scalars['BigInt'];
    protocolFee: Scalars['BigInt'];
    communityName?: Maybe<Scalars['String']>;
    covenantIpfsHash?: Maybe<Scalars['String']>;
    registryFactory?: Maybe<RegistryFactory>;
    strategies?: Maybe<Array<CVStrategy>>;
    councilSafe?: Maybe<Scalars['String']>;
    isKickEnabled?: Maybe<Scalars['Boolean']>;
    registerStakeAmount?: Maybe<Scalars['BigInt']>;
    registerToken?: Maybe<Scalars['String']>;
    alloAddress?: Maybe<Scalars['String']>;
    members?: Maybe<Array<MemberCommunity>>;
    garden: TokenGarden;
    isValid: Scalars['Boolean'];
};
export type RegistryCommunitystrategiesArgs = {
    skip?: InputMaybe<Scalars['Int']>;
    first?: InputMaybe<Scalars['Int']>;
    orderBy?: InputMaybe<CVStrategy_orderBy>;
    orderDirection?: InputMaybe<OrderDirection>;
    where?: InputMaybe<CVStrategy_filter>;
};
export type RegistryCommunitymembersArgs = {
    skip?: InputMaybe<Scalars['Int']>;
    first?: InputMaybe<Scalars['Int']>;
    orderBy?: InputMaybe<MemberCommunity_orderBy>;
    orderDirection?: InputMaybe<OrderDirection>;
    where?: InputMaybe<MemberCommunity_filter>;
};
export type RegistryCommunity_filter = {
    id?: InputMaybe<Scalars['ID']>;
    id_not?: InputMaybe<Scalars['ID']>;
    id_gt?: InputMaybe<Scalars['ID']>;
    id_lt?: InputMaybe<Scalars['ID']>;
    id_gte?: InputMaybe<Scalars['ID']>;
    id_lte?: InputMaybe<Scalars['ID']>;
    id_in?: InputMaybe<Array<Scalars['ID']>>;
    id_not_in?: InputMaybe<Array<Scalars['ID']>>;
    chainId?: InputMaybe<Scalars['BigInt']>;
    chainId_not?: InputMaybe<Scalars['BigInt']>;
    chainId_gt?: InputMaybe<Scalars['BigInt']>;
    chainId_lt?: InputMaybe<Scalars['BigInt']>;
    chainId_gte?: InputMaybe<Scalars['BigInt']>;
    chainId_lte?: InputMaybe<Scalars['BigInt']>;
    chainId_in?: InputMaybe<Array<Scalars['BigInt']>>;
    chainId_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
    strategyTemplate?: InputMaybe<Scalars['String']>;
    strategyTemplate_not?: InputMaybe<Scalars['String']>;
    strategyTemplate_gt?: InputMaybe<Scalars['String']>;
    strategyTemplate_lt?: InputMaybe<Scalars['String']>;
    strategyTemplate_gte?: InputMaybe<Scalars['String']>;
    strategyTemplate_lte?: InputMaybe<Scalars['String']>;
    strategyTemplate_in?: InputMaybe<Array<Scalars['String']>>;
    strategyTemplate_not_in?: InputMaybe<Array<Scalars['String']>>;
    strategyTemplate_contains?: InputMaybe<Scalars['String']>;
    strategyTemplate_contains_nocase?: InputMaybe<Scalars['String']>;
    strategyTemplate_not_contains?: InputMaybe<Scalars['String']>;
    strategyTemplate_not_contains_nocase?: InputMaybe<Scalars['String']>;
    strategyTemplate_starts_with?: InputMaybe<Scalars['String']>;
    strategyTemplate_starts_with_nocase?: InputMaybe<Scalars['String']>;
    strategyTemplate_not_starts_with?: InputMaybe<Scalars['String']>;
    strategyTemplate_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
    strategyTemplate_ends_with?: InputMaybe<Scalars['String']>;
    strategyTemplate_ends_with_nocase?: InputMaybe<Scalars['String']>;
    strategyTemplate_not_ends_with?: InputMaybe<Scalars['String']>;
    strategyTemplate_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
    profileId?: InputMaybe<Scalars['String']>;
    profileId_not?: InputMaybe<Scalars['String']>;
    profileId_gt?: InputMaybe<Scalars['String']>;
    profileId_lt?: InputMaybe<Scalars['String']>;
    profileId_gte?: InputMaybe<Scalars['String']>;
    profileId_lte?: InputMaybe<Scalars['String']>;
    profileId_in?: InputMaybe<Array<Scalars['String']>>;
    profileId_not_in?: InputMaybe<Array<Scalars['String']>>;
    profileId_contains?: InputMaybe<Scalars['String']>;
    profileId_contains_nocase?: InputMaybe<Scalars['String']>;
    profileId_not_contains?: InputMaybe<Scalars['String']>;
    profileId_not_contains_nocase?: InputMaybe<Scalars['String']>;
    profileId_starts_with?: InputMaybe<Scalars['String']>;
    profileId_starts_with_nocase?: InputMaybe<Scalars['String']>;
    profileId_not_starts_with?: InputMaybe<Scalars['String']>;
    profileId_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
    profileId_ends_with?: InputMaybe<Scalars['String']>;
    profileId_ends_with_nocase?: InputMaybe<Scalars['String']>;
    profileId_not_ends_with?: InputMaybe<Scalars['String']>;
    profileId_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
    communityFee?: InputMaybe<Scalars['BigInt']>;
    communityFee_not?: InputMaybe<Scalars['BigInt']>;
    communityFee_gt?: InputMaybe<Scalars['BigInt']>;
    communityFee_lt?: InputMaybe<Scalars['BigInt']>;
    communityFee_gte?: InputMaybe<Scalars['BigInt']>;
    communityFee_lte?: InputMaybe<Scalars['BigInt']>;
    communityFee_in?: InputMaybe<Array<Scalars['BigInt']>>;
    communityFee_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
    protocolFee?: InputMaybe<Scalars['BigInt']>;
    protocolFee_not?: InputMaybe<Scalars['BigInt']>;
    protocolFee_gt?: InputMaybe<Scalars['BigInt']>;
    protocolFee_lt?: InputMaybe<Scalars['BigInt']>;
    protocolFee_gte?: InputMaybe<Scalars['BigInt']>;
    protocolFee_lte?: InputMaybe<Scalars['BigInt']>;
    protocolFee_in?: InputMaybe<Array<Scalars['BigInt']>>;
    protocolFee_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
    communityName?: InputMaybe<Scalars['String']>;
    communityName_not?: InputMaybe<Scalars['String']>;
    communityName_gt?: InputMaybe<Scalars['String']>;
    communityName_lt?: InputMaybe<Scalars['String']>;
    communityName_gte?: InputMaybe<Scalars['String']>;
    communityName_lte?: InputMaybe<Scalars['String']>;
    communityName_in?: InputMaybe<Array<Scalars['String']>>;
    communityName_not_in?: InputMaybe<Array<Scalars['String']>>;
    communityName_contains?: InputMaybe<Scalars['String']>;
    communityName_contains_nocase?: InputMaybe<Scalars['String']>;
    communityName_not_contains?: InputMaybe<Scalars['String']>;
    communityName_not_contains_nocase?: InputMaybe<Scalars['String']>;
    communityName_starts_with?: InputMaybe<Scalars['String']>;
    communityName_starts_with_nocase?: InputMaybe<Scalars['String']>;
    communityName_not_starts_with?: InputMaybe<Scalars['String']>;
    communityName_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
    communityName_ends_with?: InputMaybe<Scalars['String']>;
    communityName_ends_with_nocase?: InputMaybe<Scalars['String']>;
    communityName_not_ends_with?: InputMaybe<Scalars['String']>;
    communityName_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
    covenantIpfsHash?: InputMaybe<Scalars['String']>;
    covenantIpfsHash_not?: InputMaybe<Scalars['String']>;
    covenantIpfsHash_gt?: InputMaybe<Scalars['String']>;
    covenantIpfsHash_lt?: InputMaybe<Scalars['String']>;
    covenantIpfsHash_gte?: InputMaybe<Scalars['String']>;
    covenantIpfsHash_lte?: InputMaybe<Scalars['String']>;
    covenantIpfsHash_in?: InputMaybe<Array<Scalars['String']>>;
    covenantIpfsHash_not_in?: InputMaybe<Array<Scalars['String']>>;
    covenantIpfsHash_contains?: InputMaybe<Scalars['String']>;
    covenantIpfsHash_contains_nocase?: InputMaybe<Scalars['String']>;
    covenantIpfsHash_not_contains?: InputMaybe<Scalars['String']>;
    covenantIpfsHash_not_contains_nocase?: InputMaybe<Scalars['String']>;
    covenantIpfsHash_starts_with?: InputMaybe<Scalars['String']>;
    covenantIpfsHash_starts_with_nocase?: InputMaybe<Scalars['String']>;
    covenantIpfsHash_not_starts_with?: InputMaybe<Scalars['String']>;
    covenantIpfsHash_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
    covenantIpfsHash_ends_with?: InputMaybe<Scalars['String']>;
    covenantIpfsHash_ends_with_nocase?: InputMaybe<Scalars['String']>;
    covenantIpfsHash_not_ends_with?: InputMaybe<Scalars['String']>;
    covenantIpfsHash_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
    registryFactory?: InputMaybe<Scalars['String']>;
    registryFactory_not?: InputMaybe<Scalars['String']>;
    registryFactory_gt?: InputMaybe<Scalars['String']>;
    registryFactory_lt?: InputMaybe<Scalars['String']>;
    registryFactory_gte?: InputMaybe<Scalars['String']>;
    registryFactory_lte?: InputMaybe<Scalars['String']>;
    registryFactory_in?: InputMaybe<Array<Scalars['String']>>;
    registryFactory_not_in?: InputMaybe<Array<Scalars['String']>>;
    registryFactory_contains?: InputMaybe<Scalars['String']>;
    registryFactory_contains_nocase?: InputMaybe<Scalars['String']>;
    registryFactory_not_contains?: InputMaybe<Scalars['String']>;
    registryFactory_not_contains_nocase?: InputMaybe<Scalars['String']>;
    registryFactory_starts_with?: InputMaybe<Scalars['String']>;
    registryFactory_starts_with_nocase?: InputMaybe<Scalars['String']>;
    registryFactory_not_starts_with?: InputMaybe<Scalars['String']>;
    registryFactory_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
    registryFactory_ends_with?: InputMaybe<Scalars['String']>;
    registryFactory_ends_with_nocase?: InputMaybe<Scalars['String']>;
    registryFactory_not_ends_with?: InputMaybe<Scalars['String']>;
    registryFactory_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
    registryFactory_?: InputMaybe<RegistryFactory_filter>;
    strategies_?: InputMaybe<CVStrategy_filter>;
    councilSafe?: InputMaybe<Scalars['String']>;
    councilSafe_not?: InputMaybe<Scalars['String']>;
    councilSafe_gt?: InputMaybe<Scalars['String']>;
    councilSafe_lt?: InputMaybe<Scalars['String']>;
    councilSafe_gte?: InputMaybe<Scalars['String']>;
    councilSafe_lte?: InputMaybe<Scalars['String']>;
    councilSafe_in?: InputMaybe<Array<Scalars['String']>>;
    councilSafe_not_in?: InputMaybe<Array<Scalars['String']>>;
    councilSafe_contains?: InputMaybe<Scalars['String']>;
    councilSafe_contains_nocase?: InputMaybe<Scalars['String']>;
    councilSafe_not_contains?: InputMaybe<Scalars['String']>;
    councilSafe_not_contains_nocase?: InputMaybe<Scalars['String']>;
    councilSafe_starts_with?: InputMaybe<Scalars['String']>;
    councilSafe_starts_with_nocase?: InputMaybe<Scalars['String']>;
    councilSafe_not_starts_with?: InputMaybe<Scalars['String']>;
    councilSafe_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
    councilSafe_ends_with?: InputMaybe<Scalars['String']>;
    councilSafe_ends_with_nocase?: InputMaybe<Scalars['String']>;
    councilSafe_not_ends_with?: InputMaybe<Scalars['String']>;
    councilSafe_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
    isKickEnabled?: InputMaybe<Scalars['Boolean']>;
    isKickEnabled_not?: InputMaybe<Scalars['Boolean']>;
    isKickEnabled_in?: InputMaybe<Array<Scalars['Boolean']>>;
    isKickEnabled_not_in?: InputMaybe<Array<Scalars['Boolean']>>;
    registerStakeAmount?: InputMaybe<Scalars['BigInt']>;
    registerStakeAmount_not?: InputMaybe<Scalars['BigInt']>;
    registerStakeAmount_gt?: InputMaybe<Scalars['BigInt']>;
    registerStakeAmount_lt?: InputMaybe<Scalars['BigInt']>;
    registerStakeAmount_gte?: InputMaybe<Scalars['BigInt']>;
    registerStakeAmount_lte?: InputMaybe<Scalars['BigInt']>;
    registerStakeAmount_in?: InputMaybe<Array<Scalars['BigInt']>>;
    registerStakeAmount_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
    registerToken?: InputMaybe<Scalars['String']>;
    registerToken_not?: InputMaybe<Scalars['String']>;
    registerToken_gt?: InputMaybe<Scalars['String']>;
    registerToken_lt?: InputMaybe<Scalars['String']>;
    registerToken_gte?: InputMaybe<Scalars['String']>;
    registerToken_lte?: InputMaybe<Scalars['String']>;
    registerToken_in?: InputMaybe<Array<Scalars['String']>>;
    registerToken_not_in?: InputMaybe<Array<Scalars['String']>>;
    registerToken_contains?: InputMaybe<Scalars['String']>;
    registerToken_contains_nocase?: InputMaybe<Scalars['String']>;
    registerToken_not_contains?: InputMaybe<Scalars['String']>;
    registerToken_not_contains_nocase?: InputMaybe<Scalars['String']>;
    registerToken_starts_with?: InputMaybe<Scalars['String']>;
    registerToken_starts_with_nocase?: InputMaybe<Scalars['String']>;
    registerToken_not_starts_with?: InputMaybe<Scalars['String']>;
    registerToken_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
    registerToken_ends_with?: InputMaybe<Scalars['String']>;
    registerToken_ends_with_nocase?: InputMaybe<Scalars['String']>;
    registerToken_not_ends_with?: InputMaybe<Scalars['String']>;
    registerToken_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
    alloAddress?: InputMaybe<Scalars['String']>;
    alloAddress_not?: InputMaybe<Scalars['String']>;
    alloAddress_gt?: InputMaybe<Scalars['String']>;
    alloAddress_lt?: InputMaybe<Scalars['String']>;
    alloAddress_gte?: InputMaybe<Scalars['String']>;
    alloAddress_lte?: InputMaybe<Scalars['String']>;
    alloAddress_in?: InputMaybe<Array<Scalars['String']>>;
    alloAddress_not_in?: InputMaybe<Array<Scalars['String']>>;
    alloAddress_contains?: InputMaybe<Scalars['String']>;
    alloAddress_contains_nocase?: InputMaybe<Scalars['String']>;
    alloAddress_not_contains?: InputMaybe<Scalars['String']>;
    alloAddress_not_contains_nocase?: InputMaybe<Scalars['String']>;
    alloAddress_starts_with?: InputMaybe<Scalars['String']>;
    alloAddress_starts_with_nocase?: InputMaybe<Scalars['String']>;
    alloAddress_not_starts_with?: InputMaybe<Scalars['String']>;
    alloAddress_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
    alloAddress_ends_with?: InputMaybe<Scalars['String']>;
    alloAddress_ends_with_nocase?: InputMaybe<Scalars['String']>;
    alloAddress_not_ends_with?: InputMaybe<Scalars['String']>;
    alloAddress_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
    members_?: InputMaybe<MemberCommunity_filter>;
    garden?: InputMaybe<Scalars['String']>;
    garden_not?: InputMaybe<Scalars['String']>;
    garden_gt?: InputMaybe<Scalars['String']>;
    garden_lt?: InputMaybe<Scalars['String']>;
    garden_gte?: InputMaybe<Scalars['String']>;
    garden_lte?: InputMaybe<Scalars['String']>;
    garden_in?: InputMaybe<Array<Scalars['String']>>;
    garden_not_in?: InputMaybe<Array<Scalars['String']>>;
    garden_contains?: InputMaybe<Scalars['String']>;
    garden_contains_nocase?: InputMaybe<Scalars['String']>;
    garden_not_contains?: InputMaybe<Scalars['String']>;
    garden_not_contains_nocase?: InputMaybe<Scalars['String']>;
    garden_starts_with?: InputMaybe<Scalars['String']>;
    garden_starts_with_nocase?: InputMaybe<Scalars['String']>;
    garden_not_starts_with?: InputMaybe<Scalars['String']>;
    garden_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
    garden_ends_with?: InputMaybe<Scalars['String']>;
    garden_ends_with_nocase?: InputMaybe<Scalars['String']>;
    garden_not_ends_with?: InputMaybe<Scalars['String']>;
    garden_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
    garden_?: InputMaybe<TokenGarden_filter>;
    isValid?: InputMaybe<Scalars['Boolean']>;
    isValid_not?: InputMaybe<Scalars['Boolean']>;
    isValid_in?: InputMaybe<Array<Scalars['Boolean']>>;
    isValid_not_in?: InputMaybe<Array<Scalars['Boolean']>>;
    /** Filter for the block changed event. */
    _change_block?: InputMaybe<BlockChangedFilter>;
    and?: InputMaybe<Array<InputMaybe<RegistryCommunity_filter>>>;
    or?: InputMaybe<Array<InputMaybe<RegistryCommunity_filter>>>;
};
export type RegistryCommunity_orderBy = 'id' | 'chainId' | 'strategyTemplate' | 'profileId' | 'communityFee' | 'protocolFee' | 'communityName' | 'covenantIpfsHash' | 'registryFactory' | 'registryFactory__id' | 'registryFactory__chainId' | 'strategies' | 'councilSafe' | 'isKickEnabled' | 'registerStakeAmount' | 'registerToken' | 'alloAddress' | 'members' | 'garden' | 'garden__id' | 'garden__name' | 'garden__description' | 'garden__chainId' | 'garden__totalBalance' | 'garden__ipfsCovenant' | 'garden__symbol' | 'garden__decimals' | 'garden__address' | 'isValid';
export type RegistryFactory = {
    id: Scalars['ID'];
    chainId: Scalars['BigInt'];
    registryCommunities?: Maybe<Array<RegistryCommunity>>;
};
export type RegistryFactoryregistryCommunitiesArgs = {
    skip?: InputMaybe<Scalars['Int']>;
    first?: InputMaybe<Scalars['Int']>;
    orderBy?: InputMaybe<RegistryCommunity_orderBy>;
    orderDirection?: InputMaybe<OrderDirection>;
    where?: InputMaybe<RegistryCommunity_filter>;
};
export type RegistryFactory_filter = {
    id?: InputMaybe<Scalars['ID']>;
    id_not?: InputMaybe<Scalars['ID']>;
    id_gt?: InputMaybe<Scalars['ID']>;
    id_lt?: InputMaybe<Scalars['ID']>;
    id_gte?: InputMaybe<Scalars['ID']>;
    id_lte?: InputMaybe<Scalars['ID']>;
    id_in?: InputMaybe<Array<Scalars['ID']>>;
    id_not_in?: InputMaybe<Array<Scalars['ID']>>;
    chainId?: InputMaybe<Scalars['BigInt']>;
    chainId_not?: InputMaybe<Scalars['BigInt']>;
    chainId_gt?: InputMaybe<Scalars['BigInt']>;
    chainId_lt?: InputMaybe<Scalars['BigInt']>;
    chainId_gte?: InputMaybe<Scalars['BigInt']>;
    chainId_lte?: InputMaybe<Scalars['BigInt']>;
    chainId_in?: InputMaybe<Array<Scalars['BigInt']>>;
    chainId_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
    registryCommunities_?: InputMaybe<RegistryCommunity_filter>;
    /** Filter for the block changed event. */
    _change_block?: InputMaybe<BlockChangedFilter>;
    and?: InputMaybe<Array<InputMaybe<RegistryFactory_filter>>>;
    or?: InputMaybe<Array<InputMaybe<RegistryFactory_filter>>>;
};
export type RegistryFactory_orderBy = 'id' | 'chainId' | 'registryCommunities';
export type Stake = {
    id: Scalars['ID'];
    member: Member;
    poolId: Scalars['BigInt'];
    proposal: CVProposal;
    amount: Scalars['BigInt'];
    createdAt: Scalars['BigInt'];
};
export type Stake_filter = {
    id?: InputMaybe<Scalars['ID']>;
    id_not?: InputMaybe<Scalars['ID']>;
    id_gt?: InputMaybe<Scalars['ID']>;
    id_lt?: InputMaybe<Scalars['ID']>;
    id_gte?: InputMaybe<Scalars['ID']>;
    id_lte?: InputMaybe<Scalars['ID']>;
    id_in?: InputMaybe<Array<Scalars['ID']>>;
    id_not_in?: InputMaybe<Array<Scalars['ID']>>;
    member?: InputMaybe<Scalars['String']>;
    member_not?: InputMaybe<Scalars['String']>;
    member_gt?: InputMaybe<Scalars['String']>;
    member_lt?: InputMaybe<Scalars['String']>;
    member_gte?: InputMaybe<Scalars['String']>;
    member_lte?: InputMaybe<Scalars['String']>;
    member_in?: InputMaybe<Array<Scalars['String']>>;
    member_not_in?: InputMaybe<Array<Scalars['String']>>;
    member_contains?: InputMaybe<Scalars['String']>;
    member_contains_nocase?: InputMaybe<Scalars['String']>;
    member_not_contains?: InputMaybe<Scalars['String']>;
    member_not_contains_nocase?: InputMaybe<Scalars['String']>;
    member_starts_with?: InputMaybe<Scalars['String']>;
    member_starts_with_nocase?: InputMaybe<Scalars['String']>;
    member_not_starts_with?: InputMaybe<Scalars['String']>;
    member_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
    member_ends_with?: InputMaybe<Scalars['String']>;
    member_ends_with_nocase?: InputMaybe<Scalars['String']>;
    member_not_ends_with?: InputMaybe<Scalars['String']>;
    member_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
    member_?: InputMaybe<Member_filter>;
    poolId?: InputMaybe<Scalars['BigInt']>;
    poolId_not?: InputMaybe<Scalars['BigInt']>;
    poolId_gt?: InputMaybe<Scalars['BigInt']>;
    poolId_lt?: InputMaybe<Scalars['BigInt']>;
    poolId_gte?: InputMaybe<Scalars['BigInt']>;
    poolId_lte?: InputMaybe<Scalars['BigInt']>;
    poolId_in?: InputMaybe<Array<Scalars['BigInt']>>;
    poolId_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
    proposal?: InputMaybe<Scalars['String']>;
    proposal_not?: InputMaybe<Scalars['String']>;
    proposal_gt?: InputMaybe<Scalars['String']>;
    proposal_lt?: InputMaybe<Scalars['String']>;
    proposal_gte?: InputMaybe<Scalars['String']>;
    proposal_lte?: InputMaybe<Scalars['String']>;
    proposal_in?: InputMaybe<Array<Scalars['String']>>;
    proposal_not_in?: InputMaybe<Array<Scalars['String']>>;
    proposal_contains?: InputMaybe<Scalars['String']>;
    proposal_contains_nocase?: InputMaybe<Scalars['String']>;
    proposal_not_contains?: InputMaybe<Scalars['String']>;
    proposal_not_contains_nocase?: InputMaybe<Scalars['String']>;
    proposal_starts_with?: InputMaybe<Scalars['String']>;
    proposal_starts_with_nocase?: InputMaybe<Scalars['String']>;
    proposal_not_starts_with?: InputMaybe<Scalars['String']>;
    proposal_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
    proposal_ends_with?: InputMaybe<Scalars['String']>;
    proposal_ends_with_nocase?: InputMaybe<Scalars['String']>;
    proposal_not_ends_with?: InputMaybe<Scalars['String']>;
    proposal_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
    proposal_?: InputMaybe<CVProposal_filter>;
    amount?: InputMaybe<Scalars['BigInt']>;
    amount_not?: InputMaybe<Scalars['BigInt']>;
    amount_gt?: InputMaybe<Scalars['BigInt']>;
    amount_lt?: InputMaybe<Scalars['BigInt']>;
    amount_gte?: InputMaybe<Scalars['BigInt']>;
    amount_lte?: InputMaybe<Scalars['BigInt']>;
    amount_in?: InputMaybe<Array<Scalars['BigInt']>>;
    amount_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
    createdAt?: InputMaybe<Scalars['BigInt']>;
    createdAt_not?: InputMaybe<Scalars['BigInt']>;
    createdAt_gt?: InputMaybe<Scalars['BigInt']>;
    createdAt_lt?: InputMaybe<Scalars['BigInt']>;
    createdAt_gte?: InputMaybe<Scalars['BigInt']>;
    createdAt_lte?: InputMaybe<Scalars['BigInt']>;
    createdAt_in?: InputMaybe<Array<Scalars['BigInt']>>;
    createdAt_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
    /** Filter for the block changed event. */
    _change_block?: InputMaybe<BlockChangedFilter>;
    and?: InputMaybe<Array<InputMaybe<Stake_filter>>>;
    or?: InputMaybe<Array<InputMaybe<Stake_filter>>>;
};
export type Stake_orderBy = 'id' | 'member' | 'member__id' | 'poolId' | 'proposal' | 'proposal__id' | 'proposal__proposalNumber' | 'proposal__metadata' | 'proposal__version' | 'proposal__beneficiary' | 'proposal__requestedAmount' | 'proposal__requestedToken' | 'proposal__proposalStatus' | 'proposal__blockLast' | 'proposal__convictionLast' | 'proposal__threshold' | 'proposal__maxCVStaked' | 'proposal__stakedAmount' | 'proposal__submitter' | 'proposal__createdAt' | 'proposal__updatedAt' | 'amount' | 'createdAt';
export type Subscription = {
    cvstrategy?: Maybe<CVStrategy>;
    cvstrategies: Array<CVStrategy>;
    cvstrategyConfig?: Maybe<CVStrategyConfig>;
    cvstrategyConfigs: Array<CVStrategyConfig>;
    cvproposal?: Maybe<CVProposal>;
    cvproposals: Array<CVProposal>;
    registryFactory?: Maybe<RegistryFactory>;
    registryFactories: Array<RegistryFactory>;
    registryCommunity?: Maybe<RegistryCommunity>;
    registryCommunities: Array<RegistryCommunity>;
    member?: Maybe<Member>;
    members: Array<Member>;
    stake?: Maybe<Stake>;
    stakes: Array<Stake>;
    memberCommunity?: Maybe<MemberCommunity>;
    memberCommunities: Array<MemberCommunity>;
    memberStrategy?: Maybe<MemberStrategy>;
    memberStrategies: Array<MemberStrategy>;
    tokenGarden?: Maybe<TokenGarden>;
    tokenGardens: Array<TokenGarden>;
    allo?: Maybe<Allo>;
    allos: Array<Allo>;
    passportScorer?: Maybe<PassportScorer>;
    passportScorers: Array<PassportScorer>;
    passportStrategy?: Maybe<PassportStrategy>;
    passportStrategies: Array<PassportStrategy>;
    passportUser?: Maybe<PassportUser>;
    passportUsers: Array<PassportUser>;
    /** Access to subgraph metadata */
    _meta?: Maybe<_Meta_>;
};
export type SubscriptioncvstrategyArgs = {
    id: Scalars['ID'];
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type SubscriptioncvstrategiesArgs = {
    skip?: InputMaybe<Scalars['Int']>;
    first?: InputMaybe<Scalars['Int']>;
    orderBy?: InputMaybe<CVStrategy_orderBy>;
    orderDirection?: InputMaybe<OrderDirection>;
    where?: InputMaybe<CVStrategy_filter>;
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type SubscriptioncvstrategyConfigArgs = {
    id: Scalars['ID'];
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type SubscriptioncvstrategyConfigsArgs = {
    skip?: InputMaybe<Scalars['Int']>;
    first?: InputMaybe<Scalars['Int']>;
    orderBy?: InputMaybe<CVStrategyConfig_orderBy>;
    orderDirection?: InputMaybe<OrderDirection>;
    where?: InputMaybe<CVStrategyConfig_filter>;
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type SubscriptioncvproposalArgs = {
    id: Scalars['ID'];
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type SubscriptioncvproposalsArgs = {
    skip?: InputMaybe<Scalars['Int']>;
    first?: InputMaybe<Scalars['Int']>;
    orderBy?: InputMaybe<CVProposal_orderBy>;
    orderDirection?: InputMaybe<OrderDirection>;
    where?: InputMaybe<CVProposal_filter>;
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type SubscriptionregistryFactoryArgs = {
    id: Scalars['ID'];
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type SubscriptionregistryFactoriesArgs = {
    skip?: InputMaybe<Scalars['Int']>;
    first?: InputMaybe<Scalars['Int']>;
    orderBy?: InputMaybe<RegistryFactory_orderBy>;
    orderDirection?: InputMaybe<OrderDirection>;
    where?: InputMaybe<RegistryFactory_filter>;
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type SubscriptionregistryCommunityArgs = {
    id: Scalars['ID'];
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type SubscriptionregistryCommunitiesArgs = {
    skip?: InputMaybe<Scalars['Int']>;
    first?: InputMaybe<Scalars['Int']>;
    orderBy?: InputMaybe<RegistryCommunity_orderBy>;
    orderDirection?: InputMaybe<OrderDirection>;
    where?: InputMaybe<RegistryCommunity_filter>;
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type SubscriptionmemberArgs = {
    id: Scalars['ID'];
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type SubscriptionmembersArgs = {
    skip?: InputMaybe<Scalars['Int']>;
    first?: InputMaybe<Scalars['Int']>;
    orderBy?: InputMaybe<Member_orderBy>;
    orderDirection?: InputMaybe<OrderDirection>;
    where?: InputMaybe<Member_filter>;
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type SubscriptionstakeArgs = {
    id: Scalars['ID'];
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type SubscriptionstakesArgs = {
    skip?: InputMaybe<Scalars['Int']>;
    first?: InputMaybe<Scalars['Int']>;
    orderBy?: InputMaybe<Stake_orderBy>;
    orderDirection?: InputMaybe<OrderDirection>;
    where?: InputMaybe<Stake_filter>;
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type SubscriptionmemberCommunityArgs = {
    id: Scalars['ID'];
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type SubscriptionmemberCommunitiesArgs = {
    skip?: InputMaybe<Scalars['Int']>;
    first?: InputMaybe<Scalars['Int']>;
    orderBy?: InputMaybe<MemberCommunity_orderBy>;
    orderDirection?: InputMaybe<OrderDirection>;
    where?: InputMaybe<MemberCommunity_filter>;
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type SubscriptionmemberStrategyArgs = {
    id: Scalars['ID'];
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type SubscriptionmemberStrategiesArgs = {
    skip?: InputMaybe<Scalars['Int']>;
    first?: InputMaybe<Scalars['Int']>;
    orderBy?: InputMaybe<MemberStrategy_orderBy>;
    orderDirection?: InputMaybe<OrderDirection>;
    where?: InputMaybe<MemberStrategy_filter>;
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type SubscriptiontokenGardenArgs = {
    id: Scalars['ID'];
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type SubscriptiontokenGardensArgs = {
    skip?: InputMaybe<Scalars['Int']>;
    first?: InputMaybe<Scalars['Int']>;
    orderBy?: InputMaybe<TokenGarden_orderBy>;
    orderDirection?: InputMaybe<OrderDirection>;
    where?: InputMaybe<TokenGarden_filter>;
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type SubscriptionalloArgs = {
    id: Scalars['ID'];
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type SubscriptionallosArgs = {
    skip?: InputMaybe<Scalars['Int']>;
    first?: InputMaybe<Scalars['Int']>;
    orderBy?: InputMaybe<Allo_orderBy>;
    orderDirection?: InputMaybe<OrderDirection>;
    where?: InputMaybe<Allo_filter>;
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type SubscriptionpassportScorerArgs = {
    id: Scalars['ID'];
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type SubscriptionpassportScorersArgs = {
    skip?: InputMaybe<Scalars['Int']>;
    first?: InputMaybe<Scalars['Int']>;
    orderBy?: InputMaybe<PassportScorer_orderBy>;
    orderDirection?: InputMaybe<OrderDirection>;
    where?: InputMaybe<PassportScorer_filter>;
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type SubscriptionpassportStrategyArgs = {
    id: Scalars['ID'];
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type SubscriptionpassportStrategiesArgs = {
    skip?: InputMaybe<Scalars['Int']>;
    first?: InputMaybe<Scalars['Int']>;
    orderBy?: InputMaybe<PassportStrategy_orderBy>;
    orderDirection?: InputMaybe<OrderDirection>;
    where?: InputMaybe<PassportStrategy_filter>;
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type SubscriptionpassportUserArgs = {
    id: Scalars['ID'];
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type SubscriptionpassportUsersArgs = {
    skip?: InputMaybe<Scalars['Int']>;
    first?: InputMaybe<Scalars['Int']>;
    orderBy?: InputMaybe<PassportUser_orderBy>;
    orderDirection?: InputMaybe<OrderDirection>;
    where?: InputMaybe<PassportUser_filter>;
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type Subscription_metaArgs = {
    block?: InputMaybe<Block_height>;
};
export type TokenGarden = {
    id: Scalars['ID'];
    name: Scalars['String'];
    description?: Maybe<Scalars['String']>;
    chainId: Scalars['BigInt'];
    totalBalance: Scalars['BigInt'];
    ipfsCovenant?: Maybe<Scalars['String']>;
    symbol: Scalars['String'];
    decimals: Scalars['BigInt'];
    address: Scalars['String'];
    communities?: Maybe<Array<RegistryCommunity>>;
};
export type TokenGardencommunitiesArgs = {
    skip?: InputMaybe<Scalars['Int']>;
    first?: InputMaybe<Scalars['Int']>;
    orderBy?: InputMaybe<RegistryCommunity_orderBy>;
    orderDirection?: InputMaybe<OrderDirection>;
    where?: InputMaybe<RegistryCommunity_filter>;
};
export type TokenGarden_filter = {
    id?: InputMaybe<Scalars['ID']>;
    id_not?: InputMaybe<Scalars['ID']>;
    id_gt?: InputMaybe<Scalars['ID']>;
    id_lt?: InputMaybe<Scalars['ID']>;
    id_gte?: InputMaybe<Scalars['ID']>;
    id_lte?: InputMaybe<Scalars['ID']>;
    id_in?: InputMaybe<Array<Scalars['ID']>>;
    id_not_in?: InputMaybe<Array<Scalars['ID']>>;
    name?: InputMaybe<Scalars['String']>;
    name_not?: InputMaybe<Scalars['String']>;
    name_gt?: InputMaybe<Scalars['String']>;
    name_lt?: InputMaybe<Scalars['String']>;
    name_gte?: InputMaybe<Scalars['String']>;
    name_lte?: InputMaybe<Scalars['String']>;
    name_in?: InputMaybe<Array<Scalars['String']>>;
    name_not_in?: InputMaybe<Array<Scalars['String']>>;
    name_contains?: InputMaybe<Scalars['String']>;
    name_contains_nocase?: InputMaybe<Scalars['String']>;
    name_not_contains?: InputMaybe<Scalars['String']>;
    name_not_contains_nocase?: InputMaybe<Scalars['String']>;
    name_starts_with?: InputMaybe<Scalars['String']>;
    name_starts_with_nocase?: InputMaybe<Scalars['String']>;
    name_not_starts_with?: InputMaybe<Scalars['String']>;
    name_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
    name_ends_with?: InputMaybe<Scalars['String']>;
    name_ends_with_nocase?: InputMaybe<Scalars['String']>;
    name_not_ends_with?: InputMaybe<Scalars['String']>;
    name_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
    description?: InputMaybe<Scalars['String']>;
    description_not?: InputMaybe<Scalars['String']>;
    description_gt?: InputMaybe<Scalars['String']>;
    description_lt?: InputMaybe<Scalars['String']>;
    description_gte?: InputMaybe<Scalars['String']>;
    description_lte?: InputMaybe<Scalars['String']>;
    description_in?: InputMaybe<Array<Scalars['String']>>;
    description_not_in?: InputMaybe<Array<Scalars['String']>>;
    description_contains?: InputMaybe<Scalars['String']>;
    description_contains_nocase?: InputMaybe<Scalars['String']>;
    description_not_contains?: InputMaybe<Scalars['String']>;
    description_not_contains_nocase?: InputMaybe<Scalars['String']>;
    description_starts_with?: InputMaybe<Scalars['String']>;
    description_starts_with_nocase?: InputMaybe<Scalars['String']>;
    description_not_starts_with?: InputMaybe<Scalars['String']>;
    description_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
    description_ends_with?: InputMaybe<Scalars['String']>;
    description_ends_with_nocase?: InputMaybe<Scalars['String']>;
    description_not_ends_with?: InputMaybe<Scalars['String']>;
    description_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
    chainId?: InputMaybe<Scalars['BigInt']>;
    chainId_not?: InputMaybe<Scalars['BigInt']>;
    chainId_gt?: InputMaybe<Scalars['BigInt']>;
    chainId_lt?: InputMaybe<Scalars['BigInt']>;
    chainId_gte?: InputMaybe<Scalars['BigInt']>;
    chainId_lte?: InputMaybe<Scalars['BigInt']>;
    chainId_in?: InputMaybe<Array<Scalars['BigInt']>>;
    chainId_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
    totalBalance?: InputMaybe<Scalars['BigInt']>;
    totalBalance_not?: InputMaybe<Scalars['BigInt']>;
    totalBalance_gt?: InputMaybe<Scalars['BigInt']>;
    totalBalance_lt?: InputMaybe<Scalars['BigInt']>;
    totalBalance_gte?: InputMaybe<Scalars['BigInt']>;
    totalBalance_lte?: InputMaybe<Scalars['BigInt']>;
    totalBalance_in?: InputMaybe<Array<Scalars['BigInt']>>;
    totalBalance_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
    ipfsCovenant?: InputMaybe<Scalars['String']>;
    ipfsCovenant_not?: InputMaybe<Scalars['String']>;
    ipfsCovenant_gt?: InputMaybe<Scalars['String']>;
    ipfsCovenant_lt?: InputMaybe<Scalars['String']>;
    ipfsCovenant_gte?: InputMaybe<Scalars['String']>;
    ipfsCovenant_lte?: InputMaybe<Scalars['String']>;
    ipfsCovenant_in?: InputMaybe<Array<Scalars['String']>>;
    ipfsCovenant_not_in?: InputMaybe<Array<Scalars['String']>>;
    ipfsCovenant_contains?: InputMaybe<Scalars['String']>;
    ipfsCovenant_contains_nocase?: InputMaybe<Scalars['String']>;
    ipfsCovenant_not_contains?: InputMaybe<Scalars['String']>;
    ipfsCovenant_not_contains_nocase?: InputMaybe<Scalars['String']>;
    ipfsCovenant_starts_with?: InputMaybe<Scalars['String']>;
    ipfsCovenant_starts_with_nocase?: InputMaybe<Scalars['String']>;
    ipfsCovenant_not_starts_with?: InputMaybe<Scalars['String']>;
    ipfsCovenant_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
    ipfsCovenant_ends_with?: InputMaybe<Scalars['String']>;
    ipfsCovenant_ends_with_nocase?: InputMaybe<Scalars['String']>;
    ipfsCovenant_not_ends_with?: InputMaybe<Scalars['String']>;
    ipfsCovenant_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
    symbol?: InputMaybe<Scalars['String']>;
    symbol_not?: InputMaybe<Scalars['String']>;
    symbol_gt?: InputMaybe<Scalars['String']>;
    symbol_lt?: InputMaybe<Scalars['String']>;
    symbol_gte?: InputMaybe<Scalars['String']>;
    symbol_lte?: InputMaybe<Scalars['String']>;
    symbol_in?: InputMaybe<Array<Scalars['String']>>;
    symbol_not_in?: InputMaybe<Array<Scalars['String']>>;
    symbol_contains?: InputMaybe<Scalars['String']>;
    symbol_contains_nocase?: InputMaybe<Scalars['String']>;
    symbol_not_contains?: InputMaybe<Scalars['String']>;
    symbol_not_contains_nocase?: InputMaybe<Scalars['String']>;
    symbol_starts_with?: InputMaybe<Scalars['String']>;
    symbol_starts_with_nocase?: InputMaybe<Scalars['String']>;
    symbol_not_starts_with?: InputMaybe<Scalars['String']>;
    symbol_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
    symbol_ends_with?: InputMaybe<Scalars['String']>;
    symbol_ends_with_nocase?: InputMaybe<Scalars['String']>;
    symbol_not_ends_with?: InputMaybe<Scalars['String']>;
    symbol_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
    decimals?: InputMaybe<Scalars['BigInt']>;
    decimals_not?: InputMaybe<Scalars['BigInt']>;
    decimals_gt?: InputMaybe<Scalars['BigInt']>;
    decimals_lt?: InputMaybe<Scalars['BigInt']>;
    decimals_gte?: InputMaybe<Scalars['BigInt']>;
    decimals_lte?: InputMaybe<Scalars['BigInt']>;
    decimals_in?: InputMaybe<Array<Scalars['BigInt']>>;
    decimals_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
    address?: InputMaybe<Scalars['String']>;
    address_not?: InputMaybe<Scalars['String']>;
    address_gt?: InputMaybe<Scalars['String']>;
    address_lt?: InputMaybe<Scalars['String']>;
    address_gte?: InputMaybe<Scalars['String']>;
    address_lte?: InputMaybe<Scalars['String']>;
    address_in?: InputMaybe<Array<Scalars['String']>>;
    address_not_in?: InputMaybe<Array<Scalars['String']>>;
    address_contains?: InputMaybe<Scalars['String']>;
    address_contains_nocase?: InputMaybe<Scalars['String']>;
    address_not_contains?: InputMaybe<Scalars['String']>;
    address_not_contains_nocase?: InputMaybe<Scalars['String']>;
    address_starts_with?: InputMaybe<Scalars['String']>;
    address_starts_with_nocase?: InputMaybe<Scalars['String']>;
    address_not_starts_with?: InputMaybe<Scalars['String']>;
    address_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
    address_ends_with?: InputMaybe<Scalars['String']>;
    address_ends_with_nocase?: InputMaybe<Scalars['String']>;
    address_not_ends_with?: InputMaybe<Scalars['String']>;
    address_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
    communities_?: InputMaybe<RegistryCommunity_filter>;
    /** Filter for the block changed event. */
    _change_block?: InputMaybe<BlockChangedFilter>;
    and?: InputMaybe<Array<InputMaybe<TokenGarden_filter>>>;
    or?: InputMaybe<Array<InputMaybe<TokenGarden_filter>>>;
};
export type TokenGarden_orderBy = 'id' | 'name' | 'description' | 'chainId' | 'totalBalance' | 'ipfsCovenant' | 'symbol' | 'decimals' | 'address' | 'communities';
export type _Block_ = {
    /** The hash of the block */
    hash?: Maybe<Scalars['Bytes']>;
    /** The block number */
    number: Scalars['Int'];
    /** Integer representation of the timestamp stored in blocks for the chain */
    timestamp?: Maybe<Scalars['Int']>;
};
/** The type for the top-level _meta field */
export type _Meta_ = {
    /**
     * Information about a specific subgraph block. The hash of the block
     * will be null if the _meta field has a block constraint that asks for
     * a block number. It will be filled if the _meta field has no block constraint
     * and therefore asks for the latest  block
     *
     */
    block: _Block_;
    /** The deployment ID */
    deployment: Scalars['String'];
    /** If `true`, the subgraph encountered indexing errors at some past block */
    hasIndexingErrors: Scalars['Boolean'];
};
export type _SubgraphErrorPolicy_ = 
/** Data will be returned even if the subgraph has indexing errors */
'allow'
/** If the subgraph has indexing errors, data will be omitted. The default. */
 | 'deny';
export type WithIndex<TObject> = TObject & Record<string, any>;
export type ResolversObject<TObject> = WithIndex<TObject>;
export type ResolverTypeWrapper<T> = Promise<T> | T;
export type ResolverWithResolve<TResult, TParent, TContext, TArgs> = {
    resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};
export type LegacyStitchingResolver<TResult, TParent, TContext, TArgs> = {
    fragment: string;
    resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};
export type NewStitchingResolver<TResult, TParent, TContext, TArgs> = {
    selectionSet: string | ((fieldNode: FieldNode) => SelectionSetNode);
    resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};
export type StitchingResolver<TResult, TParent, TContext, TArgs> = LegacyStitchingResolver<TResult, TParent, TContext, TArgs> | NewStitchingResolver<TResult, TParent, TContext, TArgs>;
export type Resolver<TResult, TParent = {}, TContext = {}, TArgs = {}> = ResolverFn<TResult, TParent, TContext, TArgs> | ResolverWithResolve<TResult, TParent, TContext, TArgs> | StitchingResolver<TResult, TParent, TContext, TArgs>;
export type ResolverFn<TResult, TParent, TContext, TArgs> = (parent: TParent, args: TArgs, context: TContext, info: GraphQLResolveInfo) => Promise<TResult> | TResult;
export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (parent: TParent, args: TArgs, context: TContext, info: GraphQLResolveInfo) => AsyncIterable<TResult> | Promise<AsyncIterable<TResult>>;
export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (parent: TParent, args: TArgs, context: TContext, info: GraphQLResolveInfo) => TResult | Promise<TResult>;
export interface SubscriptionSubscriberObject<TResult, TKey extends string, TParent, TContext, TArgs> {
    subscribe: SubscriptionSubscribeFn<{
        [key in TKey]: TResult;
    }, TParent, TContext, TArgs>;
    resolve?: SubscriptionResolveFn<TResult, {
        [key in TKey]: TResult;
    }, TContext, TArgs>;
}
export interface SubscriptionResolverObject<TResult, TParent, TContext, TArgs> {
    subscribe: SubscriptionSubscribeFn<any, TParent, TContext, TArgs>;
    resolve: SubscriptionResolveFn<TResult, any, TContext, TArgs>;
}
export type SubscriptionObject<TResult, TKey extends string, TParent, TContext, TArgs> = SubscriptionSubscriberObject<TResult, TKey, TParent, TContext, TArgs> | SubscriptionResolverObject<TResult, TParent, TContext, TArgs>;
export type SubscriptionResolver<TResult, TKey extends string, TParent = {}, TContext = {}, TArgs = {}> = ((...args: any[]) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>) | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>;
export type TypeResolveFn<TTypes, TParent = {}, TContext = {}> = (parent: TParent, context: TContext, info: GraphQLResolveInfo) => Maybe<TTypes> | Promise<Maybe<TTypes>>;
export type IsTypeOfResolverFn<T = {}, TContext = {}> = (obj: T, context: TContext, info: GraphQLResolveInfo) => boolean | Promise<boolean>;
export type NextResolverFn<T> = () => Promise<T>;
export type DirectiveResolverFn<TResult = {}, TParent = {}, TContext = {}, TArgs = {}> = (next: NextResolverFn<TResult>, parent: TParent, args: TArgs, context: TContext, info: GraphQLResolveInfo) => TResult | Promise<TResult>;
/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = ResolversObject<{
    Allo: ResolverTypeWrapper<Allo>;
    Allo_filter: Allo_filter;
    Allo_orderBy: Allo_orderBy;
    BigDecimal: ResolverTypeWrapper<Scalars['BigDecimal']>;
    BigInt: ResolverTypeWrapper<Scalars['BigInt']>;
    BlockChangedFilter: BlockChangedFilter;
    Block_height: Block_height;
    Boolean: ResolverTypeWrapper<Scalars['Boolean']>;
    Bytes: ResolverTypeWrapper<Scalars['Bytes']>;
    CVProposal: ResolverTypeWrapper<CVProposal>;
    CVProposal_filter: CVProposal_filter;
    CVProposal_orderBy: CVProposal_orderBy;
    CVStrategy: ResolverTypeWrapper<CVStrategy>;
    CVStrategyConfig: ResolverTypeWrapper<CVStrategyConfig>;
    CVStrategyConfig_filter: CVStrategyConfig_filter;
    CVStrategyConfig_orderBy: CVStrategyConfig_orderBy;
    CVStrategy_filter: CVStrategy_filter;
    CVStrategy_orderBy: CVStrategy_orderBy;
    Float: ResolverTypeWrapper<Scalars['Float']>;
    ID: ResolverTypeWrapper<Scalars['ID']>;
    Int: ResolverTypeWrapper<Scalars['Int']>;
    Int8: ResolverTypeWrapper<Scalars['Int8']>;
    Member: ResolverTypeWrapper<Member>;
    MemberCommunity: ResolverTypeWrapper<MemberCommunity>;
    MemberCommunity_filter: MemberCommunity_filter;
    MemberCommunity_orderBy: MemberCommunity_orderBy;
    MemberStrategy: ResolverTypeWrapper<MemberStrategy>;
    MemberStrategy_filter: MemberStrategy_filter;
    MemberStrategy_orderBy: MemberStrategy_orderBy;
    Member_filter: Member_filter;
    Member_orderBy: Member_orderBy;
    OrderDirection: OrderDirection;
    PassportScorer: ResolverTypeWrapper<PassportScorer>;
    PassportScorer_filter: PassportScorer_filter;
    PassportScorer_orderBy: PassportScorer_orderBy;
    PassportStrategy: ResolverTypeWrapper<PassportStrategy>;
    PassportStrategy_filter: PassportStrategy_filter;
    PassportStrategy_orderBy: PassportStrategy_orderBy;
    PassportUser: ResolverTypeWrapper<PassportUser>;
    PassportUser_filter: PassportUser_filter;
    PassportUser_orderBy: PassportUser_orderBy;
    Query: ResolverTypeWrapper<{}>;
    RegistryCommunity: ResolverTypeWrapper<RegistryCommunity>;
    RegistryCommunity_filter: RegistryCommunity_filter;
    RegistryCommunity_orderBy: RegistryCommunity_orderBy;
    RegistryFactory: ResolverTypeWrapper<RegistryFactory>;
    RegistryFactory_filter: RegistryFactory_filter;
    RegistryFactory_orderBy: RegistryFactory_orderBy;
    Stake: ResolverTypeWrapper<Stake>;
    Stake_filter: Stake_filter;
    Stake_orderBy: Stake_orderBy;
    String: ResolverTypeWrapper<Scalars['String']>;
    Subscription: ResolverTypeWrapper<{}>;
    TokenGarden: ResolverTypeWrapper<TokenGarden>;
    TokenGarden_filter: TokenGarden_filter;
    TokenGarden_orderBy: TokenGarden_orderBy;
    _Block_: ResolverTypeWrapper<_Block_>;
    _Meta_: ResolverTypeWrapper<_Meta_>;
    _SubgraphErrorPolicy_: _SubgraphErrorPolicy_;
}>;
/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = ResolversObject<{
    Allo: Allo;
    Allo_filter: Allo_filter;
    BigDecimal: Scalars['BigDecimal'];
    BigInt: Scalars['BigInt'];
    BlockChangedFilter: BlockChangedFilter;
    Block_height: Block_height;
    Boolean: Scalars['Boolean'];
    Bytes: Scalars['Bytes'];
    CVProposal: CVProposal;
    CVProposal_filter: CVProposal_filter;
    CVStrategy: CVStrategy;
    CVStrategyConfig: CVStrategyConfig;
    CVStrategyConfig_filter: CVStrategyConfig_filter;
    CVStrategy_filter: CVStrategy_filter;
    Float: Scalars['Float'];
    ID: Scalars['ID'];
    Int: Scalars['Int'];
    Int8: Scalars['Int8'];
    Member: Member;
    MemberCommunity: MemberCommunity;
    MemberCommunity_filter: MemberCommunity_filter;
    MemberStrategy: MemberStrategy;
    MemberStrategy_filter: MemberStrategy_filter;
    Member_filter: Member_filter;
    PassportScorer: PassportScorer;
    PassportScorer_filter: PassportScorer_filter;
    PassportStrategy: PassportStrategy;
    PassportStrategy_filter: PassportStrategy_filter;
    PassportUser: PassportUser;
    PassportUser_filter: PassportUser_filter;
    Query: {};
    RegistryCommunity: RegistryCommunity;
    RegistryCommunity_filter: RegistryCommunity_filter;
    RegistryFactory: RegistryFactory;
    RegistryFactory_filter: RegistryFactory_filter;
    Stake: Stake;
    Stake_filter: Stake_filter;
    String: Scalars['String'];
    Subscription: {};
    TokenGarden: TokenGarden;
    TokenGarden_filter: TokenGarden_filter;
    _Block_: _Block_;
    _Meta_: _Meta_;
}>;
export type entityDirectiveArgs = {};
export type entityDirectiveResolver<Result, Parent, ContextType = MeshContext, Args = entityDirectiveArgs> = DirectiveResolverFn<Result, Parent, ContextType, Args>;
export type subgraphIdDirectiveArgs = {
    id: Scalars['String'];
};
export type subgraphIdDirectiveResolver<Result, Parent, ContextType = MeshContext, Args = subgraphIdDirectiveArgs> = DirectiveResolverFn<Result, Parent, ContextType, Args>;
export type derivedFromDirectiveArgs = {
    field: Scalars['String'];
};
export type derivedFromDirectiveResolver<Result, Parent, ContextType = MeshContext, Args = derivedFromDirectiveArgs> = DirectiveResolverFn<Result, Parent, ContextType, Args>;
export type AlloResolvers<ContextType = MeshContext, ParentType extends ResolversParentTypes['Allo'] = ResolversParentTypes['Allo']> = ResolversObject<{
    id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
    chainId?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
    tokenNative?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
    __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;
export interface BigDecimalScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['BigDecimal'], any> {
    name: 'BigDecimal';
}
export interface BigIntScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['BigInt'], any> {
    name: 'BigInt';
}
export interface BytesScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['Bytes'], any> {
    name: 'Bytes';
}
export type CVProposalResolvers<ContextType = MeshContext, ParentType extends ResolversParentTypes['CVProposal'] = ResolversParentTypes['CVProposal']> = ResolversObject<{
    id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
    proposalNumber?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
    metadata?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
    version?: Resolver<Maybe<ResolversTypes['BigInt']>, ParentType, ContextType>;
    strategy?: Resolver<ResolversTypes['CVStrategy'], ParentType, ContextType>;
    beneficiary?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
    requestedAmount?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
    requestedToken?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
    proposalStatus?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
    blockLast?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
    convictionLast?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
    threshold?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
    maxCVStaked?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
    stakedAmount?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
    submitter?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
    createdAt?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
    updatedAt?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
    __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;
export type CVStrategyResolvers<ContextType = MeshContext, ParentType extends ResolversParentTypes['CVStrategy'] = ResolversParentTypes['CVStrategy']> = ResolversObject<{
    id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
    poolId?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
    poolAmount?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
    metadata?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
    registryCommunity?: Resolver<ResolversTypes['RegistryCommunity'], ParentType, ContextType>;
    config?: Resolver<ResolversTypes['CVStrategyConfig'], ParentType, ContextType>;
    proposals?: Resolver<Array<ResolversTypes['CVProposal']>, ParentType, ContextType, RequireFields<CVStrategyproposalsArgs, 'skip' | 'first'>>;
    memberActive?: Resolver<Maybe<Array<ResolversTypes['Member']>>, ParentType, ContextType, RequireFields<CVStrategymemberActiveArgs, 'skip' | 'first'>>;
    maxCVSupply?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
    totalEffectiveActivePoints?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
    isEnabled?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
    __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;
export type CVStrategyConfigResolvers<ContextType = MeshContext, ParentType extends ResolversParentTypes['CVStrategyConfig'] = ResolversParentTypes['CVStrategyConfig']> = ResolversObject<{
    id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
    strategy?: Resolver<ResolversTypes['CVStrategy'], ParentType, ContextType>;
    D?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
    decay?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
    maxRatio?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
    minThresholdPoints?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
    weight?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
    proposalType?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
    pointSystem?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
    maxAmount?: Resolver<Maybe<ResolversTypes['BigInt']>, ParentType, ContextType>;
    __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;
export interface Int8ScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['Int8'], any> {
    name: 'Int8';
}
export type MemberResolvers<ContextType = MeshContext, ParentType extends ResolversParentTypes['Member'] = ResolversParentTypes['Member']> = ResolversObject<{
    id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
    memberCommunity?: Resolver<Maybe<Array<ResolversTypes['MemberCommunity']>>, ParentType, ContextType, RequireFields<MembermemberCommunityArgs, 'skip' | 'first'>>;
    stakes?: Resolver<Maybe<Array<ResolversTypes['Stake']>>, ParentType, ContextType, RequireFields<MemberstakesArgs, 'skip' | 'first'>>;
    __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;
export type MemberCommunityResolvers<ContextType = MeshContext, ParentType extends ResolversParentTypes['MemberCommunity'] = ResolversParentTypes['MemberCommunity']> = ResolversObject<{
    id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
    memberAddress?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
    stakedTokens?: Resolver<Maybe<ResolversTypes['BigInt']>, ParentType, ContextType>;
    isRegistered?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
    member?: Resolver<ResolversTypes['Member'], ParentType, ContextType>;
    registryCommunity?: Resolver<ResolversTypes['RegistryCommunity'], ParentType, ContextType>;
    __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;
export type MemberStrategyResolvers<ContextType = MeshContext, ParentType extends ResolversParentTypes['MemberStrategy'] = ResolversParentTypes['MemberStrategy']> = ResolversObject<{
    id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
    member?: Resolver<ResolversTypes['Member'], ParentType, ContextType>;
    strategy?: Resolver<ResolversTypes['CVStrategy'], ParentType, ContextType>;
    totalStakedPoints?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
    activatedPoints?: Resolver<Maybe<ResolversTypes['BigInt']>, ParentType, ContextType>;
    __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;
export type PassportScorerResolvers<ContextType = MeshContext, ParentType extends ResolversParentTypes['PassportScorer'] = ResolversParentTypes['PassportScorer']> = ResolversObject<{
    id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
    strategies?: Resolver<Maybe<Array<ResolversTypes['PassportStrategy']>>, ParentType, ContextType, RequireFields<PassportScorerstrategiesArgs, 'skip' | 'first'>>;
    users?: Resolver<Maybe<Array<ResolversTypes['PassportUser']>>, ParentType, ContextType, RequireFields<PassportScorerusersArgs, 'skip' | 'first'>>;
    __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;
export type PassportStrategyResolvers<ContextType = MeshContext, ParentType extends ResolversParentTypes['PassportStrategy'] = ResolversParentTypes['PassportStrategy']> = ResolversObject<{
    id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
    passportScorer?: Resolver<ResolversTypes['PassportScorer'], ParentType, ContextType>;
    strategy?: Resolver<ResolversTypes['CVStrategy'], ParentType, ContextType>;
    threshold?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
    councilSafe?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
    active?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
    __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;
export type PassportUserResolvers<ContextType = MeshContext, ParentType extends ResolversParentTypes['PassportUser'] = ResolversParentTypes['PassportUser']> = ResolversObject<{
    id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
    passportScorer?: Resolver<ResolversTypes['PassportScorer'], ParentType, ContextType>;
    userAddress?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
    score?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
    lastUpdated?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
    __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;
export type QueryResolvers<ContextType = MeshContext, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = ResolversObject<{
    cvstrategy?: Resolver<Maybe<ResolversTypes['CVStrategy']>, ParentType, ContextType, RequireFields<QuerycvstrategyArgs, 'id' | 'subgraphError'>>;
    cvstrategies?: Resolver<Array<ResolversTypes['CVStrategy']>, ParentType, ContextType, RequireFields<QuerycvstrategiesArgs, 'skip' | 'first' | 'subgraphError'>>;
    cvstrategyConfig?: Resolver<Maybe<ResolversTypes['CVStrategyConfig']>, ParentType, ContextType, RequireFields<QuerycvstrategyConfigArgs, 'id' | 'subgraphError'>>;
    cvstrategyConfigs?: Resolver<Array<ResolversTypes['CVStrategyConfig']>, ParentType, ContextType, RequireFields<QuerycvstrategyConfigsArgs, 'skip' | 'first' | 'subgraphError'>>;
    cvproposal?: Resolver<Maybe<ResolversTypes['CVProposal']>, ParentType, ContextType, RequireFields<QuerycvproposalArgs, 'id' | 'subgraphError'>>;
    cvproposals?: Resolver<Array<ResolversTypes['CVProposal']>, ParentType, ContextType, RequireFields<QuerycvproposalsArgs, 'skip' | 'first' | 'subgraphError'>>;
    registryFactory?: Resolver<Maybe<ResolversTypes['RegistryFactory']>, ParentType, ContextType, RequireFields<QueryregistryFactoryArgs, 'id' | 'subgraphError'>>;
    registryFactories?: Resolver<Array<ResolversTypes['RegistryFactory']>, ParentType, ContextType, RequireFields<QueryregistryFactoriesArgs, 'skip' | 'first' | 'subgraphError'>>;
    registryCommunity?: Resolver<Maybe<ResolversTypes['RegistryCommunity']>, ParentType, ContextType, RequireFields<QueryregistryCommunityArgs, 'id' | 'subgraphError'>>;
    registryCommunities?: Resolver<Array<ResolversTypes['RegistryCommunity']>, ParentType, ContextType, RequireFields<QueryregistryCommunitiesArgs, 'skip' | 'first' | 'subgraphError'>>;
    member?: Resolver<Maybe<ResolversTypes['Member']>, ParentType, ContextType, RequireFields<QuerymemberArgs, 'id' | 'subgraphError'>>;
    members?: Resolver<Array<ResolversTypes['Member']>, ParentType, ContextType, RequireFields<QuerymembersArgs, 'skip' | 'first' | 'subgraphError'>>;
    stake?: Resolver<Maybe<ResolversTypes['Stake']>, ParentType, ContextType, RequireFields<QuerystakeArgs, 'id' | 'subgraphError'>>;
    stakes?: Resolver<Array<ResolversTypes['Stake']>, ParentType, ContextType, RequireFields<QuerystakesArgs, 'skip' | 'first' | 'subgraphError'>>;
    memberCommunity?: Resolver<Maybe<ResolversTypes['MemberCommunity']>, ParentType, ContextType, RequireFields<QuerymemberCommunityArgs, 'id' | 'subgraphError'>>;
    memberCommunities?: Resolver<Array<ResolversTypes['MemberCommunity']>, ParentType, ContextType, RequireFields<QuerymemberCommunitiesArgs, 'skip' | 'first' | 'subgraphError'>>;
    memberStrategy?: Resolver<Maybe<ResolversTypes['MemberStrategy']>, ParentType, ContextType, RequireFields<QuerymemberStrategyArgs, 'id' | 'subgraphError'>>;
    memberStrategies?: Resolver<Array<ResolversTypes['MemberStrategy']>, ParentType, ContextType, RequireFields<QuerymemberStrategiesArgs, 'skip' | 'first' | 'subgraphError'>>;
    tokenGarden?: Resolver<Maybe<ResolversTypes['TokenGarden']>, ParentType, ContextType, RequireFields<QuerytokenGardenArgs, 'id' | 'subgraphError'>>;
    tokenGardens?: Resolver<Array<ResolversTypes['TokenGarden']>, ParentType, ContextType, RequireFields<QuerytokenGardensArgs, 'skip' | 'first' | 'subgraphError'>>;
    allo?: Resolver<Maybe<ResolversTypes['Allo']>, ParentType, ContextType, RequireFields<QueryalloArgs, 'id' | 'subgraphError'>>;
    allos?: Resolver<Array<ResolversTypes['Allo']>, ParentType, ContextType, RequireFields<QueryallosArgs, 'skip' | 'first' | 'subgraphError'>>;
    passportScorer?: Resolver<Maybe<ResolversTypes['PassportScorer']>, ParentType, ContextType, RequireFields<QuerypassportScorerArgs, 'id' | 'subgraphError'>>;
    passportScorers?: Resolver<Array<ResolversTypes['PassportScorer']>, ParentType, ContextType, RequireFields<QuerypassportScorersArgs, 'skip' | 'first' | 'subgraphError'>>;
    passportStrategy?: Resolver<Maybe<ResolversTypes['PassportStrategy']>, ParentType, ContextType, RequireFields<QuerypassportStrategyArgs, 'id' | 'subgraphError'>>;
    passportStrategies?: Resolver<Array<ResolversTypes['PassportStrategy']>, ParentType, ContextType, RequireFields<QuerypassportStrategiesArgs, 'skip' | 'first' | 'subgraphError'>>;
    passportUser?: Resolver<Maybe<ResolversTypes['PassportUser']>, ParentType, ContextType, RequireFields<QuerypassportUserArgs, 'id' | 'subgraphError'>>;
    passportUsers?: Resolver<Array<ResolversTypes['PassportUser']>, ParentType, ContextType, RequireFields<QuerypassportUsersArgs, 'skip' | 'first' | 'subgraphError'>>;
    _meta?: Resolver<Maybe<ResolversTypes['_Meta_']>, ParentType, ContextType, Partial<Query_metaArgs>>;
}>;
export type RegistryCommunityResolvers<ContextType = MeshContext, ParentType extends ResolversParentTypes['RegistryCommunity'] = ResolversParentTypes['RegistryCommunity']> = ResolversObject<{
    id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
    chainId?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
    strategyTemplate?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
    profileId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
    communityFee?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
    protocolFee?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
    communityName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
    covenantIpfsHash?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
    registryFactory?: Resolver<Maybe<ResolversTypes['RegistryFactory']>, ParentType, ContextType>;
    strategies?: Resolver<Maybe<Array<ResolversTypes['CVStrategy']>>, ParentType, ContextType, RequireFields<RegistryCommunitystrategiesArgs, 'skip' | 'first'>>;
    councilSafe?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
    isKickEnabled?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
    registerStakeAmount?: Resolver<Maybe<ResolversTypes['BigInt']>, ParentType, ContextType>;
    registerToken?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
    alloAddress?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
    members?: Resolver<Maybe<Array<ResolversTypes['MemberCommunity']>>, ParentType, ContextType, RequireFields<RegistryCommunitymembersArgs, 'skip' | 'first'>>;
    garden?: Resolver<ResolversTypes['TokenGarden'], ParentType, ContextType>;
    isValid?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
    __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;
export type RegistryFactoryResolvers<ContextType = MeshContext, ParentType extends ResolversParentTypes['RegistryFactory'] = ResolversParentTypes['RegistryFactory']> = ResolversObject<{
    id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
    chainId?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
    registryCommunities?: Resolver<Maybe<Array<ResolversTypes['RegistryCommunity']>>, ParentType, ContextType, RequireFields<RegistryFactoryregistryCommunitiesArgs, 'skip' | 'first'>>;
    __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;
export type StakeResolvers<ContextType = MeshContext, ParentType extends ResolversParentTypes['Stake'] = ResolversParentTypes['Stake']> = ResolversObject<{
    id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
    member?: Resolver<ResolversTypes['Member'], ParentType, ContextType>;
    poolId?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
    proposal?: Resolver<ResolversTypes['CVProposal'], ParentType, ContextType>;
    amount?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
    createdAt?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
    __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;
export type SubscriptionResolvers<ContextType = MeshContext, ParentType extends ResolversParentTypes['Subscription'] = ResolversParentTypes['Subscription']> = ResolversObject<{
    cvstrategy?: SubscriptionResolver<Maybe<ResolversTypes['CVStrategy']>, "cvstrategy", ParentType, ContextType, RequireFields<SubscriptioncvstrategyArgs, 'id' | 'subgraphError'>>;
    cvstrategies?: SubscriptionResolver<Array<ResolversTypes['CVStrategy']>, "cvstrategies", ParentType, ContextType, RequireFields<SubscriptioncvstrategiesArgs, 'skip' | 'first' | 'subgraphError'>>;
    cvstrategyConfig?: SubscriptionResolver<Maybe<ResolversTypes['CVStrategyConfig']>, "cvstrategyConfig", ParentType, ContextType, RequireFields<SubscriptioncvstrategyConfigArgs, 'id' | 'subgraphError'>>;
    cvstrategyConfigs?: SubscriptionResolver<Array<ResolversTypes['CVStrategyConfig']>, "cvstrategyConfigs", ParentType, ContextType, RequireFields<SubscriptioncvstrategyConfigsArgs, 'skip' | 'first' | 'subgraphError'>>;
    cvproposal?: SubscriptionResolver<Maybe<ResolversTypes['CVProposal']>, "cvproposal", ParentType, ContextType, RequireFields<SubscriptioncvproposalArgs, 'id' | 'subgraphError'>>;
    cvproposals?: SubscriptionResolver<Array<ResolversTypes['CVProposal']>, "cvproposals", ParentType, ContextType, RequireFields<SubscriptioncvproposalsArgs, 'skip' | 'first' | 'subgraphError'>>;
    registryFactory?: SubscriptionResolver<Maybe<ResolversTypes['RegistryFactory']>, "registryFactory", ParentType, ContextType, RequireFields<SubscriptionregistryFactoryArgs, 'id' | 'subgraphError'>>;
    registryFactories?: SubscriptionResolver<Array<ResolversTypes['RegistryFactory']>, "registryFactories", ParentType, ContextType, RequireFields<SubscriptionregistryFactoriesArgs, 'skip' | 'first' | 'subgraphError'>>;
    registryCommunity?: SubscriptionResolver<Maybe<ResolversTypes['RegistryCommunity']>, "registryCommunity", ParentType, ContextType, RequireFields<SubscriptionregistryCommunityArgs, 'id' | 'subgraphError'>>;
    registryCommunities?: SubscriptionResolver<Array<ResolversTypes['RegistryCommunity']>, "registryCommunities", ParentType, ContextType, RequireFields<SubscriptionregistryCommunitiesArgs, 'skip' | 'first' | 'subgraphError'>>;
    member?: SubscriptionResolver<Maybe<ResolversTypes['Member']>, "member", ParentType, ContextType, RequireFields<SubscriptionmemberArgs, 'id' | 'subgraphError'>>;
    members?: SubscriptionResolver<Array<ResolversTypes['Member']>, "members", ParentType, ContextType, RequireFields<SubscriptionmembersArgs, 'skip' | 'first' | 'subgraphError'>>;
    stake?: SubscriptionResolver<Maybe<ResolversTypes['Stake']>, "stake", ParentType, ContextType, RequireFields<SubscriptionstakeArgs, 'id' | 'subgraphError'>>;
    stakes?: SubscriptionResolver<Array<ResolversTypes['Stake']>, "stakes", ParentType, ContextType, RequireFields<SubscriptionstakesArgs, 'skip' | 'first' | 'subgraphError'>>;
    memberCommunity?: SubscriptionResolver<Maybe<ResolversTypes['MemberCommunity']>, "memberCommunity", ParentType, ContextType, RequireFields<SubscriptionmemberCommunityArgs, 'id' | 'subgraphError'>>;
    memberCommunities?: SubscriptionResolver<Array<ResolversTypes['MemberCommunity']>, "memberCommunities", ParentType, ContextType, RequireFields<SubscriptionmemberCommunitiesArgs, 'skip' | 'first' | 'subgraphError'>>;
    memberStrategy?: SubscriptionResolver<Maybe<ResolversTypes['MemberStrategy']>, "memberStrategy", ParentType, ContextType, RequireFields<SubscriptionmemberStrategyArgs, 'id' | 'subgraphError'>>;
    memberStrategies?: SubscriptionResolver<Array<ResolversTypes['MemberStrategy']>, "memberStrategies", ParentType, ContextType, RequireFields<SubscriptionmemberStrategiesArgs, 'skip' | 'first' | 'subgraphError'>>;
    tokenGarden?: SubscriptionResolver<Maybe<ResolversTypes['TokenGarden']>, "tokenGarden", ParentType, ContextType, RequireFields<SubscriptiontokenGardenArgs, 'id' | 'subgraphError'>>;
    tokenGardens?: SubscriptionResolver<Array<ResolversTypes['TokenGarden']>, "tokenGardens", ParentType, ContextType, RequireFields<SubscriptiontokenGardensArgs, 'skip' | 'first' | 'subgraphError'>>;
    allo?: SubscriptionResolver<Maybe<ResolversTypes['Allo']>, "allo", ParentType, ContextType, RequireFields<SubscriptionalloArgs, 'id' | 'subgraphError'>>;
    allos?: SubscriptionResolver<Array<ResolversTypes['Allo']>, "allos", ParentType, ContextType, RequireFields<SubscriptionallosArgs, 'skip' | 'first' | 'subgraphError'>>;
    passportScorer?: SubscriptionResolver<Maybe<ResolversTypes['PassportScorer']>, "passportScorer", ParentType, ContextType, RequireFields<SubscriptionpassportScorerArgs, 'id' | 'subgraphError'>>;
    passportScorers?: SubscriptionResolver<Array<ResolversTypes['PassportScorer']>, "passportScorers", ParentType, ContextType, RequireFields<SubscriptionpassportScorersArgs, 'skip' | 'first' | 'subgraphError'>>;
    passportStrategy?: SubscriptionResolver<Maybe<ResolversTypes['PassportStrategy']>, "passportStrategy", ParentType, ContextType, RequireFields<SubscriptionpassportStrategyArgs, 'id' | 'subgraphError'>>;
    passportStrategies?: SubscriptionResolver<Array<ResolversTypes['PassportStrategy']>, "passportStrategies", ParentType, ContextType, RequireFields<SubscriptionpassportStrategiesArgs, 'skip' | 'first' | 'subgraphError'>>;
    passportUser?: SubscriptionResolver<Maybe<ResolversTypes['PassportUser']>, "passportUser", ParentType, ContextType, RequireFields<SubscriptionpassportUserArgs, 'id' | 'subgraphError'>>;
    passportUsers?: SubscriptionResolver<Array<ResolversTypes['PassportUser']>, "passportUsers", ParentType, ContextType, RequireFields<SubscriptionpassportUsersArgs, 'skip' | 'first' | 'subgraphError'>>;
    _meta?: SubscriptionResolver<Maybe<ResolversTypes['_Meta_']>, "_meta", ParentType, ContextType, Partial<Subscription_metaArgs>>;
}>;
export type TokenGardenResolvers<ContextType = MeshContext, ParentType extends ResolversParentTypes['TokenGarden'] = ResolversParentTypes['TokenGarden']> = ResolversObject<{
    id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
    name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
    description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
    chainId?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
    totalBalance?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
    ipfsCovenant?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
    symbol?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
    decimals?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
    address?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
    communities?: Resolver<Maybe<Array<ResolversTypes['RegistryCommunity']>>, ParentType, ContextType, RequireFields<TokenGardencommunitiesArgs, 'skip' | 'first'>>;
    __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;
export type _Block_Resolvers<ContextType = MeshContext, ParentType extends ResolversParentTypes['_Block_'] = ResolversParentTypes['_Block_']> = ResolversObject<{
    hash?: Resolver<Maybe<ResolversTypes['Bytes']>, ParentType, ContextType>;
    number?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
    timestamp?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
    __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;
export type _Meta_Resolvers<ContextType = MeshContext, ParentType extends ResolversParentTypes['_Meta_'] = ResolversParentTypes['_Meta_']> = ResolversObject<{
    block?: Resolver<ResolversTypes['_Block_'], ParentType, ContextType>;
    deployment?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
    hasIndexingErrors?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
    __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;
export type Resolvers<ContextType = MeshContext> = ResolversObject<{
    Allo?: AlloResolvers<ContextType>;
    BigDecimal?: GraphQLScalarType;
    BigInt?: GraphQLScalarType;
    Bytes?: GraphQLScalarType;
    CVProposal?: CVProposalResolvers<ContextType>;
    CVStrategy?: CVStrategyResolvers<ContextType>;
    CVStrategyConfig?: CVStrategyConfigResolvers<ContextType>;
    Int8?: GraphQLScalarType;
    Member?: MemberResolvers<ContextType>;
    MemberCommunity?: MemberCommunityResolvers<ContextType>;
    MemberStrategy?: MemberStrategyResolvers<ContextType>;
    PassportScorer?: PassportScorerResolvers<ContextType>;
    PassportStrategy?: PassportStrategyResolvers<ContextType>;
    PassportUser?: PassportUserResolvers<ContextType>;
    Query?: QueryResolvers<ContextType>;
    RegistryCommunity?: RegistryCommunityResolvers<ContextType>;
    RegistryFactory?: RegistryFactoryResolvers<ContextType>;
    Stake?: StakeResolvers<ContextType>;
    Subscription?: SubscriptionResolvers<ContextType>;
    TokenGarden?: TokenGardenResolvers<ContextType>;
    _Block_?: _Block_Resolvers<ContextType>;
    _Meta_?: _Meta_Resolvers<ContextType>;
}>;
export type DirectiveResolvers<ContextType = MeshContext> = ResolversObject<{
    entity?: entityDirectiveResolver<any, any, ContextType>;
    subgraphId?: subgraphIdDirectiveResolver<any, any, ContextType>;
    derivedFrom?: derivedFromDirectiveResolver<any, any, ContextType>;
}>;
export type MeshContext = Gv2Types.Context & BaseMeshContext;
export declare const rawServeConfig: YamlConfig.Config['serve'];
export declare function getMeshOptions(): Promise<GetMeshOptions>;
export declare function createBuiltMeshHTTPHandler<TServerContext = {}>(): MeshHTTPHandler<TServerContext>;
export declare function getBuiltGraphClient(): Promise<MeshInstance>;
export declare const execute: ExecuteMeshFn;
export declare const subscribe: SubscribeMeshFn;
export declare function getBuiltGraphSDK<TGlobalContext = any, TOperationContext = any>(globalContext?: TGlobalContext): {
    getFactories(variables?: Exact<{
        [key: string]: never;
    }>, options?: TOperationContext): Promise<getFactoriesQuery>;
    getTokenGardens(variables?: Exact<{
        [key: string]: never;
    }>, options?: TOperationContext): Promise<getTokenGardensQuery>;
    getMemberStrategy(variables: Exact<{
        wallet: string;
    }>, options?: TOperationContext): Promise<getMemberStrategyQuery>;
    isMember(variables: Exact<{
        me: string;
        comm: string;
    }>, options?: TOperationContext): Promise<isMemberQuery>;
    getMember(variables: Exact<{
        me: string;
    }>, options?: TOperationContext): Promise<getMemberQuery>;
    getPoolCreationData(variables: Exact<{
        communityAddr: string;
        tokenAddr: string;
    }>, options?: TOperationContext): Promise<getPoolCreationDataQuery>;
    getGarden(variables: Exact<{
        addr: string;
    }>, options?: TOperationContext): Promise<getGardenQuery>;
    getCommunity(variables: Exact<{
        communityAddr: string;
        tokenAddr: string;
    }>, options?: TOperationContext): Promise<getCommunityQuery>;
    getCommunityCreationData(variables: Exact<{
        addr: string;
    }>, options?: TOperationContext): Promise<getCommunityCreationDataQuery>;
    getPoolData(variables: Exact<{
        garden: string;
        poolId: any;
    }>, options?: TOperationContext): Promise<getPoolDataQuery>;
    getProposalData(variables: Exact<{
        garden: string;
        proposalId: string;
    }>, options?: TOperationContext): Promise<getProposalDataQuery>;
    getAllo(variables?: Exact<{
        [key: string]: never;
    }>, options?: TOperationContext): Promise<getAlloQuery>;
    getStrategyByPool(variables: Exact<{
        poolId: any;
    }>, options?: TOperationContext): Promise<getStrategyByPoolQuery>;
    getTokenTitle(variables: Exact<{
        tokenAddr: string;
    }>, options?: TOperationContext): Promise<getTokenTitleQuery>;
    getCommunityTitles(variables: Exact<{
        communityAddr: string;
    }>, options?: TOperationContext): Promise<getCommunityTitlesQuery>;
    getPoolTitles(variables: Exact<{
        poolId: any;
    }>, options?: TOperationContext): Promise<getPoolTitlesQuery>;
    getProposalTitles(variables: Exact<{
        proposalId: string;
    }>, options?: TOperationContext): Promise<getProposalTitlesQuery>;
    getPassportScorer(variables: Exact<{
        scorerId: string;
    }>, options?: TOperationContext): Promise<getPassportScorerQuery>;
    getPassportStrategy(variables: Exact<{
        strategyId: string;
    }>, options?: TOperationContext): Promise<getPassportStrategyQuery>;
    getPassportUser(variables: Exact<{
        userId: string;
    }>, options?: TOperationContext): Promise<getPassportUserQuery>;
};
export type getFactoriesQueryVariables = Exact<{
    [key: string]: never;
}>;
export type getFactoriesQuery = {
    registryFactories: Array<(Pick<RegistryFactory, 'id'> & {
        registryCommunities?: Maybe<Array<(Pick<RegistryCommunity, 'id' | 'chainId' | 'isValid' | 'communityName' | 'covenantIpfsHash' | 'registerToken' | 'alloAddress'> & {
            members?: Maybe<Array<Pick<MemberCommunity, 'memberAddress'>>>;
            strategies?: Maybe<Array<(Pick<CVStrategy, 'id' | 'poolId' | 'isEnabled'> & {
                config: Pick<CVStrategyConfig, 'id' | 'decay' | 'maxRatio' | 'weight' | 'minThresholdPoints'>;
            })>>;
        })>>;
    })>;
};
export type getTokenGardensQueryVariables = Exact<{
    [key: string]: never;
}>;
export type getTokenGardensQuery = {
    tokenGardens: Array<(Pick<TokenGarden, 'id' | 'chainId' | 'name' | 'symbol' | 'decimals' | 'totalBalance'> & {
        communities?: Maybe<Array<(Pick<RegistryCommunity, 'id' | 'chainId' | 'covenantIpfsHash' | 'communityFee' | 'isValid' | 'communityName'> & {
            strategies?: Maybe<Array<Pick<CVStrategy, 'id'>>>;
            members?: Maybe<Array<Pick<MemberCommunity, 'id' | 'memberAddress'>>>;
        })>>;
    })>;
};
export type getMemberStrategyQueryVariables = Exact<{
    wallet: Scalars['ID'];
}>;
export type getMemberStrategyQuery = {
    memberStrategy?: Maybe<(Pick<MemberStrategy, 'id' | 'totalStakedPoints' | 'activatedPoints'> & {
        strategy: Pick<CVStrategy, 'id'>;
        member: Pick<Member, 'id'>;
    })>;
};
export type isMemberQueryVariables = Exact<{
    me: Scalars['ID'];
    comm: Scalars['String'];
}>;
export type isMemberQuery = {
    members: Array<(Pick<Member, 'id'> & {
        stakes?: Maybe<Array<(Pick<Stake, 'id' | 'amount'> & {
            proposal: (Pick<CVProposal, 'id' | 'proposalNumber' | 'stakedAmount'> & {
                strategy: (Pick<CVStrategy, 'id' | 'poolId'> & {
                    registryCommunity: (Pick<RegistryCommunity, 'id' | 'isValid'> & {
                        garden: Pick<TokenGarden, 'id' | 'symbol' | 'decimals'>;
                    });
                });
            });
        })>>;
        memberCommunity?: Maybe<Array<(Pick<MemberCommunity, 'stakedTokens'> & {
            registryCommunity: Pick<RegistryCommunity, 'id'>;
        })>>;
    })>;
};
export type getMemberQueryVariables = Exact<{
    me: Scalars['ID'];
}>;
export type getMemberQuery = {
    member?: Maybe<(Pick<Member, 'id'> & {
        memberCommunity?: Maybe<Array<(Pick<MemberCommunity, 'id' | 'stakedTokens' | 'isRegistered'> & {
            registryCommunity: Pick<RegistryCommunity, 'id' | 'isValid'>;
        })>>;
        stakes?: Maybe<Array<(Pick<Stake, 'id' | 'amount' | 'createdAt'> & {
            proposal: Pick<CVProposal, 'proposalNumber' | 'id'>;
        })>>;
    })>;
};
export type getPoolCreationDataQueryVariables = Exact<{
    communityAddr: Scalars['ID'];
    tokenAddr: Scalars['ID'];
}>;
export type getPoolCreationDataQuery = {
    tokenGarden?: Maybe<Pick<TokenGarden, 'decimals' | 'id' | 'symbol'>>;
    allos: Array<Pick<Allo, 'id'>>;
    registryCommunity?: Maybe<Pick<RegistryCommunity, 'communityName' | 'isValid'>>;
};
export type getGardenQueryVariables = Exact<{
    addr: Scalars['ID'];
}>;
export type getGardenQuery = {
    tokenGarden?: Maybe<(Pick<TokenGarden, 'id' | 'name' | 'symbol' | 'decimals' | 'chainId'> & {
        communities?: Maybe<Array<(Pick<RegistryCommunity, 'id' | 'isValid' | 'covenantIpfsHash' | 'communityName' | 'protocolFee' | 'communityFee' | 'registerToken' | 'registerStakeAmount' | 'alloAddress'> & {
            members?: Maybe<Array<Pick<MemberCommunity, 'id' | 'memberAddress'>>>;
            strategies?: Maybe<Array<Pick<CVStrategy, 'id' | 'totalEffectiveActivePoints' | 'poolId' | 'poolAmount'>>>;
        })>>;
    })>;
};
export type getCommunityQueryVariables = Exact<{
    communityAddr: Scalars['ID'];
    tokenAddr: Scalars['ID'];
}>;
export type getCommunityQuery = {
    registryCommunity?: Maybe<(Pick<RegistryCommunity, 'communityName' | 'id' | 'covenantIpfsHash' | 'communityFee' | 'protocolFee' | 'registerStakeAmount' | 'registerToken'> & {
        members?: Maybe<Array<Pick<MemberCommunity, 'id' | 'stakedTokens'>>>;
        strategies?: Maybe<Array<(Pick<CVStrategy, 'id' | 'isEnabled' | 'poolAmount' | 'poolId' | 'metadata'> & {
            proposals: Array<Pick<CVProposal, 'id'>>;
            config: Pick<CVStrategyConfig, 'proposalType'>;
        })>>;
    })>;
    tokenGarden?: Maybe<Pick<TokenGarden, 'symbol' | 'decimals' | 'id'>>;
};
export type getCommunityCreationDataQueryVariables = Exact<{
    addr: Scalars['ID'];
}>;
export type getCommunityCreationDataQuery = {
    registryFactories: Array<Pick<RegistryFactory, 'id'>>;
    tokenGarden?: Maybe<(Pick<TokenGarden, 'id' | 'name' | 'symbol' | 'decimals' | 'chainId'> & {
        communities?: Maybe<Array<Pick<RegistryCommunity, 'alloAddress' | 'isValid'>>>;
    })>;
};
export type getPoolDataQueryVariables = Exact<{
    garden: Scalars['ID'];
    poolId: Scalars['BigInt'];
}>;
export type getPoolDataQuery = {
    allos: Array<Pick<Allo, 'id' | 'chainId' | 'tokenNative'>>;
    tokenGarden?: Maybe<Pick<TokenGarden, 'address' | 'name' | 'symbol' | 'description' | 'totalBalance' | 'ipfsCovenant' | 'decimals'>>;
    cvstrategies: Array<(Pick<CVStrategy, 'poolAmount' | 'metadata' | 'id' | 'poolId' | 'totalEffectiveActivePoints' | 'isEnabled'> & {
        memberActive?: Maybe<Array<Pick<Member, 'id'>>>;
        config: Pick<CVStrategyConfig, 'id' | 'proposalType' | 'pointSystem' | 'maxRatio' | 'minThresholdPoints'>;
        registryCommunity: (Pick<RegistryCommunity, 'id' | 'isValid'> & {
            garden: Pick<TokenGarden, 'id' | 'symbol' | 'decimals'>;
        });
        proposals: Array<Pick<CVProposal, 'id' | 'proposalNumber' | 'metadata' | 'beneficiary' | 'requestedAmount' | 'requestedToken' | 'proposalStatus' | 'stakedAmount'>>;
    })>;
};
export type getProposalDataQueryVariables = Exact<{
    garden: Scalars['ID'];
    proposalId: Scalars['ID'];
}>;
export type getProposalDataQuery = {
    tokenGarden?: Maybe<Pick<TokenGarden, 'name' | 'symbol' | 'decimals'>>;
    cvproposal?: Maybe<(Pick<CVProposal, 'proposalNumber' | 'beneficiary' | 'blockLast' | 'convictionLast' | 'createdAt' | 'metadata' | 'proposalStatus' | 'requestedAmount' | 'requestedToken' | 'stakedAmount' | 'submitter' | 'threshold' | 'updatedAt' | 'version'> & {
        strategy: (Pick<CVStrategy, 'id'> & {
            config: Pick<CVStrategyConfig, 'proposalType' | 'pointSystem' | 'minThresholdPoints'>;
        });
    })>;
};
export type getAlloQueryVariables = Exact<{
    [key: string]: never;
}>;
export type getAlloQuery = {
    allos: Array<Pick<Allo, 'id' | 'chainId' | 'tokenNative'>>;
};
export type getStrategyByPoolQueryVariables = Exact<{
    poolId: Scalars['BigInt'];
}>;
export type getStrategyByPoolQuery = {
    cvstrategies: Array<(Pick<CVStrategy, 'id' | 'poolId' | 'totalEffectiveActivePoints' | 'isEnabled'> & {
        config: Pick<CVStrategyConfig, 'id' | 'proposalType' | 'pointSystem' | 'minThresholdPoints'>;
        memberActive?: Maybe<Array<Pick<Member, 'id'>>>;
        registryCommunity: (Pick<RegistryCommunity, 'id' | 'isValid'> & {
            garden: Pick<TokenGarden, 'id' | 'symbol' | 'decimals'>;
        });
        proposals: Array<Pick<CVProposal, 'id' | 'proposalNumber' | 'metadata' | 'beneficiary' | 'requestedAmount' | 'requestedToken' | 'proposalStatus' | 'stakedAmount'>>;
    })>;
};
export type getTokenTitleQueryVariables = Exact<{
    tokenAddr: Scalars['ID'];
}>;
export type getTokenTitleQuery = {
    tokenGarden?: Maybe<Pick<TokenGarden, 'name'>>;
};
export type getCommunityTitlesQueryVariables = Exact<{
    communityAddr: Scalars['ID'];
}>;
export type getCommunityTitlesQuery = {
    registryCommunity?: Maybe<(Pick<RegistryCommunity, 'communityName'> & {
        garden: Pick<TokenGarden, 'name'>;
    })>;
};
export type getPoolTitlesQueryVariables = Exact<{
    poolId: Scalars['BigInt'];
}>;
export type getPoolTitlesQuery = {
    cvstrategies: Array<(Pick<CVStrategy, 'poolId' | 'metadata'> & {
        registryCommunity: (Pick<RegistryCommunity, 'communityName'> & {
            garden: Pick<TokenGarden, 'name'>;
        });
    })>;
};
export type getProposalTitlesQueryVariables = Exact<{
    proposalId: Scalars['ID'];
}>;
export type getProposalTitlesQuery = {
    cvproposal?: Maybe<(Pick<CVProposal, 'proposalNumber' | 'metadata'> & {
        strategy: (Pick<CVStrategy, 'poolId' | 'metadata'> & {
            registryCommunity: (Pick<RegistryCommunity, 'communityName'> & {
                garden: Pick<TokenGarden, 'name'>;
            });
        });
    })>;
};
export type getPassportScorerQueryVariables = Exact<{
    scorerId: Scalars['ID'];
}>;
export type getPassportScorerQuery = {
    passportScorer?: Maybe<(Pick<PassportScorer, 'id'> & {
        strategies?: Maybe<Array<(Pick<PassportStrategy, 'id' | 'threshold' | 'councilSafe' | 'active'> & {
            strategy: Pick<CVStrategy, 'id'>;
        })>>;
        users?: Maybe<Array<Pick<PassportUser, 'id' | 'userAddress' | 'score' | 'lastUpdated'>>>;
    })>;
};
export type getPassportStrategyQueryVariables = Exact<{
    strategyId: Scalars['ID'];
}>;
export type getPassportStrategyQuery = {
    passportStrategy?: Maybe<(Pick<PassportStrategy, 'id' | 'threshold' | 'councilSafe' | 'active'> & {
        strategy: Pick<CVStrategy, 'id'>;
    })>;
};
export type getPassportUserQueryVariables = Exact<{
    userId: Scalars['ID'];
}>;
export type getPassportUserQuery = {
    passportUser?: Maybe<Pick<PassportUser, 'id' | 'userAddress' | 'score' | 'lastUpdated'>>;
};
export declare const getFactoriesDocument: DocumentNode<getFactoriesQuery, Exact<{
    [key: string]: never;
}>>;
export declare const getTokenGardensDocument: DocumentNode<getTokenGardensQuery, Exact<{
    [key: string]: never;
}>>;
export declare const getMemberStrategyDocument: DocumentNode<getMemberStrategyQuery, Exact<{
    wallet: Scalars['ID'];
}>>;
export declare const isMemberDocument: DocumentNode<isMemberQuery, Exact<{
    me: Scalars['ID'];
    comm: Scalars['String'];
}>>;
export declare const getMemberDocument: DocumentNode<getMemberQuery, Exact<{
    me: Scalars['ID'];
}>>;
export declare const getPoolCreationDataDocument: DocumentNode<getPoolCreationDataQuery, Exact<{
    communityAddr: Scalars['ID'];
    tokenAddr: Scalars['ID'];
}>>;
export declare const getGardenDocument: DocumentNode<getGardenQuery, Exact<{
    addr: Scalars['ID'];
}>>;
export declare const getCommunityDocument: DocumentNode<getCommunityQuery, Exact<{
    communityAddr: Scalars['ID'];
    tokenAddr: Scalars['ID'];
}>>;
export declare const getCommunityCreationDataDocument: DocumentNode<getCommunityCreationDataQuery, Exact<{
    addr: Scalars['ID'];
}>>;
export declare const getPoolDataDocument: DocumentNode<getPoolDataQuery, Exact<{
    garden: Scalars['ID'];
    poolId: Scalars['BigInt'];
}>>;
export declare const getProposalDataDocument: DocumentNode<getProposalDataQuery, Exact<{
    garden: Scalars['ID'];
    proposalId: Scalars['ID'];
}>>;
export declare const getAlloDocument: DocumentNode<getAlloQuery, Exact<{
    [key: string]: never;
}>>;
export declare const getStrategyByPoolDocument: DocumentNode<getStrategyByPoolQuery, Exact<{
    poolId: Scalars['BigInt'];
}>>;
export declare const getTokenTitleDocument: DocumentNode<getTokenTitleQuery, Exact<{
    tokenAddr: Scalars['ID'];
}>>;
export declare const getCommunityTitlesDocument: DocumentNode<getCommunityTitlesQuery, Exact<{
    communityAddr: Scalars['ID'];
}>>;
export declare const getPoolTitlesDocument: DocumentNode<getPoolTitlesQuery, Exact<{
    poolId: Scalars['BigInt'];
}>>;
export declare const getProposalTitlesDocument: DocumentNode<getProposalTitlesQuery, Exact<{
    proposalId: Scalars['ID'];
}>>;
export declare const getPassportScorerDocument: DocumentNode<getPassportScorerQuery, Exact<{
    scorerId: Scalars['ID'];
}>>;
export declare const getPassportStrategyDocument: DocumentNode<getPassportStrategyQuery, Exact<{
    strategyId: Scalars['ID'];
}>>;
export declare const getPassportUserDocument: DocumentNode<getPassportUserQuery, Exact<{
    userId: Scalars['ID'];
}>>;
export type Requester<C = {}, E = unknown> = <R, V>(doc: DocumentNode, vars?: V, options?: C) => Promise<R> | AsyncIterable<R>;
export declare function getSdk<C, E>(requester: Requester<C, E>): {
    getFactories(variables?: getFactoriesQueryVariables, options?: C): Promise<getFactoriesQuery>;
    getTokenGardens(variables?: getTokenGardensQueryVariables, options?: C): Promise<getTokenGardensQuery>;
    getMemberStrategy(variables: getMemberStrategyQueryVariables, options?: C): Promise<getMemberStrategyQuery>;
    isMember(variables: isMemberQueryVariables, options?: C): Promise<isMemberQuery>;
    getMember(variables: getMemberQueryVariables, options?: C): Promise<getMemberQuery>;
    getPoolCreationData(variables: getPoolCreationDataQueryVariables, options?: C): Promise<getPoolCreationDataQuery>;
    getGarden(variables: getGardenQueryVariables, options?: C): Promise<getGardenQuery>;
    getCommunity(variables: getCommunityQueryVariables, options?: C): Promise<getCommunityQuery>;
    getCommunityCreationData(variables: getCommunityCreationDataQueryVariables, options?: C): Promise<getCommunityCreationDataQuery>;
    getPoolData(variables: getPoolDataQueryVariables, options?: C): Promise<getPoolDataQuery>;
    getProposalData(variables: getProposalDataQueryVariables, options?: C): Promise<getProposalDataQuery>;
    getAllo(variables?: getAlloQueryVariables, options?: C): Promise<getAlloQuery>;
    getStrategyByPool(variables: getStrategyByPoolQueryVariables, options?: C): Promise<getStrategyByPoolQuery>;
    getTokenTitle(variables: getTokenTitleQueryVariables, options?: C): Promise<getTokenTitleQuery>;
    getCommunityTitles(variables: getCommunityTitlesQueryVariables, options?: C): Promise<getCommunityTitlesQuery>;
    getPoolTitles(variables: getPoolTitlesQueryVariables, options?: C): Promise<getPoolTitlesQuery>;
    getProposalTitles(variables: getProposalTitlesQueryVariables, options?: C): Promise<getProposalTitlesQuery>;
    getPassportScorer(variables: getPassportScorerQueryVariables, options?: C): Promise<getPassportScorerQuery>;
    getPassportStrategy(variables: getPassportStrategyQueryVariables, options?: C): Promise<getPassportStrategyQuery>;
    getPassportUser(variables: getPassportUserQueryVariables, options?: C): Promise<getPassportUserQuery>;
};
export type Sdk = ReturnType<typeof getSdk>;
