/*
 * Copyright ©️ 2019 GaltProject Society Construction and Terraforming Company
 * (Founded by [Nikolai Popeka](https://github.com/npopeka)
 *
 * Copyright ©️ 2019 Galt•Core Blockchain Company
 * (Founded by [Nikolai Popeka](https://github.com/npopeka) by
 * [Basic Agreement](ipfs/QmaCiXUmSrP16Gz8Jdzq6AJESY1EAANmmwha15uR3c1bsS)).
 */

import {IExplorerResultContour} from "../services/interfaces";

export default interface IExplorerDatabase {
  flushDatabase(): Promise<void>;

  addOrUpdateContour(contourGeohashes: string[], tokenId: number, contractAddress: string, level?: string, tokenType?: string): Promise<void>;

  getContourBySpaceTokenId(tokenId, contractAddress?: string, level?: string): Promise<string[]>;

  getContoursByParentGeohash(parentGeohash: string, contractAddress?: string, level?: string[]): Promise<[IExplorerResultContour]>;

  getSpaceTokenGeoData(tokenId, contractAddress): Promise<ISpaceTokenGeoData>;

  addOrUpdateGeoData(geoData: ISpaceTokenGeoData): Promise<ISpaceTokenGeoData>;

  getSaleOrder(orderId, contractAddress): Promise<ISaleOrder>;

  addOrUpdateSaleOrder(saleOrder: ISaleOrder): Promise<ISaleOrder>;

  filterSaleOrders(filterQuery: SaleOrdersQuery): Promise<ISaleOrder[]>;

  filterSaleOrdersCount(filterQuery: SaleOrdersQuery): Promise<number>;

  getApplication(applicationId, contractAddress): Promise<IApplication>;

  addOrUpdateApplication(application: IApplication): Promise<IApplication>;

  filterApplications(filterQuery: ApplicationsQuery): Promise<IApplication[]>;

  filterApplicationsCount(filterQuery: ApplicationsQuery): Promise<number>;

  getSpaceToken(tokenId, contractAddress): Promise<ISpaceTokenGeoData>;

  filterSpaceTokens(filterQuery: SpaceTokensQuery): Promise<ISpaceTokenGeoData[]>;

  filterSpaceTokensCount(filterQuery: SpaceTokensQuery): Promise<number>;

  addOrUpdateSaleOffer(saleOffer: ISaleOffer): Promise<ISaleOffer>;

  getSaleOffer(orderId, buyer, contractAddress): Promise<ISaleOffer>;

  filterSaleOffers(filterQuery: SaleOffersQuery): Promise<ISaleOffer[]>;

  filterSaleOffersCount(filterQuery: SaleOffersQuery): Promise<number>;

  // =============================================================
  // Private Property Registries
  // =============================================================

  addOrPrivatePropertyRegistry(registry: IPrivatePropertyRegistry): Promise<IPrivatePropertyRegistry>;

  getPrivatePropertyRegistry(address): Promise<IPrivatePropertyRegistry>;

  filterPrivatePropertyRegistry(filterQuery: PrivatePropertyRegistryQuery): Promise<IPrivatePropertyRegistry[]>;

  filterPrivatePropertyRegistryCount(filterQuery: PrivatePropertyRegistryQuery): Promise<number>;

  // =============================================================
  // Communities
  // =============================================================

  addOrUpdateCommunity(community: ICommunity): Promise<ICommunity>;

  getCommunity(address): Promise<ICommunity>;

  filterCommunity(filterQuery: CommunityQuery): Promise<ICommunity[]>;

  filterCommunityCount(filterQuery: CommunityQuery): Promise<number>;

  filterCommunityTokens(filterQuery: CommunityTokensQuery): Promise<ISpaceTokenGeoData[]>;

  filterCommunityTokensCount(filterQuery: CommunityTokensQuery): Promise<number>;

  getCommunityTokensCount(community: ICommunity): Promise<number>;

  getCommunityMemberTokens(community: ICommunity, memberAddress): Promise<ISpaceTokenGeoData[]>;

  // =============================================================
  // Community Members
  // =============================================================

  addOrUpdateCommunityMember(community: ICommunity, member: ICommunityMember): Promise<ICommunityMember>;

  getCommunityMember(communityId, memberAddress): Promise<ICommunityMember>;

  filterCommunityMember(filterQuery: CommunityMemberQuery): Promise<ICommunityMember[]>;

  filterCommunityMemberCount(filterQuery: CommunityMemberQuery): Promise<number>;

  // =============================================================
  // Community Votings
  // =============================================================

