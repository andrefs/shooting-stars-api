import Turn     from '../../models/Turn';
import Item     from '../../models/Item';
import Pair     from '../../models/Pair';
import Triple   from '../../models/Triple';
import User     from '../../models/User';
import PlayerMove     from '../../models/PlayerMove';
import sinon    from 'sinon';
import chai     from 'chai';
import Promise  from 'bluebird';
import chaiAsPromised from 'chai-as-promised';
require('../mongoose-helper');

chai.use(chaiAsPromised);
const expect = chai.expect;

describe('Turn', () => {
  let turn;
  const imageUrl = 'http://ww.example.com';

  const handleErr = (err) => {
    if(err){
      console.log(err);
      return Promise.reject();
    }
  };

  beforeEach(() => {
    return Promise.join(
      Item.remove().exec(),
      Pair.remove().exec(),
      Triple.remove().exec(),
      Turn.remove().exec(),
      User.remove().exec(),
      PlayerMove.remove().exec(),
      Promise.promisify(Item.counterReset)('item_counter'),
      Promise.mapSeries([
          {name:  '1st item', imageUrl},
          {name:  '2nd item', imageUrl},
          {name:  '3rd item', imageUrl},
        ], itemF => Item.create(itemF))
        .then(() => Item.activateNext())
        .then(() => Item.activateNext())
        .then(() => Item.activateNext())
        .then(() => Triple.findOne())
        .then(triple => Turn.create({triple: triple._id}))
        .then(t => { turn = t; })
    );
  });


  describe('correctly calculate the score', function(){
    it('when everyone agrees', function(){
      turn.moves = {
        player: 'AB',
        rand1:  'AB',
        rand2:  'AB'
      };
      turn.setScores();
      expect(turn.score.rand2).to.equal(50);
      expect(turn.score.player).to.equal(50);
      expect(turn.score.rand1).to.equal(50);
    });

    it('when two players agree', function(){
      turn.moves = {
        player: 'AC',
        rand1:  'AB',
        rand2:  'AB'
      };
      turn.setScores();
      expect(turn.score.player).to.equal(0);
      expect(turn.score.rand2).to.equal(50);
      expect(turn.score.rand1).to.equal(50);
    });

    it('when everyone disagrees', function(){
      turn.moves = {
        player: 'AB',
        rand1:  'BC',
        rand2:  'AC'
      };
      turn.setScores();
      expect(turn.score.rand2).to.equal(0);
      expect(turn.score.player).to.equal(0);
      expect(turn.score.rand1).to.equal(0);
    });
  });


  describe.skip('sets async player move', function(){
    const username = 'username';
    const password = 'password';
    let user;
    let playerMove;


    beforeEach(() => {
      return User.create({username, password})
        .then(player => {
          user = player;
          return PlayerMove.create({player, triple: turn.triple, pick:'AB'});
        })
        .then(pm => playerMove = pm);
    });

    it('correctly, if async player exists', function(){
      return turn.setAsyncPlayerMove(user._id)
        .then(() => {
          expect(turn.moves.async).to.exist;
          expect(turn.moves.async).to.equal(playerMove.pick);
        });
    });

    it('randomly, if there is no async player', function(){
      return PlayerMove.remove().exec()
        .then(() => {
          expect(turn.moves.async).to.be.undefined;
          return Promise.join(
            PlayerMove.findOne().exec(),
            turn.setAsyncPlayerMove()
          );
        })
        .then(([pm,turn]) => {
          expect(pm).to.be.null;
          expect(turn.moves.async).to.exist;
        });
    });
  });
});
