module.exports = async function (sequelize, models) {
    const Sequelize = require('sequelize');
    
    const SpaceToken = sequelize.define('spaceToken', {
        // http://docs.sequelizejs.com/manual/tutorial/models-definition.html#data-types
        spaceTokenId: {
            type: Sequelize.STRING(100)
        },
        owner: {
            type: Sequelize.STRING(100)
        },
    }, {
        indexes: [
            // http://docs.sequelizejs.com/manual/tutorial/models-definition.html#indexes
            { fields: ['spaceTokenId'] },
            { fields: ['owner'] }
        ]
    });

    return SpaceToken.sync({});
};
