import bcrypt           from 'bcrypt';
import mongoose         from 'mongoose';
import pagPlugin        from 'mongoose-paginate';
import mongooseApiQuery from 'mongoose-api-query';
import createdModified  from 'mongoose-createdmodified';
import GameSequence     from './GameSequence';
import Promise          from 'bluebird';

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
    required: false
  },
  playedSequences: {
    type: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: GameSequence
    }],
    default: []
  },
  currentGameInstance: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GameInstance',
    required: false
  },
  totalScore : {
    type: Number,
    required: true,
    default: 0
  }
},{minimize:false});

// static method
const calcPasswordHash = (password) => {
  return bcrypt.genSalt(10)
    .then(salt => {
      return bcrypt.hash(password, salt);
    });
};


UserSchema.pre('save', function(next){
  // only hash the password if it has been modified (or is new)
  if(!this.isModified('password')){
    return next();
  }

  calcPasswordHash(this.password)
    .then(hash => {
      this.password = hash;
      return next();
    });
});

UserSchema.statics.calcPasswordHash = calcPasswordHash;
// instance method
UserSchema.methods.comparePassword = function(password) {
  return bcrypt.compareSync(password, this.password);
};

UserSchema.methods.addToTotalScore = function(score){
  this.totalScore += score;
  return this.save();
};

UserSchema.methods.addPlayedSequence = function(seq){
  this.playedSequences.push(seq);
  return this.save();
};

UserSchema.statics.globalBestScores = function(n){
  return this.find()
  .limit(n||5)
  .sort('-totalScore')
  .select('username totalScore playedSequences')
  .lean()
  .exec()
  .then(users => {
    return users.map(u => {
      return {
        username: u.username,
        score: u.totalScore,
        games: u.playedSequences.length
      };
    });
  });
};

UserSchema.methods.playerNearestScores = function(n){
  let num = n || 5;
  return Promise.join(
    this.constructor
      .find({
        totalScore: {$gte: this.totalScore},
        _id: {$ne: this._id}
      })
      .limit(num)
      .select('username totalScore playedSequences')
      .sort('totalScore')
      .lean()
      .exec(),
    this.constructor
      .find({
        totalScore: {$lte: this.totalScore},
        _id: {$ne: this._id}
      })
      .where('totalScore').lte(this.totalScore)
      .limit(num)
      .select('username totalScore playedSequences')
      .sort('-totalScore')
      .lean()
      .exec()
  )
  .then(([better, worse]) => {
    let flipFlop = false;
    let elems = [this];

    while(elems.length < num){
      let addBetter = false;
      let addWorse  = false;

      if(worse.length === 0)      { addBetter = true; }
      else if(better.length === 0){ addWorse  = true; }
      else if(flipFlop)           { addBetter = true; }
      else                        { addWorse  = true; }

      if(addBetter){  elems.unshift(better.pop()); }
      if(addWorse ){  elems.push(worse.shift());   }
      flipFlop = !flipFlop;
    }

    return elems.filter(u => !!u).map(u => {
      return {
        username: u.username,
        score: u.totalScore,
        games: u.playedSequences.length
      };
    });
  });
};

module.exports = mongoose.model('User', UserSchema);
