'use strict';

const Promise = require('bluebird');
const router = require('express').Router();

const middlewares = require('../middlewares');

module.exports = function(app) {
  const Errors = app.get('errors');
  const models = app.get('models');

  router.use(middlewares.auth);

  router.param('id', function(req, res, next) {
    models.Group.findOne({
      _id: req.params.id,
      user: req.user._id
    })
    .then(function(group) {
      if (!group) {
        next(new Errors.NotFound('User haven\'t this group'));
      }

      req.group = group;
      next();
    })
    .catch(next);
  });

  /**
    * @api {get} /groups Get list of user groups
    * @apiGroup Groups
    *
    * @apiUse Authorization
    *
    * @apiSuccess {Object[]} groups Array of user groups
    */

  router.get('/',
    function(req, res, next) {
      models.Group.find({
        user: req.user._id
      })
      .sort({_id: -1})
      .then(function(groups) {
        res.send(groups);
      })
      .catch(next);
    }
  );

  /**
    * @api {get} /groups/:id Get group by id
    * @apiGroup Groups
    * @apiDescription return group if it belongs to user
    *
    * @apiUse Authorization
    *
    * @apiSuccess {Object} group User group with phones
    */

  router.get('/:id',
    function(req, res, next) {
      res.send(req.group);
    }
  );

  /**
    * @api {post} /groups Create new group
    * @apiGroup Groups
    * @apiDescription create group with minimum 2 contacts
    *
    * @apiUse Authorization
    *
    * @apiParam {String} title parameter is required
    * @apiParam {String[]} phones Array of phones, minimum 2. Parameter is required
    *
    * @apiSuccess {Object} group Created group
    */

  router.post('/',
    function(req, res, next) {
      const title = req.body.title;
      const phones = req.body.phones;

      if (!(phones instanceof Array)) {
        return next(new Errors.Bad('There is no contact to create group'));
      }

      if (phones.length < 2) {
        return next(new Errors.Bad('There are not enough contacts to create group'));
      }

      req.user.addGroup(title, phones)
      .then(function(group) {
        res.send(group);
      })
      .catch(next);
    }
  );

  /**
    * @api {put} /groups/:id Update contacts in group
    * @apiGroup Groups
    * @apiDescription update group if it belongs to user
    *
    * @apiUse Authorization
    *
    * @apiParam {String[]} phones Array of phones to update group
    *
    * @apiSuccess {Object} Updated group
    */

  router.put('/:id',
    function(req, res, next) {
      const phones = req.body.phones;

      if (!(phones instanceof Array)) {
        return next(new Errors.Bad('There is no contact to update the group'));
      }

      if (phones.length < 2) {
        return next(new Errors.Bad('There are not enough contacts to update group'));
      }

      req.group.phones = phones;
      req.group.title = req.body.title || req.group.title;

      req.group.save()
      .then(function(group) {
        res.send(group);
      })
      .catch(next);
    }
  );

  /**
    * @api {delete} /groups/:id Delete group by id
    * @apiGroup Groups
    * @apiDescription delete group if it belongs to user
    *
    * @apiUse Authorization
    */

  router.delete('/:id',
    function(req, res, next) {
      req.group.remove()
      .then(function() {
        res.status(200).end();
      })
      .catch(next);
    }
  );

  return router;
};
