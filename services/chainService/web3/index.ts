/*
 * Copyright ©️ 2019 GaltProject Society Construction and Terraforming Company
 * (Founded by [Nikolai Popeka](https://github.com/npopeka)
 *
 * Copyright ©️ 2019 Galt•Core Blockchain Company
 * (Founded by [Nikolai Popeka](https://github.com/npopeka) by
 * [Basic Agreement](ipfs/QmaCiXUmSrP16Gz8Jdzq6AJESY1EAANmmwha15uR3c1bsS)).
 */

import IExplorerChainService, {ChainServiceEvents} from "../interface";
import {IExplorerChainContourEvent} from "../../interfaces";

const galtUtils = require('@galtproject/utils');
const _ = require('lodash');
const axios = require('axios');

const Web3 = require("web3");
const Web3Utils = require("web3-utils");

const config = require('./config');
if (!config.wsServer) {
  console.error('wsServer required in config.js');
  process.exit(1);
}

module.exports = async (extendConfig) => {
  const wsServer = extendConfig.wsServer || config.wsServer;
  console.log('wsServer', wsServer);
  // const web3 = new Web3(new Web3.providers.WebsocketProvider(wsServer));
  //
  // const netId = await web3.eth.net.getId();

  let configFile = extendConfig.configFile || config.configFile;
  let contractsConfigUrl = _.template(config.contractsConfigUrl)({ configFile });

  console.log('📄 contractsConfigUrl', contractsConfigUrl);

  const {data: contractsConfig} = await axios.get(contractsConfigUrl);

  const serviceInstance = new ExplorerChainWeb3Service(contractsConfig, wsServer);

  setInterval(async () => {
    const {data: newContractsConfig} = await axios.get(contractsConfigUrl);
    if (newContractsConfig.blockNumber != serviceInstance.contractsConfig.blockNumber) {
      console.log('😱 New contracts, reset database', contractsConfigUrl);
      serviceInstance.setContractsConfig(newContractsConfig, true);
    }
  }, 1000 * 60);

  return serviceInstance;
};

class ExplorerChainWeb3Service implements IExplorerChainService {
  websocketProvider: any;
  web3: any;
  wsServer: string;

  spaceGeoData: any;
  propertyMarket: any;
  spaceToken: any;
  newPropertyManager: any;

  privatePropertyGlobalRegistry: any;
  privatePropertyMarket: any;

  decentralizedCommunityRegistry: any;
  pprCommunityRegistry: any;
  communityFactory: any;

  contractsConfig: any;

  callbackOnReconnect: any;

  pprCache: any = {};
  communityCache: any = {};

  redeployed = false;

  constructor(_contractsConfig, _wsServer) {
    this.wsServer = _wsServer;
    this.websocketProvider = new Web3.providers.WebsocketProvider(this.wsServer);
    this.web3 = new Web3(this.websocketProvider);

    this.contractsConfig = _contractsConfig;

    this.createContractInstance();

    this.subscribeForReconnect();
  }

  // =============================================================
  // Contract Events
  // =============================================================

  getEventsFromBlock(contract, eventName: string, blockNumber?: number): Promise<IExplorerChainContourEvent[]> {
    if(!contract) {
      console.log(`✖️ Event ${eventName} getting events ignored, contract not found`);
      return new Promise((resolve) => resolve([]));
    }
    if(_.isUndefined(blockNumber) || _.isNull(blockNumber)) {
      blockNumber = this.contractsConfig.blockNumber;
    }
    return contract.getPastEvents(eventName, {fromBlock: blockNumber}).then(events => {
      console.log(`✅️ Event ${eventName} got ${events.length} items, by contract ${contract._address}`);
      return events.map(e => {
        // console.log('event', e);
        e.contractAddress = e.address;
        return e;
      })
    });
  }

  subscribeForNewEvents(contract, eventName: string, blockNumber: number, callback) {
    if(!contract) {
      console.log(`✖️ Event ${eventName} subscribing ignored, contract not found`);
      return;
    }
    console.log(`✅️ Event ${eventName} subscribed, by contract ${contract._address}`);

    contract.events[eventName]({fromBlock: blockNumber}, (error, e) => {
      // console.log('event', e);
      if(e) {
        e.contractAddress = e.address;
      }
      callback(error, e);
    });
  }

