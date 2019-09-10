import {IExplorerChainContourEvent} from "../interfaces";

export default interface IExplorerChainService {
  websocketProvider: any;
  web3: any;

  spaceGeoData: any;
  propertyMarket: any;
  contractsConfig: any;

  callbackOnReconnect: any;

  getEventsFromBlock(eventName: string, blockNumber?: number): Promise<IExplorerChainContourEvent[]>;

  subscribeForNewEvents(eventName: string, blockNumber: number, callback): void;

  getCurrentBlock(): Promise<number>;

  onReconnect(callback): void;

  getSpaceTokenArea(spaceTokenId): Promise<number>;

  getSaleOrder(orderId): Promise<ChainServiceSaleOrder>;
}

export enum ChainServiceEvents {
  SetSpaceTokenContour = 'SetSpaceTokenContour',
  SetSpaceTokenDataLink = 'SetSpaceTokenDataLink',
  SaleOrderStatusChanged = 'SaleOrderStatusChanged'
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
}

export interface ChainServiceSaleOrderDetails {
  spaceTokenIds: string[];
  dataAddress: string;
}
