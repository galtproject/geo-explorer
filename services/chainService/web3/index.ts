/*
 * Copyright ©️ 2019 Galt•Project Society Construction and Terraforming Company
 * (Founded by [Nikolai Popeka](https://github.com/npopeka)
 *
 * Copyright ©️ 2019 Galt•Core Blockchain Company
 * (Founded by [Nikolai Popeka](https://github.com/npopeka) by
 * [Basic Agreement](ipfs/QmaCiXUmSrP16Gz8Jdzq6AJESY1EAANmmwha15uR3c1bsS)).
 */

import IExplorerChainService from "../interface";
import {IExplorerChainContourEvent} from "../../interfaces";

const galtUtils = require('@galtproject/utils');
const _ = require('lodash');
const axios = require('axios');

const Web3 = require("web3");
const Web3Utils = require("web3-utils");
const toBN = Web3Utils.toBN;
const log = require('../../logService');

const isIPFS = require('is-ipfs');
const bs58 = require('bs58');

const config = require('./config');
if (!config.wsServer) {
  console.error('wsServer required in config.js');
  process.exit(1);
}

module.exports = async (extendConfig) => {
  const wsServer = extendConfig.wsServer || config.wsServer;
  log('wsServer', wsServer);
  // const web3 = new Web3(new Web3.providers.WebsocketProvider(wsServer));
  //
  // const netId = await web3.eth.net.getId();

  let configFile = extendConfig.configFile || config.configFile;
  let contractsConfigUrl = _.template(config.contractsConfigUrl)({ configFile });

  log('📄 contractsConfigUrl', contractsConfigUrl);

  const {data: contractsConfig} = await axios.get(contractsConfigUrl);

  const serviceInstance = new ExplorerChainWeb3Service(contractsConfig, wsServer);

  serviceInstance.configFile = configFile;

  setInterval(async () => {
    try {
      const {data: newContractsConfig} = await axios.get(contractsConfigUrl);
      if (newContractsConfig.blockNumber != serviceInstance.contractsConfig.blockNumber) {
        log('😱 New contracts, reset database', contractsConfigUrl);
        serviceInstance.setContractsConfig(newContractsConfig, true);
      }
    } catch (e) {
      console.warn("Warning! Can't fetch contracts", e.message);
    }
  }, 1000 * 60);

  return serviceInstance;
};

class ExplorerChainWeb3Service implements IExplorerChainService {
  websocketProvider: any;
  web3: any;
  wsServer: string;

  configFile: string;

  spaceGeoData: any;
  propertyMarket: any;
  spaceToken: any;
  newPropertyManager: any;

  privatePropertyGlobalRegistry: any;
  privatePropertyMarket: any;

  ppTokenRegistry: any;
  decentralizedCommunityRegistry: any;
  pprCommunityRegistry: any;
  communityFactory: any;
  pprCommunityFactory: any;
  pprManagedCommunityFactory: any;
  communityMockFactory: any;
  tokenizableFactory: any;

  ppDepositHolder: any;
  ppHomeMediatorFactory: any;
  ppForeignMediatorFactory: any;
  ppPoaMediatorFactory: any;
  ppXDaiMediatorFactory: any;

  contractsConfig: any;

  callbackOnReconnect: any;

  pprCache: any = {};
  communityCache: any = {};
  tokenizableCache: any = {};

  subscribedToEventsByContract: any = {};

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

  getEventsFromBlock(contract, eventName: string, blockNumber?: number, filter?: any): Promise<IExplorerChainContourEvent[]> {
    if(!contract) {
      log(`✖️ Event ${eventName} getting events ignored, contract not found`);
      return new Promise((resolve) => resolve([]));
    }
    if(!contract.events[eventName]) {
      log(`✖️ Event ${eventName} getting events ignored, event not found`);
      return new Promise((resolve) => resolve([]));
    }
    if(_.isUndefined(blockNumber) || _.isNull(blockNumber)) {
      blockNumber = this.contractsConfig.blockNumber;
    }
    return contract.getPastEvents(eventName, {fromBlock: blockNumber, filter}).then(events => {
      log(`✅️ Event ${eventName} got ${events.length} items, by contract ${contract._address} from block ${blockNumber}`);
      return events.map(e => {
        // log('event', e);
        e.contractAddress = e.address;
        return e;
      })
    }).catch(() => {
      console.warn(`✖️ Event ${eventName} getting events ignored, get events failed`);
      return [];
    });
  }

