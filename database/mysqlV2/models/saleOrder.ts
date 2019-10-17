/*
 * Copyright ©️ 2019 GaltProject Society Construction and Terraforming Company
 * (Founded by [Nikolai Popeka](https://github.com/npopeka)
 *
 * Copyright ©️ 2019 Galt•Core Blockchain Company
 * (Founded by [Nikolai Popeka](https://github.com/npopeka) by
 * [Basic Agreement](ipfs/QmaCiXUmSrP16Gz8Jdzq6AJESY1EAANmmwha15uR3c1bsS)).
 */

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
    currencyName: {
      type: Sequelize.STRING(100)
    },
    ask: {
      type: Sequelize.FLOAT
    },
    lastBuyer: {
      type: Sequelize.STRING(100)
    },
    seller: {
      type: Sequelize.STRING(100)
    },
    description: {
      type: Sequelize.TEXT
    },
    dataJson: {
      type: Sequelize.TEXT
    },
    createdAtBlock: {
      type: Sequelize.INTEGER
    },
    updatedAtBlock: {
      type: Sequelize.INTEGER
    },
    
    // SPACE TOKENS FIELDS
    featureArray: {
      type: Sequelize.TEXT
    },
    typesSubtypesArray: {
      type: Sequelize.TEXT
    },
    minLandArea: {
      type: Sequelize.FLOAT
    },
    maxLandArea: {
      type: Sequelize.FLOAT
    },
    sumLandArea: {
      type: Sequelize.FLOAT
    },
    minBuildingArea: {
      type: Sequelize.FLOAT
    },
    maxBuildingArea: {
      type: Sequelize.FLOAT
    },
    sumBuildingArea: {
      type: Sequelize.FLOAT
    },
    minYearBuilt: {
      type: Sequelize.INTEGER
    },
    maxYearBuilt: {
      type: Sequelize.INTEGER
    },
    sumBathroomsCount: {
      type: Sequelize.INTEGER
    },
    sumBedroomsCount: {
      type: Sequelize.INTEGER
    },
    maxBathroomsCount: {
      type: Sequelize.INTEGER
    },
    maxBedroomsCount: {
      type: Sequelize.INTEGER
    },
    minBathroomsCount: {
      type: Sequelize.INTEGER
    },
    minBedroomsCount: {
      type: Sequelize.INTEGER
    },
  }, {
    indexes: [
      // http://docs.sequelizejs.com/manual/tutorial/models-definition.html#indexes
      // {fields: ['spaceTokenId']},
      // {fields: ['owner']}
    ]
  });
  
  models.SpaceTokensOrders = sequelize.define('spaceTokensOrders', {
    position: {type: Sequelize.INTEGER},
  } as any, {} as any);

  SaleOrder.belongsToMany(models.SpaceTokenGeoData, {as: 'spaceTokens', through: models.SpaceTokensOrders});
  models.SpaceTokenGeoData.belongsToMany(SaleOrder, {as: 'orders', through: models.SpaceTokensOrders});
  //
  // SaleOrder.belongsTo(models.SpaceTokenGeoData, {as: 'tokenGeoData', foreignKey: 'tokenGeoDataId'});
  // models.SpaceTokenGeoData.hasMany(SaleOrder, {as: 'orders', foreignKey: 'tokenGeoDataId'});

  await SaleOrder.sync({});

  await models.SpaceTokensOrders.sync({});
  
  return SaleOrder;
};
