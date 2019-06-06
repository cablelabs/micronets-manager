const assert = require('assert');
const app = require('../../api/app');

describe('\'subnetAllocator\' service', () => {
  it('registered the service', () => {
    const service = app.service('mm/v1/allocator');

    assert.ok(service, 'Registered the service');
  });
});
