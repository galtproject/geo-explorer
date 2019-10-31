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

  const geohashService: IExplorerGeohashService = await require('./services/geohashService/' + config.geohashService)(database, chainService);
  const geoDataService: IExplorerGeoDataService = await require('./services/geoDataService/' + config.geoDataService)(database, geohashService, chainService);

  chainService.onReconnect(fetchAndSubscribe);

  let prevBlockNumber = parseInt(await database.getValue('lastBlockNumber')) || 0;

  await fetchAndSubscribe(chainService.contractsConfig.blockNumber > prevBlockNumber);
  
  setInterval(() => {
    chainService.getCurrentBlock();
  }, 30 * 1000);

  async function fetchAndSubscribe(needFlushing = false) {
    if (needFlushing) {
      await database.flushDatabase();
    }
    prevBlockNumber = parseInt(await database.getValue('lastBlockNumber')) || 0;

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
        return geoDataService.handleSaleOrderEvent(e)
      });
    });
    
    await chainService.getEventsFromBlock(chainService.propertyMarket, ChainServiceEvents.SaleOfferStatusChanged, prevBlockNumber).then(async (events) => {
      await pIteration.forEach(events, (e) => {
        return geoDataService.handleSaleOfferEvent(e)
      });
    });
    
    await chainService.getEventsFromBlock(chainService.newPropertyManager, ChainServiceEvents.NewPropertyApplication, prevBlockNumber).then(async (events) => {
      await pIteration.forEach(events, geoDataService.handleNewApplicationEvent.bind(geoDataService));
    });

    chainService.subscribeForNewEvents(chainService.spaceGeoData, ChainServiceEvents.SetSpaceTokenContour, currentBlockNumber, async (err, newEvent) => {
      console.log('🛎 New SetSpaceTokenContour event, blockNumber:', currentBlockNumber);
      await geohashService.handleChangeContourEvent(newEvent);
      await geoDataService.handleChangeSpaceTokenDataEvent(chainService.spaceGeoData._address, newEvent);
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
      await geoDataService.handleSaleOrderEvent(newEvent);
      await database.setValue('lastBlockNumber', currentBlockNumber.toString());
    });

    ['SaleOfferAskChanged', 'SaleOfferBidChanged', 'SaleOfferStatusChanged'].map((eventName) => {
      chainService.subscribeForNewEvents(chainService.propertyMarket, ChainServiceEvents[eventName], currentBlockNumber, async (err, newEvent) => {
        console.log('🛎 New ' + eventName + ' event, blockNumber:', currentBlockNumber);
        await geoDataService.handleSaleOfferEvent(newEvent);
        await database.setValue('lastBlockNumber', currentBlockNumber.toString());
      });
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
    
    await chainService.getEventsFromBlock(chainService.privatePropertyGlobalRegistry, ChainServiceEvents.NewPrivatePropertyRegistry, 0).then(async (events) => {
      await pIteration.forEach(events, async (e) => {
        await subscribeToPrivatePropertyRegistry(e.returnValues.token);
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
      const contract = chainService.getPropertyRegistryContract(address);

      await chainService.getEventsFromBlock(contract, ChainServiceEvents.SetSpaceTokenContour, prevBlockNumber).then(async (events) => {
        await pIteration.forEach(events, geohashService.handleChangeContourEvent.bind(geohashService));
      });

      await chainService.getEventsFromBlock(contract, ChainServiceEvents.SetPrivatePropertyDetails, prevBlockNumber).then(async (events) => {
        await pIteration.forEach(events, (e) => {
          return geoDataService.handleChangeSpaceTokenDataEvent(address, e);
        });
      });

      chainService.subscribeForNewEvents(contract, ChainServiceEvents.SetSpaceTokenContour, currentBlockNumber, async (err, newEvent) => {
        console.log('🛎 New SetSpaceTokenContour event, blockNumber:', currentBlockNumber);
        await geohashService.handleChangeContourEvent(newEvent);
        await geoDataService.handleChangeSpaceTokenDataEvent(address, newEvent);
        await database.setValue('lastBlockNumber', currentBlockNumber.toString());
      });

      chainService.subscribeForNewEvents(contract, ChainServiceEvents.SetPrivatePropertyDetails, currentBlockNumber, async (err, newEvent) => {
        console.log('🛎 New SetPrivatePropertyDetails event, blockNumber:', currentBlockNumber);
        await geoDataService.handleChangeSpaceTokenDataEvent(address, newEvent);
        await database.setValue('lastBlockNumber', currentBlockNumber.toString());
      });
    }

    await chainService.getEventsFromBlock(chainService.privatePropertyMarket, ChainServiceEvents.SaleOrderStatusChanged, prevBlockNumber).then(async (events) => {
      await pIteration.forEach(events, (e) => {
        return geoDataService.handleSaleOrderEvent(e)
      });
    });

    await chainService.getEventsFromBlock(chainService.privatePropertyMarket, ChainServiceEvents.SaleOfferStatusChanged, prevBlockNumber).then(async (events) => {
      await pIteration.forEach(events, (e) => {
        return geoDataService.handleSaleOfferEvent(e)
      });
    });
    
    await chainService.subscribeForNewEvents(chainService.privatePropertyMarket, ChainServiceEvents.SaleOrderStatusChanged, currentBlockNumber, async (err, newEvent) => {
      return geoDataService.handleSaleOrderEvent(newEvent)
    });

    ['SaleOfferAskChanged', 'SaleOfferBidChanged', 'SaleOfferStatusChanged'].map((eventName) => {
      chainService.subscribeForNewEvents(chainService.privatePropertyMarket, ChainServiceEvents[eventName], currentBlockNumber, async (err, newEvent) => {
        console.log('🛎 New ' + eventName + ' event, blockNumber:', currentBlockNumber, 'contractAddress:', newEvent.contractAddress);
        await geoDataService.handleSaleOfferEvent(newEvent);
        await database.setValue('lastBlockNumber', currentBlockNumber.toString());
      });
    });

    // console.log('events finish');
    // const byParentGeohashResult = await geohashService.getContoursByParentGeohash('w24q8r', chainService.spaceGeoData._address);
    // console.log('byParentGeohashResult for w24q8r', byParentGeohashResult);
    //
    // const byInnerGeohashResult = await geohashService.getContoursByInnerGeohash('w24q8xwfk4u3', chainService.spaceGeoData._address);
    // console.log('byInnerGeohashResult after for w24q8xwfk4u3', byInnerGeohashResult);
    
    // const spaceTokens = await geoDataService.filterSpaceTokens({
    //   owner: "0xf0430bbb78C3c359c22d4913484081A563B86170",
    //   contractAddress: '0x7ef8678453B361394a4a8cD544D2E5eDAe674702'
    // });
    // console.log('spaceTokens.list.length', spaceTokens.list.length);
    //
    // const orders = await geoDataService.filterOrders({
    //   landAreaMin: 3000,
      // contractAddress: "0x24c03a7A07257231A6E3c941bCec54C039112af4",
      // surroundingsGeohashBox: ['dpzpufr']
      // surroundingsGeohashBox: ["9q534","9q535","9q53h","9q53j","9q53n","9q53p","9q590","9q591","9q594","9q595","9q59h","9q59j","9q536","9q537","9q53k","9q53m","9q53q","9q53r","9q592","9q593","9q596","9q597","9q59k","9q59m","9q53d","9q53e","9q53s","9q53t","9q53w","9q53x","9q598","9q599","9q59d","9q59e","9q59s","9q59t","9q53f","9q53g","9q53u","9q53v","9q53y","9q53z","9q59b","9q59c","9q59f","9q59g","9q59u","9q59v","9q564","9q565","9q56h","9q56j","9q56n","9q56p","9q5d0","9q5d1","9q5d4","9q5d5","9q5dh","9q5dj","9q566","9q567","9q56k","9q56m","9q56q","9q56r","9q5d2","9q5d3","9q5d6","9q5d7","9q5dk","9q5dm"],
      // limit: 2
      // types: ['land'],
      // sortBy: 'createdAt',
      // sortDir: 'desc',
      //
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

    // const offers = await geoDataService.filterSaleOffers({
    //   // seller: "0xf0430bbb78C3c359c22d4913484081A563B86170",
    //   contractAddress: "0xeECba3489A459c265047552f2AE71D3BdBD295dF",
    //   // excludeOrderIds: [],
    //   // includeOrderIds: ["1"],
    //   includeOrders: true,
    //   sortBy: "createdAtBlock",
    //   // landAreaMin: 100
    //
    //   // excludeOrderIds: ['2'],
    //   // includeOrders: true
    //   // limit: 100
    // });
    // console.log('found offers', offers.list.map(o => [o.orderId, o.order.typesSubtypesArray, o.order.sumLandArea]));

    // const orders = await geoDataService.filterOrders({
    //   contractAddress: "0xeECba3489A459c265047552f2AE71D3BdBD295dF",
    //   buyer: "0xf0430bbb78C3c359c22d4913484081A563B86170",
    //   includeOrderIds: ["1"]
    // });
    // console.log('found orders', orders.list.map(order => order.spaceTokens[0].tokenType));

    await database.setValue('lastBlockNumber', currentBlockNumber.toString());

    //todo: handle DeleteSpaceTokenGeoData
  }

  const server = await require('./api/')(geohashService, chainService, database, geoDataService, process.env.API_PORT || config.apiPort);
})();
