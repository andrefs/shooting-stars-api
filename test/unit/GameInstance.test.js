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

  before(() => {
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


});
