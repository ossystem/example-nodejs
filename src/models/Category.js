'use strict';

const mongoose = require('mongoose');

const CategorySchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  parentCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  },
  imageSrc: {
    type: String
  }
});

module.exports = mongoose.model('Category', CategorySchema);
