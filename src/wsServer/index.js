'use strict'

const models = require('../models');
const helpers = require('./helpers');
const rooms = {};

module.exports = function(ws, req) {
  var user;

  models.User.findOne({
    token: req.params.token,
    active: true
  })
  .then(function(usr) {
    if (!usr) {
      throw new Error('Authentication failed');
    }

    user = usr;

    return models.Event.findOne({
      _id: req.params.event
    });
  })
  .then(function(event) {
    if (!event) {
      throw new Error('No event was found');
    }

    if (!event.chatIsActive) {
      throw new Error('Chat is not active for this event');
    }

    return helpers.isMemberOfEvent(event, user);
  })

  // Chat logic

  .then(function(event) {
    const eventId = event.id;
    const userId = user.id;

    if ((typeof rooms[eventId] !== 'object') && (rooms[eventId] !== null)) {
      rooms[eventId] = {};
    }

    var curRoom = rooms[eventId]; // current room

    ws.send(JSON.stringify({
      type: 'members',
      body: helpers.getRoomMembers(curRoom)
    }));

    curRoom[userId] = {
      conn: ws,
      username: user.username
    };

    helpers.roomBroadcast(curRoom, {
      type: 'join',
      body: user.username
    }, userId);

    const n = 10; // количество последних выводимых сообщений
                  // вынести в config

    helpers.getLastMessages(eventId, n)
    .then(function(messages) {
      ws.send(JSON.stringify({
        type: 'messages',
        body: messages
      }));
    });

    ws.on('message', function(msg) {
      models.Message.create({
        user: userId,
        event: eventId,
        text: msg
      })
      .then(function(message) {
        message = message.toObject();
        message.user = {
          _id: userId,
          name: user.username,
          avatar: user.avatar
        };

        helpers.roomBroadcast(curRoom, {
          type: 'message',
          body: message
        });
      });
    });

    ws.on('close', function() {
      delete curRoom[userId];

      if (Object.keys(curRoom).length < 1) {
        return delete rooms[eventId];
      }

      helpers.roomBroadcast(curRoom, {
        type: 'exit',
        body: user.username
      });
    });
  })
  .catch(function(err) {
    ws.send(JSON.stringify({
      type: 'error',
      body: err
    }));

    if (process.env.NODE_ENV === 'development') {
      console.log(err);
    }
  });
};
