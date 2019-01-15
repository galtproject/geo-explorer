module.exports = async function(sequelize) {
    const models: any = {};

    models.Contour = await require('./contour')(sequelize, models);
    models.Geohash = await require('./geohash')(sequelize, models);

    return models;
};
