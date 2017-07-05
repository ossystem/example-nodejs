'use strict';

const mongoose = require('mongoose');

const InviteSchema = new mongoose.Schema({
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  inviter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // 0 - not read
  // 1 - accept
  // 2 - reject
  // 3 - was excluded
  // 4 - leave the event
  // 5 - became admin
  status: {
    type: Number,
    min: 0,
    max: 5,
    default: 0
  }
  // acceptRejectTime: {
  //   type: Date
  // },
  // endTime: {
  //   type: Date,
  //   //required: true
  // }
}, {
  timestamps: true
});

InviteSchema.methods.findUser = function() {
  return this.model('User').findOne({
    phone: this.phone
  });
};

module.exports = mongoose.model('Invite', InviteSchema);
