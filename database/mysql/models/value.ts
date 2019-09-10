module.exports = async function (sequelize, models) {
  const Sequelize = require('sequelize');

  const Value = sequelize.define('value', {
    // http://docs.sequelizejs.com/manual/tutorial/models-definition.html#data-types
    key: {
      type: Sequelize.STRING(100)
    },
    content: {
      type: Sequelize.TEXT
    },
  }, {
    indexes: [
      // http://docs.sequelizejs.com/manual/tutorial/models-definition.html#indexes
      {fields: ['key']}
    ]
  });

  return Value.sync({});
};
