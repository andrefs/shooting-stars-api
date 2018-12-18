import User     from '../../models/User';
import chai from 'chai';
import sinonChai from 'sinon-chai';
chai.use(sinonChai);
import Promise  from 'bluebird';
import chaiAsPromised from 'chai-as-promised';
require('../mongoose-helper');

chai.use(chaiAsPromised);
const expect = chai.expect;

describe.only('User', () => {
  let user;

  beforeEach(() => {
    return Promise.join(
      User.remove().exec()
    )
    .then(() => {
      user = new User({
        username: 'user1',
        password: '123456'
      });
      // return user.save();
    });
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

  it('saves optional info', () => {
    const email = '  test@example.com  ';
    const birthYear = 1980;
    const gender = 'male';
    const topicKnowledge = 3;

    const user2 = new User({
      username: 'user2',
      password: '123456'
    });
    return user2.save()
      .then(user2 => user2.addOptionalInfo(
        email,
        gender,
        birthYear,
        topicKnowledge
      ))
      .then(user2 => {
        expect(user2.email).to.equal(email.trim());
        expect(user2.gender).to.equal(gender);
        expect(user2.birthYear).to.equal(birthYear);
        expect(user2.topicKnowledge).to.equal(topicKnowledge);
      });
  });
});