  subscribeForNewEvents(contract, eventName: string, blockNumber: number, callback) {
    if(!contract) {
      log(`✖️ Event ${eventName} subscribing ignored, contract not found`);
      return;
    }
    if(!contract.events[eventName]) {
      log(`✖️ Event ${eventName} subscribing ignored, event not found`);
      return;
    }
    const contractAddress = contract._address.toLowerCase();

    log(`✅️ Event ${eventName} subscribed, by contract ${contractAddress}`);

    if(!this.subscribedToEventsByContract[contractAddress]) {
      this.subscribedToEventsByContract[contractAddress] = {};
    }

    const eventReturn = contract.events[eventName]({fromBlock: blockNumber}, (error, e) => {
      if(error) {
        console.error('New event error', error);
        return callback(error, e);
      }
      this.getBlockTimestamp(e.blockNumber).then(blockTimestamp => {
        const blockDate = new Date();
        blockDate.setTime(parseInt(blockTimestamp) * 1000);
        log('🛎 New Event', eventName, 'block number:',  e.blockNumber, 'block date:', blockDate.toISOString().slice(0, 19).replace('T', ' '));
      });
      if(e) {
        e.contractAddress = e.address;
      }
      // delay for ethereum node to write new data from event to storage
      setTimeout(() => {
        callback(error, e);
      }, 1000);
    });

    const eventSignature = eventReturn.arguments[0].topics[0].toLowerCase();

    this.subscribedToEventsByContract[contractAddress][eventSignature] = true;

    console.log('subscribedToEventsByContract', contractAddress, eventSignature);

    return eventReturn;
  }

  isSubscribedToEvent(contractAddress, eventSignature) {
    contractAddress = contractAddress.toLowerCase();
    eventSignature = eventSignature.toLowerCase();
    return !!(this.subscribedToEventsByContract[contractAddress] || {})[eventSignature];
  }

  onReconnect(callback) {
    this.callbackOnReconnect = callback;
  }

