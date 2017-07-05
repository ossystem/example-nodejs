'use strict';

const Promise = require('bluebird');
const multer = require('multer');
const path = require('path');
const _ = require('underscore');
const router = require('express').Router();

const middlewares = require('../middlewares');
const imageResizer = require('../helpers/imageResizer');
const multerHelpers = require('../helpers/multerHelpers');
const filesHelper = require('../helpers/filesHelper');

module.exports = function(app) {
  const Errors = app.get('errors');
  const models = app.get('models');
  const config = app.get('config');

  console.log(path.join(config.get('homeDir'), 'upload'));

  router.use(middlewares.auth);

  /**
    * @api {get} /profile Get user profile
    * @apiGroup Profile
    * @apiUse Authorization
    *
    * @apiSuccess {Object} user User object
    */

  router.get('/',
    function(req, res, next) {
      res.send(req.user);
    }
  );

  /**
    * @api {put} /profile Change user profile
    * @apiGroup Profile
    * @apiUse Authorization
    *
    * @apiParam {String} username
    *
    * @apiSuccess {Object} user Updated user object
    */

  router.put('/',
    function(req, res, next) {
      req.user.username = req.body.username;
      // req.user.favorite = req.body.favorite;

      req.user.save()
      .then(function(user) {
        res.send(user);
      })
      .catch(next);
    }
  );

  /**
    * @api {put} /profile/avatar Change user avatar
    * @apiGroup Profile
    * @apiUse Authorization
    *
    * @apiParam file.avatar File image of new avatar
    *
    * @apiSuccess {Object} user Updated user object
    */

  router.put('/avatar',
    multer({
      storage: multer.diskStorage({
        destination: path.join(config.get('homeDir'), 'upload'),
        filename: multerHelpers.filename
      }),
      fileFilter: multerHelpers.imageFilter
    }).single('avatar'),
    function(req, res, next) {
      imageResizer(req.file.path, config.get('app:avatar'))
      .then(function(image) {
        const oldFilePath = path.join(config.get('homeDir'), req.user.avatar);

        return new Promise(function(resolve, reject) {
          if (/\/public\//.test(req.user.avatar)) {
            return resolve();
          } else {
            return filesHelper.removeFile(oldFilePath)
            .then(function() {
              return resolve();
            });
          }
        });
      })
      .then(function() {
        req.user.avatar = '/upload/' + req.file.filename;
        return req.user.save();
      })
      .then(function(user) {
        return res.send(user);
      })
      .catch(next);
    }
  );

  /**
    * @api {get} /profile/categories Get categories with user favorite
    * @apiGroup Profile
    * @apiUse Authorization
    *
    * @apiSuccess {Object[]} categories Array of categories with flags `isFavorite`.
    */

  router.get('/categories',
    function(req, res, next) {
      models.Category.find()
      .then(function(categories) {
        const favorite = req.user.favorite.map(function(category) {
          return category.toString();
        });

        categories = categories.map(function(category) {
          category = category.toObject();
          category.isFavorite = _.contains(favorite, category._id.toString());
          return category;
        });

        return res.send(categories);
      })
      .catch(next);
    }
  );

  /**
    * @api {put} /profile/favorite Update user favorite categories
    * @apiGroup Profile
    * @apiUse Authorization
    *
    * @apiParam {String[]} categories Array of categories to update favorite.
    * If categories is not array - favorite
    *
    * @apiSuccess {Object} user Updated user
    */

  router.put('/favorite',
    function(req, res, next) {
      var categories = req.body.categories;

      if (!(categories instanceof Array)) {
        categories = [];
      }

      req.user.favorite = categories;

      req.user.save()
      .then(function(user) {
        return res.send(user);
      })
      .catch(next);
    }
  );

  /**
    * @api {put} /profile/favorite/:id Update one user's favorite category
    * @apiGroup Profile
    * @apiUse Authorization
    *
    * @apiSuccess {Object} user Updated user
    */

  router.put('/favorite/:id',
    function(req, res, next) {
      const favoriteId = req.params.id;

      models.Category.findById(favoriteId)
      .then(function(category) {
        if (!category) {
          throw new Errors.Bad('There is no category');
        }

        let categories = req.user.favorite.map(function(category) {
          return category.toString();
        });

        const isFavorite = categories.some(function(category) {
          return category === favoriteId;
        });

        if (isFavorite) {
          categories = _.without(categories, favoriteId);
        } else {
          categories.push(favoriteId);
        }

        req.user.favorite = categories;

        return req.user.save();
      })
      .then(function(user) {
        return res.send(user);
      })
      .catch(next);
    }
  );

  /**
    * @api {get} /profile/contacts/common Get count of common contacts with each of user contact
    * @apiGroup Profile
    * @apiUse Authorization
    *
    * @apiSuccess {Object[]} commons Array of counts for each user contact (phone)
    */

  router.get('/contacts/common',
    function(req, res, next) {
      models.Contact.find({
        user: req.user._id,
      })
      .then(function(contacts) {
        const phones = _.pluck(contacts, 'phone');

        return new Promise.map(phones, function(phone) {
          return models.User.findOne({
            phone: phone
          })
          .then(function(user) {
            return models.Contact.find({
              user: user._id,
              phone: {$in: phones}
            });
          })
          .then(function(contacts) {
            return {
              [phone]: contacts.length
            };
          });
        });
      })
      .then(function(commons) {
        return res.send(commons);
      })
      .catch(next);
    }
  );

  /**
    * @api {get} /profile/contacts/common/:phone Get count of common contacts
    * @apiGroup Profile
    * @apiUse Authorization
    *
    * @apiSuccess {Number} count Count of common contacts
    */

  router.get('/contacts/common/:phone',
    function(req, res, next) {
      models.User.findOne({
        phone: req.params.phone
      })
      .then(function(requestedUser) {
        if (!requestedUser) {
          throw(new Errors.NotFound('User with its phone not found'))
        }

        return models.Contact.find({
          user: req.user._id
        })
        .then(function(contacts) {
          return models.Contact.find({
            user: requestedUser._id,
            phone: {$in: _.pluck(contacts, 'phone')}
          });
        });
      })
      .then(function(contacts) {
        return res.send({
          count: contacts.length
        });
      })
      .catch(next);
    }
  );

  /**
    * @api {post} /profile/contacts Save contacts
    * @apiGroup Profile
    * @apiDescription Save contacts of user from telophone book to database
    * @apiUse Authorization
    *
    * @apiParam {String[]} array of phones
    *
    * @apiSuccess {Object[]} contacts Array of created contacts objects
    */

  router.post('/contacts',
    function(req, res, next) {
      req.user.addContacts(req.body.phones)
      .then(function(contacts) {
        res.send(contacts);
      })
      .catch(next);
    }
  );

  return router;
};
