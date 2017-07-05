'use strict'

const Promise = require('bluebird');
const fs = require('fs');

const fsStat = Promise.promisify(fs.stat);
const fsUnlink = Promise.promisify(fs.unlink);

module.exports = {
  removeFile: function(filePath) {
    return fsStat(filePath)
    .then(function(stats) {
      if (stats.isFile()) {
        return fsUnlink(filePath);
      }

      return;
    });
  }
}
