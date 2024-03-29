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
    levelNumber: {
      type: Sequelize.FLOAT
    },
    // innerHeight: {
    //   type: Sequelize.FLOAT
    // },
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
    highestPoint: {
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
    communitiesCount: {
      type: Sequelize.INTEGER,
    },
    isPpr: {
      type: Sequelize.BOOLEAN,
    },
    proposalsToEditForTokenOwnerCount: {
      type: Sequelize.INTEGER
    },
    proposalsToBurnForTokenOwnerCount: {
      type: Sequelize.INTEGER
    },
    proposalsToEditForRegistryOwnerCount: {
      type: Sequelize.INTEGER
    },
    proposalsToBurnForRegistryOwnerCount: {
      type: Sequelize.INTEGER
    },
    burnTimeout: {
      type: Sequelize.INTEGER
    },
    burnOn: {
      type: Sequelize.DATE
    },
    burnWithoutPledgeOn: {
      type: Sequelize.DATE
    },
    creationTimeoutEndOn: {
      type: Sequelize.DATE
    },
    verificationPledge: {
      type: Sequelize.FLOAT,
      defaultValue: 0
    },
    verificationDisabled: {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    },
    ledgerIdentifier: {
      type: Sequelize.STRING(100)
    },
    areaSource: {
      type: Sequelize.STRING(100)
    },
    imageHash: {
      type: Sequelize.STRING(100)
    },
    purpose: {
      type: Sequelize.STRING(100)
    },
    dataLink: {
      type: Sequelize.STRING
    },
    humanAddress: {
      type: Sequelize.STRING
    },
    modelIpfsHash: {
      type: Sequelize.STRING(100)
    },
    dataJson: {
      type: Sequelize.TEXT
    },
    ownersJson: {
      type: Sequelize.TEXT
    },
    contractContourJson: {
      type: Sequelize.TEXT
    },
    geohashContourJson: {
      type: Sequelize.TEXT
    },
    latLonBaseContourJson: {
      type: Sequelize.TEXT
    },
    contractShiftedContourJson: {
      type: Sequelize.TEXT
    },
    latLonShiftedBaseContourJson: {
      type: Sequelize.TEXT
    },
    latLonContourJson: {
      type: Sequelize.TEXT
    },
    latLonShiftedContourJson: {
      type: Sequelize.TEXT
    },
    latLonCenterJson: {
      type: Sequelize.TEXT
    },
    latLonShiftedCenterJson: {
      type: Sequelize.TEXT
    },
    geohashesCount: {
      type: Sequelize.INTEGER
    },
    heightsContourJson: {
      type: Sequelize.TEXT
    },
    offsetJson: {
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

    lockerType: {
      type: Sequelize.STRING(100)
    }
  }, {
    indexes: [
      // http://docs.sequelizejs.com/manual/tutorial/models-definition.html#indexes
      {fields: ['tokenId', 'contractAddress'], unique: true},
      {fields: ['contractAddress', 'levelNumber']},
      {fields: ['id', 'contractAddress', 'createdAt']}
    ]
  });

  SpaceTokenGeoData.belongsTo(models.PrivatePropertyRegistry, {as: 'ppr', foreignKey: 'pprId'});
  models.PrivatePropertyRegistry.hasMany(SpaceTokenGeoData, {as: 'spaceTokens', foreignKey: 'pprId'});

  await SpaceTokenGeoData.sync({});

  models.SpaceTokenOwners = sequelize.define('spaceTokenOwners', {
    address: {type: Sequelize.STRING(200)},
  } as any, {} as any);

  SpaceTokenGeoData.hasMany(models.SpaceTokenOwners, {as: 'owners', foreignKey: 'tokenDbId'});
  models.SpaceTokenOwners.belongsTo(SpaceTokenGeoData, {as: 'token', foreignKey: 'tokenDbId'});

  await models.SpaceTokenOwners.sync({});
  return SpaceTokenGeoData;
};
