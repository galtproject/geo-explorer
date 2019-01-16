const pIteration = require("p-iteration");
const config = require('./config');

(async() => {
    const database = await require('./database/' + config.database)();
    const geohashService = await require('./services/geohashService/' + config.geohashService)(database);
    const chainService = await require('./services/chainService/' + config.chainService)();

    const prevBlockNumber = await database.getValue('lastBlockNumber');
    
    const currentBlockNumber = await chainService.getCurrentBlock();
    await database.setValue('lastBlockNumber', currentBlockNumber);
    
    await chainService.getEventsFromBlock('SpaceTokenContourChange', prevBlockNumber).then(async (events) => {
        await pIteration.forEach(events, geohashService.handleChangeContourEvent.bind(geohashService));

        console.log('events finish');
        const byParentGeohashResult = await geohashService.getContoursByParentGeohash('w24q8r');
        console.log('byParentGeohashResult for w24q8r', byParentGeohashResult);

        const byInnerGeohashResult = await geohashService.getContoursByInnerGeohash('w24q8xwfk4u3');
        console.log('byInnerGeohashResult for w24q8xwfk4u3', byInnerGeohashResult);
    });

    chainService.subscribeForNewEvents('SpaceTokenContourChange', currentBlockNumber, async (err, newEvent) => {
        await geohashService.handleChangeContourEvent(newEvent);
    });
    
    const server = await require('./api/')(geohashService, config.port);
})();
