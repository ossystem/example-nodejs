'use strict'

const passport = require('passport');
const mongoose = require('mongoose');
const util = require('util');
const Errors = require('./errors');
const config = require('../../Shoki/config');

module.exports = {
  auth: passport.authenticate('bearer', { session: false }),
  isEventOwner: function(req, res, next) {
    if (req.event.creator.toString() !== req.user.id) {
      return next(new Errors.Bad('User isn\'t creator of event'));
    }

    return next();
  },
  delay: function(req, res, next) {
    setTimeout(next, config.devDelayTime);
  },
  notFound: function(req, res, next) {
    next(new Errors.NotFound());
  },
  errorHandler: function(err, req, res, next) {
    // if (process.env.NODE_ENV === 'development') {
    //   console.log(err);
    // }

    const errBody = {};

    if (err instanceof mongoose.Error.ValidationError) {
      var messages = {
        'required': "%s is required.",
        'min': "%s below minimum.",
        'max': "%s above maximum.",
        'enum': "%s not an allowed value.",
        'regexp': "%s is not correct"
      };

      errBody.errors = [];

      Object.keys(err.errors).forEach(function (field) {
        var eObj = err.errors[field].properties;

        if (!messages.hasOwnProperty(eObj.type)) {
          errBody.errors.push(eObj.message);
        } else {
          errBody.errors.push(util.format(messages[eObj.type], eObj.path));
        }
      });

      err.status = 400;
    } else {
      errBody.error = err.message;
    }

    res.status(err.status || 500);
    res.json(errBody);
  }
}
