module.exports = async function (sequelize, models) {
    const Sequelize = require('sequelize');
    
    const Contour = sequelize.define('contour', {
        // http://docs.sequelizejs.com/manual/tutorial/models-definition.html#data-types
        spaceTokenId: {
            type: Sequelize.STRING(100)
        },
        geohashesJson: {
            type: Sequelize.TEXT
        },
    }, {
        indexes: [
            // http://docs.sequelizejs.com/manual/tutorial/models-definition.html#indexes
            { fields: ['spaceTokenId'] }
        ]
    });

    return Contour.sync({});
};
