import IExplorerDatabase, {FilterSaleOrdersQuery} from "../../../database/interface";
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
    
    const {data, floorPlans, photos} = await this.geesome.getObject(dataLink).catch(() => {});
    if(!data || !data.region) {
      return;
    }
    
    const area = await this.chainService.getSpaceTokenArea(spaceTokenId);
    console.log('area', area);

    await this.database.addOrUpdateGeoData({
      spaceTokenId: spaceTokenId,
      type: data.type,
      subtype: data.subtype,
      fullRegion: data.region.join(', '),
      regionLvl1: data.region[0],
      regionLvl2: data.region[1],
      regionLvl3: data.region[2],
      regionLvl4: data.region[3],
      regionLvl5: data.region[4],
      regionLvl6: data.region[5],
      regionLvl7: data.region[6],
      regionLvl8: data.region[7],
      regionLvl9: data.region[8],
      photosCount: photos.length,
      floorPlansCount: floorPlans.length,
      bathroomsCount: data.bathrooms,
      bedroomsCount: data.bedrooms,
      yearBuilt: data.yearBuilt,
      area
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
      price: chainOrder.ask,
      description: orderData.description
    });
    
    const dbSpaceTokens = await pIteration.map(chainOrder.details.spaceTokenIds, (id) => this.database.getSpaceTokenGeoData(id));

    await dbOrder.addSpaceTokens(dbSpaceTokens);
  };
  
  async filterOrders(filterQuery: FilterSaleOrdersGeoQuery) {
    if(filterQuery.surroundingsGeohashBox && filterQuery.surroundingsGeohashBox.length) {
      filterQuery.tokensIds = (await this.geohashService.getContoursByParentGeohashArray(filterQuery.surroundingsGeohashBox)).map(i => i.spaceTokenId.toString());
    }
    console.log('filterQuery.tokensIds', filterQuery.tokensIds);
    return this.database.filterSaleOrders(filterQuery);
  }
}
