import Lock from '../../models/Lock';
import mongoose from 'mongoose';
import Promise from 'bluebird';
require('../mongoose-helper');

import { LockNotOwnedException } from '../../lib/errors';


describe('Lock', () => {
  const imageUrl = 'http://ww.example.com';
  let items;
  let pairs;

  beforeEach(async () => {
    await Lock.deleteMany();
  });

  it('creates lock if it does not exist yet', async () => {
    await expect(Lock.estimatedDocumentCount()).resolves.toBe(0);
    await Lock.acquire('test', 'client');
    await expect(Lock.estimatedDocumentCount()).resolves.toBe(1);
  });


  it('deletes lock when releasing', async () => {
    const lock = await Lock.acquire('test', 'client');
    await expect(Lock.estimatedDocumentCount()).resolves.toBe(1);
    await lock.release();
    await expect(Lock.estimatedDocumentCount()).resolves.toBe(0);
  });

  it('distint locks can be acquired simultaneously', async () => {
    await Lock.acquire('test1', 'client');
    await Lock.acquire('test2', 'client');
    await expect(Lock.estimatedDocumentCount()).resolves.toBe(2);
  });

  it('can\'t release the same lock twice', async () => {
    let lock = await Lock.acquire('test', 'client')
    await lock.release();
    await expect(lock.release()).rejects.toThrow(LockNotOwnedException);
  });

  it('must be release by the same client', async () => {
    let lock2 = new Lock({ name: 'test', clientId: 'client1' });

    await Lock.acquire('test', 'client2');
    await expect(lock2.release()).rejects.toThrow(LockNotOwnedException);
  });

  it.skip('waits for the release of an acquired lock before acquiring', async () => {
    let acquireSpy = jest.spyOn(Lock, 'acquire');

    let lock1 = Lock.acquire('test', 'client1');
    await lock1;

    await expect(Lock.estimatedDocumentCount()).resolves.toBe(1);


    let lock2 = Lock.acquire('test', 'client2', { timeout: 500 });
    await lock2;
    await expect(Lock.findOne()).resolves.toHaveProperty('clientId', 'client1');
    await lock1.release();

    //await expect(Lock.estimatedDocumentCount()).resolves.toBe(1);
    //await expect(Lock.findOne()).resolves.toHaveProperty('clientId', 'client2');

    //await expect(acquireSpy).toHaveBeenCalledTimes(3);
  });


});
