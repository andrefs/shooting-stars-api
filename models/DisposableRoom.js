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

DisposableRoomSchema.statics.createNew = function(dr){
  return GameSequence.selectNew([dr.syncPlayer])
    .then(gs => {
      dr.gameSequence = gs;
      return this.create(dr);
    })
    .then(dr => {
      return dr.selectAsyncPlayer();
    })
    .then(dr => {
      return dr.
        populate([{
          path: 'gameSequence',
          model: GameSequence,
          populate: {
            path: 'triples',
            model: Triple,
            populate: [
              {path: 'itemA', model: Item},
              {path: 'itemB', model: Item},
              {path: 'itemC', model: Item}
            ]
          }
        }])
        .execPopulate()
    })
    .then(dr => {
      return dr.nextTurn();
    })
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
  if(this.turns.previous.length === this.gameSequence.triples.length){
    //game is finished
  }
  this.turns.current = new Turn({
    triple: this.gameSequence.triples[totalTurns]
  });
  return this.save()
    .then(dr => {
      return dr;
    });
}

module.exports = mongoose.model('DisposableRoom', DisposableRoomSchema);
