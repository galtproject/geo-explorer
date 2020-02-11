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
const log = require('../../logService');

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
    const {data: newContractsConfig} = await axios.get(contractsConfigUrl);
    if (newContractsConfig.blockNumber != serviceInstance.contractsConfig.blockNumber) {
      log('😱 New contracts, reset database', contractsConfigUrl);
      serviceInstance.setContractsConfig(newContractsConfig, true);
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

  decentralizedCommunityRegistry: any;
  pprCommunityRegistry: any;
  communityFactory: any;
  pprCommunityFactory: any;
  communityMockFactory: any;
  tokenizableFactory: any;

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
      log(`✅️ Event ${eventName} got ${events.length} items, by contract ${contract._address}`);
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

    ['spaceGeoData', 'propertyMarket', 'spaceToken', 'newPropertyManager', 'privatePropertyGlobalRegistry', 'privatePropertyMarket', 'communityFactory', 'communityMockFactory', 'pprCommunityFactory', 'tokenizableFactory'].forEach(contractName => {
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

  getPropertyRegistryContract(address, old?) {
    if(this.isContractAddress(this.spaceToken, address)) {
      return this.spaceToken;
    }
    if(this.isContractAddress(this.spaceGeoData, address)) {
      return this.spaceGeoData;
    }

    if(this.pprCache[address]) {
      return this.pprCache[address];
    }

    let abi;
    if(old) {
      //TODO: remove support for old registry
      abi = _.clone(this.contractsConfig['ppTokenAbi']);
      abi.forEach(abiItem => {
        if(abiItem['name'] === 'getDetails') {
          abiItem['outputs'] = [
            {
              "internalType": "enum IPPToken.TokenType",
              "name": "tokenType",
              "type": "uint8"
            },
            {
              "internalType": "uint256[]",
              "name": "contour",
              "type": "uint256[]"
            },
            {
              "internalType": "int256",
              "name": "highestPoint",
              "type": "int256"
            },
            {
              "internalType": "enum IPPToken.AreaSource",
              "name": "areaSource",
              "type": "uint8"
            },
            {
              "internalType": "uint256",
              "name": "area",
              "type": "uint256"
            },
            {
              "internalType": "bytes32",
              "name": "ledgerIdentifier",
              "type": "bytes32"
            },
            {
              "internalType": "string",
              "name": "humanAddress",
              "type": "string"
            },
            {
              "internalType": "string",
              "name": "dataLink",
              "type": "string"
            },
            {
              "internalType": "uint256",
              "name": "setupStage",
              "type": "uint256"
            }
          ];
        }
      });

      abi.push({
        "constant": true,
        "inputs": [],
        "name": "minter",
        "outputs": [
          {
            "internalType": "address",
            "name": "",
            "type": "address"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
      });

      abi.push({
        "constant": true,
        "inputs": [],
        "name": "tokenDataLink",
        "outputs": [
          {
            "internalType": "string",
            "name": "",
            "type": "string"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
      });
    } else {
      abi = this.contractsConfig['ppTokenAbi'];
    }

    const privatePropertyContract = new this.web3.eth.Contract(abi, address);
    this.pprCache[address] = privatePropertyContract;
    return privatePropertyContract;
  }

  getPropertyRegistryControllerContract(address, old?) {
    if(this.pprCache[address]) {
      return this.pprCache[address];
    }
    let abi;
    if(old) {
      abi = _.clone(this.contractsConfig['ppTokenControllerAbi']);
      abi = abi.filter(abiItem => abiItem['name'] != 'SetMinter')
    } else {
      abi = this.contractsConfig['ppTokenControllerAbi'];
    }

    const privatePropertyControllerContract = new this.web3.eth.Contract(abi, address);
    this.pprCache[address] = privatePropertyControllerContract;
    return privatePropertyControllerContract;
  }

  public async getLockerOwner(address) {
    try {
      const contract = new this.web3.eth.Contract(JSON.parse('[{"constant":true,"inputs":[],"name":"owner","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"}]'), address);
      return contract.methods.owner().call({}).catch(() => null);
    } catch (e) {
      return null;
    }
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
      const contractContour = [];
      const heightsContour = [];
      result.map((cPoint) => {
        cPoint = cPoint.toString(10);

        // log('cPoint', cPoint);
        if(galtUtils.contractPoint.isContractPoint(cPoint)) {
          contractContour.push(cPoint);
          const { lat, lon, height } = galtUtils.contractPoint.decodeToLatLonHeight(cPoint);
          const geohash = galtUtils.geohash.extra.encodeFromLatLng(lat, lon, 12);
          geohashContour.push(geohash);
          heightsContour.push(height / 100);
        } else {
          const { geohash5, height } = galtUtils.geohash5zToGeohash5(cPoint);
          heightsContour.push(height / 100);
          const geohash = galtUtils.numberToGeohash(geohash5);
          geohashContour.push(geohash);
          contractContour.push(galtUtils.contractPoint.encodeFromGeohash(geohash));
        }
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
    return this.getPropertyRegistryContract(contractAddress).methods.getDetails(tokenId).call({}).then(result => {

      let ledgerIdentifier;
      try {
        ledgerIdentifier = Web3Utils.hexToUtf8(result.ledgerIdentifier);
      } catch (e) {
        console.warn('Web3Utils.hexToUtf8', e);
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
        if(galtUtils.contractPoint.isContractPoint(cPoint)) {
          contractContour.push(cPoint);
          const { lat, lon, height } = galtUtils.contractPoint.decodeToLatLonHeight(cPoint);
          const geohash = galtUtils.geohash.extra.encodeFromLatLng(lat, lon, 12);
          geohashContour.push(geohash);
          heightsContour.push(height / 100);
        } else {
          const { geohash5, height } = galtUtils.geohash5zToGeohash5(cPoint);
          heightsContour.push(height / 100);
          const geohash = galtUtils.numberToGeohash(geohash5);
          geohashContour.push(geohash);
          contractContour.push(galtUtils.contractPoint.encodeFromGeohash(geohash));
        }
      });
      const tokenType = (result.spaceTokenType || result.tokenType).toString(10);
      return {
        area: Web3Utils.fromWei(result.area.toString(10), 'ether'),
        geohashContour,
        contractContour,
        heightsContour,
        ledgerIdentifier,
        highestPoint: this.weiToEther(result.highestPoint),
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

  hexToString(value) {
    return this.web3.utils.hexToUtf8(value);
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

  async getBlockTimestamp(blockNumber) {
    return (await this.web3.eth.getBlock(blockNumber)).timestamp;
  }

  async getTransactionReceipt(txHash, abiAddressArr) {
    const receipt = await this.web3.eth.getTransactionReceipt(txHash);

    receipt.events = [];

    abiAddressArr.forEach(item => {
      const {abi, address} = item;
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
}
