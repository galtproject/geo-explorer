/*
 * Copyright ©️ 2019 GaltProject Society Construction and Terraforming Company
 * (Founded by [Nikolai Popeka](https://github.com/npopeka)
 *
 * Copyright ©️ 2019 Galt•Core Blockchain Company
 * (Founded by [Nikolai Popeka](https://github.com/npopeka) by
 * [Basic Agreement](ipfs/QmaCiXUmSrP16Gz8Jdzq6AJESY1EAANmmwha15uR3c1bsS)).
 */

import IExplorerDatabase from "./database/interface";
import IExplorerGeohashService from "./services/geohashService/interface";
import IExplorerChainService, {ChainServiceEvents} from "./services/chainService/interface";
import IExplorerGeoDataService from "./services/geoDataService/interface";

const pIteration = require("p-iteration");
const config = require('./config');

(async () => {
  const databaseConfig: any = {};
  if (process.env.DATABASE_NAME) {
    databaseConfig.name = process.env.DATABASE_NAME;
  }

  const database: IExplorerDatabase = await require('./database/' + config.database)(databaseConfig);

  const chainService: IExplorerChainService = await require('./services/chainService/' + config.chainService)({
    wsServer: process.env.RPC_WS_SERVER || config.wsServer,
    configFile: process.env.CONTRACTS_CONFIG || config.configFile,
    lastBlockNumber: await database.getValue('lastBlockNumber')
  });

  const geohashService: IExplorerGeohashService = await require('./services/geohashService/' + config.geohashService)(database);
  const geoDataService: IExplorerGeoDataService = await require('./services/geoDataService/' + config.geoDataService)(database, geohashService, chainService);

  chainService.onReconnect(fetchAndSubscribe);

  let prevBlockNumber = await database.getValue('lastBlockNumber');

  await fetchAndSubscribe(chainService.contractsConfig.blockNumber > prevBlockNumber);

  async function fetchAndSubscribe(needFlushing = false) {
    if (needFlushing) {
      await database.flushDatabase();
    }
    prevBlockNumber = (await database.getValue('lastBlockNumber'));

    const currentBlockNumber = await chainService.getCurrentBlock();

    await chainService.getEventsFromBlock('SetSpaceTokenContour', parseInt(prevBlockNumber)).then(async (events) => {
      await pIteration.forEach(events, geohashService.handleChangeContourEvent.bind(geohashService));

      // console.log('events finish');
      // const byParentGeohashResult = await geohashService.getContoursByParentGeohash('w24q8r');
      // console.log('byParentGeohashResult for w24q8r', byParentGeohashResult);
      //
      // const byInnerGeohashResult = await geohashService.getContoursByInnerGeohash('w24q8xwfk4u3');
      // console.log('byInnerGeohashResult after for w24q8xwfk4u3', byInnerGeohashResult);
    });

    chainService.subscribeForNewEvents(ChainServiceEvents.SetSpaceTokenContour, currentBlockNumber, async (err, newEvent) => {
      console.log('🛎 New SetSpaceTokenContour event, blockNumber:', currentBlockNumber);
      await geohashService.handleChangeContourEvent(newEvent);
      await database.setValue('lastBlockNumber', currentBlockNumber.toString());
    });

    chainService.subscribeForNewEvents(ChainServiceEvents.SetSpaceTokenDataLink, currentBlockNumber, async (err, newEvent) => {
      console.log('🛎 New SetSpaceTokenDataLink event, blockNumber:', currentBlockNumber);
      await geoDataService.handleChangeSpaceTokenDataEvent(newEvent);
      await database.setValue('lastBlockNumber', currentBlockNumber.toString());
    });

    chainService.subscribeForNewEvents(ChainServiceEvents.SpaceTokenTransfer, currentBlockNumber, async (err, newEvent) => {
      console.log('🛎 New SpaceTokenTransfer event, blockNumber:', currentBlockNumber);
      await geoDataService.handleChangeSpaceTokenDataEvent(newEvent);
      await database.setValue('lastBlockNumber', currentBlockNumber.toString());
    });

    await chainService.getEventsFromBlock(ChainServiceEvents.SetSpaceTokenDataLink, parseInt(prevBlockNumber)).then(async (events) => {
      await pIteration.forEach(events, geoDataService.handleChangeSpaceTokenDataEvent.bind(geoDataService));
    });

    chainService.subscribeForNewEvents(ChainServiceEvents.SaleOrderStatusChanged, currentBlockNumber, async (err, newEvent) => {
      console.log('🛎 New SaleOrderStatusChanged event, blockNumber:', currentBlockNumber);
      await geoDataService.handleSaleOrderEvent(newEvent);
      await database.setValue('lastBlockNumber', currentBlockNumber.toString());
    });
    
    await chainService.getEventsFromBlock(ChainServiceEvents.SaleOrderStatusChanged, parseInt(prevBlockNumber)).then(async (events) => {
      await pIteration.forEach(events, geoDataService.handleSaleOrderEvent.bind(geoDataService));
    });

    chainService.subscribeForNewEvents(ChainServiceEvents.NewPropertyApplication, currentBlockNumber, async (err, newEvent) => {
      console.log('🛎 New NewPropertyApplication event, blockNumber:', currentBlockNumber);
      await geoDataService.handleNewApplicationEvent(newEvent);
      await database.setValue('lastBlockNumber', currentBlockNumber.toString());
    });

    chainService.subscribeForNewEvents(ChainServiceEvents.NewPropertyValidationStatusChanged, currentBlockNumber, async (err, newEvent) => {
      console.log('🛎 New NewPropertyApplication event, blockNumber:', currentBlockNumber);
      await geoDataService.handleNewApplicationEvent(newEvent);
      await database.setValue('lastBlockNumber', currentBlockNumber.toString());
    });
    chainService.subscribeForNewEvents(ChainServiceEvents.NewPropertyApplicationStatusChanged, currentBlockNumber, async (err, newEvent) => {
      console.log('🛎 New NewPropertyApplication event, blockNumber:', currentBlockNumber);
      await geoDataService.handleNewApplicationEvent(newEvent);
      await database.setValue('lastBlockNumber', currentBlockNumber.toString());
    });


    await chainService.getEventsFromBlock(ChainServiceEvents.NewPropertyApplication, parseInt(prevBlockNumber)).then(async (events) => {
      await pIteration.forEach(events, geoDataService.handleNewApplicationEvent.bind(geoDataService));
    });
    
    // const orders = await geoDataService.filterOrders({
    //   // landAreaMin: 3000,
    //   // surroundingsGeohashBox: ['dpzpufr']
    //   // surroundingsGeohashBox: ['9q598'],
    //   // limit: 2
    //   types: ['land'],
    //    
    //   subtypes: ['beachLot'],
    //   bedroomsCountMin: 3,
    //   features: ['greatViews']//, 'securitySystem', 'dishwasher', 'greatViews', 'securitySystem'
    // });
    // console.log('found orders', orders.list.length, orders.total);


    // const applications = await geoDataService.filterApplications({
      //   // landAreaMin: 3000,
      //   // surroundingsGeohashBox: ['dpzpufr']
      //   // surroundingsGeohashBox: ['9q598'],
      //   // limit: 2
      //   types: ['land'],
      //    
      //   availableRoles: ['PM_LAWYER_ORACLE_TYPE', 'PM_SURVEYOR_ORACLE_TYPE'],
      //   bedroomsCountMin: 3,
      // features: ['greatViews']//, 'securitySystem', 'dishwasher', 'greatViews', 'securitySystem'
      // applicantAddress: '0xf0430bbb78C3c359c22d4913484081A563B86170'
    // });
    // console.log('found orders', applications.list.length, applications.total);

    await database.setValue('lastBlockNumber', currentBlockNumber.toString());

    //todo: handle DeleteSpaceTokenGeoData
  }

  const server = await require('./api/')(geohashService, chainService, database, geoDataService, process.env.API_PORT || config.apiPort);
})();
