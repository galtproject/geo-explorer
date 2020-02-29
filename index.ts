/*
 * Copyright ©️ 2019 Galt•Project Society Construction and Terraforming Company
 * (Founded by [Nikolai Popeka](https://github.com/npopeka)
 *
 * Copyright ©️ 2019 Galt•Core Blockchain Company
 * (Founded by [Nikolai Popeka](https://github.com/npopeka) by
 * [Basic Agreement](ipfs/QmaCiXUmSrP16Gz8Jdzq6AJESY1EAANmmwha15uR3c1bsS)).
 */

import IExplorerDatabase from "./database/interface";
import IExplorerGeohashService from "./services/geohashService/interface";
import IExplorerChainService, {ChainServiceEvents} from "./services/chainService/interface";
import IExplorerGeoDataService from "./services/geoDataService/interface";

const pIteration = require("p-iteration");
const _ = require("lodash");
const config = require('./config');
const log = require('./services/logService');

(async () => {
  const databaseConfig: any = {};
  if (process.env.DATABASE_NAME) {
    databaseConfig.name = process.env.DATABASE_NAME;
  }

  const database: IExplorerDatabase = await require('./database/' + config.database)(databaseConfig);

  const chainService: IExplorerChainService = await require('./services/chainService/' + config.chainService)({
    wsServer: process.env.RPC_WS_SERVER || config.wsServer,
    configFile: process.env.CONTRACTS_CONFIG || config.configFile,
    lastBlockNumber: await database.getValue('lastBlockNumber')
  });

  const geohashService: IExplorerGeohashService = await require('./services/geohashService/' + config.geohashService)(database, chainService);
  const geoDataService: IExplorerGeoDataService = await require('./services/geoDataService/' + config.geoDataService)(database, geohashService, chainService);

  chainService.onReconnect(fetchAndSubscribe);

  let lastBlockNumber = parseInt(await database.getValue('lastBlockNumber')) || 0;

  console.log('lastBlockNumber', lastBlockNumber);

  await fetchAndSubscribe(chainService.contractsConfig.blockNumber > lastBlockNumber).catch(e => {
    console.error('init error', e);
  });

  setInterval(() => {
    chainService.getCurrentBlock();
  }, 30 * 1000);

  let startBlockNumber = await chainService.getCurrentBlock();
  console.log('startBlockNumber', startBlockNumber);

  async function setLastBlockNumber(blockNumber) {
    const lastBlockNumber = parseInt(await database.getValue('lastBlockNumber'));
    if(lastBlockNumber > parseInt(blockNumber)) {
      return;
    }
    return database.setValue('lastBlockNumber', blockNumber.toString())
  }

  async function fetchAndSubscribe(needFlushing = false) {
    if (needFlushing) {
      await database.flushDatabase();
    }
    lastBlockNumber = parseInt(await database.getValue('lastBlockNumber')) || 0;

    startBlockNumber = await chainService.getCurrentBlock();
    console.log('fetchAndSubscribe startBlockNumber', startBlockNumber);

    await chainService.getEventsFromBlock(chainService.spaceGeoData, ChainServiceEvents.SetSpaceTokenContour, lastBlockNumber).then(async (events) => {
      await pIteration.forEach(events, geohashService.handleChangeContourEvent.bind(geohashService));
    });

    await chainService.getEventsFromBlock(chainService.spaceGeoData, ChainServiceEvents.SetSpaceTokenDataLink, lastBlockNumber).then(async (events) => {
      await pIteration.forEach(events, (e) => {
        return geoDataService.handleChangeSpaceTokenDataEvent(chainService.spaceGeoData._address, e);
      });
    });

    await chainService.getEventsFromBlock(chainService.propertyMarket, ChainServiceEvents.SaleOrderStatusChanged, lastBlockNumber).then(async (events) => {
      await pIteration.forEach(events, (e) => {
        return geoDataService.handleSaleOrderEvent(e)
      });
    });

    await chainService.getEventsFromBlock(chainService.propertyMarket, ChainServiceEvents.SaleOfferStatusChanged, lastBlockNumber).then(async (events) => {
      await pIteration.forEach(events, (e) => {
        return geoDataService.handleSaleOfferEvent(e)
      });
    });

    await chainService.getEventsFromBlock(chainService.newPropertyManager, ChainServiceEvents.NewPropertyApplication, lastBlockNumber).then(async (events) => {
      await pIteration.forEach(events, geoDataService.handleNewApplicationEvent.bind(geoDataService));
    });

    chainService.subscribeForNewEvents(chainService.spaceGeoData, ChainServiceEvents.SetSpaceTokenContour, startBlockNumber, async (err, newEvent) => {
      await geohashService.handleChangeContourEvent(newEvent);
      await geoDataService.handleChangeSpaceTokenDataEvent(chainService.spaceGeoData._address, newEvent);
      await setLastBlockNumber(newEvent.blockNumber);
    });

    chainService.subscribeForNewEvents(chainService.spaceGeoData, ChainServiceEvents.SetSpaceTokenDataLink, startBlockNumber, async (err, newEvent) => {
      await geoDataService.handleChangeSpaceTokenDataEvent(chainService.spaceGeoData._address, newEvent);
      await setLastBlockNumber(newEvent.blockNumber);
    });

    chainService.subscribeForNewEvents(chainService.spaceToken, ChainServiceEvents.SpaceTokenTransfer, startBlockNumber, async (err, newEvent) => {
      await geoDataService.handleChangeSpaceTokenDataEvent(chainService.spaceGeoData._address, newEvent);
      await setLastBlockNumber(newEvent.blockNumber);
    });

    chainService.subscribeForNewEvents(chainService.propertyMarket, ChainServiceEvents.SaleOrderStatusChanged, startBlockNumber, async (err, newEvent) => {
      await geoDataService.handleSaleOrderEvent(newEvent);
      await setLastBlockNumber(newEvent.blockNumber);
    });

    ['SaleOfferAskChanged', 'SaleOfferBidChanged', 'SaleOfferStatusChanged'].map((eventName) => {
      chainService.subscribeForNewEvents(chainService.propertyMarket, ChainServiceEvents[eventName], startBlockNumber, async (err, newEvent) => {
        await geoDataService.handleSaleOfferEvent(newEvent);
        await setLastBlockNumber(newEvent.blockNumber);
      });
    });

    chainService.subscribeForNewEvents(chainService.newPropertyManager, ChainServiceEvents.NewPropertyApplication, startBlockNumber, async (err, newEvent) => {
      await geoDataService.handleNewApplicationEvent(newEvent);
      await setLastBlockNumber(newEvent.blockNumber);
    });

    chainService.subscribeForNewEvents(chainService.newPropertyManager, ChainServiceEvents.NewPropertyValidationStatusChanged, startBlockNumber, async (err, newEvent) => {
      await geoDataService.handleNewApplicationEvent(newEvent);
      await setLastBlockNumber(newEvent.blockNumber);
    });

    chainService.subscribeForNewEvents(chainService.newPropertyManager, ChainServiceEvents.NewPropertyApplicationStatusChanged, startBlockNumber, async (err, newEvent) => {
      await geoDataService.handleNewApplicationEvent(newEvent);
      await setLastBlockNumber(newEvent.blockNumber);
    });

    const subscribedToTokenizableContract = {
      // contractAddress => bool
    };

    await chainService.getEventsFromBlock(chainService.tokenizableFactory, ChainServiceEvents.NewTokenizableContract, 0).then(async (events) => {
      await pIteration.forEachSeries(events, async (e) => {
        await subscribeToTokenizableContract(e.returnValues.locker);
      });
    });

    chainService.subscribeForNewEvents(chainService.tokenizableFactory, ChainServiceEvents.NewTokenizableContract, startBlockNumber, async (err, newEvent) => {
      subscribeToTokenizableContract(newEvent.returnValues.locker);
      await setLastBlockNumber(newEvent.blockNumber);
    });

    async function subscribeToTokenizableContract (address) {
      if (subscribedToTokenizableContract[address]) {
        return;
      }
      log('📢 Subscribed to Tokenizable Contract:', address);

      subscribedToTokenizableContract[address] = true;
      const contract = chainService.getTokenizableContract(address);

      await chainService.getEventsFromBlock(contract, ChainServiceEvents.TransferTokenizableBalance, lastBlockNumber).then(async (events) => {
        await pIteration.forEach(events, async (e) => {
          return geoDataService.handleTokenizableTransferEvent(address, e);
        });
      });

      chainService.subscribeForNewEvents(contract, ChainServiceEvents.TransferTokenizableBalance, startBlockNumber, async (err, newEvent) => {
        await geoDataService.handleTokenizableTransferEvent(address, newEvent);
        await setLastBlockNumber(newEvent.blockNumber);
      });
    }

    const subscribedToPrivatePropertyRegistry = {
      // registryAddress => bool
    };

    await pIteration.forEachSeries(chainService.contractsConfig.oldPPTokenRegistryAddresses || [], async (oldPPTokenRegistryAddress) => {
      const oldPrivatePropertyGlobalRegistry = await chainService.getPPTokenRegistryContract(oldPPTokenRegistryAddress);

      await chainService.getEventsFromBlock(oldPrivatePropertyGlobalRegistry, ChainServiceEvents.NewPrivatePropertyRegistry, 0).then(async (events) => {
        await pIteration.forEachSeries(events, async (e) => {
          await subscribeToPrivatePropertyRegistry(e.returnValues.token, true, lastBlockNumber);
          return geoDataService.handleNewPrivatePropertyRegistryEvent(e);
        });
      });
    });

    await chainService.getEventsFromBlock(chainService.privatePropertyGlobalRegistry, ChainServiceEvents.NewPrivatePropertyRegistry, 0).then(async (events) => {
      await pIteration.forEachSeries(events, async (e) => {
        await subscribeToPrivatePropertyRegistry(e.returnValues.token, e.returnValues.token.toLowerCase() === '0x6a3ABb1d426243756F301dD5beA4aa4f3C1Ec3aF'.toLowerCase(), lastBlockNumber);
        return geoDataService.handleNewPrivatePropertyRegistryEvent(e);
      });
    });

    chainService.subscribeForNewEvents(chainService.privatePropertyGlobalRegistry, ChainServiceEvents.NewPrivatePropertyRegistry, startBlockNumber, async (err, newEvent) => {
      subscribeToPrivatePropertyRegistry(newEvent.returnValues.token, newEvent.returnValues.token.toLowerCase() === '0x6a3ABb1d426243756F301dD5beA4aa4f3C1Ec3aF'.toLowerCase(), lastBlockNumber);
      await geoDataService.handleNewPrivatePropertyRegistryEvent(newEvent);
      await setLastBlockNumber(newEvent.blockNumber);
    });

    async function subscribeToPrivatePropertyRegistry (address, old = false, fromBlockNumber = null) {
      address = address.toLowerCase();
      if(subscribedToPrivatePropertyRegistry[address]) {
        return;
      }
      log('📢 Subscribed to Private Property Registry:', address);

      let subscribeFromBlockNumber = fromBlockNumber > startBlockNumber ? fromBlockNumber : startBlockNumber;

      subscribedToPrivatePropertyRegistry[address] = true;

      const subscriptions = [];
      function addSubscription(subscription) {
        subscriptions.push(subscription);
      }
      function unsubscribe() {
        subscriptions.forEach(subscription => {
          if(!subscription) {
            return;
          }
          subscription.unsubscribe();
        });
        subscribedToPrivatePropertyRegistry[address] = false;
      }
      const contract = chainService.getPropertyRegistryContract(address, old);

      const ppr = await geoDataService.getPrivatePropertyRegistry(address);

      const owner = await chainService.callContractMethod(contract, 'owner', []);

      if(owner === '0x0000000000000000000000000000000000000000') {
        return;
      }

      const controllerAddress = await await chainService.callContractMethod(contract, 'controller', []).catch(() => null);

      let controllerContract;
      let contourVerificationAddress = '';
      let verificationContract;

      if (controllerAddress) {
        controllerContract = chainService.getPropertyRegistryControllerContract(controllerAddress, old);

        const contourVerificationAddress = await await chainService.callContractMethod(controllerContract, 'contourVerificationManager', []);
        if(contourVerificationAddress !== '0x0000000000000000000000000000000000000000') {
          verificationContract = chainService.getPropertyRegistryVerificationContract(contourVerificationAddress);
        }
      }

      log('SetSpaceTokenContour');
      await chainService.getEventsFromBlock(contract, ChainServiceEvents.SetSpaceTokenContour, fromBlockNumber).then(async (events) => {
        await pIteration.forEach(events, async (e) => {
          log('handleChangeSpaceTokenDataEvent');
          await geoDataService.handleChangeSpaceTokenDataEvent(address, e);
          log('handlePrivatePropertyBurnTimeoutEvent');
          await geoDataService.handlePrivatePropertyBurnTimeoutEvent(address, {
            contractAddress: controllerAddress,
            returnValues: e.returnValues
          });
          log('handleChangeContourEvent');
          return geohashService.handleChangeContourEvent(e);
        });
      });

      log('SetPrivatePropertyDetails');
      await chainService.getEventsFromBlock(contract, ChainServiceEvents.SetPrivatePropertyDetails, fromBlockNumber).then(async (events) => {
        await pIteration.forEach(events, (e) => {
          return geoDataService.handleChangeSpaceTokenDataEvent(address, e);
        });
      });

      log('SpaceTokenTransfer');
      await chainService.getEventsFromBlock(contract, ChainServiceEvents.SpaceTokenTransfer, fromBlockNumber).then(async (events) => {
        await pIteration.forEach(events, async (e) => {
          await geoDataService.handleChangeSpaceTokenDataEvent(address, e);
          return geoDataService.updatePrivatePropertyRegistry(address);
        });
      });

      log('BurnPrivatePropertyToken');
      await chainService.getEventsFromBlock(contract, ChainServiceEvents.BurnPrivatePropertyToken, fromBlockNumber).then(async (events) => {
        await pIteration.forEach(events, async (e) => {
          await geoDataService.handleChangeSpaceTokenDataEvent(address, e);
          return geoDataService.updatePrivatePropertyRegistry(address);
        });
      });

      addSubscription(chainService.subscribeForNewEvents(contract, ChainServiceEvents.SetSpaceTokenContour, subscribeFromBlockNumber, async (err, newEvent) => {
        await geohashService.handleChangeContourEvent(newEvent);
        await geoDataService.handleChangeSpaceTokenDataEvent(address, newEvent);
        await geoDataService.handlePrivatePropertyBurnTimeoutEvent(address, {
          contractAddress: controllerAddress,
          returnValues: newEvent.returnValues
        });
        let tokenId: string = newEvent.returnValues['id'] || newEvent.returnValues['_tokenId'] || newEvent.returnValues['tokenId'] || newEvent.returnValues['_spaceTokenId'] || newEvent.returnValues['spaceTokenId'] || newEvent.returnValues['privatePropertyId'];
        await geoDataService.updatePrivatePropertyPledge(address, tokenId);
        await setLastBlockNumber(newEvent.blockNumber);
      }));

      await chainService.getEventsFromBlock(contract, ChainServiceEvents.PrivatePropertySetExtraData, fromBlockNumber).then(async (events) => {
        await pIteration.forEach(events, async (e) => {
          return geoDataService.updatePrivatePropertyPledge(address, e.returnValues['propertyId']);
        });
      });

      addSubscription(chainService.subscribeForNewEvents(contract, ChainServiceEvents.PrivatePropertySetExtraData, subscribeFromBlockNumber, async (err, newEvent) => {
        await geoDataService.updatePrivatePropertyPledge(address, newEvent.returnValues['propertyId']);
        await setLastBlockNumber(newEvent.blockNumber);
      }));

      addSubscription(chainService.subscribeForNewEvents(contract, ChainServiceEvents.SetPrivatePropertyDetails, subscribeFromBlockNumber, async (err, newEvent) => {
        await geoDataService.handleChangeSpaceTokenDataEvent(address, newEvent);
        await setLastBlockNumber(newEvent.blockNumber);
      }));

      addSubscription(chainService.subscribeForNewEvents(contract, ChainServiceEvents.SpaceTokenTransfer, subscribeFromBlockNumber, async (err, newEvent) => {
        await geoDataService.handleChangeSpaceTokenDataEvent(address, newEvent);
        await geoDataService.updatePrivatePropertyRegistry(address);
        await setLastBlockNumber(newEvent.blockNumber);
      }));

      addSubscription(chainService.subscribeForNewEvents(contract, ChainServiceEvents.BurnPrivatePropertyToken, subscribeFromBlockNumber, async (err, newEvent) => {
        await geoDataService.handleChangeSpaceTokenDataEvent(address, newEvent);
        await geoDataService.updatePrivatePropertyRegistry(address);
        await setLastBlockNumber(newEvent.blockNumber);
      }));

      await chainService.getEventsFromBlock(controllerContract, ChainServiceEvents.PrivatePropertyNewProposal, fromBlockNumber).then(async (events) => {
        await pIteration.forEach(events, async (e) => {
          return geoDataService.handlePrivatePropertyRegistryProposalEvent(address, e);
        });
      });

      log('PrivatePropertyNewProposal events done');

      addSubscription(chainService.subscribeForNewEvents(controllerContract, ChainServiceEvents.PrivatePropertyNewProposal, subscribeFromBlockNumber, async (err, newEvent) => {
        await geoDataService.handlePrivatePropertyRegistryProposalEvent(address, newEvent);
        await setLastBlockNumber(newEvent.blockNumber);
      }));

      await chainService.getEventsFromBlock(controllerContract, ChainServiceEvents.PrivatePropertyApproveProposal, fromBlockNumber).then(async (events) => {
        await pIteration.forEach(events, async (e) => {
          return geoDataService.handlePrivatePropertyRegistryProposalEvent(address, e);
        });
      });

      addSubscription(chainService.subscribeForNewEvents(controllerContract, ChainServiceEvents.PrivatePropertyApproveProposal, subscribeFromBlockNumber, async (err, newEvent) => {
        await geoDataService.handlePrivatePropertyRegistryProposalEvent(address, newEvent);
        await setLastBlockNumber(newEvent.blockNumber);
      }));

      addSubscription(await chainService.getEventsFromBlock(controllerContract, ChainServiceEvents.PrivatePropertyExecuteProposal, fromBlockNumber).then(async (events) => {
        await pIteration.forEach(events, async (e) => {
          return geoDataService.handlePrivatePropertyRegistryProposalEvent(address, e);
        });
      }));

      addSubscription(chainService.subscribeForNewEvents(controllerContract, ChainServiceEvents.PrivatePropertyExecuteProposal, subscribeFromBlockNumber, async (err, newEvent) => {
        await geoDataService.handlePrivatePropertyRegistryProposalEvent(address, newEvent);
        await setLastBlockNumber(newEvent.blockNumber);
      }));


      await chainService.getEventsFromBlock(controllerContract, ChainServiceEvents.PrivatePropertyRejectProposal, fromBlockNumber).then(async (events) => {
        await pIteration.forEach(events, async (e) => {
          return geoDataService.handlePrivatePropertyRegistryProposalEvent(address, e);
        });
      });

      addSubscription(chainService.subscribeForNewEvents(controllerContract, ChainServiceEvents.PrivatePropertyRejectProposal, subscribeFromBlockNumber, async (err, newEvent) => {
        await geoDataService.handlePrivatePropertyRegistryProposalEvent(address, newEvent);
        await setLastBlockNumber(newEvent.blockNumber);
      }));

      await chainService.getEventsFromBlock(controllerContract, ChainServiceEvents.SetPrivatePropertyBurnTimeout, fromBlockNumber).then(async (events) => {
        await pIteration.forEach(events, async (e) => {
          return geoDataService.handlePrivatePropertyBurnTimeoutEvent(address, e);
        });
      });

      await chainService.getEventsFromBlock(controllerContract, ChainServiceEvents.InitiatePrivatePropertyBurnTimeout, fromBlockNumber).then(async (events) => {
        await pIteration.forEach(events, async (e) => {
          return geoDataService.handlePrivatePropertyBurnTimeoutEvent(address, e);
        });
      });

      await chainService.getEventsFromBlock(controllerContract, ChainServiceEvents.CancelPrivatePropertyBurnTimeout, fromBlockNumber).then(async (events) => {
        await pIteration.forEach(events, async (e) => {
          return geoDataService.handlePrivatePropertyBurnTimeoutEvent(address, e);
        });
      });

      addSubscription(chainService.subscribeForNewEvents(controllerContract, ChainServiceEvents.SetPrivatePropertyBurnTimeout, subscribeFromBlockNumber, async (err, newEvent) => {
        await geoDataService.handlePrivatePropertyBurnTimeoutEvent(address, newEvent);
        await geoDataService.updatePrivatePropertyRegistry(address);
        await setLastBlockNumber(newEvent.blockNumber);
      }));

      addSubscription(chainService.subscribeForNewEvents(controllerContract, ChainServiceEvents.InitiatePrivatePropertyBurnTimeout, subscribeFromBlockNumber, async (err, newEvent) => {
        await geoDataService.handlePrivatePropertyBurnTimeoutEvent(address, newEvent);
        await geoDataService.updatePrivatePropertyRegistry(address);
        await setLastBlockNumber(newEvent.blockNumber);
      }));

      addSubscription(chainService.subscribeForNewEvents(controllerContract, ChainServiceEvents.CancelPrivatePropertyBurnTimeout, subscribeFromBlockNumber, async (err, newEvent) => {
        await geoDataService.handlePrivatePropertyBurnTimeoutEvent(address, newEvent);
        await geoDataService.updatePrivatePropertyRegistry(address);
        await setLastBlockNumber(newEvent.blockNumber);
      }));

      await chainService.getEventsFromBlock(contract, ChainServiceEvents.PrivatePropertySetLegalAgreement, fromBlockNumber).then(async (events) => {
        await pIteration.forEach(events, async (e) => {
          return geoDataService.handlePrivatePropertyLegalAgreementEvent(address, e);
        });
      });

      addSubscription(chainService.subscribeForNewEvents(contract, ChainServiceEvents.PrivatePropertySetLegalAgreement, subscribeFromBlockNumber, async (err, newEvent) => {
        await geoDataService.handlePrivatePropertyLegalAgreementEvent(address, newEvent);
        await setLastBlockNumber(newEvent.blockNumber);
      }));

      await pIteration.forEachSeries(['PrivatePropertySetDataLink', 'PrivatePropertyTransferOwnership', 'PrivatePropertySetController'], async eventName => {
        await chainService.getEventsFromBlock(contract, ChainServiceEvents[eventName], fromBlockNumber).then(async (events) => {
          await pIteration.forEach(events, async (e) => {
            return geoDataService.updatePrivatePropertyRegistry(address);
          });
        });

        addSubscription(chainService.subscribeForNewEvents(contract, ChainServiceEvents[eventName], subscribeFromBlockNumber, async (err, newEvent) => {
          await geoDataService.updatePrivatePropertyRegistry(address);
          if(eventName === 'PrivatePropertySetController' && controllerAddress.toLowerCase() !== newEvent.returnValues.controller.toLowerCase()) {
            unsubscribe();
            return subscribeToPrivatePropertyRegistry(address, old, newEvent.blockNumber);
          }
          await setLastBlockNumber(newEvent.blockNumber);
        }));
      });

      await pIteration.forEachSeries(['PrivatePropertySetGeoDataManager', 'PrivatePropertySetFeeManager', 'PrivatePropertyTransferOwnership', 'PrivatePropertySetBurner', 'PrivatePropertySetMinter', 'PrivatePropertySetVerification'], async eventName => {
        await chainService.getEventsFromBlock(controllerContract, ChainServiceEvents[eventName], fromBlockNumber).then(async (events) => {
          await pIteration.forEach(events, async (e) => {
            return geoDataService.updatePrivatePropertyRegistry(address);
          });
        });

        addSubscription(chainService.subscribeForNewEvents(controllerContract, ChainServiceEvents[eventName], subscribeFromBlockNumber, async (err, newEvent) => {
          await geoDataService.updatePrivatePropertyRegistry(address);
          if(eventName === 'PrivatePropertySetVerification' && contourVerificationAddress.toLowerCase() !== newEvent.returnValues.contourVerificationManager.toLowerCase()) {
            unsubscribe();
            return subscribeToPrivatePropertyRegistry(address, old, newEvent.blockNumber);
          }
          await setLastBlockNumber(newEvent.blockNumber);
        }));
      });

      await pIteration.forEachSeries(['PrivatePropertyTransferOwnership'], async eventName => {
        await chainService.getEventsFromBlock(verificationContract, ChainServiceEvents[eventName], fromBlockNumber).then(async (events) => {
          await pIteration.forEach(events, async (e) => {
            return geoDataService.updatePrivatePropertyRegistry(address);
          });
        });

        addSubscription(chainService.subscribeForNewEvents(verificationContract, ChainServiceEvents[eventName], subscribeFromBlockNumber, async (err, newEvent) => {
          await geoDataService.updatePrivatePropertyRegistry(address);
          await setLastBlockNumber(newEvent.blockNumber);
        }));
      });

      await pIteration.forEachSeries(['PrivatePropertyEnableVerification', 'PrivatePropertyDisableVerification'], async eventName => {
        await chainService.getEventsFromBlock(verificationContract, ChainServiceEvents[eventName], fromBlockNumber).then(async (events) => {
          await pIteration.forEach(events, async (e) => {
            return geoDataService.handlePrivatePropertyPledgeBurnTimeoutEvent(address, e);
          });
        });

        addSubscription(chainService.subscribeForNewEvents(verificationContract, ChainServiceEvents[eventName], subscribeFromBlockNumber, async (err, newEvent) => {
          await geoDataService.handlePrivatePropertyPledgeBurnTimeoutEvent(address, newEvent);
          await setLastBlockNumber(newEvent.blockNumber);
        }));
      });

      let mediatorContract;
      let mediatorType;
      if(ppr && ppr.isBridgetForeign && ppr.foreignMediator && ppr.foreignMediator !== '0x0000000000000000000000000000000000000000') {
        mediatorType = 'foreign';
        mediatorContract = chainService.getMediatorContract(ppr.foreignMediator, mediatorType);
      }
      if(ppr && ppr.isBridgetHome && ppr.homeMediator && ppr.homeMediator !== '0x0000000000000000000000000000000000000000') {
        mediatorType = 'home';
        mediatorContract = chainService.getMediatorContract(ppr.homeMediator, mediatorType);
      }

      await pIteration.forEachSeries(['PPMediatorSetOtherSide'], async eventName => {
        await chainService.getEventsFromBlock(mediatorContract, ChainServiceEvents[eventName], fromBlockNumber).then(async (events) => {
          await pIteration.forEach(events, async (e) => {
            return geoDataService.handleMediatorSet(address, e, mediatorType);
          });
        });

        addSubscription(chainService.subscribeForNewEvents(mediatorContract, ChainServiceEvents[eventName], subscribeFromBlockNumber, async (err, newEvent) => {
          await geoDataService.handleMediatorSet(address, newEvent, mediatorType);
          await setLastBlockNumber(newEvent.blockNumber);
        }));
      });
    }

    await chainService.getEventsFromBlock(chainService.ppDepositHolder, ChainServiceEvents.PPDepositHolderDeposit, lastBlockNumber).then(async (events) => {
      await pIteration.forEach(events, (e) => {
        return geoDataService.handlePrivatePropertyPledgeChangeEvent(e)
      });
    });

    chainService.subscribeForNewEvents(chainService.ppDepositHolder, ChainServiceEvents.PPDepositHolderDeposit, startBlockNumber, async (err, newEvent) => {
      await geoDataService.handlePrivatePropertyPledgeChangeEvent(newEvent);
      await setLastBlockNumber(newEvent.blockNumber);
    });

    await chainService.getEventsFromBlock(chainService.ppDepositHolder, ChainServiceEvents.PPDepositHolderWithdraw, lastBlockNumber).then(async (events) => {
      await pIteration.forEach(events, (e) => {
        return geoDataService.handlePrivatePropertyPledgeChangeEvent(e)
      });
    });

    chainService.subscribeForNewEvents(chainService.ppDepositHolder, ChainServiceEvents.PPDepositHolderWithdraw, startBlockNumber, async (err, newEvent) => {
      await geoDataService.handlePrivatePropertyPledgeChangeEvent(newEvent);
      await setLastBlockNumber(newEvent.blockNumber);
    });

    await chainService.getEventsFromBlock(chainService.ppHomeMediatorFactory, ChainServiceEvents.PPMediatorNew, lastBlockNumber).then(async (events) => {
      await pIteration.forEach(events, (e) => {
        return geoDataService.handleMediatorCreation(e, 'home')
      });
    });

    chainService.subscribeForNewEvents(chainService.ppHomeMediatorFactory, ChainServiceEvents.PPMediatorNew, startBlockNumber, async (err, newEvent) => {
      await geoDataService.handleMediatorCreation(newEvent, 'home');
      await setLastBlockNumber(newEvent.blockNumber);
    });

    await chainService.getEventsFromBlock(chainService.ppForeignMediatorFactory, ChainServiceEvents.PPMediatorNew, lastBlockNumber).then(async (events) => {
      await pIteration.forEach(events, (e) => {
        return geoDataService.handleMediatorCreation(e, 'foreign')
      });
    });

    chainService.subscribeForNewEvents(chainService.ppForeignMediatorFactory, ChainServiceEvents.PPMediatorNew, startBlockNumber, async (err, newEvent) => {
      await geoDataService.handleMediatorCreation(newEvent, 'foreign');
      await setLastBlockNumber(newEvent.blockNumber);
    });

    await chainService.getEventsFromBlock(chainService.privatePropertyMarket, ChainServiceEvents.SaleOrderStatusChanged, lastBlockNumber).then(async (events) => {
      await pIteration.forEach(events, (e) => {
        return geoDataService.handleSaleOrderEvent(e)
      });
    });

    await chainService.getEventsFromBlock(chainService.privatePropertyMarket, ChainServiceEvents.SaleOfferStatusChanged, lastBlockNumber).then(async (events) => {
      await pIteration.forEach(events, (e) => {
        return geoDataService.handleSaleOfferEvent(e)
      });
    });

    chainService.subscribeForNewEvents(chainService.privatePropertyMarket, ChainServiceEvents.SaleOrderStatusChanged, startBlockNumber, async (err, newEvent) => {
      await geoDataService.handleSaleOrderEvent(newEvent);
      await setLastBlockNumber(newEvent.blockNumber);
    });

    ['SaleOfferAskChanged', 'SaleOfferBidChanged', 'SaleOfferStatusChanged'].map((eventName) => {
      chainService.subscribeForNewEvents(chainService.privatePropertyMarket, ChainServiceEvents[eventName], startBlockNumber, async (err, newEvent) => {
        await geoDataService.handleSaleOfferEvent(newEvent);
        await setLastBlockNumber(newEvent.blockNumber);
      });
    });

    const subscribedToCommunity = {
      // communityAddress => bool
    };

    const subscribedToProposalManager = {
      // pmAddress => bool
    };

    log('last communityMockFactory:');
    await chainService.getEventsFromBlock(chainService.communityMockFactory, ChainServiceEvents.NewCommunity, 0).then(async (events) => {
      await pIteration.forEachSeries(events, async (e) => {
        const community = await geoDataService.handleNewCommunityEvent(e, false);
        return subscribeToCommunity(community.address, false);
      });
    });

    log('last communityFactory:');
    await chainService.getEventsFromBlock(chainService.communityFactory, ChainServiceEvents.NewCommunity, 0).then(async (events) => {
      await pIteration.forEachSeries(events, async (e) => {
        const community = await geoDataService.handleNewCommunityEvent(e, false);
        return subscribeToCommunity(community.address, false);
      });
    });

    log('new communityFactory:');
    chainService.subscribeForNewEvents(chainService.communityFactory, ChainServiceEvents.NewCommunity, startBlockNumber, async (err, newEvent) => {
      const community = await geoDataService.handleNewCommunityEvent(newEvent, false);
      await subscribeToCommunity(community.address, false);
      await setLastBlockNumber(newEvent.blockNumber);
    });

    log('last pprCommunityFactory:');
    await chainService.getEventsFromBlock(chainService.pprCommunityFactory, ChainServiceEvents.NewCommunity, 0).then(async (events) => {
      await pIteration.forEachSeries(events, async (e) => {
        const community = await geoDataService.handleNewCommunityEvent(e, true);
        return subscribeToCommunity(community.address, true);
      });
    });

    log('new pprCommunityFactory:');
    chainService.subscribeForNewEvents(chainService.pprCommunityFactory, ChainServiceEvents.NewCommunity, startBlockNumber, async (err, newEvent) => {
      const community = await geoDataService.handleNewCommunityEvent(newEvent, true);
      await subscribeToCommunity(community.address, true);
      await setLastBlockNumber(newEvent.blockNumber);
    });
    log('community done');

    async function subscribeToCommunity (address, isPpr) {
      address = address.toLowerCase();
      if(subscribedToCommunity[address]) {
        return;
      }

      log('📢 Subscribed to Community:', address);

      subscribedToCommunity[address] = true;

      const contractRa = await chainService.getCommunityRaContract(address, isPpr);

      const registryAddress = await chainService.callContractMethod(contractRa, 'fundRegistry', []);

      const registryContract = await chainService.getCommunityFundRegistryContract(registryAddress);

      const storageAddress = await chainService.callContractMethod(registryContract, 'getStorageAddress', []);

      const contractStorage = await chainService.getCommunityStorageContract(storageAddress, isPpr);

      await chainService.getEventsFromBlock(contractRa, ChainServiceEvents.CommunityMint, lastBlockNumber).then(async (events) => {
        await pIteration.forEach(events, async (e) => {
          await geoDataService.handleCommunityMintEvent(address, e, isPpr);
        });
      });

      await chainService.getEventsFromBlock(contractRa, ChainServiceEvents.CommunityBurn, lastBlockNumber).then(async (events) => {
        await pIteration.forEach(events, (e) => {
          return geoDataService.handleCommunityBurnEvent(address, e, isPpr);
        });
      });

      await chainService.getEventsFromBlock(contractRa, ChainServiceEvents.CommunityTransferReputation, lastBlockNumber).then(async (events) => {
        await pIteration.forEach(events, (e) => {
          return geoDataService.handleCommunityTransferReputationEvent(address, e, isPpr);
        });
      });

      await chainService.getEventsFromBlock(contractRa, ChainServiceEvents.CommunityRevokeReputation, lastBlockNumber).then(async (events) => {
        await pIteration.forEach(events, (e) => {
          return geoDataService.handleCommunityRevokeReputationEvent(address, e, isPpr);
        });
      });

      chainService.subscribeForNewEvents(contractRa, ChainServiceEvents.CommunityMint, startBlockNumber, async (err, newEvent) => {
        await geoDataService.handleCommunityMintEvent(address, newEvent, isPpr);
        await setLastBlockNumber(newEvent.blockNumber);
      });

      chainService.subscribeForNewEvents(contractRa, ChainServiceEvents.CommunityBurn, startBlockNumber, async (err, newEvent) => {
        await geoDataService.handleCommunityBurnEvent(address, newEvent, isPpr);
        await setLastBlockNumber(newEvent.blockNumber);
      });

      chainService.subscribeForNewEvents(contractRa, ChainServiceEvents.CommunityRevokeReputation, startBlockNumber, async (err, newEvent) => {
        await geoDataService.handleCommunityRevokeReputationEvent(address, newEvent, isPpr);
        await setLastBlockNumber(newEvent.blockNumber);
      });

      chainService.subscribeForNewEvents(contractRa, ChainServiceEvents.CommunityTransferReputation, startBlockNumber, async (err, newEvent) => {
        await geoDataService.handleCommunityTransferReputationEvent(address, newEvent, isPpr);
        await setLastBlockNumber(newEvent.blockNumber);
      });

      let proposalManagersAddresses = [];

      await chainService.getEventsFromBlock(contractStorage, ChainServiceEvents.CommunityAddMarker, 0).then(async (events) => {
        await pIteration.forEach(events, async (e) => {
          proposalManagersAddresses.push(e.returnValues.proposalManager.toLowerCase());
          await geoDataService.handleCommunityAddVotingEvent(address, e);
        });
      });

      await chainService.getEventsFromBlock(contractStorage, ChainServiceEvents.CommunityRemoveMarker, lastBlockNumber).then(async (events) => {
        await pIteration.forEach(events, (e) => {
          return geoDataService.handleCommunityRemoveVotingEvent(address, e);
        });
      });

      proposalManagersAddresses = _.uniq(proposalManagersAddresses);
      log('proposalManagersAddresses.length', proposalManagersAddresses.length);
      await pIteration.forEachSeries(proposalManagersAddresses, pmAddress => subscribeToCommunityProposalManager(address, pmAddress));

      chainService.subscribeForNewEvents(contractStorage, ChainServiceEvents.CommunityAddMarker, startBlockNumber, async (err, newEvent) => {
        subscribeToCommunityProposalManager(address, newEvent.returnValues.proposalManager.toLowerCase());
        await geoDataService.handleCommunityAddVotingEvent(address, newEvent);
        await setLastBlockNumber(newEvent.blockNumber);
      });

      chainService.subscribeForNewEvents(contractStorage, ChainServiceEvents.CommunityRemoveMarker, startBlockNumber, async (err, newEvent) => {
        await geoDataService.handleCommunityRemoveVotingEvent(address, newEvent);
        await setLastBlockNumber(newEvent.blockNumber);
      });

      await chainService.getEventsFromBlock(contractStorage, ChainServiceEvents.CommunityAddRule, lastBlockNumber).then(async (events) => {
        await pIteration.forEach(events, async (e) => {
          await geoDataService.handleCommunityRuleEvent(address, e);
        });
      });

      chainService.subscribeForNewEvents(contractStorage, ChainServiceEvents.CommunityAddRule, startBlockNumber, async (err, newEvent) => {
        await geoDataService.handleCommunityRuleEvent(address, newEvent);
        await setLastBlockNumber(newEvent.blockNumber);
      });

      await chainService.getEventsFromBlock(contractStorage, ChainServiceEvents.CommunityRemoveRule, lastBlockNumber).then(async (events) => {
        await pIteration.forEach(events, async (e) => {
          await geoDataService.handleCommunityRuleEvent(address, e);
        });
      });

      chainService.subscribeForNewEvents(contractStorage, ChainServiceEvents.CommunityRemoveRule, startBlockNumber, async (err, newEvent) => {
        await geoDataService.handleCommunityRuleEvent(address, newEvent);
        await setLastBlockNumber(newEvent.blockNumber);
      });

      await chainService.getEventsFromBlock(contractStorage, ChainServiceEvents.CommunityApproveToken, lastBlockNumber).then(async (events) => {
        await pIteration.forEach(events, async (e) => {
          await geoDataService.handleCommunityTokenApprovedEvent(address, e);
        });
      });

      chainService.subscribeForNewEvents(contractStorage, ChainServiceEvents.CommunityApproveToken, startBlockNumber, async (err, newEvent) => {
        await geoDataService.handleCommunityTokenApprovedEvent(address, newEvent);
        await setLastBlockNumber(newEvent.blockNumber);
      });

      await chainService.getEventsFromBlock(contractStorage, ChainServiceEvents.CommunityExpelToken, lastBlockNumber).then(async (events) => {
        await pIteration.forEach(events, async (e) => {
          await geoDataService.handleCommunityTokenApprovedEvent(address, e);
        });
      });

      chainService.subscribeForNewEvents(contractStorage, ChainServiceEvents.CommunityExpelToken, startBlockNumber, async (err, newEvent) => {
        await geoDataService.handleCommunityTokenApprovedEvent(address, newEvent);
        await setLastBlockNumber(newEvent.blockNumber);
      });
    }

    async function subscribeToCommunityProposalManager(communityAddress, proposalManagerAddress) {
      proposalManagerAddress = proposalManagerAddress.toLowerCase();
      if(subscribedToProposalManager[proposalManagerAddress]) {
        return;
      }
      subscribedToProposalManager[proposalManagerAddress] = true;

      const contractPm = await chainService.getCommunityProposalManagerContract(proposalManagerAddress);
      console.log('contractPm', proposalManagerAddress);

      await chainService.getEventsFromBlock(contractPm, ChainServiceEvents.CommunityNewProposal, lastBlockNumber).then(async (events) => {
        await pIteration.forEach(events, async (e) => {
          // log('CommunityNewProposal', _.pick(e,['contractAddress', 'returnValues']));
          await geoDataService.handleCommunityAddProposalEvent(communityAddress, e);
        });
      });

      chainService.subscribeForNewEvents(contractPm, ChainServiceEvents.CommunityNewProposal, startBlockNumber, async (err, newEvent) => {
        await geoDataService.handleCommunityAddProposalEvent(communityAddress, newEvent);
        await setLastBlockNumber(newEvent.blockNumber);
      });

      await chainService.getEventsFromBlock(contractPm, ChainServiceEvents.CommunityAyeProposal, lastBlockNumber).then(async (events) => {
        await pIteration.forEach(events, async (e) => {
          // log('CommunityAyeProposal', _.pick(e,['contractAddress', 'returnValues']));
          await geoDataService.handleCommunityUpdateProposalEvent(communityAddress, e);
        });
      });

      await chainService.getEventsFromBlock(contractPm, ChainServiceEvents.CommunityNayProposal, lastBlockNumber).then(async (events) => {
        await pIteration.forEach(events, async (e) => {
          // log('CommunityNayProposal', _.pick(e,['contractAddress', 'returnValues']));
          await geoDataService.handleCommunityUpdateProposalEvent(communityAddress, e);
        });
      });

      chainService.subscribeForNewEvents(contractPm, ChainServiceEvents.CommunityAyeProposal, startBlockNumber, async (err, newEvent) => {
        await geoDataService.handleCommunityUpdateProposalEvent(communityAddress, newEvent);
        await setLastBlockNumber(newEvent.blockNumber);
      });

      chainService.subscribeForNewEvents(contractPm, ChainServiceEvents.CommunityNayProposal, startBlockNumber, async (err, newEvent) => {
        await geoDataService.handleCommunityUpdateProposalEvent(communityAddress, newEvent);
        await setLastBlockNumber(newEvent.blockNumber);
      });

      await chainService.getEventsFromBlock(contractPm, ChainServiceEvents.CommunityApprovedProposal, lastBlockNumber).then(async (events) => {
        await pIteration.forEach(events, async (e) => {
          await geoDataService.handleCommunityUpdateProposalEvent(communityAddress, e);
        });
      });

      chainService.subscribeForNewEvents(contractPm, ChainServiceEvents.CommunityApprovedProposal, startBlockNumber, async (err, newEvent) => {
        await geoDataService.handleCommunityUpdateProposalEvent(communityAddress, newEvent);
        await setLastBlockNumber(newEvent.blockNumber);
      });
    }

    // const contour = await database.getContourBySpaceTokenId(2,'0x6a3ABb1d426243756F301dD5beA4aa4f3C1Ec3aF');
    // log('contour', contour);

    // log('events finish');
    // const byParentGeohashResult = await geohashService.getContoursByParentGeohash('w24q8r', chainService.spaceGeoData._address);
    // log('byParentGeohashResult for w24q8r', byParentGeohashResult);
    //
    // const byInnerGeohashResult = await geohashService.getContoursByInnerGeohash('w24q8xwfk4u3', chainService.spaceGeoData._address);
    // log('byInnerGeohashResult after for w24q8xwfk4u3', byInnerGeohashResult);

    // const spaceTokens = await geoDataService.filterSpaceTokens({
    //   // owner: "0xf0430bbb78C3c359c22d4913484081A563B86170",
    //   contractAddress: '0xC8c42c67A624dcFEDEF6b8733f9F3E7a89a54890'
    // });
    // log('spaceTokens.list', spaceTokens.list.map(s => s.level));
    //
    // const orders = await geoDataService.filterOrders({
    //   contractAddress: "0x2D026485A629C1e08AF5493959C2657844EB053a",
    //   statusName: "inactive",
    //   landAreaMin: 3000,
      // contractAddress: "0x24c03a7A07257231A6E3c941bCec54C039112af4",
      // surroundingsGeohashBox: ['dpzpufr']
      // surroundingsGeohashBox: ["9q534","9q535","9q53h","9q53j","9q53n","9q53p","9q590","9q591","9q594","9q595","9q59h","9q59j","9q536","9q537","9q53k","9q53m","9q53q","9q53r","9q592","9q593","9q596","9q597","9q59k","9q59m","9q53d","9q53e","9q53s","9q53t","9q53w","9q53x","9q598","9q599","9q59d","9q59e","9q59s","9q59t","9q53f","9q53g","9q53u","9q53v","9q53y","9q53z","9q59b","9q59c","9q59f","9q59g","9q59u","9q59v","9q564","9q565","9q56h","9q56j","9q56n","9q56p","9q5d0","9q5d1","9q5d4","9q5d5","9q5dh","9q5dj","9q566","9q567","9q56k","9q56m","9q56q","9q56r","9q5d2","9q5d3","9q5d6","9q5d7","9q5dk","9q5dm"],
      // limit: 2
      // types: ['land'],
      // sortBy: 'createdAt',
      // sortDir: 'desc',
      //
      // subtypes: ['beachLot'],
      // bedroomsCountMin: 3,
      // features: ['greatViews']//, 'securitySystem', 'dishwasher', 'greatViews', 'securitySystem'
    // });
    // log('found orders', orders.list.map(order => order.spaceTokens[0].tokenType));


    // const applications = await geoDataService.filterApplications({
      //   // landAreaMin: 3000,
      //   // surroundingsGeohashBox: ['dpzpufr']
      //   // surroundingsGeohashBox: ['9q598'],
      //   // limit: 2
      //   types: ['land'],
      //
      //   availableRoles: ['PM_LAWYER_ORACLE_TYPE', 'PM_SURVEYOR_ORACLE_TYPE'],
      //   bedroomsCountMin: 3,
      // features: ['greatViews']//, 'securitySystem', 'dishwasher', 'greatViews', 'securitySystem'
      // applicantAddress: '0xf0430bbb78C3c359c22d4913484081A563B86170'
    // });
    // log('found orders', applications.list.length, applications.total);

    // const offers = await geoDataService.filterSaleOffers({
    //   // seller: "0xf0430bbb78C3c359c22d4913484081A563B86170",
    //   contractAddress: "0xeECba3489A459c265047552f2AE71D3BdBD295dF",
    //   // excludeOrderIds: [],
    //   // includeOrderIds: ["1"],
    //   includeOrders: true,
    //   sortBy: "createdAtBlock",
    //   // landAreaMin: 100
    //
    //   // excludeOrderIds: ['2'],
    //   // includeOrders: true
    //   // limit: 100
    // });
    // log('found offers', offers.list.map(o => [o.orderId, o.order.typesSubtypesArray, o.order.sumLandArea]));

    // const spaceTokens = await geohashService.getContoursByParentGeohashArray(["dr4w","dr4y","dr5n","dr5q","dr5w","dr5y","dr4x","dr4z","dr5p","dr5r","dr5x","dr5z","dr68","dr6b","dr70","dr72","dr78","dr7b"]);
    // log('found spaceTokens', spaceTokens.map(st => st.contour[0]));

    //curl 'https://geo-explorer.testnet.galtproject.io:33440/v1/contours/by/parent-geohash' -H 'Connection: keep-alive' -H 'Accept: application/json, text/plain, */*' -H 'Origin: http://localhost:8081' -H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.87 Safari/537.36' -H 'Content-Type: application/json;charset=UTF-8' -H 'Sec-Fetch-Site: cross-site' -H 'Sec-Fetch-Mode: cors' -H 'Referer: http://localhost:8081/' -H 'Accept-Encoding: gzip, deflate, br' -H 'Accept-Language: en,en-US;q=0.9,ru;q=0.8' --data-binary '{"geohashes":["dr4w","dr4y","dr5n","dr5q","dr5w","dr5y","dr4x","dr4z","dr5p","dr5r","dr5x","dr5z","dr68","dr6b","dr70","dr72","dr78","dr7b"]}' --compressed
    // curl 'https://geo-explorer.testnet.galtproject.io:33440/v1/space-tokens/search' -H 'Connection: keep-alive' -H 'Accept: application/json, text/plain, */*' -H 'Origin: http://localhost:8081' -H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.87 Safari/537.36' -H 'Content-Type: application/json;charset=UTF-8' -H 'Sec-Fetch-Site: cross-site' -H 'Sec-Fetch-Mode: cors' -H 'Referer: http://localhost:8081/' -H 'Accept-Encoding: gzip, deflate, br' -H 'Accept-Language: en,en-US;q=0.9,ru;q=0.8' --data-binary '{"surroundingsGeohashBox":,"limit":10,"sortBy":"levelNumber","sortDir":"ASC","groupBy":"levelNumber"}' --compressed
    // const spaceTokens = await geoDataService.filterSpaceTokens({
    // surroundingsGeohashBox: ["dr5ren","dr5req","dr5rew","dr5rey","dr5rsn","dr5rsq","dr5rsw","dr5rsy","dr5rtn","dr5rtq","dr5rtw","dr5rty","dr5rwn","dr5rwq","dr5rep","dr5rer","dr5rex","dr5rez","dr5rsp","dr5rsr","dr5rsx","dr5rsz","dr5rtp","dr5rtr","dr5rtx","dr5rtz","dr5rwp","dr5rwr","dr5rg0","dr5rg2","dr5rg8","dr5rgb","dr5ru0","dr5ru2","dr5ru8","dr5rub","dr5rv0","dr5rv2","dr5rv8","dr5rvb","dr5ry0","dr5ry2","dr5rg1","dr5rg3","dr5rg9","dr5rgc","dr5ru1","dr5ru3","dr5ru9","dr5ruc","dr5rv1","dr5rv3","dr5rv9","dr5rvc","dr5ry1","dr5ry3","dr5rg4","dr5rg6","dr5rgd","dr5rgf","dr5ru4","dr5ru6","dr5rud","dr5ruf","dr5rv4","dr5rv6","dr5rvd","dr5rvf","dr5ry4","dr5ry6","dr5rg5","dr5rg7","dr5rge","dr5rgg","dr5ru5","dr5ru7","dr5rue","dr5rug","dr5rv5","dr5rv7","dr5rve","dr5rvg","dr5ry5","dr5ry7","dr5rgh","dr5rgk","dr5rgs","dr5rgu","dr5ruh","dr5ruk","dr5rus","dr5ruu","dr5rvh","dr5rvk","dr5rvs","dr5rvu","dr5ryh","dr5ryk","dr5rgj","dr5rgm","dr5rgt","dr5rgv","dr5ruj","dr5rum","dr5rut","dr5ruv","dr5rvj","dr5rvm","dr5rvt","dr5rvv","dr5ryj","dr5rym"]
    // //   contractAddress: "0x2c174a91573C4Fbcf3A0091c95B212C260bB1ef4",
    // //   sortBy: 'levelNumber',
    // //   sortDir: 'desc',
    // //   groupBy: 'levelNumber'
    // });
    // log('found spaceTokens', spaceTokens.list.map(st => st));

    // const approvedCommunities = await geoDataService.filterCommunitiesWithApprovedTokens({
    //   tokenOwner: '0xf0430bbb78C3c359c22d4913484081A563B86170'
    // });

    // log('found approved', JSON.stringify(
    //   approvedCommunities.list
    // , null, 2));

    // const communityTokenOwnersCount = await database.filterCommunityTokensCount({
    //   groupBy: 'owner',
    //   communityAddress: '0x57643B519b92fF772068136177A47C8f68cB943C'
    //     // surroundingsGeohashBox: ["dr5n6","dr5n7","dr5nk","dr5nm","dr5nq","dr5nr","dr5q2","dr5q3","dr5q6","dr5q7","dr5qk","dr5qm","dr5qq","dr5qr","dr5w2","dr5w3","dr5w6","dr5w7","dr5wk","dr5wm","dr5wq","dr5nd","dr5ne","dr5ns","dr5nt","dr5nw","dr5nx","dr5q8","dr5q9","dr5qd","dr5qe","dr5qs","dr5qt","dr5qw","dr5qx","dr5w8","dr5w9","dr5wd","dr5we","dr5ws","dr5wt","dr5ww","dr5nf","dr5ng","dr5nu","dr5nv","dr5ny","dr5nz","dr5qb","dr5qc","dr5qf","dr5qg","dr5qu","dr5qv","dr5qy","dr5qz","dr5wb","dr5wc","dr5wf","dr5wg","dr5wu","dr5wv","dr5wy","dr5p4","dr5p5","dr5ph","dr5pj","dr5pn","dr5pp","dr5x0","dr5x1","dr5x4","dr5x5","dr5xh","dr5xj","dr5xn","dr5p6","dr5p7","dr5pk","dr5pm","dr5pq","dr5pr","dr5x2","dr5x3","dr5x6","dr5x7","dr5xk","dr5xm","dr5xq","dr5pd","dr5pe","dr5ps","dr5pt","dr5pw","dr5px","dr5x8","dr5x9","dr5xd","dr5xe","dr5xs","dr5xt","dr5xw","dr5pf","dr5pg","dr5pu","dr5pv","dr5py","dr5pz","dr5xb","dr5xc","dr5xf","dr5xg","dr5xu","dr5xv","dr5xy","dr704","dr705","dr70h","dr70j","dr70n","dr70p","dr720","dr721","dr724","dr725","dr72h","dr72j","dr72n","dr72p","dr780","dr781","dr784","dr785","dr78h","dr78j","dr78n","dr706","dr707","dr70k","dr70m","dr70q","dr70r","dr722","dr723","dr726","dr727","dr72k","dr72m","dr72q","dr72r","dr782","dr783","dr786","dr787","dr78k","dr78m","dr78q","dr70d","dr70e","dr70s","dr70t","dr70w","dr70x","dr728","dr729","dr72d","dr72e","dr72s","dr72t","dr72w","dr72x","dr788","dr789","dr78d","dr78e","dr78s","dr78t","dr78w","dr5r"]
    //     // surroundingsGeohashBox: ["dr5n6"]
    //   });
    //
    //   log('communityTokenOwnersCount', communityTokenOwnersCount);

    await setLastBlockNumber(startBlockNumber);

    setInterval(async () => {
      const timeoutProposals = await database.getAllTimeoutProposals();
      timeoutProposals.forEach(proposal => {
        geoDataService.updateCommunityProposal(proposal.communityAddress, proposal.pmAddress, proposal.marker, proposal.proposalId);
      })
    }, 60 * 1000);

    //todo: handle DeleteSpaceTokenGeoData
  }

  const server = await require('./api/')(geohashService, chainService, database, geoDataService, process.env.API_PORT || config.apiPort);
})();

