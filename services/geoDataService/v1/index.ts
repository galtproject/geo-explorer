/*
 * Copyright ©️ 2019 GaltProject Society Construction and Terraforming Company
 * (Founded by [Nikolai Popeka](https://github.com/npopeka)
 *
 * Copyright ©️ 2019 Galt•Core Blockchain Company
 * (Founded by [Nikolai Popeka](https://github.com/npopeka) by
 * [Basic Agreement](ipfs/QmaCiXUmSrP16Gz8Jdzq6AJESY1EAANmmwha15uR3c1bsS)).
 */

import IExplorerDatabase, {ISaleOffer, SaleOffersQuery, SaleOrdersQuery} from "../../../database/interface";
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

  async handleChangeSpaceTokenDataEvent(spaceGeoDataAddress, event: IExplorerGeoDataEvent) {
    let tokenId: string = event.returnValues['id'] || event.returnValues['_tokenId'] || event.returnValues['tokenId'] || event.returnValues['_spaceTokenId'] || event.returnValues['spaceTokenId'] || event.returnValues['privatePropertyId'];
    await this.saveSpaceTokenById(spaceGeoDataAddress, tokenId, { createdAtBlock: event.blockNumber });
  };
  
  async saveSpaceTokenById(contractAddress, tokenId, additionalData = {}) {
    const geoData = await this.chainService.getSpaceTokenData(contractAddress, tokenId);
    const owner = await this.chainService.getSpaceTokenOwner(contractAddress, tokenId);
    
    const lockerOwner = await this.chainService.getLockerOwner(owner);
    if(tokenId.toString() === '126') {
      console.log('126 owner', owner);
      console.log('126 lockerOwner', lockerOwner);
    }

    const dataLink = geoData.dataLink.replace('config_address=', '');

    return this.saveSpaceTokenByDataLink(contractAddress, dataLink, {
      tokenId: tokenId,
      owner: lockerOwner ? lockerOwner : owner,
      locker: lockerOwner ? owner : null,
      inLocker: !!lockerOwner,
      ...geoData,
      ...additionalData
    })
  }
  
  async saveSpaceTokenByDataLink(contractAddress, dataLink, geoData) {
    
    let geoDataToSave = {
      contractAddress,
      isPrivate: !this.chainService.spaceGeoData || contractAddress.toLowerCase() !== this.chainService.spaceGeoData._address.toLowerCase(),
      tokenId: geoData.tokenId,
      tokenType: geoData.spaceTokenType,
      owner: geoData.owner,
      locker: geoData.locker,
      inLocker: geoData.inLocker,
      area: geoData.area,
      areaSource: geoData.areaSource,
      dataLink: dataLink,
      geohashContourJson: JSON.stringify(geoData.geohashContour),
      geohashesCount: geoData.geohashContour.length,
      heightsContourJson: JSON.stringify(geoData.heightsContour),
      createdAtBlock: geoData.createdAtBlock,
      updatedAtBlock: geoData.createdAtBlock
    };
    
    if(!isIpldHash(dataLink)) {
      return this.addOrUpdateGeoData(geoDataToSave);
    }
    
    const spaceData = (await this.geesome.getObject(dataLink).catch(() => null)) || {};
    let {details, floorPlans, photos, ledgerIdentifier} = spaceData;

    if(!details) {
      details = spaceData.data;
    }

    if(!details) {
      return this.addOrUpdateGeoData(geoDataToSave);
    }
    
    if(details.region) {
      geoDataToSave = _.extend({
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
      }, geoDataToSave);
    }

    geoDataToSave = _.extend({
      type: details.type,
      subtype: details.subtype,
      photosCount: photos.length,
      floorPlansCount: floorPlans.length,
      bathroomsCount: details.bathrooms,
      bedroomsCount: details.bedrooms,
      yearBuilt: details.yearBuilt,
      dataJson: JSON.stringify(spaceData),
      ledgerIdentifier: ledgerIdentifier,
      featureArray: details.features ? '|' + details.features.join('|') + '|' : ''
    }, geoDataToSave);
    
    return this.addOrUpdateGeoData(geoDataToSave);
  }

  addOrUpdateGeoData(geoDataToSave) {
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

    const chainOrder = await this.chainService.getSaleOrder(event.contractAddress, orderId);
    
    const dbSpaceTokens = await pIteration.map(chainOrder.details.tokenIds, async (id, position) => {
      const geoDataAddress = chainOrder.details.propertyToken || this.chainService.spaceGeoData._address;
      const spaceToken = await this.database.getSpaceTokenGeoData(id, geoDataAddress);
      if(spaceToken) {
        spaceToken.spaceTokensOrders = {position};
      }
      return spaceToken;
    });

    let orderData: any = {};
    if(chainOrder.details.dataAddress) {
      orderData = await this.geesome.getObject(chainOrder.details.dataAddress);
    }

    let allFeatures = [];
    dbSpaceTokens.forEach(token => {
      try {
        const spaceData = JSON.parse(token.dataJson);
        if(spaceData) {
          allFeatures = allFeatures.concat((spaceData.details || {}).features || []);
        }
      } catch (e) {}
    });

    allFeatures = _.uniq(allFeatures);
    
    let allTypesSubTypes = [];
    dbSpaceTokens.forEach(token => {
      allTypesSubTypes = allTypesSubTypes.concat([token.type, token.subtype].filter(s => s));
    });

    allTypesSubTypes = _.uniq(allTypesSubTypes);
    
    const currency = chainOrder.escrowCurrency.toString(10) == '0' ? 'eth' : 'erc20';
    let currencyName = 'ETH';
    if(currency === 'erc20') {
      currencyName = await this.chainService.getContractSymbol(chainOrder.tokenContract);
    }
    
    const dbOrder = await this.database.addOrUpdateSaleOrder({
      orderId,
      currency,
      currencyName,
      contractAddress: event.contractAddress,
      isPrivate: !this.chainService.propertyMarket || event.contractAddress.toLowerCase() !== this.chainService.propertyMarket._address.toLowerCase(),
      currencyAddress: chainOrder.tokenContract,
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
    
    console.log('order saved', dbOrder.orderId, event.contractAddress);
    
    await dbOrder.setSpaceTokens(dbSpaceTokens);
  };
  
  async filterOrders(filterQuery: FilterSaleOrdersGeoQuery) {
    if(filterQuery.surroundingsGeohashBox && filterQuery.surroundingsGeohashBox.length) {
      filterQuery.tokensIds = (await this.geohashService.getContoursByParentGeohashArray(filterQuery.surroundingsGeohashBox)).map(i => i.tokenId.toString());
    }
    console.log('filterQuery.tokensIds', filterQuery.tokensIds);
    return {
      list: await this.database.filterSaleOrders(filterQuery),
      total: await this.database.filterSaleOrdersCount(filterQuery)
    };
  }
  
  async getOrderById(orderId, contractAddress) {
    return this.database.getSaleOrder(orderId, contractAddress);
  }
  
  async handleNewApplicationEvent(event: IExplorerNewApplicationEvent) {
    const {contractAddress} = event;
    const {applicationId, applicant} = event.returnValues;
    
    const spaceGeoDataAddress = this.chainService.spaceGeoData._address;

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
    
    if(parseInt(application.tokenId)) {
      const spaceToken = await this.saveSpaceTokenById(spaceGeoDataAddress, application.tokenId, {
        createdAtBlock: event.blockNumber,
        ...applicationDetails
      });
      if(spaceToken) {
        await dbApplication.addSpaceTokens([spaceToken]);
      }
    } else {
      const spaceToken = await this.saveSpaceTokenByDataLink(spaceGeoDataAddress, applicationDetails.dataLink, {
        tokenId: application.tokenId || 'application_' + contractAddress + '_' + applicationId,
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
      filterQuery.tokensIds = (await this.geohashService.getContoursByParentGeohashArray(filterQuery.surroundingsGeohashBox)).map(i => i.tokenId.toString());
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
      filterQuery.tokensIds = (await this.geohashService.getContoursByParentGeohashArray(filterQuery.surroundingsGeohashBox, filterQuery.contractAddress)).map(i => i.tokenId.toString());
    }
    return {
      list: await this.database.filterSpaceTokens(filterQuery),
      total: await this.database.filterSpaceTokensCount(filterQuery)
    };
  }

  async getSpaceTokenById(tokenId, contractAddress) {
    return this.database.getSpaceToken(tokenId, contractAddress);
  }

  async handleNewPrivatePropertyRegistryEvent(event) {

  }

  async handleSaleOfferEvent(event) {
    let { orderId, buyer } = event.returnValues;
    if(!orderId) {
      orderId = event.returnValues.saleOrderId;
    }
    
    const saleOffer = await this.chainService.getSaleOffer(event.contractAddress, orderId, buyer);

    const dbOrder = await this.database.getSaleOrder(orderId, event.contractAddress);
    
    const saleOfferData: ISaleOffer = {
      contractAddress: event.contractAddress,
      orderId: orderId,
      buyer,
      ask: saleOffer.ask,
      bid: saleOffer.bid,
      lastOfferAskAt: new Date().setTime(saleOffer.lastAskAt),
      lastOfferBidAt: new Date().setTime(saleOffer.lastBidAt),
      createdOfferAt: new Date().setTime(saleOffer.createdAt),
      dbOrderId: dbOrder ? dbOrder.id : null
    };
    
    await this.database.addOrUpdateSaleOffer(saleOfferData);
  }

  async getSaleOfferById(orderId, buyer, contractAddress) {
    return this.database.getSaleOffer(orderId, buyer, contractAddress);
  }

  async filterSaleOffers(filterQuery: SaleOffersQuery) {
    return {
      list: await this.database.filterSaleOffers(filterQuery),
      total: await this.database.filterSaleOffersCount(filterQuery)
    };
  }
}
