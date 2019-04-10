import User     from '../models/User';
import GameInstance     from '../models/GameInstance';
import Triple   from '../models/Triple';
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
      User.averageGamesPerActiveUserByMonth(),
      GameInstance.newGamesByMonth(),
      Triple.distAmbiguitySupport()
    )
    .then(([
        cumulativeGames,
        newUsersByMonth,
        playersByGender,
        gamesByMonth,
        averageGames,
        distAmbiguitySupport
      ]) => {
        res.send({
          cumulativeGames,
          newUsersByMonth,
          playersByGender,
          gamesByMonth,
          averageGames,
          distAmbiguitySupport
        });
        return next();
    });
  });

};
