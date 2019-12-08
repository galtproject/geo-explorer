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

  const PprMember = sequelize.define('pprMember', {
    // http://docs.sequelizejs.com/manual/tutorial/models-definition.html#data-types
    registryAddress: {
      type: Sequelize.STRING(100)
    },
    address: {
      type: Sequelize.STRING(100)
    },
    tokensCount: {
      type: Sequelize.STRING(100)
    },
  }, {
    indexes: [
      // http://docs.sequelizejs.com/manual/tutorial/models-definition.html#indexes
      {fields: ['registryAddress', 'address'], unique: true},
      // {fields: ['owner']}
    ]
  });

  PprMember.belongsTo(models.PrivatePropertyRegistry, {as: 'registry', foreignKey: 'registryId', onDelete: 'CASCADE'});
  models.PrivatePropertyRegistry.hasMany(PprMember, {as: 'pprMembers', foreignKey: 'registryId'});

  return PprMember.sync({});
};
