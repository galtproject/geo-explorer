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

  const SpaceTokenGeoData = sequelize.define('spaceTokenGeoData', {
    // http://docs.sequelizejs.com/manual/tutorial/models-definition.html#data-types
    tokenId: {
      type: Sequelize.STRING(100)
    },
    tokenType: {
      type: Sequelize.STRING(100)
    },
    type: {
      type: Sequelize.STRING(100)
    },
    subtype: {
      type: Sequelize.STRING(100)
    },
    contractAddress: {
      type: Sequelize.STRING(100)
    },
    level: {
      type: Sequelize.STRING(100)
    },
    fullRegion: {
      type: Sequelize.TEXT
    },
    regionLvl1: {
      type: Sequelize.STRING(100)
    },
    regionLvl2: {
      type: Sequelize.STRING(100)
    },
    regionLvl3: {
      type: Sequelize.STRING(100)
    },
    regionLvl4: {
      type: Sequelize.STRING(100)
    },
    regionLvl5: {
      type: Sequelize.STRING(100)
    },
    regionLvl6: {
      type: Sequelize.STRING(100)
    },
    regionLvl7: {
      type: Sequelize.STRING(100)
    },
    regionLvl8: {
      type: Sequelize.STRING(100)
    },
    regionLvl9: {
      type: Sequelize.STRING(100)
    },
    photosCount: {
      type: Sequelize.INTEGER
    },
    floorPlansCount: {
      type: Sequelize.INTEGER
    },
    bathroomsCount: {
      type: Sequelize.INTEGER
    },
    bedroomsCount: {
      type: Sequelize.INTEGER
    },
    yearBuilt: {
      type: Sequelize.INTEGER
    },
    area: {
      type: Sequelize.FLOAT
    },
    owner: {
      type: Sequelize.STRING(100)
    },
    locker: {
      type: Sequelize.STRING(100)
    },
    inLocker: {
      type: Sequelize.BOOLEAN,
    },
    isPrivate: {
      type: Sequelize.BOOLEAN,
    },
    ledgerIdentifier: {
      type: Sequelize.STRING(100)
    },
    areaSource: {
      type: Sequelize.STRING(100)
    },
    dataLink: {
      type: Sequelize.STRING
    },
    humanAddress: {
      type: Sequelize.STRING
    },
    dataJson: {
      type: Sequelize.TEXT
    },
    geohashContourJson: {
      type: Sequelize.TEXT
    },
    geohashesCount: {
      type: Sequelize.INTEGER
    },
    heightsContourJson: {
      type: Sequelize.TEXT
    },
    featureArray: {
      type: Sequelize.TEXT
    },
    createdAtBlock: {
      type: Sequelize.INTEGER
    },
    updatedAtBlock: {
      type: Sequelize.INTEGER
    },
  }, {
    indexes: [
      // http://docs.sequelizejs.com/manual/tutorial/models-definition.html#indexes
      {fields: ['tokenId', 'contractAddress'], unique: true},
      // {fields: ['owner']}
    ]
  });

  return SpaceTokenGeoData.sync({});
};
