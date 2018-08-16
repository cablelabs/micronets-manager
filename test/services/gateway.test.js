const assert = require('assert');
const app = require('../../api/app');

describe('\'gateway\' service', () => {
  it('registered the service', () => {
    const service = app.service('mm/v1/micronets/gateway/status');

    assert.ok(service, 'Registered the service');
  });
});
