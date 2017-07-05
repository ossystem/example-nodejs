'use strict'

const BearerStrategy = require('passport-http-bearer').Strategy;

module.exports = function(User) {
  return new BearerStrategy(function(token, cb) {
    User.findOne({
      token: token,
      active: true
    })
    .then(function(user) {
      return cb(null, user);
    })
    .catch(function(err) {
      return cb(new Error(err));
    });
  });
};
