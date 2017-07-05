'use strict';

const config = require('nconf');
const path = require('path');

config
  .argv()
  .defaults({
    env: 'test',
    app: require('../config/application.json'),
    homeDir: path.join(__dirname, '../')
  });

config.add('literal', {
  store: {
    'database': require('../config/database.json')[config.get('env')]
  }
});

module.exports = config;
