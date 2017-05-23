import mongoose         from 'mongoose';
import User             from './User';
import GameSequence     from './GameSequence';
import Triple           from './Triple';
import Turn             from './Turn';
import Item             from './Item';
import pagPlugin        from 'mongoose-paginate';
import mongooseApiQuery from 'mongoose-api-query';
import createdModified  from 'mongoose-createdmodified';
import shortid          from '../utils/shortid';
import errors           from 'restify-errors';

mongoose.plugin(pagPlugin);
mongoose.plugin(mongooseApiQuery);
mongoose.plugin(createdModified.createdModifiedPlugin, {index: true});

const today = new Date();
const nextWeek = new Date(
  today.getFullYear(),
  today.getMonth(),
  today.getDate()+7
);

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

DisposableRoomSchema.methods.fixFields = function(){
  return this.populate([
    {
      path: 'turns.current',
      model: Turn,
      populate: {
        path: 'triple',
        model: Triple,
        populate: [
          {path: 'itemA', model: Item},
          {path: 'itemB', model: Item},
          {path: 'itemC', model: Item},
        ]
      }
    },
    {
      path: 'turns.previous',
      model: Turn
    },
    {
      path: 'players.sync',
      model: User
    },
    {
      path: 'players.async',
      model: User
    }
  ])
  .execPopulate()
  .then(dr => {
    let _dr = dr.toObject();
    delete _dr.gameSequence;
    return _dr;
  });
};

DisposableRoomSchema.statics.createNew = function(dr){
  return this.create(dr)
    .then(dr => dr.selectGameSequence())
    .then(dr => dr.selectAsyncPlayer())
    .then(dr => dr.nextTurn())
    .then(dr => dr.fixFields())
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
  const totalTurns = this.turns.previous.length;
  if(this.turns.current){
    this.turns.previous.push(this.turns.current);
  }

  return GameSequence.findOne({_id: mongoose.Types.ObjectId(this.gameSequence)})
    .populate({path: 'triples', model: Triple})
    .exec()
    .then(gs => {
      if(this.turns.previous.length === gs.triples.length){
        //game is finished
      }
      return Turn.create({
          triple: gs.triples[totalTurns]
        })
        .then(turn => {
          this.turns.current = turn;
          return this.save();
        })
    });
}

module.exports = mongoose.model('DisposableRoom', DisposableRoomSchema);
