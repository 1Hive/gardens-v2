// @ts-nocheck

import { InContextSdkMethod } from '@graphql-mesh/types';
import { MeshContext } from '@graphql-mesh/runtime';

export namespace Gv2Types {
  export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  BigDecimal: { input: any; output: any; }
  BigInt: { input: any; output: any; }
  Bytes: { input: any; output: any; }
  Int8: { input: any; output: any; }
  Timestamp: { input: any; output: any; }
};

export type Aggregation_interval =
  | 'hour'
  | 'day';

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

export type Allo_orderBy =
  | 'id'
  | 'chainId'
  | 'tokenNative';

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

export type ArbitrableConfig_orderBy =
  | 'id'
  | 'version'
  | 'strategy'
  | 'strategy__id'
  | 'strategy__poolId'
  | 'strategy__metadataHash'
  | 'strategy__maxCVSupply'
  | 'strategy__totalEffectiveActivePoints'
  | 'strategy__isEnabled'
  | 'strategy__token'
  | 'strategy__archived'
  | 'arbitrator'
  | 'tribunalSafe'
  | 'challengerCollateralAmount'
  | 'submitterCollateralAmount'
  | 'defaultRuling'
  | 'defaultRulingTimeout'
  | 'allowlist';

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
  maxCVStaked: Scalars['BigInt']['output'];
  stakedAmount: Scalars['BigInt']['output'];
  submitter: Scalars['String']['output'];
  createdAt: Scalars['BigInt']['output'];
  updatedAt: Scalars['BigInt']['output'];
  arbitrableConfig: ArbitrableConfig;
  executedAt?: Maybe<Scalars['BigInt']['output']>;
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
  executedAt?: InputMaybe<Scalars['BigInt']['input']>;
  executedAt_not?: InputMaybe<Scalars['BigInt']['input']>;
  executedAt_gt?: InputMaybe<Scalars['BigInt']['input']>;
  executedAt_lt?: InputMaybe<Scalars['BigInt']['input']>;
  executedAt_gte?: InputMaybe<Scalars['BigInt']['input']>;
  executedAt_lte?: InputMaybe<Scalars['BigInt']['input']>;
  executedAt_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  executedAt_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  /** Filter for the block changed event. */
  _change_block?: InputMaybe<BlockChangedFilter>;
  and?: InputMaybe<Array<InputMaybe<CVProposal_filter>>>;
  or?: InputMaybe<Array<InputMaybe<CVProposal_filter>>>;
};

export type CVProposal_orderBy =
  | 'id'
  | 'proposalNumber'
  | 'metadata'
  | 'metadata__id'
  | 'metadata__title'
  | 'metadata__description'
  | 'metadataHash'
  | 'version'
  | 'strategy'
  | 'strategy__id'
  | 'strategy__poolId'
  | 'strategy__metadataHash'
  | 'strategy__maxCVSupply'
  | 'strategy__totalEffectiveActivePoints'
  | 'strategy__isEnabled'
  | 'strategy__token'
  | 'strategy__archived'
  | 'beneficiary'
  | 'requestedAmount'
  | 'requestedToken'
  | 'proposalStatus'
  | 'blockLast'
  | 'convictionLast'
  | 'maxCVStaked'
  | 'stakedAmount'
  | 'submitter'
  | 'createdAt'
  | 'updatedAt'
  | 'arbitrableConfig'
  | 'arbitrableConfig__id'
  | 'arbitrableConfig__version'
  | 'arbitrableConfig__arbitrator'
  | 'arbitrableConfig__tribunalSafe'
  | 'arbitrableConfig__challengerCollateralAmount'
  | 'arbitrableConfig__submitterCollateralAmount'
  | 'arbitrableConfig__defaultRuling'
  | 'arbitrableConfig__defaultRulingTimeout'
  | 'executedAt';

export type CVStrategy = {
  id: Scalars['ID']['output'];
  poolId: Scalars['BigInt']['output'];
  metadata?: Maybe<PoolMetadata>;
  metadataHash?: Maybe<Scalars['String']['output']>;
  registryCommunity: RegistryCommunity;
  config: CVStrategyConfig;
  proposals: Array<CVProposal>;
  memberActive?: Maybe<Array<Member>>;
  maxCVSupply: Scalars['BigInt']['output'];
  totalEffectiveActivePoints: Scalars['BigInt']['output'];
  isEnabled: Scalars['Boolean']['output'];
  token: Scalars['String']['output'];
  sybil?: Maybe<SybilProtection>;
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
  superfluidToken?: Maybe<Scalars['String']['output']>;
  superfluidGDA: Array<Scalars['String']['output']>;
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
  superfluidToken?: InputMaybe<Scalars['String']['input']>;
  superfluidToken_not?: InputMaybe<Scalars['String']['input']>;
  superfluidToken_gt?: InputMaybe<Scalars['String']['input']>;
  superfluidToken_lt?: InputMaybe<Scalars['String']['input']>;
  superfluidToken_gte?: InputMaybe<Scalars['String']['input']>;
  superfluidToken_lte?: InputMaybe<Scalars['String']['input']>;
  superfluidToken_in?: InputMaybe<Array<Scalars['String']['input']>>;
  superfluidToken_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
  superfluidToken_contains?: InputMaybe<Scalars['String']['input']>;
  superfluidToken_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  superfluidToken_not_contains?: InputMaybe<Scalars['String']['input']>;
  superfluidToken_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  superfluidToken_starts_with?: InputMaybe<Scalars['String']['input']>;
  superfluidToken_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  superfluidToken_not_starts_with?: InputMaybe<Scalars['String']['input']>;
  superfluidToken_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  superfluidToken_ends_with?: InputMaybe<Scalars['String']['input']>;
  superfluidToken_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  superfluidToken_not_ends_with?: InputMaybe<Scalars['String']['input']>;
  superfluidToken_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  superfluidGDA?: InputMaybe<Array<Scalars['String']['input']>>;
  superfluidGDA_not?: InputMaybe<Array<Scalars['String']['input']>>;
  superfluidGDA_contains?: InputMaybe<Array<Scalars['String']['input']>>;
  superfluidGDA_contains_nocase?: InputMaybe<Array<Scalars['String']['input']>>;
  superfluidGDA_not_contains?: InputMaybe<Array<Scalars['String']['input']>>;
  superfluidGDA_not_contains_nocase?: InputMaybe<Array<Scalars['String']['input']>>;
  /** Filter for the block changed event. */
  _change_block?: InputMaybe<BlockChangedFilter>;
  and?: InputMaybe<Array<InputMaybe<CVStrategyConfig_filter>>>;
  or?: InputMaybe<Array<InputMaybe<CVStrategyConfig_filter>>>;
};

