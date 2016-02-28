'use strict';

const Q = require('q');
const tag = 'MOCK-SALT-HASH-';

module.exports = {
  saltHash,
  verifyHash
};

/**
 * @param {string} input
 * @returns {Promise<string>}
 */
function saltHash(input) {
  return Q.resolve(tag + input + tag);
}

function verifyHash(storage, input) {
  const converted = storage.slice(tag.length, storage.length - tag.length);
  if (converted === input) {
    return Q.resolve(true);
  }
  return Q.reject(new Error('mock verification fail'));
}