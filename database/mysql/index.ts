import IExplorerDatabase from "../interface";

const _ = require("lodash");
const pIteration = require("p-iteration");
const Sequelize = require("sequelize");
const Op = Sequelize.Op;

const config = require('./config');

module.exports = async function(extendConfig?: any) {
    const extendedConfig = _.merge({}, config, extendConfig || {});
    
    let sequelize = new Sequelize(extendedConfig.name, extendedConfig.user, extendedConfig.password, extendedConfig.options);
    
    let models;
    try {
        models = await require('./models/index')(sequelize);
    } catch (e) {
        return console.error('Error', e);
    }
    
    return new MysqlExplorerDatabase(sequelize, models, extendedConfig);
};

class MysqlExplorerDatabase implements IExplorerDatabase {
    sequelize: any;
    models: any;
    config: any;
    
    constructor(_sequelize, _models, _config) {
        this.sequelize = _sequelize;
        this.models = _models;
        this.config = _config;
    }

    async flushDatabase() {
        await this.models.GeohashSpaceToken.destroy({ where: { } });
        await this.models.GeohashParent.destroy({ where: { } });
        await this.models.Value.destroy({ where: { } });
        // await this.models.SpaceToken.destroy({ where: { } });
    }
    
    async addOrUpdateContour(contourGeohashes: string[], spaceTokenId: number) {
        // find contour object with included geohashes
        
        let dbContourGeohashes = await this.models.GeohashSpaceToken.findAll({
            where: { spaceTokenId }, attributes: ['contourGeohash']
        });

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
    
    async getValue(key: string) {
        const valueObj = await this.models.Value.findOne({ where: { key } });
        return valueObj ? valueObj.content : null;
    }

    async setValue(key: string, content: string) {
        const valueObj = await this.models.Value.findOne({ where: { key } });
        if(valueObj) {
            return valueObj.update({ content }, {where: { key } })
        } else {
            return this.models.Value.create({ key, content });
        }
    }

    async clearValue(key: string) {
        return this.models.Value.destroy({ where: { key } });
    }
}
