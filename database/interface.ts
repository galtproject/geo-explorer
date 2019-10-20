/*
 * Copyright ©️ 2019 GaltProject Society Construction and Terraforming Company
 * (Founded by [Nikolai Popeka](https://github.com/npopeka)
 *
 * Copyright ©️ 2019 Galt•Core Blockchain Company
 * (Founded by [Nikolai Popeka](https://github.com/npopeka) by
 * [Basic Agreement](ipfs/QmaCiXUmSrP16Gz8Jdzq6AJESY1EAANmmwha15uR3c1bsS)).
 */

export default interface IExplorerDatabase {
  flushDatabase(): Promise<void>;

  addOrUpdateContour(contourGeohashes: string[], tokenId: number): Promise<void>;

  getContourBySpaceTokenId(tokenId): Promise<string[]>;

  getContoursByParentGeohash(parentGeohash: string): Promise<[{ contour: string[], tokenId: number }]>;

  getSpaceTokenGeoData(tokenId, contractAddress): Promise<ISpaceTokenGeoData>;
  
  addOrUpdateGeoData(geoData: ISpaceTokenGeoData): Promise<ISpaceTokenGeoData>;

  getSaleOrder(orderId, contractAddress): Promise<ISaleOrder>;
  
  addOrUpdateSaleOrder(saleOrder: ISaleOrder): Promise<ISaleOrder>;

  filterSaleOrders(filterQuery: SaleOrdersQuery): Promise<ISaleOrder[]>;
  
  filterSaleOrdersCount(filterQuery: SaleOrdersQuery): Promise<number>;

  getApplication(applicationId, contractAddress): Promise<IApplication>;

  addOrUpdateApplication(application: IApplication): Promise<IApplication>;

  filterApplications(filterQuery: ApplicationsQuery): Promise<IApplication[]>;

  filterApplicationsCount(filterQuery: ApplicationsQuery): Promise<number>;
  
  getSpaceToken(tokenId, contractAddress): Promise<ISpaceTokenGeoData>;

  filterSpaceTokens(filterQuery: SpaceTokensQuery): Promise<ISpaceTokenGeoData[]>;

  filterSpaceTokensCount(filterQuery: SpaceTokensQuery): Promise<number>;
  
  getValue(key: string): Promise<string>;

  setValue(key: string, content: string): Promise<void>;

  clearValue(key: string): Promise<void>;
}

export interface ISpaceTokenGeoData {
  tokenId;
  tokenType;
  type;
  subtype;
  contractAddress;
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
  owner;
  locker;
  inLocker;
  areaSource;
  ledgerIdentifier;
  dataLink;
  dataJson;
  geohashContourJson;
  geohashesCount;
  heightsContourJson;
  featureArray;
  createdAtBlock;
  updatedAtBlock;

  spaceTokensOrders?;
}

export interface ISaleOrder {
  orderId;
  currency?;
  currencyAddress?;
  currencyName?;
  seller?;
  ask?;
  description?;
  lastBuyer?;
  createdAtBlock;
  updatedAtBlock;
  dataJson?;
  contractAddress;

  featureArray?;
  typesSubtypesArray?;
  minLandArea?;
  maxLandArea?;
  sumLandArea?;
  minBuildingArea?;
  maxBuildingArea?;
  sumBuildingArea?;
  minYearBuilt?;
  maxYearBuilt?;
  sumBathroomsCount?;
  sumBedroomsCount?;
  maxBathroomsCount?;
  maxBedroomsCount?;
  minBathroomsCount?;
  minBedroomsCount?;

  spaceTokens?;
  addSpaceTokens?(tokensObjects);
  setSpaceTokens?(tokensObjects);
}

export interface IApplication {
  applicationId;
  applicantAddress;
  feeCurrency;
  feeAmount;
  feeCurrencyAddress;
  feeCurrencyName;
  statusName;
  credentialsHash;
  contractType;
  contractAddress;
  rolesArray;
  availableRolesArray;
  oraclesArray;
  totalOraclesReward;
  createdAtBlock;
  updatedAtBlock;
  dataJson;

  addSpaceTokens?(tokensObjects);
}

export interface SaleOrdersQuery {
  limit?: number;
  offset?: number;
  
  sortBy?: string;
  sortDir?: string;
  
  contractAddress: string;
  tokensIds?: string[];
  
  features?: string[];
  
  currency?: string;
  currencyAddress?: string;
  
  regions?: string[];
  types?: string[];
  subtypes?: string[];
  
  askMin?: number;
  askMax?: number;

  buildingAreaMin?: number;
  buildingAreaMax?: number;

  landAreaMin?: number;
  landAreaMax?: number;

  bedroomsCountMin?: number;
  bathroomsCountMin?: number;
}

export interface ApplicationsQuery {
  limit?: number;
  offset?: number;

  sortBy?: string;
  sortDir?: string;

  tokensIds?: string[];
  tokenType?: string;
  contractType?: string;
  availableRoles?: string[];
  oracleAddress?: string;

  features?: string[];

  feeAmount?: number;
  feeCurrency?: string;
  feeCurrencyAddress?: string;

  applicantAddress?: string;
  contractAddress?: string;

  regions?: string[];
  types?: string[];
  subtypes?: string[];

  geohashesCountMin?: number;
  geohashesCountMax?: number;

  totalOraclesRewardMin?: number;
  totalOraclesRewardMax?: number;

  areaMin?: number;
  areaMax?: number;
}

export interface SpaceTokensQuery {
  limit?: number;
  offset?: number;

  sortBy?: string;
  sortDir?: string;

  contractAddress: string;
  tokensIds?: string[];
  tokenType?: string;
  inLocker?: boolean;

  features?: string[];

  regions?: string[];
  types?: string[];
  subtypes?: string[];

  geohashesCountMin?: number;
  geohashesCountMax?: number;

  areaMin?: number;
  areaMax?: number;

  owner?: string;
}

