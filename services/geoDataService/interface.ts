/*
 * Copyright ©️ 2019 Galt•Project Society Construction and Terraforming Company
 * (Founded by [Nikolai Popeka](https://github.com/npopeka)
 *
 * Copyright ©️ 2019 Galt•Core Blockchain Company
 * (Founded by [Nikolai Popeka](https://github.com/npopeka) by
 * [Basic Agreement](ipfs/QmaCiXUmSrP16Gz8Jdzq6AJESY1EAANmmwha15uR3c1bsS)).
 */

import {
  IExplorerCommunityMintEvent,
  IExplorerCommunityBurnEvent,
  IExplorerGeoDataEvent,
  IExplorerNewApplicationEvent, IExplorerNewCommunityEvent,
  IExplorerNewPrivatePropertyRegistryEvent, IExplorerSaleOfferEvent,
  IExplorerSaleOrderEvent
} from "../interfaces";
import {
  SaleOrdersQuery,
  ISaleOrder,
  ApplicationsQuery,
  IApplication,
  SpaceTokensQuery,
  ISpaceTokenGeoData,
  ISaleOffer,
  SaleOffersQuery,
  PrivatePropertyRegistryQuery,
  IPrivatePropertyRegistry,
  CommunityQuery,
  ICommunity,
  ICommunityVoting,
  CommunityVotingQuery,
  CommunityProposalQuery,
  ICommunityProposal,
  ICommunityMember,
  CommunityMemberQuery,
  CommunityTokensQuery,
  IPrivatePropertyProposal,
  PrivatePropertyProposalQuery,
  CommunityRuleQuery,
  ICommunityRule,
  IPrivatePropertyLegalAgreement,
  IPprMember,
  ITokenizableMember,
  CommunityApprovedQuery
} from "../../database/interface";

export default interface IExplorerGeoDataService {
  handleChangeSpaceTokenDataEvent(spaceGeoDataAddress, event: IExplorerGeoDataEvent): Promise<void>;

  handleSaleOrderEvent(event: IExplorerSaleOrderEvent): Promise<void>;

  handleSaleOfferEvent(event: IExplorerSaleOfferEvent): Promise<void>;

  filterOrders(ordersQuery: FilterSaleOrdersGeoQuery): Promise<ISaleOrdersListResponse>;

  getOrderById(orderId, contractAddress): Promise<ISaleOrder>;

  filterSaleOffers(offersQuery: SaleOffersQuery): Promise<ISaleOffersListResponse>;

  getSaleOfferById(orderId, buyer, contractAddress): Promise<ISaleOffer>;

  handleNewApplicationEvent(event: IExplorerNewApplicationEvent): Promise<void>;

  filterApplications(applicationsQuery: FilterApplicationsGeoQuery): Promise<IApplicationsListResponse>;

  getApplicationById(applicationId, contractAddress): Promise<IApplication>;

  filterSpaceTokens(spaceTokensQuery: FilterSpaceTokensGeoQuery): Promise<ISpaceTokensListResponse>;

  getSpaceTokenById(tokenId, contractAddress): Promise<ISpaceTokenGeoData>;

  getSpaceTokenMetadataById(tokenId, contractAddress): Promise<any>;

  handleTokenizableTransferEvent(contractAddress, event: any): Promise<any>;

  filterTokenizableMembers(query): Promise<ITokenizableMembersListResponse>;

  handleNewPrivatePropertyRegistryEvent(event: IExplorerNewPrivatePropertyRegistryEvent): Promise<void>;

  updatePrivatePropertyRegistry(address): Promise<void>;

  filterPrivatePropertyRegistries(pprQuery: FilterPrivatePropertyRegistryGeoQuery): Promise<IPrivatePropertyRegistryListResponse>;

  getPrivatePropertyRegistry(address): Promise<IPrivatePropertyRegistry>;

  handlePrivatePropertyRegistryProposalEvent(registryAddress, event: any): Promise<IPrivatePropertyProposal>;

  filterPrivatePropertyTokeProposals(pprQuery: PrivatePropertyProposalQuery): Promise<IPrivatePropertyProposalListResponse>;

  handlePrivatePropertyBurnTimeoutEvent(registryAddress, event: any): Promise<any>;

  updatePrivatePropertyTokenTimeout(registryAddress, controllerAddress, tokenId: any): Promise<any>;

  handlePrivatePropertyLegalAgreementEvent(registryAddress, event): Promise<any>;

