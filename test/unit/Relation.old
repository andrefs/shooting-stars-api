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
  let items;
  const imageUrl = 'http://ww.example.com';

  beforeEach(() => {
    return Promise.join(
        Item.remove().exec(),
        Pair.remove().exec(),
        Triple.remove().exec(),
        Relation.remove().exec(),
        Promise.promisify(Item.counterReset)('item_counter'),
      )
      .then(() => Promise.mapSeries([
            {name:  '1st item', imageUrl},
            {name:  '2nd item', imageUrl},
            {name:  '3rd item', imageUrl},
            {name:  '4th item', imageUrl},
          ], itemF => Item.create(itemF)))
      .then(() => Item.find().limit(4).exec())
      .then(_items => items = _items)
      .then(() => Pair.find().populate([
          {path: 'itemA', model: 'Item'},{path: 'itemB', model: 'Item'},
          {path: 'itemA', model: 'Item'},{path: 'itemB', model: 'Item'},
        ]).exec())
      .then(p  => pairs = p.sort((a, b) => a.cmp(b)))
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

  it('adds relation to triples when it is created', () => {
    return Relation.createNew({
      pair1: pairs[0],  // items 1 and 2
      pair2: pairs[5]   // items 3 and 4
    })
    .then(() => Triple.find())
    .then(triples => {
      expect(triples[0]).to.not.be.empty;
      expect(triples[1]).to.not.be.empty;
      expect(triples[2]).to.not.be.empty;
      expect(triples[3]).to.not.be.empty;
    });
  });

  it("creates relation when adding a choice to unexisting relation", () => {
    expect(Relation.count({pair1: pairs[0], pair2:pairs[1]})).to.eventually.equal(0);

    return Relation.addChoice(pairs[0], pairs[1])
      .then(rel => {
        expect(Relation.count({pair1: pairs[0], pair2:pairs[1]})).to.eventually.equal(1);
      });
  });

  it('calls createNew when adding choice to unexisting relation', () => {
    sinon.spy(Relation, 'createNew');

    return Relation.addChoice(pairs[0], pairs[1])
      .then(rel => {
        expect(Relation.createNew).to.have.been.called;
      });
  });

  it("correctly calculates properties values when adding a choice", () => {
    return Relation.create({pair1: pairs[0], pair2: pairs[1]})
    .then(() => Relation.addChoice(pairs[0], pairs[1]))
    .then(rel => rel.populate({path: 'highestItem', model: 'Item'}).execPopulate())
    .then(rel => {
      expect(rel.choicesPair1).to.equal(1);
      expect(rel.choicesPair2).to.equal(0);
      expect(rel.confidence).to.equal(1);
      expect(rel.highestItem.id).to.equal(pairs[1].itemB.id);
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

  it("getItems returns 3 items if pairs have item in common", () => {
    return Relation.create({
      pair1: pairs[1],
      pair2: pairs[0]
    })
    .then(rel => {
      const items = rel.getItems();
      expect(items.length).to.equal(3);
      expect(items[0].id).to.equal(1);
      expect(items[1].id).to.equal(2);
      expect(items[2].id).to.equal(3);
    });
  });

  it("getItems returns 4 items if pairs do not have item in common", () => {
    return Relation.create({
        pair1: pairs[0],  // items 1 and 2
        pair2: pairs[5]   // items 3 and 4
      })
      .then(rel => {
        const items = rel.getItems();
        expect(items.length).to.equal(4);
        expect(items[0].id).to.equal(1);
        expect(items[1].id).to.equal(2);
        expect(items[2].id).to.equal(3);
        expect(items[3].id).to.equal(4);
      });
  });

  it("getItems returns sorted items", () => {
    return Relation.create({
        pair1: pairs[5],  // items 3 and 4
        pair2: pairs[0]   // items 1 and 2
      })
      .then(rel => {
        const items = rel.getItems();
        expect(items.length).to.equal(4);
        expect(items[0].id).to.equal(1);
        expect(items[1].id).to.equal(2);
        expect(items[2].id).to.equal(3);
        expect(items[3].id).to.equal(4);
      });
  });

  it("getTriples returns 1 triple if pairs have item in common", () => {
    return Relation.create({
      pair1: pairs[1],
      pair2: pairs[0]
    })
    .then(rel => rel.getTriples())
    .then(triples => {
      expect(triples.length).to.equal(1);
      expect(triples[0].itemA.id).to.equal(1);
      expect(triples[0].itemB.id).to.equal(2);
      expect(triples[0].itemC.id).to.equal(3);
    });
  });

  it("getTriples returns 4 triples if pairs do not have item in common", () => {
    return Relation.create({
        pair1: pairs[0],  // items 1 and 2
        pair2: pairs[5]   // items 3 and 4
      })
      .then(rel => rel.getTriples())
      .then(triples => {
        expect(triples.length).to.equal(4);

        expect(triples[0].itemA.id).to.equal(1);
        expect(triples[0].itemB.id).to.equal(2);
        expect(triples[0].itemC.id).to.equal(3);

        expect(triples[1].itemA.id).to.equal(1);
        expect(triples[1].itemB.id).to.equal(2);
        expect(triples[1].itemC.id).to.equal(4);

        expect(triples[2].itemA.id).to.equal(1);
        expect(triples[2].itemB.id).to.equal(3);
        expect(triples[2].itemC.id).to.equal(4);

        expect(triples[3].itemA.id).to.equal(2);
        expect(triples[3].itemB.id).to.equal(3);
        expect(triples[3].itemC.id).to.equal(4);
      });
  });

});
