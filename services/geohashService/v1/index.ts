import IExplorerDatabase from "../../../database/interface";
import IExplorerGeohashService from "../interface";
import {IExplorerChainContourEvent} from "../../interfaces";

const galtUtils = require('@galtproject/utils');
const _ = require("lodash");

module.exports = async (database: IExplorerDatabase) => {
    return new ExplorerGeohashV1Service(database);
};

class ExplorerGeohashV1Service implements IExplorerGeohashService {
    database: IExplorerDatabase;

    constructor(_database) {
        this.database = _database;
    }
    
    async handleChangeContourEvent (event: IExplorerChainContourEvent) {
        const contour: string[] = event.returnValues.contour.map(galtUtils.numberToGeohash);
        let spaceTokenId: string = event.returnValues.id;

        let spaceTokenNumberId: number;
        if(_.startsWith(spaceTokenId, '0x')) {
            spaceTokenNumberId = parseInt(galtUtils.tokenIdHexToTokenId(spaceTokenId));
        } else {
            spaceTokenNumberId = parseInt(spaceTokenId);
        }

        await this.database.addOrUpdateContour(contour, spaceTokenNumberId);
    };

    async getContoursByParentGeohash (parentGeohash: string) {
        return this.database.getContoursByParentGeohash(parentGeohash);
    }

    async getContoursByInnerGeohash (innerGeohash: string): Promise<[{contour: string[], spaceTokenId: number}]> {
        // TODO: get parents of innerGeohash and and detect - is it contains contours, if yes - detect contours, that includes innerGeohash
        return [{contour: [], spaceTokenId: 0}];
    };
}
