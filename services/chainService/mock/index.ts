/*
 * Copyright ©️ 2019 GaltProject Society Construction and Terraforming Company
 * (Founded by [Nikolai Popeka](https://github.com/npopeka)
 *
 * Copyright ©️ 2019 Galt•Core Blockchain Company
 * (Founded by [Nikolai Popeka](https://github.com/npopeka) by
 * [Basic Agreement](ipfs/QmaCiXUmSrP16Gz8Jdzq6AJESY1EAANmmwha15uR3c1bsS)).
 */

import IExplorerChainService from "../interface";
import {IExplorerChainContourEvent} from "../../interfaces";

const galtUtils = require('@galtproject/utils');

module.exports = async () => {
  return new ExplorerChainMockService();
};

class ExplorerChainMockService implements IExplorerChainService {
  websocketProvider: any;
  web3: any;

  spaceGeoData: any;
  propertyMarket: any;
  contractsConfig: any;

  callbackOnReconnect: any;

  newEventsCallback;

  constructor() {

  }

  async getEventsFromBlock(eventName: string, blockNumber?: number): Promise<IExplorerChainContourEvent[]> {
    return [
      ['w24q8xwe6ty4', 'w24q8xqxcvgc', 'w24q8xrpuv5x', 'w24q8xx1su5x', 'w24q8xxh8wr8'],
      ['w24q8xwf4uq0', 'w24q8xwfjuk0', 'w24q8xwfvfk0', 'w24q8xwfffq0'],
      ['w24q8xwf4uq0', 'w24q8xwfjuk0', 'w24q8xwfvfk0', 'w24q8xwfffq0'],
      ['w24q8r9pgd0p', 'w24q8r3newq1', 'w24q8r6pm9gc', 'w24q8rf0q48p'],
      ['w24q8r9f3sgd', 'w24q8r9g3879', 'w24q8r9v9x7d', 'w24q8r9txx24', 'w24q8r9er821', 'w24q8r9e2brc', 'w24q8r9s2brf', 'w24q8r9kqbk6', 'w24q8r96quu6'],
      ['w24q8r9f3sgd', 'w24q8r9g3879', 'w24q8r9v9x7d', 'w24q8r9txx24', 'w24q8r9er821', 'w24q8r9e2brc', 'w24q8r9s2brf', 'w24q8r9kqbk6', 'w24q8r96quu6'],
      ['w24q8r9f3sgd', 'w24q8r9g3879', 'w24q8r9v9x7d', 'w24q8r9txx24', 'w24q8r9er821', 'w24q8r9e2brc', 'w24q8r9s2brf', 'w24q8r9kqbk6', 'w24q8r96quu6']
    ].map((stringContour, numberId) => {
      let contour: number[] = stringContour.map(galtUtils.geohashToGeohash5);
      let spaceTokenId = numberId.toString();
      return {returnValues: {contour, spaceTokenId}};
    });
  }

  subscribeForNewEvents(eventName: string, blockNumber: number, callback) {
    this.newEventsCallback = callback;
  }

  callNewEvent(eventName: string, contour, id) {
    this.newEventsCallback({returnValues: {contour, id}});
  }

  async getCurrentBlock() {
    return 0;
  }

  async onReconnect(callback) {

  }
  public async getSpaceTokenArea(spaceTokenId) {
    return 0;
  }
}
