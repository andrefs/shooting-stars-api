import { connect, disconnect } from '../db.js';
const conn = connect();
import Promise from 'bluebird';

import Item from '../models/Item.js';
import User from '../models/User.js';
import GameInstance from '../models/GameInstance.js';

//********
// Items *
//********/

const items = [{ imageUrl: "madonna.png", name: "Madonna" }, { imageUrl: "gaga.png", name: "Lady Gaga" }, { imageUrl: "queen.jpg", name: "Freddie Mercury (Queen)" }, { imageUrl: "bono.png", name: "Bono (U2)" }, { imageUrl: "bowie.jpg", name: "David Bowie" }, { imageUrl: "prince.jpg", name: "Prince" }, { imageUrl: "adele.jpg", name: "Adele" }, { imageUrl: "amy.jpg", name: "Amy Whinehouse" }, { imageUrl: "bruce.jpg", name: "Bruce Springstein" }, { imageUrl: "brunomars.jpg", name: "Bruno Mars" }];

//const items = [ {imageUrl:"madonna.jpg" , name:"Madonna" }, {imageUrl:"gaga.jpg" , name:"Lady Gaga" }, {imageUrl:"queen.jpg" , name:"Freddie Mercury (Queen)" }];

Promise.mapSeries(items, item => Item.create(item))

  .then(() => User.create({ username: "user1@example.com", password: "pwd", birthYear: 1960, gender: 'M' }))
  .then(user => GameInstance.createNew(user._id))

  .then(() => User.create({ username: "user2@example.com", password: "pwd", birthYear: 1972, gender: 'F' }))
  .then(user => GameInstance.createNew(user._id))

  .then(() => User.create({ username: "user3@example.com", password: "pwd" }))
  .then(user => GameInstance.createNew(user._id))

  .then(() => User.create({ username: "user4@example.com", password: "pwd", birthYear: 1991 }))
  .then(user => GameInstance.createNew(user._id))

  .then(() => User.create({ username: "user5@example.com", password: "pwd", gender: 'F' }))
  .then(() => disconnect())
  ;

