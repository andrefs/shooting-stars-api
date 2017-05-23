import mongoose         from 'mongoose';
import User             from './User';
import GameSequence     from './GameSequence';
import Triple           from './Triple';
import Turn             from './Turn';
import PlayerMove       from './PlayerMove';
import Item             from './Item';
import pagPlugin        from 'mongoose-paginate';
import mongooseApiQuery from 'mongoose-api-query';
import createdModified  from 'mongoose-createdmodified';
import shortid          from '../utils/shortid';
import Promise          from 'bluebird';

mongoose.plugin(pagPlugin);
mongoose.plugin(mongooseApiQuery);
mongoose.plugin(createdModified.createdModifiedPlugin, {index: true});


const DisposableRoomSchema = mongoose.Schema({
  id: {
    type: String,
    required: true,
  },
  players: {
    sync: {
      type: mongoose.Schema.Types.ObjectId,
      ref: User,
      required: true
    },
    async: {
      type: mongoose.Schema.Types.ObjectId,
      ref: User
    },
  },
  gameSequence: {
    type: mongoose.Schema.Types.ObjectId,
    ref: GameSequence
  },
  turns: {
    all: {
      type: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: Turn
      }],
      default: []
    },
    previous: {
      type: mongoose.Schema.Types.ObjectId,
      ref: Turn
    },
    current: {
      type: mongoose.Schema.Types.ObjectId,
      ref: Turn
    }
  },
  isFinished: {
    type: Boolean,
    default: false,
    required: true
  }
});

// doc.id always get written by the system
DisposableRoomSchema.pre('validate', function(next) {
  let doc = this;
  if(!doc.id){
    doc.id = shortid();
  }
  return next();
});

DisposableRoomSchema.methods.selectGameSequence = function(){
  return GameSequence.selectNew([this.players.sync])
    .then(gs => {
      this.gameSequence = gs;
      return this.save();
    });
};

DisposableRoomSchema.methods.fixFields = function({include}){
  console.log('XXXXXXXXXXXx include', include);
  let populate = [
    {
      path: 'turns.current',
      model: Turn,
      populate: [{
        path: 'triple',
        model: Triple,
        populate: [
          {path: 'itemA', model: Item},
          {path: 'itemB', model: Item},
          {path: 'itemC', model: Item},
        ]
      }]
    },
    {
      path: 'turns.previous',
      model: Turn,
      populate: [{
        path: 'triple',
        model: Triple,
        populate: [
          {path: 'itemA', model: Item},
          {path: 'itemB', model: Item},
          {path: 'itemC', model: Item},
        ]
      }]
    },
    {
      path: 'players.async',
      model: User
    }
  ];
  if(include){
    if(include.allTurns){
      populate.push({
        path: 'turns.all',
        model: Turn,
        populate: [{
          path: 'triple',
          model: Triple,
          populate: [
            {path: 'itemA', model: Item},
            {path: 'itemB', model: Item},
            {path: 'itemC', model: Item},
          ]
        }]
      });
    }
    if(include.gameSequence){
      populate.push({
        path: 'gameSequence',
        model: GameSequence,
        populate: {
          path: 'triples',
          model: Triple
        }
      });
    }
  }
  console.log('XXXXXXXXXXXx populate', populate);
  return this.populate(populate)
  .execPopulate()
  .then(dr => {
    let _dr = dr.toObject();
    if(!include || !include.gameSequence){
      delete _dr.gameSequence;
    }
    return _dr;
  });
};

DisposableRoomSchema.statics.createNew = function(dr){
  return this.create(dr)
    .then(dr => dr.selectGameSequence())
    .then(dr => dr.selectAsyncPlayer())
    .then(dr => dr.nextTurn())
    .then(dr => dr.fixFields({}))
    .catch(console.log);
};

DisposableRoomSchema.methods.selectAsyncPlayer = function(){
  return User.findOne().where('playedSequences').equals(this.gameSequence)
    .then(user => {
      this.asyncPlayer = user;
      return this.save();
    });
};

DisposableRoomSchema.methods.nextTurn = function(){
  const totalTurns = this.turns.all.length;
  if(this.turns.current){
    this.turns.previous = this.turns.current;
    this.turns.current = undefined;
  }

  return GameSequence.findOne({_id: mongoose.Types.ObjectId(this.gameSequence)})
    .populate({path: 'triples', model: Triple})
    .exec()
    .then(gs => {
      if(this.turns.all.length === gs.triples.length){
        this.isFinished = true;
        return this.save();
      }
      return Turn.create({
        triple: gs.triples[totalTurns]
      })
      .then(turn => {
        this.turns.current = turn;
        this.turns.all.push(turn);
        return this.save();
      });
    });
};

DisposableRoomSchema.methods.addMove = function(tripleId, pick){
  return this.populate({path:'turns.current', model:Turn}).execPopulate()
    .then(() => {
      if(tripleId !== this.turns.current.triple.toString()){
        // triple id does not match, something went wrong
      }

      return PlayerMove.create({
        player: this.players.sync,
        triple: this.turns.current.triple,
        pick
      });
    })
    .then(pm => {
      console.log('XXXXXXXXXXXXx 1 turns', JSON.stringify(this.turns, null, 2));
      this.turns.current.moves.sync = pm.pick;
      this.turns.current.markModified('moves.sync');
      return this.turns.current.save();
    })
    .then(() => this.turns.current.setMoves(this.players))
    .then(() => this.nextTurn())
    .then(() => this.fixFields({}));
};

module.exports = mongoose.model('DisposableRoom', DisposableRoomSchema);
