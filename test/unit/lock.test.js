import Lock     from '../../models/Lock';
import mongoose from 'mongoose';
import sinon    from 'sinon';
import chai from 'chai';
import Promise  from 'bluebird';
import chaiAsPromised from 'chai-as-promised';
require('../mongoose-helper');

import {LockNotOwnedException} from '../../lib/errors';

chai.use(chaiAsPromised);
const expect = chai.expect;


describe('Lock', () => {
  const imageUrl = 'http://ww.example.com';
  let items;
  let pairs;

  beforeEach(() => {
    return Promise.join(
      Lock.remove().exec(),
    );
  });

  it('creates lock if it does not exist yet', () => {
    return expect(Lock.estimatedDocumentCount()).to.eventually.equal(0)
      .then(() => Lock.acquire('test', 'client'))
      .then(() => expect(Lock.estimatedDocumentCount()).to.eventually.equal(1));
  });


  it('deletes lock when releasing', () => {
    let lock;
    return Lock.acquire('test', 'client')
      .then(_l => {
        lock = _l;
        return expect(Lock.estimatedDocumentCount()).to.eventually.equal(1);
      })
      .then(() => lock.release())
      .then(() => expect(Lock.estimatedDocumentCount()).to.eventually.equal(0));
  });

  it('distint locks can be acquired simultaneously', () => {
    return Lock.acquire('test1', 'client')
      .then(() => Lock.acquire('test2', 'client'))
      .then(() => expect(Lock.estimatedDocumentCount()).to.eventually.equal(2));
  });

  it('can\'t release the same lock twice', () => {
    let lock;
    return Lock.acquire('test', 'client')
      .then(_l => {
        lock = _l;
        return lock.release();
      })
      .then(() => expect(lock.release()).to.be.eventually.rejectedWith(LockNotOwnedException));
  });

  it('must be release by the same client', () => {
    let lock2 = new Lock({name: 'test', clientId: 'client1'});

    return Lock.acquire('test', 'client2')
      .then(() => expect(lock2.release()).to.be.eventually.rejectedWith(LockNotOwnedException));
  });

  it('waits for the release of an acquired lock before acquiring', function(){
    let lock1;
    let lock2;
    let promise;


    let acquireSpy = sinon.spy(Lock, 'acquire');

    return Lock.acquire('test', 'client1')
      .then(_l => {
        lock1 = _l;
        return expect(Lock.estimatedDocumentCount()).to.eventually.equal(1);
      })
      .then(() => {
        promise = Lock.acquire('test', 'client2', {timeout: 500});
        expect(promise.isPending()).to.be.true;
        return expect(Lock.findOne()).to.eventually.have.property('clientId', 'client1');
      })
      .then(() => lock1.release())
      .then(() => promise) // wait for release promise to be fulfilled
      .then(() => expect(promise.isPending()).to.be.false)
      .then(() => expect(Lock.estimatedDocumentCount()).to.eventually.equal(1))
      .then(() => expect(Lock.findOne()).to.eventually.have.property('clientId', 'client2'))
      .then(() => expect(acquireSpy).to.have.been.calledThrice);
  });


});
