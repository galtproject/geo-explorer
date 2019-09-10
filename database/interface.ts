export default interface IExplorerDatabase {
  flushDatabase(): Promise<void>;

  addOrUpdateContour(contourGeohashes: string[], spaceTokenId: number): Promise<void>;

  getContourBySpaceTokenId(spaceTokenId): Promise<string[]>;

  getContoursByParentGeohash(parentGeohash: string): Promise<[{ contour: string[], spaceTokenId: number }]>;

  getSpaceTokenGeoData(spaceTokenId): Promise<ISpaceTokenGeoData>;
  
  addOrUpdateGeoData(geoData: ISpaceTokenGeoData): Promise<ISpaceTokenGeoData>;

  getSaleOrder(orderId): Promise<ISaleOrder>;
  
  addOrUpdateSaleOrder(saleOrder: ISaleOrder): Promise<ISaleOrder>;

  getValue(key: string): Promise<string>;

  setValue(key: string, content: string): Promise<void>;

  clearValue(key: string): Promise<void>;
}

export interface ISpaceTokenGeoData {
  spaceTokenId;
  type;
  subtype;
  fullRegion;
  regionLvl1?;
  regionLvl2?;
  regionLvl3?;
  regionLvl4?;
  regionLvl5?;
  regionLvl6?;
  regionLvl7?;
  regionLvl8?;
  regionLvl9?;
  photosCount;
  floorPlansCount;
  bathroomsCount;
  bedroomsCount;
  yearBuilt;
  area;
}

export interface ISaleOrder {
  orderId;
  currency;
  currencyAddress;
  price;
  description;
  
  addSpaceTokens?(tokensObjects);
}
