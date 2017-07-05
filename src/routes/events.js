'use strict';

const Promise = require('bluebird');
const _ = require('underscore');

const router = require('express').Router();
const middlewares = require('../middlewares');

module.exports = function(app) {
  const Errors = app.get('errors');
  const models = app.get('models');

  router.use(middlewares.auth);

  router.param('id', function(req, res, next) {
    models.Event.findById(req.params.id)
    .then(function(event) {
      if (!event) {
        next(new Errors.NotFound('User haven\'t this event'));
      }

      req.event = event;
      next();
    })
    .catch(next);
  });

  /**
    * @api {post} /events Create event
    * @apiGroup Events
    * @apiDescription Create event and invites to it
    *
    * @apiUse Authorization
    *
    * @apiParam {Object} event fields with information about event
    * @apiParam {String[]} phones Array of phones to invite to event
    * @apiParam {String[]} groups Array of groups, which contacts should be invite to event
    *
    * @apiSuccess {Object} event Event object that created
    */

  router.post('/', function (req, res, next) {
    const phones = req.body.phones;
    const groups = req.body.groups;

    req.user.createEvent(req.body.event)
    .then(function(event) {
      return req.user.createInvites(event, phones, groups)
      .then(function() {
        return event;
      });
    })
    .then(function(event) {
      res.send(event);
    })
    .catch(function(err) {
      next(err);
    });
  });

  /**
    * @api {put} /events/:id Update event information
    * @apiGroup Events
    * @apiDescription Update event if the user is creator
    *
    * @apiUse Authorization
    *
    * @apiParam EventFields fields with information about event
    *
    * @apiSuccess {Object} event Event object that updated
    */

  router.put('/:id',
    middlewares.isEventOwner,
    function(req, res, next) {
      Object.assign(req.event, req.body)

      req.event.save()
      .then(function(event) {
        res.send(event);
      })
      .catch(function(err) {
        next(err);
      });
    }
  );

  /**
    * @api {put} /events/:id/leave Leave event by creator
    * @apiGroup Events
    * @apiDescription Leave event by its creator and set admin next member
    *
    * @apiUse Authorization
    *
    * @apiSuccess {Boolean} leaved User who became admin
    * @apiSuccess {Object} admin User who became admin or null if there is no one
    */

  router.put('/:id/leave',
    function(req, res, next) {
      new Promise(function(resolve, reject) {
        if (req.event.creator.toString() === req.user.id) {
          return models.Invite.findOne({
            event: req.event._id,
            status: 1
          })
          .sort({ updatedAt: 1 })
          .then(function(invite) {
            if (!invite) {
              return Promise.all([
                models.Invite.findOneAndUpdate({
                    event: req.event._id,
                    phone: req.user.phone,
                    status: 5
                  }, { status: 4 }
                ),
                req.event.remove()
              ])
              .then(function() {
                return resolve();
              });
            }

            return invite.findUser()
            .then(function(user) {
              req.event.creator = user._id;
              invite.status = 5;

              return Promise.all([
                req.event.save(),
                invite.save()
              ])
              .then(function() {
                return resolve(user);
              });
            });
          });
        } else {
          return models.Invite.findOneAndUpdate({
            event: req.event._id,
            phone: req.user.phone,
            status: 1
          }, { status: 4 })
          .then(function() {
            return resolve();
          });
        }
      })
      .then(function(user) {
        return res.send({
          leaved: true,
          newAdmin: user ? user : null
        });
      })
      .catch(next);
    }
  );

  /**
    * @api {delete} /events/:id Delete event and invitations
    * @apiGroup Events
    * @apiDescription Delete event and invitations
    *
    * @apiUse Authorization
    *
    * @apiSuccess {Object} event Deleted event
    */

  router.delete('/:id',
    middlewares.isEventOwner,
    function(req, res, next) {
      models.Invite.remove({
        event: req.event._id
      })
      .then(function() {
        return req.event.remove();
      })
      .then(function(event) {
        return res.send(event);
      })
      .catch(next);
    }
  );

  /**
    * @api {put} /events/:id/invites Invite contacts to the event by id
    * @apiGroup Events
    * @apiDescription Invites contacts to the event by its creator
    * Contacts can be phones or groups.
    * In case if there is any group, invites creates for the phones in the group
    *
    * @apiUse Authorization
    *
    * @apiParam {String[]} phones Array of phones to invite to event
    * @apiParam {String[]} groups Array of groups, which contacts should be invite to event
    *
    * @apiSuccess {Object} event Event object
    * @apiSuccess {Number} invitesCount Count of the invitations to event
    */

  router.put('/:id/invites', function(req, res, next) {
    const phones = req.body.phones;
    const groups = req.body.groups;

    req.user.createInvites(req.event, phones, groups)
    .then(function(invites) {
      const invitesCount = invites instanceof Array ? invites.length : 0;

      res.send({
        event: req.event,
        invitesCount: invitesCount
      });
    })
    .catch(next);
  });

  /**
    * @api {put} /events/:id/drop Drop contact from the event
    * @apiGroup Events
    *
    * @apiUse Authorization
    *
    * @apiParam {String} phone Contact that drop from event
    *
    * @apiSuccess {Object} invite Invite that was rejected by creator
    */

  router.put('/:id/drop',
    middlewares.isEventOwner,
    function(req, res, next) {
      const phone = req.body.phone;

      if (!phone) {
        return next(new Errors.Bad('No contact to drop from the event'));
      }

      models.Invite.findOne({
        phone: phone
      })
      .then(function(invite) {
        invite.status = 3;

        return invite.save();
      })
      .then(function(invite) {
        return res.send(invite);
      })
      .catch(next);
    }
  );

  /**
    * @api {get} /events/:id/members Get event members
    * @apiGroup Events
    * @apiDescription Get members of the event, that accept invitation, except creator.
    * Creator is in event information
    *
    * @apiUse Authorization
    *
    * @apiSuccess {String[]} phones Array of contacts(phones) that accepted invitation to the event
    */

  router.get('/:id/members', function(req, res, next) {
    req.event.populate('creator').getMembers(req.user)
    .then(function(members) {
      res.send(members);
    })
    .catch(next);
  });

  /**
    * @api {get} /events/rooms Get events rooms
    * @apiGroup Events
    * @apiDescription Get events rooms with chat where user takes part
    *
    * @apiUse Authorization
    *
    * @apiSuccess {Object[]} events Events with chat where user takes part
    */

  router.get('/rooms', function(req, res, next) {
    models.Invite.find({
      phone: req.user.phone,
      status: 1
    })
    .then(function(invites) {
      invites = invites.map(function(invite) {
        return invite.event;
      });

      return models.Event.find({
          chatIsActive: true,
          $or: [
            {
              creator: req.user._id
            }, {
              _id: { $in: invites }
            }
          ]
        }, null , {
          order: {
            'startTime': 1
          }
      });
    })
    .then(function(events) {
      const now = new Date;

      let groupedEvents = _.groupBy(events, function(event) {
        if (event.startTime > now) {
          return 'future';
        } else if (event.endTime < now) {
          return 'past';
        } else {
          return 'current';
        }
      });

      groupedEvents = [
        {
          title: 'future',
          events: groupedEvents['future'] || []
        },
        {
          title: 'current',
          events: groupedEvents['current'] || []
        },
        {
          title: 'past',
          events: groupedEvents['past'] || []
        }
      ];

      return res.send(groupedEvents);
    })
    .catch(next);
  });

  return router;
};
