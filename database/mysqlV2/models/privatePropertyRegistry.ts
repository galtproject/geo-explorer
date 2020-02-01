/*
 * Copyright ©️ 2019 Galt•Project Society Construction and Terraforming Company
 * (Founded by [Nikolai Popeka](https://github.com/npopeka)
 *
 * Copyright ©️ 2019 Galt•Core Blockchain Company
 * (Founded by [Nikolai Popeka](https://github.com/npopeka) by
 * [Basic Agreement](ipfs/QmaCiXUmSrP16Gz8Jdzq6AJESY1EAANmmwha15uR3c1bsS)).
 */

module.exports = async function (sequelize, models) {
  const Sequelize = require('sequelize');

  const PrivatePropertyRegistry = sequelize.define('privatePropertyRegistry', {
    // http://docs.sequelizejs.com/manual/tutorial/models-definition.html#data-types
    address: {
      type: Sequelize.STRING(100)
    },
    name: {
      type: Sequelize.STRING(100)
    },
    symbol: {
      type: Sequelize.STRING(100)
    },
    owner: {
      type: Sequelize.STRING(100)
    },
    controllerOwner: {
      type: Sequelize.STRING(100)
    },
    minter: {
      type: Sequelize.STRING(100)
    },
    controller: {
      type: Sequelize.STRING(100)
    },
    geoDataManager: {
      type: Sequelize.STRING(100)
    },
    feeManager: {
      type: Sequelize.STRING(100)
    },
    burner: {
      type: Sequelize.STRING(100)
    },
    defaultBurnTimeout: {
      type: Sequelize.INTEGER
    },
    totalSupply: {
      type: Sequelize.INTEGER
    },
    dataLink: {
      type: Sequelize.STRING
    },
    dataJson: {
      type: Sequelize.TEXT
    },
    description: {
      type: Sequelize.TEXT
    },
    createdAtBlock: {
      type: Sequelize.INTEGER
    },
    updatedAtBlock: {
      type: Sequelize.INTEGER
    },
    chainCreatedAt: {
      type: Sequelize.DATE
    },
  }, {
    indexes: [
      // http://docs.sequelizejs.com/manual/tutorial/models-definition.html#indexes
      {fields: ['address'], unique: true},
      // {fields: ['owner']}
    ]
  });


  models.SpaceTokensPrivateRegistries = sequelize.define('spaceTokensPrivateRegistries', {} as any, {} as any);

  PrivatePropertyRegistry.belongsToMany(models.SpaceTokenGeoData, {as: 'spaceTokens', through: models.SpaceTokensPrivateRegistries});
  models.SpaceTokenGeoData.belongsToMany(PrivatePropertyRegistry, {as: 'privateRegistries', through: models.SpaceTokensPrivateRegistries});

  let result = await PrivatePropertyRegistry.sync({});

  await models.SpaceTokensPrivateRegistries.sync({});

  //
  // PrivatePropertyRegistry.belongsTo(models.SpaceTokenGeoData, {as: 'tokenGeoData', foreignKey: 'tokenGeoDataId'});
  // models.SpaceTokenGeoData.hasMany(PrivatePropertyRegistry, {as: 'orders', foreignKey: 'tokenGeoDataId'});

  // await PrivatePropertyRegistry.sync({});
  //
  // await models.SpaceTokensOrders.sync({});

  return result;
};
