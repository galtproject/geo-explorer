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

  let prevBlockNumber = parseInt(await database.getValue('lastBlockNumber'));

  await fetchAndSubscribe(chainService.contractsConfig.blockNumber > prevBlockNumber);

  async function fetchAndSubscribe(needFlushing = false) {
    if (needFlushing) {
      await database.flushDatabase();
    }
    prevBlockNumber = parseInt(await database.getValue('lastBlockNumber'));

    const currentBlockNumber = await chainService.getCurrentBlock();

    await chainService.getEventsFromBlock(chainService.spaceGeoData, ChainServiceEvents.SetSpaceTokenContour, prevBlockNumber).then(async (events) => {
      await pIteration.forEach(events, geohashService.handleChangeContourEvent.bind(geohashService));
    });

    await chainService.getEventsFromBlock(chainService.spaceGeoData, ChainServiceEvents.SetSpaceTokenDataLink, prevBlockNumber).then(async (events) => {
      await pIteration.forEach(events, (e) => {
        return geoDataService.handleChangeSpaceTokenDataEvent(chainService.spaceGeoData._address, e);
      });
    });

    await chainService.getEventsFromBlock(chainService.propertyMarket, ChainServiceEvents.SaleOrderStatusChanged, prevBlockNumber).then(async (events) => {
      await pIteration.forEach(events, (e) => {
        return geoDataService.handleSaleOrderEvent(chainService.propertyMarket._address, e)
      });
    });
    
    await chainService.getEventsFromBlock(chainService.newPropertyManager, ChainServiceEvents.NewPropertyApplication, prevBlockNumber).then(async (events) => {
      await pIteration.forEach(events, geoDataService.handleNewApplicationEvent.bind(geoDataService));
    });

    chainService.subscribeForNewEvents(chainService.spaceGeoData, ChainServiceEvents.SetSpaceTokenContour, currentBlockNumber, async (err, newEvent) => {
      console.log('🛎 New SetSpaceTokenContour event, blockNumber:', currentBlockNumber);
      await geohashService.handleChangeContourEvent(newEvent);
      await database.setValue('lastBlockNumber', currentBlockNumber.toString());
    });

    chainService.subscribeForNewEvents(chainService.spaceGeoData, ChainServiceEvents.SetSpaceTokenDataLink, currentBlockNumber, async (err, newEvent) => {
      console.log('🛎 New SetSpaceTokenDataLink event, blockNumber:', currentBlockNumber);
      await geoDataService.handleChangeSpaceTokenDataEvent(chainService.spaceGeoData._address, newEvent);
      await database.setValue('lastBlockNumber', currentBlockNumber.toString());
    });

    chainService.subscribeForNewEvents(chainService.spaceToken, ChainServiceEvents.SpaceTokenTransfer, currentBlockNumber, async (err, newEvent) => {
      console.log('🛎 New SpaceTokenTransfer event, blockNumber:', currentBlockNumber);
      await geoDataService.handleChangeSpaceTokenDataEvent(chainService.spaceGeoData._address, newEvent);
      await database.setValue('lastBlockNumber', currentBlockNumber.toString());
    });

    chainService.subscribeForNewEvents(chainService.propertyMarket, ChainServiceEvents.SaleOrderStatusChanged, currentBlockNumber, async (err, newEvent) => {
      console.log('🛎 New SaleOrderStatusChanged event, blockNumber:', currentBlockNumber);
      await geoDataService.handleSaleOrderEvent(chainService.propertyMarket._address, newEvent);
      await database.setValue('lastBlockNumber', currentBlockNumber.toString());
    });

    chainService.subscribeForNewEvents(chainService.newPropertyManager, ChainServiceEvents.NewPropertyApplication, currentBlockNumber, async (err, newEvent) => {
      console.log('🛎 New NewPropertyApplication event, blockNumber:', currentBlockNumber);
      await geoDataService.handleNewApplicationEvent(newEvent);
      await database.setValue('lastBlockNumber', currentBlockNumber.toString());
    });

    chainService.subscribeForNewEvents(chainService.newPropertyManager, ChainServiceEvents.NewPropertyValidationStatusChanged, currentBlockNumber, async (err, newEvent) => {
      console.log('🛎 New NewPropertyApplication event, blockNumber:', currentBlockNumber);
      await geoDataService.handleNewApplicationEvent(newEvent);
      await database.setValue('lastBlockNumber', currentBlockNumber.toString());
    });
    
    chainService.subscribeForNewEvents(chainService.newPropertyManager, ChainServiceEvents.NewPropertyApplicationStatusChanged, currentBlockNumber, async (err, newEvent) => {
      console.log('🛎 New NewPropertyApplication event, blockNumber:', currentBlockNumber);
      await geoDataService.handleNewApplicationEvent(newEvent);
      await database.setValue('lastBlockNumber', currentBlockNumber.toString());
    });

    const subscribedToPrivatePropertyRegistry = {
      // registryAddress => bool
    };
    
    await chainService.getEventsFromBlock(chainService.privatePropertyGlobalRegistry, ChainServiceEvents.NewPrivatePropertyRegistry, prevBlockNumber).then(async (events) => {
      await pIteration.forEach(events, (e) => {
        subscribeToPrivatePropertyRegistry(e.returnValues.token);
        return geoDataService.handleNewPrivatePropertyRegistryEvent(e);
      });
    });
    
    chainService.subscribeForNewEvents(chainService.privatePropertyGlobalRegistry, ChainServiceEvents.NewPrivatePropertyRegistry, currentBlockNumber, async (err, newEvent) => {
      console.log('🛎 New Add PrivatePropertyRegistry event, blockNumber:', currentBlockNumber);
      subscribeToPrivatePropertyRegistry(newEvent.returnValues.token);
      await geoDataService.handleNewPrivatePropertyRegistryEvent(newEvent);
      await database.setValue('lastBlockNumber', currentBlockNumber.toString());
    });
    
    async function subscribeToPrivatePropertyRegistry (address) {
      if(subscribedToPrivatePropertyRegistry[address]) {
        return;
      }
      console.log('📢 Subscribed to Private Property Registry:', address);
      
      subscribedToPrivatePropertyRegistry[address] = true;
      const contract = chainService.getPrivatePropertyContract(address);
      
      await chainService.getEventsFromBlock(contract, ChainServiceEvents.SetPrivatePropertyDetails, prevBlockNumber).then(async (events) => {
        await pIteration.forEach(events, (e) => {
          return geoDataService.handleChangeSpaceTokenDataEvent(address, e);
        });
      });

      chainService.subscribeForNewEvents(contract, ChainServiceEvents.SetPrivatePropertyDetails, currentBlockNumber, async (err, newEvent) => {
        console.log('🛎 New Add PrivatePropertyRegistry event, blockNumber:', currentBlockNumber);
        await geoDataService.handleChangeSpaceTokenDataEvent(address, newEvent);
        await database.setValue('lastBlockNumber', currentBlockNumber.toString());
      });
    }
    
    // const spaceTokens = await geoDataService.filterSpaceTokens({
    //   owner: "0xf0430bbb78C3c359c22d4913484081A563B86170"
    // });
    // console.log('spaceTokens.list.length', spaceTokens.list.length);
    //
    // const orders = await geoDataService.filterOrders({
      // landAreaMin: 3000,
      // surroundingsGeohashBox: ['dpzpufr']
      // surroundingsGeohashBox: ["9q534","9q535","9q53h","9q53j","9q53n","9q53p","9q590","9q591","9q594","9q595","9q59h","9q59j","9q536","9q537","9q53k","9q53m","9q53q","9q53r","9q592","9q593","9q596","9q597","9q59k","9q59m","9q53d","9q53e","9q53s","9q53t","9q53w","9q53x","9q598","9q599","9q59d","9q59e","9q59s","9q59t","9q53f","9q53g","9q53u","9q53v","9q53y","9q53z","9q59b","9q59c","9q59f","9q59g","9q59u","9q59v","9q564","9q565","9q56h","9q56j","9q56n","9q56p","9q5d0","9q5d1","9q5d4","9q5d5","9q5dh","9q5dj","9q566","9q567","9q56k","9q56m","9q56q","9q56r","9q5d2","9q5d3","9q5d6","9q5d7","9q5dk","9q5dm"],
      // // limit: 2
      // types: ['land'],
      // sortBy: 'createdAt',
      // sortDir: 'desc',

      // subtypes: ['beachLot'],
      // bedroomsCountMin: 3,
      // features: ['greatViews']//, 'securitySystem', 'dishwasher', 'greatViews', 'securitySystem'
    // });
    // console.log('found orders', orders.list.map(order => order.spaceTokens[0].tokenType));


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
