module.exports = async function (sequelize) {
  const models: any = {};

  models.GeohashSpaceToken = await require('./geohashSpaceToken')(sequelize, models);
  models.SpaceTokenGeoData = await require('./spaceTokenGeoData')(sequelize, models);
  models.SaleOrder = await require('./saleOrder')(sequelize, models);
  models.Value = await require('./value')(sequelize, models);

  return models;
};
