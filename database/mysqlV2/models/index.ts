/*
 * Copyright ©️ 2019 Galt•Project Society Construction and Terraforming Company
 * (Founded by [Nikolai Popeka](https://github.com/npopeka)
 *
 * Copyright ©️ 2019 Galt•Core Blockchain Company
 * (Founded by [Nikolai Popeka](https://github.com/npopeka) by
 * [Basic Agreement](ipfs/QmaCiXUmSrP16Gz8Jdzq6AJESY1EAANmmwha15uR3c1bsS)).
 */

module.exports = async function (sequelize) {
  const models: any = {};

  models.PrivatePropertyRegistry = await require('./privatePropertyRegistry')(sequelize, models);

  models.GeohashSpaceToken = await require('./geohashSpaceToken')(sequelize, models);
  models.SpaceTokenGeoData = await require('./spaceTokenGeoData')(sequelize, models);
  models.SaleOrder = await require('./saleOrder')(sequelize, models);
  models.SaleOffer = await require('./saleOffer')(sequelize, models);
  models.Application = await require('./application')(sequelize, models);
  models.Value = await require('./value')(sequelize, models);

  models.TokenizableMember = await require('./tokenizableMember')(sequelize, models);

  models.PprTokenProposal = await require('./pprTokenProposal')(sequelize, models);
  models.PprLegalAgreement = await require('./pprLegalAgreement')(sequelize, models);
  models.PprMember = await require('./pprMember')(sequelize, models);
  models.PropertyLocker = await require('./propertyLocker')(sequelize, models);

  models.Community = await require('./community')(sequelize, models);
  models.CommunityMember = await require('./communityMember')(sequelize, models);
  models.CommunityMeeting = await require('./communityMeeting')(sequelize, models);
  models.CommunityRule = await require('./communityRule')(sequelize, models);
  models.CommunityVoting = await require('./communityVoting')(sequelize, models);
  models.CommunityProposal = await require('./communityProposal')(sequelize, models);

  return models;
};
