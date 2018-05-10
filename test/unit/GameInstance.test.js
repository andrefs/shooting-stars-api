import User     from '../../models/User';
import Item     from '../../models/Item';
import Pair     from '../../models/Pair';
import Turn     from '../../models/Turn';
import Triple   from '../../models/Triple';
import GameSequence   from '../../models/GameSequence';
import GameInstance   from '../../models/GameInstance';
import chai from 'chai';
import sinon    from 'sinon';
import sinonChai from 'sinon-chai';
chai.use(sinonChai);
import Promise  from 'bluebird';
import chaiAsPromised from 'chai-as-promised';
import {NoCurrentTurnError,NoMoreItemsError} from '../../lib/errors';
require('../mongoose-helper');
import config from '../../config';

chai.use(chaiAsPromised);
const expect = chai.expect;


describe('GameInstance', () => {
  let player;
  let triple;
  let gameSeq;
  const imageUrl = 'http://ww.example.com';

  const handleErr = (err) => {
    if(err){
      console.log(err);
      return Promise.reject();
    }
  };

  beforeEach(() => {
    const username = 'sync_player';
    const password = 'password';
    return Promise.join(
        User.remove().exec(),
        GameInstance.remove().exec(),
        Pair.remove().exec(),
        Item.remove().exec(),
        Triple.remove().exec(),
        Turn.remove().exec(),
        GameSequence.remove().exec(),
        Promise.promisify(Item.counterReset)('item_counter'),
        Promise.mapSeries([
            {name:  '1st item', imageUrl},
            {name:  '2nd item', imageUrl},
            {name:  '3rd item', imageUrl},
            {name:  '4th item', imageUrl},
          ], itemF => Item.create(itemF))
      )
      .then(() => GameSequence.generateNew())
      .then(gs => { gameSeq = gs; })
      .then(() => Triple.findOne().exec())
      .then(t  => { triple = t; })
      .then(() => User.create({username, password}))
      .then(p  => { player = p; })
  });

  describe('when created', () => {
    it('selects new game sequence', function(){
        return GameInstance.createNew(player._id)
        .then(gi => expect(gi.gameSequence).to.not.be.undefined);
    });

    it('throws if it can\'t select a game sequence', function(){
      return Promise.join(
        GameSequence.remove().exec(),
        Item.remove().exec(),
        Pair.remove().exec()
      )
      .then(() => {
        const p = GameInstance.createNew(player._id);
        return expect(p).to.eventually.be.rejectedWith(NoMoreItemsError);
      });
    });

    it('assigns an async player if a suitable one exists', function(){
      const username = 'async_player';
      const password = 'password';
      let async_player;

      return User.create({username, password, playedSequences: [gameSeq._id]})
        then(user => {
          async_player = user;
          return GameInstance.createNew(player._id);
        })
        .then(gi => {
          expect(gi.players.async).to.not.be.undefined;
          expect(gi.players.async.toString()).to.equal(async_player._id.toString());
        });
    });

    it('does not assign async player if a suitable one cannot be found', function(){
      return GameInstance.createNew(player._id)
        .then(gi => {
          expect(gi.players.async).to.be.null;
        });
    });

    it('bootstraps properties', function(){
      return GameInstance.createNew(player._id)
        .then(gi => {
          expect(gi.gameSequence).to.not.be.undefined;
        });
    });
  });

  it('sets the current score correctly', function(){
    return Promise.join(
      GameInstance.createNew(player._id),
      Turn.create([
        {score: {async: 50, sync: 50, bot: 50}, triple},
        {score: {async:  0, sync:  0, bot:  0}, triple},
        {score: {async: 50, sync:  0, bot:  0}, triple},
        {score: {async:  0, sync: 50, bot:  0}, triple},
        {score: {async:  0, sync:  0, bot: 50}, triple}
      ])
    ).then(([gi, turns]) => {
      gi.turns = {previous: turns};
      return gi.save();
    })
    .then(gi => gi.setCurrentScore())
    .then(gi => {
      expect(gi.currentScore).to.deep.equal({
        sync:  100,
        async: 100,
        bot:   100
      });
    });
  });

  describe('when adding a move', () => {

    it('throws if there\'s no current turn', function(){
      return GameInstance.createNew(player._id)
        .then(gi => {
          gi.turns.current = undefined;
          expect(gi.addMove()).to.be.eventually.rejectedWith(NoCurrentTurnError);
        });
    });

    it('calls setCurrentScore and nextTurn', function(){
      return GameInstance.createNew(player._id)
        .then(gi => {
          // TODO spy on gi.turns.current.setMoves
          sinon.spy(gi, 'setCurrentScore');
          sinon.spy(gi, 'nextTurn');
          return gi.addMove('AC');
        })
        .then(gi => {
          expect(gi.setCurrentScore).to.have.been.called;
          expect(gi.nextTurn).to.have.been.called;
        });
    });

    it('calls wrapUp at the end', function(){
      const _addMove = async gi => gi.addMove('AC');

      return GameInstance.createNew(player._id)
        .then(async gi => {
          sinon.spy(gi, 'wrapUp');
          for (let i=0; i<config.game.size; i++){
            await _addMove(gi);
          }
          expect(gi.wrapUp).to.have.been.called;
        })
    });

    it('wrapUp calls GameInstance.saveMoves and Triple.updateTripleScores', () => {
      const _addMove = async gi => gi.addMove('AC');

      return Promise.join(
        Item.remove().exec(),
        Triple.remove().exec(),
        Pair.remove().exec(),
        GameSequence.remove().exec(),
        Promise.mapSeries([
            {name:  '1st item', imageUrl},
            {name:  '2nd item', imageUrl},
            {name:  '3rd item', imageUrl},
            {name:  '4th item', imageUrl},
          ], itemF => Item.create(itemF))
      )
      .then(() => GameInstance.createNew(player._id))
      .then(async gi => {
        sinon.spy(gi,       'saveMoves');
        sinon.spy(Triple,   'updateTripleScores');
        for (let i=0; i<config.game.size; i++){
          await _addMove(gi);
        }
        expect(gi.saveMoves).to.have.been.called;
        expect(Triple.updateTripleScores).to.have.been.called;
      })
    });
  });
});
