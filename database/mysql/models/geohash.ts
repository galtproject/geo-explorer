module.exports = async function (sequelize, models) {
    const Sequelize = require('sequelize');
    
    const Geohash = sequelize.define('geohash', {
        // http://docs.sequelizejs.com/manual/tutorial/models-definition.html#data-types
        symbols: {
            type: Sequelize.STRING(12),
            unique: true
        }
    }, {
        indexes: [
            // http://docs.sequelizejs.com/manual/tutorial/models-definition.html#indexes
        ]
    });

    models.GeohashContour = sequelize.define('geohashcontours', {
        contourId: {
            type: Sequelize.INTEGER
        },
        geohashId: {
            type: Sequelize.INTEGER
        }
    });
    
    await models.GeohashContour.sync({});

    Geohash.belongsToMany(models.Contour, { through: models.GeohashContour, as: 'contours', foreignKey: 'contourId', otherKey: 'geohashId' });
    models.Contour.belongsToMany(Geohash, { through: models.GeohashContour, as: 'geohashes', foreignKey: 'geohashId', otherKey: 'contourId' });

    models.GeohashPivot = sequelize.define('geohashPivot', {
        parentId: {
            type: Sequelize.INTEGER
        },
        childrenId: {
            type: Sequelize.INTEGER
        }
    });

    await models.GeohashPivot.sync({});

    Geohash.belongsToMany(Geohash, {
        through: models.GeohashPivot,
        as: 'children',
        foreignKey: 'parentId',
        otherKey: 'childrenId'
    });

    Geohash.belongsToMany(Geohash, {
        through: models.GeohashPivot,
        as: 'parents',
        foreignKey: 'childrenId',
        otherKey: 'parentId'
    });
    
    Geohash.belongsToMany(Geohash, { through: models.GeohashPivot, as: 'geohashes' });
    
    return Geohash.sync({});
};
