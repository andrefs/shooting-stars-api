import User from '../../models/User';
import Item from '../../models/Item';
import Pair from '../../models/Pair';
import Turn from '../../models/Turn';
import Triple from '../../models/Triple';
import GameInstance from '../../models/GameInstance';
import Promise from 'bluebird';
import { NoCurrentTurnError, NoMoreItemsError } from '../../lib/errors';
require('../mongoose-helper');
import config from '../../config';



describe('GameInstance', () => {
  let player;
  let triple;
  const imageUrl = 'http://ww.example.com';

  const handleErr = (err) => {
    if (err) {
      console.log(err);
      return Promise.reject();
    }
  };

  beforeEach(async () => {
    const username = 'sync_player';
    const password = 'password';

    await Promise.promisify(Item.counterReset)('item_counter');
    await Promise.promisify(Pair.counterReset)('pair_counter');

    await GameInstance.deleteMany();
    await Item.deleteMany();
    await Pair.deleteMany();
    await Triple.deleteMany();;
    await Turn.deleteMany();;
    await User.deleteMany();;

    await Item.create({ name: '1st item', imageUrl });
    await Item.create({ name: '2nd item', imageUrl });
    await Item.create({ name: '3rd item', imageUrl });
    await Item.create({ name: '4th item', imageUrl });
    await Item.create({ name: '5th item', imageUrl });
    await Item.create({ name: '6th item', imageUrl });
    await Item.create({ name: '7th item', imageUrl });
    await Item.create({ name: '8th item', imageUrl });
    await Item.create({ name: '9th item', imageUrl });

    await Item.activateNext();
    await Item.activateNext();
    await Item.activateNext();
    await Item.activateNext();
    await Item.activateNext();
    await Item.activateNext();

    player = await User.create({ username, password });
    triple = await Triple.findOne().exec();
  });

  describe('when created', () => {
    it('selects new game sequence', function() {
      return GameInstance.createNew(player._id)
        .then(gi => expect(gi.gameSequence).toBeDefined());
    });

    it('throws if it can\'t select a game sequence', async () => {
      await Item.deleteMany();
      await Pair.deleteMany();
      await Triple.deleteMany();
      await Promise.promisify(Item.counterReset)('item_counter');
      await Promise.promisify(Item.counterReset)('pair_counter');

      const p = GameInstance.createNew(player._id);
      await expect(p).rejects.toThrow(NoMoreItemsError);
    });

    it.skip('assigns an async player if a suitable one exists', async () => {
      const username = 'async_player';
      const password = 'password';
      let async_player;

      const user = await User.create({ username, password });
      const gi = await GameInstance.createNew(user._id);

      expect(gi.players.async).toBeDefined();
      expect(gi.players.async.toString()).toEqual(async_player._id.toString());
    });

    it.skip('does not assign async player if a suitable one cannot be found', function() {
      return GameInstance.createNew(player._id)
        .then(gi => {
          expect(gi.players.async).to.be.null;
        });
    });

    it('bootstraps properties', function() {
      return GameInstance.createNew(player._id)
        .then(gi => {
          expect(gi.gameSequence).toBeDefined();
        });
    });
  });

  it('sets the current score correctly', function() {
    return Promise.join(
      GameInstance.createNew(player._id),
      Turn.create([
        { score: { rand1: 50, player: 50, rand2: 50 }, triple },
        { score: { rand1: 0, player: 0, rand2: 0 }, triple },
        { score: { rand1: 50, player: 0, rand2: 0 }, triple },
        { score: { rand1: 0, player: 50, rand2: 0 }, triple },
        { score: { rand1: 0, player: 0, rand2: 50 }, triple }
      ])
    ).then(([gi, turns]) => {
      gi.turns = { previous: turns };
      return gi.save();
    })
      .then(gi => gi.setCurrentScore())
      .then(gi => {
        expect(gi.currentScore).toMatchInlineSnapshot(`
{
  "player": 100,
  "rand1": 100,
  "rand2": 100,
}
`);
      });
  });

  describe('when adding a move', () => {

    it('throws if there\'s no current turn', async () => {
      const gi = await GameInstance.createNew(player._id)
      gi.turns.current = undefined;
      expect(gi.addMove()).rejects.toThrow(NoCurrentTurnError);
    });

    it('calls setCurrentScore and nextTurn', async () => {
      let gi = await GameInstance.createNew(player._id)
      // TODO spy on gi.turns.current.setMoves
      jest.spyOn(gi, 'setCurrentScore');
      jest.spyOn(gi, 'nextTurn');
      gi = await gi.addMove(1, 'AC');
      expect(gi.setCurrentScore).toHaveBeenCalled();
      expect(gi.nextTurn).toHaveBeenCalled();
    });

    describe('wrapUp', () => {
      it('gets called at the end', async () => {
        const _addMove = async (i, gi) => gi.addMove(i, 'AC');

        const gi = await GameInstance.createNew(player._id);
        jest.spyOn(gi, 'wrapUp');
        for (let i = 0; i < config.game.size; i++) {
          await _addMove(i + 1, gi);
        }
        expect(gi.wrapUp).toHaveBeenCalled();

      });

      it('calls GameInstance.saveMoves and Triple.updateTripleScores', async () => {
        const _addMove = async (i, gi) => gi.addMove(i, 'AC');

        const gi = await GameInstance.createNew(player._id);
        jest.spyOn(gi, 'saveMoves');
        jest.spyOn(Triple, 'updateTripleScores');
        for (let i = 0; i < config.game.size; i++) {
          await _addMove(i + 1, gi);
        }
        expect(gi.saveMoves).toHaveBeenCalled()
        expect(Triple.updateTripleScores).toHaveBeenCalled();
      });


      it.skip('correctly updates GameSequence ambiguity', function() {
        const _addMove = async (i, gi) => gi.addMove(i, 'AC');

        return GameInstance.createNew(player._id)
          .then(async gi => {
            sinon.spy(gi, 'wrapUp');
            for (let i = 0; i < config.game.size; i++) {
              await _addMove(i + 1, gi);
            }
            expect(gi.wrapUp).to.have.been.called;
            return GameSequence.findOne({ _id: gi.gameSequence._id })
              .populate({ path: 'triples', model: 'Triple' });
          })
          .then(gs => expect(gs.ambiguity).to.equal(gs.triples.reduce((total, cur) => total += cur.ambiguity, 0)));
      });
    });
  });

  describe('_createNewGameSequence', () => {

    const imageUrl = 'http://ww.example.com';
    const username = 'player';
    const password = 'password';
    let player;
    let gameInst;


    beforeEach(() => {
      return Promise.mapSeries([
        { name: '10th item', imageUrl },
        { name: '11th item', imageUrl },
        { name: '12th item', imageUrl },
        { name: '13th item', imageUrl },
        { name: '14th item', imageUrl },
        { name: '15th item', imageUrl },
        { name: '16th item', imageUrl },
        { name: '17th item', imageUrl },
        { name: '18th item', imageUrl },
      ], itemF => Item.create(itemF))
        .then(() => User.create({ username, password }))
        .then(u => {
          player = u;
          return GameInstance.createNew(player._id);
        })
        .then(gi => {
          gameInst = gi;
        });
    });

    it('returns new GameSequence with correct number of triples', async () => {
      const triples = await gameInst._createNewGameSequence();

      expect(triples.length).toEqual(config.game.size);
    });

    it('throws when there are not enough items', async () => {
      await Item.deleteMany();
      await Pair.deleteMany();
      await Triple.deleteMany();
      expect(gameInst._createNewGameSequence()).rejects.toThrow(NoMoreItemsError);
    });

    it.skip('selectnew selects existing sequence if available', () => {
      const imageurl = 'http://ww.example.com';
      const username = 'player';
      const username2 = 'player2';
      const password = 'password';
      let gs1;

      expect(gamesequence.estimateddocumentcount()).to.eventually.equal(0);

      return promise.mapseries([
        { name: '1st item', imageurl },
        { name: '2nd item', imageurl },
        { name: '3rd item', imageurl },
        { name: '4th item', imageurl },
      ], itemf => item.create(itemf))
        .then(() => gamesequence.generatenew())
        .then(() => gamesequence.generatenew())
        .then(() => user.create({ username, password }))
        .then(user => gamesequence.selectnew(user._id))
        .then(gs => {
          gs1 = gs;
          return expect(gamesequence.estimateddocumentcount()).to.eventually.equal(2);
        })
        .then(() => user.create({ username: username2, password }))
        .then(user2 => gamesequence.selectnew(user2._id))
        .then(gs2 => expect(gs1._id.equals(gs2._id)).to.be.true)
        .then(() => expect(gamesequence.estimateddocumentcount()).to.eventually.equal(2));

    });

    // todo selectnew returns while still generating the second
    // sequence, and this messes up following tests
    it.skip('selectnew generates new sequence if there is none available', () => {
      const imageurl = 'http://ww.example.com';
      const username = 'async_player';
      const password = 'password';

      expect(gamesequence.estimateddocumentcount()).to.eventually.equal(0);
      sinon.spy(gamesequence, 'generatenew');

      return promise.mapseries([
        { name: '1st item', imageurl },
        { name: '2nd item', imageurl },
        { name: '3rd item', imageurl },
        { name: '4th item', imageurl },
      ], itemf => item.create(itemf))
        .then(() => user.create({ username, password }))
        .then(user => gamesequence.selectnew(user._id))
        .then(gs => expect(gamesequence.estimateddocumentcount()).to.eventually.equal(1))
        .then(gs => expect(gamesequence.generatenew).to.have.been.called);
    });

    it.skip('correctly calculates ambiguity', () => {
      const imageurl = 'http://ww.example.com';
      let gs;

      return promise.mapseries([
        { name: 'first item', imageurl },
        { name: 'second item', imageurl },
        { name: 'third item', imageurl },
        { name: 'fourth item', imageurl }
      ], itemf => item.create(itemf))
        .then(() => gamesequence.generatenew())
        .then(_gs => {
          gs = _gs;
          return promise.mapseries(gs.triples, t => t.addpick('ab').save())
        })
        .then(() => gamesequence.findone({ seqnum: gs.seqnum }).populate({ path: 'triples', model: 'triple' }))
        .then(gs => expect(gs.updateambiguity()).to.eventually.have.property('ambiguity', 2));
    });

    // todo
    // it('sets fields on creation', function() {
    //   this.timeout(15000);
    //   const imageurl = 'http://ww.example.com';
    //   let triple;

    //   return promise.mapseries([
    //       {name:  '1st item', imageurl},
    //       {name:  '2nd item', imageurl},
    //       {name:  '3rd item', imageurl},
    //       {name:  '4th item', imageurl},
    //       {name:  '5th item', imageurl},
    //       {name:  '6th item', imageurl},
    //       {name:  '7th item', imageurl},
    //     ], itemf => item.create(itemf))
    //     .then(() => {
    //       return gamesequence.generate(3, 3, 5);
    //     })
    //     .then(([...gameseqs]) => {
    //       gameseqs.foreach(gs => {
    //         expect(gs.highestitemid).to.be.at.most(5);
    //       });
    //     })
    //     ;
    // });

    it.skip('selects new game sequence based on player overall results', function() {
      this.timeout(15000);
      const imageurl = 'http://ww.example.com';
      let triple;
      let gamesequences;
      let highamb;
      let middleamb;
      let lowamb;


      return promise.mapseries([
        { name: '1st item', imageurl },
        { name: '2nd item', imageurl },
        { name: '3rd item', imageurl },
        { name: '4th item', imageurl },
        { name: '5th item', imageurl },
        { name: '6th item', imageurl },
        { name: '8th item', imageurl },
        { name: '9th item', imageurl },
        { name: '10th item', imageurl },
        { name: '11th item', imageurl },
        { name: '12th item', imageurl },
        { name: '13th item', imageurl },
        { name: '14th item', imageurl },
        { name: '15th item', imageurl },
      ], itemf => item.create(itemf))
        .then(() => gamesequence.generatenew())
        .then(() => gamesequence.generatenew())
        .then(() => gamesequence.generatenew())
        .then(() => gamesequence.generatenew())
        .then(() => gamesequence.generatenew())
        .then(() => gamesequence.generatenew())
        .then(() => gamesequence.find())
        .then(([high, middle, low, ...gss]) => {
          highamb = high;
          middleamb = middle;
          lowamb = low;
          gamesequences = gss;

          return promise.join(
            user.create({
              username: 'name',
              totalscore: (config.game.scores.win * config.game.size * gamesequences.length) / 2,
              playedsequences: gamesequences
            }),
            gamesequence.findoneandupdate(
              { _id: highamb._id },
              { $set: { ambiguity: 0 } }
            ),
            gamesequence.findoneandupdate(
              { _id: middleamb._id },
              { $set: { ambiguity: 5 } }
            ),
            gamesequence.findoneandupdate(
              { _id: lowamb._id },
              { $set: { ambiguity: 10 } }
            ));
        })
        .then(([u]) => gamesequence.selectnew(u))
        .then(gs => expect(gs._id.equals(middleamb._id)).to.be.true);
    });

  });
});
