/*
 * Copyright ©️ 2019 GaltProject Society Construction and Terraforming Company
 * (Founded by [Nikolai Popeka](https://github.com/npopeka)
 *
 * Copyright ©️ 2019 Galt•Core Blockchain Company
 * (Founded by [Nikolai Popeka](https://github.com/npopeka) by
 * [Basic Agreement](ipfs/QmaCiXUmSrP16Gz8Jdzq6AJESY1EAANmmwha15uR3c1bsS)).
 */

import IExplorerDatabase, {SaleOrdersQuery} from "../../../database/interface";
import {default as IExplorerGeoDataService, FilterSaleOrdersGeoQuery} from "../interface";
import {
  IExplorerChainContourEvent,
  IExplorerGeoDataEvent,
  IExplorerResultContour,
  IExplorerSaleOrderEvent
} from "../../interfaces";
import IExplorerChainService from "../../chainService/interface";
import IExplorerGeohashService from "../../geohashService/interface";

const _ = require("lodash");
const pIteration = require("p-iteration");

const {GeesomeClient} = require('geesome-libs/src/GeesomeClient');
const {isIpldHash} = require('geesome-libs/src/ipfsHelper');

module.exports = async (database: IExplorerDatabase, geohashService: IExplorerGeohashService, chainService: IExplorerChainService) => {
  const geesome = new GeesomeClient({
    server: 'https://geesome-node.galtproject.io:7722',
    apiKey: "MCYK5V1-15Q48EQ-QSEKRWX-1ZS0SPW"
  });
  
  await geesome.init();
  await geesome.initRuntimeIpfsNode();
  
  return new ExplorerGeoDataV1Service(database, geohashService, chainService, geesome);
};

class ExplorerGeoDataV1Service implements IExplorerGeoDataService {
  database: IExplorerDatabase;
  chainService: IExplorerChainService;
  geohashService: IExplorerGeohashService;
  geesome;

  constructor(_database, _geohashService, _chainService, _geesome) {
    this.database = _database;
    this.geesome = _geesome;
    this.geohashService = _geohashService;
    this.chainService = _chainService;
  }

  async handleChangeSpaceTokenDataEvent(event: IExplorerGeoDataEvent) {
    let dataLink: string = event.returnValues.dataLink.replace('config_address=', '');
    let spaceTokenId: string = event.returnValues.spaceTokenId || event.returnValues['id'];

    if(!isIpldHash(dataLink)) {
      return;
    }
    
    const spaceData = await this.geesome.getObject(dataLink).catch(() => {});
    let {details, floorPlans, photos, ledgerIdentifier} = spaceData;
    
    if(!details) {
      details = spaceData.data;
    }
    
    if(!details || !details.region) {
      return;
    }
    
    const geoData = await this.chainService.getSpaceTokenData(spaceTokenId);
    const owner = await this.chainService.getSpaceTokenOwner(spaceTokenId);
    
    await this.database.addOrUpdateGeoData({
      spaceTokenId: spaceTokenId,
      tokenType: geoData.spaceTokenType,
      type: details.type,
      subtype: details.subtype,
      fullRegion: details.region.join(', '),
      regionLvl1: details.region[0],
      regionLvl2: details.region[1],
      regionLvl3: details.region[2],
      regionLvl4: details.region[3],
      regionLvl5: details.region[4],
      regionLvl6: details.region[5],
      regionLvl7: details.region[6],
      regionLvl8: details.region[7],
      regionLvl9: details.region[8],
      photosCount: photos.length,
      floorPlansCount: floorPlans.length,
      bathroomsCount: details.bathrooms,
      bedroomsCount: details.bedrooms,
      yearBuilt: details.yearBuilt,
      owner: owner,
      area: geoData.area,
      areaSource: geoData.areaSource,
      dataLink: dataLink,
      dataJson: JSON.stringify(spaceData),
      geohashContourJson: JSON.stringify(geoData.geohashContour),
      heightsContourJson: JSON.stringify(geoData.heightsContour),
      ledgerIdentifier: ledgerIdentifier,
      featureArray: details.features ? '|' + details.features.join('|') + '|' : ''
    });
  };

  async handleSaleOrderEvent(event: IExplorerSaleOrderEvent) {
    let orderId: string = event.returnValues.orderId;
    let status: string = event.returnValues.status;
    
    if(parseInt(status) === 0) {
      return;
    }

    const chainOrder = await this.chainService.getSaleOrder(orderId);

    const orderData = await this.geesome.getObject(chainOrder.details.dataAddress);

    const dbOrder = await this.database.addOrUpdateSaleOrder({
      orderId,
      currency: chainOrder.escrowCurrency.toString(10) == '0' ? 'eth' : 'erc20',
      currencyAddress: chainOrder.tokenContract,
      //TODO: get currencyName from contract
      currencyName: 'DAI',
      ask: chainOrder.ask,
      description: orderData.description,
      dataJson: JSON.stringify(orderData),
      lastBuyer: chainOrder.lastBuyer
    });
    
    const dbSpaceTokens = await pIteration.map(chainOrder.details.spaceTokenIds, (id) => this.database.getSpaceTokenGeoData(id));

    await dbOrder.addSpaceTokens(dbSpaceTokens);
  };
  
  async filterOrders(filterQuery: FilterSaleOrdersGeoQuery) {
    if(filterQuery.surroundingsGeohashBox && filterQuery.surroundingsGeohashBox.length) {
      filterQuery.tokensIds = (await this.geohashService.getContoursByParentGeohashArray(filterQuery.surroundingsGeohashBox)).map(i => i.spaceTokenId.toString());
    }
    console.log('filterQuery.tokensIds', filterQuery.tokensIds);
    return {
      list: await this.database.filterSaleOrders(filterQuery),
      total: await this.database.filterSaleOrdersCount(filterQuery)
    };
  }
  
  async getOrderById(orderId) {
    return this.database.getSaleOrder(orderId);
  }
}
