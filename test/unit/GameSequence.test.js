import Item     from '../../models/Item';
import Pair     from '../../models/Pair';
import Triple   from '../../models/Triple';
import GameSequence   from '../../models/GameSequence';
import sinon    from 'sinon';
import chai from 'chai';
import Promise  from 'bluebird';
import chaiAsPromised from 'chai-as-promised';
require('../mongoose-helper');
import {NoMoreItemsError}  from '../../lib/errors';
import config           from '../../config';

chai.use(chaiAsPromised);
const expect = chai.expect;


describe('GameSequence', () => {
  let user;

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
      GameSequence.remove().exec(),
      Promise.promisify(Item.counterReset)('item_counter'),
      Promise.promisify(Pair.counterReset)('pair_counter'),
      Promise.promisify(GameSequence.counterReset)('game_sequence_counter')
    );
  });

  it('generateNew returns new GameSequence with correct number of triples', function() {
    const imageUrl = 'http://ww.example.com';
    let triple;

    return Promise.mapSeries([
        {name:  '1st item', imageUrl},
        {name:  '2nd item', imageUrl},
        {name:  '3rd item', imageUrl},
        {name:  '4th item', imageUrl},
      ], itemF => Item.create(itemF))
      .then(() => GameSequence.generateNew())
      .then(gs => expect(gs.triples.length).to.equal(config.game.size));
  });

  it('throws when there are not enough items', function() {
    expect(GameSequence.generateNew()).to.be.eventually.rejectedWith(NoMoreItemsError);
  });

  it.skip('correctly calculates ambiguity', () => {
    // TODO
  });

  // TODO
  // it('sets fields on creation', function() {
  //   this.timeout(15000);
  //   const imageUrl = 'http://ww.example.com';
  //   let triple;

  //   return Promise.mapSeries([
  //       {name:  '1st item', imageUrl},
  //       {name:  '2nd item', imageUrl},
  //       {name:  '3rd item', imageUrl},
  //       {name:  '4th item', imageUrl},
  //       {name:  '5th item', imageUrl},
  //       {name:  '6th item', imageUrl},
  //       {name:  '7th item', imageUrl},
  //     ], itemF => Item.create(itemF))
  //     .then(() => {
  //       return GameSequence.generate(3, 3, 5);
  //     })
  //     .then(([...gameSeqs]) => {
  //       gameSeqs.forEach(gs => {
  //         expect(gs.highestItemId).to.be.at.most(5);
  //       });
  //     })
  //     ;
  // });

});
