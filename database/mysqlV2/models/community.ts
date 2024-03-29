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

  const Community = sequelize.define('community', {
    // http://docs.sequelizejs.com/manual/tutorial/models-definition.html#data-types
    address: {
      type: Sequelize.STRING(100)
    },
    storageAddress: {
      type: Sequelize.STRING(100)
    },
    pmAddress: {
      type: Sequelize.STRING(100)
    },
    multiSigAddress: {
      type: Sequelize.STRING(100)
    },
    ruleRegistryAddress: {
      type: Sequelize.STRING(100)
    },
    name: {
      type: Sequelize.STRING(100)
    },
    dataLink: {
      type: Sequelize.STRING
    },
    dataJson: {
      type: Sequelize.TEXT
    },
    // multisigOwnersJson: {
    //   type: Sequelize.TEXT
    // },
    description: {
      type: Sequelize.TEXT
    },
    activeFundRulesCount: {
      type: Sequelize.INTEGER
    },
    spaceTokenOwnersCount: {
      type: Sequelize.INTEGER
    },
    reputationTotalSupply: {
      type: Sequelize.DOUBLE
    },
    tokensCount: {
      type: Sequelize.INTEGER
    },
    isPpr: {
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

  models.ApprovedSpaceTokensCommunities = sequelize.define('approvedSpaceTokensCommunities', {} as any, {} as any);

  Community.belongsToMany(models.SpaceTokenGeoData, {as: 'approvedSpaceTokens', through: models.ApprovedSpaceTokensCommunities});
  models.SpaceTokenGeoData.belongsToMany(Community, {as: 'approvedInCommunities', through: models.ApprovedSpaceTokensCommunities});

  await Community.sync({});

  await models.SpaceTokensCommunities.sync({});

  await models.ApprovedSpaceTokensCommunities.sync({});

  //
  // Community.belongsTo(models.SpaceTokenGeoData, {as: 'tokenGeoData', foreignKey: 'tokenGeoDataId'});
  // models.SpaceTokenGeoData.hasMany(Community, {as: 'orders', foreignKey: 'tokenGeoDataId'});

  // await Community.sync({});
  //
  // await models.SpaceTokensOrders.sync({});

  return Community;
};
