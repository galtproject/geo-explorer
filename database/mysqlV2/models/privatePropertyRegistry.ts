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
    contourVerification: {
      type: Sequelize.STRING(100)
    },
    contourVerificationOwner: {
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

    isBridgetForeign: {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    },
    isBridgetHome: {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    },
    homeMediator: {
      type: Sequelize.STRING(100)
    },
    homeMediatorNetwork: {
      type: Sequelize.STRING(100)
    },
    foreignMediator: {
      type: Sequelize.STRING(100)
    },
    foreignMediatorNetwork: {
      type: Sequelize.STRING(100)
    },
  }, {
    indexes: [
      // http://docs.sequelizejs.com/manual/tutorial/models-definition.html#indexes
      {fields: ['address'], unique: true},
      // {fields: ['owner']}
    ]
  });

  // PrivatePropertyRegistry.belongsTo(models.SpaceTokenGeoData, {as: 'tokenGeoData', foreignKey: 'tokenGeoDataId'});
  // models.SpaceTokenGeoData.hasMany(PrivatePropertyRegistry, {as: 'orders', foreignKey: 'tokenGeoDataId'});

  // await PrivatePropertyRegistry.sync({});
  //
  // await models.SpaceTokensOrders.sync({});

  return PrivatePropertyRegistry.sync({});
};
