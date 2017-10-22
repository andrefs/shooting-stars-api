const db       = require('./db');
const conn = db.connect();


//********
// Items *
//********/
const Item = require('./models/Item');

const items = [ {imageUrl:"photos/madonna.jpg" , name:"Madonna" }, {imageUrl:"photos/gaga.jpg" , name:"Lady Gaga" }, {imageUrl:"photos/queen.jpg" , name:"Freddie Mercury (Queen)" }, {imageUrl:"photos/bono.png" , name:"Bono (U2)" }, {imageUrl:"photos/bowie.jpg" , name:"David Bowie" }, {imageUrl:"photos/prince.jpg" , name:"Prince" }, {imageUrl:"http://tempuri.org" , name:"Adele" }, {imageUrl:"photos/amy.jpeg" , name:"Amy Whinehouse" }, {imageUrl:"photos/bruce.jpg" , name:"Bruce Springstein" }, {imageUrl:"photos/brunomars.jpg" , name:"Bruno Mars" }];

items.forEach(item => { Item.create(item); });



//*****************
// Game Sequences *
//*****************/
const GameSequence = require('./models/GameSequence')
GameSequence.generate(12, 10, 10)

//*******
// User *
//*******/
const User = require('./models/User');
const GameInstance = require('./models/GameInstance')

User.create({username: "user1@example.com", password: "pwd", playedSequences: [], birthYear: 1960, gender: 'M'});
User.create({username: "user2@example.com", password: "pwd", playedSequences: [], birthYear: 1972, gender: 'F'});
User.create({username: "user3@example.com", password: "pwd", playedSequences: []});
User.create({username: "user4@example.com", password: "pwd", playedSequences: [], birthYear: 1991});
User.create({username: "user5@example.com", password: "pwd", playedSequences: [], gender: 'F'});


User.findOne({username: "user1@example.com"}).then(user => { GameInstance.createNew(user._id); });
User.findOne({username: "user2@example.com"}).then(user => { GameInstance.createNew(user._id); });
User.findOne({username: "user3@example.com"}).then(user => { GameInstance.createNew(user._id); });
User.findOne({username: "user4@example.com"}).then(user => { GameInstance.createNew(user._id); });
