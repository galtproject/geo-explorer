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

  const GeohashSpaceToken = sequelize.define('geohashSpaceToken', {
    tokenId: {
      type: Sequelize.STRING(100)
    },
    level: {
      type: Sequelize.STRING(100)
    },
    contractAddress: {
      type: Sequelize.STRING(100)
    },
    contourGeohash: {
      type: Sequelize.STRING(12)
    },
    position: {
      type: Sequelize.INTEGER
    }
  }, {
    indexes: [
      // http://docs.sequelizejs.com/manual/tutorial/models-definition.html#indexes
      {fields: ['tokenId', 'contourGeohash', 'contractAddress'], unique: true},
      {fields: ['tokenId', 'contractAddress']},
      {fields: ['contourGeohash', 'contractAddress']}
    ]
  });

  return GeohashSpaceToken.sync({});
};
