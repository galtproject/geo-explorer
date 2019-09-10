module.exports = async function (sequelize, models) {
  const Sequelize = require('sequelize');

  const SaleOrder = sequelize.define('saleOrder', {
    // http://docs.sequelizejs.com/manual/tutorial/models-definition.html#data-types
    orderId: {
      type: Sequelize.STRING(100)
    },
    currency: {
      type: Sequelize.STRING(100)
    },
    currencyAddress: {
      type: Sequelize.STRING(100)
    },
    price: {
      type: Sequelize.FLOAT
    },
    description: {
      type: Sequelize.TEXT
    }
  }, {
    indexes: [
      // http://docs.sequelizejs.com/manual/tutorial/models-definition.html#indexes
      // {fields: ['spaceTokenId']},
      // {fields: ['owner']}
    ]
  });
  
  models.SpaceTokensOrders = sequelize.define('spaceTokensOrders', {} as any, {} as any);

  SaleOrder.belongsToMany(models.SpaceTokenGeoData, {as: 'spaceTokens', through: models.SpaceTokensOrders});
  models.SpaceTokenGeoData.belongsToMany(SaleOrder, {as: 'orders', through: models.SpaceTokensOrders});
  //
  // SaleOrder.belongsTo(models.SpaceTokenGeoData, {as: 'tokenGeoData', foreignKey: 'tokenGeoDataId'});
  // models.SpaceTokenGeoData.hasMany(SaleOrder, {as: 'orders', foreignKey: 'tokenGeoDataId'});

  await SaleOrder.sync({});

  await models.SpaceTokensOrders.sync({});
  
  return SaleOrder;
};
