const assert = require('assert');
const app = require('../../api/app');

describe('\'mock-micronets\' service', () => {
  it('registered the service', () => {
    const service = app.service('mm/v1/mock/micronets');

    assert.ok(service, 'Registered the service');
  });
});
