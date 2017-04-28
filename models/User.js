'use strict';

import mongoose         from 'mongoose';
import pagPlugin        from 'mongoose-paginate';
import mongooseApiQuery from 'mongoose-api-query';
import createdModified  from 'mongoose-createdmodified';

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
  // local: {
  //   username:{
  //     type   : String,
  //     unique : true
  //   },
  //   password: String,
  // },
  // facebook: {
  //   id     : String,
  //   username : String,
  //   token  : String,
  //   email  : String,
  //   photo  : String,
  // }
});


module.exports = mongoose.model('User', UserSchema);
