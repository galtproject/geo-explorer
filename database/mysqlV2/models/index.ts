/*
 * Copyright ©️ 2019 GaltProject Society Construction and Terraforming Company
 * (Founded by [Nikolai Popeka](https://github.com/npopeka)
 *
 * Copyright ©️ 2019 Galt•Core Blockchain Company
 * (Founded by [Nikolai Popeka](https://github.com/npopeka) by
 * [Basic Agreement](ipfs/QmaCiXUmSrP16Gz8Jdzq6AJESY1EAANmmwha15uR3c1bsS)).
 */

module.exports = async function (sequelize) {
  const models: any = {};

  models.GeohashSpaceToken = await require('./geohashSpaceToken')(sequelize, models);
  models.SpaceTokenGeoData = await require('./spaceTokenGeoData')(sequelize, models);
  models.SaleOrder = await require('./saleOrder')(sequelize, models);
  models.Application = await require('./application')(sequelize, models);
  models.Value = await require('./value')(sequelize, models);

  return models;
};