  addOrUpdateCommunityVoting(community: ICommunity, voting: ICommunityVoting): Promise<ICommunityVoting>;

  getCommunityVoting(communityId, marker): Promise<ICommunityVoting>;

  filterCommunityVoting(filterQuery: CommunityVotingQuery): Promise<ICommunityVoting[]>;

  filterCommunityVotingCount(filterQuery: CommunityVotingQuery): Promise<number>;

  // =============================================================
  // Community Proposals
  // =============================================================

  addOrUpdateCommunityProposal(voting: ICommunityVoting, proposal: ICommunityProposal): Promise<ICommunityProposal>;

  getCommunityProposal(votingId, proposalId): Promise<ICommunityProposal>;

  getCommunityProposalByVotingAddress(votingAddress, proposalId): Promise<ICommunityProposal>;

  filterCommunityProposal(filterQuery: CommunityProposalQuery): Promise<ICommunityProposal[]>;

  filterCommunityProposalCount(filterQuery: CommunityProposalQuery): Promise<number>;

  // =============================================================
  // Values
  // =============================================================

  getValue(key: string): Promise<string>;

  setValue(key: string, content: string): Promise<void>;

  clearValue(key: string): Promise<void>;
}

export interface ISpaceTokenGeoData {
  tokenId;
  tokenType;
  type;
  subtype;
  level: string[];
  levelNumber;
  contractAddress;
  fullRegion;
  regionLvl1?;
  regionLvl2?;
  regionLvl3?;
  regionLvl4?;
  regionLvl5?;
  regionLvl6?;
  regionLvl7?;
  regionLvl8?;
  regionLvl9?;
  photosCount;
  floorPlansCount;
  bathroomsCount;
  bedroomsCount;
  yearBuilt;
  area;
  owner;
  locker;
  inLocker;
  areaSource;
  ledgerIdentifier;
  dataLink;
  dataJson;
  geohashContourJson;
  geohashesCount;
  heightsContourJson;
  featureArray;
  createdAtBlock;
  updatedAtBlock;
  isPrivate;

  spaceTokensOrders?;
}

export interface ISaleOrder {
  id?;

  orderId;
  currency?;
  currencyAddress?;
  currencyName?;
  statusName?;
  seller?;
  ask?;
  description?;
  lastBuyer?;
  createdAtBlock;
  updatedAtBlock;
  dataJson?;
  contractAddress;
  isPrivate;

  featureArray?;
  typesSubtypesArray?;
  minLandArea?;
  maxLandArea?;
  sumLandArea?;
  minBuildingArea?;
  maxBuildingArea?;
  sumBuildingArea?;
  minYearBuilt?;
  maxYearBuilt?;
  sumBathroomsCount?;
  sumBedroomsCount?;
  maxBathroomsCount?;
  maxBedroomsCount?;
  minBathroomsCount?;
  minBedroomsCount?;

  spaceTokens?;
  addSpaceTokens?(tokensObjects);
  setSpaceTokens?(tokensObjects);
}

export interface IApplication {
  applicationId;
  applicantAddress;
  feeCurrency;
  feeAmount;
  feeCurrencyAddress;
  feeCurrencyName;
  statusName;
  credentialsHash;
  contractType;
  contractAddress;
  rolesArray;
  availableRolesArray;
  oraclesArray;
  totalOraclesReward;
  createdAtBlock;
  updatedAtBlock;
  dataJson;

  addSpaceTokens?(tokensObjects);
}

export interface SaleOrdersQuery {
  limit?: number;
  offset?: number;

  sortBy?: string;
  sortDir?: string;

  statusName?: string;
  contractAddress: string;
  tokensIds?: string[];

  features?: string[];

  currency?: string;
  currencyAddress?: string;

  buyer?: string;
  includeOrderIds?: string[];
  excludeOrderIds?: string[];

  regions?: string[];
  types?: string[];
  subtypes?: string[];

  askMin?: number;
  askMax?: number;

  buildingAreaMin?: number;
  buildingAreaMax?: number;

  landAreaMin?: number;
  landAreaMax?: number;

  bedroomsCountMin?: number;
  bathroomsCountMin?: number;
}

export interface ApplicationsQuery {
  limit?: number;
  offset?: number;

  sortBy?: string;
  sortDir?: string;

  tokensIds?: string[];
  tokenType?: string;
  contractType?: string;
  availableRoles?: string[];
  oracleAddress?: string;

  features?: string[];

  feeAmount?: number;
  feeCurrency?: string;
  feeCurrencyAddress?: string;

  applicantAddress?: string;
  contractAddress?: string;

