import {IExplorerGeoDataEvent, IExplorerSaleOrderEvent} from "../interfaces";

export default interface IExplorerGeoDataService {
  handleChangeSpaceTokenDataEvent(event: IExplorerGeoDataEvent): Promise<void>;
  
  handleSaleOrderEvent(event: IExplorerSaleOrderEvent): Promise<void>;
}