  filterPrivatePropertyLegalAgreements(query): Promise<IPrivatePropertyLegalAgreementsListResponse>;

  filterPrivatePropertyMembers(query): Promise<IPrivatePropertyMembersListResponse>;

  handleNewCommunityEvent(address: string, isPpr): Promise<ICommunity>;

  handleCommunityMintEvent(communityAddress, event: IExplorerCommunityMintEvent, isPpr): Promise<void>;

  handleCommunityBurnEvent(communityAddress, event: IExplorerCommunityBurnEvent, isPpr): Promise<void>;

  handleCommunityTransferReputationEvent(communityAddress, event: IExplorerCommunityBurnEvent, isPpr): Promise<void>;

  handleCommunityRevokeReputationEvent(communityAddress, event: IExplorerCommunityBurnEvent, isPpr): Promise<void>;

  handleCommunityAddVotingEvent(communityAddress, event);

  handleCommunityRemoveVotingEvent(communityAddress, event);

  handleCommunityAddProposalEvent(communityAddress, event);

  handleCommunityUpdateProposalEvent(communityAddress, event);

  handleCommunityRuleEvent(communityAddress, event);

  handleCommunityTokenApprovedEvent(communityAddress, event);

  updateCommunity(address, isPpr): Promise<void>;

  filterCommunities(communityQuery: FilterCommunityGeoQuery): Promise<ICommunityListResponse>;

  getCommunity(address): Promise<ICommunity>;

  filterCommunityTokens(communityQuery: CommunityTokensQuery): Promise<ICommunityTokensListResponse>;

  filterCommunityVotings(communityQuery: CommunityVotingQuery): Promise<ICommunityVotingListResponse>;

  filterCommunityProposals(communityQuery: CommunityProposalQuery): Promise<ICommunityProposalListResponse>;

  filterCommunityRules(communityQuery: CommunityRuleQuery): Promise<ICommunityRuleListResponse>;

  filterCommunityMembers(communityQuery: CommunityMemberQuery): Promise<ICommunityMemberListResponse>;

  filterCommunitiesWithApprovedTokens(communityQuery: CommunityApprovedQuery): Promise<IApprovedTokensInCommunitiesListResponse>;
}

export interface FilterSaleOrdersGeoQuery extends SaleOrdersQuery {
  surroundingsGeohashBox?: string[];
}

export interface ISaleOrdersListResponse {
  list: ISaleOrder[];
  total: number;
}

export interface FilterApplicationsGeoQuery extends ApplicationsQuery {
  surroundingsGeohashBox?: string[];
}

export interface IApplicationsListResponse {
  list: IApplication[];
  total: number;
}

export interface FilterSpaceTokensGeoQuery extends SpaceTokensQuery {
  surroundingsGeohashBox?: string[];
}

export interface ITokenizableMembersListResponse {
  list: ITokenizableMember[];
  total: number;
}

export interface FilterPrivatePropertyRegistryGeoQuery extends PrivatePropertyRegistryQuery {
  surroundingsGeohashBox?: string[];
}

export interface IPrivatePropertyRegistryListResponse {
  list: IPrivatePropertyRegistry[];
  total: number;
}

export interface IPrivatePropertyProposalListResponse {
  list: IPrivatePropertyProposal[];
  total: number;
}

export interface IPrivatePropertyLegalAgreementsListResponse {
  list: IPrivatePropertyLegalAgreement[];
  total: number;
}

export interface IPrivatePropertyMembersListResponse {
  list: IPprMember[];
  total: number;
}

export interface ISpaceTokensListResponse {
  list: ISpaceTokenGeoData[];
  total: number;
}

export interface ISaleOffersListResponse {
  list: ISaleOffer[];
  total: number;
}

export interface ICommunityListResponse {
  list: ICommunity[];
  total: number;
}

export interface ICommunityVotingListResponse {
  list: ICommunityVoting[];
  total: number;
}

export interface ICommunityProposalListResponse {
  list: ICommunityProposal[];
  total: number;
}

export interface ICommunityRuleListResponse {
  list: ICommunityRule[];
  total: number;
}

export interface ICommunityMemberListResponse {
  list: ICommunityMember[];
  total: number;
}
export interface ICommunityTokensListResponse {
  list: ISpaceTokenGeoData[];
  total: number;
}
export interface IApprovedTokensInCommunitiesListResponse {
  list: ICommunity[];
  total: number;
}

export interface FilterCommunityGeoQuery extends CommunityQuery {
  surroundingsGeohashBox?: string[];
}
