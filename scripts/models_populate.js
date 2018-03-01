const db       = require('../db');
const conn = db.connect();
const Promise = require('bluebird');

const Item = require('../models/Item');
const GameSequence = require('../models/GameSequence')
const User = require('../models/User');
const GameInstance = require('../models/GameInstance')

//********
// Items *
//********/

const items = [ {imageUrl:"photos/madonna.jpg" , name:"Madonna" }, {imageUrl:"photos/gaga.jpg" , name:"Lady Gaga" }, {imageUrl:"photos/queen.jpg" , name:"Freddie Mercury (Queen)" }, {imageUrl:"photos/bono.png" , name:"Bono (U2)" }, {imageUrl:"photos/bowie.jpg" , name:"David Bowie" }, {imageUrl:"photos/prince.jpg" , name:"Prince" }, {imageUrl:"http://tempuri.org" , name:"Adele" }, {imageUrl:"photos/amy.jpeg" , name:"Amy Whinehouse" }, {imageUrl:"photos/bruce.jpg" , name:"Bruce Springstein" }, {imageUrl:"photos/brunomars.jpg" , name:"Bruno Mars" }];

//const items = [ {imageUrl:"photos/madonna.jpg" , name:"Madonna" }, {imageUrl:"photos/gaga.jpg" , name:"Lady Gaga" }, {imageUrl:"photos/queen.jpg" , name:"Freddie Mercury (Queen)" }];

Promise.mapSeries(items, item => Item.create(item))
  .then(() => GameSequence.generate(12, 10, 10))

  .then(() => User.create({username: "user1@example.com", password: "pwd", playedSequences: [], birthYear: 1960, gender: 'M'}))
  .then(user => GameInstance.createNew(user._id))

  .then(() => User.create({username: "user2@example.com", password: "pwd", playedSequences: [], birthYear: 1972, gender: 'F'}))
  .then(user => GameInstance.createNew(user._id))

  .then(() => User.create({username: "user3@example.com", password: "pwd", playedSequences: []}))
  .then(user => GameInstance.createNew(user._id))

  .then(() => User.create({username: "user4@example.com", password: "pwd", playedSequences: [], birthYear: 1991}))
  .then(user => GameInstance.createNew(user._id))

  .then(() => User.create({username: "user5@example.com", password: "pwd", playedSequences: [], gender: 'F'}))
  .then(() => db.disconnect())
  ;

