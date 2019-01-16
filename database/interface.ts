export default interface IExplorerDatabase {
    addOrUpdateContour(contourGeohashes: string[], spaceTokenId: number);
    getContoursByParentGeohash(parentGeohash: string): Promise<[{contour: string[], spaceTokenId: number}]>;
}
