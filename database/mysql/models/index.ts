module.exports = async function(sequelize) {
    const models: any = {};

    // models.SpaceToken = await require('./spaceToken')(sequelize, models);
    models.GeohashSpaceToken = await require('./geohashSpaceToken')(sequelize, models);
    models.GeohashParent = await require('./geohashParent')(sequelize, models);
    models.Value = await require('./value')(sequelize, models);

    return models;
};
