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

  const SpaceToken = sequelize.define('spaceToken', {
    // http://docs.sequelizejs.com/manual/tutorial/models-definition.html#data-types
    tokenId: {
      type: Sequelize.STRING(100)
    },
    owner: {
      type: Sequelize.STRING(100)
    },
  }, {
    indexes: [
      // http://docs.sequelizejs.com/manual/tutorial/models-definition.html#indexes
      {fields: ['tokenId']},
      {fields: ['owner']}
    ]
  });

  return SpaceToken.sync({});
};
