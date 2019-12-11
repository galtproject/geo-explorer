/*
 * Copyright ©️ 2019 GaltProject Society Construction and Terraforming Company
 * (Founded by [Nikolai Popeka](https://github.com/npopeka)
 *
 * Copyright ©️ 2019 Galt•Core Blockchain Company
 * (Founded by [Nikolai Popeka](https://github.com/npopeka) by
 * [Basic Agreement](ipfs/QmaCiXUmSrP16Gz8Jdzq6AJESY1EAANmmwha15uR3c1bsS)).
 */

import IExplorerDatabase, {
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
    const geoData = await this.chainService.getSpaceTokenData(contractAddress, tokenId);
    const owner = await this.chainService.getSpaceTokenOwner(contractAddress, tokenId).catch(() => null);

    // if(contractAddress === '0x1D956854805C7c9781530019D22dF714ABB6b680')
    //   console.log('saveSpaceTokenById', tokenId, owner);

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

    if(!floorPlans) {
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

    if(photos[0]) {
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
    if(geoDataToSave.owner) {
      if(geoDataToSave.isPpr) {
        const ppr = await this.database.getPrivatePropertyRegistry(geoDataToSave.contractAddress);
        if(ppr) {
          await this.database.addOrUpdatePprMember(ppr, {
            address: geoDataToSave.owner
          });
        }
      }
      return this.database.addOrUpdateGeoData(geoDataToSave).catch(() => {
        return this.database.addOrUpdateGeoData(geoDataToSave);
      });
    } else {
      if(geoDataToSave.isPpr) {
        await this.deletePprMember(geoDataToSave.contractAddress, geoDataToSave.owner);
      }
      await this.database.deleteGeoData(geoDataToSave.tokenId, geoDataToSave.contractAddress);
      return this.database.deleteContour(geoDataToSave.tokenId, geoDataToSave.contractAddress);
    }
  }

  async deletePprMember(registryAddress, memberAddress) {
    const pprMember = await this.database.getPprMember(registryAddress, memberAddress);
    if(pprMember) {
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

    attributes = attributes.concat(tokenData.details.features.map(f => ({trait_type: 'feature', value: f})));

    let description = tokenData.details.description;
    if(tokenData.details.legalDescription) {
      description += '\n\n' + tokenData.details.legalDescription;
    }
    return {
      name: tokenData.details.addressTwo + ', ' + tokenData.details.addressOne,
      description,
      attributes,
      image: await this.geesome.getContentLink(spaceGeoData.imageHash).catch(() => null),
      external_url: `https://app.galtproject.io/#/property/token/${tokenId}?contractAddress=${contractAddress}&network=${_.first(this.chainService.configFile.split('.'))}`
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

    console.log(orderId, 'tokens types', dbSpaceTokens.map(s => [s.tokenType, s.area]));

    console.log('chainOrder.statusName', chainOrder.statusName);

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

    console.log('order saved', dbOrder.orderId, event.contractAddress);

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

    const application = await this.chainService.getNewPropertyApplication(applicationId);
    const applicationDetails = await this.chainService.getNewPropertyApplicationDetails(applicationId);

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
    // console.log('spaceToken', spaceToken);

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
      if(memberAddress === '0x0000000000000000000000000000000000000000') {
        return;
      }
      const memberBalance = await this.chainService.callContractMethod(tokenizableContract, 'balanceOf', [memberAddress], 'wei').catch(() => 0);
      if(memberBalance) {
        return this.database.addOrUpdateTokenizableMember(contractAddress, {
          balance: memberBalance,
          address: memberAddress
        });
      } else {
        const dbMember = await this.database.getTokenizableMember(contractAddress, memberAddress);
        if(dbMember) {
          return dbMember.destroy().catch(() => {/* already destroyed */});
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

    const name = await contract.methods.name().call({});
    const symbol = await contract.methods.symbol().call({});
    const owner = await contract.methods.owner().call({});
    const controller = await contract.methods.controller().call({});

    const controllerContract = await this.chainService.getPropertyRegistryControllerContract(controller);
    const controllerOwner = await controllerContract.methods.owner().call({});
    const defaultBurnTimeout = await controllerContract.methods.defaultBurnTimeoutDuration().call({});

    const roles = {
      owner,
      controllerOwner,
      minter: await contract.methods.minter().call({}),
      geoDataManager: await controllerContract.methods.geoDataManager().call({}),
      feeManager: await controllerContract.methods.feeManager().call({}),
      burner: await controllerContract.methods.burner().call({})
    };

    await this.database.addOrPrivatePropertyRegistry({address});

    const dbObject = await this.database.getPrivatePropertyRegistry(address);

    await pIteration.forEach(['owner', 'minter', 'geoDataManager', 'feeManager', 'burner'], async (roleName) => {
      if(dbObject[roleName] != roles[roleName]) {
        if(dbObject[roleName]) {
          await this.deletePprMember(address, dbObject[roleName]);
        }
        await this.database.addOrUpdatePprMember(dbObject, {
          address: roles[roleName]
        });
      }
    });

    const totalSupply = parseInt((await contract.methods.totalSupply().call({})).toString(10));
    const dataLink = await contract.methods.tokenDataLink().call({});

    let description = dataLink;
    let dataJson = '';
    if(isIpldHash(dataLink)) {
      const data = await this.geesome.getObject(dataLink).catch(() => ({}));
      description = data.description;
      dataJson = JSON.stringify(data);
    }

    const pprData: IPrivatePropertyRegistry = {
      address, owner, totalSupply, name, symbol, dataLink, dataJson, description, defaultBurnTimeout, ...roles
    };

    if(chainCreatedAt) {
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

    if(event.returnValues.tokenId) {
      proposalData['tokenId'] = event.returnValues.tokenId;
      const spaceTokenGeoData = await this.getSpaceTokenById(proposalData['tokenId'], registryAddress);
      if(!spaceTokenGeoData) {
        // token not exists
        return;
      }
      proposalData['spaceGeoDataId'] = spaceTokenGeoData.id;
    }
    if(event.returnValues.creator) {
      proposalData['creator'] = event.returnValues.creator
    }

    const proposal = await this.chainService.callContractMethod(controllerContract, 'proposals', [proposalId]);

    // console.log('handlePrivatePropertyRegistryProposalEvent', event.returnValues, proposal);

    const dataLink = proposal.dataLink;
    let description = dataLink;
    let dataJson = '';
    if(isIpldHash(dataLink)) {
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

    const pendingBurnProposalsForTokenOwnerCount = await this.database.filterPrivatePropertyProposalCount({
      registryAddress,
      tokenId: resultProposal.tokenId,
      status: ['pending'],
      isBurnProposal: true,
      isApprovedByTokenOwner: false
    });

    const pendingEditProposalsForTokenOwnerCount = await this.database.filterPrivatePropertyProposalCount({
      registryAddress,
      tokenId: resultProposal.tokenId,
      status: ['pending'],
      isBurnProposal: false,
      isApprovedByTokenOwner: false
    });

    const pendingBurnProposalsForRegistryOwnerCount = await this.database.filterPrivatePropertyProposalCount({
      registryAddress,
      tokenId: resultProposal.tokenId,
      status: ['pending'],
      isBurnProposal: true,
      isApprovedByRegistryOwner: false
    });

    const pendingEditProposalsForRegistryOwnerCount = await this.database.filterPrivatePropertyProposalCount({
      registryAddress,
      tokenId: resultProposal.tokenId,
      status: ['pending'],
      isBurnProposal: false,
      isApprovedByRegistryOwner: false
    });

    // console.log('isBurnProposal', burnMethod.signature === signature);
    // console.log('pendingBurnProposalsForTokenOwnerCount', pendingBurnProposalsForTokenOwnerCount);

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
    if(!burnTimeoutDuration) {
      burnTimeoutDuration = await this.chainService.callContractMethod(controllerContract, 'defaultBurnTimeoutDuration', [], 'number');
    }

    // console.log('burnTimeoutDuration', burnTimeoutDuration, registryAddress, tokenId);

    const burnTimeoutAt = await this.chainService.callContractMethod(controllerContract, 'burnTimeoutAt', [tokenId]);

    let burnOn = null;
    if(burnTimeoutAt) {
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
    return this.updateCommunity(event.fundRA, isPpr, event.blockNumber);
  }

  async updateCommunity(raAddress, isPpr, createdAtBlock?) {
    // console.log('updateCommunity', raAddress, isPpr);
    const raContract = await this.chainService.getCommunityRaContract(raAddress, isPpr);
    const registryAddress = await this.chainService.callContractMethod(raContract, 'fundRegistry', []);

    const registryContract = await this.chainService.getCommunityFundRegistryContract(registryAddress);

    const storageAddress = await this.chainService.callContractMethod(registryContract, 'getStorageAddress', []);

    const contract = await this.chainService.getCommunityStorageContract(storageAddress, isPpr);
    const community = await this.database.getCommunity(raAddress);

    const multiSigAddress = await this.chainService.callContractMethod(registryContract, 'getMultiSigAddress', []);

    const name = await contract.methods.name().call({});
    const dataLink = await contract.methods.dataLink().call({});
    const activeFundRulesCount =  await this.chainService.callContractMethod(contract, 'getActiveFundRulesCount', [], 'number');
    const tokensCount = community ? await this.database.getCommunityTokensCount(community) : 0;
    console.log(raAddress, 'tokensCount', tokensCount);

    const spaceTokenOwnersCount = await this.database.filterCommunityMemberCount({
      communityAddress: raAddress
    });
    const reputationTotalSupply = await this.chainService.callContractMethod(raContract, 'totalSupply', [], 'wei');

    const isPrivate = (await contract.methods.config(await contract.methods.IS_PRIVATE().call({})).call({})) != '0x0000000000000000000000000000000000000000000000000000000000000000';

    let description = dataLink;
    let dataJson = '';
    if(isIpldHash(dataLink)) {
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
    if(!community) {
      console.log('community created', raAddress, JSON.stringify(_community))
    }
  }

  async updateCommunityMember(community: ICommunity, address) {
    const contract = await this.chainService.getCommunityStorageContract(community.storageAddress, community.isPpr);

    const fullNameHash = await this.chainService.callContractMethod(contract, 'membersIdentification', [address], 'bytes32');

    const raContract = await this.chainService.getCommunityRaContract(community.address, community.isPpr);

    const currentReputation = await this.chainService.callContractMethod(raContract, 'balanceOf', [address], 'wei');
    const basicReputation = await this.chainService.callContractMethod(raContract, 'ownedBalanceOf', [address], 'wei');

    const tokensCount = (await this.database.getCommunityMemberTokens(community, address)).length;

    if(tokensCount > 0) {
      await this.database.addOrUpdateCommunityMember(community, {
        address,
        currentReputation,
        basicReputation,
        tokensCount,
        fullNameHash,
        communityAddress: community.address,
        isPpr: community.isPpr
      });
    } else {
      const member = await this.database.getCommunityMember(community.id, address);
      if(member) {
        member.destroy();
      }
    }
  }

  async handleCommunityMintEvent(communityAddress, event: IExplorerCommunityMintEvent, isPpr) {
    const community = await this.database.getCommunity(communityAddress);
    const propertyToken = await this.database.getSpaceToken(event.returnValues.tokenId, event.returnValues.registry || this.chainService.spaceGeoData._address);

    await community.addSpaceTokens([propertyToken]).catch(() => {/* already in community */});

    await this.updateCommunityMember(community, propertyToken.owner);

    return this.updateCommunity(communityAddress, isPpr);
  }

  async handleCommunityBurnEvent(communityAddress, event, isPpr) {
    const community = await this.database.getCommunity(communityAddress);
    const propertyToken = await this.database.getSpaceToken(event.returnValues.tokenId, event.returnValues.registry || this.chainService.spaceGeoData._address);

    await community.removeSpaceTokens([propertyToken]);

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

    const markerData = await contract.methods.proposalMarkers(marker).call({});

    let {support, minAcceptQuorum, timeout} = await this.chainService.callContractMethod(contract, 'getProposalVotingConfig', [marker]);
    support = this.chainService.weiToEther(support);
    minAcceptQuorum = this.chainService.weiToEther(minAcceptQuorum);
    timeout = parseInt(timeout.toString(10));

    const proposalManager = markerData.proposalManager;
    const proposalManagerContract = await this.chainService.getCommunityProposalManagerContract(proposalManager);

    const activeProposalsCount = await this.chainService.callContractMethod(proposalManagerContract, 'getActiveProposalsCount', [marker], 'number');
    const approvedProposalsCount = await this.chainService.callContractMethod(proposalManagerContract, 'getApprovedProposalsCount', [marker], 'number');
    const rejectedProposalsCount = await this.chainService.callContractMethod(proposalManagerContract, 'getRejectedProposalsCount', [marker], 'number');

    let dataLink = markerData.dataLink;
    let description = markerData.dataLink;
    let dataJson = '';
    if(isIpldHash(dataLink)) {
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
      activeProposalsCount,
      approvedProposalsCount,
      rejectedProposalsCount,
      totalProposalsCount: await this.database.filterCommunityProposalCount({communityAddress, marker})
    });

    await this.database.addOrUpdateCommunity({
      address: communityAddress,
      pmAddress: proposalManager
    });
  }

  async handleCommunityRemoveVotingEvent(communityAddress, event) {
    const community = await this.database.getCommunity(communityAddress);
    if(!community) {
      return;
    }

    const communityVoting = await this.database.getCommunityVoting(community.id, event.returnValues.marker);

    if(!communityVoting) {
      return;
    }

    return communityVoting.destroy();
  }

  async handleCommunityAddProposalEvent(communityAddress, event) {
    return this.updateCommunityProposal(communityAddress, event.contractAddress, event.returnValues.marker, event.returnValues.proposalId);
  }

  async handleCommunityUpdateProposalEvent(communityAddress, event) {
    return this.updateCommunityProposal(communityAddress, event.contractAddress, event.returnValues.marker, event.returnValues.proposalId);
  }

  async updateCommunityProposal(communityAddress, pmAddress, marker, proposalId) {
    const community = await this.database.getCommunity(communityAddress);

    if(!marker) {
      const proposal = await this.database.getCommunityProposalByVotingAddress(pmAddress, proposalId);
      if(!proposal) {
        return console.error('Not found proposal', proposalId, 'in', pmAddress);
      }
      marker = proposal.marker;
    }

    const voting = await this.database.getCommunityVoting(community.id, marker);

    const proposalManagerContract = await this.chainService.getCommunityProposalManagerContract(pmAddress);

    const proposalData = await proposalManagerContract.methods.proposals(proposalId).call({});
    const proposalVotingData = await proposalManagerContract.methods.getProposalVoting(proposalId).call({});
    const proposalVotingProgress = await proposalManagerContract.methods.getProposalVotingProgress(proposalId).call({});

    const status = {
      '0': null,
      '1': 'active',
      '2': 'approved',
      '3': 'executed',
      '4': 'rejected'
    }[proposalData.status];

    let ayeShare = await this.chainService.callContractMethod(proposalManagerContract, 'getAyeShare', [proposalId], 'wei');
    let nayShare = await this.chainService.callContractMethod(proposalManagerContract, 'getNayShare', [proposalId], 'wei');

    let dataLink = proposalData.dataLink;
    let description = dataLink;
    let dataJson = '';
    if(isIpldHash(dataLink)) {
      const data = await this.geesome.getObject(dataLink).catch(() => ({}));
      description = data.description;
      dataJson = JSON.stringify(data);
    }

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
      status,
      description,
      dataLink,
      dataJson,
      data: proposalData.data,
      requiredSupport: this.chainService.weiToEther(proposalVotingProgress.requiredSupport),
      currentSupport: this.chainService.weiToEther(proposalVotingProgress.currentSupport),
      minAcceptQuorum: this.chainService.weiToEther(proposalVotingProgress.minAcceptQuorum),
      timeoutAt: parseInt(proposalVotingProgress.timeoutAt.toString(10))
    });
    // console.log('newProposal', JSON.stringify(newProposal));

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
    if(isIpldHash(dataLink)) {
      const data = await this.geesome.getObject(dataLink).catch(() => ({}));
      // console.log('dataItem', dataItem);
      try {
        description = await this.geesome.getContentData(data.dataList[0]).catch(() => '');
        type = data.type;
        console.log('description', description, 'type', type);
        dataJson = JSON.stringify(data);
      } catch (e) {
        console.error(e);
      }
    }

    await this.database.addOrUpdateCommunityRule(community, {
      communityAddress,
      ruleId,
      communityId: community.id,
      description,
      dataLink,
      dataJson,
      ipfsHash,
      isActive,
      type,
      manager
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
}
