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

  const CommunityMeeting = sequelize.define('communityMeeting', {
    // http://docs.sequelizejs.com/manual/tutorial/models-definition.html#data-types
    communityAddress: {
      type: Sequelize.STRING(100)
    },
    creatorAddress: {
      type: Sequelize.STRING(100)
    },
    meetingId: {
      type: Sequelize.STRING(100)
    },
    isActive: {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    },
    dataLink: {
      type: Sequelize.STRING
    },
    rulesCount: {
      type: Sequelize.INTEGER
    },
    proposalsCount: {
      type: Sequelize.INTEGER
    },
    localProposalsToCreateCount: {
      type: Sequelize.INTEGER
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
      {fields: ['communityAddress', 'meetingId'], unique: true},
      // {fields: ['owner']}
    ]
  });

  CommunityMeeting.belongsTo(models.Community, {as: 'community', foreignKey: 'communityId'});
  models.Community.hasMany(CommunityMeeting, {as: 'meetings', foreignKey: 'communityId'});

  return CommunityMeeting.sync({});
};
