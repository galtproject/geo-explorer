import IExplorerGeohashService from "../services/geohashService/interface";
import IExplorerDatabase from "../database/interface";
import IExplorerChainService from "../services/chainService/interace";

const service = require('restana')({
    ignoreTrailingSlash: true
});

const bodyParser = require('body-parser');
service.use(bodyParser.json());

module.exports = (geohashService: IExplorerGeohashService, chainService: IExplorerChainService, database: IExplorerDatabase, port) => {
    
    service.get('/v1/contours/by/inner-geohash/:geohash', async (req, res) => {
        const innerGeohash = req.params.geohash;

        await respondByScheme(res, await geohashService.getContoursByInnerGeohash(innerGeohash));
    });
    
    service.get('/v1/contours/by/parent-geohash/:geohashes', async (req, res) => {
        const geohashes = req.params.geohashes.split(',');

        await respondByScheme(res, await geohashService.getContoursByParentGeohashArray(geohashes));
    });
    
    async function respondByScheme (res, data) {
        res.send({
            lastChangeBlockNumber: parseInt(await database.getValue('lastBlockNumber')),
            currentBlockNumber: await chainService.getCurrentBlock(),
            data
        }, 200, {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "X-Requested-With"
        });
    }
    
    console.log('🚀 Start application on port', port);
    
    return service.start(port);
};


