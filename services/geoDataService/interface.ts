import {IExplorerGeoDataEvent, IExplorerSaleOrderEvent} from "../interfaces";
import {FilterSaleOrdersQuery, ISaleOrder} from "../../database/interface";

export default interface IExplorerGeoDataService {
  handleChangeSpaceTokenDataEvent(event: IExplorerGeoDataEvent): Promise<void>;
  
  handleSaleOrderEvent(event: IExplorerSaleOrderEvent): Promise<void>;

  filterOrders(ordersQuery: FilterSaleOrdersGeoQuery): Promise<ISaleOrder[]>;
}

export interface FilterSaleOrdersGeoQuery extends FilterSaleOrdersQuery {
  surroundingsGeohashBox?: string[];
}
