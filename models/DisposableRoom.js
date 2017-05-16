import mongoose         from 'mongoose';
import User             from './User';
import GameSequence     from './GameSequence';
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
  syncPlayer: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: User,
    required: true
  }],
  asyncPlayer: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: User,
    required: true
  }],
  gameSequence: {
    type: mongoose.Schema.Types.ObjectId,
    ref: GameSequence
  }
});

DisposableRoomSchema.pre('save', function(next){
  GameSequence.selectNew([this.syncPlayer._id])
    .then(gs => {
      this.gameSequence = gs;
      return next();
    });
});





module.exports = mongoose.model('DisposableRoom', DisposableRoomSchema);
