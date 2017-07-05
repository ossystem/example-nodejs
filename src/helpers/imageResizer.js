'use strict'

const Jimp = require('jimp');

module.exports = function(filePath, options) {
  const maxWidth = options.maxWidth;
  const maxHeight = options.maxHeight;

  return Jimp.read(filePath)
    .then(function(image) {
      const width = image.bitmap.width;
      const height = image.bitmap.height;
      var x, y, factor;

      if (width > maxWidth || height > maxHeight) {
        if (width > height) {
          x = (width - height)/2;
          y = 0;

          if (height > maxHeight) {
            factor = maxHeight;
          } else {
            factor = height;
          }

          image
            .crop(x, y, height, height);
        } else if (height > width) {
          x = 0;
          y = (height - width)/2;

          if (width > maxWidth) {
            factor = maxWidth;
          } else {
            factor = width;
          }

          image
            .crop(x, y, width, width);
        } else {
          x = 0;
          y = 0;
          factor = maxWidth;
        }

        image
          .resize(factor, Jimp.AUTO)
          .write(filePath);
      }

      return image;
    });
};