  private subscribeForReconnect() {
    this.websocketProvider.on('end', () => {
      setTimeout(() => {
        log(new Date().toISOString().slice(0, 19).replace('T', ' '), '🔁 Websocket reconnect');

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
    this.tokenizableCache = {};

    [
      'spaceGeoData',
      'propertyMarket',
      'spaceToken',
      'newPropertyManager',
      'privatePropertyGlobalRegistry',
      'privatePropertyMarket',
      'communityFactory',
      'communityMockFactory',
      'pprCommunityFactory',
      'pprManagedCommunityFactory',
      'tokenizableFactory',
      'ppDepositHolder',
      'ppForeignMediatorFactory',
      'ppHomeMediatorFactory',
      'ppForeignMediatorFactory',
      'ppPoaMediatorFactory',
      'ppXDaiMediatorFactory',
      'ppTokenRegistry'
    ].forEach(contractName => {
      const contractAddress = this.contractsConfig[config[contractName + 'Name'] + 'Address'];
      log(contractName, 'address', contractAddress);
      const contractAbi = this.contractsConfig[config[contractName + 'Name'] + 'Abi'];
      if(!contractAddress) {
        return log(`✖️ Contract ${contractName} not found in config`);
      }
      this[contractName] = new this.web3.eth.Contract(contractAbi, contractAddress);
      log(`✅️ Contract ${contractName} successfully init by address: ${contractAddress}`);
    });
  }

  getCommunityFactoryContract(address) {
    if(this.communityCache[address]) {
      return this.communityCache[address];
    }

    const communityFactory = new this.web3.eth.Contract(this.contractsConfig['fundFactoryAbi'] || this.contractsConfig['privateFundFactoryAbi'], address);
    this.communityCache[address] = communityFactory;
    return communityFactory;
  }

  getPPTokenRegistryContract(address) {
    if(this.pprCache[address]) {
      return this.pprCache[address];
    }

    const pprTokenRegistry = new this.web3.eth.Contract(this.contractsConfig['ppTokenRegistryAbi'], address);
    this.pprCache[address] = pprTokenRegistry;
    return pprTokenRegistry;
  }

  getTokenizableContract(address) {
    if(this.tokenizableCache[address]) {
      return this.tokenizableCache[address];
    }

    const tokenizableContract = new this.web3.eth.Contract(this.contractsConfig['tokenizableLockerAbi'], address);
    this.tokenizableCache[address] = tokenizableContract;
    return tokenizableContract;
  }

  // =============================================================
  // Space Tokens
  // =============================================================

  async getPropertyRegistryContract(address, old?) {
    if(this.isContractAddress(this.spaceToken, address)) {
      return this.spaceToken;
    }
    if(this.isContractAddress(this.spaceGeoData, address)) {
      return this.spaceGeoData;
    }

    if(this.pprCache[address]) {
      return this.pprCache[address];
    }

    let {contractType} = await this.ppTokenRegistry.methods.tokens(address).call({});
    contractType = contractType ? this.hexToString(contractType) : 'regular';

    let abi = contractType === 'bridged' || !this.contractsConfig['ppTokenAbi'] ? this.contractsConfig['ppBridgedTokenAbi'] : this.contractsConfig['ppTokenAbi'];

    const privatePropertyContract = new this.web3.eth.Contract(abi, address);
    this.pprCache[address] = privatePropertyContract;
    return privatePropertyContract;
  }

  getPropertyRegistryControllerContract(address, old?) {
    if(this.pprCache[address]) {
      return this.pprCache[address];
    }
    let abi = this.contractsConfig['ppTokenControllerAbi'];

    const privatePropertyControllerContract = new this.web3.eth.Contract(abi, address);
    this.pprCache[address] = privatePropertyControllerContract;
    return privatePropertyControllerContract;
  }

  getPropertyRegistryVerificationContract(address) {
    if(this.pprCache[address]) {
      return this.pprCache[address];
    }
    let abi = this.contractsConfig['ppContourVerificationAbi'];
    if(!abi) {
      return null;
    }

    const privatePropertyVerificationContract = new this.web3.eth.Contract(abi, address);
    this.pprCache[address] = privatePropertyVerificationContract;
    return privatePropertyVerificationContract;
  }


  public async getLockerOwner(address) {
    try {
      const contract = new this.web3.eth.Contract(JSON.parse('[{"constant":true,"inputs":[],"name":"owner","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"}]'), address);
      return contract.methods.owner().call({}).catch(() => null);
    } catch (e) {
      return null;
    }
  }

  public async getLockerType(address) {
    try {
      const contract = new this.web3.eth.Contract(JSON.parse('[{"constant":true,"inputs":[],"name":"LOCKER_TYPE","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"payable":false,"stateMutability":"view","type":"function"}]'), address);
      return contract.methods.LOCKER_TYPE().call({}).catch(() => null);
    } catch (e) {
      return null;
    }
  }

  public async getSpaceTokenOwner(contractAddress, tokenId) {
    if(this.isContractAddress(this.spaceGeoData, contractAddress)) {
      contractAddress = this.spaceToken._address;
    }
    return (await this.getPropertyRegistryContract(contractAddress)).methods.ownerOf(tokenId).call({});
  }

  public async getSpaceTokenArea(contractAddress, tokenId) {
    if(this.isContractAddress(this.spaceToken, contractAddress)) {
      contractAddress = this.spaceGeoData._address;
    }
    return (await this.getPropertyRegistryContract(contractAddress)).methods.getArea(tokenId).call({}).then(result => {
      return Web3Utils.fromWei(result.toString(10), 'ether');
    })
  }

  public async getSpaceTokenContourData(contractAddress, tokenId) {
    if(this.isContractAddress(this.spaceToken, contractAddress)) {
      contractAddress = this.spaceGeoData._address;
    }
    return (await this.getPropertyRegistryContract(contractAddress)).methods.getContour(tokenId).call({}).then(result => {
      const geohashContour = [];
      const contractContour = [];
      const heightsContour = [];
      result.map((cPoint) => {
        cPoint = cPoint.toString(10);

        // log('cPoint', cPoint);
        // if(galtUtils.contractPoint.isContractPoint(cPoint)) {
          contractContour.push(cPoint);
          const { lat, lon, height } = galtUtils.contractPoint.decodeToLatLonHeight(cPoint);
          const geohash = galtUtils.geohash.extra.encodeFromLatLng(lat, lon, 12);
          geohashContour.push(geohash);
          heightsContour.push(height);
        // } else {
        //   const { geohash5, height } = galtUtils.geohash5zToGeohash5(cPoint);
        //   heightsContour.push(height);
        //   const geohash = galtUtils.numberToGeohash(geohash5);
        //   geohashContour.push(geohash);
        //   contractContour.push(galtUtils.contractPoint.encodeFromGeohash(geohash));
        // }
      });
      return {
        geohashContour,
        contractContour,
        heightsContour
      };
    })
  }

  public async getSpaceTokenData(contractAddress, tokenId) {
    if(this.isContractAddress(this.spaceToken, contractAddress)) {
      contractAddress = this.spaceGeoData._address;
    }
    if(!tokenId) {
      return {
        dataLink: '',
        geohashContour: []
      };
    }
    return (await this.getPropertyRegistryContract(contractAddress)).methods.getDetails(tokenId).call({}).then(result => {

      // console.log('getDetails', result);
      let ledgerIdentifier;
      try {
        ledgerIdentifier = Web3Utils.hexToUtf8(result.ledgerIdentifier);
      } catch (e) {
        // console.warn('Web3Utils.hexToUtf8', e);
      }

      const geohashContour = [];
      const contractContour = [];
      const heightsContour = [];

      // if(contractAddress === '0x9934766335745AECb2d134b83D30e48538c50645'){
      //   log('result.contour', result.contour);
      // }

      result.contour.map((cPoint) => {
        cPoint = cPoint.toString(10);

        // log('cPoint', cPoint);
        // if(galtUtils.contractPoint.isContractPoint(cPoint)) {
          contractContour.push(cPoint);
          const { lat, lon, height } = galtUtils.contractPoint.decodeToLatLonHeight(cPoint);
          const geohash = galtUtils.geohash.extra.encodeFromLatLng(lat, lon, 12);
          geohashContour.push(geohash);
          heightsContour.push(height);
        // } else {
        //   const { geohash5, height } = galtUtils.geohash5zToGeohash5(cPoint);
        //   heightsContour.push(height);
        //   const geohash = galtUtils.numberToGeohash(geohash5);
        //   geohashContour.push(geohash);
        //   contractContour.push(galtUtils.contractPoint.encodeFromGeohash(geohash));
        // }
      });
      const tokenType = (result.spaceTokenType || result.tokenType).toString(10);
      return {
        area: Web3Utils.fromWei(result.area.toString(10), 'ether'),
        geohashContour,
        contractContour,
        heightsContour,
        ledgerIdentifier,
        highestPoint: parseInt(result.highestPoint.toString(10)) / 100,
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

      // log('result.status', result.status);
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

  getMediatorContract(address, type) {
    if(this.pprCache[address]) {
      return this.pprCache[address];
    }

    const mediatorContract = new this.web3.eth.Contract(this.contractsConfig[type === 'foreign' ? 'ppForeignMediatorAbi' : 'ppHomeMediatorAbi'], address);
    this.pprCache[address] = mediatorContract;
    return mediatorContract;
  }

  // =============================================================
  // Community
  // =============================================================

  getCommunityStorageContract(address, isPpr = false) {
    if(this.communityCache[address]) {
      return this.communityCache[address];
    }

    const communityContract = new this.web3.eth.Contract(this.getCommunityStorageAbi(isPpr), address);
    this.communityCache[address] = communityContract;
    return communityContract;
  }

  getCommunityStorageAbi(isPpr = false) {
    return isPpr ? this.contractsConfig['privateFundStorageAbi'] : this.contractsConfig['fundStorageAbi'];
  }

  getCommunityRuleRegistryContract(address) {
    if(this.communityCache[address]) {
      return this.communityCache[address];
    }

    const communityContract = new this.web3.eth.Contract(this.getCommunityRuleRegistryAbi(), address);
    this.communityCache[address] = communityContract;
    return communityContract;
  }

  getCommunityRuleRegistryAbi() {
    return this.contractsConfig['fundRuleRegistryAbi'];
  }

  getCommunityRaContract(address, isPpr) {
    if(this.communityCache[address]) {
      return this.communityCache[address];
    }

    const communityRaContract = new this.web3.eth.Contract(isPpr ? this.contractsConfig['privateFundRAAbi'] : this.contractsConfig['fundRAAbi'], address);
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

  getCommunityFundRegistryContract(address) {
    if(this.communityCache[address]) {
      return this.communityCache[address];
    }

    const communityRegistryContract = new this.web3.eth.Contract(this.contractsConfig['fundRegistryAbi'], address);
    this.communityCache[address] = communityRegistryContract;
    return communityRegistryContract;
  }

  // =============================================================
  // Common
  // =============================================================

  getMediatorFactoryAbi() {
    return this.contractsConfig['ppHomeMediatorFactoryAbi'] || this.contractsConfig['ppForeignMediatorFactoryAbi'];
  }

  public async callContractMethod(contract, method, args, type) {
    if(!contract || !contract.methods[method]) {
      return null;
    }
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
    // log(this.contractsConfig['spaceLockerAbi']);
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

  getContractMethod(contractName, methodName) {
    const contractAbi = this.contractsConfig[contractName + 'Abi'];
    const methodAbi = _.find(contractAbi, {name: methodName});
    if(!methodAbi.signature) {
      methodAbi.signature = this.web3.eth.abi.encodeFunctionSignature(methodAbi)
    }
    return methodAbi;
  }

  async getBlockTimestamp(blockNumber): Promise<any> {
    return new Promise(async (resolve, reject) => {
      const block = await this.web3.eth.getBlock(blockNumber);
      if(block) {
        resolve(block.timestamp);
      } else {
        log(`Failed to get ${blockNumber} block timestamp, try again...`)
        setTimeout(() => {
          resolve(this.getBlockTimestamp(blockNumber));
        }, 500);
      }
    });
  }

  getNetworkId(): Promise<any> {
    return this.web3.eth.net.getId();
  }

  async getTransactionReceipt(txHash, abiAddressArr) {
    const receipt = await this.web3.eth.getTransactionReceipt(txHash);

    receipt.events = [];

    abiAddressArr.forEach(item => {
      const {abi, address} = item;
      if(!address) {
        return;
      }
      receipt.logs.filter(log => log.address.toLowerCase() === address.toLowerCase()).forEach((log) => {
        const eventObject = _.find(abi, (abiItem) => {
          if(!abiItem.signature) {
            abiItem.signature = this.getMethodSignature(abi, abiItem.name);
          }
          return abiItem.type === 'event' && log.topics[0] === abiItem.signature;
        });
        if(eventObject) {
          const values = this.web3.eth.abi.decodeLog(eventObject.inputs, log.data === '0x' ? null : log.data, log.topics.slice(1));
          receipt.events.push({
            ...eventObject,
            address,
            txHash,
            values
          })
        }
      });
    });

    return receipt;
  }

  async getTransactionArgs(txHash, abi) {
    const tx = await this.web3.eth.getTransaction(txHash);
    const {inputs} = this.parseData(tx.input, abi);
    return inputs;
  }

  getMethodSignature(abi, methodName) {
    let signature = null;
    abi.some(method => {
      if (method.name === methodName) {
        signature = method.signature;
        if (!signature) {
          signature = this.web3.eth.abi.encodeFunctionSignature(method);
        }
        return true;
      }
      return false;
    });
    return signature;
  }

  parseData(data, abi, decimals?) {
    const methodSignature = data.slice(0, 10);
    if (methodSignature === '0x00000000') {
      return null;
    }

    const methodAbi = _.find(abi, (abiItem) => {
      let abiSignature = abiItem.signature;
      if (abiItem.type === 'fallback') {
        return false;
      }
      if (!abiSignature) {
        try {
          abiSignature = this.web3.eth.abi.encodeFunctionSignature(abiItem);
        } catch (e) {
          console.error('[EthData.parseData.encodeFunctionSignature]', abiItem, e);
        }
      }
      return abiSignature && abiSignature === methodSignature;
    });
    if (!methodAbi) {
      return {
        methodSignature
      };
    }
    const methodName = methodAbi.name;

    let decoded = {};
    if (data.slice(10)) {
      decoded = this.web3.eth.abi.decodeParameters(methodAbi.inputs, '0x' + data.slice(10));
    }

    const sourceInputs = {};
    const inputs = {};
    const inputsStr = {};
    const inputsFields = [];
    const inputsDetails = {};

    methodAbi.inputs.forEach((inputAbi) => {
      let {name} = inputAbi;
      let value = decoded[name];
      sourceInputs[name] = value;
      sourceInputs[_.trim(name, '-_')] = value;

      let valueDecimals = decimals;
      if (_.isUndefined(valueDecimals) || valueDecimals === null) {
        if (_.includes(inputAbi.type, 'int256[]') && this.isNumberLargerThenDecimals(value[0], 15)) {
          valueDecimals = 18;
        } else if (_.includes(inputAbi.type, 'int256') && this.isNumberLargerThenDecimals(value, 15)) {
          valueDecimals = 18;
        } else {
          valueDecimals = 0;
        }
      }
      inputsDetails[name] = {
        type: inputAbi.type,
        decimals: valueDecimals
      };


      if (_.includes(inputAbi.type, 'int256[]')) {
        value = value.map(valItem => {
          return this.weiToDecimals(valItem, valueDecimals);
        });
      } else if (_.includes(inputAbi.type, 'int256')) {
        value = this.weiToDecimals(value, valueDecimals);
      }

      inputs[name] = value;
      inputs[_.trim(name, '-_')] = value;
      inputsFields.push(name);
    });

    return {
      methodSignature,
      methodAbi,
      methodName,
      sourceInputs,
      inputs,
      inputsFields,
      inputsDetails
    };
  }

  isNumberLargerThenDecimals(number, decimals) {
    return toBN(number.toString(10), 10).gt(toBN((10 ** decimals).toString(10), 10));
  }

  weiToDecimals(wei, decimals) {
    const zero = toBN(0);
    const negative1 = toBN(-1);

    const negative = toBN(wei.toString(10), 10).lt(zero); // eslint-disable-line
    const baseLength = (10 ** decimals).toString().length - 1 || 1;
    const decimalsBN = toBN((10 ** decimals).toString(10), 10);

    if (negative) {
      wei = toBN(wei.toString(10), 10).mul(negative1);
    }

    let fraction = toBN(wei.toString(10), 10).mod(decimalsBN).toString(10); // eslint-disable-line
    // fraction = trim(fraction, '0');

    while (fraction.length < baseLength) {
      fraction = '0' + fraction;
    }

    // if (!options.pad) {
    fraction = fraction.match(/^([0-9]*[1-9]|0)(0*)/)[1];
    // }

    const whole = toBN(wei.toString(10), 10).div(decimalsBN).toString(10); // eslint-disable-line

    // if (options.commify) {
    //     whole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    // }

    let value = '' + whole + (fraction == '0' ? '' : '.' + fraction); // eslint-disable-line

    if (negative) {
      value = '-' + value;
    }

    return _.trim(value, '.');
  }

  stringToHex(string) {
    return Web3Utils.utf8ToHex(string)
  }

  hexToString(hex) {
    if (!hex) {
      return "";
    }
    try {
      return Web3Utils.hexToUtf8(hex);
    } catch (e) {
      // most possible this is ipfs hash
      if (hex.length == 66) {
        if (typeof hex !== "string") {
          throw new TypeError("bytes32 should be a string");
        }

        if (hex === "") {
          throw new TypeError("bytes32 shouldn't be empty");
        }

        if (hex.length !== 66) {
          throw new TypeError("bytes32 should have exactly 66 symbols (with 0x)");
        }

        if (!(hex.startsWith("0x") || hex.startsWith("0X"))) {
          throw new TypeError("bytes32 hash should start with '0x'");
        }

        const hexString = "1220" + hex.substr(2);
        const bytes = Buffer.from(hexString, 'hex');

        const ipfsHash = bs58.encode(bytes);
        if (isIPFS.multihash(ipfsHash)) {
          return ipfsHash;
        }
      }
      return null;
    }
  }
}
