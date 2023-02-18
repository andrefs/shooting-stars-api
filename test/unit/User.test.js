import User from '../../models/User';
require('../mongoose-helper');

describe('User', () => {
  let user;

  beforeEach(async () => {
    await User.deleteMany();
    user = await new User({
      username: 'user1',
      password: '123456'
    }).save();
    // return user.save();
  });

  it('initializes with default values', () => {
  });

  describe('#comparePassword', () => {
    it("should return false if there's no match", () => {
      expect(user.comparePassword('qwerty')).toBe(false);
    });

    it("should return true if there's a match", () => {
      expect(user.comparePassword('123456')).toBe(true);
    });
  });

  it('saves optional info', async () => {
    const email = '  test@example.com  ';
    const birthYear = 1980;
    const gender = 'male';
    const topicKnowledge = 3;

    let user2 = await new User({
      username: 'user2',
      password: '123456'
    }).save();
    await user2.addOptionalInfo(
      email,
      gender,
      birthYear,
      topicKnowledge
    );
    expect(user2.email).toBe(email.trim());
    expect(user2.gender).toBe(gender);
    expect(user2.birthYear).toBe(birthYear);
    expect(user2.topicKnowledge).toBe(topicKnowledge);
  });
});

