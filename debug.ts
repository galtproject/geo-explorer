/*
 * Copyright ©️ 2019 Galt•Project Society Construction and Terraforming Company
 * (Founded by [Nikolai Popeka](https://github.com/npopeka)
 *
 * Copyright ©️ 2019 Galt•Core Blockchain Company
 * (Founded by [Nikolai Popeka](https://github.com/npopeka) by
 * [Basic Agreement](ipfs/QmaCiXUmSrP16Gz8Jdzq6AJESY1EAANmmwha15uR3c1bsS)).
 */

import IExplorerChainService, {ChainServiceEvents} from "./services/chainService/interface";

const config = require('./config');
const axios = require('axios');
const _ = require('lodash');

(async () => {
  const chainServicePath = './services/chainService/' + config.chainService;
  const chainService: IExplorerChainService = await require(chainServicePath)({
    wsServer: process.env.RPC_WS_SERVER || config.wsServer,
    configFile: process.env.CONTRACTS_CONFIG || config.configFile,
    lastBlockNumber: 0
  });

  let configFile = process.env.CONTRACTS_CONFIG || config.configFile;
  let configUrl = _.template(require(chainServicePath + '/config').contractsConfigUrl)({ configFile });
  console.log('config url', configUrl);

  const {data: contractsConfig} = await axios.get(configUrl);
  console.log('contractsConfig', Object.keys(contractsConfig));


  console.log('contractsConfig.ppHomeMediatorFactoryAbi', contractsConfig.ppHomeMediatorFactoryAbi.filter(m => m.name === 'NewPPMediator'));

  await chainService.getEventsFromBlock(chainService.ppHomeMediatorFactory, ChainServiceEvents.PPMediatorNew, 0).then(async (events) => {
    console.log('events.length', events.length);
  });

  console.log('tx receipt', await chainService.getTransactionReceipt('0x0bf3ff0739572b933c5fd2746a23a7c99ba6608d3b697554086d104974ce00e2', [
    {address: contractsConfig.ppHomeMediatorFactoryAddress, abi: contractsConfig.ppHomeMediatorFactoryAbi}
  ]))

})();