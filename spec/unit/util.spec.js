'use strict';

var util = require('../../src/util');
require('./chai');



/*global describe, it, expect */
/*eslint no-unused-expressions:0*/
describe('utility functions', function () {
  it('should have a function that quotes a supplied argument', function () {
    expect(util.quote('booya')).equal('"booya"');
  });
});
