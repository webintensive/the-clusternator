'use strict';

/*global describe, it, expect, beforeEach */
/*eslint no-unused-expressions:0*/
describe('Users interface', function() {
  /** Make sure `this` is in traditional function, _not_ an arrow */
  this.timeout(10000);

  var C = require('../../chai'),
    users = require('../../../../src/server/auth/users'),
    testUser1, testUser2, testUser3, testUser4;

  beforeEach(() => {
    testUser1 = {id: 'test', password: '123'};
    testUser2 = {id: 'test2', password: '1234'};
    testUser3 = {id: 'test3', password: '12345'};
    testUser4 = {id: 'test4', password: '123456'};
  });

  it('createUser should resolve a new user object *without* a password field',
    (done) => {
      users.create(testUser1).then((newU) => {
        C.check(done, () => {
          expect(testUser1.password).to.not.be.ok;
        });
      }, C.getFail(done));
    });

  it('createUser should resolve a new user object *with* an authority field',
    (done) => {
      users.create(testUser4).then((newU) => {
        C.check(done, () => {
          expect(newU.authority).to.equal(2);
        });
      }, C.getFail(done));
    });

  it('createUser should remove password field from original object',
    (done) => {
      users.create(testUser2).then(() => {
        C.check(done, () => {
          expect(testUser2.password).to.not.be.ok;
        });
      }, C.getFail(done));
    });

  it('createUser should reject with no password', (done) => {
    users.create({id: 'stuff'}).then(C.getFail(done), (err) => {
      C.check(done, () => {
        expect(err instanceof Error).to.be.ok;
      });
    });
  });

  it('createUser should reject with no id', (done) => {
    users.create({password: 'stuff'}).then(C.getFail(done), (err) => {
      C.check(done, () => {
        expect(err instanceof Error).to.be.ok;
      });
    });
  });

  it('createUser should reject with no input', (done) => {
    users.create().then(C.getFail(done), (err) => {
      C.check(done, () => {
        expect(err instanceof Error).to.be.ok;
      });
    });
  });

  it('createUser should reject if it has the entry', (done) => {
    users.create(testUser1).then(C.getFail(done), (err) => {
      C.check(done, () => {
        expect(err instanceof Error).to.be.ok;
      });
    });
  });

  it('find should resolve with a found user', (done) => {
    users.find(testUser1.id).then((found) => {
      C.check(done, () => {
        expect(found.id).to.equal(testUser1.id);
      });
    },C.getFail(done));
  });
});