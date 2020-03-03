/*
 * Copyright ©️ 2018 Galt•Project Society Construction and Terraforming Company
 * (Founded by [Nikolai Popeka](https://github.com/npopeka)
 *
 * Copyright ©️ 2018 Galt•Core Blockchain Company
 * (Founded by [Nikolai Popeka](https://github.com/npopeka) by
 * [Basic Agreement](ipfs/QmaCiXUmSrP16Gz8Jdzq6AJESY1EAANmmwha15uR3c1bsS)).
 */

// usage: 
// RPC_SERVER=ws://localhost:8646 ./node_modules/.bin/ts-node check/web3Server.ts

(async () => {
    const Web3 = require("web3");

    let web3;
    if(process.env.RPC_SERVER.indexOf('http') === 0) {
        web3 = new Web3(new Web3.providers.HttpProvider(process.env.RPC_SERVER));
    } else {
        web3 = new Web3(new Web3.providers.WebsocketProvider(process.env.RPC_SERVER));
    }
    console.log('RPC_SERVER', process.env.RPC_SERVER);
    
    console.log('\nnetId', await web3.eth.net.getId());
    console.log('blockNumber', await web3.eth.getBlockNumber());
    console.log('gasPrice', await web3.eth.getGasPrice());
    console.log('balance', await web3.eth.getBalance('0x5489905ac8fac07b9b6ad40f4293c370c71c9f6a'));
    process.exit();
})();
