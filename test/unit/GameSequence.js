import mongoose from 'mongoose';
import Item     from '../../models/Item';
import Triple   from '../../models/Triple';
import GameSequence   from '../../models/GameSequence';
import sinon    from 'sinon';
import chai from 'chai';
import db       from '../../db';
import Promise  from 'bluebird';
import chaiAsPromised from 'chai-as-promised';

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
      Triple.remove().exec(),
      GameSequence.remove().exec(),
      Promise.promisify(Item.counterReset)('item_counter'),
      Promise.promisify(GameSequence.counterReset)('game_sequence_counter')
    );
  });

  it('sets fields on creation', function() {
    this.timeout(15000);
    const imageUrl = 'http://ww.example.com';
    let triple;

    return Promise.mapSeries([
        {name:  '1st item', imageUrl},
        {name:  '2nd item', imageUrl},
        {name:  '3rd item', imageUrl},
      ], itemF => Item.create(itemF))
      .then(() => {
        return GameSequence.generate(1, 1, 3);
      })
      .then(x => {
        expect(x.length).to.equal(1);
        expect(x[0].highestItemId).to.equal(3);
        expect(x[0].randomSeq).to.not.be.null;
      });
  });

  it('not generate anything there are not enough items', function() {
    this.timeout(15000);
    const imageUrl = 'http://ww.example.com';
    let triple;

    return Promise.mapSeries([
        {name:  '1st item', imageUrl},
        {name:  '2nd item', imageUrl},
        {name:  '3rd item', imageUrl},
        {name:  '4th item', imageUrl},
        {name:  '5th item', imageUrl},
      ], itemF => Item.create(itemF))
      .then(() => {
        return GameSequence.generate(1, 15, 10);
      })
      .then(x => {
        expect(x).to.be.null;
      });
  });

  it('generate only complete sequences', function() {
    this.timeout(15000);
    const imageUrl = 'http://ww.example.com';
    let triple;

    return Promise.mapSeries([
        {name:  '1st item', imageUrl},
        {name:  '2nd item', imageUrl},
        {name:  '3rd item', imageUrl},
        {name:  '4th item', imageUrl},
        {name:  '5th item', imageUrl},
        {name:  '6th item', imageUrl},
        {name:  '7th item', imageUrl},
      ], itemF => Item.create(itemF))
      .then(() => {
        return GameSequence.generate(5, 10, 7);
      })
      .then(x => {
        expect(x.length).to.equal(3);
        x.forEach(gs => {
          expect(gs.triples.length).to.equal(10);
        });
      })
      ;
  });

  it('sets fields on creation', function() {
    this.timeout(15000);
    const imageUrl = 'http://ww.example.com';
    let triple;

    return Promise.mapSeries([
        {name:  '1st item', imageUrl},
        {name:  '2nd item', imageUrl},
        {name:  '3rd item', imageUrl},
        {name:  '4th item', imageUrl},
        {name:  '5th item', imageUrl},
        {name:  '6th item', imageUrl},
        {name:  '7th item', imageUrl},
      ], itemF => Item.create(itemF))
      .then(() => {
        return GameSequence.generate(3, 3, 5);
      })
      .then(([...gameSeqs]) => {
        gameSeqs.forEach(gs => {
          expect(gs.highestItemId).to.be.at.most(5);
        });
      })
      ;
  });

});
