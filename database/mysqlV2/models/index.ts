module.exports = async function(sequelize) {
    const models: any = {};

    models.GeohashSpaceToken = await require('./geohashSpaceToken')(sequelize, models);
    models.Value = await require('./value')(sequelize, models);

    return models;
};
