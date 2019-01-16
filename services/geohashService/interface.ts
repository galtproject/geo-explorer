import {IExplorerChainContourEvent} from "../interfaces";

export default interface IExplorerGeohashService {
    handleChangeContourEvent(event: IExplorerChainContourEvent): Promise<void>;
    getContoursByParentGeohash(parentGeohash: string): Promise<[{contour: string[], spaceTokenId: number}]>;
    getContoursByInnerGeohash(innerGeohash: string): Promise<[{contour: string[], spaceTokenId: number}]>;
}
