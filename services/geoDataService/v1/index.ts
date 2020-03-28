/*
 * Copyright ©️ 2019 Galt•Project Society Construction and Terraforming Company
 * (Founded by [Nikolai Popeka](https://github.com/npopeka)
 *
 * Copyright ©️ 2019 Galt•Core Blockchain Company
 * (Founded by [Nikolai Popeka](https://github.com/npopeka) by
 * [Basic Agreement](ipfs/QmaCiXUmSrP16Gz8Jdzq6AJESY1EAANmmwha15uR3c1bsS)).
 */

import IExplorerDatabase, {
  CommunityApprovedQuery,
  CommunityMemberQuery, CommunityProposalQuery, CommunityRuleQuery, CommunityTokensQuery, CommunityVotingQuery,
  ICommunity, IPrivatePropertyRegistry,
  ISaleOffer, PprMemberQuery, PrivatePropertyProposalQuery,
  SaleOffersQuery,
  TokenizableMemberQuery
} from "../../../database/interface";
import {
  default as IExplorerGeoDataService,
  FilterApplicationsGeoQuery, FilterCommunityGeoQuery, FilterPrivatePropertyRegistryGeoQuery,
  FilterSaleOrdersGeoQuery,
  FilterSpaceTokensGeoQuery
} from "../interface";
import {
  IExplorerCommunityMintEvent,
  IExplorerGeoDataEvent, IExplorerNewApplicationEvent,
  IExplorerSaleOrderEvent
} from "../../interfaces";
import IExplorerChainService, {ChainServiceEvents} from "../../chainService/interface";
import IExplorerGeohashService from "../../geohashService/interface";

const _ = require("lodash");
const pIteration = require("p-iteration");

const {GeesomeClient} = require('geesome-libs/src/GeesomeClient');
const {isIpldHash} = require('geesome-libs/src/ipfsHelper');
const log = require('../../logService');

