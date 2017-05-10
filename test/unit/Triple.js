import mongoose from 'mongoose';
import Item     from '../../models/Item';
import Triple   from '../../models/Triple';
import sinon    from 'sinon';
import {expect} from 'chai';
import db       from '../../db';
import Promise          from 'bluebird';

describe('Triple', () => {
  let user;

  beforeEach(done => {
    Item.remove().then(() => {
      Triple.remove().then(() => {
        return done();
      });
    });
  });

  it('sorts items on creation', () => {
    const imageUrl = 'http://ww.example.com';

      let items = [
        new Item({name: 'first item' , imageUrl}),
        new Item({name: 'second item', imageUrl}),
        new Item({name: 'third item' , imageUrl}),
      ];
      return Promise.each(items, item => { return item.save(); })
        .then(docs => {
          const triple = new Triple({
            itemA: items[2],
            itemB: items[1],
            itemC: items[0],
          });

          return triple.save()
            .then(doc => {
              return doc
                .populate({path: 'itemA', model: Item})
                .populate({path: 'itemB', model: Item})
                .populate({path: 'itemC', model: Item})
                .execPopulate();
            })
            .then(doc => {
              expect(doc.itemA.id).to.be.below(doc.itemB.id);
              expect(doc.itemB.id).to.be.below(doc.itemC.id);
            });

        });
  });

  it("throws when creating triple with same items", () => {
    const tripleFields = {
    };
  });


});
