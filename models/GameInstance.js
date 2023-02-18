import mongoose from 'mongoose';
import Turn from './Turn';
import pagPlugin from 'mongoose-paginate';
import mongooseApiQuery from 'mongoose-api-query';
import createdModified from 'mongoose-createdmodified';
import { log } from '../lib/logger';
import User from './User';
import Pair from './Pair';
import Triple from './Triple';
import PlayerMove from './PlayerMove';
import Promise from 'bluebird';
import { CurrentTurnMismatch, NoCurrentTurn, TripleIdMismatchError } from '../lib/errors';
import { sampleSize } from 'lodash';
import { knuthShuffle } from 'knuth-shuffle';
import config from '../config';



mongoose.plugin(pagPlugin);
mongoose.plugin(mongooseApiQuery);
mongoose.plugin(createdModified.createdModifiedPlugin, { index: true });

const GameInstanceSchema = mongoose.Schema({
  player: {
    type: mongoose.Schema.Types.ObjectId,
    ref: User,
    required: true
  },
  opponentNames: {
    rand1: { type: String },
    rand2: { type: String }
  },
  gameSequence: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: Triple,
    required: true
  }],
  turns: {
    previous: {
      type: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: Turn
      }],
      default: []
    },
    current: {
      type: mongoose.Schema.Types.ObjectId,
      ref: Turn
    }
  },
  currentScore: {
    type: {
      player: { type: Number, default: 0, required: true },
      rand1: { type: Number, default: 0, required: true },
      rand2: { type: Number, default: 0, required: true },
    },
    required: true,
    default: {
      player: 0,
      rand1: 0,
      rand2: 0
    }
  },
  isFinished: {
    type: Boolean,
    default: false,
    required: true
  }
});


/** Creates a new game instance and adds a player and a new game sequence to it.
    Adds the created game instance to player.currentGameInstance.
    @param {Player} pID
 */
GameInstanceSchema.statics.createNew = async function(pId) {
  let gameInst = new this({ player: pId });

  const player = await User.findOne({ _id: mongoose.Types.ObjectId(pId) });

  gameInst.player = player;
  const triples = await gameInst._createNewGameSequence();

  log.info(`New game sequence generated for player ${pId}`);
  gameInst.gameSequence = knuthShuffle(triples);
  player.currentGameInstance = gameInst;
  gameInst.setOpponentNames();
  const gi = await gameInst.save();
  await player.save()
  return gi.nextTurn(0);
};

GameInstanceSchema.methods._createNewGameSequence = function() {
  const pId = mongoose.Types.ObjectId(this.player._id || this.player);
  log.info('Creating new game sequence for player ' + pId.toString());
  let player;
  let maxScore;
  let normScore;
  let playedTriples;

  return require('./User').findOne()
    .where({ _id: pId })
    .select('totalGamesPlayed totalScore pastGameInstances currentGameInstance')
    .populate([{
      path: 'currentGameInstance',
      model: 'GameInstance',
      select: 'gameSequence'
    }, {
      path: 'pastGameInstances',
      model: 'GameInstance',
      select: 'gameSequence'
    }])
    .lean().exec()
    .then(_player => {
      player = _player;
      maxScore = config.game.scores.win
        * config.game.size
        * player.totalGamesPlayed;
      normScore = maxScore ? player.totalScore / maxScore : 0.5;

      playedTriples = [];
      if (player.pastGameInstances && player.pastGameInstances.length) {
        player.pastGameInstances.forEach(gi => playedTriples.push(...gi.gameSequence));
      }
      if (player.currentGameInstance) {
        playedTriples.push(...player.currentGameInstance.gameSequence);
      }

      return Triple.find()
        .where('_id').nin(playedTriples)
        .countDocuments();
    })
    .then(availableTriples => {
      // No triples unplayed by this player, need to generate more
      if (availableTriples < config.game.size) {
        log.info(`No triples available for player ${pId}, generating new`);
        return Pair.rebuildOrder()
          .then(() => this._createNewGameSequence(pId));
      }

      log.info(`Found ${availableTriples} triples available for player ${pId} to play`);

      let skip = Math.floor(availableTriples * normScore);
      skip = skip - config.game.size / 2;
      skip = skip < 0 ? 0 : skip;

      return Triple.find()
        .skip(skip)
        .where('_id').nin(playedTriples)
        .select('ambiguity isRelevant')
        .sort('-isRelevant ambiguity')
        .limit(config.game.size)
    });
};


