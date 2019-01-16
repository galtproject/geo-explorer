module.exports = async function(sequelize) {
    const models: any = {};

    models.Contour = await require('./contour')(sequelize, models);
    models.GeohashSpaceToken = await require('./geohashSpaceToken')(sequelize, models);
    models.GeohashParent = await require('./geohashParent')(sequelize, models);

    return models;
};
