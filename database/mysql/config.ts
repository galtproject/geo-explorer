module.exports = {
    'name': 'geo_explorer',
    'user': 'root',
    'password': 'root',
    'options': {
        'host': 'localhost',
        'dialect': 'mysql',
        'operatorsAliases': false,
        'pool': { 'max': 5, 'min': 0, 'acquire': 30000, 'idle': 10000 },
        'dialectOptions': { 'multipleStatements': true}
    }
};