  onReconnect(callback) {
    this.callbackOnReconnect = callback;
  }

  private subscribeForReconnect() {
    this.websocketProvider.on('end', () => {
      setTimeout(() => {
        console.log(new Date().toISOString().slice(0, 19).replace('T', ' '), '🔁 Websocket reconnect');

        this.websocketProvider = new Web3.providers.WebsocketProvider(this.wsServer);
        this.web3 = new Web3(this.websocketProvider);
        this.createContractInstance();

        if (this.callbackOnReconnect) {
          this.callbackOnReconnect(this.redeployed);
          this.redeployed = false;
        }

        this.subscribeForReconnect();
      }, 1000);
    });
  }

  setContractsConfig(contractsConfig, redeployed = false) {
    this.contractsConfig = contractsConfig;
    this.createContractInstance();

    this.pprCache = {};
    if(redeployed) {
      this.redeployed = true;
      this.websocketProvider.connection.close();
    }
    // this.websocketProvider.connection._client.socket[0].end();
    // if (this.callbackOnReconnect) {
    //   this.callbackOnReconnect(redeployed);
    // }
  }

  private createContractInstance() {
    this.pprCache = {};
    this.communityCache = {};

    const aliases = {
      // 'fundsRegistry': 'decentralizedCommunityRegistry',
      // 'pprFundsRegistry': 'pprCommunityRegistry',
      'fundFactory': 'communityFactory'
    };
    ['spaceGeoData', 'propertyMarket', 'spaceToken', 'newPropertyManager', 'privatePropertyGlobalRegistry', 'privatePropertyMarket', 'communityFactory'].forEach(contractName => {
      const contractAddress = this.contractsConfig[config[contractName + 'Name'] + 'Address'];
      const contractAbi = this.contractsConfig[config[contractName + 'Name'] + 'Abi'];
      if(!contractAddress) {
        return console.log(`✖️ Contract ${contractName} not found in config`);
      }
      if(aliases[contractName]) {
        contractName = aliases[contractName];
      }
      this[contractName] = new this.web3.eth.Contract(contractAbi, contractAddress);
      console.log(`✅️ Contract ${contractName} successfully init by address: ${contractAddress}`);
    });
  }

  // =============================================================
  // Space Tokens
  // =============================================================

  getPropertyRegistryContract(address) {
    if(this.isContractAddress(this.spaceToken, address)) {
      return this.spaceToken;
    }
    if(this.isContractAddress(this.spaceGeoData, address)) {
      return this.spaceGeoData;
    }

    if(this.pprCache[address]) {
      return this.pprCache[address];
    }

    const privatePropertyContract = new this.web3.eth.Contract(this.contractsConfig['privatePropertyTokenAbi'], address);
    this.pprCache[address] = privatePropertyContract;
    return privatePropertyContract;
  }

  public async getLockerOwner(address) {
    const contract = new this.web3.eth.Contract(JSON.parse('[{"constant":true,"inputs":[],"name":"owner","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"}]'), address);
    return contract.methods.owner().call({}).catch(() => null);
  }

  public async getSpaceTokenOwner(contractAddress, tokenId) {
    if(this.isContractAddress(this.spaceGeoData, contractAddress)) {
      contractAddress = this.spaceToken._address;
    }
    return this.getPropertyRegistryContract(contractAddress).methods.ownerOf(tokenId).call({});
  }

  public async getSpaceTokenArea(contractAddress, tokenId) {
    if(this.isContractAddress(this.spaceToken, contractAddress)) {
      contractAddress = this.spaceGeoData._address;
    }
    return this.getPropertyRegistryContract(contractAddress).methods.getArea(tokenId).call({}).then(result => {
      return Web3Utils.fromWei(result.toString(10), 'ether');
    })
  }

