import IExplorerDatabase, {ISpaceTokenGeoData, ISaleOrder} from "../interface";

const _ = require("lodash");
const pIteration = require("p-iteration");
const Sequelize = require("sequelize");
const Op = Sequelize.Op;

const config = require('./config');

module.exports = async function (extendConfig?: any) {
  const extendedConfig = _.merge({}, config, extendConfig || {});
  // console.log('extendedConfig.options', extendedConfig.options);

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
    await this.models.GeohashSpaceToken.destroy({where: {}});
    await this.models.SpaceTokensOrders.destroy({where: {}});
    await this.models.SpaceTokenGeoData.destroy({where: {}});
    await this.models.SaleOrder.destroy({where: {}});
    await this.models.Value.destroy({where: {}});
  }

  async addOrUpdateContour(contourGeohashes: string[], spaceTokenId: number) {
    // find contour object with included geohashes

    let dbContourGeohashes = await this.models.GeohashSpaceToken.findAll({
      where: {spaceTokenId}, attributes: ['contourGeohash']
    });

    // remove excluded geohashes and mark exists
    await pIteration.forEach(dbContourGeohashes, async (geohashObj) => {
      const contourGeohash = geohashObj.contourGeohash;

      if (!_.includes(contourGeohashes, contourGeohash)) {
        await this.models.GeohashSpaceToken.destroy({where: {spaceTokenId, contourGeohash}});
      }
    });

    await pIteration.forEach(contourGeohashes, async (contourGeohash, position) => {
      // bind geohash to contour
      await this.models.GeohashSpaceToken.create({spaceTokenId, contourGeohash, position}).catch(e => {
        // it exists so update it
        return this.models.GeohashSpaceToken.update({position}, {where: {spaceTokenId, contourGeohash}});
      });
    });
  }

  async getContourBySpaceTokenId(spaceTokenId) {
    return this.models.GeohashSpaceToken.findAll({
      where: {spaceTokenId}, order: [['position', 'ASC']]
    }).then(spaceTokenGeohashes => {
      return spaceTokenGeohashes.map(geohashObj => geohashObj.contourGeohash);
    })
  }

  async getContoursByParentGeohash(parentGeohash: string): Promise<[{ contour: string[], spaceTokenId: number }]> {
    let foundContourGeohashes = await this.models.GeohashSpaceToken.findAll({
      where: {contourGeohash: {[Op.like]: parentGeohash + '%'}}
    });

    foundContourGeohashes = _.uniqBy(foundContourGeohashes, 'spaceTokenId');

    return await pIteration.map(foundContourGeohashes, async (geohashObj) => {
      const spaceTokenId = geohashObj.spaceTokenId;

      let contour = await this.getContourBySpaceTokenId(spaceTokenId);

      return {contour, spaceTokenId};
    });
  }
  
  async getSpaceTokenGeoData(spaceTokenId) {
    return this.models.SpaceTokenGeoData.findOne({
      where: { spaceTokenId }
    });
  }

  async addOrUpdateGeoData(geoData: ISpaceTokenGeoData) {
    let dbObject = await this.getSpaceTokenGeoData(geoData.spaceTokenId);

    if(dbObject) {
      await this.models.SpaceTokenGeoData.update(geoData, {
        where: {spaceTokenId: geoData.spaceTokenId}
      });
    } else {
      return this.models.SpaceTokenGeoData.create(geoData);
    }
    return this.getSpaceTokenGeoData(geoData.spaceTokenId);
  }

  async getSaleOrder(orderId) {
    return this.models.SaleOrder.findOne({
      where: { orderId }
    });
  }
  
  async addOrUpdateSaleOrder(saleOrder: ISaleOrder) {
    let dbObject = await this.getSaleOrder(saleOrder.orderId);

    if(dbObject) {
      await this.models.SaleOrder.update(saleOrder, {
        where: {orderId: saleOrder.orderId}
      });
    } else {
      return this.models.SaleOrder.create(saleOrder);
    }
    return this.getSaleOrder(saleOrder.orderId);
  }

  async getValue(key: string) {
    const valueObj = await this.models.Value.findOne({where: {key}});
    return valueObj ? valueObj.content : null;
  }

  async setValue(key: string, content: string) {
    const valueObj = await this.models.Value.findOne({where: {key}});
    if (valueObj) {
      return valueObj.update({content}, {where: {key}})
    } else {
      return this.models.Value.create({key, content});
    }
  }

  async clearValue(key: string) {
    return this.models.Value.destroy({where: {key}});
  }
}
