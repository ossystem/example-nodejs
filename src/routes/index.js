'use strict';

const router = require('express').Router();

/**
 * @apiDefine Authorization
 * @apiHeader Authorization Bearer {token}
 */

module.exports = function(app) {
  router.use('/initialize', require('./initialize')(app));
  router.use('/users', require('./users')(app));
  router.use('/profile', require('./profile')(app));
  router.use('/groups', require('./groups')(app));
  router.use('/categories', require('./categories')(app));
  router.use('/events', require('./events')(app));
  router.use('/invites', require('./invites')(app));

  return router;
};