  public async getSpaceTokenContourData(contractAddress, tokenId) {
    if(this.isContractAddress(this.spaceToken, contractAddress)) {
      contractAddress = this.spaceGeoData._address;
    }
    return this.getPropertyRegistryContract(contractAddress).methods.getContour(tokenId).call({}).then(result => {
      const geohashContour = [];
      const heightsContour = [];
      result.map((geohash5z) => {
        const { geohash5, height } = galtUtils.geohash5zToGeohash5(geohash5z.toString(10));
        heightsContour.push(height / 100);
        geohashContour.push(galtUtils.numberToGeohash(geohash5));
      });
      return {
        geohashContour,
        heightsContour
      };
    })
  }

  public async getSpaceTokenData(contractAddress, tokenId) {
    if(this.isContractAddress(this.spaceToken, contractAddress)) {
      contractAddress = this.spaceGeoData._address;
    }
    return this.getPropertyRegistryContract(contractAddress).methods.getDetails(tokenId).call({}).then(result => {

      let ledgerIdentifier;
      try {
        ledgerIdentifier = Web3Utils.hexToUtf8(result.ledgerIdentifier);
      } catch (e) {
        console.warn('Web3Utils.hexToUtf8', e);
      }

      const geohashContour = [];
      const heightsContour = [];

      result.contour.map((geohash5z) => {
        const { geohash5, height } = galtUtils.geohash5zToGeohash5(geohash5z.toString(10));
        heightsContour.push(height / 100);
        geohashContour.push(galtUtils.numberToGeohash(geohash5));
      });
      const tokenType = (result.spaceTokenType || result.tokenType).toString(10);
      return {
        area: Web3Utils.fromWei(result.area.toString(10), 'ether'),
        geohashContour,
        heightsContour,
        ledgerIdentifier,
        humanAddress: result.humanAddress,
        dataLink: result.dataLink,
        spaceTokenType: ({"0": "null", "1": "land", "2": "building", "3": "room"})[tokenType]
      };
    })
  }

  // =============================================================
  // Sale Orders
  // =============================================================

  getPropertyMarketContract(address) {
    if(this.isContractAddress(this.propertyMarket, address)) {
      return this.propertyMarket;
    }
    if(this.isContractAddress(this.privatePropertyMarket, address)) {
      return this.privatePropertyMarket;
    }
  }

  getSaleOrder(contractAddress, orderId) {
    const propertyMarketContract = this.getPropertyMarketContract(contractAddress);
    return propertyMarketContract.methods.saleOrders(orderId).call({}).then(async result => {
      result.ask = Web3Utils.fromWei(result.ask.toString(10), 'ether');
      result.details = await propertyMarketContract.methods.getSaleOrderDetails(orderId).call({});
      result.details.tokenIds = result.details.tokenIds || result.details['spaceTokenIds'] || result.details['propertyTokenIds'];

      result.statusName = {
        '0': 'inactive',
        '1': 'active'
      }[result.status.toString(10)];

      return result;
    })
  }

  getSaleOffer(contractAddress, orderId, buyer) {
    const propertyMarketContract = this.getPropertyMarketContract(contractAddress);
    return propertyMarketContract.methods.saleOffers(orderId, buyer).call({}).then(async result => {
      result.ask = Web3Utils.fromWei(result.ask.toString(10), 'ether');
      result.bid = Web3Utils.fromWei(result.bid.toString(10), 'ether');
      result.status = {'0': 'inactive', '1': 'active'}[result.status.toString(10)];
      return result;
    })
  }

  // =============================================================
  // Applications
  // =============================================================

  getNewPropertyApplication(applicationId) {
    return this.newPropertyManager.methods.getApplication(applicationId).call({}).then(result => {
      result.id = applicationId.toString(10);
      result.tokenId = result.tokenId || result.spaceTokenId || result._tokenId || result._spaceTokenId;
      result.tokenId = result.tokenId.toString(10);
      if(result.tokenId === '0') {
        result.tokenId = null;
      }
      result.currency = result.currency.toString(10);
      result.assignedOracleTypes = result.assignedOracleTypes.map(typeHex => Web3Utils.hexToUtf8(typeHex));

      result.statusName = {
        '0': 'not_exists',
        '1': 'partially_submitted',
        '2': 'contour_verification',
        '3': 'cancelled',
        '4': 'cv_rejected',
        '5': 'pending',
        '6': 'approved',
        '7': 'rejected',
        '8': 'reverted',
        '9': 'partially_submitted',
        '10': 'stored',
        '11': 'closed'
      }[result.status.toString(10)];
      return result;
    })
  }

