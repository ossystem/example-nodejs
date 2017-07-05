'use strict'

function normalizeDate(now) {
  if (typeof now === 'number') {
    now = new Date(now);
  } else if (!(now instanceof Date)) {
    now = new Date;
  }

  return {
    y: now.getFullYear(),
    m: now.getMonth(),
    d: now.getDate()
  };
}

module.exports = {
  today0_00: function(now) {
    now = normalizeDate(now);

    return new Date(now.y, now.m, now.d, 0, 0, 0, 0);
  },
  tommorow0_00: function(now) {
    now = normalizeDate(now);

    return new Date(now.y, now.m, now.d + 1, 0, 0, 0, 0);
  },
  afterTommorow0_00: function(now) {
    now = normalizeDate(now);

    return new Date(now.y, now.m, now.d + 2, 0, 0, 0, 0);
  }
};
