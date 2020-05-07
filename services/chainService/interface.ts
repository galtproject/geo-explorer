/*
 * Copyright ©️ 2019 Galt•Project Society Construction and Terraforming Company
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

  configFile: string;

  spaceGeoData: any;
  propertyMarket: any;
  contractsConfig: any;
  spaceToken: any;
  newPropertyManager: any;

  tokenizableFactory: any;

  privatePropertyGlobalRegistry: any;
  privatePropertyMarket: any;

  ppDepositHolder;
  ppHomeMediatorFactory;
  ppForeignMediatorFactory;

  communityFactory: any;
  communityMockFactory: any;

  pprCommunityFactory: any;
  pprManagedCommunityFactory: any;

  decentralizedCommunityRegistry: any;
  pprCommunityRegistry: any;

  ppLockerFactory: any;

  callbackOnReconnect: any;

  getEventsFromBlock(contract, eventName: string, blockNumber?: number, filter?: any): Promise<IExplorerChainContourEvent[]>;

  subscribeForNewEvents(contract, eventName: string, blockNumber: number, callback): void;

  isSubscribedToEvent(contractAddress, eventName): boolean;

  getContractNameByAddress(contractAddress): string;

  getCurrentBlock(): Promise<number>;

  onReconnect(callback): void;

  getLockerOwner(address): Promise<string>;

  getLockerType(address): Promise<string>;

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

  getCommunityFactoryContract(address): Promise<any>;

  getPPTokenRegistryContract(address): Promise<any>;

  getTokenizableContract(address): Promise<any>;

  getPropertyRegistryContract(address, old?): Promise<any>;

  getLockerContract(address): Promise<any>;

  getPropertyRegistryControllerContract(address, old?): Promise<any>;

  getPropertyRegistryVerificationContract(address): Promise<any>;

  getCommunityStorageContract(address, isPpr?): Promise<any>;

  getCommunityStorageAbi(isPpr?): any;

  getCommunityRuleRegistryContract(address): Promise<any>;

  getCommunityRuleRegistryAbi(): Promise<any>;

  getCommunityRaContract(address, isPpr): Promise<any>;

  getCommunityProposalManagerContract(address): Promise<any>;

  getCommunityFundRegistryContract(address): Promise<any>;

  getMediatorFactoryAbi(): any;

  getMediatorContract(address, mediatorType): Promise<any>;

  hexToString(value): string;

  stringToHex(value): string;

  weiToEther(value): number;

  getContractMethod(contractName, methodName): any;

  getBlockTimestamp(blockNumber): Promise<number>;

  getNetworkId(): Promise<number>;

  getTransactionReceipt(txId, abiAddressArr): any;

  getTransactionArgs(txId, abi): any;

  parseData(data, abi, decimals?): {
    methodSignature: any,
    methodAbi?: any,
    methodName?: any,
    sourceInputs?: any,
    inputs?: any,
    inputsFields?: any,
    inputsDetails?: any
  };
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

  NewTokenizableContract = 'Build',
  TransferTokenizableBalance = 'Transfer',

  NewPrivatePropertyRegistry = 'AddToken',
  SetPrivatePropertyDetails = 'SetDetails',
  BurnPrivatePropertyToken = 'Burn',
  SetPrivatePropertyBurnTimeout = 'SetBurnTimeout',
  InitiatePrivatePropertyBurnTimeout = 'InitiateTokenBurn',
  CancelPrivatePropertyBurnTimeout = 'CancelTokenBurn',
  PrivatePropertyNewProposal = 'NewProposal',
  PrivatePropertyApproveProposal = 'ProposalApproval',
  PrivatePropertyRejectProposal = 'ProposalRejection',
  PrivatePropertyExecuteProposal = 'ProposalExecuted',
  PrivatePropertySetLegalAgreement = 'SetLegalAgreementIpfsHash',
  PrivatePropertySetDataLink = 'SetContractDataLink',
  PrivatePropertySetMinter = 'SetMinter',
  PrivatePropertySetController = 'SetController',
  PrivatePropertyTransferOwnership = 'OwnershipTransferred',
  PrivatePropertySetGeoDataManager = 'SetGeoDataManager',
  PrivatePropertySetFeeManager = 'SetFeeManager',
  PrivatePropertySetBurner = 'SetBurner',
  PrivatePropertyEnableVerification = 'EnableVerification',
  PrivatePropertyDisableVerification = 'DisableVerification',
  PrivatePropertySetVerification = 'SetContourVerificationManager',
  PrivatePropertySetExtraData = 'SetPropertyExtraData',

  NewPropertyLocker = 'NewPPLocker',
  LockerTransferShare = 'TransferShare',
  LockerChangeOwners = 'ChangeOwners',

  PPDepositHolderDeposit = 'Deposit',
  PPDepositHolderWithdraw = 'Withdrawal',

  PPMediatorNew = 'NewPPMediator',
  PPMediatorSetOtherSide = 'SetMediatorContractOnOtherSide',

  NewCommunity = 'CreateFundDone',
  CommunityMint = 'TokenMint',
  CommunityBurn = 'TokenBurn',
  CommunityTransferReputation = 'Transfer',
  CommunityRevokeReputation = 'RevokeDelegated',
  CommunityAddMarker = 'AddProposalMarker',
  CommunityRemoveMarker = 'RemoveProposalMarker',
  CommunityChangeName = 'SetNameAndDataLink',
  CommunityNewProposal = 'NewProposal',
  CommunityNayProposal = 'NayProposal',
  CommunityAyeProposal = 'AyeProposal',
  CommunityAbstainProposal = 'AbstainProposal',
  CommunityApprovedProposal = 'Approved',
  CommunityRejectedProposal = 'Rejected',
  CommunityExecuteProposal = 'Execute',
  CommunityAddRule = 'AddFundRule',
  CommunityRemoveRule = 'DisableFundRule',
  CommunityAddMeeting = 'AddMeeting',
  CommunityApproveToken = 'ApproveMint',
  CommunityExpelToken = 'Expel',
  CommunityBurnExpelledToken = 'BurnExpelled',
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
  dataLink: string;
  propertyToken?: string;
}