export type CVStrategyConfig_orderBy =
  | 'id'
  | 'strategy'
  | 'strategy__id'
  | 'strategy__poolId'
  | 'strategy__metadataHash'
  | 'strategy__maxCVSupply'
  | 'strategy__totalEffectiveActivePoints'
  | 'strategy__isEnabled'
  | 'strategy__token'
  | 'strategy__archived'
  | 'D'
  | 'decay'
  | 'maxRatio'
  | 'minThresholdPoints'
  | 'weight'
  | 'proposalType'
  | 'pointSystem'
  | 'maxAmount'
  | 'allowlist'
  | 'superfluidToken'
  | 'superfluidGDA';

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
  metadata_?: InputMaybe<PoolMetadata_filter>;
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
  sybil?: InputMaybe<Scalars['String']['input']>;
  sybil_not?: InputMaybe<Scalars['String']['input']>;
  sybil_gt?: InputMaybe<Scalars['String']['input']>;
  sybil_lt?: InputMaybe<Scalars['String']['input']>;
  sybil_gte?: InputMaybe<Scalars['String']['input']>;
  sybil_lte?: InputMaybe<Scalars['String']['input']>;
  sybil_in?: InputMaybe<Array<Scalars['String']['input']>>;
  sybil_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
  sybil_contains?: InputMaybe<Scalars['String']['input']>;
  sybil_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  sybil_not_contains?: InputMaybe<Scalars['String']['input']>;
  sybil_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  sybil_starts_with?: InputMaybe<Scalars['String']['input']>;
  sybil_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  sybil_not_starts_with?: InputMaybe<Scalars['String']['input']>;
  sybil_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  sybil_ends_with?: InputMaybe<Scalars['String']['input']>;
  sybil_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  sybil_not_ends_with?: InputMaybe<Scalars['String']['input']>;
  sybil_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  sybil_?: InputMaybe<SybilProtection_filter>;
  archived?: InputMaybe<Scalars['Boolean']['input']>;
  archived_not?: InputMaybe<Scalars['Boolean']['input']>;
  archived_in?: InputMaybe<Array<Scalars['Boolean']['input']>>;
  archived_not_in?: InputMaybe<Array<Scalars['Boolean']['input']>>;
  /** Filter for the block changed event. */
  _change_block?: InputMaybe<BlockChangedFilter>;
  and?: InputMaybe<Array<InputMaybe<CVStrategy_filter>>>;
  or?: InputMaybe<Array<InputMaybe<CVStrategy_filter>>>;
};

export type CVStrategy_orderBy =
  | 'id'
  | 'poolId'
  | 'metadata'
  | 'metadata__id'
  | 'metadata__title'
  | 'metadata__description'
  | 'metadataHash'
  | 'registryCommunity'
  | 'registryCommunity__id'
  | 'registryCommunity__chainId'
  | 'registryCommunity__strategyTemplate'
  | 'registryCommunity__profileId'
  | 'registryCommunity__communityFee'
  | 'registryCommunity__protocolFee'
  | 'registryCommunity__protocolFeeReceiver'
  | 'registryCommunity__communityName'
  | 'registryCommunity__covenantIpfsHash'
  | 'registryCommunity__councilSafe'
  | 'registryCommunity__pendingNewCouncilSafe'
  | 'registryCommunity__isKickEnabled'
  | 'registryCommunity__registerStakeAmount'
  | 'registryCommunity__registerToken'
  | 'registryCommunity__alloAddress'
  | 'registryCommunity__isValid'
  | 'registryCommunity__archived'
  | 'registryCommunity__membersCount'
  | 'config'
  | 'config__id'
  | 'config__D'
  | 'config__decay'
  | 'config__maxRatio'
  | 'config__minThresholdPoints'
  | 'config__weight'
  | 'config__proposalType'
  | 'config__pointSystem'
  | 'config__maxAmount'
  | 'config__superfluidToken'
  | 'proposals'
  | 'memberActive'
  | 'maxCVSupply'
  | 'totalEffectiveActivePoints'
  | 'isEnabled'
  | 'token'
  | 'sybil'
  | 'sybil__id'
  | 'sybil__type'
  | 'archived';

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

export type CollateralVaultDeposit_orderBy =
  | 'id'
  | 'collateralVault'
  | 'collateralVault__id'
  | 'amount'
  | 'depositor'
  | 'createdAt'
  | 'proposalId'
  | 'withdrawnAt'
  | 'withdrawnTo';

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

export type CollateralVault_orderBy =
  | 'id'
  | 'strategy'
  | 'strategy__id'
  | 'strategy__poolId'
  | 'strategy__metadataHash'
  | 'strategy__maxCVSupply'
  | 'strategy__totalEffectiveActivePoints'
  | 'strategy__isEnabled'
  | 'strategy__token'
  | 'strategy__archived'
  | 'collaterals';

export type Covenant = {
  id: Scalars['ID']['output'];
  text?: Maybe<Scalars['String']['output']>;
};

export type Covenant_filter = {
  id?: InputMaybe<Scalars['ID']['input']>;
  id_not?: InputMaybe<Scalars['ID']['input']>;
  id_gt?: InputMaybe<Scalars['ID']['input']>;
  id_lt?: InputMaybe<Scalars['ID']['input']>;
  id_gte?: InputMaybe<Scalars['ID']['input']>;
  id_lte?: InputMaybe<Scalars['ID']['input']>;
  id_in?: InputMaybe<Array<Scalars['ID']['input']>>;
  id_not_in?: InputMaybe<Array<Scalars['ID']['input']>>;
  text?: InputMaybe<Scalars['String']['input']>;
  text_not?: InputMaybe<Scalars['String']['input']>;
  text_gt?: InputMaybe<Scalars['String']['input']>;
  text_lt?: InputMaybe<Scalars['String']['input']>;
  text_gte?: InputMaybe<Scalars['String']['input']>;
  text_lte?: InputMaybe<Scalars['String']['input']>;
  text_in?: InputMaybe<Array<Scalars['String']['input']>>;
  text_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
  text_contains?: InputMaybe<Scalars['String']['input']>;
  text_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  text_not_contains?: InputMaybe<Scalars['String']['input']>;
  text_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  text_starts_with?: InputMaybe<Scalars['String']['input']>;
  text_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  text_not_starts_with?: InputMaybe<Scalars['String']['input']>;
  text_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  text_ends_with?: InputMaybe<Scalars['String']['input']>;
  text_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  text_not_ends_with?: InputMaybe<Scalars['String']['input']>;
  text_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  /** Filter for the block changed event. */
  _change_block?: InputMaybe<BlockChangedFilter>;
  and?: InputMaybe<Array<InputMaybe<Covenant_filter>>>;
  or?: InputMaybe<Array<InputMaybe<Covenant_filter>>>;
};

export type Covenant_orderBy =
  | 'id'
  | 'text';

export type GoodDollarStrategy = {
  id: Scalars['ID']['output'];
  sybilProtection: SybilProtection;
  strategy: CVStrategy;
  councilSafe: Scalars['String']['output'];
  active: Scalars['Boolean']['output'];
};

