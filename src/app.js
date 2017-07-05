'use strict'

const express = require('express');
const expressWs = require('express-ws');
const bodyParser = require('body-parser');
const path = require('path');
const logger = require('morgan');
const passport = require('passport');
const cors = require('cors')

const bearer = require('./bearer');
const models = require('./models');
const middlewares = require('./middlewares');
const Errors = require('./errors');

const app = express();

module.exports = function(config) {
  expressWs(app);

  app.set('config', config);
  app.set('models', models);
  app.set('errors', Errors);

  if (config.get('env') === 'development') {
    app.use(logger(':method :url :response-time'));
  }

  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({extended: true}));
  app.use('/public', express.static(path.join(__dirname, 'public')));
  app.use('/upload', express.static(path.join(__dirname, '..','upload')));
  app.use(cors());

  passport.use(bearer(models.User));

  app.use('/api', require('./routes')(app));
  app.ws('/ws/:event/:token', require('./wsServer'));

  app.use(middlewares.notFound);
  app.use(middlewares.errorHandler);

  return app;
};
