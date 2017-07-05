'use strict'

const Errors = require('../errors');
const randomstring = require('randomstring');

module.exports = {
  imageFilter: function(req, file, cb) {
    if (/^image\//.test(file.mimetype)) {
      return cb(null, true);
    }

    cd(new Errors.Bad('Uploaded file is not image'));
  },
  filename: function(req, file, cb) {
    const newFileName = randomstring.generate(12);
    const fileName = file.originalname.replace(/^.+(\..+)$/, newFileName + '$1');

    return cb(null, fileName);
  }
};
