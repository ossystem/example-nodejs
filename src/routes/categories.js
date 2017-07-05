'use strict';

const router = require('express').Router();

module.exports = function(app) {
  const models = app.get('models');
  /**
    * @api {get} /categories
    * @apiGroup Categories
    * @apiDescription Get list of all categories and subcategories
    *
    * @apiSuccess {Object[]} categories Array of categories
    */

  router.get('/', function (req, res, next) {
    models.Category.find()
    .then(function(categories) {
      res.send(categories);
    })
    .catch(next);
  });

  return router;
};
