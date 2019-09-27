/*
 * Copyright ©️ 2019 GaltProject Society Construction and Terraforming Company
 * (Founded by [Nikolai Popeka](https://github.com/npopeka)
 *
 * Copyright ©️ 2019 Galt•Core Blockchain Company
 * (Founded by [Nikolai Popeka](https://github.com/npopeka) by
 * [Basic Agreement](ipfs/QmaCiXUmSrP16Gz8Jdzq6AJESY1EAANmmwha15uR3c1bsS)).
 */

import {IExplorerGeoDataEvent, IExplorerSaleOrderEvent} from "../interfaces";
import {SaleOrdersQuery, ISaleOrder} from "../../database/interface";

export default interface IExplorerGeoDataService {
  handleChangeSpaceTokenDataEvent(event: IExplorerGeoDataEvent): Promise<void>;
  
  handleSaleOrderEvent(event: IExplorerSaleOrderEvent): Promise<void>;

  filterOrders(ordersQuery: FilterSaleOrdersGeoQuery): Promise<ISaleOrdersListResponse>;

  getOrderById(orderId): Promise<ISaleOrder>;
}

export interface FilterSaleOrdersGeoQuery extends SaleOrdersQuery {
  surroundingsGeohashBox?: string[];
}

export interface ISaleOrdersListResponse {
  list: ISaleOrder[];
  total: number;
}
