module.exports = async function (sequelize, models) {
    const Sequelize = require('sequelize');

    const GeohashParent = sequelize.define('geohashParent', {
        contourGeohash: {
            type: Sequelize.STRING(12)
        },
        parentGeohash: {
            type: Sequelize.STRING(12)
        }
    }, {
        indexes: [
            // http://docs.sequelizejs.com/manual/tutorial/models-definition.html#indexes
            { fields: ['parentGeohash'] },
            { fields: ['contourGeohash', 'parentGeohash'], unique: true }
        ]
    });
    
    return GeohashParent.sync({});
};
