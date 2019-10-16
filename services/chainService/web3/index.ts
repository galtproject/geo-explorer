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
  const web3 = new Web3(new Web3.providers.WebsocketProvider(config.wsServer));

  // const netId = await web3.eth.net.getId();

  let configFile = extendConfig.configFile || config.configFile;
  let contractsConfigUrl = _.template(config.contractsConfigUrl)({ configFile });

  console.log('📄 contractsConfigUrl', contractsConfigUrl);

  const {data: contractsConfig} = await axios.get(contractsConfigUrl);

  const serviceInstance = new ExplorerChainWeb3Service(contractsConfig);

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

  spaceGeoData: any;
  propertyMarket: any;
  spaceToken: any;
  newPropertyManager: any;
  
  contractsConfig: any;

  callbackOnReconnect: any;

  constructor(_contractsConfig) {
    this.websocketProvider = new Web3.providers.WebsocketProvider(config.wsServer);
    this.web3 = new Web3(this.websocketProvider);

    this.contractsConfig = _contractsConfig;

    this.createContractInstance();

    this.subscribeForReconnect();
  }
  
  getContractByEvent(eventName) {
    if(eventName === ChainServiceEvents.SpaceTokenTransfer) {
      return this.spaceToken;
    }
    if(eventName === ChainServiceEvents.SetSpaceTokenContour) {
      return this.spaceGeoData;
    }
    if(eventName === ChainServiceEvents.SetSpaceTokenDataLink) {
      return this.spaceGeoData;
    }
    if(eventName === ChainServiceEvents.SaleOrderStatusChanged) {
      return this.propertyMarket;
    }
    if(eventName === ChainServiceEvents.NewPropertyApplication) {
      return this.newPropertyManager;
    }
    if(eventName === ChainServiceEvents.NewPropertyValidationStatusChanged) {
      return this.newPropertyManager;
    }
    if(eventName === ChainServiceEvents.NewPropertyApplicationStatusChanged) {
      return this.newPropertyManager;
    }
    return null;
  }

  getEventsFromBlock(eventName: string, blockNumber?: number): Promise<IExplorerChainContourEvent[]> {
    const contract = this.getContractByEvent(eventName);
    return contract.getPastEvents(eventName, {fromBlock: blockNumber || this.contractsConfig.blockNumber}).then(events => {
      return events.map(e => {
        // console.log('event', e);
        e.contractAddress = e.address;
        return e;
      })
    });
  }

  subscribeForNewEvents(eventName: string, blockNumber: number, callback) {
    const contract = this.getContractByEvent(eventName);

    contract.events[eventName]({fromBlock: blockNumber}, (error, e) => {
      // console.log('event', e);
      if(e) {
        e.contractAddress = e.address;
      }
      callback(error, e);
    });
  }

  async getCurrentBlock() {
    return this.web3.eth.getBlockNumber();
  }

  onReconnect(callback) {
    this.callbackOnReconnect = callback;
  }

  private subscribeForReconnect() {
    this.websocketProvider.on('end', () => {
      setTimeout(() => {
        console.log('🔁 Websocket reconnect');

        this.websocketProvider = new Web3.providers.WebsocketProvider(config.wsServer);
        this.web3 = new Web3(this.websocketProvider);
        this.createContractInstance();

        if (this.callbackOnReconnect) {
          this.callbackOnReconnect();
        }

        this.subscribeForReconnect();
      }, 1000);
    });
  }

  setContractsConfig(contractsConfig, redeployed = false) {
    this.contractsConfig = contractsConfig;
    this.createContractInstance();

    if (this.callbackOnReconnect) {
      this.callbackOnReconnect(redeployed);
    }
  }

  private createContractInstance() {
    this.spaceGeoData = new this.web3.eth.Contract(this.contractsConfig[config.geoDataContractName + 'Abi'], this.contractsConfig[config.geoDataContractName + 'Address']);
    this.propertyMarket = new this.web3.eth.Contract(this.contractsConfig[config.propertyMarketContractName + 'Abi'], this.contractsConfig[config.propertyMarketContractName + 'Address']);
    this.spaceToken = new this.web3.eth.Contract(this.contractsConfig[config.spaceTokenContractName + 'Abi'], this.contractsConfig[config.spaceTokenContractName + 'Address']);
    this.newPropertyManager = new this.web3.eth.Contract(this.contractsConfig[config.newPropertyManagerName + 'Abi'], this.contractsConfig[config.newPropertyManagerName + 'Address']);
  }

  public async getLockerOwner(address) {
    const contract = new this.web3.eth.Contract(this.contractsConfig['spaceLockerAbi'], address);
    // console.log(this.contractsConfig['spaceLockerAbi']);
    return contract.methods.owner().call({}).catch(() => null);
  }

  public async getSpaceTokenOwner(spaceTokenId) {
    return this.spaceToken.methods.ownerOf(spaceTokenId).call({});
  }
  
  public async getSpaceTokenArea(spaceTokenId) {
    return this.spaceGeoData.methods.getSpaceTokenArea(spaceTokenId).call({}).then(result => {
      return Web3Utils.fromWei(result.toString(10), 'ether');
    })
  }

  public async getSpaceTokenContourData(spaceTokenId) {
    return this.spaceGeoData.methods.getSpaceTokenContour(spaceTokenId).call({}).then(result => {
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

  public async getSpaceTokenData(spaceTokenId) {
    return this.spaceGeoData.methods.getSpaceTokenDetails(spaceTokenId).call({}).then(result => {
      
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
        humanAddress: result.humanAddress,
        dataLink: result.dataLink,
        spaceTokenType: ({"0": "null", "1": "land", "2": "building", "3": "room"})[result.spaceTokenType.toString(10)]
      };
    })
  }

  getSaleOrder(orderId) {
    return this.propertyMarket.methods.saleOrders(orderId).call({}).then(result => {
      result.ask = Web3Utils.fromWei(result.ask.toString(10), 'ether');
      return result;
    })
  }

  getNewPropertyApplication(applicationId) {
    return this.newPropertyManager.methods.getApplication(applicationId).call({}).then(result => {
      result.id = applicationId.toString(10);
      result.spaceTokenId = result.spaceTokenId.toString(10);
      if(result.spaceTokenId === '0') {
        result.spaceTokenId = null;
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

  public async getContractSymbol(address) {
    const contract = new this.web3.eth.Contract([{"constant":true,"inputs":[],"name":"_symbol","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function","signature":"0xb09f1266"},{"constant":true,"inputs":[],"name":"symbol","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"}], address);
    // console.log(this.contractsConfig['spaceLockerAbi']);
    return contract.methods.symbol().call({})
      .catch(() => 
        contract.methods._symbol().call({}).catch(() => null)
      );
  }
}
