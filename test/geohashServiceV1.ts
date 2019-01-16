import IExplorerDatabase from "../database/interface";
import IExplorerChainService from "../services/chainService/interace";
import IExplorerGeohashService from "../services/geohashService/interface";

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
            beforeEach(async () => {
                database = await require('../database/' + databaseService)({ name: databaseName, options: {logging: debugDatabase} });
                chainService = await require('../services/chainService/mock')();
                geohashService = await require('../services/geohashService/v1')(database);
            });

            afterEach(async () => {
                await database.flushDatabase();
            });

            it("handle getEventsFromBlock contours and return results correctly", async () => {
                const contoursEvents = await chainService.getEventsFromBlock('SpaceTokenContourChange');

                await pIteration.forEach(contoursEvents, geohashService.handleChangeContourEvent.bind(geohashService));

                const parentGeohash = 'w24q8r';
                const byParentGeohashResult = await geohashService.getContoursByParentGeohash(parentGeohash);

                assert.strictEqual(byParentGeohashResult.length, 4);

                byParentGeohashResult.forEach(resultContour => {
                    const parentGeohashExistsInContour = resultContour.contour.some((contourGeohash) => {
                        return _.startsWith(contourGeohash, parentGeohash)
                    });

                    assert.strictEqual(parentGeohashExistsInContour, true);
                });

                const innerGeohash = 'w24q8xwfk4u3';

                const byInnerGeohashResult = await geohashService.getContoursByInnerGeohash(innerGeohash);

                assert.strictEqual(byInnerGeohashResult.length, 3);

                byInnerGeohashResult.forEach(resultContour => {
                    const isInside = galtUtils.geohash.contour.isGeohashInsideContour(innerGeohash, resultContour.contour);

                    assert.strictEqual(isInside, true);
                });
            });
        });
    });
    
    
    
    after(() => {
        process.exit();
    })
});
