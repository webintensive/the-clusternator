'use strict';

/*global require, module*/

var users = Object.create(null);
var passwords = require('./passwords');
var tokens = require('./tokens');
var authorities = require('./authorities');
var config = require('../../config')();
var Q = require('q');

module.exports = {
  find: find,
  create: createUser,
  endpoints: {
    update: updateUserEndpoint,
    create: createUserEndpoint,
    password: changePassword,
    get: getUser,
    getAll: getAllUsers,
    getTokens: getTokens,
    createToken: createToken
  }
};

init();

function init() {
  if (Object.keys(users).length === 0) {
    createUser({
      id: 'root',
      authority: 0,
      password: 'password'
    });
  }
}

/**
 * @param {{ id: string, password: string }} user
 * @returns {*}
 */
function validateCreateUser(user) {
  var d = Q.defer();
  if (!user || !user.id) {
    d.reject(new TypeError('createUser: Invalid User Id'));
    return d.promise;
  }
  if (!user.password) {
    d.reject(new TypeError('createUser: Invalid User Password'));
    return d.promise;
  }
  if (users[user.id]) {
    d.reject(new Error('createUser: User Exists'));
    return d.promise;
  }
  return null;
}

/**
 * @param {{ id: string, password: string, authority: number }} user
 * @returns {Q.Promise}
 */
function createUser(user) {
  var d = validateCreateUser(user);
  if (d) {
    // if validation returns a promise it's invalid
    return d;
  } else {
    d = Q.defer();
  }
  Q.all([
    passwords.create(user.id, user.password),
    authorities.create(user.id, user.authority)
  ]).then((results) => {
    // kill off the password attribute
    delete user.password;
    // create a _new_ user object
    users[user.id] = {
      id: user.id,
      authority: results[1].authority
    };
    d.resolve(users[user.id]);
  });
  return d.promise;
}

/**
 * @param {string} id
 * @returns {Q.Promise}
 */
function find(id) {
  var d = Q.defer();
  authorities.find(id).then((auth) => {
    if (users[id]) {
      users[id].authority = auth.authority;
      d.resolve(users[id]);
    } else {
      d.reject(new Error('findUser: user not found'));
    }
  }, d.reject);
  return d.promise;
}

function changePassword(req, res) {
  passwords.change(req.body.username,
    req.body.password, req.body.passwordNew).
  then(() => {
    if (req.get('ContentType') === 'application/json') {
      res.sendStatus(200);
    } else {
      res.redirect('/');
    }
  }, (err) => {
    if (req.get('ContentType') === 'application/json') {
      res.status(500).json({error: err.message});
    } else {
      res.render('passwd', { error: true });
    }
  });
}

function createUserEndpoint(req, res) {
  createUser({
    id: req.body.username,
    password: req.body.password
  }).then((user) => {
    res.json(user);
  }, (err) => {
    res.status(500).json({error: err.message});
  });
}

function updateUserEndpoint_(req, res) {
  var id = req.body.username,
    authority = req.body.authority;

  find(id).then((found) => {
    return authorities.change(id, authority).then(() => {
      res.sendStatus(200);
    });
  }, () => {
    var password = req.body.password;
    return createUser({
      id:id,
      password:password,
      authority:authority,
    }).then((user) => {
      res.json(user);
    });
  }).fail((err) => {
    res.status(500).json({ error: err.message });
  });
}

function updateUserEndpoint(req, res) {
  var id = req.body.username,
    authority = req.body.authority;

  // admins can edit anyone
  if (req.user.authority === 0) {
    updateUserEndpoint_(req, res);
    return;
  }
  // users can edit themselves
  if (req.user.id === id) {
    updateUserEndpoint_(req, res);
    return;
  }
  res.status(401).json({ error: 'not authorized' });
}

function getUser(req, res) {
  find(req.params.id).then((user) => {
    // admins can see admins
    if (req.user.authority === 0) {
      res.json(user);
      return;
    }
    if (req.user.id === req.body.id) {
      res.json(user);
      return;
    }
  });
}

function getAllUsers(req, res) {
  var result;
  if (req.user.authority === 0) {
    result = Object.keys(users).map((key) => {
      return users[key];
    });
  }
  if (req.user.authority === 1) {
    result = Object.keys(users).map((key) => {
      if (users[key].authority <= 1) {
        return users[key];
      }
      return null;
    }).filter((val) => {
      return val;
    });
  }
  if (req.user.authority === 2) {
    result = Object.keys(users).map((key) => {
      if (users[key].authority === 2) {
        return users[key];
      }
      return null;
    }).filter((val) => {
      return val;
    });
  }
  res.json(result);
}

function getTokens(req, res) {
  tokens.findById(req.user.id).then((tokens) => {
    var masked = tokens.map((t) => {
      return JSON.parse(t).hash.slice(0, 6) + 'XXXXXXXXXXXXXXXXXX';
    });
    res.render('tokens', { tokens: masked });
  }, (err) => {
    res.status(500).json({ error: err.message });
  });
}

function createToken(req, res) {
  tokens.create(req.user.id).then((token) => {
    res.render('create-token', { token: token });
  }, (err) => {
    res.status(500).json({ error: err });
  });
}