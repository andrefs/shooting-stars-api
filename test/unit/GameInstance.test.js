import mongoose from 'mongoose';
import User     from '../../models/User';
import Item     from '../../models/Item';
import Turn     from '../../models/Turn';
import Triple   from '../../models/Triple';
import GameSequence   from '../../models/GameSequence';
import GameInstance   from '../../models/GameInstance';
import sinon    from 'sinon';
import chai from 'chai';
import db       from '../../db';
import Promise  from 'bluebird';
import chaiAsPromised from 'chai-as-promised';
import {NoCurrentTurnError} from '../../utils/errors';

chai.use(chaiAsPromised);
const expect = chai.expect;


describe('GameInstance', () => {
  let player;
  let triple;
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
        Item.remove().exec(),
        Triple.remove().exec(),
        Turn.remove().exec(),
        GameSequence.remove().exec(),
        Promise.promisify(Item.counterReset)('item_counter'),
        Promise.mapSeries([
            {name:  '1st item', imageUrl},
            {name:  '2nd item', imageUrl},
            {name:  '3rd item', imageUrl},
          ], itemF => Item.create(itemF))
      )
      .then(() => Triple.findOne().exec())
      .then(t  => { triple = t; })
      .then(() => User.create({username, password}))
      .then(p  => { player = p; });
  });

  it('selects new game sequence', function(){
    return GameSequence.generate(1,1,3)
      .then(() => GameInstance.createNew({
        players: {sync: player._id}
      }))
      .then(gi => {
        expect(gi.gameSequence).to.not.be.undefined;
      });
  });

  it('throws if it can\'t select a game sequence', function(){
    return GameSequence.remove().exec()
      .then(() => {
        const p = GameInstance.createNew({
          players: {sync: player._id}
        });
        expect(p).to.eventually.be.rejected;
      });
  });

  it('assigns an async player if a suitable one exists', function(){
    const username = 'async_player';
    const password = 'password';
    let async_player;

    return GameSequence.generate(1,1,3)
      .then(([gs]) => Promise.join(
        User.create({username, password, playedSequences: [gs._id]}),
        GameInstance.createNew({
          players: {sync: player._id}
        })))
      .then(([user, gi]) => {
        async_player = user;
        return gi.selectAsyncPlayer();
      })
      .then(gi => {
        expect(gi.players.async).to.not.be.undefined;
        expect(gi.players.async.toString()).to.equal(async_player._id.toString());
      });
  });

  it('does not assign async player if a suitable one cannot be found', function(){
    return GameSequence.generate(1,1,3)
      .then(gs => GameInstance.createNew({
        players: {sync: player._id}
      }))
      .then(gi => gi.selectAsyncPlayer())
      .then(gi => {
        expect(gi.players.async).to.be.null;
      });
  });

  // it('bootraps properties when created', function(){
  //   return GameSequence.generate(1,1,3)
  //     .then(() => GameInstance.createNew({
  //       players: {sync: player._id}
  //     }))
  //     .then(gi => {
  //       expect(gi.gameSequence).to.not.be.undefined;
  //     });
  // });

  // it('sets the current score', function(){
  //   return Turn.create([
  //       {score: {async: 50, sync: 50, bot: 50}, triple},
  //       {score: {async:  0, sync:  0, bot:  0}, triple},
  //       {score: {async: 50, sync:  0, bot:  0}, triple},
  //       {score: {async:  0, sync: 50, bot:  0}, triple},
  //       {score: {async:  0, sync:  0, bot: 50}, triple}
  //     ])
  //     .then(turns => GameInstance.createNew({
  //       players: {sync: player._id},
  //       turns: {all: turns}
  //     }))
  //     .then(gi => gi.setCurrentScore())
  //     .then(gi => {
  //       expect(gi.currentScore).to.deep.equal({
  //         sync:  100,
  //         async: 100,
  //         bot:   100
  //       });
  //     });
  // });

  // it('throws when adding move but there\'s no current turn', function(){
  //   return GameInstance.createNew({
  //       players: {sync: player._id}
  //     })
  //     .then(gi => {
  //       gi.turns.current = undefined;
  //       expect(gi.addMove()).to.be.eventually.rejectedWith(NoCurrentTurnError);
  //     });
  // });




});
