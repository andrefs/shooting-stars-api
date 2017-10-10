import mongoose         from 'mongoose';
import pagPlugin        from 'mongoose-paginate';
import mongooseApiQuery from 'mongoose-api-query';
import createdModified  from 'mongoose-createdmodified';
import Triple           from './Triple';
import User             from './User';

mongoose.plugin(pagPlugin);
mongoose.plugin(mongooseApiQuery);
mongoose.plugin(createdModified.createdModifiedPlugin, {index: true});

const PlayerMoveSchema = mongoose.Schema({
  player: {
    required: true,
    type: mongoose.Schema.Types.ObjectId,
    ref: User
  },
  triple: {
    required: true,
    type: mongoose.Schema.Types.ObjectId,
    ref: Triple
  },
  pick: {
    required: true,
    type: String,
    enum: ['AB', 'BC', 'AC']
  },
});

module.exports = mongoose.model('PlayerMove', PlayerMoveSchema);