  regions?: string[];
  types?: string[];
  subtypes?: string[];

  geohashesCountMin?: number;
  geohashesCountMax?: number;

  totalOraclesRewardMin?: number;
  totalOraclesRewardMax?: number;

  areaMin?: number;
  areaMax?: number;
}

export interface SpaceTokensQuery {
  limit?: number;
  offset?: number;

  sortBy?: string;
  sortDir?: string;

  groupBy?: string;

  contractAddress?: string;
  tokensIds?: string[];
  tokenType?: string;
  inLocker?: boolean;

  features?: string[];

  regions?: string[];
  types?: string[];
  subtypes?: string[];

  level?: string;

  geohashesCountMin?: number;
  geohashesCountMax?: number;

  areaMin?: number;
  areaMax?: number;

  owner?: string;
}

export interface ISaleOffer {
  contractAddress: string;
  orderId?: string;

  ask?: number;
  bid?: number;

  buyer?: string;
  seller?: string;
  status?: string;

  createdAtBlock?;
  updatedAtBlock?;

  lastOfferAskAt;
  lastOfferBidAt;
  createdOfferAt;

  dbOrderId;

  isFirstOffer?: boolean;
  order?: any;
}

export interface SaleOffersQuery {
  limit?: number;
  offset?: number;

  sortBy?: string;
  sortDir?: string;

  contractAddress?: string;
  orderId?: string;

  ask?: number;
  bid?: number;

  askMin?: number;
  askMax?: number;

  bidMin?: number;
  bidMax?: number;

  buyer?: string;
  seller?: string;
  status?: string;

  tokensIds?: [];
  features?: [];

  includeOrders?: boolean;

  includeOrderIds?: string[];
  excludeOrderIds?: string[];

  buildingAreaMin?: number;
  buildingAreaMax?: number;

  landAreaMin?: number;
  landAreaMax?: number;

  bedroomsCountMin?: number;
  bathroomsCountMin?: number;
}

export interface IPrivatePropertyRegistry {
  id?;

  address;
  name?;
  symbol?;
  owner?;
  totalSupply?;

  createdAtBlock?;
  updatedAtBlock?;
}

export interface PrivatePropertyRegistryQuery {
  limit?: number;
  offset?: number;

  sortBy?: string;
  sortDir?: string;

  address?: string;
  addresses?: string[];
  tokensIds?: string[];
}

export interface ICommunity {
  id?;

  address;
  storageAddress?;
  pmAddress?;
  multiSigAddress?;
  name?;
  description?;
  activeFundRulesCount?;
  spaceTokenOwnersCount?;
  reputationTotalSupply?;
  tokensCount?;
  isPrivate?;
  isPpr?;

  createdAtBlock?;
  updatedAtBlock?;

  addSpaceTokens?(tokensObjects);
  removeSpaceTokens?(tokensObjects);
  setSpaceTokens?(tokensObjects);
}

export interface ICommunityMember {
  id?;
  communityId?;

  address;
  communityAddress;
  currentReputation?;
  basicReputation?;
  tokensCount?;
  fullNameHash?;

  destroy?();
}

export interface ICommunityVoting {
  id?;
  communityId?;

  communityAddress;
  marker;
  threshold?;
  activeProposalsCount?;
  totalProposalsCount?;
  proposalManager?;
  name?;
  description?;
  destination?;

  destroy?();
}

export interface ICommunityProposal {
  id?;
  votingId?;
  communityId;

  creatorAddress;
  pmAddress;
  communityAddress;
  marker;
  proposalId;
  status?;
  description?;
  acceptedShare?;
  declinedShare?;
  acceptedCount?;
  declinedCount?;

  destroy?();
}

export interface CommunityQuery {
  limit?: number;
  offset?: number;

  sortBy?: string;
  sortDir?: string;

  groupBy?: string;

  address?: string;
  addresses?: string[];
  tokensIds?: string[];
}

export interface CommunityMemberQuery {
  limit?: number;
  offset?: number;

  sortBy?: string;
  sortDir?: string;

  communityAddress?: number;
}

export interface CommunityTokensQuery extends SpaceTokensQuery {
  communityAddress: string;
}

export interface CommunityVotingQuery {
  limit?: number;
  offset?: number;

  sortBy?: string;
  sortDir?: string;

  communityAddress?: number;
}

export interface CommunityProposalQuery {
  limit?: number;
  offset?: number;

  sortBy?: string;
  sortDir?: string;

  marker?: number;
  creatorAddress?: string;
  pmAddress?: string;
  communityAddress?: string;
}
