/*
 * Copyright ©️ 2019 GaltProject Society Construction and Terraforming Company
 * (Founded by [Nikolai Popeka](https://github.com/npopeka)
 *
 * Copyright ©️ 2019 Galt•Core Blockchain Company
 * (Founded by [Nikolai Popeka](https://github.com/npopeka) by
 * [Basic Agreement](ipfs/QmaCiXUmSrP16Gz8Jdzq6AJESY1EAANmmwha15uR3c1bsS)).
 */

import {
  IExplorerGeoDataEvent,
  IExplorerNewApplicationEvent,
  IExplorerNewPrivatePropertyRegistryEvent,
  IExplorerSaleOrderEvent
} from "../interfaces";
import {
  SaleOrdersQuery,
  ISaleOrder,
  ApplicationsQuery,
  IApplication,
  SpaceTokensQuery,
  ISpaceTokenGeoData
} from "../../database/interface";

export default interface IExplorerGeoDataService {
  handleChangeSpaceTokenDataEvent(spaceGeoDataAddress, event: IExplorerGeoDataEvent): Promise<void>;
  
  handleSaleOrderEvent(propertyMarketAddress, event: IExplorerSaleOrderEvent): Promise<void>;

  filterOrders(ordersQuery: FilterSaleOrdersGeoQuery): Promise<ISaleOrdersListResponse>;

  getOrderById(orderId, contractAddress): Promise<ISaleOrder>;

  handleNewApplicationEvent(event: IExplorerNewApplicationEvent): Promise<void>;

  filterApplications(applicationsQuery: FilterApplicationsGeoQuery): Promise<IApplicationsListResponse>;

  getApplicationById(applicationId, contractAddress): Promise<IApplication>;

  filterSpaceTokens(spaceTokensQuery: FilterSpaceTokensGeoQuery): Promise<ISpaceTokensListResponse>;

  getSpaceTokenById(tokenId, contractAddress): Promise<ISpaceTokenGeoData>;

  handleNewPrivatePropertyRegistryEvent(event: IExplorerNewPrivatePropertyRegistryEvent): Promise<void>;
}

export interface FilterSaleOrdersGeoQuery extends SaleOrdersQuery {
  surroundingsGeohashBox?: string[];
}

export interface ISaleOrdersListResponse {
  list: ISaleOrder[];
  total: number;
}

export interface FilterApplicationsGeoQuery extends ApplicationsQuery {
  surroundingsGeohashBox?: string[];
}

export interface IApplicationsListResponse {
  list: IApplication[];
  total: number;
}

export interface FilterSpaceTokensGeoQuery extends SpaceTokensQuery {
  surroundingsGeohashBox?: string[];
}

export interface ISpaceTokensListResponse {
  list: ISpaceTokenGeoData[];
  total: number;
}
