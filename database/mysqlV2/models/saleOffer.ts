/*
 * Copyright ©️ 2019 GaltProject Society Construction and Terraforming Company
 * (Founded by [Nikolai Popeka](https://github.com/npopeka)
 *
 * Copyright ©️ 2019 Galt•Core Blockchain Company
 * (Founded by [Nikolai Popeka](https://github.com/npopeka) by
 * [Basic Agreement](ipfs/QmaCiXUmSrP16Gz8Jdzq6AJESY1EAANmmwha15uR3c1bsS)).
 */

module.exports = async function (sequelize, models) {
  const Sequelize = require('sequelize');

  const SaleOffer = sequelize.define('saleOffer', {
    // http://docs.sequelizejs.com/manual/tutorial/models-definition.html#data-types
    orderId: {
      type: Sequelize.STRING(100)
    },
    ask: {
      type: Sequelize.FLOAT
    },
    bid: {
      type: Sequelize.FLOAT
    },
    contractAddress: {
      type: Sequelize.STRING(100)
    },
    buyer: {
      type: Sequelize.STRING(100)
    },
    seller: {
      type: Sequelize.STRING(100)
    },
    createdAtBlock: {
      type: Sequelize.INTEGER
    },
    updatedAtBlock: {
      type: Sequelize.INTEGER
    },
    status: {
      type: Sequelize.STRING(100)
    },
    
    isFirstOffer: {
      type: Sequelize.BOOLEAN,
    },

    lastOfferAskAt: {
      type: Sequelize.DATE
    },
    lastOfferBidAt: {
      type: Sequelize.DATE
    },
    createdOfferAt: {
      type: Sequelize.DATE
    },
    
  }, {
    indexes: [
      // http://docs.sequelizejs.com/manual/tutorial/models-definition.html#indexes
      {fields: ['orderId', 'buyer', 'contractAddress'], unique: true},
      // {fields: ['owner']}
    ]
  });
  
  SaleOffer.belongsTo(models.SaleOrder, {as: 'order', foreignKey: 'dbOrderId'});
  models.SaleOrder.hasMany(SaleOffer, {as: 'offers', foreignKey: 'dbOrderId'});
  
  return SaleOffer.sync({});
};
