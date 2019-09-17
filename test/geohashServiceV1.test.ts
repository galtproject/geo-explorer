/*
 * Copyright ©️ 2019 GaltProject Society Construction and Terraforming Company
 * (Founded by [Nikolai Popeka](https://github.com/npopeka)
 *
 * Copyright ©️ 2019 Galt•Core Blockchain Company
 * (Founded by [Nikolai Popeka](https://github.com/npopeka) by
 * [Basic Agreement](ipfs/QmaCiXUmSrP16Gz8Jdzq6AJESY1EAANmmwha15uR3c1bsS)).
 */

import IExplorerDatabase from "../database/interface";
import IExplorerChainService from "../services/chainService/interface";
import IExplorerGeohashService from "../services/geohashService/interface";

const chai: any = require('chai');
const chaiHttp = require('chai-http');
chai.use(chaiHttp);

const _ = require('lodash');
const pIteration = require('p-iteration');
const assert = require('assert');
const galtUtils = require('@galtproject/utils');

describe("geohashServiceV1", function () {
  const debugDatabase = false;
  const databaseName = 'test_geo_explorer';

  let database: IExplorerDatabase;
  let chainService: IExplorerChainService;
  let geohashService: IExplorerGeohashService;

  const databases = ['mysql', 'mysqlV2'];

  databases.forEach((databaseService) => {
    describe(databaseService + ' database', () => {
      before(async () => {
        try {
          database = await require('../database/' + databaseService)({
            name: databaseName,
            options: {logging: debugDatabase}
          });
          chainService = await require('../services/chainService/mock')();
          geohashService = await require('../services/geohashService/v1')(database);
        } catch (e) {
          console.error(e);
        }
      });

      after(async () => {
        await database.flushDatabase();
      });

      const parentGeohash = 'w24q8r';
      const parentGeohashArr = ['w24q8r', 'w24q8xwe'];
      const innerGeohash = 'w24q8xwfk4u3';

      it("should handle getEventsFromBlock contours and return results correctly", async () => {

        const initialResultByParentGeohash = await geohashService.getContoursByParentGeohash(parentGeohash);
        assert.strictEqual(initialResultByParentGeohash.length, 0, "initial data not empty");

        const contoursEvents = await chainService.getEventsFromBlock('SetSpaceTokenContour');

        await pIteration.forEach(contoursEvents, geohashService.handleChangeContourEvent.bind(geohashService));

        const byParentGeohashResult = await geohashService.getContoursByParentGeohash(parentGeohash);

        assert.strictEqual(byParentGeohashResult.length, 4, "incorrect number of contours by parent");

        byParentGeohashResult.forEach(resultContour => {
          const parentGeohashExistsInContour = resultContour.contour.some((contourGeohash) => {
            return _.startsWith(contourGeohash, parentGeohash)
          });

          assert.strictEqual(parentGeohashExistsInContour, true, "parent geohash not exists in contour");
        });

        const byParentGeohashArrResult = await geohashService.getContoursByParentGeohashArray(parentGeohashArr);

        assert.strictEqual(byParentGeohashArrResult.length, 5, "incorrect number of contours by parents array");

        byParentGeohashArrResult.forEach(resultContour => {
          const oneOfParentGeohashArrExistsInContour = resultContour.contour.some((contourGeohash) => {
            return parentGeohashArr.some(parentGeohashItem => {
              return _.startsWith(contourGeohash, parentGeohashItem);
            })
          });

          assert.strictEqual(oneOfParentGeohashArrExistsInContour, true, "no one of parents exists in contour");
        });

        const byInnerGeohashResult = await geohashService.getContoursByInnerGeohash(innerGeohash);

        assert.strictEqual(byInnerGeohashResult.length, 3, "incorrect number of contours by inner geohash");

        byInnerGeohashResult.forEach(resultContour => {
          const isInside = galtUtils.geohash.contour.isGeohashInsideContour(innerGeohash, resultContour.contour);

          assert.strictEqual(isInside, true, "inner geohash not inside in contour");
        });

        await geohashService.handleChangeContourEvent({
          returnValues: {
            contour: [],
            id: byInnerGeohashResult[0].spaceTokenId.toString()
          }
        });

        const byInnerGeohashNewResult = await geohashService.getContoursByInnerGeohash(innerGeohash);

        assert.strictEqual(byInnerGeohashNewResult.length, 2);

        byInnerGeohashResult.forEach(resultContour => {
          const isInside = galtUtils.geohash.contour.isGeohashInsideContour(innerGeohash, resultContour.contour);

          assert.strictEqual(isInside, true);
        });
      });

      it("should return correct result from json api", async () => {
        const server = await require('../api/')(geohashService, chainService, database);

        const parentResponse = await chai.request(server).get(`/v1/contours/by/parent-geohash/${parentGeohash}`);

        chai.expect(parentResponse).to.have.status(200);
        assert.strictEqual(parentResponse.body.data.length, 4);

        checkScheme(parentResponse.body.data);

        const parentArrResponse = await chai.request(server).get(`/v1/contours/by/parent-geohash/${parentGeohashArr.join(',')}`);

        chai.expect(parentArrResponse).to.have.status(200);
        assert.strictEqual(parentArrResponse.body.data.length, 5);

        checkScheme(parentArrResponse.body.data);

        const innerResponse = await chai.request(server).get(`/v1/contours/by/inner-geohash/${innerGeohash}`);

        chai.expect(innerResponse).to.have.status(200);
        assert.strictEqual(innerResponse.body.data.length, 2);

        checkScheme(innerResponse.body.data);

        function checkScheme(responseData) {
          responseData.forEach((item) => {
            assert.notStrictEqual(item.contour, undefined);
            assert.notStrictEqual(item.contour.length, 0);
            assert.notStrictEqual(item.spaceTokenId, undefined);
          });
        }
      });


      it("should correctly update contours", async () => {
        const sourceContour = ['w24q8r9pgd0p', 'w24q8r3newq1', 'w24q8r6pm9gc', 'w24q8rf0q48p'];

        const tokenId = 99;

        await database.addOrUpdateContour(sourceContour, tokenId);
        let dbContour = await database.getContourBySpaceTokenId(tokenId);
        assert.deepStrictEqual(dbContour, sourceContour);

        sourceContour[1] = 'w24q8xwfk4u3';

        await database.addOrUpdateContour(sourceContour, tokenId);
        dbContour = await database.getContourBySpaceTokenId(tokenId);
        assert.deepStrictEqual(dbContour, sourceContour);

        sourceContour.splice(1, 2, 'w24q8r9e2brc', 'w24q8r9s2brf', 'w24q8r9kqbk6');

        await database.addOrUpdateContour(sourceContour, tokenId);
        dbContour = await database.getContourBySpaceTokenId(tokenId);
        assert.deepStrictEqual(dbContour, sourceContour);
      });
    });
  });

  after(() => {
    process.exit();
  })
});
