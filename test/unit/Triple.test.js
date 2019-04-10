import Item     from '../../models/Item';
import Pair     from '../../models/Pair';
import Triple   from '../../models/Triple';
import sinon    from 'sinon';
import chai from 'chai';
import Promise  from 'bluebird';
import chaiAsPromised from 'chai-as-promised';
require('../mongoose-helper');

chai.use(chaiAsPromised);
const expect = chai.expect;


describe('Triple', () => {
  let user;

  beforeEach(() => {
    return Promise.join(
      Item.remove().exec(),
      Pair.remove().exec(),
      Triple.remove().exec()
    );
  });

  it('sorts items on creation', () => {
    const imageUrl = 'http://ww.example.com';
    let triple;

    return Promise.mapSeries([
        {name: 'first item' , imageUrl},
        {name: 'second item', imageUrl},
        {name: 'third item' , imageUrl}
      ], itemF => Item.create(itemF))
    .then(() => Item.activateNext())
    .then(() => Item.activateNext())
    .then(() => Item.activateNext())
    .then(() => Item.find().sort([['seqNum', 'descending']]))
    .then(items => {
      triple = new Triple({
        itemA: items[2],
        itemB: items[1],
        itemC: items[0],
      });

      return Triple.remove().exec();
    })
    .then(() => {
      return triple.save();
    })
    .then(doc => {
      return doc
        .populate({path: 'itemA', model: Item})
        .populate({path: 'itemB', model: Item})
        .populate({path: 'itemC', model: Item})
        .execPopulate();
    })
    .then(doc => {
      expect(doc.itemA.seqNum).to.be.below(doc.itemB.seqNum);
      expect(doc.itemB.seqNum).to.be.below(doc.itemC.seqNum);
    });
  });

  it("throws when creating triple with same items", () => {
    const imageUrl = 'http://example.com';
    const itemFields = [
      {name: 'itemA', imageUrl},
      {name: 'itemB', imageUrl},
      {name: 'itemC', imageUrl}
    ];
    let items;

    return  Promise.mapSeries(itemFields, itemF => Item.create(itemF))
      .then(_items => {
        items = _items;
        return Item.activateNext();
      })
      .then(() => Item.activateNext())
      .then(() => Item.activateNext())
      .then(() => expect(Triple.create({itemA:items[0], itemB:items[1], itemC:items[2]})).to.be.rejected);
  });

  it('getPairs returns correct pairs ordered', () => {
    const imageUrl = 'http://ww.example.com';
    let triple;

    return Promise.mapSeries([
        {name: 'first item' , imageUrl},
        {name: 'second item', imageUrl},
        {name: 'third item' , imageUrl}
      ], itemF => Item.create(itemF))
      .then(() => Item.activateNext())
      .then(() => Item.activateNext())
      .then(() => Item.activateNext())
      .then(() => Item.find().sort([['seqNum', 'descending']]))
      .then(items => Triple.findOne({
        itemA: items[2],
        itemB: items[1],
        itemC: items[0],
      }).populate([
        {path:'itemA', model: 'Item'},
        {path:'itemB', model: 'Item'},
        {path:'itemC', model: 'Item'},
      ]))
      .then(t => {
        triple = t;
        return triple.getPairs();
      })
      .then(pairs => {
        expect(pairs.length).to.equal(3);
        expect(pairs[0].itemA.seqNum).to.equal(triple.itemA.seqNum);
        expect(pairs[0].itemB.seqNum).to.equal(triple.itemB.seqNum);
        expect(pairs[1].itemA.seqNum).to.equal(triple.itemA.seqNum);
        expect(pairs[1].itemB.seqNum).to.equal(triple.itemC.seqNum);
        expect(pairs[2].itemA.seqNum).to.equal(triple.itemB.seqNum);
        expect(pairs[2].itemB.seqNum).to.equal(triple.itemC.seqNum);
        expect(pairs[0].cmp(pairs[1])).to.equal(-1);
        expect(pairs[0].cmp(pairs[2])).to.equal(-1);
        expect(pairs[1].cmp(pairs[2])).to.equal(-1);
      });
  });

  it('updates certainty and support when addPick is called', () => {
    const imageUrl = 'http://ww.example.com';
    let triple;

    return Promise.mapSeries([
        {name: 'first item' , imageUrl},
        {name: 'second item', imageUrl},
        {name: 'third item' , imageUrl}
      ], itemF => Item.create(itemF))
      .then(() => Item.activateNext())
      .then(() => Item.activateNext())
      .then(() => Item.activateNext())
      .then(() => Item.find().sort([['seqNum', 'descending']]))
      .then(items => Triple.findOne({
        itemA: items[2],
        itemB: items[1],
        itemC: items[0],
      }))
      .then(t =>{
        t.addPick('AB');
        expect(t.support).to.equal(1);
        expect(t.picks.AB.count).to.equal(1);
        expect(t.certainty).to.equal(1);

        t.addPick('AC');
        expect(t.support).to.equal(2);
        expect(t.picks.AB.count).to.equal(1);
        expect(t.picks.AC.count).to.equal(1);
        expect(t.certainty).to.equal(1);

        t.addPick('AB');
        expect(t.support).to.equal(3);
        expect(t.picks.AB.count).to.equal(2);
        expect(t.picks.AC.count).to.equal(1);
        expect(t.certainty).to.equal(2);
      });
  });

});
