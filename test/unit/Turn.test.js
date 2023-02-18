import Turn from '../../models/Turn';
import Item from '../../models/Item';
import Pair from '../../models/Pair';
import Triple from '../../models/Triple';
import User from '../../models/User';
import PlayerMove from '../../models/PlayerMove';
import Promise from 'bluebird';
require('../mongoose-helper');


describe('Turn', () => {
  let turn;
  const imageUrl = 'http://ww.example.com';

  const handleErr = (err) => {
    if (err) {
      console.log(err);
      return Promise.reject();
    }
  };

  beforeEach(async () => {
    await Item.deleteMany();
    await Pair.deleteMany();
    await Triple.deleteMany();
    await Turn.deleteMany();
    await User.deleteMany();
    await PlayerMove.deleteMany();

    await Promise.promisify(Item.counterReset)('item_counter');

    await Item.create({ name: '1st item', imageUrl });
    await Item.create({ name: '2nd item', imageUrl });
    await Item.create({ name: '3rd item', imageUrl });

    await Item.activateNext();
    await Item.activateNext();
    await Item.activateNext();
    const triple = await Triple.findOne();
    turn = await Turn.create({ triple: triple._id });
  });


  describe('correctly calculate the score', function() {
    it('when everyone agrees', async () => {
      turn.moves = {
        player: 'AB',
        rand1: 'AB',
        rand2: 'AB'
      };
      turn.setScores();
      expect(turn.score.rand2).toEqual(50);
      expect(turn.score.player).toEqual(50);
      expect(turn.score.rand1).toEqual(50);
    });

    it('when two players agree', function() {
      turn.moves = {
        player: 'AC',
        rand1: 'AB',
        rand2: 'AB'
      };
      turn.setScores();
      expect(turn.score.player).toEqual(0);
      expect(turn.score.rand2).toEqual(50);
      expect(turn.score.rand1).toEqual(50);
    });

    it('when everyone disagrees', function() {
      turn.moves = {
        player: 'AB',
        rand1: 'BC',
        rand2: 'AC'
      };
      turn.setScores();
      expect(turn.score.rand2).toEqual(0);
      expect(turn.score.player).toEqual(0);
      expect(turn.score.rand1).toEqual(0);
    });
  });


  describe.skip('sets async player move', function() {
    const username = 'username';
    const password = 'password';
    let user;
    let playerMove;


    beforeEach(async () => {
      user = await User.create({ username, password });
      playerMove = await PlayerMove.create({ player, triple: turn.triple, pick: 'AB' });
    });

    it('correctly, if async player exists', async () => {
      await turn.setAsyncPlayerMove(user._id);
      expect(turn.moves).toHaveProperty('async', playerMove.pick);
    });

    it('randomly, if there is no async player', async () => {
      await PlayerMove.deleteMany();
      expect(turn.moves.async).toBeUndefined();
      const pm = await PlayerMove.findOne();
      turn = await turn.setAsyncPlayerMove();
      expect(pm).toBeNull();
      expect(turn.moves).toHaveProperty('async');
    });
  });
});
