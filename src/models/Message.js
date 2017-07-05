'use strict';

const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  text: {
    type: String
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Message', MessageSchema);
