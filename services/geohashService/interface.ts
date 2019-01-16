import {IExplorerChainContourEvent, IExplorerResultContour} from "../interfaces";

export default interface IExplorerGeohashService {
    handleChangeContourEvent(event: IExplorerChainContourEvent): Promise<void>;
    getContoursByParentGeohash(parentGeohash: string): Promise<[IExplorerResultContour]>;
    getContoursByParentGeohashArray(parentGeohash: string[]): Promise<[IExplorerResultContour]>;
    getContoursByInnerGeohash(innerGeohash: string): Promise<[IExplorerResultContour]>;
}
