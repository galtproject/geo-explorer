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

const config = require("./config");
const galtUtils = require('@galtproject/utils');
const _ = require("lodash");
const pIteration = require("p-iteration");

module.exports = async (database: IExplorerDatabase) => {
  return new ExplorerGeohashV1Service(database);
};

class ExplorerGeohashV1Service implements IExplorerGeohashService {
  database: IExplorerDatabase;

  constructor(_database) {
    this.database = _database;
  }

  async handleChangeContourEvent(event: IExplorerChainContourEvent) {
    const contour: string[] = event.returnValues.contour.map((geohash5z) => {
      const { geohash5 } = galtUtils.geohash5zToGeohash5(geohash5z);
      return galtUtils.numberToGeohash(geohash5);
    });
    let tokenId: string = event.returnValues.tokenId || event.returnValues['spaceTokenId'] || event.returnValues['privatePropertyId'] || event.returnValues['id'];

    let spaceTokenNumberId: number;
    if (_.startsWith(tokenId, '0x')) {
      spaceTokenNumberId = parseInt(galtUtils.tokenIdHexToTokenId(tokenId));
    } else {
      spaceTokenNumberId = parseInt(tokenId);
    }

    await this.database.addOrUpdateContour(contour, spaceTokenNumberId, event.contractAddress);
  };

  async getContoursByParentGeohash(parentGeohash: string, contractAddress: string) {
    return this.database.getContoursByParentGeohash(parentGeohash, contractAddress);
  }

  async getContoursByParentGeohashArray(parentGeohashArray: string[], contractAddress: string) {
    let resultContours = [];
    await pIteration.forEach(parentGeohashArray, async (parentGeohash) => {
      const contoursByParent = await this.getContoursByParentGeohash(parentGeohash, contractAddress);
      // console.log('contoursByParent', parentGeohash, contoursByParent);
      resultContours = resultContours.concat(contoursByParent);
    });
    return _.uniqBy(resultContours, 'tokenId');
  }

  async getContoursByInnerGeohash(innerGeohash: string, contractAddress: string): Promise<[IExplorerResultContour]> {
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
