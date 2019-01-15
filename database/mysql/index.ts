import IExplorerDatabase from "../interface";

const _ = require("lodash");
const pIteration = require("p-iteration");
const Sequelize = require("sequelize");

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
    
    async addOrUpdateContour(contourGeohashes: string[], spaceTokenId: string) {
        
        // find contour object with included geohashes
        let dbContour = await this.models.Contour.findOne({
            attributes: ['spaceTokenId'],
            where: { spaceTokenId: spaceTokenId },
            include: [{
                model: this.models.Geohash,
                as: 'geohashes',
                through: {
                    attributes: ['symbols'],
                    // where: {completed: true}
                }
            }]
        });
        
        let existGeohashes = [];
        
        if(dbContour) {
            // remove excluded geohashes and mark exists
            await pIteration.forEach(dbContour.geohashes, async (geohashObj) => {
                if(!_.includes(contourGeohashes, geohashObj.symbols)) {
                    console.log('destroy not included geohashes');
                    await this.models.GeohashContour.destroy({
                        where: { contourId: dbContour.id, geohashId: geohashObj.id }
                    });
                } else {
                    existGeohashes.push(geohashObj.symbols);
                }
            });
            
            dbContour.update({
                geohashesJson: JSON.stringify(contourGeohashes)
            });
        } else {
            // create new contour
            dbContour = await this.models.Contour.create({
                spaceTokenId: spaceTokenId,
                geohashesJson: JSON.stringify(contourGeohashes)
            });
        }


        await pIteration.forEach(contourGeohashes, async (geohash) => {
            // do not create and bind exists geohashes to contour
            if(_.includes(existGeohashes, geohash)) {
                return;
            }
            // create and bind geohash to contour
            
            let geohashObj = await this.models.Geohash.findOne({
                where: { symbols: geohash }
            });
            if(!geohashObj) {
                geohashObj = await this.models.Geohash.create({ symbols: geohash });
            }

            await this.models.GeohashContour.create({ contourId: dbContour.id, geohashId: geohashObj.id });
        });

        // get updated version of contour with actual included geohashes
        dbContour = await this.models.Contour.findOne({
            where: { spaceTokenId: spaceTokenId },
            include: [{
                model: this.models.Geohash,
                as: 'geohashes',
                through: {
                    attributes: ['symbols'],
                    // where: {completed: true}
                }
            }]
        });

        // bind geohashes of contour to parent geohashes
        await pIteration.forEach(dbContour.geohashes, async (geohashObj) => {
            let geohashParent = geohashObj.symbols;
            
            while (geohashParent.length > 1) {
                geohashParent = geohashParent.slice(0, -1);

                let parentObj = await this.models.Geohash.findOne({
                    where: { symbols: geohashParent }
                });
                
                let existPivot;
                if(parentObj) {
                    existPivot = await this.models.GeohashPivot.findOne({
                        where: { parentId: parentObj.id, childrenId: geohashObj.id }
                    });
                } else {
                    parentObj = await this.models.Geohash.create({
                        symbols: geohashParent
                    });
                }
                
                if(!existPivot) {
                    await this.models.GeohashPivot.create({ parentId: parentObj.id, childrenId: geohashObj.id });
                }
            } 
        })
    }
    
    async getContoursByGeohash(geohash: string): Promise<[{contour: string[], spaceTokenId: string}]> {
        let parentObj = await this.models.Geohash.findOne({
            where: { symbols: geohash },
            include: [{
                model: this.models.Geohash,
                as: 'children',
                foreignKey: 'parentId',
                through: {
                    attributes: ['symbols'],
                    // where: {completed: true}
                }
            }]
        });
        
        let contoursObjects: any = [];
        
        await pIteration.forEach(parentObj.children, async (geohashObj) => {
            const contoursObjects = await geohashObj.getContours();
            
            await pIteration.forEach(contoursObjects, async (contourObj) => {
                contoursObjects.push({
                    spaceTokenId: contourObj.spaceTokenId,
                    contour: JSON.parse(contourObj.geohashesJson)
                })
            });
        });

        return _.uniqBy(contoursObjects, 'spaceTokenId')
    }
}
