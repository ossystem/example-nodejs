'use strict';

const Promise = require('bluebird');

const router = require('express').Router();
const middlewares = require('../middlewares');

module.exports = function(app) {
  const Errors = app.get('errors');
  const models = app.get('models');

  router.use(middlewares.auth);

  /**
    * @api {get} /invites Get invites
    * @apiGroup Invites
    * @apiDescription Get invitations, that user were invited.
    * Invites are neither accepted nor rejected
    *
    * @apiUse Authorization
    *
    * @apiSuccess {Object[]} invites Array of invitations with events
    */

  router.get('/', function(req, res, next) {
    req.user.getInvites()
    .populate({
      path: 'event',
      populate: {
        path: 'category'
      }
    })
    .populate('inviter')
    .then(function(invites) {
      return res.send(invites);
    })
    .catch(next);
  });

  /**
    * @api {put} /invites/:id Accept or reject invite
    * @apiGroup Invites
    * @apiDescription Accept or reject invite if it has status 'not read'
    *
    * @apiUse Authorization
    *
    * @apiParam {Number{1-2}} status User can or accept the invite to event - 1 either reject - 2
    *
    * @apiSuccess {Object} invite Invite that user accepted or rejected
    */

  router.put('/:id', function(req, res, next) {
    const status = req.body.status;

    if (status !== 1 && status !== 2) {
      return next(new Errors.Bad('Undefined status'));
    }

    models.Invite.findOneAndUpdate({
      _id: req.params.id,
      phone: req.user.phone,
      status: 0
    }, {
      status: status
    }, {new: true})
    .populate('event')
    .then(function(invite) {
      if (invite.status !== 1) {
        return invite;
      } else {
        return new Promise(function(resolve, reject) {
          if (!invite.event.chatIsActive) {
            models.Event.findOneAndUpdate({
              _id: invite.event
            }, {
              chatIsActive: true
            }, {new: true})
            .then(function(event) {
              invite.event = event;
              resolve(invite);
            });
          } else {
            resolve(invite);
          }
        });
      }
    })
    .then(function(invite) {
      return res.send(invite);
    })
    .catch(next);
  });

  return router;
};
