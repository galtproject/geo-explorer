/*
 * Copyright ©️ 2019 GaltProject Society Construction and Terraforming Company
 * (Founded by [Nikolai Popeka](https://github.com/npopeka)
 *
 * Copyright ©️ 2019 Galt•Core Blockchain Company
 * (Founded by [Nikolai Popeka](https://github.com/npopeka) by
 * [Basic Agreement](ipfs/QmaCiXUmSrP16Gz8Jdzq6AJESY1EAANmmwha15uR3c1bsS)).
 */

import IExplorerDatabase from "../../../database/interface";
import IExplorerGeohashService from "../interface";
import {IExplorerChainContourEvent, IExplorerResultContour} from "../../interfaces";
import IExplorerChainService from "../../chainService/interface";

const config = require("./config");
const galtUtils = require('@galtproject/utils');
const _ = require("lodash");
const pIteration = require("p-iteration");

module.exports = async (database: IExplorerDatabase, chainService: IExplorerChainService) => {
  return new ExplorerGeohashV1Service(database, chainService);
};

class ExplorerGeohashV1Service implements IExplorerGeohashService {
  database: IExplorerDatabase;
  chainService: IExplorerChainService;

  constructor(_database, _chainService) {
    this.database = _database;
    this.chainService = _chainService;
  }

  async handleChangeContourEvent(event: IExplorerChainContourEvent) {
    let tokenId: string = event.returnValues.tokenId || event.returnValues['spaceTokenId'] || event.returnValues['privatePropertyId'] || event.returnValues['id'];
    
    const {geohashContour} = await this.chainService.getSpaceTokenContourData(event.contractAddress, tokenId).catch(() => {
      console.log('contour error', event.contractAddress, tokenId);
      return {geohashContour: []};
    });
    
    let spaceTokenNumberId: number;
    if (_.startsWith(tokenId, '0x')) {
      spaceTokenNumberId = parseInt(galtUtils.tokenIdHexToTokenId(tokenId));
    } else {
      spaceTokenNumberId = parseInt(tokenId);
    }

    await this.database.addOrUpdateContour(geohashContour, spaceTokenNumberId, event.contractAddress);
  };

  async getContoursByParentGeohash(parentGeohash: string, contractAddress?: string) {
    return this.database.getContoursByParentGeohash(parentGeohash, contractAddress);
  }

  async getContoursByParentGeohashArray(parentGeohashArray: string[], contractAddress?: string) {
    let resultContours = [];
    await pIteration.forEach(parentGeohashArray, async (parentGeohash) => {
      const contoursByParent = await this.getContoursByParentGeohash(parentGeohash, contractAddress);
      // console.log('contoursByParent', parentGeohash, contoursByParent);
      resultContours = resultContours.concat(contoursByParent);
    });
    return _.uniqBy(resultContours, 'tokenId');
  }

  async getContoursByInnerGeohash(innerGeohash: string, contractAddress?: string): Promise<[IExplorerResultContour]> {
    let resultContours = [];

    const cachedIsGeohashInsideResultContour = {};

    let parentGeohash = innerGeohash;
    while (parentGeohash.length > config.maxParentGeohashToFindInner) {
      parentGeohash = parentGeohash.slice(0, -1);
      const contoursOfParentGeohash = await this.getContoursByParentGeohash(parentGeohash, contractAddress);

      const contoursThatContentsInnerGeohash = _.filter(contoursOfParentGeohash, (resultContour) => {
        const tokenId = resultContour.tokenId;
        const contour = resultContour.contour;

        if (cachedIsGeohashInsideResultContour[tokenId] === undefined) {
          cachedIsGeohashInsideResultContour[tokenId] = galtUtils.geohash.contour.isGeohashInsideContour(innerGeohash, contour);
        }
        return cachedIsGeohashInsideResultContour[tokenId];
      });

      resultContours = resultContours.concat(contoursThatContentsInnerGeohash);
    }

    return _.uniqBy(resultContours, 'tokenId');
  };
}
