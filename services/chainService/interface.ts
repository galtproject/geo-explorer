/*
 * Copyright ©️ 2019 GaltProject Society Construction and Terraforming Company
 * (Founded by [Nikolai Popeka](https://github.com/npopeka)
 *
 * Copyright ©️ 2019 Galt•Core Blockchain Company
 * (Founded by [Nikolai Popeka](https://github.com/npopeka) by
 * [Basic Agreement](ipfs/QmaCiXUmSrP16Gz8Jdzq6AJESY1EAANmmwha15uR3c1bsS)).
 */

import {IExplorerChainContourEvent} from "../interfaces";

export default interface IExplorerChainService {
  websocketProvider: any;
  web3: any;

  spaceGeoData: any;
  propertyMarket: any;
  contractsConfig: any;
  spaceToken: any;
  newPropertyManager: any;

  privatePropertyGlobalRegistry: any;
  privatePropertyMarket: any;

  communityFactory: any;

  decentralizedCommunityRegistry: any;
  pprCommunityRegistry: any;

  callbackOnReconnect: any;

  getEventsFromBlock(contract, eventName: string, blockNumber?: number): Promise<IExplorerChainContourEvent[]>;

  subscribeForNewEvents(contract, eventName: string, blockNumber: number, callback): void;

  getCurrentBlock(): Promise<number>;

  onReconnect(callback): void;

  getLockerOwner(address): Promise<string>;

  getContractSymbol(address): Promise<string>;

  callContractMethod(contract, method, args, type?): Promise<any>;

  getSpaceTokenOwner(contractAddress, tokenId): Promise<string>;

  getSpaceTokenArea(contractAddress, tokenId): Promise<number>;

  getSpaceTokenContourData(contractAddress, tokenId): Promise<{ geohashContour: string[], heightsContour: number[] }>;

  getSpaceTokenData(contractAddress, tokenId): Promise<{ area: number, areaSource: string, spaceTokenType: string, humanAddress: string, dataLink: string, geohashContour: string[], heightsContour: number[], ledgerIdentifier: string }>;

  getSaleOrder(contractAddress, orderId): Promise<ChainServiceSaleOrder>;

  getSaleOffer(contractAddress, orderId, buyer): Promise<ChainServiceSaleOffer>;

  getNewPropertyApplication(applicationId): Promise<{ tokenId: string, id: string, applicant: string, currency: string, statusName: string, assignedOracleTypes: string[] }>;

  getNewPropertyApplicationDetails(applicationId): Promise<{ area: number, areaSource: string, spaceTokenType: string, humanAddress: string, dataLink: string, geohashContour: string[], heightsContour: number[], credentialsHash: string }>;

  getNewPropertyApplicationOracle(applicationId, roleName): Promise<{ status: string, address: string, reward: number }>;

  getPropertyRegistryContract(address): Promise<any>;

  getCommunityContract(address, isDecentralized): Promise<any>;

  getCommunityRaContract(address, isDecentralized): Promise<any>;

  getCommunityProposalManagerContract(address): Promise<any>;
}

export enum ChainServiceEvents {
  SpaceTokenTransfer = 'Transfer',
  SetSpaceTokenContour = 'SetContour',
  SetSpaceTokenDataLink = 'SetDataLink',
  SaleOrderStatusChanged = 'SaleOrderStatusChanged',
  SaleOfferStatusChanged = 'SaleOfferStatusChanged',
  SaleOfferBidChanged = 'SaleOfferBidChanged',
  SaleOfferAskChanged = 'SaleOfferAskChanged',
  NewPropertyApplication = 'NewApplication',
  NewPropertyValidationStatusChanged = 'ValidationStatusChanged',
  NewPropertyApplicationStatusChanged = 'ApplicationStatusChanged',

  NewPrivatePropertyRegistry = 'Add',
  SetPrivatePropertyDetails = 'SetDetails',
  NewCommunity = 'CreateFundFifthStep',
  CommunityMint = 'LockerMint',
  CommunityBurn = 'LockerBurn',
  CommunityAddMarker = 'AddProposalMarker',
  CommunityRemoveMarker = 'RemoveProposalMarker',
  CommunityNewProposal = 'NewProposal',
  CommunityNayProposal = 'NayProposal',
  CommunityAyeProposal = 'AyeProposal',
  CommunityApprovedProposal = 'Approved',
  CommunityRejectedProposal = 'Rejected',

}

export interface ChainServiceSaleOrder {
  id: string;
  seller: string;
  operator: string;
  createdAt: number;
  ask: number;
  lastBuyer: string;
  tokenContract: string;

  escrowCurrency: number;

  details: ChainServiceSaleOrderDetails;
  status: number;
  statusName: string;
}

export interface ChainServiceSaleOffer {
  status: number;
  buyer: string;
  ask: number;
  bid: number;

  lastAskAt: number;
  lastBidAt: number;
  createdAt: number;
}

export interface ChainServiceSaleOrderDetails {
  tokenIds: string[];
  dataAddress: string;
  propertyToken?: string;
}
