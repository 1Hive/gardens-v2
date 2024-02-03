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
  proposalMeta: ProposalMeta;
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
  proposalType: Scalars['BigInt'];
  stakedTokens: Scalars['BigInt'];
  submitter: Scalars['String'];
  voterStakedPointsPct: Scalars['BigInt'];
  agreementActionId: Scalars['BigInt'];
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
  proposalMeta?: InputMaybe<Scalars['String']>;
  proposalMeta_not?: InputMaybe<Scalars['String']>;
  proposalMeta_gt?: InputMaybe<Scalars['String']>;
  proposalMeta_lt?: InputMaybe<Scalars['String']>;
  proposalMeta_gte?: InputMaybe<Scalars['String']>;
  proposalMeta_lte?: InputMaybe<Scalars['String']>;
  proposalMeta_in?: InputMaybe<Array<Scalars['String']>>;
  proposalMeta_not_in?: InputMaybe<Array<Scalars['String']>>;
  proposalMeta_contains?: InputMaybe<Scalars['String']>;
  proposalMeta_contains_nocase?: InputMaybe<Scalars['String']>;
  proposalMeta_not_contains?: InputMaybe<Scalars['String']>;
  proposalMeta_not_contains_nocase?: InputMaybe<Scalars['String']>;
  proposalMeta_starts_with?: InputMaybe<Scalars['String']>;
  proposalMeta_starts_with_nocase?: InputMaybe<Scalars['String']>;
  proposalMeta_not_starts_with?: InputMaybe<Scalars['String']>;
  proposalMeta_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  proposalMeta_ends_with?: InputMaybe<Scalars['String']>;
  proposalMeta_ends_with_nocase?: InputMaybe<Scalars['String']>;
  proposalMeta_not_ends_with?: InputMaybe<Scalars['String']>;
  proposalMeta_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  proposalMeta_?: InputMaybe<ProposalMeta_filter>;
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
  proposalType?: InputMaybe<Scalars['BigInt']>;
  proposalType_not?: InputMaybe<Scalars['BigInt']>;
  proposalType_gt?: InputMaybe<Scalars['BigInt']>;
  proposalType_lt?: InputMaybe<Scalars['BigInt']>;
  proposalType_gte?: InputMaybe<Scalars['BigInt']>;
  proposalType_lte?: InputMaybe<Scalars['BigInt']>;
  proposalType_in?: InputMaybe<Array<Scalars['BigInt']>>;
  proposalType_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  stakedTokens?: InputMaybe<Scalars['BigInt']>;
  stakedTokens_not?: InputMaybe<Scalars['BigInt']>;
  stakedTokens_gt?: InputMaybe<Scalars['BigInt']>;
  stakedTokens_lt?: InputMaybe<Scalars['BigInt']>;
  stakedTokens_gte?: InputMaybe<Scalars['BigInt']>;
  stakedTokens_lte?: InputMaybe<Scalars['BigInt']>;
  stakedTokens_in?: InputMaybe<Array<Scalars['BigInt']>>;
  stakedTokens_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
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
  voterStakedPointsPct?: InputMaybe<Scalars['BigInt']>;
  voterStakedPointsPct_not?: InputMaybe<Scalars['BigInt']>;
  voterStakedPointsPct_gt?: InputMaybe<Scalars['BigInt']>;
  voterStakedPointsPct_lt?: InputMaybe<Scalars['BigInt']>;
  voterStakedPointsPct_gte?: InputMaybe<Scalars['BigInt']>;
  voterStakedPointsPct_lte?: InputMaybe<Scalars['BigInt']>;
  voterStakedPointsPct_in?: InputMaybe<Array<Scalars['BigInt']>>;
  voterStakedPointsPct_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  agreementActionId?: InputMaybe<Scalars['BigInt']>;
  agreementActionId_not?: InputMaybe<Scalars['BigInt']>;
  agreementActionId_gt?: InputMaybe<Scalars['BigInt']>;
  agreementActionId_lt?: InputMaybe<Scalars['BigInt']>;
  agreementActionId_gte?: InputMaybe<Scalars['BigInt']>;
  agreementActionId_lte?: InputMaybe<Scalars['BigInt']>;
  agreementActionId_in?: InputMaybe<Array<Scalars['BigInt']>>;
  agreementActionId_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
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
  | 'proposalMeta'
  | 'proposalMeta__id'
  | 'proposalMeta__version'
  | 'proposalMeta__title'
  | 'proposalMeta__content'
  | 'metadata'
  | 'version'
  | 'strategy'
  | 'strategy__id'
  | 'beneficiary'
  | 'requestedAmount'
  | 'requestedToken'
  | 'proposalStatus'
  | 'blockLast'
  | 'convictionLast'
  | 'threshold'
  | 'proposalType'
  | 'stakedTokens'
  | 'submitter'
  | 'voterStakedPointsPct'
  | 'agreementActionId'
  | 'createdAt'
  | 'updatedAt';