export type GoodDollarStrategy_filter = {
  id?: InputMaybe<Scalars['ID']['input']>;
  id_not?: InputMaybe<Scalars['ID']['input']>;
  id_gt?: InputMaybe<Scalars['ID']['input']>;
  id_lt?: InputMaybe<Scalars['ID']['input']>;
  id_gte?: InputMaybe<Scalars['ID']['input']>;
  id_lte?: InputMaybe<Scalars['ID']['input']>;
  id_in?: InputMaybe<Array<Scalars['ID']['input']>>;
  id_not_in?: InputMaybe<Array<Scalars['ID']['input']>>;
  sybilProtection?: InputMaybe<Scalars['String']['input']>;
  sybilProtection_not?: InputMaybe<Scalars['String']['input']>;
  sybilProtection_gt?: InputMaybe<Scalars['String']['input']>;
  sybilProtection_lt?: InputMaybe<Scalars['String']['input']>;
  sybilProtection_gte?: InputMaybe<Scalars['String']['input']>;
  sybilProtection_lte?: InputMaybe<Scalars['String']['input']>;
  sybilProtection_in?: InputMaybe<Array<Scalars['String']['input']>>;
  sybilProtection_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
  sybilProtection_contains?: InputMaybe<Scalars['String']['input']>;
  sybilProtection_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  sybilProtection_not_contains?: InputMaybe<Scalars['String']['input']>;
  sybilProtection_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  sybilProtection_starts_with?: InputMaybe<Scalars['String']['input']>;
  sybilProtection_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  sybilProtection_not_starts_with?: InputMaybe<Scalars['String']['input']>;
  sybilProtection_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  sybilProtection_ends_with?: InputMaybe<Scalars['String']['input']>;
  sybilProtection_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  sybilProtection_not_ends_with?: InputMaybe<Scalars['String']['input']>;
  sybilProtection_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  sybilProtection_?: InputMaybe<SybilProtection_filter>;
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
  and?: InputMaybe<Array<InputMaybe<GoodDollarStrategy_filter>>>;
  or?: InputMaybe<Array<InputMaybe<GoodDollarStrategy_filter>>>;
};

export type GoodDollarStrategy_orderBy =
  | 'id'
  | 'sybilProtection'
  | 'sybilProtection__id'
  | 'sybilProtection__type'
  | 'strategy'
  | 'strategy__id'
  | 'strategy__poolId'
  | 'strategy__metadataHash'
  | 'strategy__maxCVSupply'
  | 'strategy__totalEffectiveActivePoints'
  | 'strategy__isEnabled'
  | 'strategy__token'
  | 'strategy__archived'
  | 'councilSafe'
  | 'active';

export type GoodDollarUser = {
  id: Scalars['ID']['output'];
  sybilProtection: SybilProtection;
  verified: Scalars['Boolean']['output'];
  userAddress: Scalars['String']['output'];
  lastUpdated: Scalars['BigInt']['output'];
};

export type GoodDollarUser_filter = {
  id?: InputMaybe<Scalars['ID']['input']>;
  id_not?: InputMaybe<Scalars['ID']['input']>;
  id_gt?: InputMaybe<Scalars['ID']['input']>;
  id_lt?: InputMaybe<Scalars['ID']['input']>;
  id_gte?: InputMaybe<Scalars['ID']['input']>;
  id_lte?: InputMaybe<Scalars['ID']['input']>;
  id_in?: InputMaybe<Array<Scalars['ID']['input']>>;
  id_not_in?: InputMaybe<Array<Scalars['ID']['input']>>;
  sybilProtection?: InputMaybe<Scalars['String']['input']>;
  sybilProtection_not?: InputMaybe<Scalars['String']['input']>;
  sybilProtection_gt?: InputMaybe<Scalars['String']['input']>;
  sybilProtection_lt?: InputMaybe<Scalars['String']['input']>;
  sybilProtection_gte?: InputMaybe<Scalars['String']['input']>;
  sybilProtection_lte?: InputMaybe<Scalars['String']['input']>;
  sybilProtection_in?: InputMaybe<Array<Scalars['String']['input']>>;
  sybilProtection_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
  sybilProtection_contains?: InputMaybe<Scalars['String']['input']>;
  sybilProtection_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  sybilProtection_not_contains?: InputMaybe<Scalars['String']['input']>;
  sybilProtection_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  sybilProtection_starts_with?: InputMaybe<Scalars['String']['input']>;
  sybilProtection_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  sybilProtection_not_starts_with?: InputMaybe<Scalars['String']['input']>;
  sybilProtection_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  sybilProtection_ends_with?: InputMaybe<Scalars['String']['input']>;
  sybilProtection_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  sybilProtection_not_ends_with?: InputMaybe<Scalars['String']['input']>;
  sybilProtection_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  sybilProtection_?: InputMaybe<SybilProtection_filter>;
  verified?: InputMaybe<Scalars['Boolean']['input']>;
  verified_not?: InputMaybe<Scalars['Boolean']['input']>;
  verified_in?: InputMaybe<Array<Scalars['Boolean']['input']>>;
  verified_not_in?: InputMaybe<Array<Scalars['Boolean']['input']>>;
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
  and?: InputMaybe<Array<InputMaybe<GoodDollarUser_filter>>>;
  or?: InputMaybe<Array<InputMaybe<GoodDollarUser_filter>>>;
};

export type GoodDollarUser_orderBy =
  | 'id'
  | 'sybilProtection'
  | 'sybilProtection__id'
  | 'sybilProtection__type'
  | 'verified'
  | 'userAddress'
  | 'lastUpdated';

export type Member = {
  id: Scalars['ID']['output'];
  memberCommunity?: Maybe<Array<MemberCommunity>>;
  stakes?: Maybe<Array<Stake>>;
  isProtopian?: Maybe<Scalars['Boolean']['output']>;
  isKeeper?: Maybe<Scalars['Boolean']['output']>;
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

export type MemberCommunity_orderBy =
  | 'id'
  | 'memberAddress'
  | 'stakedTokens'
  | 'isRegistered'
  | 'member'
  | 'member__id'
  | 'member__isProtopian'
  | 'member__isKeeper'
  | 'registryCommunity'
  | 'registryCommunity__id'
  | 'registryCommunity__chainId'
  | 'registryCommunity__strategyTemplate'
  | 'registryCommunity__profileId'
  | 'registryCommunity__communityFee'
  | 'registryCommunity__protocolFee'
  | 'registryCommunity__protocolFeeReceiver'
  | 'registryCommunity__communityName'
  | 'registryCommunity__covenantIpfsHash'
  | 'registryCommunity__councilSafe'
  | 'registryCommunity__pendingNewCouncilSafe'
  | 'registryCommunity__isKickEnabled'
  | 'registryCommunity__registerStakeAmount'
  | 'registryCommunity__registerToken'
  | 'registryCommunity__alloAddress'
  | 'registryCommunity__isValid'
  | 'registryCommunity__archived'
  | 'registryCommunity__membersCount'
  | 'covenantSignature';

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

export type MemberStrategy_orderBy =
  | 'id'
  | 'member'
  | 'member__id'
  | 'member__isProtopian'
  | 'member__isKeeper'
  | 'strategy'
  | 'strategy__id'
  | 'strategy__poolId'
  | 'strategy__metadataHash'
  | 'strategy__maxCVSupply'
  | 'strategy__totalEffectiveActivePoints'
  | 'strategy__isEnabled'
  | 'strategy__token'
  | 'strategy__archived'
  | 'totalStakedPoints'
  | 'activatedPoints';

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
  isProtopian?: InputMaybe<Scalars['Boolean']['input']>;
  isProtopian_not?: InputMaybe<Scalars['Boolean']['input']>;
  isProtopian_in?: InputMaybe<Array<Scalars['Boolean']['input']>>;
  isProtopian_not_in?: InputMaybe<Array<Scalars['Boolean']['input']>>;
  isKeeper?: InputMaybe<Scalars['Boolean']['input']>;
  isKeeper_not?: InputMaybe<Scalars['Boolean']['input']>;
  isKeeper_in?: InputMaybe<Array<Scalars['Boolean']['input']>>;
  isKeeper_not_in?: InputMaybe<Array<Scalars['Boolean']['input']>>;
  /** Filter for the block changed event. */
  _change_block?: InputMaybe<BlockChangedFilter>;
  and?: InputMaybe<Array<InputMaybe<Member_filter>>>;
  or?: InputMaybe<Array<InputMaybe<Member_filter>>>;
};

