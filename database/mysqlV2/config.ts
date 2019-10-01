/*
 * Copyright ©️ 2019 GaltProject Society Construction and Terraforming Company
 * (Founded by [Nikolai Popeka](https://github.com/npopeka)
 *
 * Copyright ©️ 2019 Galt•Core Blockchain Company
 * (Founded by [Nikolai Popeka](https://github.com/npopeka) by
 * [Basic Agreement](ipfs/QmaCiXUmSrP16Gz8Jdzq6AJESY1EAANmmwha15uR3c1bsS)).
 */

module.exports = {
  'name': 'geo_explorer_v2',
  'user': 'root',
  'password': 'root',
  'options': {
    'logging': false,
    'host': 'localhost',
    'dialect': 'mysql',
    'operatorsAliases': false,
    'pool': {'max': 5, 'min': 0, 'acquire': 30000, 'idle': 10000},
    'dialectOptions': {'multipleStatements': true}
  }
};