export type CVStrategy = {
  id: Scalars['ID'];
  registryCommunity: RegistryCommunity;
  config?: Maybe<CVStrategyConfig>;
  proposals: Array<CVProposal>;
};


export type CVStrategyproposalsArgs = {
  skip?: InputMaybe<Scalars['Int']>;
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<CVProposal_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<CVProposal_filter>;
};

export type CVStrategyConfig = {
  id: Scalars['ID'];
  decay: Scalars['BigInt'];
  maxRatio: Scalars['BigInt'];
  weight: Scalars['BigInt'];
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
  weight?: InputMaybe<Scalars['BigInt']>;
  weight_not?: InputMaybe<Scalars['BigInt']>;
  weight_gt?: InputMaybe<Scalars['BigInt']>;
  weight_lt?: InputMaybe<Scalars['BigInt']>;
  weight_gte?: InputMaybe<Scalars['BigInt']>;
  weight_lte?: InputMaybe<Scalars['BigInt']>;
  weight_in?: InputMaybe<Array<Scalars['BigInt']>>;
  weight_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  /** Filter for the block changed event. */
  _change_block?: InputMaybe<BlockChangedFilter>;
  and?: InputMaybe<Array<InputMaybe<CVStrategyConfig_filter>>>;
  or?: InputMaybe<Array<InputMaybe<CVStrategyConfig_filter>>>;
};

export type CVStrategyConfig_orderBy =
  | 'id'
  | 'decay'
  | 'maxRatio'
  | 'weight';

export type CVStrategy_filter = {
  id?: InputMaybe<Scalars['ID']>;
  id_not?: InputMaybe<Scalars['ID']>;
  id_gt?: InputMaybe<Scalars['ID']>;
  id_lt?: InputMaybe<Scalars['ID']>;
  id_gte?: InputMaybe<Scalars['ID']>;
  id_lte?: InputMaybe<Scalars['ID']>;
  id_in?: InputMaybe<Array<Scalars['ID']>>;
  id_not_in?: InputMaybe<Array<Scalars['ID']>>;
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
  /** Filter for the block changed event. */
  _change_block?: InputMaybe<BlockChangedFilter>;
  and?: InputMaybe<Array<InputMaybe<CVStrategy_filter>>>;
  or?: InputMaybe<Array<InputMaybe<CVStrategy_filter>>>;
};

export type CVStrategy_orderBy =
  | 'id'
  | 'registryCommunity'
  | 'registryCommunity__id'
  | 'registryCommunity__profileId'
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
  | 'config__decay'
  | 'config__maxRatio'
  | 'config__weight'
  | 'proposals';

export type Member = {
  id: Scalars['ID'];
  registryCommunity?: Maybe<Array<MembersCommunity>>;
  memberAddress?: Maybe<Scalars['String']>;
  stakedAmount?: Maybe<Scalars['BigInt']>;
  isRegistered?: Maybe<Scalars['Boolean']>;
};


export type MemberregistryCommunityArgs = {
  skip?: InputMaybe<Scalars['Int']>;
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<MembersCommunity_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<MembersCommunity_filter>;
};

