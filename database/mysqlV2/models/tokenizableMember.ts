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

  const TokenizableMember = sequelize.define('tokenizableMember', {
    // http://docs.sequelizejs.com/manual/tutorial/models-definition.html#data-types
    contractAddress: {
      type: Sequelize.STRING(100)
    },
    address: {
      type: Sequelize.STRING(100)
    },
    balance: {
      type: Sequelize.FLOAT
    },
  }, {
    indexes: [
      // http://docs.sequelizejs.com/manual/tutorial/models-definition.html#indexes
      {fields: ['contractAddress', 'address'], unique: true},
      // {fields: ['owner']}
    ]
  });

  return TokenizableMember.sync({});
};
