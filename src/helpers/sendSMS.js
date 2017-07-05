'use strict';

const twilio = require('twilio');

// take out to config file

const config = {
  // twilio: {
  //   sender: '+33756796444',
  //   accountSid: 'ACff1886912c6f13b002b8e3e83438cc09',
  //   authToken: 'aa5ea3a0749c32898647b3ef22bed2b7'
  // }
  twilio: {
    sender: '+14807718436',
    accountSid: 'ACc18b433e6a3138efb94b147e8c0f459b',
    authToken: '7b3d8c1b98ce4870e59432ef85568420'
  }
  // reciever = '+380934496013'
  // reciever = '+380968942503'
};

module.exports = function(reciever, message) {
  const conf = config.twilio;
  const client = new twilio.RestClient(conf.accountSid, conf.authToken);

  return client.messages.create({
    to: reciever,
    from: conf.sender,
    body: message,
  })
  .then(function(response) {
    if (response.error_code !== null) {
      throw new Error(response.error_message);
    }

    return response.status;
  });
};
