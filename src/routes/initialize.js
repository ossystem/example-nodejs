'use strict';

const router = require('express').Router();
const sendSMS = require('../helpers/sendSMS');

const ENV = process.env.NODE_ENV;

module.exports = function(app) {
  const Errors = app.get('errors');
  const models = app.get('models');
  const User = models.User;
  const SmsCode = models.SmsCode;

  /**
    * @api {post} /initialize Init route
    * @apiGroup Initialize
    * @apiDescription Recieve phone of user and send sms code to confirm his phone
    *
    * @apiParam {String} phone parameter is required
    *
    * @apiSuccess {String} code|status In production -
    * send sms to phone and response with status of sending.
    * In other cases return code in response
    */

  router.post('/', function(req, res, next) {
    const phone = req.body.phone;

    if (!phone) {
      return next(new Errors.Bad('There is no phone number'));
    }

    User.findOne({phone: phone})
    .then(function(user) {
      if (user) {
        return user;
      }

      user = new User({
        phone: phone
      });

      return user.save();
    })
    .then(function(user) {
      return SmsCode.create({
        phone: phone
      });
    })
    .then(function(smsCode) {
      if (ENV === 'production') {
        return sendSMS(phone, smsCode.code)
        .then(function(status) {
          return res.send(status);
        });
      }

      return res.send(smsCode);
    })
    .catch(next);
  });

  /**
    * @api {put} /initialize Confirm phone by sms code
    * @apiGroup Initialize
    *
    * @apiParam {String{4}} code parameter is required
    * @apiParam {String} phone parameter is required
    *
    * @apiSuccess {Object} user Created user with token
    */

  router.put('/', function(req, res, next) {
    const code = req.body.code;
    const phone = req.body.phone;

    if (!code) {
      return next(new Errors.Bad('There is no code'));
    }

    SmsCode.findOne({code: req.body.code})
    .then(function(code) {
      if (!code.checkPhone(phone)) {
        throw(new Errors.Bad('Incorrect phone for this code'));
      }

      if (code.isExpired()) {
        throw(new Errors.Bad('Code life time is expired'));
      }

      return User.findOneAndUpdate({phone: phone}, {
        active: true
      }, {new: true});
    })
    .then(function(user) {
      res.send(user);
    })
    .catch(function(err) {
      next(err);
    });
  });

  return router;
};
