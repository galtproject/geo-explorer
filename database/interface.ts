export default interface IExplorerDatabase {
    addOrUpdateContour(contourGeohashes: string[], spaceTokenId: string);
    getContoursByGeohash(geohash: string): Promise<[{contour: string[], spaceTokenId: string}]>;
}
