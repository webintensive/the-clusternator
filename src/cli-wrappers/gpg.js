'use strict';
/**
 * This module provides promised based shortcuts to some `gpg` commands
 *
 * @module childProcess/gpg
 */

/* @todo make COMMAND configurable */
const COMMAND = 'gpg';
/* @todo _maybe_ make CRYPTO_ALGO configurable */
const CRYPTO_ALGO = 'AES256';
const FLAG_OUT = '--output';
const FLAG_QUIET = '--quiet';
const FLAG_ALGO = '--cipher-algo';
const FLAG_ARMOR = '--armor';
const FLAG_PASSPHRASE = '--passphrase';
const FLAG_SYMMETRIC = '--symmetric';
const FLAG_DECRYPT = '--decrypt';

const  crypto = require('crypto');
const b64 = require('base64url');
const Q = require('q');

let cproc = require('./child-process');

/**
  @param {string} passphrase - encryption passphrase
  @param {string} cleartext - data to encrypt
  @return {Q.Promise<string>} - promise for an encrypted string
*/
function encrypt(passphrase, cleartext) {

  if (passphrase.length < 30) {
    let d = Q.defer();
    d.reject(new Error(`GPG: Passphrases must be *at least* thirty (30)
    characters`));
    return d.promise;
  }

  return cproc.stdin(cleartext, COMMAND, [
    FLAG_ALGO, CRYPTO_ALGO, FLAG_ARMOR, FLAG_PASSPHRASE, passphrase,
    FLAG_SYMMETRIC
  ]);
}

/**
  @param {string} passphrase - passphrase to decrypt with
  @param {string} ciphertext - encrypted text
  @return {Q.Promise<string>} promise to return clear text string
*/
function decrypt(passphrase, ciphertext) {
  return cproc.stdin(ciphertext, COMMAND, [
    FLAG_QUIET, FLAG_PASSPHRASE, passphrase, FLAG_DECRYPT
  ]);
}

/**
  @param {string} passphrase - encryption passphrase
  @param {string} filePath - path to file
  @return {Q.Promise<string>} - promise for an encrypted string
*/
function encryptFile(passphrase, filePath) {

  if (passphrase.length < 30) {
    let d = Q.defer();
    d.reject(new Error(`GPG: Passphrases must be *at least* thirty (30)
    characters`));
    return d.promise;
  }

  return cproc.output(COMMAND, [
    FLAG_ALGO, CRYPTO_ALGO, FLAG_ARMOR, FLAG_PASSPHRASE, passphrase,
    FLAG_SYMMETRIC, filePath
  ]);
}

/**
  @param {string} passphrase - passphrase to decrypt with
  @param {string} cipherFilePath - path to encrypted file
  @parma {string} outputFilePath - path to output
  @return {Q.Promise<string>} promise to return clear text string
*/
function decryptFile(passphrase, cipherFilePath, outputFilePath) {
  return cproc.output(COMMAND, [
    FLAG_QUIET, FLAG_PASSPHRASE, passphrase, FLAG_OUT, outputFilePath,
    FLAG_DECRYPT, cipherFilePath
  ]);
}

/**
 * @returns {Q.Promise<string>}
 */
function generatePass() {
  const d = Q.defer();
  crypto.randomBytes(50, (err, buff) => {
    if (err) {
      d.reject(err);
      return;
    }
    d.resolve(b64(buff));
  });
  return d.promise;
}

module.exports = {
  encrypt,
  decrypt,
  encryptFile,
  decryptFile,
  generatePass
};
