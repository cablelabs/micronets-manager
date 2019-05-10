const assert = require('assert');
const app = require('../../api/app');

describe('\'dpp\' service', () => {
  it('registered the service', () => {
    const service = app.service('mm/v1/dpp');

    assert.ok(service, 'Registered the service');
  });
});
