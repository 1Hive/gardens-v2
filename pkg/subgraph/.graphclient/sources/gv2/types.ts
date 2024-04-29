// @ts-nocheck

import { InContextSdkMethod } from '@graphql-mesh/types';
import { MeshContext } from '@graphql-mesh/runtime';

export namespace Gv2Types {
  export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
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

export type Allo_orderBy =
  | 'id'
  | 'chainId'
  | 'tokenNative';

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

export type CVProposal_orderBy =
  | 'id'
  | 'proposalNumber'
  | 'metadata'
  | 'version'
  | 'strategy'
  | 'strategy__id'
  | 'strategy__poolId'
  | 'strategy__poolAmount'
  | 'strategy__metadata'
  | 'strategy__maxCVSupply'
  | 'strategy__totalEffectiveActivePoints'
  | 'beneficiary'
  | 'requestedAmount'
  | 'requestedToken'
  | 'proposalStatus'
  | 'blockLast'
  | 'convictionLast'
  | 'threshold'
  | 'maxCVStaked'
  | 'stakedAmount'
  | 'submitter'
  | 'createdAt'
  | 'updatedAt';

export type CVStrategy = {
  id: Scalars['ID'];
  poolId: Scalars['BigInt'];
  poolAmount?: Maybe<Scalars['BigInt']>;
  metadata?: Maybe<Scalars['String']>;
  registryCommunity: RegistryCommunity;
  config: CVStrategyConfig;
  proposals: Array<CVProposal>;
  memberActive?: Maybe<Array<Member>>;
  maxCVSupply: Scalars['BigInt'];
  totalEffectiveActivePoints: Scalars['BigInt'];
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

export type CVStrategyConfig_orderBy =
  | 'id'
  | 'strategy'
  | 'strategy__id'
  | 'strategy__poolId'
  | 'strategy__poolAmount'
  | 'strategy__metadata'
  | 'strategy__maxCVSupply'
  | 'strategy__totalEffectiveActivePoints'
  | 'D'
  | 'decay'
  | 'maxRatio'
  | 'minThresholdPoints'
  | 'weight'
  | 'proposalType'
  | 'pointSystem'
  | 'maxAmount';

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
  /** Filter for the block changed event. */
  _change_block?: InputMaybe<BlockChangedFilter>;
  and?: InputMaybe<Array<InputMaybe<CVStrategy_filter>>>;
  or?: InputMaybe<Array<InputMaybe<CVStrategy_filter>>>;
};

export type CVStrategy_orderBy =
  | 'id'
  | 'poolId'
  | 'poolAmount'
  | 'metadata'
  | 'registryCommunity'
  | 'registryCommunity__id'
  | 'registryCommunity__chainId'
  | 'registryCommunity__profileId'
  | 'registryCommunity__communityFee'
  | 'registryCommunity__protocolFee'
  | 'registryCommunity__communityName'
  | 'registryCommunity__covenantIpfsHash'
  | 'registryCommunity__councilSafe'
  | 'registryCommunity__isKickEnabled'
  | 'registryCommunity__registerStakeAmount'
  | 'registryCommunity__registerToken'
  | 'registryCommunity__alloAddress'
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
  | 'proposals'
  | 'memberActive'
  | 'maxCVSupply'
  | 'totalEffectiveActivePoints';

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

export type MemberCommunity_orderBy =
  | 'id'
  | 'memberAddress'
  | 'stakedTokens'
  | 'isRegistered'
  | 'member'
  | 'member__id'
  | 'registryCommunity'
  | 'registryCommunity__id'
  | 'registryCommunity__chainId'
  | 'registryCommunity__profileId'
  | 'registryCommunity__communityFee'
  | 'registryCommunity__protocolFee'
  | 'registryCommunity__communityName'
  | 'registryCommunity__covenantIpfsHash'
  | 'registryCommunity__councilSafe'
  | 'registryCommunity__isKickEnabled'
  | 'registryCommunity__registerStakeAmount'
  | 'registryCommunity__registerToken'
  | 'registryCommunity__alloAddress';

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

export type MemberStrategy_orderBy =
  | 'id'
  | 'member'
  | 'member__id'
  | 'strategy'
  | 'strategy__id'
  | 'strategy__poolId'
  | 'strategy__poolAmount'
  | 'strategy__metadata'
  | 'strategy__maxCVSupply'
  | 'strategy__totalEffectiveActivePoints'
  | 'totalStakedPoints'
  | 'activatedPoints';

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

export type Member_orderBy =
  | 'id'
  | 'memberCommunity'
  | 'stakes';

/** Defines the order direction, either ascending or descending */
export type OrderDirection =
  | 'asc'
  | 'desc';

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


export type Query_metaArgs = {
  block?: InputMaybe<Block_height>;
};

export type RegistryCommunity = {
  id: Scalars['ID'];
  chainId: Scalars['BigInt'];
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
  /** Filter for the block changed event. */
  _change_block?: InputMaybe<BlockChangedFilter>;
  and?: InputMaybe<Array<InputMaybe<RegistryCommunity_filter>>>;
  or?: InputMaybe<Array<InputMaybe<RegistryCommunity_filter>>>;
};

export type RegistryCommunity_orderBy =
  | 'id'
  | 'chainId'
  | 'profileId'
  | 'communityFee'
  | 'protocolFee'
  | 'communityName'
  | 'covenantIpfsHash'
  | 'registryFactory'
  | 'registryFactory__id'
  | 'registryFactory__chainId'
  | 'strategies'
  | 'councilSafe'
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
  | 'garden__address';

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

export type RegistryFactory_orderBy =
  | 'id'
  | 'chainId'
  | 'registryCommunities';

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

export type Stake_orderBy =
  | 'id'
  | 'member'
  | 'member__id'
  | 'poolId'
  | 'proposal'
  | 'proposal__id'
  | 'proposal__proposalNumber'
  | 'proposal__metadata'
  | 'proposal__version'
  | 'proposal__beneficiary'
  | 'proposal__requestedAmount'
  | 'proposal__requestedToken'
  | 'proposal__proposalStatus'
  | 'proposal__blockLast'
  | 'proposal__convictionLast'
  | 'proposal__threshold'
  | 'proposal__maxCVStaked'
  | 'proposal__stakedAmount'
  | 'proposal__submitter'
  | 'proposal__createdAt'
  | 'proposal__updatedAt'
  | 'amount'
  | 'createdAt';

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
  allo: InContextSdkMethod<Query['allo'], QueryalloArgs, MeshContext>,
  /** null **/
  allos: InContextSdkMethod<Query['allos'], QueryallosArgs, MeshContext>,
  /** Access to subgraph metadata **/
  _meta: InContextSdkMethod<Query['_meta'], Query_metaArgs, MeshContext>
  };

  export type MutationSdk = {
    
  };

  export type SubscriptionSdk = {
      /** null **/
  cvstrategy: InContextSdkMethod<Subscription['cvstrategy'], SubscriptioncvstrategyArgs, MeshContext>,
  /** null **/
  cvstrategies: InContextSdkMethod<Subscription['cvstrategies'], SubscriptioncvstrategiesArgs, MeshContext>,
  /** null **/
  cvstrategyConfig: InContextSdkMethod<Subscription['cvstrategyConfig'], SubscriptioncvstrategyConfigArgs, MeshContext>,
  /** null **/
  cvstrategyConfigs: InContextSdkMethod<Subscription['cvstrategyConfigs'], SubscriptioncvstrategyConfigsArgs, MeshContext>,
  /** null **/
  cvproposal: InContextSdkMethod<Subscription['cvproposal'], SubscriptioncvproposalArgs, MeshContext>,
  /** null **/
  cvproposals: InContextSdkMethod<Subscription['cvproposals'], SubscriptioncvproposalsArgs, MeshContext>,
  /** null **/
  registryFactory: InContextSdkMethod<Subscription['registryFactory'], SubscriptionregistryFactoryArgs, MeshContext>,
  /** null **/
  registryFactories: InContextSdkMethod<Subscription['registryFactories'], SubscriptionregistryFactoriesArgs, MeshContext>,
  /** null **/
  registryCommunity: InContextSdkMethod<Subscription['registryCommunity'], SubscriptionregistryCommunityArgs, MeshContext>,
  /** null **/
  registryCommunities: InContextSdkMethod<Subscription['registryCommunities'], SubscriptionregistryCommunitiesArgs, MeshContext>,
  /** null **/
  member: InContextSdkMethod<Subscription['member'], SubscriptionmemberArgs, MeshContext>,
  /** null **/
  members: InContextSdkMethod<Subscription['members'], SubscriptionmembersArgs, MeshContext>,
  /** null **/
  stake: InContextSdkMethod<Subscription['stake'], SubscriptionstakeArgs, MeshContext>,
  /** null **/
  stakes: InContextSdkMethod<Subscription['stakes'], SubscriptionstakesArgs, MeshContext>,
  /** null **/
  memberCommunity: InContextSdkMethod<Subscription['memberCommunity'], SubscriptionmemberCommunityArgs, MeshContext>,
  /** null **/
  memberCommunities: InContextSdkMethod<Subscription['memberCommunities'], SubscriptionmemberCommunitiesArgs, MeshContext>,
  /** null **/
  memberStrategy: InContextSdkMethod<Subscription['memberStrategy'], SubscriptionmemberStrategyArgs, MeshContext>,
  /** null **/
  memberStrategies: InContextSdkMethod<Subscription['memberStrategies'], SubscriptionmemberStrategiesArgs, MeshContext>,
  /** null **/
  tokenGarden: InContextSdkMethod<Subscription['tokenGarden'], SubscriptiontokenGardenArgs, MeshContext>,
  /** null **/
  tokenGardens: InContextSdkMethod<Subscription['tokenGardens'], SubscriptiontokenGardensArgs, MeshContext>,
  /** null **/
  allo: InContextSdkMethod<Subscription['allo'], SubscriptionalloArgs, MeshContext>,
  /** null **/
  allos: InContextSdkMethod<Subscription['allos'], SubscriptionallosArgs, MeshContext>,
  /** Access to subgraph metadata **/
  _meta: InContextSdkMethod<Subscription['_meta'], Subscription_metaArgs, MeshContext>
  };

  export type Context = {
      ["gv2"]: { Query: QuerySdk, Mutation: MutationSdk, Subscription: SubscriptionSdk },
      
    };
}
