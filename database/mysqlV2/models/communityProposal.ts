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

  const CommunityVotingProposal = sequelize.define('communityVotingProposal', {
    // http://docs.sequelizejs.com/manual/tutorial/models-definition.html#data-types
    marker: {
      type: Sequelize.STRING(100)
    },
    proposalId: {
      type: Sequelize.STRING(100)
    },
    status: {
      type: Sequelize.STRING(100)
    },
    description: {
      type: Sequelize.TEXT
    },
    acceptedShare: {
      type: Sequelize.FLOAT
    },
    declinedShare: {
      type: Sequelize.FLOAT
    },
    acceptedCount: {
      type: Sequelize.INTEGER
    },
    declinedCount: {
      type: Sequelize.INTEGER
    },
  }, {
    indexes: [
      // http://docs.sequelizejs.com/manual/tutorial/models-definition.html#indexes
      // {fields: ['marker', 'communityId'], unique: true},
      // {fields: ['owner']}
    ]
  });

  CommunityVotingProposal.belongsTo(models.Voting, {as: 'voting', foreignKey: 'votingId', onDelete: 'CASCADE'});
  models.Voting.hasMany(CommunityVotingProposal, {as: 'proposals', foreignKey: 'votingId'});

  CommunityVotingProposal.belongsTo(models.Community, {as: 'community', foreignKey: 'communityId'});
  models.Community.hasMany(CommunityVotingProposal, {as: 'proposals', foreignKey: 'communityId'});
  
  return CommunityVotingProposal.sync({});
};
