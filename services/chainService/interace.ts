export default interface IExplorerChainService {
    getEventsFromBlock(eventName: string, blockNumber?: number): Promise<[{returnValues: {contour: number[], id: string}}]>;
}
