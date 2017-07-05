'use strict'

const Promise = require('bluebird');

const models = require('../models');

module.exports = {
  isMemberOfEvent: function(event, user) {
    return new Promise(function(resolve, reject) {
      if (event.creator.toString() === user.id) {
        resolve(event);
      } else {
        models.Invite.findOne({
          event: event._id,
          phone: user.phone,
          status: 1
        })
        .then(function(invite) {
          if (!invite) {
            reject(new Error('User doesn\'t take part in event'));
          } else {
            resolve(event);
          }
        });
      }
    });
  },
  getRoomMembers: function(room) {
    return Object.keys(room).map(function(member) {
      return room[member].username;
    });
  },
  getLastMessages: function(eventId, count) {
    return models.Message.find({
      event: eventId
    })
    .sort({createdAt: -1})
    .limit(count)
    .populate({
      path: 'user',
      select: 'username avatar'
    })
    .select('-event -__v')
    .then(function(messages) {
      return messages.map(function(message) {
        message = message.toObject();
        message.user.name = message.user.username;
        return message;
      });
    });
  },
  roomBroadcast: function(room, msg, except) {
    Object.keys(room).forEach(function(reciever) {
      if (reciever === except) {
        return;
      }

      room[reciever].conn.send(JSON.stringify(msg));
    });
  }
}
