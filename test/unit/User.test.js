import User     from '../../models/User';
import sinon    from 'sinon';
import {expect} from 'chai';
require('../mongoose-helper');

describe('User', () => {
  let user;

  beforeEach(done => {
      user = new User({
        username: 'user1',
        password: '123456'
      });

      return done();
  });

  it('initializes with default values', () => {
  });

  it('#comparePassword', () => {
    it("should return false if there's no match", () => {
      expect(user.comparePassword('qwerty')).to.be.false();
    });

    it("should return true if there's a match", () => {
      expect(user.comparePassword('123456')).to.be.true();
    });
  });

  it('#calcPasswordHash', () => {
    const passwordHash = "$2a$10$FJJK8YSwJbA4vu4mtnmA3ukrLTxeWUCHX4F/z6Zj/3Jvuget.bSG2";
    user.save().then(() => {
      expect(user.password).to.equal(passwordHash);
    });
  });

});
