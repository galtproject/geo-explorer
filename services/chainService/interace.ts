import {IExplorerChainContourEvent} from "../interfaces";

export default interface IExplorerChainService {
    getEventsFromBlock(eventName: string, blockNumber?: number): Promise<IExplorerChainContourEvent[]>;
}
