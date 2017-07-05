const expect = require('chai').expect;
const Promise = require('bluebird');
const supertest = require('supertest-as-promised');
const mongoose = require('mongoose');
const path = require('path');
const _ = require('underscore');

const config = require('./config');
const app = require('../src/app')(config);
const request = supertest(app);
const models = app.get('models');
const userFixtures = require('./fixtures/users');

const dbInit = require('../src/migration-initial');

mongoose.Promise = global.Promise;

describe('Acceptance test', function() {
  const userFixture = userFixtures[0];
  const phone = userFixture.phone;
  let categories;
  let user;
  let requestedUser;
  let users;
  let smsCode;
  let group;
  let event;
  let invite;

  before(function(done) {
    dbInit()
    .then(function() {
      mongoose.connect(config.get('database:connection'),
        function(err) {
          done();
      });
    });
  });

  it('Categories test', function(done) {
    request
      .get('/api/categories')
      .expect(200)
      .end(function(err, res) {
        categories = res.body;

        categories.forEach(function(category) {
          expect(category).to.have.property('title');
        });
        done();
      });
  });

  describe('Initialize user by phone number', function() {
    it('Error if no phone was sent', function(done) {
      request
        .post('/api/initialize')
        .expect(400)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          expect(res.body).to.have.property('error', 'There is no phone number');
          done();
        });
    });

    it('Send sms code if success', function(done) {
      request
        .post('/api/initialize')
        .send({ phone: phone })
        .expect(200)
        .then(function(res) {
          smsCode = res.body.code;

          expect(res.body.code.toString()).to.have.length(4);
          // check that is a date
          expect(res.body).to.have.property('phone', phone);
          expect(res.body).to.have.property('expiredAt');

          return models.User.findOne({phone: phone});
        })
        .then(function(createdUser) {
          user = createdUser;
          // check if the token is empty
          expect(createdUser).to.have.property('phone', phone);
          done();
        });
    });

    it('Send another sms code if user is finded in database', function(done) {
      request
        .post('/api/initialize')
        .send({ phone: phone })
        .expect(200)
        .then(function(res) {
          expect(res.body.code.toString()).to.have.length(4);
          // check that is a date
          expect(res.body).to.have.property('phone', phone);
          expect(res.body).to.have.property('expiredAt');

          return models.User.findOne({phone: phone});
        })
        .then(function(findedUser) {
          expect(findedUser.id).to.equal(user.id);
          done();
        });
    });

    it('Error if there is no code in request', function(done) {
      request
        .put('/api/initialize')
        .expect(400)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          expect(res.body).to.have.property('error', 'There is no code');
          done();
        });
    });

    it('Error if code doesn\'t belong to phone', function(done) {
      request
        .put('/api/initialize')
        .send({ code: smsCode })
        .expect(400)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          expect(res.body).to.have.property('error', 'Incorrect phone for this code');
          done();
        });
    });

    it('Send token for user if code success', function(done) {
      request
        .put('/api/initialize')
        .send({
          code: smsCode,
          phone: user.phone
        })
        .expect(200)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          user = res.body;

          expect(user).to.have.property('_id', user._id);
          expect(user).to.have.property('active', true);
          expect(user).to.have.property('token');

          done();
        });
    });
  });

  describe('Profile and users', function() {
    before(function(done) {
      Promise.map(userFixtures[0].contacts, function(phone) {
        return request
          .post('/api/initialize')
          .send({ phone: phone })
          .expect(200);
      })
      .then(function(responses) {
        return Promise.map(responses, function(res) {
          let code = res.body.code;

          return request
            .put('/api/initialize')
            .send({
              code: res.body.code,
              phone: res.body.phone
            })
            .expect(200);
        })
      })
      .then(function(responses) {
        users = responses.map(function(res) {
          return res.body;
        });

        return request
          .post('/api/initialize')
          .send({ phone: userFixtures[1].phone })
          .expect(200)
          .then(function (res) {
            return request
              .put('/api/initialize')
              .send({
                code: res.body.code,
                phone: res.body.phone
              })
              .expect(200);
          })
      })
      .then(function(res) {
        requestedUser = res.body;
        done();
      })
      .catch(function(err) {
        done(err);
      });
    });

    it('Update profile', function(done) {
      request
        .put('/api/profile')
        .set('Authorization', 'Bearer ' + user.token)
        .send({ username: userFixture.username })
        .expect(200)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          user = res.body;

          expect(user).to.have.property('username', userFixture.username);

          done();
        });
    });

    it('Update user avatar', function(done) {
      request
        .put('/api/profile/avatar')
        .set('Authorization', 'Bearer ' + user.token)
        .attach('avatar', path.join(__dirname, 'fixtures', 'paris.jpg'))
        .expect(200)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          expect(res.body).to.have.property('avatar').to.not.equal(user.avatar);

          user = res.body;

          done();
        });
    });

    it('Second update user avatar', function(done) {
      request
        .put('/api/profile/avatar')
        .set('Authorization', 'Bearer ' + user.token)
        .attach('avatar', path.join(__dirname, 'fixtures', 'paris.jpg'))
        .expect(200)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          expect(res.body).to.have.property('avatar').to.not.equal(user.avatar);

          user = res.body;

          done();
        });
    });

    it('Save user contacts', function(done) {
      const phones = userFixture.contacts.slice(0, -1);

      request
        .post('/api/profile/contacts')
        .set('Authorization', 'Bearer ' + user.token)
        .send({ phones: phones })
        .expect(200, function(err, res) {
          if (err) {
            return done(err);
          }

          expect(res.body).to.have.length(userFixture.contacts.length - 1);

          res.body.forEach(function(contact) {
            expect(contact).to.have.property('user', user._id);
            expect(contact).to.have.property('phone');
          });

          done();
        });
    });

    it('Save user contacts for the second time', function(done) {
      const phones = userFixture.contacts.slice(1);

      request
        .post('/api/profile/contacts')
        .set('Authorization', 'Bearer ' + user.token)
        .send({ phones: phones })
        .expect(200, function(err, res) {
          if (err) {
            return done(err);
          }

          expect(res.body).to.have.length(userFixture.contacts.length - 1);

          res.body.forEach(function(contact) {
            expect(contact).to.have.property('user', user._id);
            expect(contact).to.have.property('phone');
          });

          done();
        });
    });

    it('Update favorite', function(done) {
      request
        .put('/api/profile/favorite')
        .set('Authorization', 'Bearer ' + user.token)
        .send({ categories: categories.slice(3, 5) })
        .expect(200)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          expect(res.body).to.have.property('favorite').to.have.length(2);

          done();
        });
    });

    it('Get user', function(done) {
      request
        .get('/api/users/' + requestedUser._id)
        .expect(200)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          expect(res.body).to.have.property('username');
          expect(res.body).to.have.property('phone', userFixtures[1].phone);

          done();
        });
    });

    it('Get common contacts of two users', function(done) {
      request
        .post('/api/profile/contacts')
        .set('Authorization', 'Bearer ' + requestedUser.token)
        .send({ phones: userFixtures[1].contacts })
        .expect(200)
      .then(function() {
        request
          .get('/api/profile/contacts/common/' + requestedUser.phone)
          .set('Authorization', 'Bearer ' + user.token)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }

            const count = _.intersection(userFixture.contacts, userFixtures[1].contacts).length;
            expect(res.body).to.have.property('count', count);

            done();
          })
      });
    });

    it('Get common contacts with each user contact', function(done) {
      request
        .get('/api/profile/contacts/common')
        .set('Authorization', 'Bearer ' + user.token)
        .expect(200)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          done();
        });
    });
  });

  describe('Actions with groups', function() {
    it('Unable to create group without contacts', function(done) {
      request
        .post('/api/groups')
        .set('Authorization', 'Bearer ' + user.token)
        .expect(400)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          expect(res.body).to.have.property('error', 'There is no contact to create group');

          done();
        });
    });

    it('Unable to create group with one contact', function(done) {
      request
        .post('/api/groups')
        .set('Authorization', 'Bearer ' + user.token)
        .send({ phones: userFixture.contacts.slice(0, 1) })
        .expect(400)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          expect(res.body).to.have.property('error', 'There are not enough contacts to create group');

          done();
        });
    });

    it('Add user group of contacts', function(done) {
      request
        .post('/api/groups')
        .set('Authorization', 'Bearer ' + user.token)
        .send({ phones: userFixture.contacts.slice(0, 2) })
        .expect(200)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          group = res.body;

          expect(group).to.have.property('user', user._id);
          expect(group).to.have.property('title', 'Unknown');
          expect(group.phones).to.have.length(2);

          done();
        });
    });

    it('Find groups of user', function(done) {
      request
        .get('/api/groups')
        .set('Authorization', 'Bearer ' + user.token)
        .expect(200)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          expect(res.body).to.be.an('array');
          expect(res.body[0]).to.have.property('user', user._id);
          expect(res.body[0]).to.have.property('title');

          done();
        });
    });

    it('Find group', function(done) {
      request
        .get('/api/groups/' + group._id)
        .set('Authorization', 'Bearer ' + user.token)
        .expect(200)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          expect(res.body).to.have.property('user', group.user);
          expect(res.body).to.have.property('title', group.title);

          done();
        });
    });

    it('Unable to update group contacts without contacts', function(done) {
      request
        .put('/api/groups/' + group._id)
        .set('Authorization', 'Bearer ' + user.token)
        .expect(400)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          expect(res.body).to.have.property('error', 'There is no contact to update the group');

          done();
        });
    });

    it('Update group - replace contacts', function(done) {
      request
        .put('/api/groups/' + group._id)
        .set('Authorization', 'Bearer ' + user.token)
        .send({ phones: userFixture.contacts.slice(2, 4) })
        .expect(200)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          expect(res.body).to.have.property('user', group.user);
          expect(res.body).to.have.property('title', group.title);
          expect(group.phones).to.have.length(2);

          done();
        });
    });

    it('Delete group', function(done) {
      request
        .delete('/api/groups/' + group._id)
        .set('Authorization', 'Bearer ' + user.token)
        .expect(200, done);
    });
  });

  describe('Event workflow', function() {
    it('Create event and invites for event', function(done) {
      const eventData = {
        title: 'New event',
        category: categories[4]._id,
        meetingAt: 'tommorow noon'
      };
      const phonesToInvite = userFixture.contacts.slice(0, 2);

      request
        .post('/api/events')
        .set('Authorization', 'Bearer ' + user.token)
        .send({
          event: eventData,
          phones: phonesToInvite
        })
        .expect(200)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          event = res.body;

          expect(event).to.have.property('title', eventData.title);
          expect(event).to.have.property('category', eventData.category);
          expect(event).to.have.property('startTime');
          expect(event).to.have.property('endTime');

          done();
        });
    });

    // @TODO
    // Error creating event with incorrect fields

    it('Update event', function(done) {
      request
        .put('/api/events/' + event._id)
        .set('Authorization', 'Bearer ' + user.token)
        .send({
          description: 'Some description for our event',
          meetingAt: 'after noon'
        })
        .expect(200)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          expect(res.body).to.have.property('startTime');
          expect(res.body).to.have.property('endTime', event.startTime);

          event = res.body;

          done();
        });
    });

    // @TODO
    // Add contacts to event while update or prevent it

    it('Add contacts to event', function(done) {
      request
        .put('/api/events/' + event._id + '/invites')
        .set('Authorization', 'Bearer ' + user.token)
        .send({
          phones: [
            userFixture.contacts[2]
          ]
        })
        .expect(200)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          expect(res.body.event).to.have.property('_id', event._id);
          expect(res.body).to.have.property('invitesCount', 1);

          done();
        });
    });

    it('Add contacts to event with groups', function(done) {
      request
        .post('/api/groups')
        .set('Authorization', 'Bearer ' + user.token)
        .send({ phones: userFixture.contacts.slice(3) })
        .expect(200)
        .then(function(res) {
          group = res.body;

          request
            .put('/api/events/' + event._id + '/invites')
            .set('Authorization', 'Bearer ' + user.token)
            .send({
              groups: [
                group._id
              ]
            })
            .expect(200)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              expect(res.body.event).to.have.property('_id', event._id);
              expect(res.body).to.have.property('invitesCount').above(0);

              done();
            });
        });
    });
  });

  describe('Invites', function() {
    it('Get invites of user', function(done) {
      request
        .get('/api/invites')
        .set('Authorization', 'Bearer ' + users[0].token)
        .expect(200)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          invites = res.body;

          invites.forEach(function(invite) {
            expect(invite).to.have.property('phone', users[0].phone);
            expect(invite).to.have.property('status', 0);
          });

          done();
        });
    });

    it('Accept invite by user', function(done) {
      const usr = users[0];

      request
        .get('/api/invites')
        .set('Authorization', 'Bearer ' + usr.token)
        .expect(200)
        .then(function(res) {
          request
            .put('/api/invites/' + res.body[0]._id)
            .set('Authorization', 'Bearer ' + usr.token)
            .send({ status: 1 })
            .expect(200)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              expect(res.body).to.have.property('status', 1);
              expect(res.body).to.have.property('phone', usr.phone);
              expect(res.body).to.have.property('event').to.have.property('chatIsActive', true);

              done();
            });
        });
    });

    it('Reject invite by user', function(done) {
      const usr = users[1];

      request
        .get('/api/invites')
        .set('Authorization', 'Bearer ' + usr.token)
        .expect(200)
        .then(function(res) {
          request
            .put('/api/invites/' + res.body[0]._id)
            .set('Authorization', 'Bearer ' + usr.token)
            .send({ status: 2 })
            .expect(200)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              expect(res.body).to.have.property('status', 2);
              expect(res.body).to.have.property('phone', usr.phone);

              done();
            });
        });
    });

    it('Get members of the event', function(done) {
      const usr = users[2];

      request
        .get('/api/invites')
        .set('Authorization', 'Bearer ' + usr.token)
        .expect(200)
        .then(function(res) {
          return request
            .put('/api/invites/' + res.body[0]._id)
            .set('Authorization', 'Bearer ' + usr.token)
            .send({ status: 1 })
            .expect(200);
        })
        .then(function(res) {
          request
            .get('/api/events/' + event._id + '/members')
            .set('Authorization', 'Bearer ' + usr.token)
            .expect(200)
            .end(function(err, res) {
              if (err) {
                return done(err);
              }

              expect(res.body).to.have.length(1);

              done();
            })
        });
    });
  });

  describe('Chat rooms', function() {
    it('Get rooms/events for creator', function(done) {
      request
        .get('/api/events/rooms')
        .set('Authorization', 'Bearer ' + user.token)
        .expect(200)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          expect(res.body).to.have.length(3);
          expect(res.body[0]).to.have.property('title', 'future');
          expect(res.body[1]).to.have.property('title', 'current');
          expect(res.body[2]).to.have.property('title', 'past');
          expect(res.body[1].events[0]).to.have.property('_id', event._id);
          expect(res.body[1].events[0]).to.have.property('chatIsActive').to.be.true;

          done();
        });
    });

    it('Get rooms/events for invited member', function(done) {
      const usr = users[0];

      request
        .get('/api/events/rooms')
        .set('Authorization', 'Bearer ' + usr.token)
        .expect(200)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          expect(res.body).to.have.length(3);
          expect(res.body[0]).to.have.property('title', 'future');
          expect(res.body[1]).to.have.property('title', 'current');
          expect(res.body[2]).to.have.property('title', 'past');
          expect(res.body[1].events[0]).to.have.property('_id', event._id);
          expect(res.body[1].events[0]).to.have.property('chatIsActive').to.be.true;

          done();
        });
    });
  });

  describe.skip('Delete event', function() {
    before(function(done) {
      request
        .get('/api/invites')
        .set('Authorization', 'Bearer ' + users[3].token)
        .expect(200)
        .then(function(res) {
          request
            .put('/api/invites/' + res.body[0]._id)
            .set('Authorization', 'Bearer ' + users[3].token)
            .send({ status: 1 })
            .expect(200, done);
        });
    });

    it('Leave event by its creator', function(done) {
      request
        .put('/api/events/' + event._id + '/leave')
        .set('Authorization', 'Bearer ' + user.token)
        .expect(200)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          expect(res.body).to.have.property('leaved').to.be.true;
          expect(res.body).to.have.property('newAdmin')
            .to.have.property('_id', users[0]._id);

          done();
        });
    });

    it('Leave event by its member - not admin', function(done) {
      request
        .put('/api/events/' + event._id + '/leave')
        .set('Authorization', 'Bearer ' + users[3].token)
        .expect(200)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          expect(res.body).to.have.property('leaved').to.be.true;
          expect(res.body).to.have.property('newAdmin').to.be.null;

          done();
        });
    });

    it('Drop contact from the event', function(done) {
      request
        .put('/api/events/' + event._id + '/drop')
        .set('Authorization', 'Bearer ' + users[0].token)
        .send({ phone: users[2].phone })
        .expect(200)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          expect(res.body).to.have.property('status', 3);
          expect(res.body).to.have.property('phone', users[2].phone);

          done();
        });
    });

    it('Delete event when the last member leave it', function(done) {
      request
        .put('/api/events/' + event._id + '/leave')
        .set('Authorization', 'Bearer ' + users[0].token)
        .expect(200)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          expect(res.body).to.have.property('leaved').to.be.true;
          expect(res.body).to.have.property('newAdmin').to.be.null;

          done();
        });
    });

    // Event delete in one case:
    // either the last member leave it or the direct deletion by admin
    // To switch this test - one more event should be created

    it.skip('Delete event and invites', function(done) {
      request
        .delete('/api/events/' + event._id)
        .set('Authorization', 'Bearer ' + users[0].token)
        .expect(200)
        .end(function(err, res) {
          if (err) {
            return done(err);
          }

          expect(res.body).to.have.property('_id', event._id);

          done();
        });
    });
  });
});
