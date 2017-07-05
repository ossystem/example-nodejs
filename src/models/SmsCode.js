'use strict';

const mongoose = require('mongoose');
const randomstring = require('randomstring');
const config = require('../../../Shoki/config');
const codeExpiredTime = config.codeExpiredTime * 60 * 1000; // milisecs

const SmsCodeSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    default: function() {
      return randomstring.generate({
        length: 4,
        charset: 'numeric'
      });
    }
  },
  phone: {
    type: String,
    required: true
  },
  expiredAt: {
    type: Date,
    required: true,
    default: function() {
      return new Date((new Date()).getTime() + codeExpiredTime);
    }
  }
});

SmsCodeSchema.methods.checkPhone = function(phone) {
  return this.phone === phone;
};
SmsCodeSchema.methods.isExpired = function() {
  return (this.expiredAt - new Date() <= 0);
};

module.exports = mongoose.model('SmsCode', SmsCodeSchema);
