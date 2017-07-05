'use strict';

const Promise = require('bluebird');
const mongoose = require('mongoose');
const _ = require('underscore');

const dateHelpers = require('../helpers/dateHelpers');

const EventSchema = new mongoose.Schema({
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  description: {
    type: String
  },
  location: {
    type: String
  },
  chatIsActive: {
    type: Boolean,
    default: false
  },
  startTime: {
    type: Date,
    //required: true
  },
  endTime: {
    type: Date,
    //required: true
  }
}, {
  timestamps: true
});

EventSchema.pre('save', function(next) {
  if (!this.startTime || !this.endTime) {
    this.meetingAt = 'now';
  }

  return next();
});

EventSchema.virtual('meetingAt').set(function(meetingValue) {
  var start;
  var end;

  switch (meetingValue) {
    case 'now':
    case 'noon':
    case 'after noon':
    case 'night':
      start = dateHelpers.today0_00(); // today 0:00
      end = dateHelpers.tommorow0_00(); // tommorow 0:00
      break;
    case 'tommorow noon':
    case 'tommorow after noon':
    case 'tommorow night':
      start = dateHelpers.tommorow0_00();; // tommorow 0:00
      end = dateHelpers.afterTommorow0_00();; // after tommorow 0:00
      break;
    default:
      start = dateHelpers.today0_00(); // today 0:00
      end = dateHelpers.tommorow0_00(); // tommorow 0:00
  };

  this.startTime = start;
  this.endTime = end;
});

EventSchema.methods.getMembers = function(finder) {
  return this.model('Invite').find({
    event: this._id,
    status: 1
  })
  .then(function(invites) {
    const phones = _.pluck(invites, 'phone');
    return _.without(phones, finder.phone);
  });
};

module.exports = mongoose.model('Event', EventSchema);
