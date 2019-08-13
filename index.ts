import IExplorerDatabase from "./database/interface";
import IExplorerGeohashService from "./services/geohashService/interface";
import IExplorerChainService from "./services/chainService/interace";

const pIteration = require("p-iteration");
const config = require('./config');

(async () => {
  const databaseConfig: any = {};
  if (process.env.DATABASE_NAME) {
    databaseConfig.name = process.env.DATABASE_NAME;
  }

  const database: IExplorerDatabase = await require('./database/' + config.database)(databaseConfig);
  const geohashService: IExplorerGeohashService = await require('./services/geohashService/' + config.geohashService)(database);

  const chainService: IExplorerChainService = await require('./services/chainService/' + config.chainService)({
    env: process.env.CHAIN_ENV || config.chainEnv,
    lastBlockNumber: await database.getValue('lastBlockNumber')
  });

  chainService.onReconnect(fetchAndSubscribe);
  
  let prevBlockNumber = await database.getValue('lastBlockNumber');
  
  await fetchAndSubscribe(chainService.contractsConfig.blockNumber > prevBlockNumber);

  async function fetchAndSubscribe(needFlushing = false) {
    if (needFlushing) {
      await database.flushDatabase();
    }
    prevBlockNumber = (await database.getValue('lastBlockNumber')) || chainService.contractsConfig.blockNumber;

    const currentBlockNumber = await chainService.getCurrentBlock();

    await chainService.getEventsFromBlock('SetSpaceTokenContour', parseInt(prevBlockNumber)).then(async (events) => {
      console.log('prevBlockNumber', prevBlockNumber, 'events', events);
      await pIteration.forEach(events, geohashService.handleChangeContourEvent.bind(geohashService));

      // console.log('events finish');
      // const byParentGeohashResult = await geohashService.getContoursByParentGeohash('w24q8r');
      // console.log('byParentGeohashResult for w24q8r', byParentGeohashResult);
      //
      // const byInnerGeohashResult = await geohashService.getContoursByInnerGeohash('w24q8xwfk4u3');
      // console.log('byInnerGeohashResult after for w24q8xwfk4u3', byInnerGeohashResult);
    });

    await database.setValue('lastBlockNumber', currentBlockNumber.toString());

    chainService.subscribeForNewEvents('SetSpaceTokenContour', currentBlockNumber, async (err, newEvent) => {
      await geohashService.handleChangeContourEvent(newEvent);
      await database.setValue('lastBlockNumber', currentBlockNumber.toString());
      console.log('🛎 New event, blockNumber:', currentBlockNumber);
    });
  }

  const server = await require('./api/')(geohashService, chainService, database, process.env.API_PORT || config.apiPort);
})();
