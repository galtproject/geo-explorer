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

  const netId = await web3.eth.net.getId();

  let contractsConfigUrl = _.template(config.contractsConfigUrl)({env: extendConfig.env || config.env});

  contractsConfigUrl += netId + '.json';
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
    if(eventName === ChainServiceEvents.SetSpaceTokenContour) {
      return this.spaceGeoData;
    }
    if(eventName === ChainServiceEvents.SetSpaceTokenDataLink) {
      return this.spaceGeoData;
    }
    if(eventName === ChainServiceEvents.SaleOrderStatusChanged) {
      return this.propertyMarket;
    }
    return null;
  }

  getEventsFromBlock(eventName: string, blockNumber?: number): Promise<IExplorerChainContourEvent[]> {
    return this.getContractByEvent(eventName).getPastEvents(eventName, {fromBlock: blockNumber || this.contractsConfig.blockNumber});
  }

  subscribeForNewEvents(eventName: string, blockNumber: number, callback) {
    this.getContractByEvent(eventName).events[eventName]({fromBlock: blockNumber}, callback);
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
        heightsContour
      };
    })
  }

  getSaleOrder(orderId) {
    return this.propertyMarket.methods.saleOrders(orderId).call({}).then(result => {
      return result;
    })
  }
}
