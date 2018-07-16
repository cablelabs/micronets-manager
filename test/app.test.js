'use strict';

const assert = require('assert');
const request = require('request');
const app = require('../src/app');

describe('Feathers application tests', function () {
  before(function (done) {
    this.server = app.listen(3030);
    this.server.once('listening', () => done());
  });

  after(function (done) {
    this.server.close(done);
  });

  it('starts and shows the index page', function (done) {
    request('http://localhost:3030', function (err, res, body) {
      assert.ok(body.indexOf('<html') !== -1);
      done(err);
    });
  });
});
