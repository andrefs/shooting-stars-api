import User from '../models/User.js';
import GameInstance from '../models/GameInstance.js';
import Triple from '../models/Triple.js';
import errors from 'restify-errors';
import { log } from '../lib/logger.js';
import mongoose from 'mongoose';
import config from '../config/index.cjs';
import Promise from 'bluebird';

export default function(app, passport) {
  app.get('/stats', function(req, res, next) {
    return Promise.join(
      User.cumulativeGamesPlayed(),
      User.newUsersByMonth(),
      User.playersByGender(),
      User.averageGamesPerActiveUserByMonth(),
      GameInstance.newGamesByMonth(),
      Triple.distCertaintySupport()
    )
      .then(([
        cumulativeGames,
        newUsersByMonth,
        playersByGender,
        gamesByMonth,
        averageGames,
        distCertaintySupport
      ]) => {
        res.send({
          cumulativeGames,
          newUsersByMonth,
          playersByGender,
          gamesByMonth,
          averageGames,
          distCertaintySupport
        });
        return next();
      });
  });

};