  getNewPropertyApplicationDetails(applicationId) {
    return this.newPropertyManager.methods.getApplicationDetails(applicationId).call({}).then(result => {
      const ledgerIdentifier = Web3Utils.hexToUtf8(result.ledgerIdentifier);

      const geohashContour = [];
      const heightsContour = [];

      result.contour.map((geohash5z) => {
        const { geohash5, height } = galtUtils.geohash5zToGeohash5(geohash5z.toString(10));
        heightsContour.push(height / 100);
        geohashContour.push(galtUtils.numberToGeohash(geohash5));
      });
      return {
        area: Web3Utils.fromWei(result.area.toString(10), 'ether'),
        geohashContour,
        heightsContour,
        ledgerIdentifier,
        credentialsHash: result.credentialsHash,
        humanAddress: result.humanAddress,
        dataLink: result.dataLink,
        spaceTokenType: ({"0": "null", "1": "land", "2": "building", "3": "room"})[result.spaceTokenType.toString(10)]
      };
    })
  }

  getNewPropertyApplicationOracle(applicationId, roleName) {
    return this.newPropertyManager.methods.getApplicationOracle(applicationId, Web3Utils.utf8ToHex(roleName)).call({}).then(result => {
      return {
        address: result.oracle === '0x0000000000000000000000000000000000000000' ? null : result.oracle,
        status: ({"0": "null", "1": "pending", "2": "locked", "3": "approved", "4": "rejected", "5": "reverted"})[result.status.toString(10)],
        reward: parseFloat(Web3Utils.fromWei(result.reward.toString(10), 'ether'))
      };
    })
  }

  // =============================================================
  // Community
  // =============================================================

  getCommunityContract(address, isDecentralized) {
    if(this.communityCache[address]) {
      return this.communityCache[address];
    }

    const communityContract = new this.web3.eth.Contract(isDecentralized ? this.contractsConfig['fundStorageAbi'] : this.contractsConfig['pprFundStorageAbi'], address);
    this.communityCache[address] = communityContract;
    return communityContract;
  }

  getCommunityRaContract(address, isDecentralized) {
    if(this.communityCache[address]) {
      return this.communityCache[address];
    }

    const communityRaContract = new this.web3.eth.Contract(isDecentralized ? this.contractsConfig['fundRAAbi'] : this.contractsConfig['pprFundRAAbi'], address);
    this.communityCache[address] = communityRaContract;
    return communityRaContract;
  }

  getCommunityProposalManagerContract(address) {
    if(this.communityCache[address]) {
      return this.communityCache[address];
    }

    const communityProposalManagerContract = new this.web3.eth.Contract(this.contractsConfig['fundProposalManagerAbi'], address);
    this.communityCache[address] = communityProposalManagerContract;
    return communityProposalManagerContract;
  }

  // =============================================================
  // Common
  // =============================================================

  public async callContractMethod(contract, method, args, type) {
    let value = await contract.methods[method].apply(contract, args).call({});
    if(type === 'wei') {
      value = this.weiToEther(value);
    }
    if(type === 'number') {
      value = parseFloat(value.toString(10));
    }
    if(type === 'bytes32') {
      value = _.trimEnd(value.toString(10), '0');
    }
    return value;
  }

  public async getContractSymbol(address) {
    const contract = new this.web3.eth.Contract([{"constant":true,"inputs":[],"name":"_symbol","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function","signature":"0xb09f1266"},{"constant":true,"inputs":[],"name":"symbol","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"}], address);
    // console.log(this.contractsConfig['spaceLockerAbi']);
    return contract.methods.symbol().call({})
      .catch(() =>
        contract.methods._symbol().call({}).catch(() => null)
      );
  }

  isContractAddress(contract, address) {
    return contract && address.toLowerCase() === contract._address.toLowerCase()
  }

  weiToEther(value) {
    return this.web3.utils.fromWei(value, 'ether');
  }

  async getCurrentBlock() {
    return this.web3.eth.getBlockNumber();
  }
}
