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
    let spaceTokenId: string = event.returnValues.spaceTokenId || event.returnValues['id'];

    let spaceTokenNumberId: number;
    if (_.startsWith(spaceTokenId, '0x')) {
      spaceTokenNumberId = parseInt(galtUtils.tokenIdHexToTokenId(spaceTokenId));
    } else {
      spaceTokenNumberId = parseInt(spaceTokenId);
    }

    await this.database.addOrUpdateContour(contour, spaceTokenNumberId);
  };

  async getContoursByParentGeohash(parentGeohash: string) {
    return this.database.getContoursByParentGeohash(parentGeohash);
  }

  async getContoursByParentGeohashArray(parentGeohashArray: string[]) {
    let resultContours = [];
    await pIteration.forEach(parentGeohashArray, async (parentGeohash) => {
      const contoursByParent = await this.getContoursByParentGeohash(parentGeohash);
      // console.log('contoursByParent', parentGeohash, contoursByParent);
      resultContours = resultContours.concat(contoursByParent);
    });
    return _.uniqBy(resultContours, 'spaceTokenId');
  }

  async getContoursByInnerGeohash(innerGeohash: string): Promise<[IExplorerResultContour]> {
    let resultContours = [];

    const cachedIsGeohashInsideResultContour = {};

    let parentGeohash = innerGeohash;
    while (parentGeohash.length > config.maxParentGeohashToFindInner) {
      parentGeohash = parentGeohash.slice(0, -1);
      const contoursOfParentGeohash = await this.getContoursByParentGeohash(parentGeohash);

      const contoursThatContentsInnerGeohash = _.filter(contoursOfParentGeohash, (resultContour) => {
        const spaceTokenId = resultContour.spaceTokenId;
        const contour = resultContour.contour;

        if (cachedIsGeohashInsideResultContour[spaceTokenId] === undefined) {
          cachedIsGeohashInsideResultContour[spaceTokenId] = galtUtils.geohash.contour.isGeohashInsideContour(innerGeohash, contour);
        }
        return cachedIsGeohashInsideResultContour[spaceTokenId];
      });

      resultContours = resultContours.concat(contoursThatContentsInnerGeohash);
    }

    return _.uniqBy(resultContours, 'spaceTokenId');
  };
}