export type Member_filter = {
  id?: InputMaybe<Scalars['ID']>;
  id_not?: InputMaybe<Scalars['ID']>;
  id_gt?: InputMaybe<Scalars['ID']>;
  id_lt?: InputMaybe<Scalars['ID']>;
  id_gte?: InputMaybe<Scalars['ID']>;
  id_lte?: InputMaybe<Scalars['ID']>;
  id_in?: InputMaybe<Array<Scalars['ID']>>;
  id_not_in?: InputMaybe<Array<Scalars['ID']>>;
  registryCommunity_?: InputMaybe<MembersCommunity_filter>;
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
  stakedAmount?: InputMaybe<Scalars['BigInt']>;
  stakedAmount_not?: InputMaybe<Scalars['BigInt']>;
  stakedAmount_gt?: InputMaybe<Scalars['BigInt']>;
  stakedAmount_lt?: InputMaybe<Scalars['BigInt']>;
  stakedAmount_gte?: InputMaybe<Scalars['BigInt']>;
  stakedAmount_lte?: InputMaybe<Scalars['BigInt']>;
  stakedAmount_in?: InputMaybe<Array<Scalars['BigInt']>>;
  stakedAmount_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  isRegistered?: InputMaybe<Scalars['Boolean']>;
  isRegistered_not?: InputMaybe<Scalars['Boolean']>;
  isRegistered_in?: InputMaybe<Array<Scalars['Boolean']>>;
  isRegistered_not_in?: InputMaybe<Array<Scalars['Boolean']>>;
  /** Filter for the block changed event. */
  _change_block?: InputMaybe<BlockChangedFilter>;
  and?: InputMaybe<Array<InputMaybe<Member_filter>>>;
  or?: InputMaybe<Array<InputMaybe<Member_filter>>>;
};

export type Member_orderBy =
  | 'id'
  | 'registryCommunity'
  | 'memberAddress'
  | 'stakedAmount'
  | 'isRegistered';

export type MembersCommunity = {
  id: Scalars['ID'];
  member?: Maybe<Member>;
  registryCommunity?: Maybe<RegistryCommunity>;
};

export type MembersCommunity_filter = {
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
  and?: InputMaybe<Array<InputMaybe<MembersCommunity_filter>>>;
  or?: InputMaybe<Array<InputMaybe<MembersCommunity_filter>>>;
};

export type MembersCommunity_orderBy =
  | 'id'
  | 'member'
  | 'member__id'
  | 'member__memberAddress'
  | 'member__stakedAmount'
  | 'member__isRegistered'
  | 'registryCommunity'
  | 'registryCommunity__id'
  | 'registryCommunity__profileId'
  | 'registryCommunity__protocolFee'
  | 'registryCommunity__communityName'
  | 'registryCommunity__covenantIpfsHash'
  | 'registryCommunity__councilSafe'
  | 'registryCommunity__isKickEnabled'
  | 'registryCommunity__registerStakeAmount'
  | 'registryCommunity__registerToken'
  | 'registryCommunity__alloAddress';

/** Defines the order direction, either ascending or descending */
export type OrderDirection =
  | 'asc'
  | 'desc';

export type ProposalMeta = {
  id: Scalars['ID'];
  proposal: Array<CVProposal>;
  version?: Maybe<Scalars['BigInt']>;
  title?: Maybe<Scalars['String']>;
  content?: Maybe<Scalars['String']>;
};


export type ProposalMetaproposalArgs = {
  skip?: InputMaybe<Scalars['Int']>;
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<CVProposal_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<CVProposal_filter>;
};

