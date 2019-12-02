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

  service.post('/v1/contours/by/inner-geohash', async (req, res) => {
    await respondByScheme(res, await geohashService.getContoursByInnerGeohash(req.body.geohash, req.body.contractAddress, req.body.level));
  });

  service.post('/v1/contours/by/parent-geohash', async (req, res) => {
    await respondByScheme(res, await geohashService.getContoursByParentGeohashArray(req.body.geohashes, req.body.contractAddress, req.body.level));
  });

  service.post('/v1/space-tokens/search', async (req, res) => {
    await respondByScheme(res, await geoDataService.filterSpaceTokens(req.body));
  });

  service.post('/v1/space-tokens/get-by-id/:contractAddress/:id', async (req, res) => {
    await respondByScheme(res, await geoDataService.getSpaceTokenById(req.params.id, req.params.contractAddress));
  });

  service.post('/v1/orders/search', async (req, res) => {
    await respondByScheme(res, await geoDataService.filterOrders(req.body));
  });

  service.post('/v1/orders/get/:contractAddress/:id', async (req, res) => {
    await respondByScheme(res, await geoDataService.getOrderById(req.params.id, req.params.contractAddress));
  });

  service.post('/v1/offers/search', async (req, res) => {
    await respondByScheme(res, await geoDataService.filterSaleOffers(req.body));
  });

  service.post('/v1/offers/get/:contractAddress/:orderId/:buyer', async (req, res) => {
    await respondByScheme(res, await geoDataService.getSaleOfferById(req.params.orderId, req.params.buyer, req.params.contractAddress));
  });

  service.post('/v1/applications/search', async (req, res) => {
    await respondByScheme(res, await geoDataService.filterApplications(req.body));
  });

  service.post('/v1/applications/get-by-id/:contract/:id', async (req, res) => {
    await respondByScheme(res, await geoDataService.getApplicationById(req.params.id, req.params.contract));
  });

  service.post('/v1/ppr/search', async (req, res) => {
    await respondByScheme(res, await geoDataService.filterPrivatePropertyRegistries(req.body));
  });

  service.post('/v1/ppr/get/:address', async (req, res) => {
    await respondByScheme(res, await geoDataService.getPrivatePropertyRegistry(req.params.address));
  });

  service.post('/v1/ppr-token-proposals/search', async (req, res) => {
    await respondByScheme(res, await geoDataService.filterPrivatePropertyTokeProposals(req.body));
  });

  service.post('/v1/communities/get/:address', async (req, res) => {
    await respondByScheme(res, await geoDataService.getCommunity(req.params.address));
  });

  service.post('/v1/communities/search', async (req, res) => {
    await respondByScheme(res, await geoDataService.filterCommunities(req.body));
  });

  service.post('/v1/communities/get/:address', async (req, res) => {
    await respondByScheme(res, await geoDataService.getCommunity(req.params.address));
  });

  service.post('/v1/community-tokens/search', async (req, res) => {
    await respondByScheme(res, await geoDataService.filterCommunityTokens(req.body));
  });

  service.post('/v1/community-votings/search', async (req, res) => {
    await respondByScheme(res, await geoDataService.filterCommunityVotings(req.body));
  });

  service.post('/v1/community-members/search', async (req, res) => {
    await respondByScheme(res, await geoDataService.filterCommunityMembers(req.body));
  });

  service.post('/v1/community-proposals/search', async (req, res) => {
    await respondByScheme(res, await geoDataService.filterCommunityProposals(req.body));
  });

  async function respondByScheme(res, data) {
    res.send({
      lastChangeBlockNumber: parseInt(await database.getValue('lastBlockNumber')),
      currentBlockNumber: await chainService.getCurrentBlock(),
      data
    }, 200);
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


