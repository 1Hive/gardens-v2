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
export type MakeEmpty<T extends {
    [key: string]: unknown;
}, K extends keyof T> = {
    [_ in K]?: never;
};
export type Incremental<T> = T | {
    [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never;
};
export type RequireFields<T, K extends keyof T> = Omit<T, K> & {
    [P in K]-?: NonNullable<T[P]>;
};
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
    ID: {
        input: string;
        output: string;
    };
    String: {
        input: string;
        output: string;
    };
    Boolean: {
        input: boolean;
        output: boolean;
    };
    Int: {
        input: number;
        output: number;
    };
    Float: {
        input: number;
        output: number;
    };
    BigDecimal: {
        input: any;
        output: any;
    };
    BigInt: {
        input: any;
        output: any;
    };
    Bytes: {
        input: any;
        output: any;
    };
    Int8: {
        input: any;
        output: any;
    };
    Timestamp: {
        input: any;
        output: any;
    };
};
export type Aggregation_interval = 'hour' | 'day';
export type Allo = {
    id: Scalars['ID']['output'];
    chainId: Scalars['BigInt']['output'];
    tokenNative: Scalars['String']['output'];
};
export type Allo_filter = {
    id?: InputMaybe<Scalars['ID']['input']>;
    id_not?: InputMaybe<Scalars['ID']['input']>;
    id_gt?: InputMaybe<Scalars['ID']['input']>;
    id_lt?: InputMaybe<Scalars['ID']['input']>;
    id_gte?: InputMaybe<Scalars['ID']['input']>;
    id_lte?: InputMaybe<Scalars['ID']['input']>;
    id_in?: InputMaybe<Array<Scalars['ID']['input']>>;
    id_not_in?: InputMaybe<Array<Scalars['ID']['input']>>;
    chainId?: InputMaybe<Scalars['BigInt']['input']>;
    chainId_not?: InputMaybe<Scalars['BigInt']['input']>;
    chainId_gt?: InputMaybe<Scalars['BigInt']['input']>;
    chainId_lt?: InputMaybe<Scalars['BigInt']['input']>;
    chainId_gte?: InputMaybe<Scalars['BigInt']['input']>;
    chainId_lte?: InputMaybe<Scalars['BigInt']['input']>;
    chainId_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    chainId_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    tokenNative?: InputMaybe<Scalars['String']['input']>;
    tokenNative_not?: InputMaybe<Scalars['String']['input']>;
    tokenNative_gt?: InputMaybe<Scalars['String']['input']>;
    tokenNative_lt?: InputMaybe<Scalars['String']['input']>;
    tokenNative_gte?: InputMaybe<Scalars['String']['input']>;
    tokenNative_lte?: InputMaybe<Scalars['String']['input']>;
    tokenNative_in?: InputMaybe<Array<Scalars['String']['input']>>;
    tokenNative_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
    tokenNative_contains?: InputMaybe<Scalars['String']['input']>;
    tokenNative_contains_nocase?: InputMaybe<Scalars['String']['input']>;
    tokenNative_not_contains?: InputMaybe<Scalars['String']['input']>;
    tokenNative_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
    tokenNative_starts_with?: InputMaybe<Scalars['String']['input']>;
    tokenNative_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
    tokenNative_not_starts_with?: InputMaybe<Scalars['String']['input']>;
    tokenNative_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
    tokenNative_ends_with?: InputMaybe<Scalars['String']['input']>;
    tokenNative_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
    tokenNative_not_ends_with?: InputMaybe<Scalars['String']['input']>;
    tokenNative_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
    /** Filter for the block changed event. */
    _change_block?: InputMaybe<BlockChangedFilter>;
    and?: InputMaybe<Array<InputMaybe<Allo_filter>>>;
    or?: InputMaybe<Array<InputMaybe<Allo_filter>>>;
};
export type Allo_orderBy = 'id' | 'chainId' | 'tokenNative';
export type ArbitrableConfig = {
    id: Scalars['ID']['output'];
    version: Scalars['BigInt']['output'];
    strategy: CVStrategy;
    arbitrator: Scalars['String']['output'];
    tribunalSafe: Scalars['String']['output'];
    challengerCollateralAmount: Scalars['BigInt']['output'];
    submitterCollateralAmount: Scalars['BigInt']['output'];
    defaultRuling: Scalars['BigInt']['output'];
    defaultRulingTimeout: Scalars['BigInt']['output'];
    allowlist?: Maybe<Array<Scalars['String']['output']>>;
};
export type ArbitrableConfig_filter = {
    id?: InputMaybe<Scalars['ID']['input']>;
    id_not?: InputMaybe<Scalars['ID']['input']>;
    id_gt?: InputMaybe<Scalars['ID']['input']>;
    id_lt?: InputMaybe<Scalars['ID']['input']>;
    id_gte?: InputMaybe<Scalars['ID']['input']>;
    id_lte?: InputMaybe<Scalars['ID']['input']>;
    id_in?: InputMaybe<Array<Scalars['ID']['input']>>;
    id_not_in?: InputMaybe<Array<Scalars['ID']['input']>>;
    version?: InputMaybe<Scalars['BigInt']['input']>;
    version_not?: InputMaybe<Scalars['BigInt']['input']>;
    version_gt?: InputMaybe<Scalars['BigInt']['input']>;
    version_lt?: InputMaybe<Scalars['BigInt']['input']>;
    version_gte?: InputMaybe<Scalars['BigInt']['input']>;
    version_lte?: InputMaybe<Scalars['BigInt']['input']>;
    version_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    version_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    strategy?: InputMaybe<Scalars['String']['input']>;
    strategy_not?: InputMaybe<Scalars['String']['input']>;
    strategy_gt?: InputMaybe<Scalars['String']['input']>;
    strategy_lt?: InputMaybe<Scalars['String']['input']>;
    strategy_gte?: InputMaybe<Scalars['String']['input']>;
    strategy_lte?: InputMaybe<Scalars['String']['input']>;
    strategy_in?: InputMaybe<Array<Scalars['String']['input']>>;
    strategy_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
    strategy_contains?: InputMaybe<Scalars['String']['input']>;
    strategy_contains_nocase?: InputMaybe<Scalars['String']['input']>;
    strategy_not_contains?: InputMaybe<Scalars['String']['input']>;
    strategy_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
    strategy_starts_with?: InputMaybe<Scalars['String']['input']>;
    strategy_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
    strategy_not_starts_with?: InputMaybe<Scalars['String']['input']>;
    strategy_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
    strategy_ends_with?: InputMaybe<Scalars['String']['input']>;
    strategy_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
    strategy_not_ends_with?: InputMaybe<Scalars['String']['input']>;
    strategy_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
    strategy_?: InputMaybe<CVStrategy_filter>;
    arbitrator?: InputMaybe<Scalars['String']['input']>;
    arbitrator_not?: InputMaybe<Scalars['String']['input']>;
    arbitrator_gt?: InputMaybe<Scalars['String']['input']>;
    arbitrator_lt?: InputMaybe<Scalars['String']['input']>;
    arbitrator_gte?: InputMaybe<Scalars['String']['input']>;
    arbitrator_lte?: InputMaybe<Scalars['String']['input']>;
    arbitrator_in?: InputMaybe<Array<Scalars['String']['input']>>;
    arbitrator_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
    arbitrator_contains?: InputMaybe<Scalars['String']['input']>;
    arbitrator_contains_nocase?: InputMaybe<Scalars['String']['input']>;
    arbitrator_not_contains?: InputMaybe<Scalars['String']['input']>;
    arbitrator_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
    arbitrator_starts_with?: InputMaybe<Scalars['String']['input']>;
    arbitrator_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
    arbitrator_not_starts_with?: InputMaybe<Scalars['String']['input']>;
    arbitrator_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
    arbitrator_ends_with?: InputMaybe<Scalars['String']['input']>;
    arbitrator_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
    arbitrator_not_ends_with?: InputMaybe<Scalars['String']['input']>;
    arbitrator_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
    tribunalSafe?: InputMaybe<Scalars['String']['input']>;
    tribunalSafe_not?: InputMaybe<Scalars['String']['input']>;
    tribunalSafe_gt?: InputMaybe<Scalars['String']['input']>;
    tribunalSafe_lt?: InputMaybe<Scalars['String']['input']>;
    tribunalSafe_gte?: InputMaybe<Scalars['String']['input']>;
    tribunalSafe_lte?: InputMaybe<Scalars['String']['input']>;
    tribunalSafe_in?: InputMaybe<Array<Scalars['String']['input']>>;
    tribunalSafe_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
    tribunalSafe_contains?: InputMaybe<Scalars['String']['input']>;
    tribunalSafe_contains_nocase?: InputMaybe<Scalars['String']['input']>;
    tribunalSafe_not_contains?: InputMaybe<Scalars['String']['input']>;
    tribunalSafe_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
    tribunalSafe_starts_with?: InputMaybe<Scalars['String']['input']>;
    tribunalSafe_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
    tribunalSafe_not_starts_with?: InputMaybe<Scalars['String']['input']>;
    tribunalSafe_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
    tribunalSafe_ends_with?: InputMaybe<Scalars['String']['input']>;
    tribunalSafe_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
    tribunalSafe_not_ends_with?: InputMaybe<Scalars['String']['input']>;
    tribunalSafe_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
    challengerCollateralAmount?: InputMaybe<Scalars['BigInt']['input']>;
    challengerCollateralAmount_not?: InputMaybe<Scalars['BigInt']['input']>;
    challengerCollateralAmount_gt?: InputMaybe<Scalars['BigInt']['input']>;
    challengerCollateralAmount_lt?: InputMaybe<Scalars['BigInt']['input']>;
    challengerCollateralAmount_gte?: InputMaybe<Scalars['BigInt']['input']>;
    challengerCollateralAmount_lte?: InputMaybe<Scalars['BigInt']['input']>;
    challengerCollateralAmount_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    challengerCollateralAmount_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    submitterCollateralAmount?: InputMaybe<Scalars['BigInt']['input']>;
    submitterCollateralAmount_not?: InputMaybe<Scalars['BigInt']['input']>;
    submitterCollateralAmount_gt?: InputMaybe<Scalars['BigInt']['input']>;
    submitterCollateralAmount_lt?: InputMaybe<Scalars['BigInt']['input']>;
    submitterCollateralAmount_gte?: InputMaybe<Scalars['BigInt']['input']>;
    submitterCollateralAmount_lte?: InputMaybe<Scalars['BigInt']['input']>;
    submitterCollateralAmount_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    submitterCollateralAmount_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    defaultRuling?: InputMaybe<Scalars['BigInt']['input']>;
    defaultRuling_not?: InputMaybe<Scalars['BigInt']['input']>;
    defaultRuling_gt?: InputMaybe<Scalars['BigInt']['input']>;
    defaultRuling_lt?: InputMaybe<Scalars['BigInt']['input']>;
    defaultRuling_gte?: InputMaybe<Scalars['BigInt']['input']>;
    defaultRuling_lte?: InputMaybe<Scalars['BigInt']['input']>;
    defaultRuling_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    defaultRuling_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    defaultRulingTimeout?: InputMaybe<Scalars['BigInt']['input']>;
    defaultRulingTimeout_not?: InputMaybe<Scalars['BigInt']['input']>;
    defaultRulingTimeout_gt?: InputMaybe<Scalars['BigInt']['input']>;
    defaultRulingTimeout_lt?: InputMaybe<Scalars['BigInt']['input']>;
    defaultRulingTimeout_gte?: InputMaybe<Scalars['BigInt']['input']>;
    defaultRulingTimeout_lte?: InputMaybe<Scalars['BigInt']['input']>;
    defaultRulingTimeout_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    defaultRulingTimeout_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    allowlist?: InputMaybe<Array<Scalars['String']['input']>>;
    allowlist_not?: InputMaybe<Array<Scalars['String']['input']>>;
    allowlist_contains?: InputMaybe<Array<Scalars['String']['input']>>;
    allowlist_contains_nocase?: InputMaybe<Array<Scalars['String']['input']>>;
    allowlist_not_contains?: InputMaybe<Array<Scalars['String']['input']>>;
    allowlist_not_contains_nocase?: InputMaybe<Array<Scalars['String']['input']>>;
    /** Filter for the block changed event. */
    _change_block?: InputMaybe<BlockChangedFilter>;
    and?: InputMaybe<Array<InputMaybe<ArbitrableConfig_filter>>>;
    or?: InputMaybe<Array<InputMaybe<ArbitrableConfig_filter>>>;
};
export type ArbitrableConfig_orderBy = 'id' | 'version' | 'strategy' | 'strategy__id' | 'strategy__poolId' | 'strategy__poolAmount' | 'strategy__metadata' | 'strategy__maxCVSupply' | 'strategy__totalEffectiveActivePoints' | 'strategy__isEnabled' | 'strategy__token' | 'strategy__archived' | 'arbitrator' | 'tribunalSafe' | 'challengerCollateralAmount' | 'submitterCollateralAmount' | 'defaultRuling' | 'defaultRulingTimeout' | 'allowlist';
export type BlockChangedFilter = {
    number_gte: Scalars['Int']['input'];
};
export type Block_height = {
    hash?: InputMaybe<Scalars['Bytes']['input']>;
    number?: InputMaybe<Scalars['Int']['input']>;
    number_gte?: InputMaybe<Scalars['Int']['input']>;
};
export type CVProposal = {
    id: Scalars['ID']['output'];
    proposalNumber: Scalars['BigInt']['output'];
    metadata?: Maybe<ProposalMetadata>;
    metadataHash: Scalars['String']['output'];
    version?: Maybe<Scalars['BigInt']['output']>;
    strategy: CVStrategy;
    beneficiary: Scalars['String']['output'];
    requestedAmount: Scalars['BigInt']['output'];
    requestedToken: Scalars['String']['output'];
    proposalStatus: Scalars['BigInt']['output'];
    blockLast: Scalars['BigInt']['output'];
    convictionLast: Scalars['BigInt']['output'];
    threshold: Scalars['BigInt']['output'];
    maxCVStaked: Scalars['BigInt']['output'];
    stakedAmount: Scalars['BigInt']['output'];
    submitter: Scalars['String']['output'];
    createdAt: Scalars['BigInt']['output'];
    updatedAt: Scalars['BigInt']['output'];
    arbitrableConfig: ArbitrableConfig;
};
export type CVProposal_filter = {
    id?: InputMaybe<Scalars['ID']['input']>;
    id_not?: InputMaybe<Scalars['ID']['input']>;
    id_gt?: InputMaybe<Scalars['ID']['input']>;
    id_lt?: InputMaybe<Scalars['ID']['input']>;
    id_gte?: InputMaybe<Scalars['ID']['input']>;
    id_lte?: InputMaybe<Scalars['ID']['input']>;
    id_in?: InputMaybe<Array<Scalars['ID']['input']>>;
    id_not_in?: InputMaybe<Array<Scalars['ID']['input']>>;
    proposalNumber?: InputMaybe<Scalars['BigInt']['input']>;
    proposalNumber_not?: InputMaybe<Scalars['BigInt']['input']>;
    proposalNumber_gt?: InputMaybe<Scalars['BigInt']['input']>;
    proposalNumber_lt?: InputMaybe<Scalars['BigInt']['input']>;
    proposalNumber_gte?: InputMaybe<Scalars['BigInt']['input']>;
    proposalNumber_lte?: InputMaybe<Scalars['BigInt']['input']>;
    proposalNumber_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    proposalNumber_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    metadata?: InputMaybe<Scalars['String']['input']>;
    metadata_not?: InputMaybe<Scalars['String']['input']>;
    metadata_gt?: InputMaybe<Scalars['String']['input']>;
    metadata_lt?: InputMaybe<Scalars['String']['input']>;
    metadata_gte?: InputMaybe<Scalars['String']['input']>;
    metadata_lte?: InputMaybe<Scalars['String']['input']>;
    metadata_in?: InputMaybe<Array<Scalars['String']['input']>>;
    metadata_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
    metadata_contains?: InputMaybe<Scalars['String']['input']>;
    metadata_contains_nocase?: InputMaybe<Scalars['String']['input']>;
    metadata_not_contains?: InputMaybe<Scalars['String']['input']>;
    metadata_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
    metadata_starts_with?: InputMaybe<Scalars['String']['input']>;
    metadata_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
    metadata_not_starts_with?: InputMaybe<Scalars['String']['input']>;
    metadata_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
    metadata_ends_with?: InputMaybe<Scalars['String']['input']>;
    metadata_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
    metadata_not_ends_with?: InputMaybe<Scalars['String']['input']>;
    metadata_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
    metadata_?: InputMaybe<ProposalMetadata_filter>;
    metadataHash?: InputMaybe<Scalars['String']['input']>;
    metadataHash_not?: InputMaybe<Scalars['String']['input']>;
    metadataHash_gt?: InputMaybe<Scalars['String']['input']>;
    metadataHash_lt?: InputMaybe<Scalars['String']['input']>;
    metadataHash_gte?: InputMaybe<Scalars['String']['input']>;
    metadataHash_lte?: InputMaybe<Scalars['String']['input']>;
    metadataHash_in?: InputMaybe<Array<Scalars['String']['input']>>;
    metadataHash_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
    metadataHash_contains?: InputMaybe<Scalars['String']['input']>;
    metadataHash_contains_nocase?: InputMaybe<Scalars['String']['input']>;
    metadataHash_not_contains?: InputMaybe<Scalars['String']['input']>;
    metadataHash_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
    metadataHash_starts_with?: InputMaybe<Scalars['String']['input']>;
    metadataHash_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
    metadataHash_not_starts_with?: InputMaybe<Scalars['String']['input']>;
    metadataHash_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
    metadataHash_ends_with?: InputMaybe<Scalars['String']['input']>;
    metadataHash_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
    metadataHash_not_ends_with?: InputMaybe<Scalars['String']['input']>;
    metadataHash_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
    version?: InputMaybe<Scalars['BigInt']['input']>;
    version_not?: InputMaybe<Scalars['BigInt']['input']>;
    version_gt?: InputMaybe<Scalars['BigInt']['input']>;
    version_lt?: InputMaybe<Scalars['BigInt']['input']>;
    version_gte?: InputMaybe<Scalars['BigInt']['input']>;
    version_lte?: InputMaybe<Scalars['BigInt']['input']>;
    version_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    version_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    strategy?: InputMaybe<Scalars['String']['input']>;
    strategy_not?: InputMaybe<Scalars['String']['input']>;
    strategy_gt?: InputMaybe<Scalars['String']['input']>;
    strategy_lt?: InputMaybe<Scalars['String']['input']>;
    strategy_gte?: InputMaybe<Scalars['String']['input']>;
    strategy_lte?: InputMaybe<Scalars['String']['input']>;
    strategy_in?: InputMaybe<Array<Scalars['String']['input']>>;
    strategy_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
    strategy_contains?: InputMaybe<Scalars['String']['input']>;
    strategy_contains_nocase?: InputMaybe<Scalars['String']['input']>;
    strategy_not_contains?: InputMaybe<Scalars['String']['input']>;
    strategy_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
    strategy_starts_with?: InputMaybe<Scalars['String']['input']>;
    strategy_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
    strategy_not_starts_with?: InputMaybe<Scalars['String']['input']>;
    strategy_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
    strategy_ends_with?: InputMaybe<Scalars['String']['input']>;
    strategy_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
    strategy_not_ends_with?: InputMaybe<Scalars['String']['input']>;
    strategy_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
    strategy_?: InputMaybe<CVStrategy_filter>;
    beneficiary?: InputMaybe<Scalars['String']['input']>;
    beneficiary_not?: InputMaybe<Scalars['String']['input']>;
    beneficiary_gt?: InputMaybe<Scalars['String']['input']>;
    beneficiary_lt?: InputMaybe<Scalars['String']['input']>;
    beneficiary_gte?: InputMaybe<Scalars['String']['input']>;
    beneficiary_lte?: InputMaybe<Scalars['String']['input']>;
    beneficiary_in?: InputMaybe<Array<Scalars['String']['input']>>;
    beneficiary_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
    beneficiary_contains?: InputMaybe<Scalars['String']['input']>;
    beneficiary_contains_nocase?: InputMaybe<Scalars['String']['input']>;
    beneficiary_not_contains?: InputMaybe<Scalars['String']['input']>;
    beneficiary_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
    beneficiary_starts_with?: InputMaybe<Scalars['String']['input']>;
    beneficiary_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
    beneficiary_not_starts_with?: InputMaybe<Scalars['String']['input']>;
    beneficiary_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
    beneficiary_ends_with?: InputMaybe<Scalars['String']['input']>;
    beneficiary_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
    beneficiary_not_ends_with?: InputMaybe<Scalars['String']['input']>;
    beneficiary_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
    requestedAmount?: InputMaybe<Scalars['BigInt']['input']>;
    requestedAmount_not?: InputMaybe<Scalars['BigInt']['input']>;
    requestedAmount_gt?: InputMaybe<Scalars['BigInt']['input']>;
    requestedAmount_lt?: InputMaybe<Scalars['BigInt']['input']>;
    requestedAmount_gte?: InputMaybe<Scalars['BigInt']['input']>;
    requestedAmount_lte?: InputMaybe<Scalars['BigInt']['input']>;
    requestedAmount_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    requestedAmount_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    requestedToken?: InputMaybe<Scalars['String']['input']>;
    requestedToken_not?: InputMaybe<Scalars['String']['input']>;
    requestedToken_gt?: InputMaybe<Scalars['String']['input']>;
    requestedToken_lt?: InputMaybe<Scalars['String']['input']>;
    requestedToken_gte?: InputMaybe<Scalars['String']['input']>;
    requestedToken_lte?: InputMaybe<Scalars['String']['input']>;
    requestedToken_in?: InputMaybe<Array<Scalars['String']['input']>>;
    requestedToken_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
    requestedToken_contains?: InputMaybe<Scalars['String']['input']>;
    requestedToken_contains_nocase?: InputMaybe<Scalars['String']['input']>;
    requestedToken_not_contains?: InputMaybe<Scalars['String']['input']>;
    requestedToken_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
    requestedToken_starts_with?: InputMaybe<Scalars['String']['input']>;
    requestedToken_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
    requestedToken_not_starts_with?: InputMaybe<Scalars['String']['input']>;
    requestedToken_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
    requestedToken_ends_with?: InputMaybe<Scalars['String']['input']>;
    requestedToken_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
    requestedToken_not_ends_with?: InputMaybe<Scalars['String']['input']>;
    requestedToken_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
    proposalStatus?: InputMaybe<Scalars['BigInt']['input']>;
    proposalStatus_not?: InputMaybe<Scalars['BigInt']['input']>;
    proposalStatus_gt?: InputMaybe<Scalars['BigInt']['input']>;
    proposalStatus_lt?: InputMaybe<Scalars['BigInt']['input']>;
    proposalStatus_gte?: InputMaybe<Scalars['BigInt']['input']>;
    proposalStatus_lte?: InputMaybe<Scalars['BigInt']['input']>;
    proposalStatus_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    proposalStatus_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    blockLast?: InputMaybe<Scalars['BigInt']['input']>;
    blockLast_not?: InputMaybe<Scalars['BigInt']['input']>;
    blockLast_gt?: InputMaybe<Scalars['BigInt']['input']>;
    blockLast_lt?: InputMaybe<Scalars['BigInt']['input']>;
    blockLast_gte?: InputMaybe<Scalars['BigInt']['input']>;
    blockLast_lte?: InputMaybe<Scalars['BigInt']['input']>;
    blockLast_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    blockLast_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    convictionLast?: InputMaybe<Scalars['BigInt']['input']>;
    convictionLast_not?: InputMaybe<Scalars['BigInt']['input']>;
    convictionLast_gt?: InputMaybe<Scalars['BigInt']['input']>;
    convictionLast_lt?: InputMaybe<Scalars['BigInt']['input']>;
    convictionLast_gte?: InputMaybe<Scalars['BigInt']['input']>;
    convictionLast_lte?: InputMaybe<Scalars['BigInt']['input']>;
    convictionLast_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    convictionLast_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    threshold?: InputMaybe<Scalars['BigInt']['input']>;
    threshold_not?: InputMaybe<Scalars['BigInt']['input']>;
    threshold_gt?: InputMaybe<Scalars['BigInt']['input']>;
    threshold_lt?: InputMaybe<Scalars['BigInt']['input']>;
    threshold_gte?: InputMaybe<Scalars['BigInt']['input']>;
    threshold_lte?: InputMaybe<Scalars['BigInt']['input']>;
    threshold_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    threshold_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    maxCVStaked?: InputMaybe<Scalars['BigInt']['input']>;
    maxCVStaked_not?: InputMaybe<Scalars['BigInt']['input']>;
    maxCVStaked_gt?: InputMaybe<Scalars['BigInt']['input']>;
    maxCVStaked_lt?: InputMaybe<Scalars['BigInt']['input']>;
    maxCVStaked_gte?: InputMaybe<Scalars['BigInt']['input']>;
    maxCVStaked_lte?: InputMaybe<Scalars['BigInt']['input']>;
    maxCVStaked_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    maxCVStaked_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    stakedAmount?: InputMaybe<Scalars['BigInt']['input']>;
    stakedAmount_not?: InputMaybe<Scalars['BigInt']['input']>;
    stakedAmount_gt?: InputMaybe<Scalars['BigInt']['input']>;
    stakedAmount_lt?: InputMaybe<Scalars['BigInt']['input']>;
    stakedAmount_gte?: InputMaybe<Scalars['BigInt']['input']>;
    stakedAmount_lte?: InputMaybe<Scalars['BigInt']['input']>;
    stakedAmount_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    stakedAmount_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    submitter?: InputMaybe<Scalars['String']['input']>;
    submitter_not?: InputMaybe<Scalars['String']['input']>;
    submitter_gt?: InputMaybe<Scalars['String']['input']>;
    submitter_lt?: InputMaybe<Scalars['String']['input']>;
    submitter_gte?: InputMaybe<Scalars['String']['input']>;
    submitter_lte?: InputMaybe<Scalars['String']['input']>;
    submitter_in?: InputMaybe<Array<Scalars['String']['input']>>;
    submitter_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
    submitter_contains?: InputMaybe<Scalars['String']['input']>;
    submitter_contains_nocase?: InputMaybe<Scalars['String']['input']>;
    submitter_not_contains?: InputMaybe<Scalars['String']['input']>;
    submitter_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
    submitter_starts_with?: InputMaybe<Scalars['String']['input']>;
    submitter_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
    submitter_not_starts_with?: InputMaybe<Scalars['String']['input']>;
    submitter_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
    submitter_ends_with?: InputMaybe<Scalars['String']['input']>;
    submitter_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
    submitter_not_ends_with?: InputMaybe<Scalars['String']['input']>;
    submitter_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
    createdAt?: InputMaybe<Scalars['BigInt']['input']>;
    createdAt_not?: InputMaybe<Scalars['BigInt']['input']>;
    createdAt_gt?: InputMaybe<Scalars['BigInt']['input']>;
    createdAt_lt?: InputMaybe<Scalars['BigInt']['input']>;
    createdAt_gte?: InputMaybe<Scalars['BigInt']['input']>;
    createdAt_lte?: InputMaybe<Scalars['BigInt']['input']>;
    createdAt_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    createdAt_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    updatedAt?: InputMaybe<Scalars['BigInt']['input']>;
    updatedAt_not?: InputMaybe<Scalars['BigInt']['input']>;
    updatedAt_gt?: InputMaybe<Scalars['BigInt']['input']>;
    updatedAt_lt?: InputMaybe<Scalars['BigInt']['input']>;
    updatedAt_gte?: InputMaybe<Scalars['BigInt']['input']>;
    updatedAt_lte?: InputMaybe<Scalars['BigInt']['input']>;
    updatedAt_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    updatedAt_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    arbitrableConfig?: InputMaybe<Scalars['String']['input']>;
    arbitrableConfig_not?: InputMaybe<Scalars['String']['input']>;
    arbitrableConfig_gt?: InputMaybe<Scalars['String']['input']>;
    arbitrableConfig_lt?: InputMaybe<Scalars['String']['input']>;
    arbitrableConfig_gte?: InputMaybe<Scalars['String']['input']>;
    arbitrableConfig_lte?: InputMaybe<Scalars['String']['input']>;
    arbitrableConfig_in?: InputMaybe<Array<Scalars['String']['input']>>;
    arbitrableConfig_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
    arbitrableConfig_contains?: InputMaybe<Scalars['String']['input']>;
    arbitrableConfig_contains_nocase?: InputMaybe<Scalars['String']['input']>;
    arbitrableConfig_not_contains?: InputMaybe<Scalars['String']['input']>;
    arbitrableConfig_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
    arbitrableConfig_starts_with?: InputMaybe<Scalars['String']['input']>;
    arbitrableConfig_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
    arbitrableConfig_not_starts_with?: InputMaybe<Scalars['String']['input']>;
    arbitrableConfig_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
    arbitrableConfig_ends_with?: InputMaybe<Scalars['String']['input']>;
    arbitrableConfig_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
    arbitrableConfig_not_ends_with?: InputMaybe<Scalars['String']['input']>;
    arbitrableConfig_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
    arbitrableConfig_?: InputMaybe<ArbitrableConfig_filter>;
    /** Filter for the block changed event. */
    _change_block?: InputMaybe<BlockChangedFilter>;
    and?: InputMaybe<Array<InputMaybe<CVProposal_filter>>>;
    or?: InputMaybe<Array<InputMaybe<CVProposal_filter>>>;
};
export type CVProposal_orderBy = 'id' | 'proposalNumber' | 'metadata' | 'metadata__id' | 'metadata__title' | 'metadata__description' | 'metadataHash' | 'version' | 'strategy' | 'strategy__id' | 'strategy__poolId' | 'strategy__poolAmount' | 'strategy__metadata' | 'strategy__maxCVSupply' | 'strategy__totalEffectiveActivePoints' | 'strategy__isEnabled' | 'strategy__token' | 'strategy__archived' | 'beneficiary' | 'requestedAmount' | 'requestedToken' | 'proposalStatus' | 'blockLast' | 'convictionLast' | 'threshold' | 'maxCVStaked' | 'stakedAmount' | 'submitter' | 'createdAt' | 'updatedAt' | 'arbitrableConfig' | 'arbitrableConfig__id' | 'arbitrableConfig__version' | 'arbitrableConfig__arbitrator' | 'arbitrableConfig__tribunalSafe' | 'arbitrableConfig__challengerCollateralAmount' | 'arbitrableConfig__submitterCollateralAmount' | 'arbitrableConfig__defaultRuling' | 'arbitrableConfig__defaultRulingTimeout';
export type CVStrategy = {
    id: Scalars['ID']['output'];
    poolId: Scalars['BigInt']['output'];
    poolAmount: Scalars['BigInt']['output'];
    metadata?: Maybe<Scalars['String']['output']>;
    registryCommunity: RegistryCommunity;
    config: CVStrategyConfig;
    proposals: Array<CVProposal>;
    memberActive?: Maybe<Array<Member>>;
    maxCVSupply: Scalars['BigInt']['output'];
    totalEffectiveActivePoints: Scalars['BigInt']['output'];
    isEnabled: Scalars['Boolean']['output'];
    token: Scalars['String']['output'];
    sybilScorer?: Maybe<PassportScorer>;
    archived: Scalars['Boolean']['output'];
};
export type CVStrategyproposalsArgs = {
    skip?: InputMaybe<Scalars['Int']['input']>;
    first?: InputMaybe<Scalars['Int']['input']>;
    orderBy?: InputMaybe<CVProposal_orderBy>;
    orderDirection?: InputMaybe<OrderDirection>;
    where?: InputMaybe<CVProposal_filter>;
};
export type CVStrategymemberActiveArgs = {
    skip?: InputMaybe<Scalars['Int']['input']>;
    first?: InputMaybe<Scalars['Int']['input']>;
    orderBy?: InputMaybe<Member_orderBy>;
    orderDirection?: InputMaybe<OrderDirection>;
    where?: InputMaybe<Member_filter>;
};
export type CVStrategyConfig = {
    id: Scalars['ID']['output'];
    strategy: CVStrategy;
    D: Scalars['BigInt']['output'];
    decay: Scalars['BigInt']['output'];
    maxRatio: Scalars['BigInt']['output'];
    minThresholdPoints: Scalars['BigInt']['output'];
    weight: Scalars['BigInt']['output'];
    proposalType: Scalars['BigInt']['output'];
    pointSystem: Scalars['BigInt']['output'];
    maxAmount?: Maybe<Scalars['BigInt']['output']>;
    allowlist?: Maybe<Array<Scalars['String']['output']>>;
};
export type CVStrategyConfig_filter = {
    id?: InputMaybe<Scalars['ID']['input']>;
    id_not?: InputMaybe<Scalars['ID']['input']>;
    id_gt?: InputMaybe<Scalars['ID']['input']>;
    id_lt?: InputMaybe<Scalars['ID']['input']>;
    id_gte?: InputMaybe<Scalars['ID']['input']>;
    id_lte?: InputMaybe<Scalars['ID']['input']>;
    id_in?: InputMaybe<Array<Scalars['ID']['input']>>;
    id_not_in?: InputMaybe<Array<Scalars['ID']['input']>>;
    strategy_?: InputMaybe<CVStrategy_filter>;
    D?: InputMaybe<Scalars['BigInt']['input']>;
    D_not?: InputMaybe<Scalars['BigInt']['input']>;
    D_gt?: InputMaybe<Scalars['BigInt']['input']>;
    D_lt?: InputMaybe<Scalars['BigInt']['input']>;
    D_gte?: InputMaybe<Scalars['BigInt']['input']>;
    D_lte?: InputMaybe<Scalars['BigInt']['input']>;
    D_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    D_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    decay?: InputMaybe<Scalars['BigInt']['input']>;
    decay_not?: InputMaybe<Scalars['BigInt']['input']>;
    decay_gt?: InputMaybe<Scalars['BigInt']['input']>;
    decay_lt?: InputMaybe<Scalars['BigInt']['input']>;
    decay_gte?: InputMaybe<Scalars['BigInt']['input']>;
    decay_lte?: InputMaybe<Scalars['BigInt']['input']>;
    decay_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    decay_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    maxRatio?: InputMaybe<Scalars['BigInt']['input']>;
    maxRatio_not?: InputMaybe<Scalars['BigInt']['input']>;
    maxRatio_gt?: InputMaybe<Scalars['BigInt']['input']>;
    maxRatio_lt?: InputMaybe<Scalars['BigInt']['input']>;
    maxRatio_gte?: InputMaybe<Scalars['BigInt']['input']>;
    maxRatio_lte?: InputMaybe<Scalars['BigInt']['input']>;
    maxRatio_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    maxRatio_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    minThresholdPoints?: InputMaybe<Scalars['BigInt']['input']>;
    minThresholdPoints_not?: InputMaybe<Scalars['BigInt']['input']>;
    minThresholdPoints_gt?: InputMaybe<Scalars['BigInt']['input']>;
    minThresholdPoints_lt?: InputMaybe<Scalars['BigInt']['input']>;
    minThresholdPoints_gte?: InputMaybe<Scalars['BigInt']['input']>;
    minThresholdPoints_lte?: InputMaybe<Scalars['BigInt']['input']>;
    minThresholdPoints_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    minThresholdPoints_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    weight?: InputMaybe<Scalars['BigInt']['input']>;
    weight_not?: InputMaybe<Scalars['BigInt']['input']>;
    weight_gt?: InputMaybe<Scalars['BigInt']['input']>;
    weight_lt?: InputMaybe<Scalars['BigInt']['input']>;
    weight_gte?: InputMaybe<Scalars['BigInt']['input']>;
    weight_lte?: InputMaybe<Scalars['BigInt']['input']>;
    weight_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    weight_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    proposalType?: InputMaybe<Scalars['BigInt']['input']>;
    proposalType_not?: InputMaybe<Scalars['BigInt']['input']>;
    proposalType_gt?: InputMaybe<Scalars['BigInt']['input']>;
    proposalType_lt?: InputMaybe<Scalars['BigInt']['input']>;
    proposalType_gte?: InputMaybe<Scalars['BigInt']['input']>;
    proposalType_lte?: InputMaybe<Scalars['BigInt']['input']>;
    proposalType_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    proposalType_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    pointSystem?: InputMaybe<Scalars['BigInt']['input']>;
    pointSystem_not?: InputMaybe<Scalars['BigInt']['input']>;
    pointSystem_gt?: InputMaybe<Scalars['BigInt']['input']>;
    pointSystem_lt?: InputMaybe<Scalars['BigInt']['input']>;
    pointSystem_gte?: InputMaybe<Scalars['BigInt']['input']>;
    pointSystem_lte?: InputMaybe<Scalars['BigInt']['input']>;
    pointSystem_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    pointSystem_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    maxAmount?: InputMaybe<Scalars['BigInt']['input']>;
    maxAmount_not?: InputMaybe<Scalars['BigInt']['input']>;
    maxAmount_gt?: InputMaybe<Scalars['BigInt']['input']>;
    maxAmount_lt?: InputMaybe<Scalars['BigInt']['input']>;
    maxAmount_gte?: InputMaybe<Scalars['BigInt']['input']>;
    maxAmount_lte?: InputMaybe<Scalars['BigInt']['input']>;
    maxAmount_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    maxAmount_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    allowlist?: InputMaybe<Array<Scalars['String']['input']>>;
    allowlist_not?: InputMaybe<Array<Scalars['String']['input']>>;
    allowlist_contains?: InputMaybe<Array<Scalars['String']['input']>>;
    allowlist_contains_nocase?: InputMaybe<Array<Scalars['String']['input']>>;
    allowlist_not_contains?: InputMaybe<Array<Scalars['String']['input']>>;
    allowlist_not_contains_nocase?: InputMaybe<Array<Scalars['String']['input']>>;
    /** Filter for the block changed event. */
    _change_block?: InputMaybe<BlockChangedFilter>;
    and?: InputMaybe<Array<InputMaybe<CVStrategyConfig_filter>>>;
    or?: InputMaybe<Array<InputMaybe<CVStrategyConfig_filter>>>;
};
export type CVStrategyConfig_orderBy = 'id' | 'strategy' | 'strategy__id' | 'strategy__poolId' | 'strategy__poolAmount' | 'strategy__metadata' | 'strategy__maxCVSupply' | 'strategy__totalEffectiveActivePoints' | 'strategy__isEnabled' | 'strategy__token' | 'strategy__archived' | 'D' | 'decay' | 'maxRatio' | 'minThresholdPoints' | 'weight' | 'proposalType' | 'pointSystem' | 'maxAmount' | 'allowlist';
export type CVStrategy_filter = {
    id?: InputMaybe<Scalars['ID']['input']>;
    id_not?: InputMaybe<Scalars['ID']['input']>;
    id_gt?: InputMaybe<Scalars['ID']['input']>;
    id_lt?: InputMaybe<Scalars['ID']['input']>;
    id_gte?: InputMaybe<Scalars['ID']['input']>;
    id_lte?: InputMaybe<Scalars['ID']['input']>;
    id_in?: InputMaybe<Array<Scalars['ID']['input']>>;
    id_not_in?: InputMaybe<Array<Scalars['ID']['input']>>;
    poolId?: InputMaybe<Scalars['BigInt']['input']>;
    poolId_not?: InputMaybe<Scalars['BigInt']['input']>;
    poolId_gt?: InputMaybe<Scalars['BigInt']['input']>;
    poolId_lt?: InputMaybe<Scalars['BigInt']['input']>;
    poolId_gte?: InputMaybe<Scalars['BigInt']['input']>;
    poolId_lte?: InputMaybe<Scalars['BigInt']['input']>;
    poolId_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    poolId_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    poolAmount?: InputMaybe<Scalars['BigInt']['input']>;
    poolAmount_not?: InputMaybe<Scalars['BigInt']['input']>;
    poolAmount_gt?: InputMaybe<Scalars['BigInt']['input']>;
    poolAmount_lt?: InputMaybe<Scalars['BigInt']['input']>;
    poolAmount_gte?: InputMaybe<Scalars['BigInt']['input']>;
    poolAmount_lte?: InputMaybe<Scalars['BigInt']['input']>;
    poolAmount_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    poolAmount_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    metadata?: InputMaybe<Scalars['String']['input']>;
    metadata_not?: InputMaybe<Scalars['String']['input']>;
    metadata_gt?: InputMaybe<Scalars['String']['input']>;
    metadata_lt?: InputMaybe<Scalars['String']['input']>;
    metadata_gte?: InputMaybe<Scalars['String']['input']>;
    metadata_lte?: InputMaybe<Scalars['String']['input']>;
    metadata_in?: InputMaybe<Array<Scalars['String']['input']>>;
    metadata_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
    metadata_contains?: InputMaybe<Scalars['String']['input']>;
    metadata_contains_nocase?: InputMaybe<Scalars['String']['input']>;
    metadata_not_contains?: InputMaybe<Scalars['String']['input']>;
    metadata_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
    metadata_starts_with?: InputMaybe<Scalars['String']['input']>;
    metadata_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
    metadata_not_starts_with?: InputMaybe<Scalars['String']['input']>;
    metadata_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
    metadata_ends_with?: InputMaybe<Scalars['String']['input']>;
    metadata_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
    metadata_not_ends_with?: InputMaybe<Scalars['String']['input']>;
    metadata_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
    registryCommunity?: InputMaybe<Scalars['String']['input']>;
    registryCommunity_not?: InputMaybe<Scalars['String']['input']>;
    registryCommunity_gt?: InputMaybe<Scalars['String']['input']>;
    registryCommunity_lt?: InputMaybe<Scalars['String']['input']>;
    registryCommunity_gte?: InputMaybe<Scalars['String']['input']>;
    registryCommunity_lte?: InputMaybe<Scalars['String']['input']>;
    registryCommunity_in?: InputMaybe<Array<Scalars['String']['input']>>;
    registryCommunity_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
    registryCommunity_contains?: InputMaybe<Scalars['String']['input']>;
    registryCommunity_contains_nocase?: InputMaybe<Scalars['String']['input']>;
    registryCommunity_not_contains?: InputMaybe<Scalars['String']['input']>;
    registryCommunity_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
    registryCommunity_starts_with?: InputMaybe<Scalars['String']['input']>;
    registryCommunity_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
    registryCommunity_not_starts_with?: InputMaybe<Scalars['String']['input']>;
    registryCommunity_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
    registryCommunity_ends_with?: InputMaybe<Scalars['String']['input']>;
    registryCommunity_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
    registryCommunity_not_ends_with?: InputMaybe<Scalars['String']['input']>;
    registryCommunity_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
    registryCommunity_?: InputMaybe<RegistryCommunity_filter>;
    config?: InputMaybe<Scalars['String']['input']>;
    config_not?: InputMaybe<Scalars['String']['input']>;
    config_gt?: InputMaybe<Scalars['String']['input']>;
    config_lt?: InputMaybe<Scalars['String']['input']>;
    config_gte?: InputMaybe<Scalars['String']['input']>;
    config_lte?: InputMaybe<Scalars['String']['input']>;
    config_in?: InputMaybe<Array<Scalars['String']['input']>>;
    config_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
    config_contains?: InputMaybe<Scalars['String']['input']>;
    config_contains_nocase?: InputMaybe<Scalars['String']['input']>;
    config_not_contains?: InputMaybe<Scalars['String']['input']>;
    config_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
    config_starts_with?: InputMaybe<Scalars['String']['input']>;
    config_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
    config_not_starts_with?: InputMaybe<Scalars['String']['input']>;
    config_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
    config_ends_with?: InputMaybe<Scalars['String']['input']>;
    config_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
    config_not_ends_with?: InputMaybe<Scalars['String']['input']>;
    config_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
    config_?: InputMaybe<CVStrategyConfig_filter>;
    proposals_?: InputMaybe<CVProposal_filter>;
    memberActive?: InputMaybe<Array<Scalars['String']['input']>>;
    memberActive_not?: InputMaybe<Array<Scalars['String']['input']>>;
    memberActive_contains?: InputMaybe<Array<Scalars['String']['input']>>;
    memberActive_contains_nocase?: InputMaybe<Array<Scalars['String']['input']>>;
    memberActive_not_contains?: InputMaybe<Array<Scalars['String']['input']>>;
    memberActive_not_contains_nocase?: InputMaybe<Array<Scalars['String']['input']>>;
    memberActive_?: InputMaybe<Member_filter>;
    maxCVSupply?: InputMaybe<Scalars['BigInt']['input']>;
    maxCVSupply_not?: InputMaybe<Scalars['BigInt']['input']>;
    maxCVSupply_gt?: InputMaybe<Scalars['BigInt']['input']>;
    maxCVSupply_lt?: InputMaybe<Scalars['BigInt']['input']>;
    maxCVSupply_gte?: InputMaybe<Scalars['BigInt']['input']>;
    maxCVSupply_lte?: InputMaybe<Scalars['BigInt']['input']>;
    maxCVSupply_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    maxCVSupply_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    totalEffectiveActivePoints?: InputMaybe<Scalars['BigInt']['input']>;
    totalEffectiveActivePoints_not?: InputMaybe<Scalars['BigInt']['input']>;
    totalEffectiveActivePoints_gt?: InputMaybe<Scalars['BigInt']['input']>;
    totalEffectiveActivePoints_lt?: InputMaybe<Scalars['BigInt']['input']>;
    totalEffectiveActivePoints_gte?: InputMaybe<Scalars['BigInt']['input']>;
    totalEffectiveActivePoints_lte?: InputMaybe<Scalars['BigInt']['input']>;
    totalEffectiveActivePoints_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    totalEffectiveActivePoints_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    isEnabled?: InputMaybe<Scalars['Boolean']['input']>;
    isEnabled_not?: InputMaybe<Scalars['Boolean']['input']>;
    isEnabled_in?: InputMaybe<Array<Scalars['Boolean']['input']>>;
    isEnabled_not_in?: InputMaybe<Array<Scalars['Boolean']['input']>>;
    token?: InputMaybe<Scalars['String']['input']>;
    token_not?: InputMaybe<Scalars['String']['input']>;
    token_gt?: InputMaybe<Scalars['String']['input']>;
    token_lt?: InputMaybe<Scalars['String']['input']>;
    token_gte?: InputMaybe<Scalars['String']['input']>;
    token_lte?: InputMaybe<Scalars['String']['input']>;
    token_in?: InputMaybe<Array<Scalars['String']['input']>>;
    token_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
    token_contains?: InputMaybe<Scalars['String']['input']>;
    token_contains_nocase?: InputMaybe<Scalars['String']['input']>;
    token_not_contains?: InputMaybe<Scalars['String']['input']>;
    token_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
    token_starts_with?: InputMaybe<Scalars['String']['input']>;
    token_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
    token_not_starts_with?: InputMaybe<Scalars['String']['input']>;
    token_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
    token_ends_with?: InputMaybe<Scalars['String']['input']>;
    token_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
    token_not_ends_with?: InputMaybe<Scalars['String']['input']>;
    token_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
    sybilScorer?: InputMaybe<Scalars['String']['input']>;
    sybilScorer_not?: InputMaybe<Scalars['String']['input']>;
    sybilScorer_gt?: InputMaybe<Scalars['String']['input']>;
    sybilScorer_lt?: InputMaybe<Scalars['String']['input']>;
    sybilScorer_gte?: InputMaybe<Scalars['String']['input']>;
    sybilScorer_lte?: InputMaybe<Scalars['String']['input']>;
    sybilScorer_in?: InputMaybe<Array<Scalars['String']['input']>>;
    sybilScorer_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
    sybilScorer_contains?: InputMaybe<Scalars['String']['input']>;
    sybilScorer_contains_nocase?: InputMaybe<Scalars['String']['input']>;
    sybilScorer_not_contains?: InputMaybe<Scalars['String']['input']>;
    sybilScorer_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
    sybilScorer_starts_with?: InputMaybe<Scalars['String']['input']>;
    sybilScorer_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
    sybilScorer_not_starts_with?: InputMaybe<Scalars['String']['input']>;
    sybilScorer_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
    sybilScorer_ends_with?: InputMaybe<Scalars['String']['input']>;
    sybilScorer_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
    sybilScorer_not_ends_with?: InputMaybe<Scalars['String']['input']>;
    sybilScorer_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
    sybilScorer_?: InputMaybe<PassportScorer_filter>;
    archived?: InputMaybe<Scalars['Boolean']['input']>;
    archived_not?: InputMaybe<Scalars['Boolean']['input']>;
    archived_in?: InputMaybe<Array<Scalars['Boolean']['input']>>;
    archived_not_in?: InputMaybe<Array<Scalars['Boolean']['input']>>;
    /** Filter for the block changed event. */
    _change_block?: InputMaybe<BlockChangedFilter>;
    and?: InputMaybe<Array<InputMaybe<CVStrategy_filter>>>;
    or?: InputMaybe<Array<InputMaybe<CVStrategy_filter>>>;
};
export type CVStrategy_orderBy = 'id' | 'poolId' | 'poolAmount' | 'metadata' | 'registryCommunity' | 'registryCommunity__id' | 'registryCommunity__chainId' | 'registryCommunity__strategyTemplate' | 'registryCommunity__profileId' | 'registryCommunity__communityFee' | 'registryCommunity__protocolFee' | 'registryCommunity__protocolFeeReceiver' | 'registryCommunity__communityName' | 'registryCommunity__covenantIpfsHash' | 'registryCommunity__councilSafe' | 'registryCommunity__pendingNewCouncilSafe' | 'registryCommunity__isKickEnabled' | 'registryCommunity__registerStakeAmount' | 'registryCommunity__registerToken' | 'registryCommunity__alloAddress' | 'registryCommunity__membersCount' | 'registryCommunity__isValid' | 'config' | 'config__id' | 'config__D' | 'config__decay' | 'config__maxRatio' | 'config__minThresholdPoints' | 'config__weight' | 'config__proposalType' | 'config__pointSystem' | 'config__maxAmount' | 'proposals' | 'memberActive' | 'maxCVSupply' | 'totalEffectiveActivePoints' | 'isEnabled' | 'token' | 'sybilScorer' | 'sybilScorer__id' | 'archived';
export type CollateralVault = {
    id: Scalars['ID']['output'];
    strategy: CVStrategy;
    collaterals?: Maybe<Array<CollateralVaultDeposit>>;
};
export type CollateralVaultcollateralsArgs = {
    skip?: InputMaybe<Scalars['Int']['input']>;
    first?: InputMaybe<Scalars['Int']['input']>;
    orderBy?: InputMaybe<CollateralVaultDeposit_orderBy>;
    orderDirection?: InputMaybe<OrderDirection>;
    where?: InputMaybe<CollateralVaultDeposit_filter>;
};
export type CollateralVaultDeposit = {
    id: Scalars['ID']['output'];
    collateralVault: CollateralVault;
    amount: Scalars['BigInt']['output'];
    depositor: Scalars['Bytes']['output'];
    createdAt: Scalars['BigInt']['output'];
    proposalId: Scalars['BigInt']['output'];
    withdrawnAt?: Maybe<Scalars['BigInt']['output']>;
    withdrawnTo?: Maybe<Scalars['Bytes']['output']>;
};
export type CollateralVaultDeposit_filter = {
    id?: InputMaybe<Scalars['ID']['input']>;
    id_not?: InputMaybe<Scalars['ID']['input']>;
    id_gt?: InputMaybe<Scalars['ID']['input']>;
    id_lt?: InputMaybe<Scalars['ID']['input']>;
    id_gte?: InputMaybe<Scalars['ID']['input']>;
    id_lte?: InputMaybe<Scalars['ID']['input']>;
    id_in?: InputMaybe<Array<Scalars['ID']['input']>>;
    id_not_in?: InputMaybe<Array<Scalars['ID']['input']>>;
    collateralVault?: InputMaybe<Scalars['String']['input']>;
    collateralVault_not?: InputMaybe<Scalars['String']['input']>;
    collateralVault_gt?: InputMaybe<Scalars['String']['input']>;
    collateralVault_lt?: InputMaybe<Scalars['String']['input']>;
    collateralVault_gte?: InputMaybe<Scalars['String']['input']>;
    collateralVault_lte?: InputMaybe<Scalars['String']['input']>;
    collateralVault_in?: InputMaybe<Array<Scalars['String']['input']>>;
    collateralVault_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
    collateralVault_contains?: InputMaybe<Scalars['String']['input']>;
    collateralVault_contains_nocase?: InputMaybe<Scalars['String']['input']>;
    collateralVault_not_contains?: InputMaybe<Scalars['String']['input']>;
    collateralVault_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
    collateralVault_starts_with?: InputMaybe<Scalars['String']['input']>;
    collateralVault_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
    collateralVault_not_starts_with?: InputMaybe<Scalars['String']['input']>;
    collateralVault_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
    collateralVault_ends_with?: InputMaybe<Scalars['String']['input']>;
    collateralVault_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
    collateralVault_not_ends_with?: InputMaybe<Scalars['String']['input']>;
    collateralVault_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
    collateralVault_?: InputMaybe<CollateralVault_filter>;
    amount?: InputMaybe<Scalars['BigInt']['input']>;
    amount_not?: InputMaybe<Scalars['BigInt']['input']>;
    amount_gt?: InputMaybe<Scalars['BigInt']['input']>;
    amount_lt?: InputMaybe<Scalars['BigInt']['input']>;
    amount_gte?: InputMaybe<Scalars['BigInt']['input']>;
    amount_lte?: InputMaybe<Scalars['BigInt']['input']>;
    amount_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    amount_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    depositor?: InputMaybe<Scalars['Bytes']['input']>;
    depositor_not?: InputMaybe<Scalars['Bytes']['input']>;
    depositor_gt?: InputMaybe<Scalars['Bytes']['input']>;
    depositor_lt?: InputMaybe<Scalars['Bytes']['input']>;
    depositor_gte?: InputMaybe<Scalars['Bytes']['input']>;
    depositor_lte?: InputMaybe<Scalars['Bytes']['input']>;
    depositor_in?: InputMaybe<Array<Scalars['Bytes']['input']>>;
    depositor_not_in?: InputMaybe<Array<Scalars['Bytes']['input']>>;
    depositor_contains?: InputMaybe<Scalars['Bytes']['input']>;
    depositor_not_contains?: InputMaybe<Scalars['Bytes']['input']>;
    createdAt?: InputMaybe<Scalars['BigInt']['input']>;
    createdAt_not?: InputMaybe<Scalars['BigInt']['input']>;
    createdAt_gt?: InputMaybe<Scalars['BigInt']['input']>;
    createdAt_lt?: InputMaybe<Scalars['BigInt']['input']>;
    createdAt_gte?: InputMaybe<Scalars['BigInt']['input']>;
    createdAt_lte?: InputMaybe<Scalars['BigInt']['input']>;
    createdAt_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    createdAt_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    proposalId?: InputMaybe<Scalars['BigInt']['input']>;
    proposalId_not?: InputMaybe<Scalars['BigInt']['input']>;
    proposalId_gt?: InputMaybe<Scalars['BigInt']['input']>;
    proposalId_lt?: InputMaybe<Scalars['BigInt']['input']>;
    proposalId_gte?: InputMaybe<Scalars['BigInt']['input']>;
    proposalId_lte?: InputMaybe<Scalars['BigInt']['input']>;
    proposalId_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    proposalId_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    withdrawnAt?: InputMaybe<Scalars['BigInt']['input']>;
    withdrawnAt_not?: InputMaybe<Scalars['BigInt']['input']>;
    withdrawnAt_gt?: InputMaybe<Scalars['BigInt']['input']>;
    withdrawnAt_lt?: InputMaybe<Scalars['BigInt']['input']>;
    withdrawnAt_gte?: InputMaybe<Scalars['BigInt']['input']>;
    withdrawnAt_lte?: InputMaybe<Scalars['BigInt']['input']>;
    withdrawnAt_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    withdrawnAt_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    withdrawnTo?: InputMaybe<Scalars['Bytes']['input']>;
    withdrawnTo_not?: InputMaybe<Scalars['Bytes']['input']>;
    withdrawnTo_gt?: InputMaybe<Scalars['Bytes']['input']>;
    withdrawnTo_lt?: InputMaybe<Scalars['Bytes']['input']>;
    withdrawnTo_gte?: InputMaybe<Scalars['Bytes']['input']>;
    withdrawnTo_lte?: InputMaybe<Scalars['Bytes']['input']>;
    withdrawnTo_in?: InputMaybe<Array<Scalars['Bytes']['input']>>;
    withdrawnTo_not_in?: InputMaybe<Array<Scalars['Bytes']['input']>>;
    withdrawnTo_contains?: InputMaybe<Scalars['Bytes']['input']>;
    withdrawnTo_not_contains?: InputMaybe<Scalars['Bytes']['input']>;
    /** Filter for the block changed event. */
    _change_block?: InputMaybe<BlockChangedFilter>;
    and?: InputMaybe<Array<InputMaybe<CollateralVaultDeposit_filter>>>;
    or?: InputMaybe<Array<InputMaybe<CollateralVaultDeposit_filter>>>;
};
export type CollateralVaultDeposit_orderBy = 'id' | 'collateralVault' | 'collateralVault__id' | 'amount' | 'depositor' | 'createdAt' | 'proposalId' | 'withdrawnAt' | 'withdrawnTo';
export type CollateralVault_filter = {
    id?: InputMaybe<Scalars['ID']['input']>;
    id_not?: InputMaybe<Scalars['ID']['input']>;
    id_gt?: InputMaybe<Scalars['ID']['input']>;
    id_lt?: InputMaybe<Scalars['ID']['input']>;
    id_gte?: InputMaybe<Scalars['ID']['input']>;
    id_lte?: InputMaybe<Scalars['ID']['input']>;
    id_in?: InputMaybe<Array<Scalars['ID']['input']>>;
    id_not_in?: InputMaybe<Array<Scalars['ID']['input']>>;
    strategy?: InputMaybe<Scalars['String']['input']>;
    strategy_not?: InputMaybe<Scalars['String']['input']>;
    strategy_gt?: InputMaybe<Scalars['String']['input']>;
    strategy_lt?: InputMaybe<Scalars['String']['input']>;
    strategy_gte?: InputMaybe<Scalars['String']['input']>;
    strategy_lte?: InputMaybe<Scalars['String']['input']>;
    strategy_in?: InputMaybe<Array<Scalars['String']['input']>>;
    strategy_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
    strategy_contains?: InputMaybe<Scalars['String']['input']>;
    strategy_contains_nocase?: InputMaybe<Scalars['String']['input']>;
    strategy_not_contains?: InputMaybe<Scalars['String']['input']>;
    strategy_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
    strategy_starts_with?: InputMaybe<Scalars['String']['input']>;
    strategy_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
    strategy_not_starts_with?: InputMaybe<Scalars['String']['input']>;
    strategy_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
    strategy_ends_with?: InputMaybe<Scalars['String']['input']>;
    strategy_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
    strategy_not_ends_with?: InputMaybe<Scalars['String']['input']>;
    strategy_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
    strategy_?: InputMaybe<CVStrategy_filter>;
    collaterals_?: InputMaybe<CollateralVaultDeposit_filter>;
    /** Filter for the block changed event. */
    _change_block?: InputMaybe<BlockChangedFilter>;
    and?: InputMaybe<Array<InputMaybe<CollateralVault_filter>>>;
    or?: InputMaybe<Array<InputMaybe<CollateralVault_filter>>>;
};
export type CollateralVault_orderBy = 'id' | 'strategy' | 'strategy__id' | 'strategy__poolId' | 'strategy__poolAmount' | 'strategy__metadata' | 'strategy__maxCVSupply' | 'strategy__totalEffectiveActivePoints' | 'strategy__isEnabled' | 'strategy__token' | 'strategy__archived' | 'collaterals';
export type Member = {
    id: Scalars['ID']['output'];
    memberCommunity?: Maybe<Array<MemberCommunity>>;
    stakes?: Maybe<Array<Stake>>;
};
export type MembermemberCommunityArgs = {
    skip?: InputMaybe<Scalars['Int']['input']>;
    first?: InputMaybe<Scalars['Int']['input']>;
    orderBy?: InputMaybe<MemberCommunity_orderBy>;
    orderDirection?: InputMaybe<OrderDirection>;
    where?: InputMaybe<MemberCommunity_filter>;
};
export type MemberstakesArgs = {
    skip?: InputMaybe<Scalars['Int']['input']>;
    first?: InputMaybe<Scalars['Int']['input']>;
    orderBy?: InputMaybe<Stake_orderBy>;
    orderDirection?: InputMaybe<OrderDirection>;
    where?: InputMaybe<Stake_filter>;
};
export type MemberCommunity = {
    id: Scalars['ID']['output'];
    memberAddress?: Maybe<Scalars['String']['output']>;
    stakedTokens?: Maybe<Scalars['BigInt']['output']>;
    isRegistered?: Maybe<Scalars['Boolean']['output']>;
    member: Member;
    registryCommunity: RegistryCommunity;
    covenantSignature?: Maybe<Scalars['String']['output']>;
};
export type MemberCommunity_filter = {
    id?: InputMaybe<Scalars['ID']['input']>;
    id_not?: InputMaybe<Scalars['ID']['input']>;
    id_gt?: InputMaybe<Scalars['ID']['input']>;
    id_lt?: InputMaybe<Scalars['ID']['input']>;
    id_gte?: InputMaybe<Scalars['ID']['input']>;
    id_lte?: InputMaybe<Scalars['ID']['input']>;
    id_in?: InputMaybe<Array<Scalars['ID']['input']>>;
    id_not_in?: InputMaybe<Array<Scalars['ID']['input']>>;
    memberAddress?: InputMaybe<Scalars['String']['input']>;
    memberAddress_not?: InputMaybe<Scalars['String']['input']>;
    memberAddress_gt?: InputMaybe<Scalars['String']['input']>;
    memberAddress_lt?: InputMaybe<Scalars['String']['input']>;
    memberAddress_gte?: InputMaybe<Scalars['String']['input']>;
    memberAddress_lte?: InputMaybe<Scalars['String']['input']>;
    memberAddress_in?: InputMaybe<Array<Scalars['String']['input']>>;
    memberAddress_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
    memberAddress_contains?: InputMaybe<Scalars['String']['input']>;
    memberAddress_contains_nocase?: InputMaybe<Scalars['String']['input']>;
    memberAddress_not_contains?: InputMaybe<Scalars['String']['input']>;
    memberAddress_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
    memberAddress_starts_with?: InputMaybe<Scalars['String']['input']>;
    memberAddress_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
    memberAddress_not_starts_with?: InputMaybe<Scalars['String']['input']>;
    memberAddress_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
    memberAddress_ends_with?: InputMaybe<Scalars['String']['input']>;
    memberAddress_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
    memberAddress_not_ends_with?: InputMaybe<Scalars['String']['input']>;
    memberAddress_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
    stakedTokens?: InputMaybe<Scalars['BigInt']['input']>;
    stakedTokens_not?: InputMaybe<Scalars['BigInt']['input']>;
    stakedTokens_gt?: InputMaybe<Scalars['BigInt']['input']>;
    stakedTokens_lt?: InputMaybe<Scalars['BigInt']['input']>;
    stakedTokens_gte?: InputMaybe<Scalars['BigInt']['input']>;
    stakedTokens_lte?: InputMaybe<Scalars['BigInt']['input']>;
    stakedTokens_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    stakedTokens_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    isRegistered?: InputMaybe<Scalars['Boolean']['input']>;
    isRegistered_not?: InputMaybe<Scalars['Boolean']['input']>;
    isRegistered_in?: InputMaybe<Array<Scalars['Boolean']['input']>>;
    isRegistered_not_in?: InputMaybe<Array<Scalars['Boolean']['input']>>;
    member?: InputMaybe<Scalars['String']['input']>;
    member_not?: InputMaybe<Scalars['String']['input']>;
    member_gt?: InputMaybe<Scalars['String']['input']>;
    member_lt?: InputMaybe<Scalars['String']['input']>;
    member_gte?: InputMaybe<Scalars['String']['input']>;
    member_lte?: InputMaybe<Scalars['String']['input']>;
    member_in?: InputMaybe<Array<Scalars['String']['input']>>;
    member_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
    member_contains?: InputMaybe<Scalars['String']['input']>;
    member_contains_nocase?: InputMaybe<Scalars['String']['input']>;
    member_not_contains?: InputMaybe<Scalars['String']['input']>;
    member_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
    member_starts_with?: InputMaybe<Scalars['String']['input']>;
    member_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
    member_not_starts_with?: InputMaybe<Scalars['String']['input']>;
    member_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
    member_ends_with?: InputMaybe<Scalars['String']['input']>;
    member_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
    member_not_ends_with?: InputMaybe<Scalars['String']['input']>;
    member_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
    member_?: InputMaybe<Member_filter>;
    registryCommunity?: InputMaybe<Scalars['String']['input']>;
    registryCommunity_not?: InputMaybe<Scalars['String']['input']>;
    registryCommunity_gt?: InputMaybe<Scalars['String']['input']>;
    registryCommunity_lt?: InputMaybe<Scalars['String']['input']>;
    registryCommunity_gte?: InputMaybe<Scalars['String']['input']>;
    registryCommunity_lte?: InputMaybe<Scalars['String']['input']>;
    registryCommunity_in?: InputMaybe<Array<Scalars['String']['input']>>;
    registryCommunity_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
    registryCommunity_contains?: InputMaybe<Scalars['String']['input']>;
    registryCommunity_contains_nocase?: InputMaybe<Scalars['String']['input']>;
    registryCommunity_not_contains?: InputMaybe<Scalars['String']['input']>;
    registryCommunity_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
    registryCommunity_starts_with?: InputMaybe<Scalars['String']['input']>;
    registryCommunity_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
    registryCommunity_not_starts_with?: InputMaybe<Scalars['String']['input']>;
    registryCommunity_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
    registryCommunity_ends_with?: InputMaybe<Scalars['String']['input']>;
    registryCommunity_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
    registryCommunity_not_ends_with?: InputMaybe<Scalars['String']['input']>;
    registryCommunity_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
    registryCommunity_?: InputMaybe<RegistryCommunity_filter>;
    covenantSignature?: InputMaybe<Scalars['String']['input']>;
    covenantSignature_not?: InputMaybe<Scalars['String']['input']>;
    covenantSignature_gt?: InputMaybe<Scalars['String']['input']>;
    covenantSignature_lt?: InputMaybe<Scalars['String']['input']>;
    covenantSignature_gte?: InputMaybe<Scalars['String']['input']>;
    covenantSignature_lte?: InputMaybe<Scalars['String']['input']>;
    covenantSignature_in?: InputMaybe<Array<Scalars['String']['input']>>;
    covenantSignature_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
    covenantSignature_contains?: InputMaybe<Scalars['String']['input']>;
    covenantSignature_contains_nocase?: InputMaybe<Scalars['String']['input']>;
    covenantSignature_not_contains?: InputMaybe<Scalars['String']['input']>;
    covenantSignature_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
    covenantSignature_starts_with?: InputMaybe<Scalars['String']['input']>;
    covenantSignature_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
    covenantSignature_not_starts_with?: InputMaybe<Scalars['String']['input']>;
    covenantSignature_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
    covenantSignature_ends_with?: InputMaybe<Scalars['String']['input']>;
    covenantSignature_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
    covenantSignature_not_ends_with?: InputMaybe<Scalars['String']['input']>;
    covenantSignature_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
    /** Filter for the block changed event. */
    _change_block?: InputMaybe<BlockChangedFilter>;
    and?: InputMaybe<Array<InputMaybe<MemberCommunity_filter>>>;
    or?: InputMaybe<Array<InputMaybe<MemberCommunity_filter>>>;
};
export type MemberCommunity_orderBy = 'id' | 'memberAddress' | 'stakedTokens' | 'isRegistered' | 'member' | 'member__id' | 'registryCommunity' | 'registryCommunity__id' | 'registryCommunity__chainId' | 'registryCommunity__strategyTemplate' | 'registryCommunity__profileId' | 'registryCommunity__communityFee' | 'registryCommunity__protocolFee' | 'registryCommunity__protocolFeeReceiver' | 'registryCommunity__communityName' | 'registryCommunity__covenantIpfsHash' | 'registryCommunity__councilSafe' | 'registryCommunity__pendingNewCouncilSafe' | 'registryCommunity__isKickEnabled' | 'registryCommunity__registerStakeAmount' | 'registryCommunity__registerToken' | 'registryCommunity__alloAddress' | 'registryCommunity__membersCount' | 'registryCommunity__isValid' | 'covenantSignature';
export type MemberStrategy = {
    id: Scalars['ID']['output'];
    member: Member;
    strategy: CVStrategy;
    totalStakedPoints: Scalars['BigInt']['output'];
    activatedPoints?: Maybe<Scalars['BigInt']['output']>;
};
export type MemberStrategy_filter = {
    id?: InputMaybe<Scalars['ID']['input']>;
    id_not?: InputMaybe<Scalars['ID']['input']>;
    id_gt?: InputMaybe<Scalars['ID']['input']>;
    id_lt?: InputMaybe<Scalars['ID']['input']>;
    id_gte?: InputMaybe<Scalars['ID']['input']>;
    id_lte?: InputMaybe<Scalars['ID']['input']>;
    id_in?: InputMaybe<Array<Scalars['ID']['input']>>;
    id_not_in?: InputMaybe<Array<Scalars['ID']['input']>>;
    member?: InputMaybe<Scalars['String']['input']>;
    member_not?: InputMaybe<Scalars['String']['input']>;
    member_gt?: InputMaybe<Scalars['String']['input']>;
    member_lt?: InputMaybe<Scalars['String']['input']>;
    member_gte?: InputMaybe<Scalars['String']['input']>;
    member_lte?: InputMaybe<Scalars['String']['input']>;
    member_in?: InputMaybe<Array<Scalars['String']['input']>>;
    member_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
    member_contains?: InputMaybe<Scalars['String']['input']>;
    member_contains_nocase?: InputMaybe<Scalars['String']['input']>;
    member_not_contains?: InputMaybe<Scalars['String']['input']>;
    member_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
    member_starts_with?: InputMaybe<Scalars['String']['input']>;
    member_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
    member_not_starts_with?: InputMaybe<Scalars['String']['input']>;
    member_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
    member_ends_with?: InputMaybe<Scalars['String']['input']>;
    member_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
    member_not_ends_with?: InputMaybe<Scalars['String']['input']>;
    member_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
    member_?: InputMaybe<Member_filter>;
    strategy?: InputMaybe<Scalars['String']['input']>;
    strategy_not?: InputMaybe<Scalars['String']['input']>;
    strategy_gt?: InputMaybe<Scalars['String']['input']>;
    strategy_lt?: InputMaybe<Scalars['String']['input']>;
    strategy_gte?: InputMaybe<Scalars['String']['input']>;
    strategy_lte?: InputMaybe<Scalars['String']['input']>;
    strategy_in?: InputMaybe<Array<Scalars['String']['input']>>;
    strategy_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
    strategy_contains?: InputMaybe<Scalars['String']['input']>;
    strategy_contains_nocase?: InputMaybe<Scalars['String']['input']>;
    strategy_not_contains?: InputMaybe<Scalars['String']['input']>;
    strategy_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
    strategy_starts_with?: InputMaybe<Scalars['String']['input']>;
    strategy_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
    strategy_not_starts_with?: InputMaybe<Scalars['String']['input']>;
    strategy_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
    strategy_ends_with?: InputMaybe<Scalars['String']['input']>;
    strategy_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
    strategy_not_ends_with?: InputMaybe<Scalars['String']['input']>;
    strategy_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
    strategy_?: InputMaybe<CVStrategy_filter>;
    totalStakedPoints?: InputMaybe<Scalars['BigInt']['input']>;
    totalStakedPoints_not?: InputMaybe<Scalars['BigInt']['input']>;
    totalStakedPoints_gt?: InputMaybe<Scalars['BigInt']['input']>;
    totalStakedPoints_lt?: InputMaybe<Scalars['BigInt']['input']>;
    totalStakedPoints_gte?: InputMaybe<Scalars['BigInt']['input']>;
    totalStakedPoints_lte?: InputMaybe<Scalars['BigInt']['input']>;
    totalStakedPoints_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    totalStakedPoints_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    activatedPoints?: InputMaybe<Scalars['BigInt']['input']>;
    activatedPoints_not?: InputMaybe<Scalars['BigInt']['input']>;
    activatedPoints_gt?: InputMaybe<Scalars['BigInt']['input']>;
    activatedPoints_lt?: InputMaybe<Scalars['BigInt']['input']>;
    activatedPoints_gte?: InputMaybe<Scalars['BigInt']['input']>;
    activatedPoints_lte?: InputMaybe<Scalars['BigInt']['input']>;
    activatedPoints_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    activatedPoints_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    /** Filter for the block changed event. */
    _change_block?: InputMaybe<BlockChangedFilter>;
    and?: InputMaybe<Array<InputMaybe<MemberStrategy_filter>>>;
    or?: InputMaybe<Array<InputMaybe<MemberStrategy_filter>>>;
};
export type MemberStrategy_orderBy = 'id' | 'member' | 'member__id' | 'strategy' | 'strategy__id' | 'strategy__poolId' | 'strategy__poolAmount' | 'strategy__metadata' | 'strategy__maxCVSupply' | 'strategy__totalEffectiveActivePoints' | 'strategy__isEnabled' | 'strategy__token' | 'strategy__archived' | 'totalStakedPoints' | 'activatedPoints';
export type Member_filter = {
    id?: InputMaybe<Scalars['ID']['input']>;
    id_not?: InputMaybe<Scalars['ID']['input']>;
    id_gt?: InputMaybe<Scalars['ID']['input']>;
    id_lt?: InputMaybe<Scalars['ID']['input']>;
    id_gte?: InputMaybe<Scalars['ID']['input']>;
    id_lte?: InputMaybe<Scalars['ID']['input']>;
    id_in?: InputMaybe<Array<Scalars['ID']['input']>>;
    id_not_in?: InputMaybe<Array<Scalars['ID']['input']>>;
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
    id: Scalars['ID']['output'];
    strategies?: Maybe<Array<PassportStrategy>>;
    users?: Maybe<Array<PassportUser>>;
};
export type PassportScorerstrategiesArgs = {
    skip?: InputMaybe<Scalars['Int']['input']>;
    first?: InputMaybe<Scalars['Int']['input']>;
    orderBy?: InputMaybe<PassportStrategy_orderBy>;
    orderDirection?: InputMaybe<OrderDirection>;
    where?: InputMaybe<PassportStrategy_filter>;
};
export type PassportScorerusersArgs = {
    skip?: InputMaybe<Scalars['Int']['input']>;
    first?: InputMaybe<Scalars['Int']['input']>;
    orderBy?: InputMaybe<PassportUser_orderBy>;
    orderDirection?: InputMaybe<OrderDirection>;
    where?: InputMaybe<PassportUser_filter>;
};
export type PassportScorer_filter = {
    id?: InputMaybe<Scalars['ID']['input']>;
    id_not?: InputMaybe<Scalars['ID']['input']>;
    id_gt?: InputMaybe<Scalars['ID']['input']>;
    id_lt?: InputMaybe<Scalars['ID']['input']>;
    id_gte?: InputMaybe<Scalars['ID']['input']>;
    id_lte?: InputMaybe<Scalars['ID']['input']>;
    id_in?: InputMaybe<Array<Scalars['ID']['input']>>;
    id_not_in?: InputMaybe<Array<Scalars['ID']['input']>>;
    strategies_?: InputMaybe<PassportStrategy_filter>;
    users_?: InputMaybe<PassportUser_filter>;
    /** Filter for the block changed event. */
    _change_block?: InputMaybe<BlockChangedFilter>;
    and?: InputMaybe<Array<InputMaybe<PassportScorer_filter>>>;
    or?: InputMaybe<Array<InputMaybe<PassportScorer_filter>>>;
};
export type PassportScorer_orderBy = 'id' | 'strategies' | 'users';
export type PassportStrategy = {
    id: Scalars['ID']['output'];
    passportScorer: PassportScorer;
    strategy: CVStrategy;
    threshold: Scalars['BigInt']['output'];
    councilSafe: Scalars['String']['output'];
    active: Scalars['Boolean']['output'];
};
export type PassportStrategy_filter = {
    id?: InputMaybe<Scalars['ID']['input']>;
    id_not?: InputMaybe<Scalars['ID']['input']>;
    id_gt?: InputMaybe<Scalars['ID']['input']>;
    id_lt?: InputMaybe<Scalars['ID']['input']>;
    id_gte?: InputMaybe<Scalars['ID']['input']>;
    id_lte?: InputMaybe<Scalars['ID']['input']>;
    id_in?: InputMaybe<Array<Scalars['ID']['input']>>;
    id_not_in?: InputMaybe<Array<Scalars['ID']['input']>>;
    passportScorer?: InputMaybe<Scalars['String']['input']>;
    passportScorer_not?: InputMaybe<Scalars['String']['input']>;
    passportScorer_gt?: InputMaybe<Scalars['String']['input']>;
    passportScorer_lt?: InputMaybe<Scalars['String']['input']>;
    passportScorer_gte?: InputMaybe<Scalars['String']['input']>;
    passportScorer_lte?: InputMaybe<Scalars['String']['input']>;
    passportScorer_in?: InputMaybe<Array<Scalars['String']['input']>>;
    passportScorer_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
    passportScorer_contains?: InputMaybe<Scalars['String']['input']>;
    passportScorer_contains_nocase?: InputMaybe<Scalars['String']['input']>;
    passportScorer_not_contains?: InputMaybe<Scalars['String']['input']>;
    passportScorer_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
    passportScorer_starts_with?: InputMaybe<Scalars['String']['input']>;
    passportScorer_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
    passportScorer_not_starts_with?: InputMaybe<Scalars['String']['input']>;
    passportScorer_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
    passportScorer_ends_with?: InputMaybe<Scalars['String']['input']>;
    passportScorer_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
    passportScorer_not_ends_with?: InputMaybe<Scalars['String']['input']>;
    passportScorer_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
    passportScorer_?: InputMaybe<PassportScorer_filter>;
    strategy?: InputMaybe<Scalars['String']['input']>;
    strategy_not?: InputMaybe<Scalars['String']['input']>;
    strategy_gt?: InputMaybe<Scalars['String']['input']>;
    strategy_lt?: InputMaybe<Scalars['String']['input']>;
    strategy_gte?: InputMaybe<Scalars['String']['input']>;
    strategy_lte?: InputMaybe<Scalars['String']['input']>;
    strategy_in?: InputMaybe<Array<Scalars['String']['input']>>;
    strategy_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
    strategy_contains?: InputMaybe<Scalars['String']['input']>;
    strategy_contains_nocase?: InputMaybe<Scalars['String']['input']>;
    strategy_not_contains?: InputMaybe<Scalars['String']['input']>;
    strategy_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
    strategy_starts_with?: InputMaybe<Scalars['String']['input']>;
    strategy_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
    strategy_not_starts_with?: InputMaybe<Scalars['String']['input']>;
    strategy_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
    strategy_ends_with?: InputMaybe<Scalars['String']['input']>;
    strategy_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
    strategy_not_ends_with?: InputMaybe<Scalars['String']['input']>;
    strategy_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
    strategy_?: InputMaybe<CVStrategy_filter>;
    threshold?: InputMaybe<Scalars['BigInt']['input']>;
    threshold_not?: InputMaybe<Scalars['BigInt']['input']>;
    threshold_gt?: InputMaybe<Scalars['BigInt']['input']>;
    threshold_lt?: InputMaybe<Scalars['BigInt']['input']>;
    threshold_gte?: InputMaybe<Scalars['BigInt']['input']>;
    threshold_lte?: InputMaybe<Scalars['BigInt']['input']>;
    threshold_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    threshold_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    councilSafe?: InputMaybe<Scalars['String']['input']>;
    councilSafe_not?: InputMaybe<Scalars['String']['input']>;
    councilSafe_gt?: InputMaybe<Scalars['String']['input']>;
    councilSafe_lt?: InputMaybe<Scalars['String']['input']>;
    councilSafe_gte?: InputMaybe<Scalars['String']['input']>;
    councilSafe_lte?: InputMaybe<Scalars['String']['input']>;
    councilSafe_in?: InputMaybe<Array<Scalars['String']['input']>>;
    councilSafe_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
    councilSafe_contains?: InputMaybe<Scalars['String']['input']>;
    councilSafe_contains_nocase?: InputMaybe<Scalars['String']['input']>;
    councilSafe_not_contains?: InputMaybe<Scalars['String']['input']>;
    councilSafe_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
    councilSafe_starts_with?: InputMaybe<Scalars['String']['input']>;
    councilSafe_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
    councilSafe_not_starts_with?: InputMaybe<Scalars['String']['input']>;
    councilSafe_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
    councilSafe_ends_with?: InputMaybe<Scalars['String']['input']>;
    councilSafe_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
    councilSafe_not_ends_with?: InputMaybe<Scalars['String']['input']>;
    councilSafe_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
    active?: InputMaybe<Scalars['Boolean']['input']>;
    active_not?: InputMaybe<Scalars['Boolean']['input']>;
    active_in?: InputMaybe<Array<Scalars['Boolean']['input']>>;
    active_not_in?: InputMaybe<Array<Scalars['Boolean']['input']>>;
    /** Filter for the block changed event. */
    _change_block?: InputMaybe<BlockChangedFilter>;
    and?: InputMaybe<Array<InputMaybe<PassportStrategy_filter>>>;
    or?: InputMaybe<Array<InputMaybe<PassportStrategy_filter>>>;
};
export type PassportStrategy_orderBy = 'id' | 'passportScorer' | 'passportScorer__id' | 'strategy' | 'strategy__id' | 'strategy__poolId' | 'strategy__poolAmount' | 'strategy__metadata' | 'strategy__maxCVSupply' | 'strategy__totalEffectiveActivePoints' | 'strategy__isEnabled' | 'strategy__token' | 'strategy__archived' | 'threshold' | 'councilSafe' | 'active';
export type PassportUser = {
    id: Scalars['ID']['output'];
    passportScorer: PassportScorer;
    userAddress: Scalars['String']['output'];
    score: Scalars['BigInt']['output'];
    lastUpdated: Scalars['BigInt']['output'];
};
export type PassportUser_filter = {
    id?: InputMaybe<Scalars['ID']['input']>;
    id_not?: InputMaybe<Scalars['ID']['input']>;
    id_gt?: InputMaybe<Scalars['ID']['input']>;
    id_lt?: InputMaybe<Scalars['ID']['input']>;
    id_gte?: InputMaybe<Scalars['ID']['input']>;
    id_lte?: InputMaybe<Scalars['ID']['input']>;
    id_in?: InputMaybe<Array<Scalars['ID']['input']>>;
    id_not_in?: InputMaybe<Array<Scalars['ID']['input']>>;
    passportScorer?: InputMaybe<Scalars['String']['input']>;
    passportScorer_not?: InputMaybe<Scalars['String']['input']>;
    passportScorer_gt?: InputMaybe<Scalars['String']['input']>;
    passportScorer_lt?: InputMaybe<Scalars['String']['input']>;
    passportScorer_gte?: InputMaybe<Scalars['String']['input']>;
    passportScorer_lte?: InputMaybe<Scalars['String']['input']>;
    passportScorer_in?: InputMaybe<Array<Scalars['String']['input']>>;
    passportScorer_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
    passportScorer_contains?: InputMaybe<Scalars['String']['input']>;
    passportScorer_contains_nocase?: InputMaybe<Scalars['String']['input']>;
    passportScorer_not_contains?: InputMaybe<Scalars['String']['input']>;
    passportScorer_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
    passportScorer_starts_with?: InputMaybe<Scalars['String']['input']>;
    passportScorer_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
    passportScorer_not_starts_with?: InputMaybe<Scalars['String']['input']>;
    passportScorer_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
    passportScorer_ends_with?: InputMaybe<Scalars['String']['input']>;
    passportScorer_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
    passportScorer_not_ends_with?: InputMaybe<Scalars['String']['input']>;
    passportScorer_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
    passportScorer_?: InputMaybe<PassportScorer_filter>;
    userAddress?: InputMaybe<Scalars['String']['input']>;
    userAddress_not?: InputMaybe<Scalars['String']['input']>;
    userAddress_gt?: InputMaybe<Scalars['String']['input']>;
    userAddress_lt?: InputMaybe<Scalars['String']['input']>;
    userAddress_gte?: InputMaybe<Scalars['String']['input']>;
    userAddress_lte?: InputMaybe<Scalars['String']['input']>;
    userAddress_in?: InputMaybe<Array<Scalars['String']['input']>>;
    userAddress_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
    userAddress_contains?: InputMaybe<Scalars['String']['input']>;
    userAddress_contains_nocase?: InputMaybe<Scalars['String']['input']>;
    userAddress_not_contains?: InputMaybe<Scalars['String']['input']>;
    userAddress_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
    userAddress_starts_with?: InputMaybe<Scalars['String']['input']>;
    userAddress_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
    userAddress_not_starts_with?: InputMaybe<Scalars['String']['input']>;
    userAddress_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
    userAddress_ends_with?: InputMaybe<Scalars['String']['input']>;
    userAddress_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
    userAddress_not_ends_with?: InputMaybe<Scalars['String']['input']>;
    userAddress_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
    score?: InputMaybe<Scalars['BigInt']['input']>;
    score_not?: InputMaybe<Scalars['BigInt']['input']>;
    score_gt?: InputMaybe<Scalars['BigInt']['input']>;
    score_lt?: InputMaybe<Scalars['BigInt']['input']>;
    score_gte?: InputMaybe<Scalars['BigInt']['input']>;
    score_lte?: InputMaybe<Scalars['BigInt']['input']>;
    score_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    score_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    lastUpdated?: InputMaybe<Scalars['BigInt']['input']>;
    lastUpdated_not?: InputMaybe<Scalars['BigInt']['input']>;
    lastUpdated_gt?: InputMaybe<Scalars['BigInt']['input']>;
    lastUpdated_lt?: InputMaybe<Scalars['BigInt']['input']>;
    lastUpdated_gte?: InputMaybe<Scalars['BigInt']['input']>;
    lastUpdated_lte?: InputMaybe<Scalars['BigInt']['input']>;
    lastUpdated_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    lastUpdated_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    /** Filter for the block changed event. */
    _change_block?: InputMaybe<BlockChangedFilter>;
    and?: InputMaybe<Array<InputMaybe<PassportUser_filter>>>;
    or?: InputMaybe<Array<InputMaybe<PassportUser_filter>>>;
};
export type PassportUser_orderBy = 'id' | 'passportScorer' | 'passportScorer__id' | 'userAddress' | 'score' | 'lastUpdated';
export type ProposalDispute = {
    id: Scalars['ID']['output'];
    createdAt: Scalars['BigInt']['output'];
    disputeId: Scalars['BigInt']['output'];
    proposal: CVProposal;
    status: Scalars['BigInt']['output'];
    challenger: Scalars['String']['output'];
    context: Scalars['String']['output'];
    metadata?: Maybe<ProposalDisputeMetadata>;
    rulingOutcome?: Maybe<Scalars['BigInt']['output']>;
    ruledAt?: Maybe<Scalars['BigInt']['output']>;
};
export type ProposalDisputeMetadata = {
    id: Scalars['ID']['output'];
    reason: Scalars['String']['output'];
};
export type ProposalDisputeMetadata_filter = {
    id?: InputMaybe<Scalars['ID']['input']>;
    id_not?: InputMaybe<Scalars['ID']['input']>;
    id_gt?: InputMaybe<Scalars['ID']['input']>;
    id_lt?: InputMaybe<Scalars['ID']['input']>;
    id_gte?: InputMaybe<Scalars['ID']['input']>;
    id_lte?: InputMaybe<Scalars['ID']['input']>;
    id_in?: InputMaybe<Array<Scalars['ID']['input']>>;
    id_not_in?: InputMaybe<Array<Scalars['ID']['input']>>;
    reason?: InputMaybe<Scalars['String']['input']>;
    reason_not?: InputMaybe<Scalars['String']['input']>;
    reason_gt?: InputMaybe<Scalars['String']['input']>;
    reason_lt?: InputMaybe<Scalars['String']['input']>;
    reason_gte?: InputMaybe<Scalars['String']['input']>;
    reason_lte?: InputMaybe<Scalars['String']['input']>;
    reason_in?: InputMaybe<Array<Scalars['String']['input']>>;
    reason_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
    reason_contains?: InputMaybe<Scalars['String']['input']>;
    reason_contains_nocase?: InputMaybe<Scalars['String']['input']>;
    reason_not_contains?: InputMaybe<Scalars['String']['input']>;
    reason_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
    reason_starts_with?: InputMaybe<Scalars['String']['input']>;
    reason_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
    reason_not_starts_with?: InputMaybe<Scalars['String']['input']>;
    reason_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
    reason_ends_with?: InputMaybe<Scalars['String']['input']>;
    reason_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
    reason_not_ends_with?: InputMaybe<Scalars['String']['input']>;
    reason_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
    /** Filter for the block changed event. */
    _change_block?: InputMaybe<BlockChangedFilter>;
    and?: InputMaybe<Array<InputMaybe<ProposalDisputeMetadata_filter>>>;
    or?: InputMaybe<Array<InputMaybe<ProposalDisputeMetadata_filter>>>;
};
export type ProposalDisputeMetadata_orderBy = 'id' | 'reason';
export type ProposalDispute_filter = {
    id?: InputMaybe<Scalars['ID']['input']>;
    id_not?: InputMaybe<Scalars['ID']['input']>;
    id_gt?: InputMaybe<Scalars['ID']['input']>;
    id_lt?: InputMaybe<Scalars['ID']['input']>;
    id_gte?: InputMaybe<Scalars['ID']['input']>;
    id_lte?: InputMaybe<Scalars['ID']['input']>;
    id_in?: InputMaybe<Array<Scalars['ID']['input']>>;
    id_not_in?: InputMaybe<Array<Scalars['ID']['input']>>;
    createdAt?: InputMaybe<Scalars['BigInt']['input']>;
    createdAt_not?: InputMaybe<Scalars['BigInt']['input']>;
    createdAt_gt?: InputMaybe<Scalars['BigInt']['input']>;
    createdAt_lt?: InputMaybe<Scalars['BigInt']['input']>;
    createdAt_gte?: InputMaybe<Scalars['BigInt']['input']>;
    createdAt_lte?: InputMaybe<Scalars['BigInt']['input']>;
    createdAt_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    createdAt_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    disputeId?: InputMaybe<Scalars['BigInt']['input']>;
    disputeId_not?: InputMaybe<Scalars['BigInt']['input']>;
    disputeId_gt?: InputMaybe<Scalars['BigInt']['input']>;
    disputeId_lt?: InputMaybe<Scalars['BigInt']['input']>;
    disputeId_gte?: InputMaybe<Scalars['BigInt']['input']>;
    disputeId_lte?: InputMaybe<Scalars['BigInt']['input']>;
    disputeId_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    disputeId_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    proposal?: InputMaybe<Scalars['String']['input']>;
    proposal_not?: InputMaybe<Scalars['String']['input']>;
    proposal_gt?: InputMaybe<Scalars['String']['input']>;
    proposal_lt?: InputMaybe<Scalars['String']['input']>;
    proposal_gte?: InputMaybe<Scalars['String']['input']>;
    proposal_lte?: InputMaybe<Scalars['String']['input']>;
    proposal_in?: InputMaybe<Array<Scalars['String']['input']>>;
    proposal_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
    proposal_contains?: InputMaybe<Scalars['String']['input']>;
    proposal_contains_nocase?: InputMaybe<Scalars['String']['input']>;
    proposal_not_contains?: InputMaybe<Scalars['String']['input']>;
    proposal_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
    proposal_starts_with?: InputMaybe<Scalars['String']['input']>;
    proposal_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
    proposal_not_starts_with?: InputMaybe<Scalars['String']['input']>;
    proposal_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
    proposal_ends_with?: InputMaybe<Scalars['String']['input']>;
    proposal_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
    proposal_not_ends_with?: InputMaybe<Scalars['String']['input']>;
    proposal_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
    proposal_?: InputMaybe<CVProposal_filter>;
    status?: InputMaybe<Scalars['BigInt']['input']>;
    status_not?: InputMaybe<Scalars['BigInt']['input']>;
    status_gt?: InputMaybe<Scalars['BigInt']['input']>;
    status_lt?: InputMaybe<Scalars['BigInt']['input']>;
    status_gte?: InputMaybe<Scalars['BigInt']['input']>;
    status_lte?: InputMaybe<Scalars['BigInt']['input']>;
    status_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    status_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    challenger?: InputMaybe<Scalars['String']['input']>;
    challenger_not?: InputMaybe<Scalars['String']['input']>;
    challenger_gt?: InputMaybe<Scalars['String']['input']>;
    challenger_lt?: InputMaybe<Scalars['String']['input']>;
    challenger_gte?: InputMaybe<Scalars['String']['input']>;
    challenger_lte?: InputMaybe<Scalars['String']['input']>;
    challenger_in?: InputMaybe<Array<Scalars['String']['input']>>;
    challenger_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
    challenger_contains?: InputMaybe<Scalars['String']['input']>;
    challenger_contains_nocase?: InputMaybe<Scalars['String']['input']>;
    challenger_not_contains?: InputMaybe<Scalars['String']['input']>;
    challenger_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
    challenger_starts_with?: InputMaybe<Scalars['String']['input']>;
    challenger_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
    challenger_not_starts_with?: InputMaybe<Scalars['String']['input']>;
    challenger_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
    challenger_ends_with?: InputMaybe<Scalars['String']['input']>;
    challenger_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
    challenger_not_ends_with?: InputMaybe<Scalars['String']['input']>;
    challenger_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
    context?: InputMaybe<Scalars['String']['input']>;
    context_not?: InputMaybe<Scalars['String']['input']>;
    context_gt?: InputMaybe<Scalars['String']['input']>;
    context_lt?: InputMaybe<Scalars['String']['input']>;
    context_gte?: InputMaybe<Scalars['String']['input']>;
    context_lte?: InputMaybe<Scalars['String']['input']>;
    context_in?: InputMaybe<Array<Scalars['String']['input']>>;
    context_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
    context_contains?: InputMaybe<Scalars['String']['input']>;
    context_contains_nocase?: InputMaybe<Scalars['String']['input']>;
    context_not_contains?: InputMaybe<Scalars['String']['input']>;
    context_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
    context_starts_with?: InputMaybe<Scalars['String']['input']>;
    context_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
    context_not_starts_with?: InputMaybe<Scalars['String']['input']>;
    context_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
    context_ends_with?: InputMaybe<Scalars['String']['input']>;
    context_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
    context_not_ends_with?: InputMaybe<Scalars['String']['input']>;
    context_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
    metadata?: InputMaybe<Scalars['String']['input']>;
    metadata_not?: InputMaybe<Scalars['String']['input']>;
    metadata_gt?: InputMaybe<Scalars['String']['input']>;
    metadata_lt?: InputMaybe<Scalars['String']['input']>;
    metadata_gte?: InputMaybe<Scalars['String']['input']>;
    metadata_lte?: InputMaybe<Scalars['String']['input']>;
    metadata_in?: InputMaybe<Array<Scalars['String']['input']>>;
    metadata_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
    metadata_contains?: InputMaybe<Scalars['String']['input']>;
    metadata_contains_nocase?: InputMaybe<Scalars['String']['input']>;
    metadata_not_contains?: InputMaybe<Scalars['String']['input']>;
    metadata_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
    metadata_starts_with?: InputMaybe<Scalars['String']['input']>;
    metadata_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
    metadata_not_starts_with?: InputMaybe<Scalars['String']['input']>;
    metadata_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
    metadata_ends_with?: InputMaybe<Scalars['String']['input']>;
    metadata_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
    metadata_not_ends_with?: InputMaybe<Scalars['String']['input']>;
    metadata_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
    metadata_?: InputMaybe<ProposalDisputeMetadata_filter>;
    rulingOutcome?: InputMaybe<Scalars['BigInt']['input']>;
    rulingOutcome_not?: InputMaybe<Scalars['BigInt']['input']>;
    rulingOutcome_gt?: InputMaybe<Scalars['BigInt']['input']>;
    rulingOutcome_lt?: InputMaybe<Scalars['BigInt']['input']>;
    rulingOutcome_gte?: InputMaybe<Scalars['BigInt']['input']>;
    rulingOutcome_lte?: InputMaybe<Scalars['BigInt']['input']>;
    rulingOutcome_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    rulingOutcome_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    ruledAt?: InputMaybe<Scalars['BigInt']['input']>;
    ruledAt_not?: InputMaybe<Scalars['BigInt']['input']>;
    ruledAt_gt?: InputMaybe<Scalars['BigInt']['input']>;
    ruledAt_lt?: InputMaybe<Scalars['BigInt']['input']>;
    ruledAt_gte?: InputMaybe<Scalars['BigInt']['input']>;
    ruledAt_lte?: InputMaybe<Scalars['BigInt']['input']>;
    ruledAt_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    ruledAt_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    /** Filter for the block changed event. */
    _change_block?: InputMaybe<BlockChangedFilter>;
    and?: InputMaybe<Array<InputMaybe<ProposalDispute_filter>>>;
    or?: InputMaybe<Array<InputMaybe<ProposalDispute_filter>>>;
};
export type ProposalDispute_orderBy = 'id' | 'createdAt' | 'disputeId' | 'proposal' | 'proposal__id' | 'proposal__proposalNumber' | 'proposal__metadataHash' | 'proposal__version' | 'proposal__beneficiary' | 'proposal__requestedAmount' | 'proposal__requestedToken' | 'proposal__proposalStatus' | 'proposal__blockLast' | 'proposal__convictionLast' | 'proposal__threshold' | 'proposal__maxCVStaked' | 'proposal__stakedAmount' | 'proposal__submitter' | 'proposal__createdAt' | 'proposal__updatedAt' | 'status' | 'challenger' | 'context' | 'metadata' | 'metadata__id' | 'metadata__reason' | 'rulingOutcome' | 'ruledAt';
export type ProposalMetadata = {
    id: Scalars['ID']['output'];
    title: Scalars['String']['output'];
    description: Scalars['String']['output'];
};
export type ProposalMetadata_filter = {
    id?: InputMaybe<Scalars['ID']['input']>;
    id_not?: InputMaybe<Scalars['ID']['input']>;
    id_gt?: InputMaybe<Scalars['ID']['input']>;
    id_lt?: InputMaybe<Scalars['ID']['input']>;
    id_gte?: InputMaybe<Scalars['ID']['input']>;
    id_lte?: InputMaybe<Scalars['ID']['input']>;
    id_in?: InputMaybe<Array<Scalars['ID']['input']>>;
    id_not_in?: InputMaybe<Array<Scalars['ID']['input']>>;
    title?: InputMaybe<Scalars['String']['input']>;
    title_not?: InputMaybe<Scalars['String']['input']>;
    title_gt?: InputMaybe<Scalars['String']['input']>;
    title_lt?: InputMaybe<Scalars['String']['input']>;
    title_gte?: InputMaybe<Scalars['String']['input']>;
    title_lte?: InputMaybe<Scalars['String']['input']>;
    title_in?: InputMaybe<Array<Scalars['String']['input']>>;
    title_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
    title_contains?: InputMaybe<Scalars['String']['input']>;
    title_contains_nocase?: InputMaybe<Scalars['String']['input']>;
    title_not_contains?: InputMaybe<Scalars['String']['input']>;
    title_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
    title_starts_with?: InputMaybe<Scalars['String']['input']>;
    title_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
    title_not_starts_with?: InputMaybe<Scalars['String']['input']>;
    title_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
    title_ends_with?: InputMaybe<Scalars['String']['input']>;
    title_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
    title_not_ends_with?: InputMaybe<Scalars['String']['input']>;
    title_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
    description?: InputMaybe<Scalars['String']['input']>;
    description_not?: InputMaybe<Scalars['String']['input']>;
    description_gt?: InputMaybe<Scalars['String']['input']>;
    description_lt?: InputMaybe<Scalars['String']['input']>;
    description_gte?: InputMaybe<Scalars['String']['input']>;
    description_lte?: InputMaybe<Scalars['String']['input']>;
    description_in?: InputMaybe<Array<Scalars['String']['input']>>;
    description_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
    description_contains?: InputMaybe<Scalars['String']['input']>;
    description_contains_nocase?: InputMaybe<Scalars['String']['input']>;
    description_not_contains?: InputMaybe<Scalars['String']['input']>;
    description_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
    description_starts_with?: InputMaybe<Scalars['String']['input']>;
    description_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
    description_not_starts_with?: InputMaybe<Scalars['String']['input']>;
    description_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
    description_ends_with?: InputMaybe<Scalars['String']['input']>;
    description_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
    description_not_ends_with?: InputMaybe<Scalars['String']['input']>;
    description_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
    /** Filter for the block changed event. */
    _change_block?: InputMaybe<BlockChangedFilter>;
    and?: InputMaybe<Array<InputMaybe<ProposalMetadata_filter>>>;
    or?: InputMaybe<Array<InputMaybe<ProposalMetadata_filter>>>;
};
export type ProposalMetadata_orderBy = 'id' | 'title' | 'description';
export type Query = {
    cvstrategy?: Maybe<CVStrategy>;
    cvstrategies: Array<CVStrategy>;
    cvstrategyConfig?: Maybe<CVStrategyConfig>;
    cvstrategyConfigs: Array<CVStrategyConfig>;
    arbitrableConfig?: Maybe<ArbitrableConfig>;
    arbitrableConfigs: Array<ArbitrableConfig>;
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
    proposalDispute?: Maybe<ProposalDispute>;
    proposalDisputes: Array<ProposalDispute>;
    proposalDisputeMetadata?: Maybe<ProposalDisputeMetadata>;
    proposalDisputeMetadata_collection: Array<ProposalDisputeMetadata>;
    proposalMetadata?: Maybe<ProposalMetadata>;
    proposalMetadata_collection: Array<ProposalMetadata>;
    collateralVault?: Maybe<CollateralVault>;
    collateralVaults: Array<CollateralVault>;
    collateralVaultDeposit?: Maybe<CollateralVaultDeposit>;
    collateralVaultDeposits: Array<CollateralVaultDeposit>;
    /** Access to subgraph metadata */
    _meta?: Maybe<_Meta_>;
};
export type QuerycvstrategyArgs = {
    id: Scalars['ID']['input'];
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type QuerycvstrategiesArgs = {
    skip?: InputMaybe<Scalars['Int']['input']>;
    first?: InputMaybe<Scalars['Int']['input']>;
    orderBy?: InputMaybe<CVStrategy_orderBy>;
    orderDirection?: InputMaybe<OrderDirection>;
    where?: InputMaybe<CVStrategy_filter>;
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type QuerycvstrategyConfigArgs = {
    id: Scalars['ID']['input'];
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type QuerycvstrategyConfigsArgs = {
    skip?: InputMaybe<Scalars['Int']['input']>;
    first?: InputMaybe<Scalars['Int']['input']>;
    orderBy?: InputMaybe<CVStrategyConfig_orderBy>;
    orderDirection?: InputMaybe<OrderDirection>;
    where?: InputMaybe<CVStrategyConfig_filter>;
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type QueryarbitrableConfigArgs = {
    id: Scalars['ID']['input'];
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type QueryarbitrableConfigsArgs = {
    skip?: InputMaybe<Scalars['Int']['input']>;
    first?: InputMaybe<Scalars['Int']['input']>;
    orderBy?: InputMaybe<ArbitrableConfig_orderBy>;
    orderDirection?: InputMaybe<OrderDirection>;
    where?: InputMaybe<ArbitrableConfig_filter>;
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type QuerycvproposalArgs = {
    id: Scalars['ID']['input'];
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type QuerycvproposalsArgs = {
    skip?: InputMaybe<Scalars['Int']['input']>;
    first?: InputMaybe<Scalars['Int']['input']>;
    orderBy?: InputMaybe<CVProposal_orderBy>;
    orderDirection?: InputMaybe<OrderDirection>;
    where?: InputMaybe<CVProposal_filter>;
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type QueryregistryFactoryArgs = {
    id: Scalars['ID']['input'];
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type QueryregistryFactoriesArgs = {
    skip?: InputMaybe<Scalars['Int']['input']>;
    first?: InputMaybe<Scalars['Int']['input']>;
    orderBy?: InputMaybe<RegistryFactory_orderBy>;
    orderDirection?: InputMaybe<OrderDirection>;
    where?: InputMaybe<RegistryFactory_filter>;
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type QueryregistryCommunityArgs = {
    id: Scalars['ID']['input'];
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type QueryregistryCommunitiesArgs = {
    skip?: InputMaybe<Scalars['Int']['input']>;
    first?: InputMaybe<Scalars['Int']['input']>;
    orderBy?: InputMaybe<RegistryCommunity_orderBy>;
    orderDirection?: InputMaybe<OrderDirection>;
    where?: InputMaybe<RegistryCommunity_filter>;
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type QuerymemberArgs = {
    id: Scalars['ID']['input'];
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type QuerymembersArgs = {
    skip?: InputMaybe<Scalars['Int']['input']>;
    first?: InputMaybe<Scalars['Int']['input']>;
    orderBy?: InputMaybe<Member_orderBy>;
    orderDirection?: InputMaybe<OrderDirection>;
    where?: InputMaybe<Member_filter>;
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type QuerystakeArgs = {
    id: Scalars['ID']['input'];
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type QuerystakesArgs = {
    skip?: InputMaybe<Scalars['Int']['input']>;
    first?: InputMaybe<Scalars['Int']['input']>;
    orderBy?: InputMaybe<Stake_orderBy>;
    orderDirection?: InputMaybe<OrderDirection>;
    where?: InputMaybe<Stake_filter>;
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type QuerymemberCommunityArgs = {
    id: Scalars['ID']['input'];
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type QuerymemberCommunitiesArgs = {
    skip?: InputMaybe<Scalars['Int']['input']>;
    first?: InputMaybe<Scalars['Int']['input']>;
    orderBy?: InputMaybe<MemberCommunity_orderBy>;
    orderDirection?: InputMaybe<OrderDirection>;
    where?: InputMaybe<MemberCommunity_filter>;
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type QuerymemberStrategyArgs = {
    id: Scalars['ID']['input'];
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type QuerymemberStrategiesArgs = {
    skip?: InputMaybe<Scalars['Int']['input']>;
    first?: InputMaybe<Scalars['Int']['input']>;
    orderBy?: InputMaybe<MemberStrategy_orderBy>;
    orderDirection?: InputMaybe<OrderDirection>;
    where?: InputMaybe<MemberStrategy_filter>;
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type QuerytokenGardenArgs = {
    id: Scalars['ID']['input'];
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type QuerytokenGardensArgs = {
    skip?: InputMaybe<Scalars['Int']['input']>;
    first?: InputMaybe<Scalars['Int']['input']>;
    orderBy?: InputMaybe<TokenGarden_orderBy>;
    orderDirection?: InputMaybe<OrderDirection>;
    where?: InputMaybe<TokenGarden_filter>;
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type QueryalloArgs = {
    id: Scalars['ID']['input'];
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type QueryallosArgs = {
    skip?: InputMaybe<Scalars['Int']['input']>;
    first?: InputMaybe<Scalars['Int']['input']>;
    orderBy?: InputMaybe<Allo_orderBy>;
    orderDirection?: InputMaybe<OrderDirection>;
    where?: InputMaybe<Allo_filter>;
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type QuerypassportScorerArgs = {
    id: Scalars['ID']['input'];
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type QuerypassportScorersArgs = {
    skip?: InputMaybe<Scalars['Int']['input']>;
    first?: InputMaybe<Scalars['Int']['input']>;
    orderBy?: InputMaybe<PassportScorer_orderBy>;
    orderDirection?: InputMaybe<OrderDirection>;
    where?: InputMaybe<PassportScorer_filter>;
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type QuerypassportStrategyArgs = {
    id: Scalars['ID']['input'];
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type QuerypassportStrategiesArgs = {
    skip?: InputMaybe<Scalars['Int']['input']>;
    first?: InputMaybe<Scalars['Int']['input']>;
    orderBy?: InputMaybe<PassportStrategy_orderBy>;
    orderDirection?: InputMaybe<OrderDirection>;
    where?: InputMaybe<PassportStrategy_filter>;
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type QuerypassportUserArgs = {
    id: Scalars['ID']['input'];
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type QuerypassportUsersArgs = {
    skip?: InputMaybe<Scalars['Int']['input']>;
    first?: InputMaybe<Scalars['Int']['input']>;
    orderBy?: InputMaybe<PassportUser_orderBy>;
    orderDirection?: InputMaybe<OrderDirection>;
    where?: InputMaybe<PassportUser_filter>;
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type QueryproposalDisputeArgs = {
    id: Scalars['ID']['input'];
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type QueryproposalDisputesArgs = {
    skip?: InputMaybe<Scalars['Int']['input']>;
    first?: InputMaybe<Scalars['Int']['input']>;
    orderBy?: InputMaybe<ProposalDispute_orderBy>;
    orderDirection?: InputMaybe<OrderDirection>;
    where?: InputMaybe<ProposalDispute_filter>;
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type QueryproposalDisputeMetadataArgs = {
    id: Scalars['ID']['input'];
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type QueryproposalDisputeMetadata_collectionArgs = {
    skip?: InputMaybe<Scalars['Int']['input']>;
    first?: InputMaybe<Scalars['Int']['input']>;
    orderBy?: InputMaybe<ProposalDisputeMetadata_orderBy>;
    orderDirection?: InputMaybe<OrderDirection>;
    where?: InputMaybe<ProposalDisputeMetadata_filter>;
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type QueryproposalMetadataArgs = {
    id: Scalars['ID']['input'];
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type QueryproposalMetadata_collectionArgs = {
    skip?: InputMaybe<Scalars['Int']['input']>;
    first?: InputMaybe<Scalars['Int']['input']>;
    orderBy?: InputMaybe<ProposalMetadata_orderBy>;
    orderDirection?: InputMaybe<OrderDirection>;
    where?: InputMaybe<ProposalMetadata_filter>;
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type QuerycollateralVaultArgs = {
    id: Scalars['ID']['input'];
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type QuerycollateralVaultsArgs = {
    skip?: InputMaybe<Scalars['Int']['input']>;
    first?: InputMaybe<Scalars['Int']['input']>;
    orderBy?: InputMaybe<CollateralVault_orderBy>;
    orderDirection?: InputMaybe<OrderDirection>;
    where?: InputMaybe<CollateralVault_filter>;
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type QuerycollateralVaultDepositArgs = {
    id: Scalars['ID']['input'];
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type QuerycollateralVaultDepositsArgs = {
    skip?: InputMaybe<Scalars['Int']['input']>;
    first?: InputMaybe<Scalars['Int']['input']>;
    orderBy?: InputMaybe<CollateralVaultDeposit_orderBy>;
    orderDirection?: InputMaybe<OrderDirection>;
    where?: InputMaybe<CollateralVaultDeposit_filter>;
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type Query_metaArgs = {
    block?: InputMaybe<Block_height>;
};
export type RegistryCommunity = {
    id: Scalars['ID']['output'];
    chainId: Scalars['BigInt']['output'];
    strategyTemplate: Scalars['String']['output'];
    profileId?: Maybe<Scalars['String']['output']>;
    communityFee: Scalars['BigInt']['output'];
    protocolFee: Scalars['BigInt']['output'];
    protocolFeeReceiver?: Maybe<Scalars['String']['output']>;
    communityName?: Maybe<Scalars['String']['output']>;
    covenantIpfsHash?: Maybe<Scalars['String']['output']>;
    registryFactory?: Maybe<RegistryFactory>;
    strategies?: Maybe<Array<CVStrategy>>;
    councilSafe?: Maybe<Scalars['String']['output']>;
    pendingNewCouncilSafe?: Maybe<Scalars['String']['output']>;
    isKickEnabled?: Maybe<Scalars['Boolean']['output']>;
    registerStakeAmount?: Maybe<Scalars['BigInt']['output']>;
    registerToken?: Maybe<Scalars['String']['output']>;
    alloAddress?: Maybe<Scalars['String']['output']>;
    membersCount?: Maybe<Scalars['BigInt']['output']>;
    members?: Maybe<Array<MemberCommunity>>;
    garden: TokenGarden;
    isValid: Scalars['Boolean']['output'];
};
export type RegistryCommunitystrategiesArgs = {
    skip?: InputMaybe<Scalars['Int']['input']>;
    first?: InputMaybe<Scalars['Int']['input']>;
    orderBy?: InputMaybe<CVStrategy_orderBy>;
    orderDirection?: InputMaybe<OrderDirection>;
    where?: InputMaybe<CVStrategy_filter>;
};
export type RegistryCommunitymembersArgs = {
    skip?: InputMaybe<Scalars['Int']['input']>;
    first?: InputMaybe<Scalars['Int']['input']>;
    orderBy?: InputMaybe<MemberCommunity_orderBy>;
    orderDirection?: InputMaybe<OrderDirection>;
    where?: InputMaybe<MemberCommunity_filter>;
};
export type RegistryCommunity_filter = {
    id?: InputMaybe<Scalars['ID']['input']>;
    id_not?: InputMaybe<Scalars['ID']['input']>;
    id_gt?: InputMaybe<Scalars['ID']['input']>;
    id_lt?: InputMaybe<Scalars['ID']['input']>;
    id_gte?: InputMaybe<Scalars['ID']['input']>;
    id_lte?: InputMaybe<Scalars['ID']['input']>;
    id_in?: InputMaybe<Array<Scalars['ID']['input']>>;
    id_not_in?: InputMaybe<Array<Scalars['ID']['input']>>;
    chainId?: InputMaybe<Scalars['BigInt']['input']>;
    chainId_not?: InputMaybe<Scalars['BigInt']['input']>;
    chainId_gt?: InputMaybe<Scalars['BigInt']['input']>;
    chainId_lt?: InputMaybe<Scalars['BigInt']['input']>;
    chainId_gte?: InputMaybe<Scalars['BigInt']['input']>;
    chainId_lte?: InputMaybe<Scalars['BigInt']['input']>;
    chainId_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    chainId_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    strategyTemplate?: InputMaybe<Scalars['String']['input']>;
    strategyTemplate_not?: InputMaybe<Scalars['String']['input']>;
    strategyTemplate_gt?: InputMaybe<Scalars['String']['input']>;
    strategyTemplate_lt?: InputMaybe<Scalars['String']['input']>;
    strategyTemplate_gte?: InputMaybe<Scalars['String']['input']>;
    strategyTemplate_lte?: InputMaybe<Scalars['String']['input']>;
    strategyTemplate_in?: InputMaybe<Array<Scalars['String']['input']>>;
    strategyTemplate_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
    strategyTemplate_contains?: InputMaybe<Scalars['String']['input']>;
    strategyTemplate_contains_nocase?: InputMaybe<Scalars['String']['input']>;
    strategyTemplate_not_contains?: InputMaybe<Scalars['String']['input']>;
    strategyTemplate_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
    strategyTemplate_starts_with?: InputMaybe<Scalars['String']['input']>;
    strategyTemplate_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
    strategyTemplate_not_starts_with?: InputMaybe<Scalars['String']['input']>;
    strategyTemplate_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
    strategyTemplate_ends_with?: InputMaybe<Scalars['String']['input']>;
    strategyTemplate_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
    strategyTemplate_not_ends_with?: InputMaybe<Scalars['String']['input']>;
    strategyTemplate_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
    profileId?: InputMaybe<Scalars['String']['input']>;
    profileId_not?: InputMaybe<Scalars['String']['input']>;
    profileId_gt?: InputMaybe<Scalars['String']['input']>;
    profileId_lt?: InputMaybe<Scalars['String']['input']>;
    profileId_gte?: InputMaybe<Scalars['String']['input']>;
    profileId_lte?: InputMaybe<Scalars['String']['input']>;
    profileId_in?: InputMaybe<Array<Scalars['String']['input']>>;
    profileId_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
    profileId_contains?: InputMaybe<Scalars['String']['input']>;
    profileId_contains_nocase?: InputMaybe<Scalars['String']['input']>;
    profileId_not_contains?: InputMaybe<Scalars['String']['input']>;
    profileId_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
    profileId_starts_with?: InputMaybe<Scalars['String']['input']>;
    profileId_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
    profileId_not_starts_with?: InputMaybe<Scalars['String']['input']>;
    profileId_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
    profileId_ends_with?: InputMaybe<Scalars['String']['input']>;
    profileId_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
    profileId_not_ends_with?: InputMaybe<Scalars['String']['input']>;
    profileId_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
    communityFee?: InputMaybe<Scalars['BigInt']['input']>;
    communityFee_not?: InputMaybe<Scalars['BigInt']['input']>;
    communityFee_gt?: InputMaybe<Scalars['BigInt']['input']>;
    communityFee_lt?: InputMaybe<Scalars['BigInt']['input']>;
    communityFee_gte?: InputMaybe<Scalars['BigInt']['input']>;
    communityFee_lte?: InputMaybe<Scalars['BigInt']['input']>;
    communityFee_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    communityFee_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    protocolFee?: InputMaybe<Scalars['BigInt']['input']>;
    protocolFee_not?: InputMaybe<Scalars['BigInt']['input']>;
    protocolFee_gt?: InputMaybe<Scalars['BigInt']['input']>;
    protocolFee_lt?: InputMaybe<Scalars['BigInt']['input']>;
    protocolFee_gte?: InputMaybe<Scalars['BigInt']['input']>;
    protocolFee_lte?: InputMaybe<Scalars['BigInt']['input']>;
    protocolFee_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    protocolFee_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    protocolFeeReceiver?: InputMaybe<Scalars['String']['input']>;
    protocolFeeReceiver_not?: InputMaybe<Scalars['String']['input']>;
    protocolFeeReceiver_gt?: InputMaybe<Scalars['String']['input']>;
    protocolFeeReceiver_lt?: InputMaybe<Scalars['String']['input']>;
    protocolFeeReceiver_gte?: InputMaybe<Scalars['String']['input']>;
    protocolFeeReceiver_lte?: InputMaybe<Scalars['String']['input']>;
    protocolFeeReceiver_in?: InputMaybe<Array<Scalars['String']['input']>>;
    protocolFeeReceiver_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
    protocolFeeReceiver_contains?: InputMaybe<Scalars['String']['input']>;
    protocolFeeReceiver_contains_nocase?: InputMaybe<Scalars['String']['input']>;
    protocolFeeReceiver_not_contains?: InputMaybe<Scalars['String']['input']>;
    protocolFeeReceiver_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
    protocolFeeReceiver_starts_with?: InputMaybe<Scalars['String']['input']>;
    protocolFeeReceiver_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
    protocolFeeReceiver_not_starts_with?: InputMaybe<Scalars['String']['input']>;
    protocolFeeReceiver_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
    protocolFeeReceiver_ends_with?: InputMaybe<Scalars['String']['input']>;
    protocolFeeReceiver_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
    protocolFeeReceiver_not_ends_with?: InputMaybe<Scalars['String']['input']>;
    protocolFeeReceiver_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
    communityName?: InputMaybe<Scalars['String']['input']>;
    communityName_not?: InputMaybe<Scalars['String']['input']>;
    communityName_gt?: InputMaybe<Scalars['String']['input']>;
    communityName_lt?: InputMaybe<Scalars['String']['input']>;
    communityName_gte?: InputMaybe<Scalars['String']['input']>;
    communityName_lte?: InputMaybe<Scalars['String']['input']>;
    communityName_in?: InputMaybe<Array<Scalars['String']['input']>>;
    communityName_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
    communityName_contains?: InputMaybe<Scalars['String']['input']>;
    communityName_contains_nocase?: InputMaybe<Scalars['String']['input']>;
    communityName_not_contains?: InputMaybe<Scalars['String']['input']>;
    communityName_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
    communityName_starts_with?: InputMaybe<Scalars['String']['input']>;
    communityName_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
    communityName_not_starts_with?: InputMaybe<Scalars['String']['input']>;
    communityName_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
    communityName_ends_with?: InputMaybe<Scalars['String']['input']>;
    communityName_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
    communityName_not_ends_with?: InputMaybe<Scalars['String']['input']>;
    communityName_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
    covenantIpfsHash?: InputMaybe<Scalars['String']['input']>;
    covenantIpfsHash_not?: InputMaybe<Scalars['String']['input']>;
    covenantIpfsHash_gt?: InputMaybe<Scalars['String']['input']>;
    covenantIpfsHash_lt?: InputMaybe<Scalars['String']['input']>;
    covenantIpfsHash_gte?: InputMaybe<Scalars['String']['input']>;
    covenantIpfsHash_lte?: InputMaybe<Scalars['String']['input']>;
    covenantIpfsHash_in?: InputMaybe<Array<Scalars['String']['input']>>;
    covenantIpfsHash_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
    covenantIpfsHash_contains?: InputMaybe<Scalars['String']['input']>;
    covenantIpfsHash_contains_nocase?: InputMaybe<Scalars['String']['input']>;
    covenantIpfsHash_not_contains?: InputMaybe<Scalars['String']['input']>;
    covenantIpfsHash_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
    covenantIpfsHash_starts_with?: InputMaybe<Scalars['String']['input']>;
    covenantIpfsHash_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
    covenantIpfsHash_not_starts_with?: InputMaybe<Scalars['String']['input']>;
    covenantIpfsHash_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
    covenantIpfsHash_ends_with?: InputMaybe<Scalars['String']['input']>;
    covenantIpfsHash_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
    covenantIpfsHash_not_ends_with?: InputMaybe<Scalars['String']['input']>;
    covenantIpfsHash_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
    registryFactory?: InputMaybe<Scalars['String']['input']>;
    registryFactory_not?: InputMaybe<Scalars['String']['input']>;
    registryFactory_gt?: InputMaybe<Scalars['String']['input']>;
    registryFactory_lt?: InputMaybe<Scalars['String']['input']>;
    registryFactory_gte?: InputMaybe<Scalars['String']['input']>;
    registryFactory_lte?: InputMaybe<Scalars['String']['input']>;
    registryFactory_in?: InputMaybe<Array<Scalars['String']['input']>>;
    registryFactory_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
    registryFactory_contains?: InputMaybe<Scalars['String']['input']>;
    registryFactory_contains_nocase?: InputMaybe<Scalars['String']['input']>;
    registryFactory_not_contains?: InputMaybe<Scalars['String']['input']>;
    registryFactory_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
    registryFactory_starts_with?: InputMaybe<Scalars['String']['input']>;
    registryFactory_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
    registryFactory_not_starts_with?: InputMaybe<Scalars['String']['input']>;
    registryFactory_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
    registryFactory_ends_with?: InputMaybe<Scalars['String']['input']>;
    registryFactory_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
    registryFactory_not_ends_with?: InputMaybe<Scalars['String']['input']>;
    registryFactory_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
    registryFactory_?: InputMaybe<RegistryFactory_filter>;
    strategies_?: InputMaybe<CVStrategy_filter>;
    councilSafe?: InputMaybe<Scalars['String']['input']>;
    councilSafe_not?: InputMaybe<Scalars['String']['input']>;
    councilSafe_gt?: InputMaybe<Scalars['String']['input']>;
    councilSafe_lt?: InputMaybe<Scalars['String']['input']>;
    councilSafe_gte?: InputMaybe<Scalars['String']['input']>;
    councilSafe_lte?: InputMaybe<Scalars['String']['input']>;
    councilSafe_in?: InputMaybe<Array<Scalars['String']['input']>>;
    councilSafe_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
    councilSafe_contains?: InputMaybe<Scalars['String']['input']>;
    councilSafe_contains_nocase?: InputMaybe<Scalars['String']['input']>;
    councilSafe_not_contains?: InputMaybe<Scalars['String']['input']>;
    councilSafe_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
    councilSafe_starts_with?: InputMaybe<Scalars['String']['input']>;
    councilSafe_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
    councilSafe_not_starts_with?: InputMaybe<Scalars['String']['input']>;
    councilSafe_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
    councilSafe_ends_with?: InputMaybe<Scalars['String']['input']>;
    councilSafe_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
    councilSafe_not_ends_with?: InputMaybe<Scalars['String']['input']>;
    councilSafe_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
    pendingNewCouncilSafe?: InputMaybe<Scalars['String']['input']>;
    pendingNewCouncilSafe_not?: InputMaybe<Scalars['String']['input']>;
    pendingNewCouncilSafe_gt?: InputMaybe<Scalars['String']['input']>;
    pendingNewCouncilSafe_lt?: InputMaybe<Scalars['String']['input']>;
    pendingNewCouncilSafe_gte?: InputMaybe<Scalars['String']['input']>;
    pendingNewCouncilSafe_lte?: InputMaybe<Scalars['String']['input']>;
    pendingNewCouncilSafe_in?: InputMaybe<Array<Scalars['String']['input']>>;
    pendingNewCouncilSafe_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
    pendingNewCouncilSafe_contains?: InputMaybe<Scalars['String']['input']>;
    pendingNewCouncilSafe_contains_nocase?: InputMaybe<Scalars['String']['input']>;
    pendingNewCouncilSafe_not_contains?: InputMaybe<Scalars['String']['input']>;
    pendingNewCouncilSafe_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
    pendingNewCouncilSafe_starts_with?: InputMaybe<Scalars['String']['input']>;
    pendingNewCouncilSafe_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
    pendingNewCouncilSafe_not_starts_with?: InputMaybe<Scalars['String']['input']>;
    pendingNewCouncilSafe_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
    pendingNewCouncilSafe_ends_with?: InputMaybe<Scalars['String']['input']>;
    pendingNewCouncilSafe_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
    pendingNewCouncilSafe_not_ends_with?: InputMaybe<Scalars['String']['input']>;
    pendingNewCouncilSafe_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
    isKickEnabled?: InputMaybe<Scalars['Boolean']['input']>;
    isKickEnabled_not?: InputMaybe<Scalars['Boolean']['input']>;
    isKickEnabled_in?: InputMaybe<Array<Scalars['Boolean']['input']>>;
    isKickEnabled_not_in?: InputMaybe<Array<Scalars['Boolean']['input']>>;
    registerStakeAmount?: InputMaybe<Scalars['BigInt']['input']>;
    registerStakeAmount_not?: InputMaybe<Scalars['BigInt']['input']>;
    registerStakeAmount_gt?: InputMaybe<Scalars['BigInt']['input']>;
    registerStakeAmount_lt?: InputMaybe<Scalars['BigInt']['input']>;
    registerStakeAmount_gte?: InputMaybe<Scalars['BigInt']['input']>;
    registerStakeAmount_lte?: InputMaybe<Scalars['BigInt']['input']>;
    registerStakeAmount_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    registerStakeAmount_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    registerToken?: InputMaybe<Scalars['String']['input']>;
    registerToken_not?: InputMaybe<Scalars['String']['input']>;
    registerToken_gt?: InputMaybe<Scalars['String']['input']>;
    registerToken_lt?: InputMaybe<Scalars['String']['input']>;
    registerToken_gte?: InputMaybe<Scalars['String']['input']>;
    registerToken_lte?: InputMaybe<Scalars['String']['input']>;
    registerToken_in?: InputMaybe<Array<Scalars['String']['input']>>;
    registerToken_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
    registerToken_contains?: InputMaybe<Scalars['String']['input']>;
    registerToken_contains_nocase?: InputMaybe<Scalars['String']['input']>;
    registerToken_not_contains?: InputMaybe<Scalars['String']['input']>;
    registerToken_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
    registerToken_starts_with?: InputMaybe<Scalars['String']['input']>;
    registerToken_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
    registerToken_not_starts_with?: InputMaybe<Scalars['String']['input']>;
    registerToken_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
    registerToken_ends_with?: InputMaybe<Scalars['String']['input']>;
    registerToken_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
    registerToken_not_ends_with?: InputMaybe<Scalars['String']['input']>;
    registerToken_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
    alloAddress?: InputMaybe<Scalars['String']['input']>;
    alloAddress_not?: InputMaybe<Scalars['String']['input']>;
    alloAddress_gt?: InputMaybe<Scalars['String']['input']>;
    alloAddress_lt?: InputMaybe<Scalars['String']['input']>;
    alloAddress_gte?: InputMaybe<Scalars['String']['input']>;
    alloAddress_lte?: InputMaybe<Scalars['String']['input']>;
    alloAddress_in?: InputMaybe<Array<Scalars['String']['input']>>;
    alloAddress_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
    alloAddress_contains?: InputMaybe<Scalars['String']['input']>;
    alloAddress_contains_nocase?: InputMaybe<Scalars['String']['input']>;
    alloAddress_not_contains?: InputMaybe<Scalars['String']['input']>;
    alloAddress_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
    alloAddress_starts_with?: InputMaybe<Scalars['String']['input']>;
    alloAddress_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
    alloAddress_not_starts_with?: InputMaybe<Scalars['String']['input']>;
    alloAddress_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
    alloAddress_ends_with?: InputMaybe<Scalars['String']['input']>;
    alloAddress_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
    alloAddress_not_ends_with?: InputMaybe<Scalars['String']['input']>;
    alloAddress_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
    membersCount?: InputMaybe<Scalars['BigInt']['input']>;
    membersCount_not?: InputMaybe<Scalars['BigInt']['input']>;
    membersCount_gt?: InputMaybe<Scalars['BigInt']['input']>;
    membersCount_lt?: InputMaybe<Scalars['BigInt']['input']>;
    membersCount_gte?: InputMaybe<Scalars['BigInt']['input']>;
    membersCount_lte?: InputMaybe<Scalars['BigInt']['input']>;
    membersCount_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    membersCount_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    members_?: InputMaybe<MemberCommunity_filter>;
    garden?: InputMaybe<Scalars['String']['input']>;
    garden_not?: InputMaybe<Scalars['String']['input']>;
    garden_gt?: InputMaybe<Scalars['String']['input']>;
    garden_lt?: InputMaybe<Scalars['String']['input']>;
    garden_gte?: InputMaybe<Scalars['String']['input']>;
    garden_lte?: InputMaybe<Scalars['String']['input']>;
    garden_in?: InputMaybe<Array<Scalars['String']['input']>>;
    garden_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
    garden_contains?: InputMaybe<Scalars['String']['input']>;
    garden_contains_nocase?: InputMaybe<Scalars['String']['input']>;
    garden_not_contains?: InputMaybe<Scalars['String']['input']>;
    garden_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
    garden_starts_with?: InputMaybe<Scalars['String']['input']>;
    garden_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
    garden_not_starts_with?: InputMaybe<Scalars['String']['input']>;
    garden_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
    garden_ends_with?: InputMaybe<Scalars['String']['input']>;
    garden_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
    garden_not_ends_with?: InputMaybe<Scalars['String']['input']>;
    garden_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
    garden_?: InputMaybe<TokenGarden_filter>;
    isValid?: InputMaybe<Scalars['Boolean']['input']>;
    isValid_not?: InputMaybe<Scalars['Boolean']['input']>;
    isValid_in?: InputMaybe<Array<Scalars['Boolean']['input']>>;
    isValid_not_in?: InputMaybe<Array<Scalars['Boolean']['input']>>;
    /** Filter for the block changed event. */
    _change_block?: InputMaybe<BlockChangedFilter>;
    and?: InputMaybe<Array<InputMaybe<RegistryCommunity_filter>>>;
    or?: InputMaybe<Array<InputMaybe<RegistryCommunity_filter>>>;
};
export type RegistryCommunity_orderBy = 'id' | 'chainId' | 'strategyTemplate' | 'profileId' | 'communityFee' | 'protocolFee' | 'protocolFeeReceiver' | 'communityName' | 'covenantIpfsHash' | 'registryFactory' | 'registryFactory__id' | 'registryFactory__chainId' | 'strategies' | 'councilSafe' | 'pendingNewCouncilSafe' | 'isKickEnabled' | 'registerStakeAmount' | 'registerToken' | 'alloAddress' | 'membersCount' | 'members' | 'garden' | 'garden__id' | 'garden__name' | 'garden__description' | 'garden__chainId' | 'garden__totalBalance' | 'garden__ipfsCovenant' | 'garden__symbol' | 'garden__decimals' | 'garden__address' | 'isValid';
export type RegistryFactory = {
    id: Scalars['ID']['output'];
    chainId: Scalars['BigInt']['output'];
    registryCommunities?: Maybe<Array<RegistryCommunity>>;
};
export type RegistryFactoryregistryCommunitiesArgs = {
    skip?: InputMaybe<Scalars['Int']['input']>;
    first?: InputMaybe<Scalars['Int']['input']>;
    orderBy?: InputMaybe<RegistryCommunity_orderBy>;
    orderDirection?: InputMaybe<OrderDirection>;
    where?: InputMaybe<RegistryCommunity_filter>;
};
export type RegistryFactory_filter = {
    id?: InputMaybe<Scalars['ID']['input']>;
    id_not?: InputMaybe<Scalars['ID']['input']>;
    id_gt?: InputMaybe<Scalars['ID']['input']>;
    id_lt?: InputMaybe<Scalars['ID']['input']>;
    id_gte?: InputMaybe<Scalars['ID']['input']>;
    id_lte?: InputMaybe<Scalars['ID']['input']>;
    id_in?: InputMaybe<Array<Scalars['ID']['input']>>;
    id_not_in?: InputMaybe<Array<Scalars['ID']['input']>>;
    chainId?: InputMaybe<Scalars['BigInt']['input']>;
    chainId_not?: InputMaybe<Scalars['BigInt']['input']>;
    chainId_gt?: InputMaybe<Scalars['BigInt']['input']>;
    chainId_lt?: InputMaybe<Scalars['BigInt']['input']>;
    chainId_gte?: InputMaybe<Scalars['BigInt']['input']>;
    chainId_lte?: InputMaybe<Scalars['BigInt']['input']>;
    chainId_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    chainId_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    registryCommunities_?: InputMaybe<RegistryCommunity_filter>;
    /** Filter for the block changed event. */
    _change_block?: InputMaybe<BlockChangedFilter>;
    and?: InputMaybe<Array<InputMaybe<RegistryFactory_filter>>>;
    or?: InputMaybe<Array<InputMaybe<RegistryFactory_filter>>>;
};
export type RegistryFactory_orderBy = 'id' | 'chainId' | 'registryCommunities';
export type Stake = {
    id: Scalars['ID']['output'];
    member: Member;
    poolId: Scalars['BigInt']['output'];
    proposal: CVProposal;
    amount: Scalars['BigInt']['output'];
    createdAt: Scalars['BigInt']['output'];
};
export type Stake_filter = {
    id?: InputMaybe<Scalars['ID']['input']>;
    id_not?: InputMaybe<Scalars['ID']['input']>;
    id_gt?: InputMaybe<Scalars['ID']['input']>;
    id_lt?: InputMaybe<Scalars['ID']['input']>;
    id_gte?: InputMaybe<Scalars['ID']['input']>;
    id_lte?: InputMaybe<Scalars['ID']['input']>;
    id_in?: InputMaybe<Array<Scalars['ID']['input']>>;
    id_not_in?: InputMaybe<Array<Scalars['ID']['input']>>;
    member?: InputMaybe<Scalars['String']['input']>;
    member_not?: InputMaybe<Scalars['String']['input']>;
    member_gt?: InputMaybe<Scalars['String']['input']>;
    member_lt?: InputMaybe<Scalars['String']['input']>;
    member_gte?: InputMaybe<Scalars['String']['input']>;
    member_lte?: InputMaybe<Scalars['String']['input']>;
    member_in?: InputMaybe<Array<Scalars['String']['input']>>;
    member_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
    member_contains?: InputMaybe<Scalars['String']['input']>;
    member_contains_nocase?: InputMaybe<Scalars['String']['input']>;
    member_not_contains?: InputMaybe<Scalars['String']['input']>;
    member_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
    member_starts_with?: InputMaybe<Scalars['String']['input']>;
    member_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
    member_not_starts_with?: InputMaybe<Scalars['String']['input']>;
    member_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
    member_ends_with?: InputMaybe<Scalars['String']['input']>;
    member_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
    member_not_ends_with?: InputMaybe<Scalars['String']['input']>;
    member_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
    member_?: InputMaybe<Member_filter>;
    poolId?: InputMaybe<Scalars['BigInt']['input']>;
    poolId_not?: InputMaybe<Scalars['BigInt']['input']>;
    poolId_gt?: InputMaybe<Scalars['BigInt']['input']>;
    poolId_lt?: InputMaybe<Scalars['BigInt']['input']>;
    poolId_gte?: InputMaybe<Scalars['BigInt']['input']>;
    poolId_lte?: InputMaybe<Scalars['BigInt']['input']>;
    poolId_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    poolId_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    proposal?: InputMaybe<Scalars['String']['input']>;
    proposal_not?: InputMaybe<Scalars['String']['input']>;
    proposal_gt?: InputMaybe<Scalars['String']['input']>;
    proposal_lt?: InputMaybe<Scalars['String']['input']>;
    proposal_gte?: InputMaybe<Scalars['String']['input']>;
    proposal_lte?: InputMaybe<Scalars['String']['input']>;
    proposal_in?: InputMaybe<Array<Scalars['String']['input']>>;
    proposal_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
    proposal_contains?: InputMaybe<Scalars['String']['input']>;
    proposal_contains_nocase?: InputMaybe<Scalars['String']['input']>;
    proposal_not_contains?: InputMaybe<Scalars['String']['input']>;
    proposal_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
    proposal_starts_with?: InputMaybe<Scalars['String']['input']>;
    proposal_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
    proposal_not_starts_with?: InputMaybe<Scalars['String']['input']>;
    proposal_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
    proposal_ends_with?: InputMaybe<Scalars['String']['input']>;
    proposal_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
    proposal_not_ends_with?: InputMaybe<Scalars['String']['input']>;
    proposal_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
    proposal_?: InputMaybe<CVProposal_filter>;
    amount?: InputMaybe<Scalars['BigInt']['input']>;
    amount_not?: InputMaybe<Scalars['BigInt']['input']>;
    amount_gt?: InputMaybe<Scalars['BigInt']['input']>;
    amount_lt?: InputMaybe<Scalars['BigInt']['input']>;
    amount_gte?: InputMaybe<Scalars['BigInt']['input']>;
    amount_lte?: InputMaybe<Scalars['BigInt']['input']>;
    amount_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    amount_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    createdAt?: InputMaybe<Scalars['BigInt']['input']>;
    createdAt_not?: InputMaybe<Scalars['BigInt']['input']>;
    createdAt_gt?: InputMaybe<Scalars['BigInt']['input']>;
    createdAt_lt?: InputMaybe<Scalars['BigInt']['input']>;
    createdAt_gte?: InputMaybe<Scalars['BigInt']['input']>;
    createdAt_lte?: InputMaybe<Scalars['BigInt']['input']>;
    createdAt_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    createdAt_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    /** Filter for the block changed event. */
    _change_block?: InputMaybe<BlockChangedFilter>;
    and?: InputMaybe<Array<InputMaybe<Stake_filter>>>;
    or?: InputMaybe<Array<InputMaybe<Stake_filter>>>;
};
export type Stake_orderBy = 'id' | 'member' | 'member__id' | 'poolId' | 'proposal' | 'proposal__id' | 'proposal__proposalNumber' | 'proposal__metadataHash' | 'proposal__version' | 'proposal__beneficiary' | 'proposal__requestedAmount' | 'proposal__requestedToken' | 'proposal__proposalStatus' | 'proposal__blockLast' | 'proposal__convictionLast' | 'proposal__threshold' | 'proposal__maxCVStaked' | 'proposal__stakedAmount' | 'proposal__submitter' | 'proposal__createdAt' | 'proposal__updatedAt' | 'amount' | 'createdAt';
export type Subscription = {
    cvstrategy?: Maybe<CVStrategy>;
    cvstrategies: Array<CVStrategy>;
    cvstrategyConfig?: Maybe<CVStrategyConfig>;
    cvstrategyConfigs: Array<CVStrategyConfig>;
    arbitrableConfig?: Maybe<ArbitrableConfig>;
    arbitrableConfigs: Array<ArbitrableConfig>;
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
    proposalDispute?: Maybe<ProposalDispute>;
    proposalDisputes: Array<ProposalDispute>;
    proposalDisputeMetadata?: Maybe<ProposalDisputeMetadata>;
    proposalDisputeMetadata_collection: Array<ProposalDisputeMetadata>;
    proposalMetadata?: Maybe<ProposalMetadata>;
    proposalMetadata_collection: Array<ProposalMetadata>;
    collateralVault?: Maybe<CollateralVault>;
    collateralVaults: Array<CollateralVault>;
    collateralVaultDeposit?: Maybe<CollateralVaultDeposit>;
    collateralVaultDeposits: Array<CollateralVaultDeposit>;
    /** Access to subgraph metadata */
    _meta?: Maybe<_Meta_>;
};
export type SubscriptioncvstrategyArgs = {
    id: Scalars['ID']['input'];
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type SubscriptioncvstrategiesArgs = {
    skip?: InputMaybe<Scalars['Int']['input']>;
    first?: InputMaybe<Scalars['Int']['input']>;
    orderBy?: InputMaybe<CVStrategy_orderBy>;
    orderDirection?: InputMaybe<OrderDirection>;
    where?: InputMaybe<CVStrategy_filter>;
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type SubscriptioncvstrategyConfigArgs = {
    id: Scalars['ID']['input'];
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type SubscriptioncvstrategyConfigsArgs = {
    skip?: InputMaybe<Scalars['Int']['input']>;
    first?: InputMaybe<Scalars['Int']['input']>;
    orderBy?: InputMaybe<CVStrategyConfig_orderBy>;
    orderDirection?: InputMaybe<OrderDirection>;
    where?: InputMaybe<CVStrategyConfig_filter>;
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type SubscriptionarbitrableConfigArgs = {
    id: Scalars['ID']['input'];
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type SubscriptionarbitrableConfigsArgs = {
    skip?: InputMaybe<Scalars['Int']['input']>;
    first?: InputMaybe<Scalars['Int']['input']>;
    orderBy?: InputMaybe<ArbitrableConfig_orderBy>;
    orderDirection?: InputMaybe<OrderDirection>;
    where?: InputMaybe<ArbitrableConfig_filter>;
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type SubscriptioncvproposalArgs = {
    id: Scalars['ID']['input'];
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type SubscriptioncvproposalsArgs = {
    skip?: InputMaybe<Scalars['Int']['input']>;
    first?: InputMaybe<Scalars['Int']['input']>;
    orderBy?: InputMaybe<CVProposal_orderBy>;
    orderDirection?: InputMaybe<OrderDirection>;
    where?: InputMaybe<CVProposal_filter>;
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type SubscriptionregistryFactoryArgs = {
    id: Scalars['ID']['input'];
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type SubscriptionregistryFactoriesArgs = {
    skip?: InputMaybe<Scalars['Int']['input']>;
    first?: InputMaybe<Scalars['Int']['input']>;
    orderBy?: InputMaybe<RegistryFactory_orderBy>;
    orderDirection?: InputMaybe<OrderDirection>;
    where?: InputMaybe<RegistryFactory_filter>;
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type SubscriptionregistryCommunityArgs = {
    id: Scalars['ID']['input'];
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type SubscriptionregistryCommunitiesArgs = {
    skip?: InputMaybe<Scalars['Int']['input']>;
    first?: InputMaybe<Scalars['Int']['input']>;
    orderBy?: InputMaybe<RegistryCommunity_orderBy>;
    orderDirection?: InputMaybe<OrderDirection>;
    where?: InputMaybe<RegistryCommunity_filter>;
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type SubscriptionmemberArgs = {
    id: Scalars['ID']['input'];
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type SubscriptionmembersArgs = {
    skip?: InputMaybe<Scalars['Int']['input']>;
    first?: InputMaybe<Scalars['Int']['input']>;
    orderBy?: InputMaybe<Member_orderBy>;
    orderDirection?: InputMaybe<OrderDirection>;
    where?: InputMaybe<Member_filter>;
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type SubscriptionstakeArgs = {
    id: Scalars['ID']['input'];
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type SubscriptionstakesArgs = {
    skip?: InputMaybe<Scalars['Int']['input']>;
    first?: InputMaybe<Scalars['Int']['input']>;
    orderBy?: InputMaybe<Stake_orderBy>;
    orderDirection?: InputMaybe<OrderDirection>;
    where?: InputMaybe<Stake_filter>;
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type SubscriptionmemberCommunityArgs = {
    id: Scalars['ID']['input'];
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type SubscriptionmemberCommunitiesArgs = {
    skip?: InputMaybe<Scalars['Int']['input']>;
    first?: InputMaybe<Scalars['Int']['input']>;
    orderBy?: InputMaybe<MemberCommunity_orderBy>;
    orderDirection?: InputMaybe<OrderDirection>;
    where?: InputMaybe<MemberCommunity_filter>;
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type SubscriptionmemberStrategyArgs = {
    id: Scalars['ID']['input'];
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type SubscriptionmemberStrategiesArgs = {
    skip?: InputMaybe<Scalars['Int']['input']>;
    first?: InputMaybe<Scalars['Int']['input']>;
    orderBy?: InputMaybe<MemberStrategy_orderBy>;
    orderDirection?: InputMaybe<OrderDirection>;
    where?: InputMaybe<MemberStrategy_filter>;
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type SubscriptiontokenGardenArgs = {
    id: Scalars['ID']['input'];
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type SubscriptiontokenGardensArgs = {
    skip?: InputMaybe<Scalars['Int']['input']>;
    first?: InputMaybe<Scalars['Int']['input']>;
    orderBy?: InputMaybe<TokenGarden_orderBy>;
    orderDirection?: InputMaybe<OrderDirection>;
    where?: InputMaybe<TokenGarden_filter>;
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type SubscriptionalloArgs = {
    id: Scalars['ID']['input'];
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type SubscriptionallosArgs = {
    skip?: InputMaybe<Scalars['Int']['input']>;
    first?: InputMaybe<Scalars['Int']['input']>;
    orderBy?: InputMaybe<Allo_orderBy>;
    orderDirection?: InputMaybe<OrderDirection>;
    where?: InputMaybe<Allo_filter>;
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type SubscriptionpassportScorerArgs = {
    id: Scalars['ID']['input'];
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type SubscriptionpassportScorersArgs = {
    skip?: InputMaybe<Scalars['Int']['input']>;
    first?: InputMaybe<Scalars['Int']['input']>;
    orderBy?: InputMaybe<PassportScorer_orderBy>;
    orderDirection?: InputMaybe<OrderDirection>;
    where?: InputMaybe<PassportScorer_filter>;
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type SubscriptionpassportStrategyArgs = {
    id: Scalars['ID']['input'];
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type SubscriptionpassportStrategiesArgs = {
    skip?: InputMaybe<Scalars['Int']['input']>;
    first?: InputMaybe<Scalars['Int']['input']>;
    orderBy?: InputMaybe<PassportStrategy_orderBy>;
    orderDirection?: InputMaybe<OrderDirection>;
    where?: InputMaybe<PassportStrategy_filter>;
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type SubscriptionpassportUserArgs = {
    id: Scalars['ID']['input'];
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type SubscriptionpassportUsersArgs = {
    skip?: InputMaybe<Scalars['Int']['input']>;
    first?: InputMaybe<Scalars['Int']['input']>;
    orderBy?: InputMaybe<PassportUser_orderBy>;
    orderDirection?: InputMaybe<OrderDirection>;
    where?: InputMaybe<PassportUser_filter>;
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type SubscriptionproposalDisputeArgs = {
    id: Scalars['ID']['input'];
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type SubscriptionproposalDisputesArgs = {
    skip?: InputMaybe<Scalars['Int']['input']>;
    first?: InputMaybe<Scalars['Int']['input']>;
    orderBy?: InputMaybe<ProposalDispute_orderBy>;
    orderDirection?: InputMaybe<OrderDirection>;
    where?: InputMaybe<ProposalDispute_filter>;
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type SubscriptionproposalDisputeMetadataArgs = {
    id: Scalars['ID']['input'];
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type SubscriptionproposalDisputeMetadata_collectionArgs = {
    skip?: InputMaybe<Scalars['Int']['input']>;
    first?: InputMaybe<Scalars['Int']['input']>;
    orderBy?: InputMaybe<ProposalDisputeMetadata_orderBy>;
    orderDirection?: InputMaybe<OrderDirection>;
    where?: InputMaybe<ProposalDisputeMetadata_filter>;
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type SubscriptionproposalMetadataArgs = {
    id: Scalars['ID']['input'];
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type SubscriptionproposalMetadata_collectionArgs = {
    skip?: InputMaybe<Scalars['Int']['input']>;
    first?: InputMaybe<Scalars['Int']['input']>;
    orderBy?: InputMaybe<ProposalMetadata_orderBy>;
    orderDirection?: InputMaybe<OrderDirection>;
    where?: InputMaybe<ProposalMetadata_filter>;
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type SubscriptioncollateralVaultArgs = {
    id: Scalars['ID']['input'];
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type SubscriptioncollateralVaultsArgs = {
    skip?: InputMaybe<Scalars['Int']['input']>;
    first?: InputMaybe<Scalars['Int']['input']>;
    orderBy?: InputMaybe<CollateralVault_orderBy>;
    orderDirection?: InputMaybe<OrderDirection>;
    where?: InputMaybe<CollateralVault_filter>;
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type SubscriptioncollateralVaultDepositArgs = {
    id: Scalars['ID']['input'];
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type SubscriptioncollateralVaultDepositsArgs = {
    skip?: InputMaybe<Scalars['Int']['input']>;
    first?: InputMaybe<Scalars['Int']['input']>;
    orderBy?: InputMaybe<CollateralVaultDeposit_orderBy>;
    orderDirection?: InputMaybe<OrderDirection>;
    where?: InputMaybe<CollateralVaultDeposit_filter>;
    block?: InputMaybe<Block_height>;
    subgraphError?: _SubgraphErrorPolicy_;
};
export type Subscription_metaArgs = {
    block?: InputMaybe<Block_height>;
};
export type TokenGarden = {
    id: Scalars['ID']['output'];
    name: Scalars['String']['output'];
    description?: Maybe<Scalars['String']['output']>;
    chainId: Scalars['BigInt']['output'];
    totalBalance: Scalars['BigInt']['output'];
    ipfsCovenant?: Maybe<Scalars['String']['output']>;
    symbol: Scalars['String']['output'];
    decimals: Scalars['BigInt']['output'];
    address: Scalars['String']['output'];
    communities?: Maybe<Array<RegistryCommunity>>;
};
export type TokenGardencommunitiesArgs = {
    skip?: InputMaybe<Scalars['Int']['input']>;
    first?: InputMaybe<Scalars['Int']['input']>;
    orderBy?: InputMaybe<RegistryCommunity_orderBy>;
    orderDirection?: InputMaybe<OrderDirection>;
    where?: InputMaybe<RegistryCommunity_filter>;
};
export type TokenGarden_filter = {
    id?: InputMaybe<Scalars['ID']['input']>;
    id_not?: InputMaybe<Scalars['ID']['input']>;
    id_gt?: InputMaybe<Scalars['ID']['input']>;
    id_lt?: InputMaybe<Scalars['ID']['input']>;
    id_gte?: InputMaybe<Scalars['ID']['input']>;
    id_lte?: InputMaybe<Scalars['ID']['input']>;
    id_in?: InputMaybe<Array<Scalars['ID']['input']>>;
    id_not_in?: InputMaybe<Array<Scalars['ID']['input']>>;
    name?: InputMaybe<Scalars['String']['input']>;
    name_not?: InputMaybe<Scalars['String']['input']>;
    name_gt?: InputMaybe<Scalars['String']['input']>;
    name_lt?: InputMaybe<Scalars['String']['input']>;
    name_gte?: InputMaybe<Scalars['String']['input']>;
    name_lte?: InputMaybe<Scalars['String']['input']>;
    name_in?: InputMaybe<Array<Scalars['String']['input']>>;
    name_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
    name_contains?: InputMaybe<Scalars['String']['input']>;
    name_contains_nocase?: InputMaybe<Scalars['String']['input']>;
    name_not_contains?: InputMaybe<Scalars['String']['input']>;
    name_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
    name_starts_with?: InputMaybe<Scalars['String']['input']>;
    name_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
    name_not_starts_with?: InputMaybe<Scalars['String']['input']>;
    name_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
    name_ends_with?: InputMaybe<Scalars['String']['input']>;
    name_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
    name_not_ends_with?: InputMaybe<Scalars['String']['input']>;
    name_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
    description?: InputMaybe<Scalars['String']['input']>;
    description_not?: InputMaybe<Scalars['String']['input']>;
    description_gt?: InputMaybe<Scalars['String']['input']>;
    description_lt?: InputMaybe<Scalars['String']['input']>;
    description_gte?: InputMaybe<Scalars['String']['input']>;
    description_lte?: InputMaybe<Scalars['String']['input']>;
    description_in?: InputMaybe<Array<Scalars['String']['input']>>;
    description_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
    description_contains?: InputMaybe<Scalars['String']['input']>;
    description_contains_nocase?: InputMaybe<Scalars['String']['input']>;
    description_not_contains?: InputMaybe<Scalars['String']['input']>;
    description_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
    description_starts_with?: InputMaybe<Scalars['String']['input']>;
    description_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
    description_not_starts_with?: InputMaybe<Scalars['String']['input']>;
    description_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
    description_ends_with?: InputMaybe<Scalars['String']['input']>;
    description_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
    description_not_ends_with?: InputMaybe<Scalars['String']['input']>;
    description_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
    chainId?: InputMaybe<Scalars['BigInt']['input']>;
    chainId_not?: InputMaybe<Scalars['BigInt']['input']>;
    chainId_gt?: InputMaybe<Scalars['BigInt']['input']>;
    chainId_lt?: InputMaybe<Scalars['BigInt']['input']>;
    chainId_gte?: InputMaybe<Scalars['BigInt']['input']>;
    chainId_lte?: InputMaybe<Scalars['BigInt']['input']>;
    chainId_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    chainId_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    totalBalance?: InputMaybe<Scalars['BigInt']['input']>;
    totalBalance_not?: InputMaybe<Scalars['BigInt']['input']>;
    totalBalance_gt?: InputMaybe<Scalars['BigInt']['input']>;
    totalBalance_lt?: InputMaybe<Scalars['BigInt']['input']>;
    totalBalance_gte?: InputMaybe<Scalars['BigInt']['input']>;
    totalBalance_lte?: InputMaybe<Scalars['BigInt']['input']>;
    totalBalance_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    totalBalance_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    ipfsCovenant?: InputMaybe<Scalars['String']['input']>;
    ipfsCovenant_not?: InputMaybe<Scalars['String']['input']>;
    ipfsCovenant_gt?: InputMaybe<Scalars['String']['input']>;
    ipfsCovenant_lt?: InputMaybe<Scalars['String']['input']>;
    ipfsCovenant_gte?: InputMaybe<Scalars['String']['input']>;
    ipfsCovenant_lte?: InputMaybe<Scalars['String']['input']>;
    ipfsCovenant_in?: InputMaybe<Array<Scalars['String']['input']>>;
    ipfsCovenant_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
    ipfsCovenant_contains?: InputMaybe<Scalars['String']['input']>;
    ipfsCovenant_contains_nocase?: InputMaybe<Scalars['String']['input']>;
    ipfsCovenant_not_contains?: InputMaybe<Scalars['String']['input']>;
    ipfsCovenant_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
    ipfsCovenant_starts_with?: InputMaybe<Scalars['String']['input']>;
    ipfsCovenant_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
    ipfsCovenant_not_starts_with?: InputMaybe<Scalars['String']['input']>;
    ipfsCovenant_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
    ipfsCovenant_ends_with?: InputMaybe<Scalars['String']['input']>;
    ipfsCovenant_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
    ipfsCovenant_not_ends_with?: InputMaybe<Scalars['String']['input']>;
    ipfsCovenant_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
    symbol?: InputMaybe<Scalars['String']['input']>;
    symbol_not?: InputMaybe<Scalars['String']['input']>;
    symbol_gt?: InputMaybe<Scalars['String']['input']>;
    symbol_lt?: InputMaybe<Scalars['String']['input']>;
    symbol_gte?: InputMaybe<Scalars['String']['input']>;
    symbol_lte?: InputMaybe<Scalars['String']['input']>;
    symbol_in?: InputMaybe<Array<Scalars['String']['input']>>;
    symbol_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
    symbol_contains?: InputMaybe<Scalars['String']['input']>;
    symbol_contains_nocase?: InputMaybe<Scalars['String']['input']>;
    symbol_not_contains?: InputMaybe<Scalars['String']['input']>;
    symbol_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
    symbol_starts_with?: InputMaybe<Scalars['String']['input']>;
    symbol_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
    symbol_not_starts_with?: InputMaybe<Scalars['String']['input']>;
    symbol_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
    symbol_ends_with?: InputMaybe<Scalars['String']['input']>;
    symbol_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
    symbol_not_ends_with?: InputMaybe<Scalars['String']['input']>;
    symbol_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
    decimals?: InputMaybe<Scalars['BigInt']['input']>;
    decimals_not?: InputMaybe<Scalars['BigInt']['input']>;
    decimals_gt?: InputMaybe<Scalars['BigInt']['input']>;
    decimals_lt?: InputMaybe<Scalars['BigInt']['input']>;
    decimals_gte?: InputMaybe<Scalars['BigInt']['input']>;
    decimals_lte?: InputMaybe<Scalars['BigInt']['input']>;
    decimals_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    decimals_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
    address?: InputMaybe<Scalars['String']['input']>;
    address_not?: InputMaybe<Scalars['String']['input']>;
    address_gt?: InputMaybe<Scalars['String']['input']>;
    address_lt?: InputMaybe<Scalars['String']['input']>;
    address_gte?: InputMaybe<Scalars['String']['input']>;
    address_lte?: InputMaybe<Scalars['String']['input']>;
    address_in?: InputMaybe<Array<Scalars['String']['input']>>;
    address_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
    address_contains?: InputMaybe<Scalars['String']['input']>;
    address_contains_nocase?: InputMaybe<Scalars['String']['input']>;
    address_not_contains?: InputMaybe<Scalars['String']['input']>;
    address_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
    address_starts_with?: InputMaybe<Scalars['String']['input']>;
    address_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
    address_not_starts_with?: InputMaybe<Scalars['String']['input']>;
    address_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
    address_ends_with?: InputMaybe<Scalars['String']['input']>;
    address_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
    address_not_ends_with?: InputMaybe<Scalars['String']['input']>;
    address_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
    communities_?: InputMaybe<RegistryCommunity_filter>;
    /** Filter for the block changed event. */
    _change_block?: InputMaybe<BlockChangedFilter>;
    and?: InputMaybe<Array<InputMaybe<TokenGarden_filter>>>;
    or?: InputMaybe<Array<InputMaybe<TokenGarden_filter>>>;
};
export type TokenGarden_orderBy = 'id' | 'name' | 'description' | 'chainId' | 'totalBalance' | 'ipfsCovenant' | 'symbol' | 'decimals' | 'address' | 'communities';
export type _Block_ = {
    /** The hash of the block */
    hash?: Maybe<Scalars['Bytes']['output']>;
    /** The block number */
    number: Scalars['Int']['output'];
    /** Integer representation of the timestamp stored in blocks for the chain */
    timestamp?: Maybe<Scalars['Int']['output']>;
    /** The hash of the parent block */
    parentHash?: Maybe<Scalars['Bytes']['output']>;
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
    deployment: Scalars['String']['output'];
    /** If `true`, the subgraph encountered indexing errors at some past block */
    hasIndexingErrors: Scalars['Boolean']['output'];
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
    Aggregation_interval: Aggregation_interval;
    Allo: ResolverTypeWrapper<Allo>;
    Allo_filter: Allo_filter;
    Allo_orderBy: Allo_orderBy;
    ArbitrableConfig: ResolverTypeWrapper<ArbitrableConfig>;
    ArbitrableConfig_filter: ArbitrableConfig_filter;
    ArbitrableConfig_orderBy: ArbitrableConfig_orderBy;
    BigDecimal: ResolverTypeWrapper<Scalars['BigDecimal']['output']>;
    BigInt: ResolverTypeWrapper<Scalars['BigInt']['output']>;
    BlockChangedFilter: BlockChangedFilter;
    Block_height: Block_height;
    Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
    Bytes: ResolverTypeWrapper<Scalars['Bytes']['output']>;
    CVProposal: ResolverTypeWrapper<CVProposal>;
    CVProposal_filter: CVProposal_filter;
    CVProposal_orderBy: CVProposal_orderBy;
    CVStrategy: ResolverTypeWrapper<CVStrategy>;
    CVStrategyConfig: ResolverTypeWrapper<CVStrategyConfig>;
    CVStrategyConfig_filter: CVStrategyConfig_filter;
    CVStrategyConfig_orderBy: CVStrategyConfig_orderBy;
    CVStrategy_filter: CVStrategy_filter;
    CVStrategy_orderBy: CVStrategy_orderBy;
    CollateralVault: ResolverTypeWrapper<CollateralVault>;
    CollateralVaultDeposit: ResolverTypeWrapper<CollateralVaultDeposit>;
    CollateralVaultDeposit_filter: CollateralVaultDeposit_filter;
    CollateralVaultDeposit_orderBy: CollateralVaultDeposit_orderBy;
    CollateralVault_filter: CollateralVault_filter;
    CollateralVault_orderBy: CollateralVault_orderBy;
    Float: ResolverTypeWrapper<Scalars['Float']['output']>;
    ID: ResolverTypeWrapper<Scalars['ID']['output']>;
    Int: ResolverTypeWrapper<Scalars['Int']['output']>;
    Int8: ResolverTypeWrapper<Scalars['Int8']['output']>;
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
    ProposalDispute: ResolverTypeWrapper<ProposalDispute>;
    ProposalDisputeMetadata: ResolverTypeWrapper<ProposalDisputeMetadata>;
    ProposalDisputeMetadata_filter: ProposalDisputeMetadata_filter;
    ProposalDisputeMetadata_orderBy: ProposalDisputeMetadata_orderBy;
    ProposalDispute_filter: ProposalDispute_filter;
    ProposalDispute_orderBy: ProposalDispute_orderBy;
    ProposalMetadata: ResolverTypeWrapper<ProposalMetadata>;
    ProposalMetadata_filter: ProposalMetadata_filter;
    ProposalMetadata_orderBy: ProposalMetadata_orderBy;
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
    String: ResolverTypeWrapper<Scalars['String']['output']>;
    Subscription: ResolverTypeWrapper<{}>;
    Timestamp: ResolverTypeWrapper<Scalars['Timestamp']['output']>;
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
    ArbitrableConfig: ArbitrableConfig;
    ArbitrableConfig_filter: ArbitrableConfig_filter;
    BigDecimal: Scalars['BigDecimal']['output'];
    BigInt: Scalars['BigInt']['output'];
    BlockChangedFilter: BlockChangedFilter;
    Block_height: Block_height;
    Boolean: Scalars['Boolean']['output'];
    Bytes: Scalars['Bytes']['output'];
    CVProposal: CVProposal;
    CVProposal_filter: CVProposal_filter;
    CVStrategy: CVStrategy;
    CVStrategyConfig: CVStrategyConfig;
    CVStrategyConfig_filter: CVStrategyConfig_filter;
    CVStrategy_filter: CVStrategy_filter;
    CollateralVault: CollateralVault;
    CollateralVaultDeposit: CollateralVaultDeposit;
    CollateralVaultDeposit_filter: CollateralVaultDeposit_filter;
    CollateralVault_filter: CollateralVault_filter;
    Float: Scalars['Float']['output'];
    ID: Scalars['ID']['output'];
    Int: Scalars['Int']['output'];
    Int8: Scalars['Int8']['output'];
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
    ProposalDispute: ProposalDispute;
    ProposalDisputeMetadata: ProposalDisputeMetadata;
    ProposalDisputeMetadata_filter: ProposalDisputeMetadata_filter;
    ProposalDispute_filter: ProposalDispute_filter;
    ProposalMetadata: ProposalMetadata;
    ProposalMetadata_filter: ProposalMetadata_filter;
    Query: {};
    RegistryCommunity: RegistryCommunity;
    RegistryCommunity_filter: RegistryCommunity_filter;
    RegistryFactory: RegistryFactory;
    RegistryFactory_filter: RegistryFactory_filter;
    Stake: Stake;
    Stake_filter: Stake_filter;
    String: Scalars['String']['output'];
    Subscription: {};
    Timestamp: Scalars['Timestamp']['output'];
    TokenGarden: TokenGarden;
    TokenGarden_filter: TokenGarden_filter;
    _Block_: _Block_;
    _Meta_: _Meta_;
}>;
export type entityDirectiveArgs = {};
export type entityDirectiveResolver<Result, Parent, ContextType = MeshContext, Args = entityDirectiveArgs> = DirectiveResolverFn<Result, Parent, ContextType, Args>;
export type subgraphIdDirectiveArgs = {
    id: Scalars['String']['input'];
};
export type subgraphIdDirectiveResolver<Result, Parent, ContextType = MeshContext, Args = subgraphIdDirectiveArgs> = DirectiveResolverFn<Result, Parent, ContextType, Args>;
export type derivedFromDirectiveArgs = {
    field: Scalars['String']['input'];
};
export type derivedFromDirectiveResolver<Result, Parent, ContextType = MeshContext, Args = derivedFromDirectiveArgs> = DirectiveResolverFn<Result, Parent, ContextType, Args>;
export type AlloResolvers<ContextType = MeshContext, ParentType extends ResolversParentTypes['Allo'] = ResolversParentTypes['Allo']> = ResolversObject<{
    id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
    chainId?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
    tokenNative?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
    __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;
export type ArbitrableConfigResolvers<ContextType = MeshContext, ParentType extends ResolversParentTypes['ArbitrableConfig'] = ResolversParentTypes['ArbitrableConfig']> = ResolversObject<{
    id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
    version?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
    strategy?: Resolver<ResolversTypes['CVStrategy'], ParentType, ContextType>;
    arbitrator?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
    tribunalSafe?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
    challengerCollateralAmount?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
    submitterCollateralAmount?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
    defaultRuling?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
    defaultRulingTimeout?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
    allowlist?: Resolver<Maybe<Array<ResolversTypes['String']>>, ParentType, ContextType>;
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
    metadata?: Resolver<Maybe<ResolversTypes['ProposalMetadata']>, ParentType, ContextType>;
    metadataHash?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
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
    arbitrableConfig?: Resolver<ResolversTypes['ArbitrableConfig'], ParentType, ContextType>;
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
    token?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
    sybilScorer?: Resolver<Maybe<ResolversTypes['PassportScorer']>, ParentType, ContextType>;
    archived?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
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
    allowlist?: Resolver<Maybe<Array<ResolversTypes['String']>>, ParentType, ContextType>;
    __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;
export type CollateralVaultResolvers<ContextType = MeshContext, ParentType extends ResolversParentTypes['CollateralVault'] = ResolversParentTypes['CollateralVault']> = ResolversObject<{
    id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
    strategy?: Resolver<ResolversTypes['CVStrategy'], ParentType, ContextType>;
    collaterals?: Resolver<Maybe<Array<ResolversTypes['CollateralVaultDeposit']>>, ParentType, ContextType, RequireFields<CollateralVaultcollateralsArgs, 'skip' | 'first'>>;
    __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;
export type CollateralVaultDepositResolvers<ContextType = MeshContext, ParentType extends ResolversParentTypes['CollateralVaultDeposit'] = ResolversParentTypes['CollateralVaultDeposit']> = ResolversObject<{
    id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
    collateralVault?: Resolver<ResolversTypes['CollateralVault'], ParentType, ContextType>;
    amount?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
    depositor?: Resolver<ResolversTypes['Bytes'], ParentType, ContextType>;
    createdAt?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
    proposalId?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
    withdrawnAt?: Resolver<Maybe<ResolversTypes['BigInt']>, ParentType, ContextType>;
    withdrawnTo?: Resolver<Maybe<ResolversTypes['Bytes']>, ParentType, ContextType>;
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
    covenantSignature?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
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
export type ProposalDisputeResolvers<ContextType = MeshContext, ParentType extends ResolversParentTypes['ProposalDispute'] = ResolversParentTypes['ProposalDispute']> = ResolversObject<{
    id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
    createdAt?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
    disputeId?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
    proposal?: Resolver<ResolversTypes['CVProposal'], ParentType, ContextType>;
    status?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
    challenger?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
    context?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
    metadata?: Resolver<Maybe<ResolversTypes['ProposalDisputeMetadata']>, ParentType, ContextType>;
    rulingOutcome?: Resolver<Maybe<ResolversTypes['BigInt']>, ParentType, ContextType>;
    ruledAt?: Resolver<Maybe<ResolversTypes['BigInt']>, ParentType, ContextType>;
    __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;
export type ProposalDisputeMetadataResolvers<ContextType = MeshContext, ParentType extends ResolversParentTypes['ProposalDisputeMetadata'] = ResolversParentTypes['ProposalDisputeMetadata']> = ResolversObject<{
    id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
    reason?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
    __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;
export type ProposalMetadataResolvers<ContextType = MeshContext, ParentType extends ResolversParentTypes['ProposalMetadata'] = ResolversParentTypes['ProposalMetadata']> = ResolversObject<{
    id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
    title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
    description?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
    __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;
export type QueryResolvers<ContextType = MeshContext, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = ResolversObject<{
    cvstrategy?: Resolver<Maybe<ResolversTypes['CVStrategy']>, ParentType, ContextType, RequireFields<QuerycvstrategyArgs, 'id' | 'subgraphError'>>;
    cvstrategies?: Resolver<Array<ResolversTypes['CVStrategy']>, ParentType, ContextType, RequireFields<QuerycvstrategiesArgs, 'skip' | 'first' | 'subgraphError'>>;
    cvstrategyConfig?: Resolver<Maybe<ResolversTypes['CVStrategyConfig']>, ParentType, ContextType, RequireFields<QuerycvstrategyConfigArgs, 'id' | 'subgraphError'>>;
    cvstrategyConfigs?: Resolver<Array<ResolversTypes['CVStrategyConfig']>, ParentType, ContextType, RequireFields<QuerycvstrategyConfigsArgs, 'skip' | 'first' | 'subgraphError'>>;
    arbitrableConfig?: Resolver<Maybe<ResolversTypes['ArbitrableConfig']>, ParentType, ContextType, RequireFields<QueryarbitrableConfigArgs, 'id' | 'subgraphError'>>;
    arbitrableConfigs?: Resolver<Array<ResolversTypes['ArbitrableConfig']>, ParentType, ContextType, RequireFields<QueryarbitrableConfigsArgs, 'skip' | 'first' | 'subgraphError'>>;
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
    proposalDispute?: Resolver<Maybe<ResolversTypes['ProposalDispute']>, ParentType, ContextType, RequireFields<QueryproposalDisputeArgs, 'id' | 'subgraphError'>>;
    proposalDisputes?: Resolver<Array<ResolversTypes['ProposalDispute']>, ParentType, ContextType, RequireFields<QueryproposalDisputesArgs, 'skip' | 'first' | 'subgraphError'>>;
    proposalDisputeMetadata?: Resolver<Maybe<ResolversTypes['ProposalDisputeMetadata']>, ParentType, ContextType, RequireFields<QueryproposalDisputeMetadataArgs, 'id' | 'subgraphError'>>;
    proposalDisputeMetadata_collection?: Resolver<Array<ResolversTypes['ProposalDisputeMetadata']>, ParentType, ContextType, RequireFields<QueryproposalDisputeMetadata_collectionArgs, 'skip' | 'first' | 'subgraphError'>>;
    proposalMetadata?: Resolver<Maybe<ResolversTypes['ProposalMetadata']>, ParentType, ContextType, RequireFields<QueryproposalMetadataArgs, 'id' | 'subgraphError'>>;
    proposalMetadata_collection?: Resolver<Array<ResolversTypes['ProposalMetadata']>, ParentType, ContextType, RequireFields<QueryproposalMetadata_collectionArgs, 'skip' | 'first' | 'subgraphError'>>;
    collateralVault?: Resolver<Maybe<ResolversTypes['CollateralVault']>, ParentType, ContextType, RequireFields<QuerycollateralVaultArgs, 'id' | 'subgraphError'>>;
    collateralVaults?: Resolver<Array<ResolversTypes['CollateralVault']>, ParentType, ContextType, RequireFields<QuerycollateralVaultsArgs, 'skip' | 'first' | 'subgraphError'>>;
    collateralVaultDeposit?: Resolver<Maybe<ResolversTypes['CollateralVaultDeposit']>, ParentType, ContextType, RequireFields<QuerycollateralVaultDepositArgs, 'id' | 'subgraphError'>>;
    collateralVaultDeposits?: Resolver<Array<ResolversTypes['CollateralVaultDeposit']>, ParentType, ContextType, RequireFields<QuerycollateralVaultDepositsArgs, 'skip' | 'first' | 'subgraphError'>>;
    _meta?: Resolver<Maybe<ResolversTypes['_Meta_']>, ParentType, ContextType, Partial<Query_metaArgs>>;
}>;
export type RegistryCommunityResolvers<ContextType = MeshContext, ParentType extends ResolversParentTypes['RegistryCommunity'] = ResolversParentTypes['RegistryCommunity']> = ResolversObject<{
    id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
    chainId?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
    strategyTemplate?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
    profileId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
    communityFee?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
    protocolFee?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
    protocolFeeReceiver?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
    communityName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
    covenantIpfsHash?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
    registryFactory?: Resolver<Maybe<ResolversTypes['RegistryFactory']>, ParentType, ContextType>;
    strategies?: Resolver<Maybe<Array<ResolversTypes['CVStrategy']>>, ParentType, ContextType, RequireFields<RegistryCommunitystrategiesArgs, 'skip' | 'first'>>;
    councilSafe?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
    pendingNewCouncilSafe?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
    isKickEnabled?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
    registerStakeAmount?: Resolver<Maybe<ResolversTypes['BigInt']>, ParentType, ContextType>;
    registerToken?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
    alloAddress?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
    membersCount?: Resolver<Maybe<ResolversTypes['BigInt']>, ParentType, ContextType>;
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
    arbitrableConfig?: SubscriptionResolver<Maybe<ResolversTypes['ArbitrableConfig']>, "arbitrableConfig", ParentType, ContextType, RequireFields<SubscriptionarbitrableConfigArgs, 'id' | 'subgraphError'>>;
    arbitrableConfigs?: SubscriptionResolver<Array<ResolversTypes['ArbitrableConfig']>, "arbitrableConfigs", ParentType, ContextType, RequireFields<SubscriptionarbitrableConfigsArgs, 'skip' | 'first' | 'subgraphError'>>;
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
    proposalDispute?: SubscriptionResolver<Maybe<ResolversTypes['ProposalDispute']>, "proposalDispute", ParentType, ContextType, RequireFields<SubscriptionproposalDisputeArgs, 'id' | 'subgraphError'>>;
    proposalDisputes?: SubscriptionResolver<Array<ResolversTypes['ProposalDispute']>, "proposalDisputes", ParentType, ContextType, RequireFields<SubscriptionproposalDisputesArgs, 'skip' | 'first' | 'subgraphError'>>;
    proposalDisputeMetadata?: SubscriptionResolver<Maybe<ResolversTypes['ProposalDisputeMetadata']>, "proposalDisputeMetadata", ParentType, ContextType, RequireFields<SubscriptionproposalDisputeMetadataArgs, 'id' | 'subgraphError'>>;
    proposalDisputeMetadata_collection?: SubscriptionResolver<Array<ResolversTypes['ProposalDisputeMetadata']>, "proposalDisputeMetadata_collection", ParentType, ContextType, RequireFields<SubscriptionproposalDisputeMetadata_collectionArgs, 'skip' | 'first' | 'subgraphError'>>;
    proposalMetadata?: SubscriptionResolver<Maybe<ResolversTypes['ProposalMetadata']>, "proposalMetadata", ParentType, ContextType, RequireFields<SubscriptionproposalMetadataArgs, 'id' | 'subgraphError'>>;
    proposalMetadata_collection?: SubscriptionResolver<Array<ResolversTypes['ProposalMetadata']>, "proposalMetadata_collection", ParentType, ContextType, RequireFields<SubscriptionproposalMetadata_collectionArgs, 'skip' | 'first' | 'subgraphError'>>;
    collateralVault?: SubscriptionResolver<Maybe<ResolversTypes['CollateralVault']>, "collateralVault", ParentType, ContextType, RequireFields<SubscriptioncollateralVaultArgs, 'id' | 'subgraphError'>>;
    collateralVaults?: SubscriptionResolver<Array<ResolversTypes['CollateralVault']>, "collateralVaults", ParentType, ContextType, RequireFields<SubscriptioncollateralVaultsArgs, 'skip' | 'first' | 'subgraphError'>>;
    collateralVaultDeposit?: SubscriptionResolver<Maybe<ResolversTypes['CollateralVaultDeposit']>, "collateralVaultDeposit", ParentType, ContextType, RequireFields<SubscriptioncollateralVaultDepositArgs, 'id' | 'subgraphError'>>;
    collateralVaultDeposits?: SubscriptionResolver<Array<ResolversTypes['CollateralVaultDeposit']>, "collateralVaultDeposits", ParentType, ContextType, RequireFields<SubscriptioncollateralVaultDepositsArgs, 'skip' | 'first' | 'subgraphError'>>;
    _meta?: SubscriptionResolver<Maybe<ResolversTypes['_Meta_']>, "_meta", ParentType, ContextType, Partial<Subscription_metaArgs>>;
}>;
export interface TimestampScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['Timestamp'], any> {
    name: 'Timestamp';
}
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
    parentHash?: Resolver<Maybe<ResolversTypes['Bytes']>, ParentType, ContextType>;
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
    ArbitrableConfig?: ArbitrableConfigResolvers<ContextType>;
    BigDecimal?: GraphQLScalarType;
    BigInt?: GraphQLScalarType;
    Bytes?: GraphQLScalarType;
    CVProposal?: CVProposalResolvers<ContextType>;
    CVStrategy?: CVStrategyResolvers<ContextType>;
    CVStrategyConfig?: CVStrategyConfigResolvers<ContextType>;
    CollateralVault?: CollateralVaultResolvers<ContextType>;
    CollateralVaultDeposit?: CollateralVaultDepositResolvers<ContextType>;
    Int8?: GraphQLScalarType;
    Member?: MemberResolvers<ContextType>;
    MemberCommunity?: MemberCommunityResolvers<ContextType>;
    MemberStrategy?: MemberStrategyResolvers<ContextType>;
    PassportScorer?: PassportScorerResolvers<ContextType>;
    PassportStrategy?: PassportStrategyResolvers<ContextType>;
    PassportUser?: PassportUserResolvers<ContextType>;
    ProposalDispute?: ProposalDisputeResolvers<ContextType>;
    ProposalDisputeMetadata?: ProposalDisputeMetadataResolvers<ContextType>;
    ProposalMetadata?: ProposalMetadataResolvers<ContextType>;
    Query?: QueryResolvers<ContextType>;
    RegistryCommunity?: RegistryCommunityResolvers<ContextType>;
    RegistryFactory?: RegistryFactoryResolvers<ContextType>;
    Stake?: StakeResolvers<ContextType>;
    Subscription?: SubscriptionResolvers<ContextType>;
    Timestamp?: GraphQLScalarType;
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
export declare const pollingInterval: any;
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
    getMembersStrategy(variables: Exact<{
        strategyId: string;
    }>, options?: TOperationContext): Promise<getMembersStrategyQuery>;
    getMemberStrategy(variables: Exact<{
        member_strategy: string;
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
    getProposalSupporters(variables: Exact<{
        proposalId: string;
    }>, options?: TOperationContext): Promise<getProposalSupportersQuery>;
    getGardenCommunities(variables: Exact<{
        chainId: any;
        tokenGarden: string;
    }>, options?: TOperationContext): Promise<getGardenCommunitiesQuery>;
    getCommunities(variables?: Exact<{
        [key: string]: never;
    }>, options?: TOperationContext): Promise<getCommunitiesQuery>;
    getCommunity(variables: Exact<{
        communityAddr: string;
        tokenAddr: string;
        showArchived?: boolean;
    }>, options?: TOperationContext): Promise<getCommunityQuery>;
    getCommunityCreationData(variables?: Exact<{
        [key: string]: never;
    }>, options?: TOperationContext): Promise<getCommunityCreationDataQuery>;
    getRegistryFactoryData(variables?: Exact<{
        [key: string]: never;
    }>, options?: TOperationContext): Promise<getRegistryFactoryDataQuery>;
    getPoolData(variables: Exact<{
        garden: string;
        poolId: any;
    }>, options?: TOperationContext): Promise<getPoolDataQuery>;
    getProposalData(variables: Exact<{
        garden: string;
        proposalId: string;
        communityId: string;
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
    getProposalDisputes(variables: Exact<{
        proposalId: string;
    }>, options?: TOperationContext): Promise<getProposalDisputesQuery>;
    getArbitrableConfigs(variables: Exact<{
        strategyId: string;
    }>, options?: TOperationContext): Promise<getArbitrableConfigsQuery>;
    getMemberPassportAndCommunities(variables: Exact<{
        memberId: string;
    }>, options?: TOperationContext): Promise<getMemberPassportAndCommunitiesQuery>;
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
export type getMembersStrategyQueryVariables = Exact<{
    strategyId: Scalars['String']['input'];
}>;
export type getMembersStrategyQuery = {
    memberStrategies: Array<(Pick<MemberStrategy, 'activatedPoints' | 'totalStakedPoints' | 'id'> & {
        member: {
            memberCommunity?: Maybe<Array<Pick<MemberCommunity, 'memberAddress' | 'isRegistered'>>>;
        };
    })>;
};
export type getMemberStrategyQueryVariables = Exact<{
    member_strategy: Scalars['ID']['input'];
}>;
export type getMemberStrategyQuery = {
    memberStrategy?: Maybe<(Pick<MemberStrategy, 'id' | 'totalStakedPoints' | 'activatedPoints'> & {
        strategy: Pick<CVStrategy, 'id'>;
        member: Pick<Member, 'id'>;
    })>;
};
export type isMemberQueryVariables = Exact<{
    me: Scalars['ID']['input'];
    comm: Scalars['String']['input'];
}>;
export type isMemberQuery = {
    member?: Maybe<(Pick<Member, 'id'> & {
        stakes?: Maybe<Array<(Pick<Stake, 'id' | 'amount'> & {
            proposal: (Pick<CVProposal, 'id' | 'proposalNumber' | 'stakedAmount'> & {
                strategy: (Pick<CVStrategy, 'id' | 'poolId'> & {
                    registryCommunity: (Pick<RegistryCommunity, 'id' | 'isValid'> & {
                        garden: Pick<TokenGarden, 'id' | 'symbol' | 'decimals'>;
                    });
                });
            });
        })>>;
        memberCommunity?: Maybe<Array<(Pick<MemberCommunity, 'stakedTokens' | 'isRegistered'> & {
            registryCommunity: Pick<RegistryCommunity, 'id'>;
        })>>;
    })>;
};
export type getMemberQueryVariables = Exact<{
    me: Scalars['ID']['input'];
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
    communityAddr: Scalars['ID']['input'];
    tokenAddr: Scalars['ID']['input'];
}>;
export type getPoolCreationDataQuery = {
    tokenGarden?: Maybe<Pick<TokenGarden, 'decimals' | 'id' | 'symbol'>>;
    allos: Array<Pick<Allo, 'id'>>;
    registryCommunity?: Maybe<Pick<RegistryCommunity, 'communityName' | 'isValid'>>;
};
export type getProposalSupportersQueryVariables = Exact<{
    proposalId: Scalars['String']['input'];
}>;
export type getProposalSupportersQuery = {
    members: Array<(Pick<Member, 'id'> & {
        stakes?: Maybe<Array<(Pick<Stake, 'amount'> & {
            proposal: Pick<CVProposal, 'proposalNumber' | 'id'>;
        })>>;
    })>;
};
export type getGardenCommunitiesQueryVariables = Exact<{
    chainId: Scalars['BigInt']['input'];
    tokenGarden: Scalars['ID']['input'];
}>;
export type getGardenCommunitiesQuery = {
    registryCommunities: Array<(Pick<RegistryCommunity, 'id' | 'chainId' | 'isValid' | 'covenantIpfsHash' | 'communityName' | 'protocolFee' | 'communityFee' | 'registerToken' | 'registerStakeAmount' | 'alloAddress'> & {
        garden: Pick<TokenGarden, 'id'>;
        members?: Maybe<Array<Pick<MemberCommunity, 'id' | 'memberAddress'>>>;
        strategies?: Maybe<Array<Pick<CVStrategy, 'id' | 'totalEffectiveActivePoints' | 'poolId' | 'poolAmount'>>>;
    })>;
};
export type getCommunitiesQueryVariables = Exact<{
    [key: string]: never;
}>;
export type getCommunitiesQuery = {
    registryCommunities: Array<(Pick<RegistryCommunity, 'id' | 'communityName'> & {
        garden: Pick<TokenGarden, 'address' | 'chainId' | 'symbol' | 'name'>;
        strategies?: Maybe<Array<Pick<CVStrategy, 'id' | 'totalEffectiveActivePoints' | 'poolId' | 'poolAmount'>>>;
        members?: Maybe<Array<Pick<MemberCommunity, 'id' | 'memberAddress'>>>;
    })>;
};
export type getCommunityQueryVariables = Exact<{
    communityAddr: Scalars['ID']['input'];
    tokenAddr: Scalars['ID']['input'];
    showArchived?: InputMaybe<Scalars['Boolean']['input']>;
}>;
export type getCommunityQuery = {
    registryCommunity?: Maybe<(Pick<RegistryCommunity, 'communityName' | 'id' | 'covenantIpfsHash' | 'communityFee' | 'protocolFee' | 'registerStakeAmount' | 'registerToken' | 'councilSafe'> & {
        members?: Maybe<Array<Pick<MemberCommunity, 'memberAddress' | 'stakedTokens'>>>;
        strategies?: Maybe<Array<(Pick<CVStrategy, 'id' | 'archived' | 'isEnabled' | 'poolAmount' | 'poolId' | 'token' | 'metadata'> & {
            proposals: Array<Pick<CVProposal, 'id'>>;
            config: Pick<CVStrategyConfig, 'proposalType' | 'pointSystem'>;
        })>>;
    })>;
    tokenGarden?: Maybe<Pick<TokenGarden, 'symbol' | 'decimals' | 'id'>>;
};
export type getCommunityCreationDataQueryVariables = Exact<{
    [key: string]: never;
}>;
export type getCommunityCreationDataQuery = {
    registryFactories: Array<Pick<RegistryFactory, 'id'>>;
};
export type getRegistryFactoryDataQueryVariables = Exact<{
    [key: string]: never;
}>;
export type getRegistryFactoryDataQuery = {
    registryFactories: Array<Pick<RegistryFactory, 'id' | 'chainId'>>;
};
export type getPoolDataQueryVariables = Exact<{
    garden: Scalars['ID']['input'];
    poolId: Scalars['BigInt']['input'];
}>;
export type getPoolDataQuery = {
    allos: Array<Pick<Allo, 'id' | 'chainId' | 'tokenNative'>>;
    tokenGarden?: Maybe<Pick<TokenGarden, 'address' | 'name' | 'symbol' | 'description' | 'totalBalance' | 'ipfsCovenant' | 'decimals'>>;
    cvstrategies: Array<(Pick<CVStrategy, 'token' | 'poolAmount' | 'metadata' | 'id' | 'poolId' | 'totalEffectiveActivePoints' | 'isEnabled' | 'maxCVSupply' | 'archived'> & {
        sybilScorer?: Maybe<Pick<PassportScorer, 'id'>>;
        memberActive?: Maybe<Array<Pick<Member, 'id'>>>;
        config: Pick<CVStrategyConfig, 'id' | 'weight' | 'decay' | 'maxAmount' | 'maxRatio' | 'minThresholdPoints' | 'pointSystem' | 'proposalType' | 'allowlist'>;
        registryCommunity: (Pick<RegistryCommunity, 'id' | 'councilSafe' | 'isValid'> & {
            garden: Pick<TokenGarden, 'id' | 'symbol' | 'decimals'>;
        });
        proposals: Array<(Pick<CVProposal, 'id' | 'proposalNumber' | 'metadataHash' | 'beneficiary' | 'requestedAmount' | 'requestedToken' | 'proposalStatus' | 'stakedAmount' | 'convictionLast' | 'createdAt' | 'blockLast' | 'threshold'> & {
            metadata?: Maybe<Pick<ProposalMetadata, 'title' | 'description'>>;
            strategy: Pick<CVStrategy, 'id' | 'maxCVSupply' | 'totalEffectiveActivePoints'>;
        })>;
    })>;
    arbitrableConfigs: Array<Pick<ArbitrableConfig, 'submitterCollateralAmount' | 'challengerCollateralAmount' | 'arbitrator' | 'defaultRuling' | 'defaultRulingTimeout' | 'tribunalSafe'>>;
};
export type getProposalDataQueryVariables = Exact<{
    garden: Scalars['ID']['input'];
    proposalId: Scalars['ID']['input'];
    communityId: Scalars['ID']['input'];
}>;
export type getProposalDataQuery = {
    allos: Array<Pick<Allo, 'id' | 'chainId' | 'tokenNative'>>;
    tokenGarden?: Maybe<Pick<TokenGarden, 'name' | 'symbol' | 'decimals'>>;
    registryCommunity?: Maybe<Pick<RegistryCommunity, 'councilSafe'>>;
    cvproposal?: Maybe<(Pick<CVProposal, 'id' | 'proposalNumber' | 'beneficiary' | 'blockLast' | 'convictionLast' | 'createdAt' | 'metadataHash' | 'proposalStatus' | 'requestedAmount' | 'requestedToken' | 'stakedAmount' | 'submitter' | 'threshold' | 'updatedAt' | 'version'> & {
        metadata?: Maybe<Pick<ProposalMetadata, 'title' | 'description'>>;
        strategy: (Pick<CVStrategy, 'id' | 'token' | 'maxCVSupply' | 'totalEffectiveActivePoints' | 'poolId' | 'isEnabled'> & {
            config: Pick<CVStrategyConfig, 'proposalType' | 'pointSystem' | 'minThresholdPoints' | 'decay'>;
        });
        arbitrableConfig: Pick<ArbitrableConfig, 'arbitrator' | 'defaultRuling' | 'defaultRulingTimeout' | 'challengerCollateralAmount' | 'submitterCollateralAmount' | 'tribunalSafe'>;
    })>;
};
export type getAlloQueryVariables = Exact<{
    [key: string]: never;
}>;
export type getAlloQuery = {
    allos: Array<Pick<Allo, 'id' | 'chainId' | 'tokenNative'>>;
};
export type getStrategyByPoolQueryVariables = Exact<{
    poolId: Scalars['BigInt']['input'];
}>;
export type getStrategyByPoolQuery = {
    cvstrategies: Array<(Pick<CVStrategy, 'id' | 'poolId' | 'totalEffectiveActivePoints' | 'isEnabled' | 'archived'> & {
        config: Pick<CVStrategyConfig, 'id' | 'proposalType' | 'pointSystem' | 'minThresholdPoints'>;
        memberActive?: Maybe<Array<Pick<Member, 'id'>>>;
        registryCommunity: (Pick<RegistryCommunity, 'id' | 'isValid'> & {
            garden: Pick<TokenGarden, 'id' | 'symbol' | 'decimals'>;
        });
        proposals: Array<(Pick<CVProposal, 'id' | 'proposalNumber' | 'metadataHash' | 'beneficiary' | 'requestedAmount' | 'requestedToken' | 'proposalStatus' | 'stakedAmount'> & {
            metadata?: Maybe<Pick<ProposalMetadata, 'title' | 'description'>>;
        })>;
    })>;
};
export type getTokenTitleQueryVariables = Exact<{
    tokenAddr: Scalars['ID']['input'];
}>;
export type getTokenTitleQuery = {
    tokenGarden?: Maybe<Pick<TokenGarden, 'name'>>;
};
export type getCommunityTitlesQueryVariables = Exact<{
    communityAddr: Scalars['ID']['input'];
}>;
export type getCommunityTitlesQuery = {
    registryCommunity?: Maybe<(Pick<RegistryCommunity, 'communityName'> & {
        garden: Pick<TokenGarden, 'name'>;
    })>;
};
export type getPoolTitlesQueryVariables = Exact<{
    poolId: Scalars['BigInt']['input'];
}>;
export type getPoolTitlesQuery = {
    cvstrategies: Array<(Pick<CVStrategy, 'poolId' | 'metadata'> & {
        registryCommunity: (Pick<RegistryCommunity, 'communityName'> & {
            garden: Pick<TokenGarden, 'name'>;
        });
    })>;
};
export type getProposalTitlesQueryVariables = Exact<{
    proposalId: Scalars['ID']['input'];
}>;
export type getProposalTitlesQuery = {
    cvproposal?: Maybe<(Pick<CVProposal, 'proposalNumber' | 'metadataHash'> & {
        metadata?: Maybe<Pick<ProposalMetadata, 'title' | 'description'>>;
        strategy: (Pick<CVStrategy, 'poolId' | 'metadata'> & {
            registryCommunity: (Pick<RegistryCommunity, 'communityName'> & {
                garden: Pick<TokenGarden, 'name'>;
            });
        });
    })>;
};
export type getPassportScorerQueryVariables = Exact<{
    scorerId: Scalars['ID']['input'];
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
    strategyId: Scalars['ID']['input'];
}>;
export type getPassportStrategyQuery = {
    passportStrategy?: Maybe<(Pick<PassportStrategy, 'id' | 'threshold' | 'councilSafe' | 'active'> & {
        strategy: Pick<CVStrategy, 'id'>;
    })>;
};
export type getPassportUserQueryVariables = Exact<{
    userId: Scalars['ID']['input'];
}>;
export type getPassportUserQuery = {
    passportUser?: Maybe<Pick<PassportUser, 'id' | 'userAddress' | 'score' | 'lastUpdated'>>;
};
export type getProposalDisputesQueryVariables = Exact<{
    proposalId: Scalars['ID']['input'];
}>;
export type getProposalDisputesQuery = {
    proposalDisputes: Array<(Pick<ProposalDispute, 'id' | 'disputeId' | 'status' | 'challenger' | 'context' | 'createdAt' | 'ruledAt' | 'rulingOutcome'> & {
        metadata?: Maybe<Pick<ProposalDisputeMetadata, 'reason'>>;
    })>;
};
export type getArbitrableConfigsQueryVariables = Exact<{
    strategyId: Scalars['String']['input'];
}>;
export type getArbitrableConfigsQuery = {
    arbitrableConfigs: Array<Pick<ArbitrableConfig, 'arbitrator' | 'challengerCollateralAmount' | 'submitterCollateralAmount' | 'tribunalSafe' | 'defaultRuling' | 'defaultRulingTimeout'>>;
};
export type getMemberPassportAndCommunitiesQueryVariables = Exact<{
    memberId: Scalars['ID']['input'];
}>;
export type getMemberPassportAndCommunitiesQuery = {
    member?: Maybe<{
        memberCommunity?: Maybe<Array<Pick<MemberCommunity, 'id'>>>;
    }>;
    passportUser?: Maybe<Pick<PassportUser, 'lastUpdated' | 'score'>>;
};
export declare const getFactoriesDocument: DocumentNode<getFactoriesQuery, Exact<{
    [key: string]: never;
}>>;
export declare const getTokenGardensDocument: DocumentNode<getTokenGardensQuery, Exact<{
    [key: string]: never;
}>>;
export declare const getMembersStrategyDocument: DocumentNode<getMembersStrategyQuery, Exact<{
    strategyId: Scalars['String']['input'];
}>>;
export declare const getMemberStrategyDocument: DocumentNode<getMemberStrategyQuery, Exact<{
    member_strategy: Scalars['ID']['input'];
}>>;
export declare const isMemberDocument: DocumentNode<isMemberQuery, Exact<{
    me: Scalars['ID']['input'];
    comm: Scalars['String']['input'];
}>>;
export declare const getMemberDocument: DocumentNode<getMemberQuery, Exact<{
    me: Scalars['ID']['input'];
}>>;
export declare const getPoolCreationDataDocument: DocumentNode<getPoolCreationDataQuery, Exact<{
    communityAddr: Scalars['ID']['input'];
    tokenAddr: Scalars['ID']['input'];
}>>;
export declare const getProposalSupportersDocument: DocumentNode<getProposalSupportersQuery, Exact<{
    proposalId: Scalars['String']['input'];
}>>;
export declare const getGardenCommunitiesDocument: DocumentNode<getGardenCommunitiesQuery, Exact<{
    chainId: Scalars['BigInt']['input'];
    tokenGarden: Scalars['ID']['input'];
}>>;
export declare const getCommunitiesDocument: DocumentNode<getCommunitiesQuery, Exact<{
    [key: string]: never;
}>>;
export declare const getCommunityDocument: DocumentNode<getCommunityQuery, Exact<{
    communityAddr: Scalars['ID']['input'];
    tokenAddr: Scalars['ID']['input'];
    showArchived?: InputMaybe<Scalars['Boolean']['input']>;
}>>;
export declare const getCommunityCreationDataDocument: DocumentNode<getCommunityCreationDataQuery, Exact<{
    [key: string]: never;
}>>;
export declare const getRegistryFactoryDataDocument: DocumentNode<getRegistryFactoryDataQuery, Exact<{
    [key: string]: never;
}>>;
export declare const getPoolDataDocument: DocumentNode<getPoolDataQuery, Exact<{
    garden: Scalars['ID']['input'];
    poolId: Scalars['BigInt']['input'];
}>>;
export declare const getProposalDataDocument: DocumentNode<getProposalDataQuery, Exact<{
    garden: Scalars['ID']['input'];
    proposalId: Scalars['ID']['input'];
    communityId: Scalars['ID']['input'];
}>>;
export declare const getAlloDocument: DocumentNode<getAlloQuery, Exact<{
    [key: string]: never;
}>>;
export declare const getStrategyByPoolDocument: DocumentNode<getStrategyByPoolQuery, Exact<{
    poolId: Scalars['BigInt']['input'];
}>>;
export declare const getTokenTitleDocument: DocumentNode<getTokenTitleQuery, Exact<{
    tokenAddr: Scalars['ID']['input'];
}>>;
export declare const getCommunityTitlesDocument: DocumentNode<getCommunityTitlesQuery, Exact<{
    communityAddr: Scalars['ID']['input'];
}>>;
export declare const getPoolTitlesDocument: DocumentNode<getPoolTitlesQuery, Exact<{
    poolId: Scalars['BigInt']['input'];
}>>;
export declare const getProposalTitlesDocument: DocumentNode<getProposalTitlesQuery, Exact<{
    proposalId: Scalars['ID']['input'];
}>>;
export declare const getPassportScorerDocument: DocumentNode<getPassportScorerQuery, Exact<{
    scorerId: Scalars['ID']['input'];
}>>;
export declare const getPassportStrategyDocument: DocumentNode<getPassportStrategyQuery, Exact<{
    strategyId: Scalars['ID']['input'];
}>>;
export declare const getPassportUserDocument: DocumentNode<getPassportUserQuery, Exact<{
    userId: Scalars['ID']['input'];
}>>;
export declare const getProposalDisputesDocument: DocumentNode<getProposalDisputesQuery, Exact<{
    proposalId: Scalars['ID']['input'];
}>>;
export declare const getArbitrableConfigsDocument: DocumentNode<getArbitrableConfigsQuery, Exact<{
    strategyId: Scalars['String']['input'];
}>>;
export declare const getMemberPassportAndCommunitiesDocument: DocumentNode<getMemberPassportAndCommunitiesQuery, Exact<{
    memberId: Scalars['ID']['input'];
}>>;
export type Requester<C = {}, E = unknown> = <R, V>(doc: DocumentNode, vars?: V, options?: C) => Promise<R> | AsyncIterable<R>;
export declare function getSdk<C, E>(requester: Requester<C, E>): {
    getFactories(variables?: getFactoriesQueryVariables, options?: C): Promise<getFactoriesQuery>;
    getTokenGardens(variables?: getTokenGardensQueryVariables, options?: C): Promise<getTokenGardensQuery>;
    getMembersStrategy(variables: getMembersStrategyQueryVariables, options?: C): Promise<getMembersStrategyQuery>;
    getMemberStrategy(variables: getMemberStrategyQueryVariables, options?: C): Promise<getMemberStrategyQuery>;
    isMember(variables: isMemberQueryVariables, options?: C): Promise<isMemberQuery>;
    getMember(variables: getMemberQueryVariables, options?: C): Promise<getMemberQuery>;
    getPoolCreationData(variables: getPoolCreationDataQueryVariables, options?: C): Promise<getPoolCreationDataQuery>;
    getProposalSupporters(variables: getProposalSupportersQueryVariables, options?: C): Promise<getProposalSupportersQuery>;
    getGardenCommunities(variables: getGardenCommunitiesQueryVariables, options?: C): Promise<getGardenCommunitiesQuery>;
    getCommunities(variables?: getCommunitiesQueryVariables, options?: C): Promise<getCommunitiesQuery>;
    getCommunity(variables: getCommunityQueryVariables, options?: C): Promise<getCommunityQuery>;
    getCommunityCreationData(variables?: getCommunityCreationDataQueryVariables, options?: C): Promise<getCommunityCreationDataQuery>;
    getRegistryFactoryData(variables?: getRegistryFactoryDataQueryVariables, options?: C): Promise<getRegistryFactoryDataQuery>;
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
    getProposalDisputes(variables: getProposalDisputesQueryVariables, options?: C): Promise<getProposalDisputesQuery>;
    getArbitrableConfigs(variables: getArbitrableConfigsQueryVariables, options?: C): Promise<getArbitrableConfigsQuery>;
    getMemberPassportAndCommunities(variables: getMemberPassportAndCommunitiesQueryVariables, options?: C): Promise<getMemberPassportAndCommunitiesQuery>;
};
export type Sdk = ReturnType<typeof getSdk>;
