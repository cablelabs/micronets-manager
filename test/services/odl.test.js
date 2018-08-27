const assert = require('assert');
const app = require('../../api/app');

describe('\'odl\' service', () => {
  it('registered the service', () => {
    const service = app.service('old/v1/micronets/config');

    assert.ok(service, 'Registered the service');
  });
});
