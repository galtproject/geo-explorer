export default interface IExplorerDatabase {
    addOrUpdateContour(contourGeohashes: string[], spaceTokenId: number);
    getContoursByGeohash(geohash: string): Promise<[{contour: string[], spaceTokenId: number}]>;
}
