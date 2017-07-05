var Promise = require('bluebird');

const mongoose = require('mongoose');
var models = require('./models');
var categoryFixtures = require('./fixtures/categories');
var Category = models.Category;

const config = require('../../Shoki/config');

mongoose.Promise = global.Promise;

const db = mongoose.connect(config.mongodb);

module.exports = function() {
  return Category.remove()
  .then(function() {
    var promises = [];

    categoryFixtures.forEach(function(category) {
      promises.push(
        Category.create({
          title: category.title
        })
        .then(function(parentCategory) {
          var childCategories = category.subCategories.map(function(childCategory) {
            return {
              title: childCategory.title,
              imageSrc: childCategory.imageSrc,
              parentCategory: parentCategory._id
            };
          });

          return Category.create(childCategories);
        })
      );
    });

    return Promise.all(promises);
  })
  .then(function() {
    return Promise.all([
      models.User.remove(),
      models.SmsCode.remove(),
      models.Group.remove(),
      models.Contact.remove(),
      models.Event.remove(),
      models.Invite.remove()
    ]);
  })
  .then(function() {
    if (process.env.NODE_ENV !== 'test') {
      console.log('Migration is done');
    }

    return new Promise(function(res, rej) {
      db.disconnect(res);
    });
  })
  .catch(function(err) {
    console.log(err);

    return new Promise(function(res, rej) {
      db.disconnect(res);
    });
  });
};
