const pIteration = require("p-iteration");
const config = require('./config');

(async() => {
    const geohashService = await require('./services/geohashService')();
    const chainService = await require('./services/chainService/' + config.chainService)();
    
    chainService.getEventsFromBlock('SpaceTokenContourChange').then(async (events) => {
        await pIteration.forEach(events, geohashService.handleChangeContourEvent);

        console.log('events finish');
        const byParentGeohashResult = await geohashService.getContoursByParentGeohash('w24q8r');
        console.log('result for w24q8r', byParentGeohashResult);

        const byInnerGeohashResult = await geohashService.getContoursByInnerGeohash('w24q8xw9yh39');
    })
})();
