const assert = require('assert');
const app = require('../../api/app');

describe('\'micronets\' service', () => {
  it('registered the service', () => {
    const service = app.service('mm/v1/micronets');

    assert.ok(service, 'Registered the service');
  });
});
