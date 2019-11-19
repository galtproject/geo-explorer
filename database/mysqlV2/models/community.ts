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

  const Community = sequelize.define('community', {
    // http://docs.sequelizejs.com/manual/tutorial/models-definition.html#data-types
    address: {
      type: Sequelize.STRING(100)
    },
    raAddress: {
      type: Sequelize.STRING(100)
    },
    pmAddress: {
      type: Sequelize.STRING(100)
    },
    name: {
      type: Sequelize.STRING(100)
    },
    description: {
      type: Sequelize.STRING
    },
    activeFundRulesCount: {
      type: Sequelize.INTEGER
    },
    tokensCount: {
      type: Sequelize.INTEGER
    },
    isDecentralized: {
      type: Sequelize.BOOLEAN
    },
    isPrivate: {
      type: Sequelize.BOOLEAN
    },
    createdAtBlock: {
      type: Sequelize.INTEGER
    },
    updatedAtBlock: {
      type: Sequelize.INTEGER
    },
  }, {
    indexes: [
      // http://docs.sequelizejs.com/manual/tutorial/models-definition.html#indexes
      {fields: ['address'], unique: true},
      // {fields: ['owner']}
    ]
  });


  models.SpaceTokensCommunities = sequelize.define('spaceTokensCommunities', {} as any, {} as any);

  Community.belongsToMany(models.SpaceTokenGeoData, {as: 'spaceTokens', through: models.SpaceTokensCommunities});
  models.SpaceTokenGeoData.belongsToMany(Community, {as: 'communities', through: models.SpaceTokensCommunities});

  await Community.sync({});

  await models.SpaceTokensCommunities.sync({});

  //
  // Community.belongsTo(models.SpaceTokenGeoData, {as: 'tokenGeoData', foreignKey: 'tokenGeoDataId'});
  // models.SpaceTokenGeoData.hasMany(Community, {as: 'orders', foreignKey: 'tokenGeoDataId'});

  // await Community.sync({});
  //
  // await models.SpaceTokensOrders.sync({});

  return Community;
};
