'use strict';

const router = require('express').Router();

const middlewares = require('../middlewares');

module.exports = function(app) {
  const Errors = app.get('errors');
  const models = app.get('models');

  /**
    * @api {get} /users Get users
    * @apiGroup Users
    *
    * @apiSuccess {Object[]} users List of all users
    */

  router.get('/',
    function(req, res, next) {
      models.User.find({
        active: true
      })
      .select('-token -active')
      .then(function(users) {
        return res.send(users);
      })
      .catch(next);
    }
  );

  /**
    * @api {get} /users/:id Get user
    * @apiGroup Users
    *
    * @apiSuccess {Object} user
    */

  router.get('/:id',
    function(req, res, next) {
      models.User.findOne({
        _id: req.params.id,
        active: true
      })
      .select('-token -active')
      .then(function(user) {
        if (!user) {
          return next(new Errors.NotFound('User not found'));
        }

        return res.send(user);
      })
      .catch(next);
    }
  );

  return router;
};