export type Member_orderBy =
  | 'id'
  | 'memberCommunity'
  | 'stakes'
  | 'isProtopian'
  | 'isKeeper';

/** Defines the order direction, either ascending or descending */
export type OrderDirection =
  | 'asc'
  | 'desc';

export type PassportStrategy = {
  id: Scalars['ID']['output'];
  passportScorer: SybilProtection;
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
  passportScorer_?: InputMaybe<SybilProtection_filter>;
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

export type PassportStrategy_orderBy =
  | 'id'
  | 'passportScorer'
  | 'passportScorer__id'
  | 'passportScorer__type'
  | 'strategy'
  | 'strategy__id'
  | 'strategy__poolId'
  | 'strategy__metadataHash'
  | 'strategy__maxCVSupply'
  | 'strategy__totalEffectiveActivePoints'
  | 'strategy__isEnabled'
  | 'strategy__token'
  | 'strategy__archived'
  | 'threshold'
  | 'councilSafe'
  | 'active';

export type PassportUser = {
  id: Scalars['ID']['output'];
  passportScorer: SybilProtection;
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
  passportScorer_?: InputMaybe<SybilProtection_filter>;
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

export type PassportUser_orderBy =
  | 'id'
  | 'passportScorer'
  | 'passportScorer__id'
  | 'passportScorer__type'
  | 'userAddress'
  | 'score'
  | 'lastUpdated';

export type PoolMetadata = {
  id: Scalars['ID']['output'];
  title?: Maybe<Scalars['String']['output']>;
  description?: Maybe<Scalars['String']['output']>;
};

export type PoolMetadata_filter = {
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
  and?: InputMaybe<Array<InputMaybe<PoolMetadata_filter>>>;
  or?: InputMaybe<Array<InputMaybe<PoolMetadata_filter>>>;
};

export type PoolMetadata_orderBy =
  | 'id'
  | 'title'
  | 'description';

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
  reason?: Maybe<Scalars['String']['output']>;
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

export type ProposalDisputeMetadata_orderBy =
  | 'id'
  | 'reason';

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

export type ProposalDispute_orderBy =
  | 'id'
  | 'createdAt'
  | 'disputeId'
  | 'proposal'
  | 'proposal__id'
  | 'proposal__proposalNumber'
  | 'proposal__metadataHash'
  | 'proposal__version'
  | 'proposal__beneficiary'
  | 'proposal__requestedAmount'
  | 'proposal__requestedToken'
  | 'proposal__proposalStatus'
  | 'proposal__blockLast'
  | 'proposal__convictionLast'
  | 'proposal__maxCVStaked'
  | 'proposal__stakedAmount'
  | 'proposal__submitter'
  | 'proposal__createdAt'
  | 'proposal__updatedAt'
  | 'proposal__executedAt'
  | 'status'
  | 'challenger'
  | 'context'
  | 'metadata'
  | 'metadata__id'
  | 'metadata__reason'
  | 'rulingOutcome'
  | 'ruledAt';

export type ProposalMetadata = {
  id: Scalars['ID']['output'];
  title?: Maybe<Scalars['String']['output']>;
  description?: Maybe<Scalars['String']['output']>;
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

export type ProposalMetadata_orderBy =
  | 'id'
  | 'title'
  | 'description';

export type Query = {
  cvstrategy?: Maybe<CVStrategy>;
  cvstrategies: Array<CVStrategy>;
  cvstrategyConfig?: Maybe<CVStrategyConfig>;
  cvstrategyConfigs: Array<CVStrategyConfig>;
  streamingInfo?: Maybe<StreamingInfo>;
  streamingInfos: Array<StreamingInfo>;
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
  covenant?: Maybe<Covenant>;
  covenants: Array<Covenant>;
  allo?: Maybe<Allo>;
  allos: Array<Allo>;
  sybilProtection?: Maybe<SybilProtection>;
  sybilProtections: Array<SybilProtection>;
  passportStrategy?: Maybe<PassportStrategy>;
  passportStrategies: Array<PassportStrategy>;
  goodDollarStrategy?: Maybe<GoodDollarStrategy>;
  goodDollarStrategies: Array<GoodDollarStrategy>;
  passportUser?: Maybe<PassportUser>;
  passportUsers: Array<PassportUser>;
  goodDollarUser?: Maybe<GoodDollarUser>;
  goodDollarUsers: Array<GoodDollarUser>;
  proposalDispute?: Maybe<ProposalDispute>;
  proposalDisputes: Array<ProposalDispute>;
  proposalDisputeMetadata?: Maybe<ProposalDisputeMetadata>;
  proposalDisputeMetadata_collection: Array<ProposalDisputeMetadata>;
  proposalMetadata?: Maybe<ProposalMetadata>;
  proposalMetadata_collection: Array<ProposalMetadata>;
  poolMetadata?: Maybe<PoolMetadata>;
  poolMetadata_collection: Array<PoolMetadata>;
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


export type QuerystreamingInfoArgs = {
  id: Scalars['ID']['input'];
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type QuerystreamingInfosArgs = {
  skip?: InputMaybe<Scalars['Int']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<StreamingInfo_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<StreamingInfo_filter>;
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


export type QuerycovenantArgs = {
  id: Scalars['ID']['input'];
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type QuerycovenantsArgs = {
  skip?: InputMaybe<Scalars['Int']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<Covenant_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<Covenant_filter>;
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


export type QuerysybilProtectionArgs = {
  id: Scalars['ID']['input'];
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type QuerysybilProtectionsArgs = {
  skip?: InputMaybe<Scalars['Int']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<SybilProtection_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<SybilProtection_filter>;
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


export type QuerygoodDollarStrategyArgs = {
  id: Scalars['ID']['input'];
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type QuerygoodDollarStrategiesArgs = {
  skip?: InputMaybe<Scalars['Int']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<GoodDollarStrategy_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<GoodDollarStrategy_filter>;
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


export type QuerygoodDollarUserArgs = {
  id: Scalars['ID']['input'];
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type QuerygoodDollarUsersArgs = {
  skip?: InputMaybe<Scalars['Int']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<GoodDollarUser_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<GoodDollarUser_filter>;
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


export type QuerypoolMetadataArgs = {
  id: Scalars['ID']['input'];
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type QuerypoolMetadata_collectionArgs = {
  skip?: InputMaybe<Scalars['Int']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<PoolMetadata_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<PoolMetadata_filter>;
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
  covenant?: Maybe<Covenant>;
  registryFactory?: Maybe<RegistryFactory>;
  strategies?: Maybe<Array<CVStrategy>>;
  councilSafe?: Maybe<Scalars['String']['output']>;
  pendingNewCouncilSafe?: Maybe<Scalars['String']['output']>;
  isKickEnabled?: Maybe<Scalars['Boolean']['output']>;
  registerStakeAmount?: Maybe<Scalars['BigInt']['output']>;
  registerToken?: Maybe<Scalars['String']['output']>;
  alloAddress?: Maybe<Scalars['String']['output']>;
  members?: Maybe<Array<MemberCommunity>>;
  garden: TokenGarden;
  isValid: Scalars['Boolean']['output'];
  archived: Scalars['Boolean']['output'];
  membersCount: Scalars['BigInt']['output'];
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
  covenant?: InputMaybe<Scalars['String']['input']>;
  covenant_not?: InputMaybe<Scalars['String']['input']>;
  covenant_gt?: InputMaybe<Scalars['String']['input']>;
  covenant_lt?: InputMaybe<Scalars['String']['input']>;
  covenant_gte?: InputMaybe<Scalars['String']['input']>;
  covenant_lte?: InputMaybe<Scalars['String']['input']>;
  covenant_in?: InputMaybe<Array<Scalars['String']['input']>>;
  covenant_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
  covenant_contains?: InputMaybe<Scalars['String']['input']>;
  covenant_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  covenant_not_contains?: InputMaybe<Scalars['String']['input']>;
  covenant_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  covenant_starts_with?: InputMaybe<Scalars['String']['input']>;
  covenant_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  covenant_not_starts_with?: InputMaybe<Scalars['String']['input']>;
  covenant_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  covenant_ends_with?: InputMaybe<Scalars['String']['input']>;
  covenant_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  covenant_not_ends_with?: InputMaybe<Scalars['String']['input']>;
  covenant_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  covenant_?: InputMaybe<Covenant_filter>;
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
  archived?: InputMaybe<Scalars['Boolean']['input']>;
  archived_not?: InputMaybe<Scalars['Boolean']['input']>;
  archived_in?: InputMaybe<Array<Scalars['Boolean']['input']>>;
  archived_not_in?: InputMaybe<Array<Scalars['Boolean']['input']>>;
  membersCount?: InputMaybe<Scalars['BigInt']['input']>;
  membersCount_not?: InputMaybe<Scalars['BigInt']['input']>;
  membersCount_gt?: InputMaybe<Scalars['BigInt']['input']>;
  membersCount_lt?: InputMaybe<Scalars['BigInt']['input']>;
  membersCount_gte?: InputMaybe<Scalars['BigInt']['input']>;
  membersCount_lte?: InputMaybe<Scalars['BigInt']['input']>;
  membersCount_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  membersCount_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  /** Filter for the block changed event. */
  _change_block?: InputMaybe<BlockChangedFilter>;
  and?: InputMaybe<Array<InputMaybe<RegistryCommunity_filter>>>;
  or?: InputMaybe<Array<InputMaybe<RegistryCommunity_filter>>>;
};

export type RegistryCommunity_orderBy =
  | 'id'
  | 'chainId'
  | 'strategyTemplate'
  | 'profileId'
  | 'communityFee'
  | 'protocolFee'
  | 'protocolFeeReceiver'
  | 'communityName'
  | 'covenantIpfsHash'
  | 'covenant'
  | 'covenant__id'
  | 'covenant__text'
  | 'registryFactory'
  | 'registryFactory__id'
  | 'registryFactory__chainId'
  | 'strategies'
  | 'councilSafe'
  | 'pendingNewCouncilSafe'
  | 'isKickEnabled'
  | 'registerStakeAmount'
  | 'registerToken'
  | 'alloAddress'
  | 'members'
  | 'garden'
  | 'garden__id'
  | 'garden__name'
  | 'garden__description'
  | 'garden__chainId'
  | 'garden__totalBalance'
  | 'garden__ipfsCovenant'
  | 'garden__symbol'
  | 'garden__decimals'
  | 'garden__address'
  | 'isValid'
  | 'archived'
  | 'membersCount';

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

export type RegistryFactory_orderBy =
  | 'id'
  | 'chainId'
  | 'registryCommunities';

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

export type Stake_orderBy =
  | 'id'
  | 'member'
  | 'member__id'
  | 'member__isProtopian'
  | 'member__isKeeper'
  | 'poolId'
  | 'proposal'
  | 'proposal__id'
  | 'proposal__proposalNumber'
  | 'proposal__metadataHash'
  | 'proposal__version'
  | 'proposal__beneficiary'
  | 'proposal__requestedAmount'
  | 'proposal__requestedToken'
  | 'proposal__proposalStatus'
  | 'proposal__blockLast'
  | 'proposal__convictionLast'
  | 'proposal__maxCVStaked'
  | 'proposal__stakedAmount'
  | 'proposal__submitter'
  | 'proposal__createdAt'
  | 'proposal__updatedAt'
  | 'proposal__executedAt'
  | 'amount'
  | 'createdAt';

export type StreamingInfo = {
  id: Scalars['ID']['output'];
  contractAddress: Scalars['String']['output'];
  contractType: Scalars['String']['output'];
  strategy?: Maybe<CVStrategy>;
  registryFactory?: Maybe<RegistryFactory>;
  superfluidToken?: Maybe<Scalars['String']['output']>;
  superfluidGDA: Array<Scalars['String']['output']>;
  streamLastStartedGDA?: Maybe<Scalars['String']['output']>;
  streamLastFlowRate?: Maybe<Scalars['BigInt']['output']>;
  streamLastMember?: Maybe<Scalars['String']['output']>;
  streamLastMemberUnit?: Maybe<Scalars['BigInt']['output']>;
  streamingEscrowFactory?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['BigInt']['output'];
  updatedAt: Scalars['BigInt']['output'];
};

export type StreamingInfo_filter = {
  id?: InputMaybe<Scalars['ID']['input']>;
  id_not?: InputMaybe<Scalars['ID']['input']>;
  id_gt?: InputMaybe<Scalars['ID']['input']>;
  id_lt?: InputMaybe<Scalars['ID']['input']>;
  id_gte?: InputMaybe<Scalars['ID']['input']>;
  id_lte?: InputMaybe<Scalars['ID']['input']>;
  id_in?: InputMaybe<Array<Scalars['ID']['input']>>;
  id_not_in?: InputMaybe<Array<Scalars['ID']['input']>>;
  contractAddress?: InputMaybe<Scalars['String']['input']>;
  contractAddress_not?: InputMaybe<Scalars['String']['input']>;
  contractAddress_gt?: InputMaybe<Scalars['String']['input']>;
  contractAddress_lt?: InputMaybe<Scalars['String']['input']>;
  contractAddress_gte?: InputMaybe<Scalars['String']['input']>;
  contractAddress_lte?: InputMaybe<Scalars['String']['input']>;
  contractAddress_in?: InputMaybe<Array<Scalars['String']['input']>>;
  contractAddress_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
  contractAddress_contains?: InputMaybe<Scalars['String']['input']>;
  contractAddress_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  contractAddress_not_contains?: InputMaybe<Scalars['String']['input']>;
  contractAddress_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  contractAddress_starts_with?: InputMaybe<Scalars['String']['input']>;
  contractAddress_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  contractAddress_not_starts_with?: InputMaybe<Scalars['String']['input']>;
  contractAddress_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  contractAddress_ends_with?: InputMaybe<Scalars['String']['input']>;
  contractAddress_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  contractAddress_not_ends_with?: InputMaybe<Scalars['String']['input']>;
  contractAddress_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  contractType?: InputMaybe<Scalars['String']['input']>;
  contractType_not?: InputMaybe<Scalars['String']['input']>;
  contractType_gt?: InputMaybe<Scalars['String']['input']>;
  contractType_lt?: InputMaybe<Scalars['String']['input']>;
  contractType_gte?: InputMaybe<Scalars['String']['input']>;
  contractType_lte?: InputMaybe<Scalars['String']['input']>;
  contractType_in?: InputMaybe<Array<Scalars['String']['input']>>;
  contractType_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
  contractType_contains?: InputMaybe<Scalars['String']['input']>;
  contractType_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  contractType_not_contains?: InputMaybe<Scalars['String']['input']>;
  contractType_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  contractType_starts_with?: InputMaybe<Scalars['String']['input']>;
  contractType_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  contractType_not_starts_with?: InputMaybe<Scalars['String']['input']>;
  contractType_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  contractType_ends_with?: InputMaybe<Scalars['String']['input']>;
  contractType_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  contractType_not_ends_with?: InputMaybe<Scalars['String']['input']>;
  contractType_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
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
  superfluidToken?: InputMaybe<Scalars['String']['input']>;
  superfluidToken_not?: InputMaybe<Scalars['String']['input']>;
  superfluidToken_gt?: InputMaybe<Scalars['String']['input']>;
  superfluidToken_lt?: InputMaybe<Scalars['String']['input']>;
  superfluidToken_gte?: InputMaybe<Scalars['String']['input']>;
  superfluidToken_lte?: InputMaybe<Scalars['String']['input']>;
  superfluidToken_in?: InputMaybe<Array<Scalars['String']['input']>>;
  superfluidToken_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
  superfluidToken_contains?: InputMaybe<Scalars['String']['input']>;
  superfluidToken_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  superfluidToken_not_contains?: InputMaybe<Scalars['String']['input']>;
  superfluidToken_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  superfluidToken_starts_with?: InputMaybe<Scalars['String']['input']>;
  superfluidToken_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  superfluidToken_not_starts_with?: InputMaybe<Scalars['String']['input']>;
  superfluidToken_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  superfluidToken_ends_with?: InputMaybe<Scalars['String']['input']>;
  superfluidToken_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  superfluidToken_not_ends_with?: InputMaybe<Scalars['String']['input']>;
  superfluidToken_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  superfluidGDA?: InputMaybe<Array<Scalars['String']['input']>>;
  superfluidGDA_not?: InputMaybe<Array<Scalars['String']['input']>>;
  superfluidGDA_contains?: InputMaybe<Array<Scalars['String']['input']>>;
  superfluidGDA_contains_nocase?: InputMaybe<Array<Scalars['String']['input']>>;
  superfluidGDA_not_contains?: InputMaybe<Array<Scalars['String']['input']>>;
  superfluidGDA_not_contains_nocase?: InputMaybe<Array<Scalars['String']['input']>>;
  streamLastStartedGDA?: InputMaybe<Scalars['String']['input']>;
  streamLastStartedGDA_not?: InputMaybe<Scalars['String']['input']>;
  streamLastStartedGDA_gt?: InputMaybe<Scalars['String']['input']>;
  streamLastStartedGDA_lt?: InputMaybe<Scalars['String']['input']>;
  streamLastStartedGDA_gte?: InputMaybe<Scalars['String']['input']>;
  streamLastStartedGDA_lte?: InputMaybe<Scalars['String']['input']>;
  streamLastStartedGDA_in?: InputMaybe<Array<Scalars['String']['input']>>;
  streamLastStartedGDA_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
  streamLastStartedGDA_contains?: InputMaybe<Scalars['String']['input']>;
  streamLastStartedGDA_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  streamLastStartedGDA_not_contains?: InputMaybe<Scalars['String']['input']>;
  streamLastStartedGDA_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  streamLastStartedGDA_starts_with?: InputMaybe<Scalars['String']['input']>;
  streamLastStartedGDA_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  streamLastStartedGDA_not_starts_with?: InputMaybe<Scalars['String']['input']>;
  streamLastStartedGDA_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  streamLastStartedGDA_ends_with?: InputMaybe<Scalars['String']['input']>;
  streamLastStartedGDA_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  streamLastStartedGDA_not_ends_with?: InputMaybe<Scalars['String']['input']>;
  streamLastStartedGDA_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  streamLastFlowRate?: InputMaybe<Scalars['BigInt']['input']>;
  streamLastFlowRate_not?: InputMaybe<Scalars['BigInt']['input']>;
  streamLastFlowRate_gt?: InputMaybe<Scalars['BigInt']['input']>;
  streamLastFlowRate_lt?: InputMaybe<Scalars['BigInt']['input']>;
  streamLastFlowRate_gte?: InputMaybe<Scalars['BigInt']['input']>;
  streamLastFlowRate_lte?: InputMaybe<Scalars['BigInt']['input']>;
  streamLastFlowRate_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  streamLastFlowRate_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  streamLastMember?: InputMaybe<Scalars['String']['input']>;
  streamLastMember_not?: InputMaybe<Scalars['String']['input']>;
  streamLastMember_gt?: InputMaybe<Scalars['String']['input']>;
  streamLastMember_lt?: InputMaybe<Scalars['String']['input']>;
  streamLastMember_gte?: InputMaybe<Scalars['String']['input']>;
  streamLastMember_lte?: InputMaybe<Scalars['String']['input']>;
  streamLastMember_in?: InputMaybe<Array<Scalars['String']['input']>>;
  streamLastMember_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
  streamLastMember_contains?: InputMaybe<Scalars['String']['input']>;
  streamLastMember_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  streamLastMember_not_contains?: InputMaybe<Scalars['String']['input']>;
  streamLastMember_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  streamLastMember_starts_with?: InputMaybe<Scalars['String']['input']>;
  streamLastMember_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  streamLastMember_not_starts_with?: InputMaybe<Scalars['String']['input']>;
  streamLastMember_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  streamLastMember_ends_with?: InputMaybe<Scalars['String']['input']>;
  streamLastMember_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  streamLastMember_not_ends_with?: InputMaybe<Scalars['String']['input']>;
  streamLastMember_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  streamLastMemberUnit?: InputMaybe<Scalars['BigInt']['input']>;
  streamLastMemberUnit_not?: InputMaybe<Scalars['BigInt']['input']>;
  streamLastMemberUnit_gt?: InputMaybe<Scalars['BigInt']['input']>;
  streamLastMemberUnit_lt?: InputMaybe<Scalars['BigInt']['input']>;
  streamLastMemberUnit_gte?: InputMaybe<Scalars['BigInt']['input']>;
  streamLastMemberUnit_lte?: InputMaybe<Scalars['BigInt']['input']>;
  streamLastMemberUnit_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  streamLastMemberUnit_not_in?: InputMaybe<Array<Scalars['BigInt']['input']>>;
  streamingEscrowFactory?: InputMaybe<Scalars['String']['input']>;
  streamingEscrowFactory_not?: InputMaybe<Scalars['String']['input']>;
  streamingEscrowFactory_gt?: InputMaybe<Scalars['String']['input']>;
  streamingEscrowFactory_lt?: InputMaybe<Scalars['String']['input']>;
  streamingEscrowFactory_gte?: InputMaybe<Scalars['String']['input']>;
  streamingEscrowFactory_lte?: InputMaybe<Scalars['String']['input']>;
  streamingEscrowFactory_in?: InputMaybe<Array<Scalars['String']['input']>>;
  streamingEscrowFactory_not_in?: InputMaybe<Array<Scalars['String']['input']>>;
  streamingEscrowFactory_contains?: InputMaybe<Scalars['String']['input']>;
  streamingEscrowFactory_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  streamingEscrowFactory_not_contains?: InputMaybe<Scalars['String']['input']>;
  streamingEscrowFactory_not_contains_nocase?: InputMaybe<Scalars['String']['input']>;
  streamingEscrowFactory_starts_with?: InputMaybe<Scalars['String']['input']>;
  streamingEscrowFactory_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  streamingEscrowFactory_not_starts_with?: InputMaybe<Scalars['String']['input']>;
  streamingEscrowFactory_not_starts_with_nocase?: InputMaybe<Scalars['String']['input']>;
  streamingEscrowFactory_ends_with?: InputMaybe<Scalars['String']['input']>;
  streamingEscrowFactory_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
  streamingEscrowFactory_not_ends_with?: InputMaybe<Scalars['String']['input']>;
  streamingEscrowFactory_not_ends_with_nocase?: InputMaybe<Scalars['String']['input']>;
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
  /** Filter for the block changed event. */
  _change_block?: InputMaybe<BlockChangedFilter>;
  and?: InputMaybe<Array<InputMaybe<StreamingInfo_filter>>>;
  or?: InputMaybe<Array<InputMaybe<StreamingInfo_filter>>>;
};

export type StreamingInfo_orderBy =
  | 'id'
  | 'contractAddress'
  | 'contractType'
  | 'strategy'
  | 'strategy__id'
  | 'strategy__poolId'
  | 'strategy__metadataHash'
  | 'strategy__maxCVSupply'
  | 'strategy__totalEffectiveActivePoints'
  | 'strategy__isEnabled'
  | 'strategy__token'
  | 'strategy__archived'
  | 'registryFactory'
  | 'registryFactory__id'
  | 'registryFactory__chainId'
  | 'superfluidToken'
  | 'superfluidGDA'
  | 'streamLastStartedGDA'
  | 'streamLastFlowRate'
  | 'streamLastMember'
  | 'streamLastMemberUnit'
  | 'streamingEscrowFactory'
  | 'createdAt'
  | 'updatedAt';

export type SybilProtection = {
  id: Scalars['ID']['output'];
  type: SybilProtectionType;
  strategies?: Maybe<Array<PassportStrategy>>;
  users?: Maybe<Array<PassportUser>>;
};


export type SybilProtectionstrategiesArgs = {
  skip?: InputMaybe<Scalars['Int']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<PassportStrategy_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<PassportStrategy_filter>;
};


export type SybilProtectionusersArgs = {
  skip?: InputMaybe<Scalars['Int']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  orderBy?: InputMaybe<PassportUser_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<PassportUser_filter>;
};

export type SybilProtectionType =
  | 'GoodDollar'
  | 'Passport';

export type SybilProtection_filter = {
  id?: InputMaybe<Scalars['ID']['input']>;
  id_not?: InputMaybe<Scalars['ID']['input']>;
  id_gt?: InputMaybe<Scalars['ID']['input']>;
  id_lt?: InputMaybe<Scalars['ID']['input']>;
  id_gte?: InputMaybe<Scalars['ID']['input']>;
  id_lte?: InputMaybe<Scalars['ID']['input']>;
  id_in?: InputMaybe<Array<Scalars['ID']['input']>>;
  id_not_in?: InputMaybe<Array<Scalars['ID']['input']>>;
  type?: InputMaybe<SybilProtectionType>;
  type_not?: InputMaybe<SybilProtectionType>;
  type_in?: InputMaybe<Array<SybilProtectionType>>;
  type_not_in?: InputMaybe<Array<SybilProtectionType>>;
  strategies_?: InputMaybe<PassportStrategy_filter>;
  users_?: InputMaybe<PassportUser_filter>;
  /** Filter for the block changed event. */
  _change_block?: InputMaybe<BlockChangedFilter>;
  and?: InputMaybe<Array<InputMaybe<SybilProtection_filter>>>;
  or?: InputMaybe<Array<InputMaybe<SybilProtection_filter>>>;
};

export type SybilProtection_orderBy =
  | 'id'
  | 'type'
  | 'strategies'
  | 'users';

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

export type TokenGarden_orderBy =
  | 'id'
  | 'name'
  | 'description'
  | 'chainId'
  | 'totalBalance'
  | 'ipfsCovenant'
  | 'symbol'
  | 'decimals'
  | 'address'
  | 'communities';

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
   */
  block: _Block_;
  /** The deployment ID */
  deployment: Scalars['String']['output'];
  /** If `true`, the subgraph encountered indexing errors at some past block */
  hasIndexingErrors: Scalars['Boolean']['output'];
};

export type _SubgraphErrorPolicy_ =
  /** Data will be returned even if the subgraph has indexing errors */
  | 'allow'
  /** If the subgraph has indexing errors, data will be omitted. The default. */
  | 'deny';

  export type QuerySdk = {
      /** null **/
  cvstrategy: InContextSdkMethod<Query['cvstrategy'], QuerycvstrategyArgs, MeshContext>,
  /** null **/
  cvstrategies: InContextSdkMethod<Query['cvstrategies'], QuerycvstrategiesArgs, MeshContext>,
  /** null **/
  cvstrategyConfig: InContextSdkMethod<Query['cvstrategyConfig'], QuerycvstrategyConfigArgs, MeshContext>,
  /** null **/
  cvstrategyConfigs: InContextSdkMethod<Query['cvstrategyConfigs'], QuerycvstrategyConfigsArgs, MeshContext>,
  /** null **/
  streamingInfo: InContextSdkMethod<Query['streamingInfo'], QuerystreamingInfoArgs, MeshContext>,
  /** null **/
  streamingInfos: InContextSdkMethod<Query['streamingInfos'], QuerystreamingInfosArgs, MeshContext>,
  /** null **/
  arbitrableConfig: InContextSdkMethod<Query['arbitrableConfig'], QueryarbitrableConfigArgs, MeshContext>,
  /** null **/
  arbitrableConfigs: InContextSdkMethod<Query['arbitrableConfigs'], QueryarbitrableConfigsArgs, MeshContext>,
  /** null **/
  cvproposal: InContextSdkMethod<Query['cvproposal'], QuerycvproposalArgs, MeshContext>,
  /** null **/
  cvproposals: InContextSdkMethod<Query['cvproposals'], QuerycvproposalsArgs, MeshContext>,
  /** null **/
  registryFactory: InContextSdkMethod<Query['registryFactory'], QueryregistryFactoryArgs, MeshContext>,
  /** null **/
  registryFactories: InContextSdkMethod<Query['registryFactories'], QueryregistryFactoriesArgs, MeshContext>,
  /** null **/
  registryCommunity: InContextSdkMethod<Query['registryCommunity'], QueryregistryCommunityArgs, MeshContext>,
  /** null **/
  registryCommunities: InContextSdkMethod<Query['registryCommunities'], QueryregistryCommunitiesArgs, MeshContext>,
  /** null **/
  member: InContextSdkMethod<Query['member'], QuerymemberArgs, MeshContext>,
  /** null **/
  members: InContextSdkMethod<Query['members'], QuerymembersArgs, MeshContext>,
  /** null **/
  stake: InContextSdkMethod<Query['stake'], QuerystakeArgs, MeshContext>,
  /** null **/
  stakes: InContextSdkMethod<Query['stakes'], QuerystakesArgs, MeshContext>,
  /** null **/
  memberCommunity: InContextSdkMethod<Query['memberCommunity'], QuerymemberCommunityArgs, MeshContext>,
  /** null **/
  memberCommunities: InContextSdkMethod<Query['memberCommunities'], QuerymemberCommunitiesArgs, MeshContext>,
  /** null **/
  memberStrategy: InContextSdkMethod<Query['memberStrategy'], QuerymemberStrategyArgs, MeshContext>,
  /** null **/
  memberStrategies: InContextSdkMethod<Query['memberStrategies'], QuerymemberStrategiesArgs, MeshContext>,
  /** null **/
  tokenGarden: InContextSdkMethod<Query['tokenGarden'], QuerytokenGardenArgs, MeshContext>,
  /** null **/
  tokenGardens: InContextSdkMethod<Query['tokenGardens'], QuerytokenGardensArgs, MeshContext>,
  /** null **/
  covenant: InContextSdkMethod<Query['covenant'], QuerycovenantArgs, MeshContext>,
  /** null **/
  covenants: InContextSdkMethod<Query['covenants'], QuerycovenantsArgs, MeshContext>,
  /** null **/
  allo: InContextSdkMethod<Query['allo'], QueryalloArgs, MeshContext>,
  /** null **/
  allos: InContextSdkMethod<Query['allos'], QueryallosArgs, MeshContext>,
  /** null **/
  sybilProtection: InContextSdkMethod<Query['sybilProtection'], QuerysybilProtectionArgs, MeshContext>,
  /** null **/
  sybilProtections: InContextSdkMethod<Query['sybilProtections'], QuerysybilProtectionsArgs, MeshContext>,
  /** null **/
  passportStrategy: InContextSdkMethod<Query['passportStrategy'], QuerypassportStrategyArgs, MeshContext>,
  /** null **/
  passportStrategies: InContextSdkMethod<Query['passportStrategies'], QuerypassportStrategiesArgs, MeshContext>,
  /** null **/
  goodDollarStrategy: InContextSdkMethod<Query['goodDollarStrategy'], QuerygoodDollarStrategyArgs, MeshContext>,
  /** null **/
  goodDollarStrategies: InContextSdkMethod<Query['goodDollarStrategies'], QuerygoodDollarStrategiesArgs, MeshContext>,
  /** null **/
  passportUser: InContextSdkMethod<Query['passportUser'], QuerypassportUserArgs, MeshContext>,
  /** null **/
  passportUsers: InContextSdkMethod<Query['passportUsers'], QuerypassportUsersArgs, MeshContext>,
  /** null **/
  goodDollarUser: InContextSdkMethod<Query['goodDollarUser'], QuerygoodDollarUserArgs, MeshContext>,
  /** null **/
  goodDollarUsers: InContextSdkMethod<Query['goodDollarUsers'], QuerygoodDollarUsersArgs, MeshContext>,
  /** null **/
  proposalDispute: InContextSdkMethod<Query['proposalDispute'], QueryproposalDisputeArgs, MeshContext>,
  /** null **/
  proposalDisputes: InContextSdkMethod<Query['proposalDisputes'], QueryproposalDisputesArgs, MeshContext>,
  /** null **/
  proposalDisputeMetadata: InContextSdkMethod<Query['proposalDisputeMetadata'], QueryproposalDisputeMetadataArgs, MeshContext>,
  /** null **/
  proposalDisputeMetadata_collection: InContextSdkMethod<Query['proposalDisputeMetadata_collection'], QueryproposalDisputeMetadata_collectionArgs, MeshContext>,
  /** null **/
  proposalMetadata: InContextSdkMethod<Query['proposalMetadata'], QueryproposalMetadataArgs, MeshContext>,
  /** null **/
  proposalMetadata_collection: InContextSdkMethod<Query['proposalMetadata_collection'], QueryproposalMetadata_collectionArgs, MeshContext>,
  /** null **/
  poolMetadata: InContextSdkMethod<Query['poolMetadata'], QuerypoolMetadataArgs, MeshContext>,
  /** null **/
  poolMetadata_collection: InContextSdkMethod<Query['poolMetadata_collection'], QuerypoolMetadata_collectionArgs, MeshContext>,
  /** null **/
  collateralVault: InContextSdkMethod<Query['collateralVault'], QuerycollateralVaultArgs, MeshContext>,
  /** null **/
  collateralVaults: InContextSdkMethod<Query['collateralVaults'], QuerycollateralVaultsArgs, MeshContext>,
  /** null **/
  collateralVaultDeposit: InContextSdkMethod<Query['collateralVaultDeposit'], QuerycollateralVaultDepositArgs, MeshContext>,
  /** null **/
  collateralVaultDeposits: InContextSdkMethod<Query['collateralVaultDeposits'], QuerycollateralVaultDepositsArgs, MeshContext>,
  /** Access to subgraph metadata **/
  _meta: InContextSdkMethod<Query['_meta'], Query_metaArgs, MeshContext>
  };

  export type MutationSdk = {
    
  };

  export type SubscriptionSdk = {
    
  };

  export type Context = {
      ["gv2"]: { Query: QuerySdk, Mutation: MutationSdk, Subscription: SubscriptionSdk },
      
    };
}
