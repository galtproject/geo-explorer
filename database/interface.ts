export default interface IExplorerDatabase {
    flushDatabase(): Promise<void>;
    
    addOrUpdateContour(contourGeohashes: string[], spaceTokenId: number): Promise<void>;
    getContoursByParentGeohash(parentGeohash: string): Promise<[{contour: string[], spaceTokenId: number}]>;

    getValue(key: string): Promise<string>;
    setValue(key: string, content: string): Promise<void>;
    clearValue(key: string): Promise<void>;
}
