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

  const CommunityRule = sequelize.define('communityRule', {
    // http://docs.sequelizejs.com/manual/tutorial/models-definition.html#data-types
    communityAddress: {
      type: Sequelize.STRING(100)
    },
    creatorAddress: {
      type: Sequelize.STRING(100)
    },
    pmAddress: {
      type: Sequelize.STRING(100)
    },
    proposalId: {
      type: Sequelize.STRING(100)
    },
    ruleId: {
      type: Sequelize.STRING(100)
    },
    ipfsHash: {
      type: Sequelize.STRING(100)
    },
    manager: {
      type: Sequelize.STRING(100)
    },
    isActive: {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    },
    dataLink: {
      type: Sequelize.STRING
    },
    dataJson: {
      type: Sequelize.TEXT
    },
    description: {
      type: Sequelize.TEXT
    }
  }, {
    indexes: [
      // http://docs.sequelizejs.com/manual/tutorial/models-definition.html#indexes
      {fields: ['communityAddress', 'ruleId'], unique: true},
      // {fields: ['owner']}
    ]
  });

  CommunityRule.belongsTo(models.Community, {as: 'community', foreignKey: 'communityId'});
  models.Community.hasMany(CommunityRule, {as: 'rules', foreignKey: 'communityId'});

  return CommunityRule.sync({});
};
