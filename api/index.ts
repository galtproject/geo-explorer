/*
 * Copyright ©️ 2019 GaltProject Society Construction and Terraforming Company
 * (Founded by [Nikolai Popeka](https://github.com/npopeka)
 *
 * Copyright ©️ 2019 Galt•Core Blockchain Company
 * (Founded by [Nikolai Popeka](https://github.com/npopeka) by
 * [Basic Agreement](ipfs/QmaCiXUmSrP16Gz8Jdzq6AJESY1EAANmmwha15uR3c1bsS)).
 */

import IExplorerGeohashService from "../services/geohashService/interface";
import IExplorerDatabase from "../database/interface";
import IExplorerChainService from "../services/chainService/interface";
import IExplorerGeoDataService from "../services/geoDataService/interface";

const _ = require('lodash');

const service = require('restana')({
  ignoreTrailingSlash: true,
  maxParamLength: 2000
});

const bodyParser = require('body-parser');
service.use(bodyParser.json());

module.exports = (geohashService: IExplorerGeohashService, chainService: IExplorerChainService, database: IExplorerDatabase, geoDataService: IExplorerGeoDataService, port) => {
  
  service.use(async (req, res, next) => {
    setHeaders(res);
    
    req.query = {};
    if (_.includes(req.url, '?')) {
      const searchParams: any = new URLSearchParams(req.url.split('?')[1]);
      const keys = searchParams.keys();
      for (let key = keys.next(); key.done !== true; key = keys.next()) {
        req.query[key.value] = searchParams.get(key.value);
      }
    }
    next();
  });

  service.options("/*", function (req, res, next) {
    setHeaders(res);
    res.send(200);
  });
  service.head("/*", function (req, res, next) {
    setHeaders(res);
    res.send(200);
  });
  
  service.get('/v1/contours/by/inner-geohash/:geohash', async (req, res) => {
    const innerGeohash = req.params.geohash;

    await respondByScheme(res, await geohashService.getContoursByInnerGeohash(innerGeohash));
  });

  service.get('/v1/contours/by/parent-geohash/:geohashes', async (req, res) => {
    const geohashes = req.params.geohashes.split(',');

    await respondByScheme(res, await geohashService.getContoursByParentGeohashArray(geohashes));
  });

  service.post('/v1/orders/search', async (req, res) => {
    await respondByScheme(res, await geoDataService.filterOrders(req.body));
  });

  service.post('/v1/orders/get-by-id/:id', async (req, res) => {
    await respondByScheme(res, await geoDataService.getOrderById(req.params.id));
  });

  async function respondByScheme(res, data) {
    res.send({
      lastChangeBlockNumber: parseInt(await database.getValue('lastBlockNumber')),
      currentBlockNumber: await chainService.getCurrentBlock(),
      data
    }, 200, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "X-Requested-With"
    });
  }
  
  function setHeaders(res) {
    res.setHeader('Strict-Transport-Security', 'max-age=0');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', "GET, POST, PATCH, PUT, DELETE, OPTIONS, HEAD");
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
  }

  console.log('🚀 Start application on port', port);

  return service.start(port);
};


