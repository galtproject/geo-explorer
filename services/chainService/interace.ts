import {IExplorerChainContourEvent} from "../interfaces";

export default interface IExplorerChainService {
  websocketProvider: any;
  web3: any;

  spaceGeoData: any;
  contractsConfig: any;

  callbackOnReconnect: any;
  
  getEventsFromBlock(eventName: string, blockNumber?: number): Promise<IExplorerChainContourEvent[]>;

  subscribeForNewEvents(eventName: string, blockNumber: number, callback): void;

  getCurrentBlock(): Promise<number>;

  onReconnect(callback): void;
}
