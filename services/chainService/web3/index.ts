import IExplorerChainService from "../interace";
import {IExplorerChainContourEvent} from "../../interfaces";

const _ = require('lodash');
const axios = require('axios');

const Web3 = require("web3");

const config = require('./config');
if (!config.wsServer) {
    console.error('wsServer required in config.js');
    process.exit(1);
}

module.exports = async (extendConfig) => {
    const web3 = new Web3(new Web3.providers.WebsocketProvider(config.wsServer));

    const netId = await web3.eth.net.getId();
    
    const contractsConfigUrl = _.template(config.contractsConfigUrl)({ env: extendConfig.env || config.env });

    const {data: contractsConfig} = await axios.get(contractsConfigUrl + netId + '.json');
    
    const serviceInstance = new ExplorerChainWeb3Service(contractsConfig);
    
    setInterval(async () => {
        const {data: newContractsConfig} = await axios.get(config.contractsConfigUrl + netId + '.json');
        if(newContractsConfig.blockNumber != serviceInstance.contractsConfig.blockNumber) {
            serviceInstance.setContractsConfig(newContractsConfig, true);
        }
    }, 1000 * 60);
    
    return serviceInstance;
};

class ExplorerChainWeb3Service implements IExplorerChainService {
    websocketProvider: any;
    web3: any;
    
    spaceGeoData: any;
    contractsConfig: any;
    
    callbackOnReconnect: any;
    
    constructor(_contractsConfig) {
        this.websocketProvider = new Web3.providers.WebsocketProvider(config.wsServer);
        this.web3 = new Web3(this.websocketProvider);
        
        this.contractsConfig = _contractsConfig;
        
        this.createContractInstance();
        
        this.subscribeForReconnect();
    }
    
    getEventsFromBlock(eventName: string, blockNumber?: number): Promise<IExplorerChainContourEvent[]> {
        return this.spaceGeoData.getPastEvents(eventName, {fromBlock: blockNumber || this.contractsConfig.blockNumber});
    }

    subscribeForNewEvents(eventName: string, blockNumber: number, callback) {
        this.spaceGeoData.events[eventName]({fromBlock: blockNumber}, callback);
    }

    async getCurrentBlock() {
        return this.web3.eth.getBlockNumber();
    }

    onReconnect(callback) {
        this.callbackOnReconnect = callback;
    }

    private subscribeForReconnect() {
        this.websocketProvider.on('end', () => {
            setTimeout(() => {
                console.log('🔁 Websocket reconnect');
                
                this.websocketProvider = new Web3.providers.WebsocketProvider(config.wsServer);
                this.web3 = new Web3(this.websocketProvider);
                this.createContractInstance();
                
                if(this.callbackOnReconnect) {
                    this.callbackOnReconnect();
                }
                
                this.subscribeForReconnect();
            }, 1000);
        });
    }
    
    setContractsConfig(contractsConfig, redeployed = false) {
        this.contractsConfig = contractsConfig;
        this.createContractInstance();
        
        if(this.callbackOnReconnect) {
            this.callbackOnReconnect(redeployed);
        }
    }
    
    private createContractInstance() {
        this.spaceGeoData = new this.web3.eth.Contract(this.contractsConfig[config.contractName + 'Abi'], this.contractsConfig[config.contractName + 'Address']);
    }
}
