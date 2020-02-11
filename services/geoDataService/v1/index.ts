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
  PrivatePropertyRegistryQuery,
  SaleOffersQuery,
  SaleOrdersQuery, TokenizableMemberQuery
} from "../../../database/interface";
import {
  default as IExplorerGeoDataService,
  FilterApplicationsGeoQuery, FilterCommunityGeoQuery, FilterPrivatePropertyRegistryGeoQuery,
  FilterSaleOrdersGeoQuery,
  FilterSpaceTokensGeoQuery
} from "../interface";
import {
  IExplorerChainContourEvent, IExplorerCommunityMintEvent,
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
const log = require('../../logService');

const {bytes32ToIpfsHash} = require('@galtproject/utils');

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
      const split = geoData.humanAddress.split('|\n');
      split.some(s => {
        if (s && s.split('=')[0] === 'floor') {
          level = s.split('=')[1];
          return true;
        }
      })
    }

    if (level || geoData.spaceTokenType) {
      await this.database.addOrUpdateContour(geoData.geohashContour, tokenId, contractAddress, level, geoData.spaceTokenType);
    }

    const lockerOwner = await this.chainService.getLockerOwner(owner);
    log('getLockerOwner', lockerOwner);

    const dataLink = geoData.dataLink.replace('config_address=', '');

    return this.saveSpaceTokenByDataLink(contractAddress, dataLink, {
      tokenId: tokenId,
      owner: lockerOwner ? lockerOwner : owner,
      locker: lockerOwner ? owner : null,
      inLocker: !!lockerOwner,
      level,
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
    let {details, floorPlans, photos} = spaceData;

    if (!details) {
      details = spaceData.data;
    }

    if (!floorPlans) {
      floorPlans = [];
    }

    if (!details) {
      return this.addOrUpdateGeoData(geoDataToSave);
    }

    // if (details.region) {
    //   geoDataToSave = _.extend({
    //     fullRegion: details.region.join(', '),
    //     regionLvl1: _.isArray(details.region[0]) ? '' : (details.region[0] || ''),
    //     regionLvl2: details.region[1] || '',
    //     regionLvl3: details.region[2] || '',
    //     regionLvl4: details.region[3] || '',
    //     regionLvl5: details.region[4] || '',
    //     regionLvl6: details.region[5] || '',
    //     regionLvl7: details.region[6] || '',
    //     regionLvl8: details.region[7] || '',
    //     regionLvl9: details.region[8] || '',
    //   }, geoDataToSave);
    // }

    let imageHash;

    if (photos[0]) {
      const link = await this.geesome.getContentLink(photos[0], 'large').catch(() => '');
      imageHash = _.last(link.split('/'))
    }

    geoDataToSave = _.extend({
      type: details.type,
      subtype: details.subtype,
      imageHash,
      photosCount: photos.length,
      floorPlansCount: floorPlans.length,
      bathroomsCount: details.bathrooms,
      bedroomsCount: details.bedrooms,
      yearBuilt: details.yearBuilt,
      dataJson: JSON.stringify(spaceData),
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

    const tokenData = JSON.parse(spaceGeoData.dataJson);
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

    if (tokenData.details) {
      attributes = attributes.concat(tokenData.details.features.map(f => ({trait_type: 'feature', value: f})));

      description = tokenData.details.description;
      if (tokenData.details.legalDescription) {
        description += '\n\n' + tokenData.details.legalDescription;
      }
    }

    let name = '';

    if (tokenData.humanAddress) {
      name = tokenData.humanAddress.countryRegion || '';

      if (name) {
        name += ', ';
      }

      if (tokenData.humanAddress.cityStreet) {
        name += tokenData.humanAddress.cityStreet;
      }

      if (spaceGeoData.tokenType === 'room') {
        if (tokenData.humanAddress.floor)
          name += ', Floor ' + tokenData.humanAddress.floor;

        if (tokenData.humanAddress.litera)
          name += ', ' + tokenData.humanAddress.litera;
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

    await dbOrder.setSpaceTokens(dbSpaceTokens);
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
    return this.updatePrivatePropertyRegistry(address, chainCreatedAt);
  }

  async updatePrivatePropertyRegistry(address, chainCreatedAt?) {
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
      contract.methods.controller().call({})
    ]);

    const controllerContract = await this.chainService.getPropertyRegistryControllerContract(controller);
    const [controllerOwner, defaultBurnTimeout] = await Promise.all([
      controllerContract.methods.owner().call({}),
      controllerContract.methods.defaultBurnTimeoutDuration().call({})
    ]);

    let minter;
    //TODO: remove support for old registry
    if (contract.methods.minter) {
      minter = await contract.methods.minter().call({});
    } else {
      minter = await controllerContract.methods.minter().call({});
    }

    const [geoDataManager, feeManager, burner] = await Promise.all([
      controllerContract.methods.geoDataManager().call({}),
      controllerContract.methods.feeManager().call({}),
      controllerContract.methods.burner().call({})
    ]);

    const roles = {
      owner,
      controllerOwner,
      minter,
      geoDataManager,
      feeManager,
      burner
    };

    await this.database.addOrPrivatePropertyRegistry({address});

    const dbObject = await this.database.getPrivatePropertyRegistry(address);

    await pIteration.forEach(['owner', 'minter', 'geoDataManager', 'feeManager', 'burner'], async (roleName) => {
      if (dbObject[roleName] != roles[roleName]) {
        if (dbObject[roleName]) {
          await this.deletePprMember(address, dbObject[roleName]);
        }
        await this.database.addOrUpdatePprMember(dbObject, {
          address: roles[roleName]
        });
      }
    });

    const totalSupply = parseInt((await contract.methods.totalSupply().call({})).toString(10));
    //TODO: remove support for old registry
    const dataLink = await (contract.methods.tokenDataLink || contract.methods.contractDataLink)().call({});

    let description = dataLink;
    let dataJson = '';
    if (isIpldHash(dataLink)) {
      const data = await this.geesome.getObject(dataLink).catch(() => ({}));
      description = data.description;
      dataJson = JSON.stringify(data);
    }

    const pprData: IPrivatePropertyRegistry = {
      address, owner, totalSupply, name, symbol, dataLink, dataJson, description, defaultBurnTimeout, ...roles
    };

    if (chainCreatedAt) {
      pprData.chainCreatedAt = chainCreatedAt;
    }
    await this.database.addOrPrivatePropertyRegistry(pprData);
  }

  async getPrivatePropertyRegistry(address) {
    return this.database.getPrivatePropertyRegistry(address);
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

    // log('burnTimeoutDuration', burnTimeoutDuration, registryAddress, tokenId);

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
    // log('updateCommunity', raAddress, isPpr);
    const raContract = await this.chainService.getCommunityRaContract(raAddress, isPpr);
    const registryAddress = await this.chainService.callContractMethod(raContract, 'fundRegistry', []);

    const registryContract = await this.chainService.getCommunityFundRegistryContract(registryAddress);

    const [storageAddress, multiSigAddress] = await Promise.all([
      this.chainService.callContractMethod(registryContract, 'getStorageAddress', []),
      this.chainService.callContractMethod(registryContract, 'getMultiSigAddress', [])
    ]);

    const [contract, community] = await Promise.all([
      this.chainService.getCommunityStorageContract(storageAddress, isPpr),
      this.database.getCommunity(raAddress)
    ]);

    const [name, dataLink, activeFundRulesCount, tokensCount, reputationTotalSupply, isPrivate, spaceTokenOwnersCount] = await Promise.all([
      contract.methods.name().call({}),
      contract.methods.dataLink().call({}),
      this.chainService.callContractMethod(contract, 'getActiveFundRulesCount', [], 'number'),
      (async () => community ? await this.database.getCommunityTokensCount(community) : 0)(),
      this.chainService.callContractMethod(raContract, 'totalSupply', [], 'wei'),
      (async () => (await contract.methods.config(await contract.methods.IS_PRIVATE().call({})).call({})) != '0x0000000000000000000000000000000000000000000000000000000000000000')(),
      this.database.filterCommunityMemberCount({communityAddress: raAddress})
    ]);

    log('community', raAddress, 'tokensCount', tokensCount, 'spaceTokenOwnersCount', spaceTokenOwnersCount);

    let description = dataLink;
    let dataJson = '';
    if (isIpldHash(dataLink)) {
      const data = await this.geesome.getObject(dataLink).catch(() => ({}));
      description = data.description;
      dataJson = JSON.stringify(data);
    }

    const _community = await this.database.addOrUpdateCommunity({
      address: raAddress,
      storageAddress,
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

  async updateCommunityMember(community: ICommunity, address) {
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

    if (tokens.length > 0) {
      let photosJson = '[]';
      try {
        const tokenWithPhoto = tokens.filter(t => t.photosCount > 0)[0];
        if(tokenWithPhoto) {
          photosJson = JSON.stringify(JSON.parse(tokenWithPhoto.dataJson).photos);
        }
      } catch (e) {
        // photos not found
      }
      await this.database.addOrUpdateCommunityMember(community, {
        address,
        currentReputation,
        basicReputation,
        tokensCount: tokens.length,
        fullNameHash,
        communityAddress: community.address,
        isPpr: community.isPpr,
        photosJson
      });
    } else {
      const member = await this.database.getCommunityMember(community.id, address);
      if (member) {
        member.destroy();
      }
    }
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

    await this.updateCommunityMember(community, propertyToken.owner);

    return this.updateCommunity(communityAddress, isPpr);
  }

  async handleCommunityBurnEvent(communityAddress, event, isPpr) {
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

    if (!isMinted) {
      await community.removeSpaceTokens([propertyToken]);
    }

    await this.updateCommunityMember(community, propertyToken.owner);

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

    support = this.chainService.weiToEther(support);
    minAcceptQuorum = this.chainService.weiToEther(minAcceptQuorum);
    timeout = parseInt(timeout.toString(10));

    const proposalManager = markerData.proposalManager;
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
        return console.error('Not found proposal', proposalId, 'in', pmAddress);
      }
      marker = proposal.marker;
    }

    const [voting, proposalManagerContract] = await Promise.all([
      this.database.getCommunityVoting(community.id, marker),
      this.chainService.getCommunityProposalManagerContract(pmAddress)
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

    const createdAtBlock = parseInt(proposalVotingData.creationBlock.toString(10));

    let status = {
      '0': null,
      '1': 'active',
      '2': 'executed'
    }[proposalData.status];

    let ruleDbId = proposal ? proposal.ruleDbId : null;

    if (status === 'executed' && (!proposal || !proposal.executeTxId)) {
      const executeEvents = (await this.chainService.getEventsFromBlock(proposalManagerContract, 'Execute', createdAtBlock, {success: true, proposalId}));
      if (executeEvents.length) {
        txData.executeTxId = executeEvents[0]['transactionHash'];
        txData.closedAtBlock = parseInt(executeEvents[0]['blockNumber'].toString(10));
        const closedAt = new Date();
        closedAt.setTime((await this.chainService.getBlockTimestamp(txData.closedAtBlock)) * 1000);
        txData.closedAt = closedAt;

        const txReceipt = await this.chainService.getTransactionReceipt(
          txData.executeTxId,
          [
            {address: community.storageAddress, abi: this.chainService.getCommunityStorageAbi(community.isPpr)}
          ]
        );

        const AddFundRuleEvent = txReceipt.events.filter(e => e.name === 'AddFundRule')[0];
        if(AddFundRuleEvent) {
          const dbRule = await this.updateCommunityRule(communityAddress, AddFundRuleEvent.values.id);
          ruleDbId = dbRule.id;
        }

        const DisableFundRuleEvent = txReceipt.events.filter(e => e.name === 'DisableFundRule')[0];
        if(DisableFundRuleEvent) {
          const dbRule = await this.updateCommunityRule(communityAddress, AddFundRuleEvent.values.id);
          const addFundRuleProposal = dbRule.proposals.filter(p => proposal && p.id != proposal.id)[0];
          if(addFundRuleProposal) {
            await this.database.updateProposalByDbId(addFundRuleProposal.id, { isActual: false });
          }
          ruleDbId = dbRule.id;
        }
      }
    }

    let timeoutAt = parseInt(proposalVotingProgress.timeoutAt.toString(10));

    let [ayeShare, nayShare, createdAtBlockTimestamp] = await Promise.all([
      this.chainService.callContractMethod(proposalManagerContract, 'getAyeShare', [proposalId], 'wei'),
      this.chainService.callContractMethod(proposalManagerContract, 'getNayShare', [proposalId], 'wei'),
      this.chainService.getBlockTimestamp(createdAtBlock)
    ]);

    if (status === 'active') {
      const timeoutDate = new Date();
      timeoutDate.setTime(timeoutAt * 1000);
      if (new Date() >= timeoutDate) {
        if (ayeShare > voting.minAcceptQuorum && ayeShare > voting.support) {
          status = 'approved';
        } else {
          status = 'rejected';
        }
        txData.closedAt = timeoutDate;
      }
    }

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

    console.log('proposal', pmAddress, proposalId);

    const isActual = proposal ? proposal.isActual : true;

    await this.database.addOrUpdateCommunityProposal(voting, {
      communityAddress,
      marker,
      proposalId,
      pmAddress,
      markerName: voting.name,
      destination: voting.destination,
      creatorAddress: proposalData.creator,
      communityId: community.id,
      acceptedShare: ayeShare,
      acceptedCount: proposalVotingData.ayes.length,
      declinedShare: nayShare,
      declinedCount: proposalVotingData.nays.length,
      createdAtBlock,
      createdAt,
      ...txData,
      status,
      description,
      dataLink,
      dataJson,
      data: proposalData.data,
      requiredSupport: this.chainService.weiToEther(proposalVotingProgress.requiredSupport),
      currentSupport: this.chainService.weiToEther(proposalVotingProgress.currentSupport),
      minAcceptQuorum: this.chainService.weiToEther(proposalVotingProgress.minAcceptQuorum),
      totalAccepted: this.chainService.weiToEther(proposalVotingProgress.totalAyes),
      totalDeclined: this.chainService.weiToEther(proposalVotingProgress.totalNays),
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

    const contract = await this.chainService.getCommunityStorageContract(community.storageAddress);

    const ruleData = await this.chainService.callContractMethod(contract, 'fundRules', [ruleId]);

    const {dataLink, ipfsHash, active: isActive, manager, createdAt} = ruleData;
    let description = dataLink;
    let type = null;
    let dataJson = '';
    if (isIpldHash(dataLink)) {
      const data = await this.geesome.getObject(dataLink).catch(() => ({}));
      // log('dataItem', dataItem);
      try {
        if (data.text) {
          description = await this.geesome.getContentData(data.text).catch(() => '');
        }
        type = data.type;
        log('description', description, 'type', type);
        dataJson = JSON.stringify(data);
      } catch (e) {
        console.error(e);
      }
    }

    return this.database.addOrUpdateCommunityRule(community, {
      communityId: community.id,
      communityAddress,
      ruleId,
      description,
      dataLink,
      dataJson,
      ipfsHash,
      isActive,
      type,
      manager
    });
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

    if (isApproved) {
      let expelledResult;
      if (community.isPpr) {
        expelledResult = await this.chainService.callContractMethod(contract, 'getExpelledToken', [registryAddress, tokenId]);
      } else {
        expelledResult = await this.chainService.callContractMethod(contract, 'getExpelledToken', [tokenId]);
      }
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
