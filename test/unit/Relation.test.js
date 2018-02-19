import Relation from '../../models/Relation';
import Pair     from '../../models/Pair';
import Triple   from '../../models/Triple';
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
    const username = 'sync_player';
    const password = 'password';
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
            {name:  '4th item', imageUrl},
          ], itemF => Item.create(itemF))
      )
      .then(() => Pair.find().limit(2).populate([
        {path:'pair1', model: 'Pair', populate:[{path: 'itemA', model: 'Item'},{path: 'itemB', model: 'Item'}]},
        {path:'pair2', model: 'Pair', populate:[{path: 'itemA', model: 'Item'},{path: 'itemB', model: 'Item'}]},
      ])
      .exec())
      .then(p  => { pairs = p; })
  });

  it('sorts pairs on creation', () => {
    const imageUrl = 'http://ww.example.com';
    let rel;

    return Promise.mapSeries([
        {name: 'first item',  imageUrl},
        {name: 'second item', imageUrl},
        {name: 'third item',  imageUrl},
      ], itemF => Item.create(itemF))
      .then(() => Pair.find().limit(2).populate([
        {path:'pair1', model: 'Pair', populate:[{path: 'itemA', model: 'Item'},{path: 'itemB', model: 'Item'}]},
        {path:'pair2', model: 'Pair', populate:[{path: 'itemA', model: 'Item'},{path: 'itemB', model: 'Item'}]},
      ]))
      .then(pairs => {
        const ord = [pairs[0], pairs[1]].sort((a, b) => a.cmp(b));
        rel = new Relation({
          pair1: ord[1],
          pair2: ord[0]
        });
      })
      .then(() => Relation.remove())
      .then(() => rel.save())
      .then(doc => doc.populate([
        {path:'pair1', model: 'Pair', populate:[{path: 'itemA', model: 'Item'},{path: 'itemB', model: 'Item'}]},
        {path:'pair2', model: 'Pair', populate:[{path: 'itemA', model: 'Item'},{path: 'itemB', model: 'Item'}]},
      ]).execPopulate())
      .then(doc => {
        expect(doc.pair1.cmp(doc.pair2)).to.equal(-1);
      });
  });

  // it("throws when creating pair with same items", () => {
  //   const imageUrl = 'http://example.com';
  //   const itemFields = [
  //     {name: 'itemA', imageUrl},
  //     {name: 'itemB', imageUrl},
  //   ];

  //   return  Promise.mapSeries(itemFields, itemF => Item.create(itemF))
  //     .then(([itemA, itemB])  => {
  //       // a pair with items A and B was automatically created when they were created
  //       return expect(Pair.create({itemA, itemB})).to.be.rejected;
  //     });
  // });


  // it('automatically creates pairs when adding items', () => {
  //   const imageUrl = 'http://example.com';

  //   return Promise.join(
  //     expect(Pair.count().exec()).to.eventually.equal(0),
  //     expect(Item.count().exec()).to.eventually.equal(0),
  //     Item.create({name: 'item1', imageUrl})
  //       .then(() => {
  //         return Promise.join(
  //           expect(Item.count().exec()).to.eventually.equal(1),
  //           expect(Pair.count().exec()).to.eventually.equal(0),
  //           Item.create({name: 'item2', imageUrl})
  //         );
  //       })
  //       .then(() => {
  //         return Promise.join(
  //           expect(Item.count().exec()).to.eventually.equal(2),
  //           expect(Pair.count().exec()).to.eventually.equal(1),
  //           Item.create({name: 'item3', imageUrl})
  //         );
  //       })
  //       .then(() => {
  //         return Promise.join(
  //           expect(Item.count().exec()).to.eventually.equal(3),
  //           expect(Pair.count().exec()).to.eventually.equal(3),
  //           Item.create({name: 'item4', imageUrl})
  //         );
  //       })
  //       .then(() => {
  //         return Promise.join(
  //           expect(Item.count().exec()).to.eventually.equal(4),
  //           expect(Pair.count().exec()).to.eventually.equal(6),
  //           Item.create({name: 'item5', imageUrl})
  //         );
  //       })
  //       .then(() => {
  //         return Promise.join(
  //           expect(Item.count().exec()).to.eventually.equal(5),
  //           expect(Pair.count().exec()).to.eventually.equal(10),
  //           Item.create({name: 'item6', imageUrl})
  //         );
  //       })
  //       .then(() => {
  //         return Promise.join(
  //           expect(Item.count().exec()).to.eventually.equal(6),
  //           expect(Pair.count().exec()).to.eventually.equal(15),
  //         );
  //       })
  //   );
  // });

});
