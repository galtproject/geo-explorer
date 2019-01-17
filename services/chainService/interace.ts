import {IExplorerChainContourEvent} from "../interfaces";

export default interface IExplorerChainService {
    getEventsFromBlock(eventName: string, blockNumber?: number): Promise<IExplorerChainContourEvent[]>;
    subscribeForNewEvents(eventName: string, blockNumber: number, callback): void;
    getCurrentBlock(): Promise<number>;
    onReconnect(callback): void;
}
