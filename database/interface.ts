export default interface IExplorerDatabase {
    flushDatabase(): Promise<void>;
    addOrUpdateContour(contourGeohashes: string[], spaceTokenId: number): Promise<void>;
    getContoursByParentGeohash(parentGeohash: string): Promise<[{contour: string[], spaceTokenId: number}]>;
}
