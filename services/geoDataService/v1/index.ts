/*
 * Copyright ©️ 2019 GaltProject Society Construction and Terraforming Company
 * (Founded by [Nikolai Popeka](https://github.com/npopeka)
 *
 * Copyright ©️ 2019 Galt•Core Blockchain Company
 * (Founded by [Nikolai Popeka](https://github.com/npopeka) by
 * [Basic Agreement](ipfs/QmaCiXUmSrP16Gz8Jdzq6AJESY1EAANmmwha15uR3c1bsS)).
 */

import IExplorerDatabase, {SaleOrdersQuery} from "../../../database/interface";
import {
  default as IExplorerGeoDataService,
  FilterApplicationsGeoQuery,
  FilterSaleOrdersGeoQuery,
  FilterSpaceTokensGeoQuery
} from "../interface";
import {
  IExplorerChainContourEvent,
  IExplorerGeoDataEvent, IExplorerNewApplicationEvent,
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
    let spaceTokenId: string = event.returnValues.spaceTokenId || event.returnValues['id'] || event.returnValues['_tokenId'] || event.returnValues['tokenId'];
    await this.saveSpaceTokenById(spaceTokenId, { createdAtBlock: event.blockNumber });
  };
  
  async saveSpaceTokenById(spaceTokenId, additionalData = {}) {
    const geoData = await this.chainService.getSpaceTokenData(spaceTokenId);
    const owner = await this.chainService.getSpaceTokenOwner(spaceTokenId);
    
    const lockerOwner = await this.chainService.getLockerOwner(owner);
    if(spaceTokenId.toString() === '126') {
      console.log('126 owner', owner)
      console.log('126 lockerOwner', lockerOwner)
    }

    const dataLink = geoData.dataLink.replace('config_address=', '');

    return this.saveSpaceTokenByDataLink(dataLink, {
      spaceTokenId: spaceTokenId,
      owner: lockerOwner ? lockerOwner : owner,
      locker: lockerOwner ? owner : null,
      inLocker: !!lockerOwner,
      ...geoData,
      ...additionalData
    })
  }
  
  async saveSpaceTokenByDataLink(dataLink, geoData) {
    if(!isIpldHash(dataLink)) {
      return;
    }
    
    const spaceData = (await this.geesome.getObject(dataLink).catch(() => null)) || {};
    let {details, floorPlans, photos, ledgerIdentifier} = spaceData;

    if(!details) {
      details = spaceData.data;
    }

    if(!details || !details.region) {
      return;
    }

    const geoDataToSave = {
      spaceTokenId: geoData.spaceTokenId,
      tokenType: geoData.spaceTokenType,
      type: details.type,
      subtype: details.subtype,
      fullRegion: details.region.join(', '),
      regionLvl1: _.isArray(details.region[0]) ? '' : (details.region[0] || ''),
      regionLvl2: details.region[1] || '',
      regionLvl3: details.region[2] || '',
      regionLvl4: details.region[3] || '',
      regionLvl5: details.region[4] || '',
      regionLvl6: details.region[5] || '',
      regionLvl7: details.region[6] || '',
      regionLvl8: details.region[7] || '',
      regionLvl9: details.region[8] || '',
      photosCount: photos.length,
      floorPlansCount: floorPlans.length,
      bathroomsCount: details.bathrooms,
      bedroomsCount: details.bedrooms,
      yearBuilt: details.yearBuilt,
      owner: geoData.owner,
      locker: geoData.locker,
      inLocker: geoData.inLocker,
      area: geoData.area,
      areaSource: geoData.areaSource,
      dataLink: dataLink,
      dataJson: JSON.stringify(spaceData),
      geohashContourJson: JSON.stringify(geoData.geohashContour),
      geohashesCount: geoData.geohashContour.length,
      heightsContourJson: JSON.stringify(geoData.heightsContour),
      ledgerIdentifier: ledgerIdentifier,
      featureArray: details.features ? '|' + details.features.join('|') + '|' : '',
      createdAtBlock: geoData.createdAtBlock,
      updatedAtBlock: geoData.createdAtBlock
    };
    return this.database.addOrUpdateGeoData(geoDataToSave).catch(() => {
      return this.database.addOrUpdateGeoData(geoDataToSave);
    });
  }

  async handleSaleOrderEvent(event: IExplorerSaleOrderEvent) {
    let orderId: string = event.returnValues.orderId;
    let status: string = event.returnValues.status;
    
    if(parseInt(status) === 0) {
      return;
    }

    const chainOrder = await this.chainService.getSaleOrder(orderId);
    
    const dbSpaceTokens = await pIteration.map(chainOrder.details.spaceTokenIds, (id) => this.database.getSpaceTokenGeoData(id));

    const orderData = await this.geesome.getObject(chainOrder.details.dataAddress);

    let allFeatures = [];
    dbSpaceTokens.forEach(token => {
      const spaceData = JSON.parse(token.dataJson);
      allFeatures = allFeatures.concat((spaceData.details || {}).features || []);
    });

    allFeatures = _.uniq(allFeatures);


    let allTypesSubTypes = [];
    dbSpaceTokens.forEach(token => {
      allTypesSubTypes = allTypesSubTypes.concat([token.type, token.subtype].filter(s => s));
    });

    allTypesSubTypes = _.uniq(allTypesSubTypes);
    
    const dbOrder = await this.database.addOrUpdateSaleOrder({
      orderId,
      currency: chainOrder.escrowCurrency.toString(10) == '0' ? 'eth' : 'erc20',
      currencyAddress: chainOrder.tokenContract,
      //TODO: get currencyName from contract
      currencyName: 'DAI',
      ask: chainOrder.ask,
      seller: chainOrder.seller,
      description: orderData.description,
      dataJson: JSON.stringify(orderData),
      lastBuyer: chainOrder.lastBuyer,
      sumBathroomsCount: _.sumBy(dbSpaceTokens, 'bathroomsCount'),
      sumBedroomsCount: _.sumBy(dbSpaceTokens, 'bedroomsCount'),
      sumLandArea: _.sumBy(_.filter(dbSpaceTokens, {tokenType: 'land'}), 'bathroomsCount'),
      sumBuildingArea: _.sumBy(_.filter(dbSpaceTokens, {tokenType: 'building'}), 'bedroomsCount'),
      featureArray: '|' + allFeatures.join('|') + '|',
      typesSubtypesArray: '|' + allTypesSubTypes.join('|') + '|',
      createdAtBlock: event.blockNumber,
      updatedAtBlock: event.blockNumber
    });
    
    console.log('order saved', dbOrder.orderId);

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
  
  async handleNewApplicationEvent(event: IExplorerNewApplicationEvent) {
    const {contractAddress} = event;
    const {applicationId, applicant} = event.returnValues;

    const application = await this.chainService.getNewPropertyApplication(applicationId);
    const applicationDetails = await this.chainService.getNewPropertyApplicationDetails(applicationId);
    
    const oracles = [];
    const availableRoles = [];
    let totalOraclesReward = 0;
    
    await pIteration.map(application.assignedOracleTypes, async (roleName) => {
      const roleOracle = await this.chainService.getNewPropertyApplicationOracle(applicationId, roleName);
      if(roleOracle.status === 'pending') {
        availableRoles.push(roleName);
      }
      if(roleOracle.address) {
        oracles.push(roleOracle.address);
      }
      totalOraclesReward += roleOracle.reward;
    });
    
    const applicationData = {
      applicationId,
      applicantAddress: applicant,
      credentialsHash: applicationDetails.credentialsHash,
      feeCurrency: application.currency == '0' ? 'eth' : 'erc20',
      //TODO: get currency address of GALT
      feeCurrencyAddress: '',
      feeCurrencyName: application.currency == '0' ? 'ETH' : 'GALT',
      statusName: application.statusName,
      contractType: 'newPropertyManager',
      contractAddress,
      //TODO: fee amount
      feeAmount: 0,
      rolesArray: '|' + application.assignedOracleTypes.join('|') + '|',
      availableRolesArray: '|' + availableRoles.join('|') + '|',
      oraclesArray: '|' + oracles.join('|') + '|',
      dataJson: '',
      createdAtBlock: event.blockNumber,
      updatedAtBlock: event.blockNumber,
      totalOraclesReward
    };
    
    let dbApplication = await this.database.addOrUpdateApplication(applicationData);
    
    if(!dbApplication) {
      dbApplication = await this.database.addOrUpdateApplication(applicationData);
    }
    
    console.log('dbApplication.applicationId', dbApplication.applicationId);
    
    if(parseInt(application.spaceTokenId)) {
      const spaceToken = await this.saveSpaceTokenById(application.spaceTokenId, {
        createdAtBlock: event.blockNumber,
        ...applicationDetails
      });
      if(spaceToken) {
        await dbApplication.addSpaceTokens([spaceToken]);
      }
    } else {
      const spaceToken = await this.saveSpaceTokenByDataLink(applicationDetails.dataLink, {
        spaceTokenId: application.spaceTokenId || 'application_' + contractAddress + '_' + applicationId,
        createdAtBlock: event.blockNumber,
        ...applicationDetails
      });
      if(spaceToken) {
        await dbApplication.addSpaceTokens([spaceToken]);
      }
    }
    // console.log('spaceToken', spaceToken);
    
  };

  async filterApplications(filterQuery: FilterApplicationsGeoQuery) {
    if(filterQuery.surroundingsGeohashBox && filterQuery.surroundingsGeohashBox.length) {
      filterQuery.tokensIds = (await this.geohashService.getContoursByParentGeohashArray(filterQuery.surroundingsGeohashBox)).map(i => i.spaceTokenId.toString());
    }
    console.log('filterQuery.tokensIds', filterQuery.tokensIds);
    return {
      list: await this.database.filterApplications(filterQuery),
      total: await this.database.filterApplicationsCount(filterQuery)
    };
  }

  async getApplicationById(applicationId, contractAddress) {
    return this.database.getApplication(applicationId, contractAddress);
  }

  async filterSpaceTokens(filterQuery: FilterSpaceTokensGeoQuery) {
    if(filterQuery.surroundingsGeohashBox && filterQuery.surroundingsGeohashBox.length) {
      filterQuery.tokensIds = (await this.geohashService.getContoursByParentGeohashArray(filterQuery.surroundingsGeohashBox)).map(i => i.spaceTokenId.toString());
    }
    console.log('filterQuery.tokensIds', filterQuery.tokensIds);
    return {
      list: await this.database.filterSpaceTokens(filterQuery),
      total: await this.database.filterSpaceTokensCount(filterQuery)
    };
  }

  async getSpaceTokenById(spaceTokenId) {
    return this.database.getSpaceToken(spaceTokenId);
  }
}
