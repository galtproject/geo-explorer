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

  const Application = sequelize.define('application', {
    // http://docs.sequelizejs.com/manual/tutorial/models-definition.html#data-types
    applicationId: {
      type: Sequelize.STRING(100)
    },
    feeAmount: {
      type: Sequelize.FLOAT
    },
    feeCurrency: {
      type: Sequelize.STRING(100)
    },
    feeCurrencyAddress: {
      type: Sequelize.STRING(100)
    },
    feeCurrencyName: {
      type: Sequelize.STRING(100)
    },
    statusName: {
      type: Sequelize.STRING(100)
    },
    credentialsHash:{
      type: Sequelize.STRING(100)
    },
    contractType: {
      type: Sequelize.STRING(100)
    },
    contractAddress: {
      type: Sequelize.STRING(100)
    },
    applicantAddress: {
      type: Sequelize.STRING(100)
    },
    rolesArray: {
      type: Sequelize.TEXT
    },
    availableRolesArray: {
      type: Sequelize.TEXT
    },
    oraclesArray: {
      type: Sequelize.TEXT
    },
    totalOraclesReward: {
      type: Sequelize.FLOAT
    },
    createdAtBlock: {
      type: Sequelize.INTEGER
    },
    updatedAtBlock: {
      type: Sequelize.INTEGER
    },
    dataJson: {
      type: Sequelize.TEXT
    }
  }, {
    indexes: [
      // http://docs.sequelizejs.com/manual/tutorial/models-definition.html#indexes
      {fields: ['applicationId', 'contractAddress'], unique: true},
      // {fields: ['owner']}
    ]
  });
  
  models.SpaceTokensApplications = sequelize.define('spaceTokensApplications', {} as any, {} as any);

  Application.belongsToMany(models.SpaceTokenGeoData, {as: 'spaceTokens', through: models.SpaceTokensApplications});
  models.SpaceTokenGeoData.belongsToMany(Application, {as: 'applications', through: models.SpaceTokensApplications});
  //
  // Application.belongsTo(models.SpaceTokenGeoData, {as: 'tokenGeoData', foreignKey: 'tokenGeoDataId'});
  // models.SpaceTokenGeoData.hasMany(Application, {as: 'orders', foreignKey: 'tokenGeoDataId'});

  await Application.sync({});

  await models.SpaceTokensApplications.sync({});
  
  return Application;
};
