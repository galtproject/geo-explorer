/*
 * Copyright ©️ 2019 Galt•Project Society Construction and Terraforming Company
 * (Founded by [Nikolai Popeka](https://github.com/npopeka)
 *
 * Copyright ©️ 2019 Galt•Core Blockchain Company
 * (Founded by [Nikolai Popeka](https://github.com/npopeka) by
 * [Basic Agreement](ipfs/QmaCiXUmSrP16Gz8Jdzq6AJESY1EAANmmwha15uR3c1bsS)).
 */

import IExplorerDatabase from "../database/interface";

const assert = require('assert');

describe("databaseValues", function () {
  const debugDatabase = false;
  const databaseName = 'test_geo_explorer';

  let database: IExplorerDatabase;

  const databases = ['mysql', 'mysqlV2'];

  databases.forEach((databaseService) => {
    describe(databaseService + ' database', () => {
      before(async () => {
        database = await require('../database/' + databaseService)({
          name: databaseName,
          options: {logging: debugDatabase}
        });
      });

      after(async () => {
        await database.flushDatabase();
      });

      it("should set and get values correctly", async () => {
        assert.strictEqual(await database.getValue('test1'), null);

        await database.setValue('test1', 'test1Value');

        assert.strictEqual(await database.getValue('test1'), 'test1Value');

        await database.setValue('test1', 'test1ValueNew');

        assert.strictEqual(await database.getValue('test1'), 'test1ValueNew');

        assert.strictEqual(await database.getValue('test2'), null);

        await database.setValue('test2', 'test2Value');
        assert.strictEqual(await database.getValue('test2'), 'test2Value');

        assert.strictEqual(await database.getValue('test1'), 'test1ValueNew');

        await database.clearValue('test1');

        assert.strictEqual(await database.getValue('test1'), null);
        assert.strictEqual(await database.getValue('test2'), 'test2Value');

        await database.clearValue('test2');

        assert.strictEqual(await database.getValue('test2'), null);
      });
    });
  });
});
