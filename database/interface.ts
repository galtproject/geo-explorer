export default interface IExplorerDatabase {
    addOrUpdateContour(contourGeohashes: string[], spaceTokenId: number);
    getContoursByParentGeohash(geohash: string): Promise<[{contour: string[], spaceTokenId: number}]>;
    getContoursByInnerGeohash(geohash: string): Promise<[{contour: string[], spaceTokenId: number}]>;
}
