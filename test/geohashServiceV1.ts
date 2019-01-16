import IExplorerDatabase from "../database/interface";
import IExplorerChainService from "../services/chainService/interace";
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
                database = await require('../database/' + databaseService)({ name: databaseName, options: {logging: debugDatabase} });
                chainService = await require('../services/chainService/mock')();
                geohashService = await require('../services/geohashService/v1')(database);
            });

            after(async () => {
                await database.flushDatabase();
            });

            const parentGeohash = 'w24q8r';
            const parentGeohashArr = ['w24q8r', 'w24q8xwe'];
            const innerGeohash = 'w24q8xwfk4u3';
            
            it("should handle getEventsFromBlock contours and return results correctly", async () => {
                
                const initialResultByParentGeohash = await geohashService.getContoursByParentGeohash(parentGeohash);
                assert.strictEqual(initialResultByParentGeohash.length, 0);
                
                const contoursEvents = await chainService.getEventsFromBlock('SpaceTokenContourChange');

                await pIteration.forEach(contoursEvents, geohashService.handleChangeContourEvent.bind(geohashService));

                const byParentGeohashResult = await geohashService.getContoursByParentGeohash(parentGeohash);

                assert.strictEqual(byParentGeohashResult.length, 4);

                byParentGeohashResult.forEach(resultContour => {
                    const parentGeohashExistsInContour = resultContour.contour.some((contourGeohash) => {
                        return _.startsWith(contourGeohash, parentGeohash)
                    });

                    assert.strictEqual(parentGeohashExistsInContour, true);
                });
                
                const byParentGeohashArrResult = await geohashService.getContoursByParentGeohashArray(parentGeohashArr);

                assert.strictEqual(byParentGeohashArrResult.length, 5);

                byParentGeohashArrResult.forEach(resultContour => {
                    const oneOfParentGeohashArrExistsInContour = resultContour.contour.some((contourGeohash) => {
                        return parentGeohashArr.some(parentGeohashItem => {
                            return _.startsWith(contourGeohash, parentGeohashItem);
                        })
                    });

                    assert.strictEqual(oneOfParentGeohashArrExistsInContour, true);
                });

                const byInnerGeohashResult = await geohashService.getContoursByInnerGeohash(innerGeohash);

                assert.strictEqual(byInnerGeohashResult.length, 3);

                byInnerGeohashResult.forEach(resultContour => {
                    const isInside = galtUtils.geohash.contour.isGeohashInsideContour(innerGeohash, resultContour.contour);

                    assert.strictEqual(isInside, true);
                });
            });
            
            it("should return correct result from json api", async () => {
                const server = await require('../api/')(geohashService);
                
                const parentResponse = await chai.request(server).get(`/v1/contours/by/parent-geohash/${parentGeohash}`);

                chai.expect(parentResponse).to.have.status(200);
                assert.strictEqual(parentResponse.body.length, 4);

                checkScheme(parentResponse.body);

                const parentArrResponse = await chai.request(server).get(`/v1/contours/by/parent-geohash/${parentGeohashArr.join(',')}`);

                chai.expect(parentArrResponse).to.have.status(200);
                assert.strictEqual(parentArrResponse.body.length, 5);

                checkScheme(parentArrResponse.body);
                
                const innerResponse = await chai.request(server).get(`/v1/contours/by/inner-geohash/${innerGeohash}`);

                chai.expect(innerResponse).to.have.status(200);
                assert.strictEqual(innerResponse.body.length, 3);

                checkScheme(innerResponse.body);
                
                function checkScheme(responseBody) {
                    responseBody.forEach((item) => {
                        assert.notStrictEqual(item.contour, undefined);
                        assert.notStrictEqual(item.contour.length, 0);
                        assert.notStrictEqual(item.spaceTokenId, undefined);
                    });
                }
            });
        });
    });
    
    after(() => {
        process.exit();
    })
});
