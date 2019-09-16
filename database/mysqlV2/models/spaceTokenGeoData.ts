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
    spaceTokenId: {
      type: Sequelize.STRING(100)
    },
    type: {
      type: Sequelize.STRING(100)
    },
    subtype: {
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
    dataJson: {
      type: Sequelize.TEXT
    },
    geohashContourJson: {
      type: Sequelize.TEXT
    },
    heightsContourJson: {
      type: Sequelize.TEXT
    }
  }, {
    indexes: [
      // http://docs.sequelizejs.com/manual/tutorial/models-definition.html#indexes
      {fields: ['spaceTokenId']},
      // {fields: ['owner']}
    ]
  });

  return SpaceTokenGeoData.sync({});
};
