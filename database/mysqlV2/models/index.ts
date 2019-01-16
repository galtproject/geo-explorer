module.exports = async function(sequelize) {
    const models: any = {};

    models.GeohashSpaceToken = await require('./geohashSpaceToken')(sequelize, models);

    return models;
};
