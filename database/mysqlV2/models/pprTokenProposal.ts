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

  const PprTokenProposal = sequelize.define('pprTokenProposal', {
    // http://docs.sequelizejs.com/manual/tutorial/models-definition.html#data-types
    registryAddress: {
      type: Sequelize.STRING(100)
    },
    creatorAddress: {
      type: Sequelize.STRING(100)
    },
    destination: {
      type: Sequelize.STRING(100)
    },
    contractAddress: {
      type: Sequelize.STRING(100)
    },
    proposalId: {
      type: Sequelize.STRING(100)
    },
    tokenId: {
      type: Sequelize.STRING(100)
    },
    status: {
      type: Sequelize.STRING(100)
    },
    statusNumber: {
      type: Sequelize.INTEGER
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
    isApprovedByTokenOwner: {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    },
    isApprovedByRegistryOwner: {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    },
    isExecuted: {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    }
  }, {
    indexes: [
      // http://docs.sequelizejs.com/manual/tutorial/models-definition.html#indexes
      {fields: ['contractAddress', 'proposalId'], unique: true},
      // {fields: ['owner']}
    ]
  });

  PprTokenProposal.belongsTo(models.PrivatePropertyRegistry, {as: 'registry', foreignKey: 'registryId', onDelete: 'CASCADE'});
  models.PrivatePropertyRegistry.hasMany(PprTokenProposal, {as: 'pprTokenProposals', foreignKey: 'registryId'});

  PprTokenProposal.belongsTo(models.SpaceTokenGeoData, {as: 'propertyToken', foreignKey: 'propertyTokenId'});
  models.SpaceTokenGeoData.hasMany(PprTokenProposal, {as: 'pprTokenProposals', foreignKey: 'propertyTokenId'});

  return PprTokenProposal.sync({});
};
