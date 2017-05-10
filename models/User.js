import bcrypt           from 'bcrypt-nodejs';
import mongoose         from 'mongoose';
import pagPlugin        from 'mongoose-paginate';
import mongooseApiQuery from 'mongoose-api-query';
import createdModified  from 'mongoose-createdmodified';
import GameSequence     from './GameSequence';

mongoose.plugin(pagPlugin);
mongoose.plugin(mongooseApiQuery);
mongoose.plugin(createdModified.createdModifiedPlugin, {index: true});

const UserSchema = mongoose.Schema({
  username: {
    type   : String,
    required : true,
    unique: true
  },
  birthYear: {
    type: Number,
    required: false
  },
  gender: {
    type: String,
    required: false
  },
  password: {
    type: String,
    required: true
  },
  playedSequences: {
    type: mongoose.Schema.Types.ObjectId,
    ref: GameSequence,
    default: []
  }
});

// static method
const calcPasswordHash = (password) => {
  return bcrypt.genSalt(10)
    .then(salt => {
      return bcrypt.hash(password, salt);
    })
    .then(hash => {
      user.password = hash;
    });
};


UserSchema.pre('save', (next) => {
  // only hash the password if it has been modified (or is new)
  if(!this.isModified('password')){
    return next();
  }

  calcPasswordHash(this.password)
    .then(() => {
      return next();
    });
});

UserSchema.statics.calcPasswordHash = calcPasswordHash;
// instance method
UserSchema.methods.comparePassword = function(password) {
  return bcrypt.compareSync(password, this.password);
};

module.exports = mongoose.model('User', UserSchema);
