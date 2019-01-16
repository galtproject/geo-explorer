import IExplorerDatabase from "../interface";

const _ = require("lodash");
const pIteration = require("p-iteration");
const Sequelize = require("sequelize");
const Op = Sequelize.Op;

const config = require('./config');
const sequelize = new Sequelize(config.name, config.user, config.password, config.options);

module.exports = async function() {
    const models = await require('./models/index')(sequelize);
    
    return new MysqlExplorerDatabase(models);
};

class MysqlExplorerDatabase implements IExplorerDatabase {
    models: any;
    
    constructor(_models) {
        this.models = _models;
    }
    
    async addOrUpdateContour(contourGeohashes: string[], spaceTokenId: number) {
        // find contour object with included geohashes
        
        let dbContourGeohashes = await this.models.GeohashSpaceToken.findAll({
            where: { spaceTokenId }, attributes: ['contourGeohash']
        }).catch(e => console.error('26', e));

        // remove excluded geohashes and mark exists
        await pIteration.forEach(dbContourGeohashes, async (geohashObj) => {
            const contourGeohash = geohashObj.contourGeohash;
            
            if(!_.includes(contourGeohashes, contourGeohash)) {
                await this.models.GeohashSpaceToken.destroy({ where: { spaceTokenId, contourGeohash } });
            }
        });

        await pIteration.forEach(contourGeohashes, async (contourGeohash, position) => {
            // bind geohash to contour
            await this.models.GeohashSpaceToken.create({ spaceTokenId, contourGeohash, position }).catch(e => {
                // it exists so update it
                this.models.GeohashSpaceToken.update({ position }, { where: { spaceTokenId, contourGeohash }});
            });
        });
        
        // bind geohashes of contour to parent geohashes
        await pIteration.forEach(contourGeohashes, async (contourGeohash) => {
            let parentGeohash = contourGeohash;

            while (parentGeohash.length > 1) {
                parentGeohash = parentGeohash.slice(0, -1);
                await this.models.GeohashParent.create({ parentGeohash, contourGeohash }).catch(e => {});
            }
        })
    }
    
    async getContoursByParentGeohash(parentGeohash: string): Promise<[{contour: string[], spaceTokenId: number}]> {
        let contourGeohashesObjs = await this.models.GeohashParent.findAll({ where: { parentGeohash } });

        const geohashesOfContours = contourGeohashesObjs.map(obj => obj.contourGeohash);
        
        let foundContourGeohashes = await this.models.GeohashSpaceToken.findAll({
            where: { contourGeohash: { [Op.in]: geohashesOfContours }}
        });

        foundContourGeohashes = _.uniqBy(foundContourGeohashes, 'spaceTokenId');
        
        return await pIteration.map(foundContourGeohashes, async (geohashObj) => {
            const spaceTokenId = geohashObj.spaceTokenId;
            
            const spaceTokenGeohashes = await this.models.GeohashSpaceToken.findAll({
                where: { spaceTokenId }, order: [ ['position', 'ASC'] ]
            });
            
            let contour = spaceTokenGeohashes.map(geohashObj => geohashObj.contourGeohash);

            return { contour, spaceTokenId };
        });
    }


    async getContoursByInnerGeohash(innerGeohash: string): Promise<[{contour: string[], spaceTokenId: number}]> {
        // TODO: get parents of innerGeohash and and detect - is it contains contours, if yes - detect contours, that includes innerGeohash
        return [{contour: [], spaceTokenId: 0}];
    }
}
