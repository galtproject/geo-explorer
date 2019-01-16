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
        let dbContour = await this.models.Contour.findOne({
            where: { spaceTokenId }, attributes: ['spaceTokenId']
        }).catch(e => console.error('26', e));
        
        let dbContourGeohashes = await this.models.GeohashSpaceToken.findAll({
            where: { spaceTokenId }, attributes: ['contourGeohash']
        }).catch(e => console.error('26', e));

        let existGeohashes = [];
        
        const geohashesJson = JSON.stringify(contourGeohashes);

        if(dbContour && dbContour.id) {
            // remove excluded geohashes and mark exists
            await pIteration.forEach(dbContourGeohashes, async (geohashObj) => {
                const contourGeohash = geohashObj.contourGeohash;
                
                if(!_.includes(contourGeohashes, contourGeohash)) {
                    await this.models.GeohashSpaceToken.destroy({ where: { spaceTokenId, contourGeohash } });
                } else {
                    existGeohashes.push(contourGeohash);
                }
            });

            dbContour.update({ geohashesJson });
        } else {
            // create new contour
            this.models.Contour.create({ spaceTokenId, geohashesJson });
        }

        await pIteration.forEach(contourGeohashes, async (contourGeohash) => {
            // do not create and bind exists geohashes to contour
            if(_.includes(existGeohashes, contourGeohash)) {
                return;
            }
            // bind geohash to contour
            await this.models.GeohashSpaceToken.create({ spaceTokenId, contourGeohash }).catch(e => {});
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
    
    async getContoursByGeohash(parentGeohash: string): Promise<[{contour: string[], spaceTokenId: number}]> {
        let contourGeohashesObjs = await this.models.GeohashParent.findAll({ where: { parentGeohash } });

        const contourGeohash = contourGeohashesObjs.map(obj => obj.contourGeohash);
        
        let spaceTokenGeohashes = await this.models.GeohashSpaceToken.findAll({
            where: { contourGeohash: { [Op.in]: contourGeohash }}
        });

        spaceTokenGeohashes = _.uniqBy(spaceTokenGeohashes, 'spaceTokenId');
        
        return await pIteration.map(spaceTokenGeohashes, async (geohashObj) => {
            const contourObj = await this.models.Contour.findOne({
                where: { spaceTokenId: geohashObj.spaceTokenId }
            });

            return { spaceTokenId: contourObj.spaceTokenId, contour: JSON.parse(contourObj.geohashesJson) };
        });
    }
}
