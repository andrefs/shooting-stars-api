import Relation from '../../models/Relation';
import Pair     from '../../models/Pair';
import Triple   from '../../models/Triple';
import {log}           from '../../lib/logger';
import Item     from '../../models/Item';
import sinon    from 'sinon';
import chai from 'chai';
import Promise  from 'bluebird';
import chaiAsPromised from 'chai-as-promised';
require('../mongoose-helper');

chai.use(chaiAsPromised);
const expect = chai.expect;


describe('Relation', () => {
  let pairs;
  const imageUrl = 'http://ww.example.com';

  beforeEach(() => {
    return Promise.join(
        Item.remove().exec(),
        Pair.remove().exec(),
        Triple.remove().exec(),
        Relation.remove().exec(),
        Promise.promisify(Item.counterReset)('item_counter'),
        Promise.mapSeries([
            {name:  '1st item', imageUrl},
            {name:  '2nd item', imageUrl},
            {name:  '3rd item', imageUrl},
          ], itemF => Item.create(itemF))
      )
      .then(() => Pair.find().limit(2).populate([
          {path: 'itemA', model: 'Item'},{path: 'itemB', model: 'Item'},
          {path: 'itemA', model: 'Item'},{path: 'itemB', model: 'Item'},
        ]).exec())
      .then(p  => pairs = [p[0], p[1]].sort((a, b) => a.cmp(b)))
      .catch(err => console.log('XXXXXXXXXXXXXxx 1', err))
  });

  it('sorts pairs on creation', () => {
    let rel;

    rel = new Relation({
      pair1: pairs[1],
      pair2: pairs[0]
    });

    return Relation.remove()
    .then(() => rel.save())
    .then(doc => doc.populate([
      {path:'pair1', model: 'Pair', populate:[{path: 'itemA', model: 'Item'},{path: 'itemB', model: 'Item'}]},
      {path:'pair2', model: 'Pair', populate:[{path: 'itemA', model: 'Item'},{path: 'itemB', model: 'Item'}]},
    ]).execPopulate())
    .then(doc => {
      expect(doc.pair1.cmp(doc.pair2)).to.equal(-1);
    })
    .catch(err => {
      log.error(err);
      throw err;
    });
  });

  it("throws when creating relation with same pairs", () => {
    return Relation.create({
      pair1: pairs[0],
      pair2: pairs[1]
    })
    .then(() => {
      return expect(Relation.create({pair1: pairs[0], pair2: pairs[1]})).to.be.rejected;
    });
  });

  it("creates relation when adding choice to unexisting relation", () => {
    expect(Relation.count({pair1: pairs[0], pair2:pairs[1]})).to.eventually.equal(0);

    return Relation.addChoice(pairs[0], pairs[1])
      .then(rel => {
        expect(Relation.count({pair1: pairs[0], pair2:pairs[1]})).to.eventually.equal(1);
      });
  });

  it("correctly calculates properties values when adding choice", () => {
    return Relation.create({pair1: pairs[0], pair2: pairs[1]})
    .then(() => Relation.addChoice(pairs[0], pairs[1]))
    .then(rel => {
      expect(rel.choicesPair1).to.equal(1);
      expect(rel.choicesPair2).to.equal(0);
      expect(rel.confidence).to.equal(1);
      expect(rel.support).to.equal(1);

      return Relation.addChoice(pairs[0], pairs[1]);
    })
    .then(rel => {
      expect(rel.choicesPair1).to.equal(2);
      expect(rel.choicesPair2).to.equal(0);
      expect(rel.confidence).to.equal(2);
      expect(rel.support).to.equal(2);

      return Relation.addChoice(pairs[1], pairs[0]);
    })
    .then(rel => {
      expect(rel.choicesPair1).to.equal(2);
      expect(rel.choicesPair2).to.equal(1);
      expect(rel.confidence).to.equal(1);
      expect(rel.support).to.equal(3);
    })
  });
});