export type ProposalMeta_filter = {
  id?: InputMaybe<Scalars['ID']>;
  id_not?: InputMaybe<Scalars['ID']>;
  id_gt?: InputMaybe<Scalars['ID']>;
  id_lt?: InputMaybe<Scalars['ID']>;
  id_gte?: InputMaybe<Scalars['ID']>;
  id_lte?: InputMaybe<Scalars['ID']>;
  id_in?: InputMaybe<Array<Scalars['ID']>>;
  id_not_in?: InputMaybe<Array<Scalars['ID']>>;
  proposal_?: InputMaybe<CVProposal_filter>;
  version?: InputMaybe<Scalars['BigInt']>;
  version_not?: InputMaybe<Scalars['BigInt']>;
  version_gt?: InputMaybe<Scalars['BigInt']>;
  version_lt?: InputMaybe<Scalars['BigInt']>;
  version_gte?: InputMaybe<Scalars['BigInt']>;
  version_lte?: InputMaybe<Scalars['BigInt']>;
  version_in?: InputMaybe<Array<Scalars['BigInt']>>;
  version_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  title?: InputMaybe<Scalars['String']>;
  title_not?: InputMaybe<Scalars['String']>;
  title_gt?: InputMaybe<Scalars['String']>;
  title_lt?: InputMaybe<Scalars['String']>;
  title_gte?: InputMaybe<Scalars['String']>;
  title_lte?: InputMaybe<Scalars['String']>;
  title_in?: InputMaybe<Array<Scalars['String']>>;
  title_not_in?: InputMaybe<Array<Scalars['String']>>;
  title_contains?: InputMaybe<Scalars['String']>;
  title_contains_nocase?: InputMaybe<Scalars['String']>;
  title_not_contains?: InputMaybe<Scalars['String']>;
  title_not_contains_nocase?: InputMaybe<Scalars['String']>;
  title_starts_with?: InputMaybe<Scalars['String']>;
  title_starts_with_nocase?: InputMaybe<Scalars['String']>;
  title_not_starts_with?: InputMaybe<Scalars['String']>;
  title_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  title_ends_with?: InputMaybe<Scalars['String']>;
  title_ends_with_nocase?: InputMaybe<Scalars['String']>;
  title_not_ends_with?: InputMaybe<Scalars['String']>;
  title_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  content?: InputMaybe<Scalars['String']>;
  content_not?: InputMaybe<Scalars['String']>;
  content_gt?: InputMaybe<Scalars['String']>;
  content_lt?: InputMaybe<Scalars['String']>;
  content_gte?: InputMaybe<Scalars['String']>;
  content_lte?: InputMaybe<Scalars['String']>;
  content_in?: InputMaybe<Array<Scalars['String']>>;
  content_not_in?: InputMaybe<Array<Scalars['String']>>;
  content_contains?: InputMaybe<Scalars['String']>;
  content_contains_nocase?: InputMaybe<Scalars['String']>;
  content_not_contains?: InputMaybe<Scalars['String']>;
  content_not_contains_nocase?: InputMaybe<Scalars['String']>;
  content_starts_with?: InputMaybe<Scalars['String']>;
  content_starts_with_nocase?: InputMaybe<Scalars['String']>;
  content_not_starts_with?: InputMaybe<Scalars['String']>;
  content_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  content_ends_with?: InputMaybe<Scalars['String']>;
  content_ends_with_nocase?: InputMaybe<Scalars['String']>;
  content_not_ends_with?: InputMaybe<Scalars['String']>;
  content_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  /** Filter for the block changed event. */
  _change_block?: InputMaybe<BlockChangedFilter>;
  and?: InputMaybe<Array<InputMaybe<ProposalMeta_filter>>>;
  or?: InputMaybe<Array<InputMaybe<ProposalMeta_filter>>>;
};

export type ProposalMeta_orderBy =
  | 'id'
  | 'proposal'
  | 'version'
  | 'title'
  | 'content';

