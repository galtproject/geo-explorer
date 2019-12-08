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

  const PprLegalAgreement = sequelize.define('pprLegalAgreement', {
    // http://docs.sequelizejs.com/manual/tutorial/models-definition.html#data-types
    registryAddress: {
      type: Sequelize.STRING(100)
    },
    ipfsHash: {
      type: Sequelize.STRING(100)
    },
    content: {
      type: Sequelize.TEXT
    },
    setAt: {
      type: Sequelize.DATE
    },
  }, {
    indexes: [
      // http://docs.sequelizejs.com/manual/tutorial/models-definition.html#indexes
      {fields: ['registryAddress', 'setAt'], unique: true},
      // {fields: ['owner']}
    ]
  });

  PprLegalAgreement.belongsTo(models.PrivatePropertyRegistry, {as: 'registry', foreignKey: 'registryId', onDelete: 'CASCADE'});
  models.PrivatePropertyRegistry.hasMany(PprLegalAgreement, {as: 'legalAgreementList', foreignKey: 'registryId'});

  return PprLegalAgreement.sync({});
};
