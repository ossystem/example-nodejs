'use strict';

const Promise = require('bluebird');
const mongoose = require('mongoose');
const _ = require('underscore');
const randomstring = require('randomstring');

var UserSchema = new mongoose.Schema({
  username: {
    type: String,
    default:'Unknown'
  },
  phone: {
    type: String,
    unique: true,
    required: true,
    //match: /\+33(6|7)\d{8}/
  },
  avatar: {
    type: String,
    default: '/public/images/panda.jpg'
  },
  status: {
    type: String
  },
  token: {
    type: String,
    unique: true,
    required: true,
    default: function() {
      return randomstring.generate(12);
    }
  },
  favorite: {
    type: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category'
    }]
  },
  active: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

UserSchema.methods.addContacts = function(phones) {
  const user = this;

  return user.model('Contact').remove({
    user: user._id,
    phone: {
      $nin: phones
    }
  })
  .then(function() {
    return Promise.map(phones, function(phone) {
      const query = {
        user: user._id,
        phone: phone
      };

      return user.model('Contact').findOneAndUpdate(query,
        {$set: {phone: phone}},
        {
          new: true,
          upsert: true
        }
      );
    });
  });
};

UserSchema.methods.addGroup = function(title, phones) {
  return this.model('Group').create({
    user: this._id,
    title: title,
    phones: phones
  });
};

UserSchema.methods.createEvent = function(data) {
  const event = Object.assign({
    creator: this._id
  }, data);

  return this.model('Event').create(event);
};

UserSchema.methods.createInvites = function(event, phones, groups) {
  const user = this;

  if (!phones) {
    phones = [];
  }

  return new Promise(function(resolve, reject) {
    if (groups instanceof Array && groups.length > 0) {

      return user.model('Group').find({
        user: user._id,
        _id: {$in: groups}
      })
      .then(function(groups) {
        groups.forEach(function(group) {
          phones = _.union(phones, group.phones);
        });

        return resolve(phones);
      })
      .catch(function(err) {
        reject(err);
      });
    }

    return resolve(_.unique(phones));
  })
  .then(function(phones) {
    return Promise.map(phones, function(phone) {
      const query = {
        event: event._id,
        phone: phone,
        inviter: user._id,
        status: 0
      };

      return user.model('Invite').findOneAndUpdate(query, {
        $set: query
      }, {
        new: true,
        upsert: true
      });
    });
  });
};

UserSchema.methods.getInvites = function() {
  return this.model('Invite').find({
    phone: this.phone,
    status: 0
  });
};

module.exports = mongoose.model('User', UserSchema);
