import IExplorerDatabase from "../database/interface";

const config = require('../config');
const galtUtils = require('@galtproject/utils');
const _ = require("lodash");

module.exports = async () => {
    const service: any = {};
    const database: IExplorerDatabase = await require('../database/' + config.database)();
    
    service.handleChangeContourEvent = async (event) => {
        const contour: string[] = event.returnValues.contour.map(galtUtils.numberToGeohash);
        let spaceTokenId: string = event.returnValues.id;

        let spaceTokenNumberId: number;
        if(_.startsWith(spaceTokenId, '0x')) {
            spaceTokenNumberId = parseInt(galtUtils.tokenIdHexToTokenId(spaceTokenId));
        } else {
            spaceTokenNumberId = parseInt(spaceTokenId);
        }

        await database.addOrUpdateContour(contour, spaceTokenNumberId);
    };
    
    service.getContoursByParentGeohash = database.getContoursByParentGeohash.bind(database);
    
    service.getContoursByInnerGeohash = async (innerGeohash: string): Promise<[{contour: string[], spaceTokenId: number}]> => {
        // TODO: get parents of innerGeohash and and detect - is it contains contours, if yes - detect contours, that includes innerGeohash
        return [{contour: [], spaceTokenId: 0}];
    };
    
    return service;
};
