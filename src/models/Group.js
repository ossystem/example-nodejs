'use strict';

const mongoose = require('mongoose');
const _ = require('underscore');

var GroupSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    default:'Unknown'
  },
  phones: [String]
});

module.exports = mongoose.model('Group', GroupSchema);
