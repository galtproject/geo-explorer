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

  const CommunityVotingProposal = sequelize.define('communityVotingProposal', {
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
    marker: {
      type: Sequelize.STRING(100)
    },
    markerName: {
      type: Sequelize.STRING(100)
    },
    destination: {
      type: Sequelize.STRING(100)
    },
    proposalId: {
      type: Sequelize.STRING(100)
    },
    proposeTxId: {
      type: Sequelize.STRING(100)
    },
    executeTxId: {
      type: Sequelize.STRING(100)
    },
    status: {
      type: Sequelize.STRING(100)
    },
    data: {
      type: Sequelize.TEXT
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
    acceptedEnoughToExecute: {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    },
    acceptedShare: {
      type: Sequelize.FLOAT
    },
    abstainedShare: {
      type: Sequelize.FLOAT
    },
    declinedShare: {
      type: Sequelize.FLOAT
    },
    requiredSupport: {
      type: Sequelize.FLOAT
    },
    currentSupport: {
      type: Sequelize.FLOAT
    },
    minAcceptQuorum: {
      type: Sequelize.FLOAT
    },
    timeoutAt: {
      type: Sequelize.INTEGER
    },
    acceptedCount: {
      type: Sequelize.INTEGER
    },
    abstainedCount: {
      type: Sequelize.INTEGER
    },
    declinedCount: {
      type: Sequelize.INTEGER
    },
    totalAccepted: {
      type: Sequelize.FLOAT
    },
    totalDeclined: {
      type: Sequelize.FLOAT
    },
    totalAbstained: {
      type: Sequelize.FLOAT
    },
    createdAtBlock: {
      type: Sequelize.INTEGER
    },
    closedAtBlock: {
      type: Sequelize.INTEGER
    },
    closedAt: {
      type: Sequelize.DATE
    },
    isActual: {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    },
  }, {
    indexes: [
      // http://docs.sequelizejs.com/manual/tutorial/models-definition.html#indexes
      {fields: ['pmAddress', 'proposalId'], unique: true},
      // {fields: ['owner']}
    ]
  });

  CommunityVotingProposal.belongsTo(models.CommunityVoting, {as: 'voting', foreignKey: 'votingId', onDelete: 'CASCADE'});
  models.CommunityVoting.hasMany(CommunityVotingProposal, {as: 'proposals', foreignKey: 'votingId'});

  CommunityVotingProposal.belongsTo(models.Community, {as: 'community', foreignKey: 'communityId'});
  models.Community.hasMany(CommunityVotingProposal, {as: 'proposals', foreignKey: 'communityId'});

  CommunityVotingProposal.belongsTo(models.CommunityRule, {as: 'rule', foreignKey: 'ruleDbId'});
  models.CommunityRule.hasMany(CommunityVotingProposal, {as: 'proposals', foreignKey: 'ruleDbId'});

  return CommunityVotingProposal.sync({});
};
