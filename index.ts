import IExplorerDatabase from "./database/interface";

// require("@types/es6-promise");

const Web3 = require("web3");
const pIteration = require("p-iteration");
const _ = require("lodash");
const axios = require('axios');
const fs = require('fs');
const galtUtils = require('@galtproject/utils');

const config = require('./config');
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

(async() => {
    const database: IExplorerDatabase = await require('./database/mysql')();
    
    const netId = await web3.eth.net.getId();
    
    const {data: contractsConfig} = await axios.get(config.contractsConfigUrl + netId + '.json');

    const spaceGeoData = new web3.eth.Contract(contractsConfig.splitMergeAbi, contractsConfig.splitMergeAddress);

    spaceGeoData.getPastEvents('SpaceTokenContourChange', {fromBlock: contractsConfig.blockNumber}, (logs) => {
        // console.log('callback', logs);
    }).then(async (events) => {
        await pIteration.forEach(events, async (event) => {
            // console.log('update', event.returnValues.id, event.returnValues.contour.map(galtUtils.numberToGeohash));
            
            const contour: string[] = event.returnValues.contour.map(galtUtils.numberToGeohash);
            let spaceTokenId: string = event.returnValues.id;
            
            let spaceTokenNumberId: number;
            if(_.startsWith(spaceTokenId, '0x')) {
                spaceTokenNumberId = parseInt(galtUtils.tokenIdHexToTokenId(spaceTokenId));
            } else {
                spaceTokenNumberId = parseInt(spaceTokenId);
            }
            
            await database.addOrUpdateContour(contour, spaceTokenNumberId);
        });
        
        console.log('events finish');
        
        const result = await database.getContoursByGeohash('w24q8r');
        
        console.log('result for w24q8r', result);
    })
})();
