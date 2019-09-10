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
  }, {
    indexes: [
      // http://docs.sequelizejs.com/manual/tutorial/models-definition.html#indexes
      {fields: ['spaceTokenId']},
      // {fields: ['owner']}
    ]
  });

  return SpaceTokenGeoData.sync({});
};
