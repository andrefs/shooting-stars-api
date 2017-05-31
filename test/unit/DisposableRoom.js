import mongoose from 'mongoose';
import User     from '../../models/User';
import Item     from '../../models/Item';
import Triple   from '../../models/Triple';
import GameSequence  from '../../models/GameSequence';
import DisposableRoom  from '../../models/DisposableRoom';
import sinon    from 'sinon';
import chai     from 'chai';
import Promise  from 'bluebird';
import chaiAsPromised from 'chai-as-promised';

chai.use(chaiAsPromised);
const expect = chai.expect;

describe('DisposableRoom', () => {
  let player;
  let triple;
  const imageUrl = 'http://ww.example.com';

  const handleErr = (err) => {
    if(err){
      console.log(err);
      return Promise.reject();
    }
  };

  before(() => {
    const username = 'sync_player';
    const password = 'password';
    return Promise.join(
        User.remove().exec(),
        DisposableRoom.remove().exec(),
        Item.remove().exec(),
        Triple.remove().exec(),
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
      .then(() => DisposableRoom.create({
        players: {sync: player._id}
      }))
      .then(dr => {
        expect(dr.gameSequence).to.be.undefined;
        return dr.selectGameSequence();
      })
      .then(dr => {
        expect(dr.gameSequence).to.not.be.undefined;
      });
  });


  it('throws if it can\'t select a game sequence', function(){
    return GameSequence.remove().exec()
      .then(() => DisposableRoom.create({
        players: {sync: player._id}
      }))
      .then(dr => {
        expect(dr.gameSequence).to.be.undefined;
        expect(dr.selectGameSequence()).to.eventually.be.rejected;
      });
  });

  it('assigns an async player if a suitable one exists', function(){
    const username = 'async_player';
    const password = 'password';
    let async_player;

    return GameSequence.generate(1,1,3)
      .then(([gs]) => Promise.join(
        User.create({username, password, playedSequences: [gs._id]}),
        DisposableRoom.createNew({
          players: {sync: player._id}
        })))
      .then(([user, dr]) => {
        async_player = user;
        return dr.selectAsyncPlayer();
      })
      .then(dr => {
        expect(dr.players.async).to.not.be.undefined;
        expect(dr.players.async.toString()).to.equal(async_player._id.toString());
      });
  });

  it('does not assign async player if a suitable one cannot be found', function(){
    return GameSequence.generate(1,1,3)
      .then(gs => DisposableRoom.create({
        players: {sync: player._id},
        gameSequence: gs._id
      }))
      .then(dr => dr.selectAsyncPlayer())
      .then(dr => {
        expect(dr.players.async).to.be.null;
      });
  });

  it('bootraps properties when created', function(){
    return GameSequence.generate(1,1,3)
      .then(() => DisposableRoom.createNew({
        players: {sync: player._id}
      }))
      .then(dr => {
        expect(dr.gameSequence).to.not.be.undefined;
      });
  });


  // it('hides private fields', function(){
  // });
});