const {bytes32ToIpfsHash, tokenData} = require('@galtproject/utils');

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

  // =============================================================
  // Space Tokens
  // =============================================================

  async handleChangeSpaceTokenDataEvent(spaceGeoDataAddress, event: IExplorerGeoDataEvent) {
    let tokenId: string = event.returnValues['id'] || event.returnValues['_tokenId'] || event.returnValues['tokenId'] || event.returnValues['_spaceTokenId'] || event.returnValues['spaceTokenId'] || event.returnValues['privatePropertyId'];
    await this.saveSpaceTokenById(spaceGeoDataAddress, tokenId, {createdAtBlock: event.blockNumber});
  };

  async saveSpaceTokenById(contractAddress, tokenId, additionalData = {}) {
    log('getSpaceTokenData', tokenId);

    const geoData = await this.chainService.getSpaceTokenData(contractAddress, tokenId);
    const owner = await this.chainService.getSpaceTokenOwner(contractAddress, tokenId).catch(() => null);

    //TODO: remove
    // if(contractAddress === '0x6a3ABb1d426243756F301dD5beA4aa4f3C1Ec3aF') {
    //   if(geoData.geohashContour.indexOf('sezuwtvgb8bj') !== -1) {
    //     return;
    //   }
    // }
    log('saveSpaceTokenById', tokenId, owner);

    let level;
    if (geoData.humanAddress) {
      const {floor} = tokenData.getHumanAddressFromContractString(geoData.humanAddress);
      level = floor;
    }

    if (level || geoData.spaceTokenType) {
      await this.database.addOrUpdateContour(geoData.geohashContour, tokenId, contractAddress, level, geoData.spaceTokenType);
    }

    let lockerOwner = await this.chainService.getLockerOwner(owner);
    log('getLockerOwner', lockerOwner);

    let lockerType;
    if (lockerOwner) {
      lockerType = await this.chainService.getLockerType(owner);
      if (lockerType) {
        lockerType = this.chainService.hexToString(lockerType)
      }
      log('lockerType', lockerType);

      const contract = await this.chainService.getPropertyRegistryContract(contractAddress);
      const transferEvents = await this.chainService.getEventsFromBlock(
        contract,
        ChainServiceEvents.SpaceTokenTransfer,
        0,
        {tokenId}
      );
      const lastTransfer = _.last(transferEvents);
      if (lastTransfer) {
        lockerOwner = lastTransfer.returnValues.from;
        log('lockerOwner by event', lockerOwner);
      }
    }

    const dataLink = geoData.dataLink.replace('config_address=', '');

    return this.saveSpaceTokenByDataLink(contractAddress, dataLink, {
      tokenId: tokenId,
      owner: lockerOwner ? lockerOwner : owner,
      locker: lockerOwner ? owner : null,
      inLocker: !!lockerOwner,
      level,
      lockerType,
      ...geoData,
      ...additionalData
    })
  }

  async saveSpaceTokenByDataLink(contractAddress, dataLink, geoData) {

    let geoDataToSave = {
      contractAddress,
      isPpr: !this.chainService.spaceGeoData || contractAddress.toLowerCase() !== this.chainService.spaceGeoData._address.toLowerCase(),
      level: geoData.level || '0',
      levelNumber: parseFloat((geoData.level || '0').toString().match(/\d+/g)[0]),
      tokenType: geoData.spaceTokenType,
      dataLink: dataLink,
      contractContourJson: JSON.stringify(geoData.contractContour),
      geohashContourJson: JSON.stringify(geoData.geohashContour),
      geohashesCount: geoData.geohashContour.length,
      heightsContourJson: JSON.stringify(geoData.heightsContour),
      ...geoData
    };

    if (!isIpldHash(dataLink)) {
      return this.addOrUpdateGeoData(geoDataToSave);
    }

    const spaceData = (await this.geesome.getObject(dataLink).catch(() => null)) || {};
    let {details, floorPlans, photos, models, modelIpfsHash, offset} = spaceData;

    if (!details) {
      details = spaceData.data;
    }

    if (!floorPlans) {
      floorPlans = [];
    }

    if (!details) {
      return this.addOrUpdateGeoData(geoDataToSave);
    }

    let imageHash;
    if (photos && photos[0]) {
      const link = await this.geesome.getContentLink(photos[0], 'large').catch(() => '');
      imageHash = _.last(_.trim(link, '/').split('/'))
    }

    if (!modelIpfsHash && models && models[0]) {
      const link = await this.geesome.getContentLink(models[0]).catch(() => '');
      modelIpfsHash = _.last(_.trim(link, '/').split('/'))
    }

    const ppr = await this.getPrivatePropertyRegistry(contractAddress);
    let pprId;
    if (ppr) {
      pprId = ppr.id;
    }

    geoDataToSave = _.extend({
      pprId,
      type: details.type,
      subtype: details.subtype,
      imageHash,
      modelIpfsHash,
      photosCount: (photos || []).length,
      floorPlansCount: (floorPlans || []).length,
      bathroomsCount: details.bathrooms,
      bedroomsCount: details.bedrooms,
      yearBuilt: details.yearBuilt,
      dataJson: JSON.stringify(spaceData),
      offsetJson: offset ? JSON.stringify(offset) : null,
      ledgerIdentifier: details.ledgerIdentifier || geoData.ledgerIdentifier,
      featureArray: details.features ? '|' + details.features.join('|') + '|' : ''
    }, geoDataToSave);

    return this.addOrUpdateGeoData(geoDataToSave);
  }

  async addOrUpdateGeoData(geoDataToSave) {
    if (geoDataToSave.owner) {
      if (geoDataToSave.isPpr) {
        const ppr = await this.database.getPrivatePropertyRegistry(geoDataToSave.contractAddress);
        if (ppr) {
          await this.database.addOrUpdatePprMember(ppr, {
            address: geoDataToSave.owner
          });
        }
      }
      return this.database.addOrUpdateGeoData(geoDataToSave).catch((e) => {
        console.warn('WARN addOrUpdateGeoData', e);
        return this.database.addOrUpdateGeoData(geoDataToSave);
      });
    } else {
      if (geoDataToSave.isPpr) {
        await this.deletePprMember(geoDataToSave.contractAddress, geoDataToSave.owner);
      }
      await this.database.deleteGeoData(geoDataToSave.tokenId, geoDataToSave.contractAddress);
      return this.database.deleteContour(geoDataToSave.tokenId, geoDataToSave.contractAddress);
    }
  }

  async deletePprMember(registryAddress, memberAddress) {
    const pprMember = await this.database.getPprMember(registryAddress, memberAddress);
    if (pprMember) {
      await pprMember.destroy();
    }
  }

  async filterSpaceTokens(filterQuery: FilterSpaceTokensGeoQuery) {
    if (filterQuery.surroundingsGeohashBox && filterQuery.surroundingsGeohashBox.length) {
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

  async getSpaceTokenMetadataById(tokenId, contractAddress) {
    const spaceGeoData = await this.database.getSpaceToken(tokenId, contractAddress);

    const ipldData = JSON.parse(spaceGeoData.dataJson);
    let attributes = [];

    attributes.push({
      trait_type: 'type',
      value: spaceGeoData.type
    });
    attributes.push({
      trait_type: 'subtype',
      value: spaceGeoData.subtype
    });

    attributes.push({
      trait_type: 'area',
      value: spaceGeoData.area
    });

    let description = '';

    if (ipldData.details) {
      attributes = attributes.concat(ipldData.details.features.map(f => ({trait_type: 'feature', value: f})));

      description = ipldData.details.description;
      if (ipldData.details.legalDescription) {
        description += '\n\n' + ipldData.details.legalDescription;
      }
    }

    let name = '';

    const humanAddress = tokenData.getHumanAddressFromIpld(ipldData);
    if (humanAddress) {
      name = humanAddress.country || '';

      if (name && humanAddress.region) {
        name += ', ' + humanAddress.region;
      }

      if (name && humanAddress.city) {
        name += ', ' + humanAddress.city;
      }

      if (name && humanAddress.street) {
        name += ', ' + humanAddress.street;
      }

      if (name && humanAddress.buildingNumber) {
        name += ', ' + humanAddress.buildingNumber;
      }

      if (spaceGeoData.tokenType === 'room') {
        if (humanAddress.floor)
          name += ', Floor ' + humanAddress.floor;

        if (humanAddress.roomNumber)
          name += ', ' + humanAddress.roomNumber;
      }
    } else {
      name = spaceGeoData.ledgerIdentifier || 'Token #' + spaceGeoData.tokenId;
    }

    return {
      name,
      description,
      attributes,
      image: await this.geesome.getContentLink(spaceGeoData.imageHash).catch(() => null),
      external_url: `https://app.galtproject.io/#/${_.first(this.chainService.configFile.split('.'))}/property/token/${tokenId}?contractAddress=${contractAddress}`
    };
  }

  // =============================================================
  // Sale Orders
  // =============================================================

  async handleSaleOrderEvent(event: IExplorerSaleOrderEvent) {
    let orderId: string = event.returnValues.orderId;

    const chainOrder = await this.chainService.getSaleOrder(event.contractAddress, orderId);

    let dbSpaceTokens = (await pIteration.map(chainOrder.details.tokenIds, async (id, position) => {
      const geoDataAddress = chainOrder.details.propertyToken || this.chainService.spaceGeoData._address;
      const spaceToken = await this.database.getSpaceTokenGeoData(id, geoDataAddress);
      if (spaceToken) {
        spaceToken.spaceTokensOrders = {position};
      }
      return spaceToken;
    })).filter(t => t);

    dbSpaceTokens = _.uniqBy(dbSpaceTokens, (s) => s.id);

    let orderData: any = {};
    let dataLink = chainOrder.details.dataAddress || chainOrder.details.dataLink;
    if (dataLink) {
      orderData = await this.geesome.getObject(dataLink).catch(() => ({}));
    }

    let allFeatures = [];
    dbSpaceTokens.forEach(token => {
      try {
        const spaceData = JSON.parse(token.dataJson);
        if (spaceData) {
          allFeatures = allFeatures.concat((spaceData.details || {}).features || []);
        }
      } catch (e) {
      }
    });

    allFeatures = _.uniq(allFeatures);

    let allTypesSubTypes = [];
    dbSpaceTokens.forEach(token => {
      allTypesSubTypes = allTypesSubTypes.concat([token.type, token.subtype].filter(s => s));
    });

    allTypesSubTypes = _.uniq(allTypesSubTypes);

    const currency = chainOrder.escrowCurrency.toString(10) == '0' ? 'eth' : 'erc20';
    let currencyName = 'ETH';
    if (currency === 'erc20') {
      currencyName = await this.chainService.getContractSymbol(chainOrder.tokenContract);
    }

    log(orderId, 'tokens types', dbSpaceTokens.map(s => [s.tokenType, s.area]));

    log('chainOrder.statusName', chainOrder.statusName);

    const dbOrder = await this.database.addOrUpdateSaleOrder({
      orderId,
      currency,
      currencyName,
      statusName: chainOrder.statusName,
      contractAddress: event.contractAddress,
      isPpr: !this.chainService.propertyMarket || event.contractAddress.toLowerCase() !== this.chainService.propertyMarket._address.toLowerCase(),
      currencyAddress: chainOrder.tokenContract,
      ask: chainOrder.ask,
      seller: chainOrder.seller,
      description: orderData.description,
      dataJson: JSON.stringify(orderData),
      lastBuyer: chainOrder.lastBuyer,
      sumBathroomsCount: _.sumBy(dbSpaceTokens, 'bathroomsCount'),
      sumBedroomsCount: _.sumBy(dbSpaceTokens, 'bedroomsCount'),
      sumLandArea: _.sumBy(_.filter(dbSpaceTokens, {tokenType: 'land'}), 'area'),
      sumBuildingArea: _.sumBy(_.filter(dbSpaceTokens, {tokenType: 'building'}), 'area'),
      featureArray: '|' + allFeatures.join('|') + '|',
      typesSubtypesArray: '|' + allTypesSubTypes.join('|') + '|',
      createdAtBlock: event.blockNumber,
      updatedAtBlock: event.blockNumber
    });

    log('order saved', dbOrder.orderId, event.contractAddress);

    await dbOrder.setSpaceTokens(dbSpaceTokens).catch(() => {/*already set */
    });
  };

  async filterOrders(filterQuery: FilterSaleOrdersGeoQuery) {
    if (filterQuery.surroundingsGeohashBox && filterQuery.surroundingsGeohashBox.length) {
      filterQuery.tokensIds = (await this.geohashService.getContoursByParentGeohashArray(filterQuery.surroundingsGeohashBox)).map(i => i.tokenId.toString());
    }
    return {
      list: await this.database.filterSaleOrders(filterQuery),
      total: await this.database.filterSaleOrdersCount(filterQuery)
    };
  }

  async getOrderById(orderId, contractAddress) {
    return this.database.getSaleOrder(orderId, contractAddress);
  }

  // =============================================================
  // Sale Offers
  // =============================================================

  async handleSaleOfferEvent(event) {
    let {orderId, buyer} = event.returnValues;
    if (!orderId) {
      orderId = event.returnValues.saleOrderId;
    }

    const saleOffer = await this.chainService.getSaleOffer(event.contractAddress, orderId, buyer);

    const dbOrder = await this.database.getSaleOrder(orderId, event.contractAddress);

    const saleOfferData: ISaleOffer = {
      contractAddress: event.contractAddress,
      orderId: orderId,
      buyer,
      seller: dbOrder.seller,
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

  // =============================================================
  // Applications
  // =============================================================

  async handleNewApplicationEvent(event: IExplorerNewApplicationEvent) {
    const {contractAddress} = event;
    const {applicationId, applicant} = event.returnValues;

    const spaceGeoDataAddress = this.chainService.spaceGeoData._address;

    const [application, applicationDetails] = await Promise.all([
      this.chainService.getNewPropertyApplication(applicationId),
      this.chainService.getNewPropertyApplicationDetails(applicationId)
    ]);

    const oracles = [];
    const availableRoles = [];
    let totalOraclesReward = 0;

    await pIteration.map(application.assignedOracleTypes, async (roleName) => {
      const roleOracle = await this.chainService.getNewPropertyApplicationOracle(applicationId, roleName);
      if (roleOracle.status === 'pending') {
        availableRoles.push(roleName);
      }
      if (roleOracle.address) {
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

    if (!dbApplication) {
      dbApplication = await this.database.addOrUpdateApplication(applicationData);
    }

    if (parseInt(application.tokenId)) {
      const spaceToken = await this.saveSpaceTokenById(spaceGeoDataAddress, application.tokenId, {
        createdAtBlock: event.blockNumber,
        ...applicationDetails
      });
      if (spaceToken) {
        await dbApplication.addSpaceTokens([spaceToken]);
      }
    } else {
      const spaceToken = await this.saveSpaceTokenByDataLink(spaceGeoDataAddress, applicationDetails.dataLink, {
        tokenId: application.tokenId || 'application_' + contractAddress + '_' + applicationId,
        createdAtBlock: event.blockNumber,
        ...applicationDetails
      });
      if (spaceToken) {
        await dbApplication.addSpaceTokens([spaceToken]);
      }
    }
    // log('spaceToken', spaceToken);

  };

  async filterApplications(filterQuery: FilterApplicationsGeoQuery) {
    if (filterQuery.surroundingsGeohashBox && filterQuery.surroundingsGeohashBox.length) {
      filterQuery.tokensIds = (await this.geohashService.getContoursByParentGeohashArray(filterQuery.surroundingsGeohashBox)).map(i => i.tokenId.toString());
    }
    return {
      list: await this.database.filterApplications(filterQuery),
      total: await this.database.filterApplicationsCount(filterQuery)
    };
  }

  async getApplicationById(applicationId, contractAddress) {
    return this.database.getApplication(applicationId, contractAddress);
  }

  async handleTokenizableTransferEvent(contractAddress, event) {
    const tokenizableContract = await this.chainService.getTokenizableContract(contractAddress);

    const memberFrom = event.returnValues._from;
    const memberTo = event.returnValues._to;

    await pIteration.forEach([memberFrom, memberTo], async (memberAddress) => {
      if (memberAddress === '0x0000000000000000000000000000000000000000') {
        return;
      }
      const memberBalance = await this.chainService.callContractMethod(tokenizableContract, 'balanceOf', [memberAddress], 'wei').catch(() => 0);
      if (memberBalance) {
        return this.database.addOrUpdateTokenizableMember(contractAddress, {
          balance: memberBalance,
          address: memberAddress
        });
      } else {
        const dbMember = await this.database.getTokenizableMember(contractAddress, memberAddress);
        if (dbMember) {
          return dbMember.destroy().catch(() => {/* already destroyed */
          });
        }
      }
    });
  }

  async filterTokenizableMembers(filterQuery: TokenizableMemberQuery) {
    return {
      list: await this.database.filterTokenizableMember(filterQuery),
      total: await this.database.filterTokenizableMemberCount(filterQuery)
    };
  }

  // =============================================================
  // Private Property Registries
  // =============================================================

  async handleNewPrivatePropertyRegistryEvent(event) {
    const address = event.returnValues.token;
    const timestamp = await this.chainService.getBlockTimestamp(event.blockNumber);
    const chainCreatedAt = new Date();
    chainCreatedAt.setTime(timestamp * 1000);
    return this.updatePrivatePropertyRegistry(address, {chainCreatedAt});
  }

  async updatePrivatePropertyRegistry(address, additionalData = {}) {
    const contract = await this.chainService.getPropertyRegistryContract(address);

    const owner = await contract.methods.owner().call({});

    if (owner === '0x0000000000000000000000000000000000000000') {
      const ppr = await this.database.getPrivatePropertyRegistry(address);
      if (ppr) {
        return ppr.destroy();
      }
      return;
    }

    const [name, symbol, controller] = await Promise.all([
      contract.methods.name().call({}),
      contract.methods.symbol().call({}),
      contract.methods.controller ? contract.methods.controller().call({}).catch(() => null) : null
    ]);


    let roles: any = {
      owner
    };

    if (controller) {
      const controllerContract = await this.chainService.getPropertyRegistryControllerContract(controller);
      const [controllerOwner, contourVerification, defaultBurnTimeout] = await Promise.all([
        controllerContract.methods.owner().call({}),
        controllerContract.methods.contourVerificationManager ? controllerContract.methods.contourVerificationManager().call({}).catch(() => null) : '0x0000000000000000000000000000000000000000',
        controllerContract.methods.defaultBurnTimeoutDuration().call({})
      ]);

      let verificationContract;
      if (contourVerification && contourVerification !== '0x0000000000000000000000000000000000000000') {
        verificationContract = await this.chainService.getPropertyRegistryVerificationContract(contourVerification);
      }

      let minter = await controllerContract.methods.minter().call({});

      const [geoDataManager, feeManager, burner, contourVerificationOwner] = await Promise.all([
        controllerContract.methods.geoDataManager().call({}),
        controllerContract.methods.feeManager().call({}),
        controllerContract.methods.burner().call({}),
        verificationContract ? verificationContract.methods.owner().call({}) : null
      ]);

      roles = {
        ...roles,
        owner,
        controllerOwner,
        minter,
        geoDataManager,
        feeManager,
        burner,
        contourVerificationOwner
      };

      additionalData = {
        ...additionalData,
        contourVerification,
        defaultBurnTimeout
      }
    }

    await this.database.addOrPrivatePropertyRegistry({address});

    const dbObject = await this.database.getPrivatePropertyRegistry(address);

    await pIteration.forEach(['owner', 'minter', 'geoDataManager', 'feeManager', 'burner', 'contourVerificationOwner'], async (roleName) => {
      if (roles[roleName] && dbObject[roleName] != roles[roleName]) {
        if (dbObject[roleName]) {
          await this.deletePprMember(address, dbObject[roleName]);
        }
        await this.database.addOrUpdatePprMember(dbObject, {
          address: roles[roleName]
        });
      }
    });

    const totalSupply = parseInt((await contract.methods.totalSupply().call({})).toString(10));
    const dataLink = await contract.methods.contractDataLink().call({});

    let description = dataLink;
    let dataJson = '';
    if (isIpldHash(dataLink)) {
      const data = await this.geesome.getObject(dataLink).catch(() => ({}));
      description = data.description;
      dataJson = JSON.stringify(data);
    }

    const pprData: IPrivatePropertyRegistry = {
      address, controller, owner, totalSupply, name, symbol, dataLink, dataJson, description
    };

    await this.database.addOrPrivatePropertyRegistry({
      ...pprData,
      ...additionalData,
      ...roles
    });
  }

  async getPrivatePropertyRegistry(address) {
    return this.database.getPrivatePropertyRegistry(address);
  }

  getPrivatePropertyRegistryByMediator(mediatorType, mediatorAddress) {
    return this.database.getPrivatePropertyRegistryByMediator(mediatorType, mediatorAddress);
  }

  async filterPrivatePropertyRegistries(filterQuery: FilterPrivatePropertyRegistryGeoQuery) {
    if (filterQuery.surroundingsGeohashBox && filterQuery.surroundingsGeohashBox.length) {
      filterQuery.addresses = (await this.geohashService.getContoursByParentGeohashArray(filterQuery.surroundingsGeohashBox)).map(i => i.contractAddress.toLowerCase());
    }
    return {
      list: await this.database.filterPrivatePropertyRegistry(filterQuery),
      total: await this.database.filterPrivatePropertyRegistryCount(filterQuery)
    };
  }

  async handlePrivatePropertyRegistryProposalEvent(registryAddress, event) {
    // const pprContract = await this.chainService.getPropertyRegistryContract(registryAddress);
    const controllerContract = await this.chainService.getPropertyRegistryControllerContract(event.contractAddress);

    const burnMethod = this.chainService.getContractMethod('ppToken', 'burn');

    const proposalId = event.returnValues.proposalId;

    const proposalData: any = {
      registryAddress,
      proposalId,
      contractAddress: event.contractAddress,
    };

    if (event.returnValues.tokenId) {
      proposalData['tokenId'] = event.returnValues.tokenId;
      const spaceTokenGeoData = await this.getSpaceTokenById(proposalData['tokenId'], registryAddress);
      if (!spaceTokenGeoData) {
        // token not exists
        return;
      }
      proposalData['spaceGeoDataId'] = spaceTokenGeoData.id;
    }
    if (event.returnValues.creator) {
      proposalData['creator'] = event.returnValues.creator
    }

    const proposal = await this.chainService.callContractMethod(controllerContract, 'proposals', [proposalId]);

    // log('handlePrivatePropertyRegistryProposalEvent', event.returnValues, proposal);

    const dataLink = proposal.dataLink;
    let description = dataLink;
    let dataJson = '';
    if (isIpldHash(dataLink)) {
      const data = await this.geesome.getObject(dataLink).catch(() => ({}));
      description = data.description;
      dataJson = JSON.stringify(data);
    }

    proposal.status = ({
      '0': 'null',
      '1': 'pending',
      '2': 'approved',
      '3': 'executed',
      '4': 'rejected'
    })[proposal.status];

    const signature = proposal.data.slice(0, 10);

    const resultProposal = await this.database.addOrPrivatePropertyProposal({
      ...proposalData,
      dataLink,
      description,
      dataJson,
      status: proposal.status,
      isExecuted: proposal.status == 'executed',
      data: proposal.data,
      signature,
      isBurnProposal: burnMethod.signature === signature,
      isApprovedByTokenOwner: proposal.tokenOwnerApproved,
      isApprovedByRegistryOwner: proposal.geoDataManagerApproved
    });

    const [pendingBurnProposalsForTokenOwnerCount, pendingEditProposalsForTokenOwnerCount, pendingBurnProposalsForRegistryOwnerCount, pendingEditProposalsForRegistryOwnerCount] = await Promise.all([
      this.database.filterPrivatePropertyProposalCount({
        registryAddress,
        tokenId: resultProposal.tokenId,
        status: ['pending'],
        isBurnProposal: true,
        isApprovedByTokenOwner: false
      }),
      this.database.filterPrivatePropertyProposalCount({
        registryAddress,
        tokenId: resultProposal.tokenId,
        status: ['pending'],
        isBurnProposal: false,
        isApprovedByTokenOwner: false
      }),
      this.database.filterPrivatePropertyProposalCount({
        registryAddress,
        tokenId: resultProposal.tokenId,
        status: ['pending'],
        isBurnProposal: true,
        isApprovedByRegistryOwner: false
      }),
      this.database.filterPrivatePropertyProposalCount({
        registryAddress,
        tokenId: resultProposal.tokenId,
        status: ['pending'],
        isBurnProposal: false,
        isApprovedByRegistryOwner: false
      })
    ]);

    // log('isBurnProposal', burnMethod.signature === signature);
    // log('pendingBurnProposalsForTokenOwnerCount', pendingBurnProposalsForTokenOwnerCount);

    await this.saveSpaceTokenById(registryAddress, resultProposal.tokenId, {
      proposalsToEditForTokenOwnerCount: pendingEditProposalsForTokenOwnerCount,
      proposalsToBurnForTokenOwnerCount: pendingBurnProposalsForTokenOwnerCount,
      proposalsToEditForRegistryOwnerCount: pendingEditProposalsForRegistryOwnerCount,
      proposalsToBurnForRegistryOwnerCount: pendingBurnProposalsForRegistryOwnerCount
    } as any);

    return resultProposal;
  }

  async handlePrivatePropertyBurnTimeoutEvent(registryAddress, event) {
    let tokenId: string = event.returnValues['id'] || event.returnValues['_tokenId'] || event.returnValues['tokenId'] || event.returnValues['_spaceTokenId'] || event.returnValues['spaceTokenId'] || event.returnValues['privatePropertyId'];
    return this.updatePrivatePropertyTokenTimeout(registryAddress, event.contractAddress, tokenId);
  }

  async updatePrivatePropertyTokenTimeout(registryAddress, controllerAddress, tokenId) {
    const controllerContract = await this.chainService.getPropertyRegistryControllerContract(controllerAddress);

    let burnTimeoutDuration = await this.chainService.callContractMethod(controllerContract, 'burnTimeoutDuration', [tokenId], 'number');
    if (!burnTimeoutDuration) {
      burnTimeoutDuration = await this.chainService.callContractMethod(controllerContract, 'defaultBurnTimeoutDuration', [], 'number');
    }

    const burnTimeoutAt = await this.chainService.callContractMethod(controllerContract, 'burnTimeoutAt', [tokenId]);

    let burnOn = null;
    if (burnTimeoutAt) {
      burnOn = new Date();
      burnOn.setTime(burnTimeoutAt * 1000);
    }

    return this.saveSpaceTokenById(registryAddress, tokenId, {
      burnTimeout: burnTimeoutDuration,
      burnOn
    } as any);
  }

  async handlePrivatePropertyPledgeBurnTimeoutEvent(registryAddress, event) {
    return this.updatePrivatePropertyPledgeTokenTimeout(registryAddress, event.contractAddress);
  }

  async updatePrivatePropertyPledgeTokenTimeout(registryAddress, verificationAddress?) {
    if (!verificationAddress) {
      const ppr = await this.database.getPrivatePropertyRegistry(registryAddress);
      verificationAddress = ppr.contourVerification;
    }
    if (!verificationAddress || verificationAddress === '0x0000000000000000000000000000000000000000') {
      return;
    }
    const verificationContract = await this.chainService.getPropertyRegistryVerificationContract(verificationAddress);

    let activeFromTimestamp = await this.chainService.callContractMethod(verificationContract, 'activeFrom', [], 'number');
    console.log('activeFromTimestamp', activeFromTimestamp);
    if (!activeFromTimestamp) {//verificationPledge
      return this.database.updateMassSpaceTokens(registryAddress, {
        burnWithoutPledgeOn: null
      })
    }

    const activeFrom = new Date();
    activeFrom.setTime(activeFromTimestamp * 1000);

    let minimalDeposit = await this.chainService.callContractMethod(verificationContract, 'minimalDeposit', [], 'wei');
    console.log('minimalDeposit', minimalDeposit);

    await this.database.updateMassSpaceTokens(registryAddress, {burnWithoutPledgeOn: null}, {
      verificationPledgeMin: minimalDeposit
    });

    await this.database.updateMassSpaceTokens(registryAddress, {burnWithoutPledgeOn: activeFrom}, {
      verificationPledgeMax: minimalDeposit,
      verificationDisabled: false
    });
  }

  handlePrivatePropertyPledgeChangeEvent(e) {
    return this.updatePrivatePropertyPledge(e.returnValues.tokenContract, e.returnValues.tokenId);
  }

  async updatePrivatePropertyPledge(registryAddress, tokenId) {
    if (!this.chainService.ppDepositHolder) {
      return;
    }
    const ppr = await this.database.getPrivatePropertyRegistry(registryAddress);
    const verificationPledge = await this.chainService.callContractMethod(this.chainService.ppDepositHolder, 'balanceOf', [registryAddress, tokenId], 'wei');

    const contract = await this.chainService.getPropertyRegistryContract(registryAddress);

    let creationTimeoutEndOn;
    if (ppr.contourVerification && ppr.contourVerification !== '0x0000000000000000000000000000000000000000') {
      const creationTimestamp = await this.chainService.callContractMethod(contract, 'propertyCreatedAt', [tokenId], 'number');
      const verificationContract = await this.chainService.getPropertyRegistryVerificationContract(ppr.contourVerification);
      const newTokenTimeout = await this.chainService.callContractMethod(verificationContract, 'newTokenTimeout', [], 'number');
      creationTimeoutEndOn = new Date();
      creationTimeoutEndOn.setTime((creationTimestamp + newTokenTimeout) * 1000);
    }

    await this.saveSpaceTokenById(registryAddress, tokenId, {verificationPledge, creationTimeoutEndOn} as any);
    return this.updatePrivatePropertyPledgeTokenTimeout(registryAddress)
  }

  async filterPrivatePropertyTokeProposals(filterQuery: PrivatePropertyProposalQuery) {
    return {
      list: await this.database.filterPrivatePropertyProposal(filterQuery),
      total: await this.database.filterPrivatePropertyProposalCount(filterQuery)
    };
  }

  async handlePrivatePropertyLegalAgreementEvent(registryAddress, event) {
    const timestamp = await this.chainService.getBlockTimestamp(event.blockNumber);

    const setAt = new Date();
    setAt.setTime(timestamp * 1000);

    const ipfsHash = bytes32ToIpfsHash(event.returnValues.legalAgreementIpfsHash || event.returnValues._legalAgreementIpfsHash);

    // const content = await this.geesome.getContentData(ipfsHash).catch(() => '');

    return this.database.addLegalAgreement({
      setAt,
      registryAddress,
      ipfsHash,
      // content
    });
  }

  async filterPrivatePropertyLegalAgreements(filterQuery: PrivatePropertyProposalQuery) {
    return {
      list: await this.database.filterPrivatePropertyLegalAgreement(filterQuery),
      total: await this.database.filterPrivatePropertyLegalAgreementCount(filterQuery)
    };
  }

  async filterPrivatePropertyMembers(filterQuery: PprMemberQuery) {
    return {
      list: await this.database.filterPprMember(filterQuery),
      total: await this.database.filterPprMemberCount(filterQuery)
    };
  }

  async handleMediatorCreation(event, mediatorType) {
    const {mediator, tokenId} = event.returnValues;
    return this.updatePrivateRegistryMediatorAddress(tokenId, mediator, mediatorType);
  }

  async handleMediatorOtherSideSet(registryAddress, event, mediatorType) {
    const ppr = await this.getPrivatePropertyRegistry(registryAddress);
    return this.updatePrivateRegistryMediatorAddress(registryAddress, mediatorType === 'foreign' ? ppr.foreignMediator : ppr.homeMediator, mediatorType);
  }

  async updatePrivateRegistryMediatorAddress(registryAddress, mediatorAddress, mediatorType) {
    const mediatorContract = await this.chainService.getMediatorContract(mediatorAddress, mediatorType);
    const network = await this.chainService.callContractMethod(mediatorContract, 'oppositeChainId', []);
    const mediatorContractOnOtherSide = await this.chainService.callContractMethod(mediatorContract, 'mediatorContractOnOtherSide', []);

    let additionalData = {};
    if (mediatorType === 'home') {
      additionalData['isBridgetHome'] = true;
      additionalData['homeMediator'] = mediatorAddress;
      additionalData['homeMediatorNetwork'] = await this.chainService.getNetworkId();

      additionalData['foreignMediator'] = mediatorContractOnOtherSide;
      additionalData['foreignMediatorNetwork'] = network;
    } else {
      additionalData['isBridgetForeign'] = true;
      additionalData['foreignMediator'] = mediatorAddress;
      additionalData['foreignMediatorNetwork'] = await this.chainService.getNetworkId();

      additionalData['homeMediator'] = mediatorContractOnOtherSide;
      additionalData['homeMediatorNetwork'] = network;
    }
    return this.updatePrivatePropertyRegistry(registryAddress, additionalData);
  }

  // =============================================================
  // Communities
  // =============================================================

  async handleNewCommunityEvent(event, isPpr) {
    const factoryContract = await this.chainService.getCommunityFactoryContract(event.contractAddress);
    const {fundRegistry} = await this.chainService.callContractMethod(factoryContract, 'fundContracts', [event.returnValues.fundId]);
    const registryContract = await this.chainService.getCommunityFundRegistryContract(fundRegistry);

    const raAddress = await this.chainService.callContractMethod(registryContract, 'getRAAddress', []);
    await this.updateCommunity(raAddress, isPpr, event.blockNumber);
    return this.database.getCommunity(raAddress);
  }

  async updateCommunity(raAddress, isPpr, createdAtBlock?) {
    log('updateCommunity', raAddress, isPpr);
    const raContract = await this.chainService.getCommunityRaContract(raAddress, isPpr);
    const registryAddress = await this.chainService.callContractMethod(raContract, 'fundRegistry', []);

    const registryContract = await this.chainService.getCommunityFundRegistryContract(registryAddress);

    const [storageAddress, multiSigAddress, ruleRegistryAddress] = await Promise.all([
      this.chainService.callContractMethod(registryContract, 'getStorageAddress', []),
      this.chainService.callContractMethod(registryContract, 'getMultiSigAddress', []),
      this.chainService.callContractMethod(registryContract, 'getRuleRegistryAddress', []).catch(() => null)
    ]);

    const [storageContract, ruleRegistryContract, community] = await Promise.all([
      this.chainService.getCommunityStorageContract(storageAddress, isPpr),
      ruleRegistryAddress ? this.chainService.getCommunityRuleRegistryContract(ruleRegistryAddress) : null,
      this.database.getCommunity(raAddress)
    ]);

    const [name, dataLink, activeFundRulesCount, tokensCount, reputationTotalSupply, isPrivate, spaceTokenOwnersCount] = await Promise.all([
      storageContract.methods.name().call({}),
      storageContract.methods.dataLink().call({}),
      this.chainService.callContractMethod(ruleRegistryContract || storageContract, 'getActiveFundRulesCount', [], 'number'),
      (async () => community ? await this.database.getCommunityTokensCount(community) : 0)(),
      this.chainService.callContractMethod(raContract, 'totalSupply', [], 'wei'),
      (async () => (await storageContract.methods.config(await storageContract.methods.IS_PRIVATE().call({})).call({})) != '0x0000000000000000000000000000000000000000000000000000000000000000')(),
      this.database.filterCommunityMemberCount({communityAddress: raAddress})
    ]);

    log('community', raAddress, 'tokensCount', tokensCount, 'spaceTokenOwnersCount', spaceTokenOwnersCount, 'ruleRegistryAddress', ruleRegistryAddress);

    let description = dataLink;
    let dataJson = '';
    if (isIpldHash(dataLink)) {
      const data = await this.geesome.getObject(dataLink).catch(() => ({}));
      description = data.description;
      dataJson = JSON.stringify(data);
    }
    log('community', dataJson, 'dataLink', dataLink);

    const _community = await this.database.addOrUpdateCommunity({
      address: raAddress,
      storageAddress,
      ruleRegistryAddress,
      multiSigAddress,
      isPpr,
      isPrivate,
      tokensCount,
      activeFundRulesCount,
      spaceTokenOwnersCount,
      reputationTotalSupply,
      dataLink,
      dataJson,
      description,
      name,
      createdAtBlock
    });
    if (!community) {
      log('community created', raAddress, JSON.stringify(_community))
    }
  }

  async updateCommunityMember(community: ICommunity, address, additionalData = {}) {
    const [contract, raContract] = await Promise.all([
      this.chainService.getCommunityStorageContract(community.storageAddress, community.isPpr),
      this.chainService.getCommunityRaContract(community.address, community.isPpr)
    ]);

    const [currentReputation, basicReputation, fullNameHash, tokens] = await Promise.all([
      this.chainService.callContractMethod(raContract, 'balanceOf', [address], 'wei'),
      this.chainService.callContractMethod(raContract, 'ownedBalanceOf', [address], 'wei'),
      this.chainService.callContractMethod(contract, 'membersIdentification', [address], 'bytes32'),
      this.database.getCommunityMemberTokens(community, address)
    ]);

    if (tokens.length === 0) {
      const member = await this.database.getCommunityMember(community.id, address);
      if (member) {
        await member.destroy();
      }
      return this.updateCommunity(community.address, community.isPpr);
    }

    let photosJson = '[]';
    try {
      const tokenWithPhoto = tokens.filter(t => t.photosCount > 0)[0];
      if (tokenWithPhoto) {
        photosJson = JSON.stringify(JSON.parse(tokenWithPhoto.dataJson).photos);
      }
    } catch (e) {
      // photos not found
    }
    let tokensJson = tokens.map(t => ({
      tokenId: t.tokenId,
      contractAddress: t.contractAddress,
      tokenType: t.tokenType,
      humanAddress: t.humanAddress,
      type: t.type,
      subtype: t.subtype,
      area: t.area
    }));
    await this.database.addOrUpdateCommunityMember(community, {
      address,
      currentReputation,
      basicReputation,
      tokensCount: tokens.length,
      fullNameHash,
      communityAddress: community.address,
      isPpr: community.isPpr,
      photosJson,
      tokensJson: JSON.stringify(tokensJson),
      ...additionalData
    });
  }

  async handleCommunityMintEvent(communityAddress, event: IExplorerCommunityMintEvent, isPpr) {
    const [community, propertyToken] = await Promise.all([
      this.database.getCommunity(communityAddress),
      this.database.getSpaceToken(event.returnValues.tokenId, event.returnValues.registry || this.chainService.spaceGeoData._address)
    ]);

    const raContract = await this.chainService.getCommunityRaContract(community.address, community.isPpr);
    let isMinted;
    if (community.isPpr) {
      isMinted = await this.chainService.callContractMethod(raContract, 'reputationMinted', [event.returnValues.registry, event.returnValues.tokenId]);
    } else {
      isMinted = await this.chainService.callContractMethod(raContract, 'reputationMinted', [event.returnValues.tokenId]);
    }

    if (isMinted) {
      await community.addSpaceTokens([propertyToken]).catch(() => {/* already in community */
      });
    }

    if (propertyToken) {
      await this.updateCommunityMember(community, propertyToken.owner);
    }

    return this.updateCommunity(communityAddress, isPpr);
  }

  async handleCommunityBurnEvent(communityAddress, event, isPpr) {
    return this.checkMintedCommunityPropertyToken(communityAddress, event.returnValues.registry || this.chainService.spaceGeoData._address, event.returnValues.tokenId, isPpr);
  }

  async checkMintedCommunityPropertyToken(communityAddress, registryAddress, tokenId, isPpr) {
    const [community, propertyToken] = await Promise.all([
      this.database.getCommunity(communityAddress),
      this.database.getSpaceToken(tokenId, registryAddress)
    ]);

    const raContract = await this.chainService.getCommunityRaContract(community.address, community.isPpr);

    let reputationMinted;
    if (community.isPpr) {
      if (raContract._jsonInterface.filter(i => i.name === 'reputationMinted')[0].outputs[0].type === 'uint256') {
        reputationMinted = parseFloat(await this.chainService.callContractMethod(raContract, 'reputationMinted', [registryAddress, tokenId], 'wei'));
      } else {
        reputationMinted = await this.chainService.callContractMethod(raContract, 'reputationMinted', [registryAddress, tokenId]);
      }
    } else {
      reputationMinted = await this.chainService.callContractMethod(raContract, 'reputationMinted', [tokenId]);
    }
    console.log('reputationMinted', reputationMinted)

    if (!reputationMinted) {
      await community.removeSpaceTokens([propertyToken]);
    }

    if (propertyToken) {
      await this.updateCommunityMember(community, propertyToken.owner);
    }

    return this.updateCommunity(communityAddress, isPpr);
  }

  async handleCommunityTransferReputationEvent(communityAddress, event, isPpr) {
    const community = await this.database.getCommunity(communityAddress);

    await this.updateCommunityMember(community, event.returnValues.from);
    await this.updateCommunityMember(community, event.returnValues.to);

    return this.updateCommunity(communityAddress, isPpr);
  }

  async handleCommunityRevokeReputationEvent(communityAddress, event, isPpr) {
    const community = await this.database.getCommunity(communityAddress);

    await this.updateCommunityMember(community, event.returnValues.from);
    await this.updateCommunityMember(community, event.returnValues.owner);

    return this.updateCommunity(communityAddress, isPpr);
  }

  async handleCommunityAddVotingEvent(communityAddress, event) {
    return this.updateCommunityVoting(communityAddress, event.returnValues.marker);
  }

  async updateCommunityVoting(communityAddress, marker) {
    const community = await this.database.getCommunity(communityAddress);

    const contract = await this.chainService.getCommunityStorageContract(community.storageAddress, community.isPpr);

    let [markerData, {support, minAcceptQuorum, timeout}, communityProposalsCount] = await Promise.all([
      contract.methods.proposalMarkers(marker).call({}),
      this.chainService.callContractMethod(contract, 'getProposalVotingConfig', [marker]),
      this.database.filterCommunityProposalCount({communityAddress, marker})
    ]);
    console.log('updateCommunityVoting', marker, 'markerData.destination', markerData.destination);

    support = this.chainService.weiToEther(support);
    minAcceptQuorum = this.chainService.weiToEther(minAcceptQuorum);
    timeout = parseInt(timeout.toString(10));

    const proposalManager = markerData.proposalManager;
    if (proposalManager === '0x0000000000000000000000000000000000000000') {
      return;
    }
    // const proposalManagerContract = await this.chainService.getCommunityProposalManagerContract(proposalManager);

    //TODO: get from database
    // const activeProposalsCount = await this.chainService.callContractMethod(proposalManagerContract, 'getActiveProposalsCount', [marker], 'number');
    // const approvedProposalsCount = await this.chainService.callContractMethod(proposalManagerContract, 'getApprovedProposalsCount', [marker], 'number');
    // const rejectedProposalsCount = await this.chainService.callContractMethod(proposalManagerContract, 'getRejectedProposalsCount', [marker], 'number');

    let dataLink = markerData.dataLink;
    let description = markerData.dataLink;
    let dataJson = '';
    if (isIpldHash(dataLink)) {
      const data = await this.geesome.getObject(dataLink).catch(() => ({}));
      description = data.description;
      dataJson = JSON.stringify(data);
    }
    await this.database.addOrUpdateCommunityVoting(community, {
      communityAddress,
      marker,
      proposalManager,
      name: this.chainService.hexToString(markerData.name),
      destination: markerData.destination,
      description,
      dataLink,
      dataJson,
      support,
      minAcceptQuorum,
      timeout,
      // activeProposalsCount,
      // approvedProposalsCount,
      // rejectedProposalsCount,
      totalProposalsCount: communityProposalsCount
    });

    await this.database.addOrUpdateCommunity({
      address: communityAddress,
      pmAddress: proposalManager
    });
  }

  async handleCommunityRemoveVotingEvent(communityAddress, event) {
    const community = await this.database.getCommunity(communityAddress);
    if (!community) {
      return;
    }

    const communityVoting = await this.database.getCommunityVoting(community.id, event.returnValues.marker);

    if (!communityVoting) {
      return;
    }

    return communityVoting.destroy();
  }

  async handleCommunityAddProposalEvent(communityAddress, event) {
    return this.updateCommunityProposal(communityAddress, event.contractAddress, event.returnValues.marker, event.returnValues.proposalId, event.transactionHash);
  }

  async handleCommunityUpdateProposalEvent(communityAddress, event) {
    return this.updateCommunityProposal(communityAddress, event.contractAddress, event.returnValues.marker, event.returnValues.proposalId);
  }

  async updateCommunityProposal(communityAddress, pmAddress, marker, proposalId, proposeTxId?) {
    const [community, proposal] = await Promise.all([
      this.database.getCommunity(communityAddress),
      this.database.getCommunityProposalByVotingAddress(pmAddress, proposalId)
    ]);

    if (!marker) {
      if (!proposal) {
        // May appeared if AyeProposal event emited before the NewProposal
        return console.error('Not found proposal', proposalId, 'in', pmAddress);
      }
      marker = proposal.marker;
    }

    let [voting, proposalManagerContract, storageContract, ruleRegistryContract] = await Promise.all([
      this.database.getCommunityVoting(community.id, marker),
      this.chainService.getCommunityProposalManagerContract(pmAddress),
      this.chainService.getCommunityStorageContract(community.storageAddress, community.isPpr),
      community.ruleRegistryAddress ? this.chainService.getCommunityRuleRegistryContract(community.ruleRegistryAddress) : null
    ]);

    let txData: any = {};

    if (proposeTxId) {
      txData.proposeTxId = proposeTxId;
    }

    const [proposalData, proposalVotingData, proposalVotingProgress] = await Promise.all([
      proposalManagerContract.methods.proposals(proposalId).call({}),
      proposalManagerContract.methods.getProposalVoting(proposalId).call({}),
      proposalManagerContract.methods.getProposalVotingProgress(proposalId).call({})
    ]);

    let minAcceptQuorum = this.chainService.weiToEther(proposalVotingProgress.minAcceptQuorum);
    let requiredSupport = this.chainService.weiToEther(proposalVotingProgress.requiredSupport);

    const createdAtBlock = parseInt(proposalVotingData.creationBlock.toString(10));

    let status = {
      '0': null,
      '1': 'active',
      '2': 'executed'
    }[proposalData.status];

    let ruleDbId = proposal ? proposal.ruleDbId : null;
    let isActual = proposal ? proposal.isActual : true;

    console.log('status', status, (!proposal || !proposal.executeTxId));

    if (status === 'executed' && (!proposal || !proposal.executeTxId)) {
      const executeEvents = await this.chainService.getEventsFromBlock(proposalManagerContract, 'Execute', createdAtBlock, {
        success: true,
        proposalId
      });
      console.log('executeEvents', executeEvents);
      if (executeEvents.length) {
        txData.executeTxId = executeEvents[0]['transactionHash'];
        txData.closedAtBlock = parseInt(executeEvents[0]['blockNumber'].toString(10));
        const closedAt = new Date();
        closedAt.setTime((await this.chainService.getBlockTimestamp(txData.closedAtBlock)) * 1000);
        txData.closedAt = closedAt;

        const txReceipt = await this.chainService.getTransactionReceipt(
          txData.executeTxId,
          [
            {address: community.storageAddress, abi: this.chainService.getCommunityStorageAbi(community.isPpr)},
            {address: community.ruleRegistryAddress, abi: this.chainService.getCommunityRuleRegistryAbi()}
          ]
        );

        const AddFundRuleEvent = txReceipt.events.filter(e => e.name === 'AddFundRule')[0];
        console.log('AddFundRuleEvent', AddFundRuleEvent);
        if (AddFundRuleEvent) {
          const dbRule = await this.updateCommunityRule(communityAddress, AddFundRuleEvent.values.id);
          ruleDbId = dbRule.id;
          const disableEvents = await this.chainService.getEventsFromBlock(ruleRegistryContract || storageContract, 'DisableFundRule', createdAtBlock, {id: AddFundRuleEvent.values.id});
          if (disableEvents.length) {
            isActual = false;
          }

          const abstractProposal = await this.database.getCommunityRule(community.id, pmAddress + '-' + proposalId);
          if (abstractProposal) {
            await abstractProposal.destroy();
          }
        }
      }
    }

    let proposalParsedData = this.chainService.parseData(proposalData.data, this.chainService.getCommunityStorageAbi(community.isPpr));
    if(!proposalParsedData.methodName) {
      proposalParsedData = this.chainService.parseData(proposalData.data, this.chainService.getCommunityRuleRegistryAbi());
    }
    console.log('proposalParsedData.methodName', proposalParsedData.methodName);

    if (_.startsWith(proposalParsedData.methodName, 'disableRuleType')) {
      const dbRule = await this.updateCommunityRule(communityAddress, proposalParsedData.inputs.id);
      if (status === 'executed') {
        const addFundRuleProposal = (dbRule.proposals || []).filter(p => _.startsWith(p.markerName, 'storage.addRuleType'))[0];
        if (addFundRuleProposal) {
          await this.database.updateProposalByDbId(addFundRuleProposal.id, {isActual: false});
        }
      }
      ruleDbId = dbRule.id;
    }

    let timeoutAt = parseInt(proposalVotingProgress.timeoutAt.toString(10));

    let [ayeShare, abstainShare, nayShare, createdAtBlockTimestamp] = await Promise.all([
      this.chainService.callContractMethod(proposalManagerContract, 'getAyeShare', [proposalId], 'wei'),
      this.chainService.callContractMethod(proposalManagerContract, 'getAbstainShare', [proposalId], 'wei'),
      this.chainService.callContractMethod(proposalManagerContract, 'getNayShare', [proposalId], 'wei'),
      this.chainService.getBlockTimestamp(createdAtBlock)
    ]);

    const timeoutDate = new Date();
    timeoutDate.setTime(timeoutAt * 1000);
    txData.closedAt = timeoutDate;

    if (status === 'active') {
      if (!ruleDbId && proposeTxId && _.startsWith(proposalParsedData.methodName, 'addRuleType')) {
        const dbRule = await this.abstractUpdateCommunityRule(community, {
          ruleId: pmAddress + '-' + proposalId,
          isActive: false,
          isAbstract: true,
          manager: pmAddress,
          dataLink: proposalParsedData.inputs.dataLink,
          ipfsHash: this.chainService.hexToString(proposalParsedData.inputs.ipfsHash)
        });

        ruleDbId = dbRule.id;
      }
    }

    // if (isActual && status === 'rejected') {
    //   isActual = false;
    // }

    let dataLink = proposalData.dataLink;
    let description = dataLink;
    let dataJson = '';
    if (isIpldHash(dataLink)) {
      const data = await this.geesome.getObject(dataLink).catch(() => ({}));
      description = data.description;
      dataJson = JSON.stringify(data);
    }

    const createdAt = new Date();
    createdAt.setTime(createdAtBlockTimestamp * 1000);

    const votingName = voting ? voting.name : 'unknown';
    if (!votingName) {
      console.log('voting', JSON.stringify(voting));
    }
    const currentQuorum = this.chainService.weiToEther(proposalVotingProgress.currentQuorum);
    const currentSupport = this.chainService.weiToEther(proposalVotingProgress.currentSupport);

    let acceptedEnoughToExecute = currentQuorum >= minAcceptQuorum && currentSupport >= requiredSupport;

    console.log('proposal', proposalId, votingName, pmAddress, isActual);
    console.log('acceptedEnoughToExecute', acceptedEnoughToExecute, 'currentQuorum', currentQuorum, 'minAcceptQuorum', minAcceptQuorum, 'currentSupport', currentSupport, 'requiredSupport', requiredSupport);

    // console.log('proposalVotingProgress', proposalVotingProgress);

    await this.database.addOrUpdateCommunityProposal(voting, {
      communityAddress,
      marker,
      proposalId,
      pmAddress,
      markerName: votingName,
      destination: proposalData.destination,
      creatorAddress: proposalData.creator,
      communityId: community.id,
      acceptedShare: ayeShare,
      acceptedCount: proposalVotingData.ayes.length,
      abstainedShare: abstainShare,
      abstainedCount: proposalVotingData.abstains ? proposalVotingData.abstains.length : null,
      declinedCount: proposalVotingData.nays.length,
      declinedShare: nayShare,
      createdAtBlock,
      createdAt,
      ...txData,
      status,
      description,
      dataLink,
      dataJson,
      data: proposalData.data,
      requiredSupport,
      minAcceptQuorum,
      acceptedEnoughToExecute,
      currentSupport,
      currentQuorum,
      totalAccepted: this.chainService.weiToEther(proposalVotingData.totalAyes),
      totalDeclined: this.chainService.weiToEther(proposalVotingData.totalNays),
      totalAbstained: this.chainService.weiToEther(proposalVotingData.totalAbstains || '0'),
      isActual,
      timeoutAt,
      ruleDbId
    });
    // log('newProposal', JSON.stringify(newProposal));

    await this.updateCommunityVoting(communityAddress, marker);
  }

  handleCommunityRuleEvent(communityAddress, event) {
    return this.updateCommunityRule(communityAddress, event.returnValues.id);
  }

  async updateCommunityRule(communityAddress, ruleId) {
    const community = await this.database.getCommunity(communityAddress);

    let contract;
    console.log('community.ruleRegistryAddress', community.ruleRegistryAddress);
    if(community.ruleRegistryAddress) {
      contract = await this.chainService.getCommunityRuleRegistryContract(community.ruleRegistryAddress);
    } else {
      contract = await this.chainService.getCommunityStorageContract(community.storageAddress);
    }

    const ruleData = await this.chainService.callContractMethod(contract, 'fundRules', [ruleId]);

    ruleData.createdAt = undefined;
    ruleData.id = undefined;
    ruleData.ipfsHash = this.chainService.hexToString(ruleData.ipfsHash);
    ruleData.typeId = ruleData.typeId ? ruleData.typeId.toString(10) : null;

    return this.abstractUpdateCommunityRule(community, {
      ruleId,
      isActive: ruleData.active,
      ...ruleData
    })
  }

  async abstractUpdateCommunityRule(community: ICommunity, ruleData) {
    const {dataLink, createdAt} = ruleData;
    let description = dataLink;
    let descriptionIpfsHash;
    let type = null;
    let dataJson = '';
    if (isIpldHash(dataLink)) {
      const data = await this.geesome.getObject(dataLink).catch(() => ({}));
      // log('dataItem', dataItem);
      try {
        log('rule data', data);
        if (data.description) {
          const ipldData = await this.geesome.getObject(data.description);
          descriptionIpfsHash = ipldData.storageId;
          description = await this.geesome.getContentData(descriptionIpfsHash).catch(() => '');
        } else if (data.text) {
          if (isIpldHash(data.text)) {
            description = await this.geesome.getContentData(data.text).catch(() => '');
          } else {
            description = data.text;
          }
        }
        type = data.type;
        log('description', description, 'type', type);
        dataJson = JSON.stringify(data);
      } catch (e) {
        console.error(e);
      }
    }

    const result = await this.database.addOrUpdateCommunityRule(community, {
      ...ruleData,
      communityId: community.id,
      communityAddress: community.address,
      descriptionIpfsHash,
      description,
      dataLink,
      dataJson,
      type
    });
    await this.updateCommunity(community.address, community.isPpr);
    return result;
  }

  handleCommunityTokenApprovedEvent(communityAddress, event) {
    return this.updateCommunityTokenApproved(communityAddress, event.returnValues.tokenId, event.returnValues.registry);
  }

  async updateCommunityTokenApproved(communityAddress, tokenId, registryAddress?) {
    const community = await this.database.getCommunity(communityAddress);

    const contract = await this.chainService.getCommunityStorageContract(community.storageAddress, community.isPpr);
    let isApproved;
    if (community.isPpr) {
      isApproved = await this.chainService.callContractMethod(contract, 'isMintApproved', [registryAddress, tokenId]);
    } else {
      isApproved = await this.chainService.callContractMethod(contract, 'isMintApproved', [tokenId]);
    }
    const propertyToken = await this.database.getSpaceToken(tokenId, registryAddress || this.chainService.spaceGeoData._address);

    let expelledResult;
    if (community.isPpr) {
      expelledResult = await this.chainService.callContractMethod(contract, 'getExpelledToken', [registryAddress, tokenId]);
    } else {
      expelledResult = await this.chainService.callContractMethod(contract, 'getExpelledToken', [tokenId]);
    }
    expelledResult.amount = this.chainService.weiToEther(expelledResult.amount);

    if (!propertyToken) {
      return;
    }
    if (isApproved) {
      if (expelledResult.isExpelled) {
        await community.removeApprovedSpaceTokens([propertyToken]).catch(() => {/* already deleted */
        });
      } else {
        await community.addApprovedSpaceTokens([propertyToken]).catch(() => {/* already in community */
        });
      }
    } else {
      await community.removeApprovedSpaceTokens([propertyToken]).catch(() => {/* already deleted */
      });
    }

    const member = await this.database.getCommunityMember(communityAddress, propertyToken.owner);
    let expelledObj = {};
    const expelledKey = propertyToken.contractAddress + '_' + propertyToken.tokenId;
    try {
      expelledObj = JSON.parse(member.expelledJson);
    } catch (e) {
    }
    if (expelledResult.isExpelled) {
      expelledObj[expelledKey] = parseFloat(expelledResult.amount);
    }
    if (!expelledResult.isExpelled || !parseFloat(expelledObj[expelledKey])) {
      delete expelledObj[expelledKey];
    }
    console.log('expelledJson', JSON.stringify(expelledObj));
    await this.checkMintedCommunityPropertyToken(communityAddress, propertyToken.contractAddress, propertyToken.tokenId, community.isPpr);
    return this.updateCommunityMember(community, propertyToken.owner, {
      expelledJson: JSON.stringify(expelledObj)
    });
  }

  async getCommunity(address) {
    return this.database.getCommunity(address);
  }

  async filterCommunities(filterQuery: FilterCommunityGeoQuery) {
    if (filterQuery.surroundingsGeohashBox && filterQuery.surroundingsGeohashBox.length) {
      filterQuery.addresses = (await this.geohashService.getContoursByParentGeohashArray(filterQuery.surroundingsGeohashBox)).map(i => i.contractAddress.toLowerCase());
    }
    return {
      list: await this.database.filterCommunity(filterQuery),
      total: await this.database.filterCommunityCount(filterQuery)
    };
  }

  async filterCommunityTokens(filterQuery: CommunityTokensQuery) {
    return {
      list: await this.database.filterCommunityTokens(filterQuery),
      total: await this.database.filterCommunityTokensCount(filterQuery)
    };
  }

  async filterCommunityMembers(filterQuery: CommunityMemberQuery) {
    return {
      list: await this.database.filterCommunityMember(filterQuery),
      total: await this.database.filterCommunityMemberCount(filterQuery)
    };
  }

  async filterCommunityVotings(filterQuery: CommunityVotingQuery) {
    return {
      list: await this.database.filterCommunityVoting(filterQuery),
      total: await this.database.filterCommunityVotingCount(filterQuery)
    };
  }

  async filterCommunityProposals(filterQuery: CommunityProposalQuery) {
    return {
      list: await this.database.filterCommunityProposal(filterQuery),
      total: await this.database.filterCommunityProposalCount(filterQuery)
    };
  }

  async filterCommunityRules(filterQuery: CommunityRuleQuery) {
    return {
      list: await this.database.filterCommunityRule(filterQuery),
      total: await this.database.filterCommunityRuleCount(filterQuery)
    };
  }

  async filterCommunitiesWithApprovedTokens(filterQuery: CommunityApprovedQuery) {
    return {
      list: await this.database.filterCommunitiesWithApprovedTokens(filterQuery),
      total: await this.database.filterCommunitiesWithApprovedTokensCount(filterQuery)
    };
  }
}
