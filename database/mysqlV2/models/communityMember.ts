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

  const CommunityMember = sequelize.define('communityMember', {
    // http://docs.sequelizejs.com/manual/tutorial/models-definition.html#data-types
    address: {
      type: Sequelize.STRING(100)
    },
    communityAddress: {
      type: Sequelize.STRING(100)
    },
    currentReputation: {
      type: Sequelize.FLOAT
    },
    basicReputation: {
      type: Sequelize.FLOAT
    },
    tokensCount: {
      type: Sequelize.INTEGER
    },
    fullNameHash: {
      type: Sequelize.STRING(100)
    },
    isPpr: {
      type: Sequelize.BOOLEAN
    },
    photosJson: {
      type: Sequelize.TEXT
    },
  }, {
    indexes: [
      // http://docs.sequelizejs.com/manual/tutorial/models-definition.html#indexes
      {fields: ['address', 'communityId'], unique: true},
      // {fields: ['owner']}
    ]
  });

  CommunityMember.belongsTo(models.Community, {as: 'community', foreignKey: 'communityId'});
  models.Community.hasMany(CommunityMember, {as: 'members', foreignKey: 'communityId'});

  return CommunityMember.sync({});
};