GameInstanceSchema.methods.setOpponentNames = function() {
  const namesList = [
    'Bishop',         // Aliens
    'R2-D2',          // Star Wars
    'Optimus Prime',  // Transformers
    'Roy Batty',      // Blade Runner
    'Skynet',         // Terminator
    'False Maria',    // Metropolis
    'Wall-E',         // Wall-E
    'Bender',         // Futurama
    'Robocop',        // Robocop
    'Johnny 5',       // Short Circuit
    'HAL 9000',       // 2001: A Space Odissey
    'Data',           // Star Trek
    'The Iron Giant', // The Iron Giant
    'KITT',           // Knight Rider
    'Baymax',         // Big Hero6
    'GLaDOS',         // Portal
    'Agent Smith',    // Matrix
    'TARS',           // Interstellar
    'Samantha',       // Her
    'Deep Thought',   // The Hitchhiker’s Guide To The Galaxy
    'WOPR',           // War Games
    'Dr. Know',       // A.I. Artificial Intelligence
    'The Red Queen',  // Resident Evil
    'Jarvis',         // Iron Man
    'Number 6',       // Battlestar Galactica
    'Gertie',         // Maniac
    'AWESOM-O',       // South Park
    'Chappie',        // Chappie
  ];

  const [rand1, rand2] = sampleSize(namesList, 2);

  this.opponentNames.rand1 = rand1 || 'Alice';
  this.opponentNames.rand2 = rand2 || 'Bob';
};


GameInstanceSchema.methods.toSanitizedObject = async function() {
  const gi = await this.populate([{
    path: 'player',
    select: 'username',
    model: 'User'
  }, {
    path: 'turns.previous',
    model: 'Turn',
    populate: {
      path: 'triple',
      model: 'Triple',
      populate: {
        path: 'itemA itemB itemC',
        model: 'Item'
      }
    },
  }, {
    path: 'turns.current',
    model: 'Turn',
    select: 'triple',
    populate: [{
      path: 'triple',
      model: 'Triple',
      populate: {
        path: 'itemA itemB itemC',
        model: 'Item'
      },
    }
    ]
  }]);


  let obj = gi.toObject();
  obj.seqLength = obj.gameSequence.length;
  delete obj.gameSequence;
  if (obj.turns.current) {
    delete obj.turns.current.score;
    delete obj.turns.current.moves;
  }
  if (obj.player) {
    obj.player = {
      _id: obj.player._id,
      username: obj.player.username
    };
  }
  return obj;
};

GameInstanceSchema.methods.nextTurn = function(currentTurnNumber) {
  const totalTurns = this.turns.previous.length + (this.turns.current ? 1 : 0);
  if (currentTurnNumber !== totalTurns) {
    return Promise.reject(new CurrentTurnMismatch());
  }

  // FIXME code is weird
  if (this.turns.current) {
    this.turns.previous = [...this.turns.previous, this.turns.current];
    this.turns.current = undefined;
  }

  return (this.turns.previous.length !== this.gameSequence.length ?
    Turn.create({ triple: this.gameSequence[totalTurns] }) :
    Promise.resolve()
  )
    .then(turn => {
      if (turn) { this.turns.current = turn; }
      return this.save();
    })
    .then(() => this.setCurrentScore()) // current score is calculated over finished turns only
    .then(() => {
      if (this.turns.previous.length === this.gameSequence.length) {
        return this.wrapUp();
      }
      return this;
    });
};

GameInstanceSchema.methods.saveMoves = function() {
  // player moves are only added to db at end of game instance
  let playerMoves = [];
  this.turns.previous.forEach(t => {
    playerMoves.push({
      player: this.player,
      triple: t.triple,
      pick: t.moves.player
    });
  });
  return PlayerMove.create(playerMoves);
};

GameInstanceSchema.methods.wrapUp = async function() {
  this.isFinished = true;
  await this.populate([{
    path: 'player',
    model: User,
  }, {
    path: 'turns.previous',
    model: Turn
  },
  {
    path: 'gameSequence',
    model: Triple
  }]);

  await this.player.wrapUpGameInstance(this);
  const moves = await this.saveMoves();
  await Triple.updateTripleScores(moves);
  this.save();
};

GameInstanceSchema.methods.addMove = async function(turnNumber, pick) {
  const tn = parseInt(turnNumber, 10);
  await this.populate({
    path: 'turns.current',
    model: Turn,
    populate: {
      path: 'triple',
      model: 'Triple'
    }
  });

  if (!this.turns.current) {
    // no current turn, game must be over
    return Promise.reject(new NoCurrentTurn());
  }

  this.turns.current.moves.player = pick;
  this.turns.current.markModified('moves.player');
  await this.turns.current.setMoves();

  return this.nextTurn(tn);
};

GameInstanceSchema.methods.setCurrentScore = async function() {
  if (!this.turns.previous.length) { return Promise.resolve(this); }

  await this.populate({
    path: 'turns.previous',
    model: Turn,
  });

  ['player', 'rand1', 'rand2'].forEach(p => {
    this.currentScore[p] = this.turns.previous
      .map(t => t.score[p])
      .reduce((a, b) => a + b);
  });
  this.markModified('currentScore');

  return this.save();
};


GameInstanceSchema.statics.newGamesByMonth = function() {
  return this.aggregate([
    //{$project: {month: {$month: "$created"}, year: {$year: "created"}}},
    { $project: { month: { $month: "$created" }, year: { $year: "$created" } } },
    {
      $group: {
        _id: { month: "$month", year: "$year" },
        total: { $sum: 1 }
      }
    }
  ])
    .then(aggs => aggs.map(agg => ({
      total: agg.total,
      month: agg._id.month,
      year: agg._id.year
    })));
};

module.exports = mongoose.model('GameInstance', GameInstanceSchema);
