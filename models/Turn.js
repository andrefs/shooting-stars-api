import mongoose         from 'mongoose';
import pagPlugin        from 'mongoose-paginate';
import mongooseApiQuery from 'mongoose-api-query';
import createdModified  from 'mongoose-createdmodified';
import Triple           from './Triple';
import PlayerMove       from './PlayerMove';

mongoose.plugin(pagPlugin);
mongoose.plugin(mongooseApiQuery);
mongoose.plugin(createdModified.createdModifiedPlugin, {index: true});

const TurnSchema = mongoose.Schema({
  triple: {
    required: true,
    type: mongoose.Schema.Types.ObjectId,
    ref: Triple
  },
  moves: [{
    default: [],
    type: mongoose.Schema.Types.ObjectId,
    ref: PlayerMove
  }],
  correctAnswer: {
    type: String,
    enum: ['AB', 'BC', 'CA']
  }
});

module.exports = mongoose.model('Turn', TurnSchema);
