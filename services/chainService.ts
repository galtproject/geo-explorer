const _ = require("lodash");
const axios = require('axios');

const Web3 = require("web3");

const config = require('../config');
if (!config.wsServer) {
    console.error('wsServer required in config.js');
    process.exit(1);
}


let websocketProvider = new Web3.providers.WebsocketProvider(config.wsServer);
let web3 = new Web3(websocketProvider);

function subscribeForReconnect() {
    websocketProvider.on('end', () => {
        setTimeout(() => {
            console.log('🔁 Websocket reconnect');
            websocketProvider = new Web3.providers.WebsocketProvider(config.wsServer);
            web3 = new Web3(websocketProvider);
            subscribeForReconnect();
        }, 1000);
    });
}
subscribeForReconnect();

module.exports = async () => {
    const netId = await web3.eth.net.getId();

    const {data: contractsConfig} = await axios.get(config.contractsConfigUrl + netId + '.json');

    const spaceGeoData = new web3.eth.Contract(contractsConfig.splitMergeAbi, contractsConfig.splitMergeAddress);
    
    const service: any = {};
    
    service.getEventsFromBlock = async (eventName, blockNumber = null) => {
        return spaceGeoData.getPastEvents(eventName, {fromBlock: blockNumber || contractsConfig.blockNumber});
    };
    
    return service;
};
