import User     from '../models/User';
import GameInstance     from '../models/GameInstance';
import errors   from 'restify-errors';
import {log}           from '../lib/logger';
import mongoose from 'mongoose';
import config   from '../config';
import Promise          from 'bluebird';

module.exports = function(app, passport){
  app.get('/stats', function(req, res, next){
    return Promise.join(
      User.cumulativeGamesPlayed(),
      User.newUsersByMonth(),
      User.playersByGender(),
      GameInstance.newGamesByMonth(),
    )
    .then(([cumulativeGames, newUsersByMonth, playersByGender, gamesByMonth]) => {
      res.send({cumulativeGames, newUsersByMonth, playersByGender, gamesByMonth});
      return next();
    });
  });

};
