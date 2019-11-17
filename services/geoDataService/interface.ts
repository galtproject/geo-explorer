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
  IExplorerNewPrivatePropertyRegistryEvent, IExplorerSaleOfferEvent,
  IExplorerSaleOrderEvent
} from "../interfaces";
import {
  SaleOrdersQuery,
  ISaleOrder,
  ApplicationsQuery,
  IApplication,
  SpaceTokensQuery,
  ISpaceTokenGeoData, ISaleOffer, SaleOffersQuery, PrivatePropertyRegistryQuery, IPrivatePropertyRegistry
} from "../../database/interface";

export default interface IExplorerGeoDataService {
  handleChangeSpaceTokenDataEvent(spaceGeoDataAddress, event: IExplorerGeoDataEvent): Promise<void>;
  
  handleSaleOrderEvent(event: IExplorerSaleOrderEvent): Promise<void>;
  
  handleSaleOfferEvent(event: IExplorerSaleOfferEvent): Promise<void>;

  filterOrders(ordersQuery: FilterSaleOrdersGeoQuery): Promise<ISaleOrdersListResponse>;

  getOrderById(orderId, contractAddress): Promise<ISaleOrder>;

  filterSaleOffers(offersQuery: SaleOffersQuery): Promise<ISaleOffersListResponse>;

  getSaleOfferById(orderId, buyer, contractAddress): Promise<ISaleOffer>;

  handleNewApplicationEvent(event: IExplorerNewApplicationEvent): Promise<void>;

  filterApplications(applicationsQuery: FilterApplicationsGeoQuery): Promise<IApplicationsListResponse>;

  getApplicationById(applicationId, contractAddress): Promise<IApplication>;

  filterSpaceTokens(spaceTokensQuery: FilterSpaceTokensGeoQuery): Promise<ISpaceTokensListResponse>;

  getSpaceTokenById(tokenId, contractAddress): Promise<ISpaceTokenGeoData>;

  handleNewPrivatePropertyRegistryEvent(event: IExplorerNewPrivatePropertyRegistryEvent): Promise<void>;

  updatePrivatePropertyRegistry(address): Promise<void>;

  filterPrivatePropertyRegistries(pprQuery: FilterPrivatePropertyRegistryGeoQuery): Promise<IPrivatePropertyRegistryListResponse>;

  getPrivatePropertyRegistry(address): Promise<IPrivatePropertyRegistry>;
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

export interface FilterPrivatePropertyRegistryGeoQuery extends PrivatePropertyRegistryQuery {
  surroundingsGeohashBox?: string[];
}

export interface IPrivatePropertyRegistryListResponse {
  list: IPrivatePropertyRegistry[];
  total: number;
}

export interface ISpaceTokensListResponse {
  list: ISpaceTokenGeoData[];
  total: number;
}

export interface ISaleOffersListResponse {
  list: ISaleOffer[];
  total: number;
}
