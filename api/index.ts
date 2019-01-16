import IExplorerGeohashService from "../services/geohashService/interface";

const pIteration = require('p-iteration');
const _ = require('lodash');
const service = require('restana')({
    ignoreTrailingSlash: true
});

const bodyParser = require('body-parser');
service.use(bodyParser.json());

module.exports = (geohashService: IExplorerGeohashService, port) => {
    service.get('/v1/contours/by/inner-geohash/:geohash', async (req, res) => {
        const innerGeohash = req.params.geohash;

        res.send(await geohashService.getContoursByInnerGeohash(innerGeohash));
    });
    
    service.get('/v1/contours/by/parent-geohash/:geohashes', async (req, res) => {
        const geohashes = req.params.geohashes.split(',');

        res.send(await geohashService.getContoursByParentGeohashArray(geohashes));
    });
    
    return service.start(port);
};


