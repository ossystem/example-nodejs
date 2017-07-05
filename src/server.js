'use strict';

const config = require('nconf');
const path = require('path');
const mongoose = require('mongoose');

const app = require('./app');

config
  .argv()
  .defaults({
    env: process.env.NODE_ENV || 'development',
    app: require('../config/application.json'),
    homeDir: path.join(__dirname, '../')
  });

config.add('literal', {
  store: {
    'database': require('../config/database.json')[config.get('env')]
  }
});

const PORT = config.get('app:port');

mongoose.Promise = global.Promise;
mongoose.connect(config.get('database:connection'));

app.listen(PORT, function () {
  console.log('Shoki api server listening on port: ' + PORT);
});