export type Query = {
  cvstrategy?: Maybe<CVStrategy>;
  cvstrategies: Array<CVStrategy>;
  cvstrategyConfig?: Maybe<CVStrategyConfig>;
  cvstrategyConfigs: Array<CVStrategyConfig>;
  cvproposal?: Maybe<CVProposal>;
  cvproposals: Array<CVProposal>;
  proposalMeta?: Maybe<ProposalMeta>;
  proposalMetas: Array<ProposalMeta>;
  registryFactory?: Maybe<RegistryFactory>;
  registryFactories: Array<RegistryFactory>;
  registryCommunity?: Maybe<RegistryCommunity>;
  registryCommunities: Array<RegistryCommunity>;
  member?: Maybe<Member>;
  members: Array<Member>;
  membersCommunity?: Maybe<MembersCommunity>;
  membersCommunities: Array<MembersCommunity>;
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


export type QueryproposalMetaArgs = {
  id: Scalars['ID'];
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type QueryproposalMetasArgs = {
  skip?: InputMaybe<Scalars['Int']>;
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<ProposalMeta_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<ProposalMeta_filter>;
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


export type QuerymembersCommunityArgs = {
  id: Scalars['ID'];
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type QuerymembersCommunitiesArgs = {
  skip?: InputMaybe<Scalars['Int']>;
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<MembersCommunity_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<MembersCommunity_filter>;
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type Query_metaArgs = {
  block?: InputMaybe<Block_height>;
};

export type RegistryCommunity = {
  id: Scalars['ID'];
  profileId?: Maybe<Scalars['String']>;
  protocolFee?: Maybe<Scalars['BigInt']>;
  communityName?: Maybe<Scalars['String']>;
  covenantIpfsHash?: Maybe<Scalars['String']>;
  registryFactory?: Maybe<RegistryFactory>;
  strategies?: Maybe<Array<CVStrategy>>;
  councilSafe?: Maybe<Scalars['String']>;
  isKickEnabled?: Maybe<Scalars['Boolean']>;
  registerStakeAmount?: Maybe<Scalars['BigInt']>;
  registerToken?: Maybe<Scalars['String']>;
  alloAddress?: Maybe<Scalars['String']>;
  members?: Maybe<Array<MembersCommunity>>;
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
  orderBy?: InputMaybe<MembersCommunity_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<MembersCommunity_filter>;
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
  members_?: InputMaybe<MembersCommunity_filter>;
  /** Filter for the block changed event. */
  _change_block?: InputMaybe<BlockChangedFilter>;
  and?: InputMaybe<Array<InputMaybe<RegistryCommunity_filter>>>;
  or?: InputMaybe<Array<InputMaybe<RegistryCommunity_filter>>>;
};

export type RegistryCommunity_orderBy =
  | 'id'
  | 'profileId'
  | 'protocolFee'
  | 'communityName'
  | 'covenantIpfsHash'
  | 'registryFactory'
  | 'registryFactory__id'
  | 'strategies'
  | 'councilSafe'
  | 'isKickEnabled'
  | 'registerStakeAmount'
  | 'registerToken'
  | 'alloAddress'
  | 'members';

export type RegistryFactory = {
  id: Scalars['ID'];
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
  registryCommunities_?: InputMaybe<RegistryCommunity_filter>;
  /** Filter for the block changed event. */
  _change_block?: InputMaybe<BlockChangedFilter>;
  and?: InputMaybe<Array<InputMaybe<RegistryFactory_filter>>>;
  or?: InputMaybe<Array<InputMaybe<RegistryFactory_filter>>>;
};

export type RegistryFactory_orderBy =
  | 'id'
  | 'registryCommunities';

export type Subscription = {
  cvstrategy?: Maybe<CVStrategy>;
  cvstrategies: Array<CVStrategy>;
  cvstrategyConfig?: Maybe<CVStrategyConfig>;
  cvstrategyConfigs: Array<CVStrategyConfig>;
  cvproposal?: Maybe<CVProposal>;
  cvproposals: Array<CVProposal>;
  proposalMeta?: Maybe<ProposalMeta>;
  proposalMetas: Array<ProposalMeta>;
  registryFactory?: Maybe<RegistryFactory>;
  registryFactories: Array<RegistryFactory>;
  registryCommunity?: Maybe<RegistryCommunity>;
  registryCommunities: Array<RegistryCommunity>;
  member?: Maybe<Member>;
  members: Array<Member>;
  membersCommunity?: Maybe<MembersCommunity>;
  membersCommunities: Array<MembersCommunity>;
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


export type SubscriptionproposalMetaArgs = {
  id: Scalars['ID'];
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type SubscriptionproposalMetasArgs = {
  skip?: InputMaybe<Scalars['Int']>;
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<ProposalMeta_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<ProposalMeta_filter>;
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


export type SubscriptionmembersCommunityArgs = {
  id: Scalars['ID'];
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type SubscriptionmembersCommunitiesArgs = {
  skip?: InputMaybe<Scalars['Int']>;
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<MembersCommunity_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<MembersCommunity_filter>;
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type Subscription_metaArgs = {
  block?: InputMaybe<Block_height>;
};

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
  proposalMeta: InContextSdkMethod<Query['proposalMeta'], QueryproposalMetaArgs, MeshContext>,
  /** null **/
  proposalMetas: InContextSdkMethod<Query['proposalMetas'], QueryproposalMetasArgs, MeshContext>,
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
  membersCommunity: InContextSdkMethod<Query['membersCommunity'], QuerymembersCommunityArgs, MeshContext>,
  /** null **/
  membersCommunities: InContextSdkMethod<Query['membersCommunities'], QuerymembersCommunitiesArgs, MeshContext>,
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
  proposalMeta: InContextSdkMethod<Subscription['proposalMeta'], SubscriptionproposalMetaArgs, MeshContext>,
  /** null **/
  proposalMetas: InContextSdkMethod<Subscription['proposalMetas'], SubscriptionproposalMetasArgs, MeshContext>,
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
  membersCommunity: InContextSdkMethod<Subscription['membersCommunity'], SubscriptionmembersCommunityArgs, MeshContext>,
  /** null **/
  membersCommunities: InContextSdkMethod<Subscription['membersCommunities'], SubscriptionmembersCommunitiesArgs, MeshContext>,
  /** Access to subgraph metadata **/
  _meta: InContextSdkMethod<Subscription['_meta'], Subscription_metaArgs, MeshContext>
  };

  export type Context = {
      ["gv2"]: { Query: QuerySdk, Mutation: MutationSdk, Subscription: SubscriptionSdk },
      
    };
}
