import bcrypt           from 'bcrypt';
import mongoose         from 'mongoose';
import pagPlugin        from 'mongoose-paginate';
import mongooseApiQuery from 'mongoose-api-query';
import createdModified  from 'mongoose-createdmodified';
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
  email: {
    type: String,
    required: false
  },
  password: {
    type: String,
    required: false
  },
  pastGameInstances: {
    type: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'GameInstance',
    }],
    default: []
  },
  topicKnowledge: {
    type: Number,
    required: false
  },
  currentGameInstance: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GameInstance',
    required: false
  },
  totalGamesPlayed: {
    type: Number,
    required: true,
    default: 0
  },
  totalScore : {
    type: Number,
    required: true,
    default: 0
  },
  isGuest: {
    type: Boolean,
    required: true,
    default: true
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

UserSchema.methods.wrapUpGameInstance = function(gameInst){
  this.totalScore += gameInst.currentScore.player;
  this.pastGameInstances.push(this.currentGameInstance);
  this.currentGameInstance = null;
  this.totalGamesPlayed++;
  return this.save();
};

UserSchema.methods.addOptionalInfo = function(email, gender, birthYear, topicKnowledge){
  this.email = email.trim();
  this.gender = gender;
  this.birthYear = birthYear;
  this.topicKnowledge = topicKnowledge;
  return this.save();
};

UserSchema.statics.cumulativeGamesPlayed = function(){
  return this.aggregate([
    {$project: {numGames: '$totalGamesPlayed'}},
    {$group:   {_id: '$numGames', count: {$sum: 1}}}
  ])
  .then(aggs => aggs.map(agg => ({numGames: agg._id, totalPlayers: agg.count})));
};

UserSchema.statics.newUsersByMonth = function(){
  return this.aggregate([
    // {$project: {month: {$month: "$created"}, year: {$year: "created"}}},
    {$project: {month: {$month: '$created'}, year: {$year: '$created'}}},
    {$group: {
      _id: {month: '$month', year: '$year'},
      total: {$sum: 1}}
    }
  ])
  .then(aggs => aggs.map(agg => ({
    total: agg.total,
    month: agg._id.month,
    year: agg._id.year
  })));
};


UserSchema.statics.averageGamesPerActiveUserByMonth = function(){
  return this.aggregate([
    // {$project: {month: {$month: "$created"}, year: {$year: "created"}}},
    {
      $project: {
        month: {$month: '$modified'},
        year: {$year: '$modified'},
        games: '$totalGamesPlayed'
      }
    },
    {$group: {
      _id: {month: '$month', year: '$year'},
      activeUsers: {$sum: 1},
      playedGames: {$sum: '$games'}
    }}
  ])
  .then(aggs => aggs.map(agg => ({
    gamesPerActiveUser: agg.playedGames / agg.activeUsers,
    month: agg._id.month,
    year: agg._id.year
  })));
};

UserSchema.statics.playersByGender = function(){
  return this.aggregate([
    {$group:   {_id: '$gender', count: {$sum: 1}}}
  ])
  .then(aggs => aggs.map(agg => ({gender: agg._id || 'DNA', totalPlayers: agg.count})));
};


UserSchema.statics.globalBestScores = function(n){
  return this.find()
  .limit(n||5)
  .sort('-totalScore')
  .select('username totalScore totalGamesPlayed')
  .lean()
  .exec()
  .then(users => {
    return users.map(u => {
      return {
        username: u.username,
        score: u.totalScore,
        games: u.totalGamesPlayed
      };
    });
  });
};

UserSchema.methods.playerNearestScores = function(n){
  let num = n || 5;
  return Promise.join(
    this.constructor
      .find({
        totalScore: {$gt: this.totalScore},
        _id: {$ne: this._id}
      })
      .limit(num)
      .select('username totalScore totalGamesPlayed')
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
      .select('username totalScore totalGamesPlayed')
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
        games: u.totalGamesPlayed
      };
    });
  });
};

UserSchema.index({username: 1}, {unique: true});
module.exports = mongoose.model('User', UserSchema);
