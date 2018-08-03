import Item     from '../../models/Item';
import Pair     from '../../models/Pair';
import Triple   from '../../models/Triple';
import User   from '../../models/User';
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
      User.remove().exec(),
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
    return expect(GameSequence.generateNew()).to.be.eventually.rejectedWith(NoMoreItemsError);
  });

  it('selectNew selects existing sequence if available', () => {
    const imageUrl  = 'http://ww.example.com';
    const username  = 'player';
    const username2 = 'player2';
    const password  = 'password';
    let gs1;

    expect(GameSequence.estimatedDocumentCount()).to.eventually.equal(0);

    return Promise.mapSeries([
        {name:  '1st item', imageUrl},
        {name:  '2nd item', imageUrl},
        {name:  '3rd item', imageUrl},
        {name:  '4th item', imageUrl},
      ], itemF => Item.create(itemF))
      .then(() => GameSequence.generateNew())
      .then(() => GameSequence.generateNew())
      .then(() => User.create({username, password}))
      .then(user => GameSequence.selectNew(user._id))
      .then(gs => {
        gs1 = gs;
        return expect(GameSequence.estimatedDocumentCount()).to.eventually.equal(2);
      })
      .then(() => User.create({username: username2, password}))
      .then(user2 => GameSequence.selectNew(user2._id))
      .then(gs2 => expect(gs1._id.equals(gs2._id)).to.be.true)
      .then(() => expect(GameSequence.estimatedDocumentCount()).to.eventually.equal(2));

  });

  // TODO selectNew returns while still generating the second
  // sequence, and this messes up following tests
  it.skip('selectNew generates new sequence if there is none available', () => {
    const imageUrl = 'http://ww.example.com';
    const username = 'async_player';
    const password = 'password';

    expect(GameSequence.estimatedDocumentCount()).to.eventually.equal(0);
    sinon.spy(GameSequence, 'generateNew');

    return Promise.mapSeries([
        {name: '1st item', imageUrl},
        {name: '2nd item', imageUrl},
        {name: '3rd item', imageUrl},
        {name: '4th item', imageUrl},
      ], itemF => Item.create(itemF))
      .then(() => User.create({username, password}))
      .then(user => GameSequence.selectNew(user._id))
      .then(gs => expect(GameSequence.estimatedDocumentCount()).to.eventually.equal(1))
      .then(gs => expect(GameSequence.generateNew).to.have.been.called);
  });

  it('correctly calculates ambiguity', () => {
    const imageUrl = 'http://ww.example.com';
    let gs;

    return Promise.mapSeries([
        {name: 'first item' , imageUrl},
        {name: 'second item', imageUrl},
        {name: 'third item' , imageUrl},
        {name: 'fourth item', imageUrl}
      ], itemF => Item.create(itemF))
      .then(() => GameSequence.generateNew())
      .then(_gs => {
        gs = _gs;
        return Promise.mapSeries(gs.triples, t => t.addPick('AB').save())
      })
      .then(() => GameSequence.findOne({seqNum: gs.seqNum}).populate({path: 'triples', model:'Triple'}))
      .then(gs => expect(gs.updateAmbiguity()).to.eventually.have.property('ambiguity', 2));
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

  it('selects new game sequence based on player overall results', function() {
    this.timeout(15000);
    const imageUrl = 'http://ww.example.com';
    let triple;
    let gameSequences;
    let highAmb;
    let middleAmb;
    let lowAmb;


    return Promise.mapSeries([
        {name:  '1st item', imageUrl},
        {name:  '2nd item', imageUrl},
        {name:  '3rd item', imageUrl},
        {name:  '4th item', imageUrl},
        {name:  '5th item', imageUrl},
        {name:  '6th item', imageUrl},
        {name:  '8th item', imageUrl},
        {name:  '9th item', imageUrl},
        {name: '10th item', imageUrl},
        {name: '11th item', imageUrl},
        {name: '12th item', imageUrl},
        {name: '13th item', imageUrl},
        {name: '14th item', imageUrl},
        {name: '15th item', imageUrl},
      ], itemF => Item.create(itemF))
      .then(() => GameSequence.generateNew())
      .then(() => GameSequence.generateNew())
      .then(() => GameSequence.generateNew())
      .then(() => GameSequence.generateNew())
      .then(() => GameSequence.generateNew())
      .then(() => GameSequence.generateNew())
      .then(() => GameSequence.find())
      .then(([high, middle, low , ...gss]) => {
        highAmb = high;
        middleAmb = middle;
        lowAmb = low;
        gameSequences = gss;

        return Promise.join(
          User.create({
            username: 'name',
            totalScore:  (config.game.scores.win * config.game.size * gameSequences.length)/2,
            playedSequences: gameSequences
          }),
          GameSequence.findOneAndUpdate(
            {_id: highAmb._id},
            {$set: {ambiguity: 0}}
          ),
          GameSequence.findOneAndUpdate(
            {_id: middleAmb._id},
            {$set: {ambiguity: 5}}
          ),
          GameSequence.findOneAndUpdate(
            {_id: lowAmb._id},
            {$set: {ambiguity: 10}}
          ));
      })
      .then(([u]) =>  GameSequence.selectNew(u))
      .then(gs => expect(gs._id.equals(middleAmb._id)).to.be.true);
  });

});
