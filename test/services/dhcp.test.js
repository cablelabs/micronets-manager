const assert = require('assert');
const app = require('../../api/app');

describe('\'dhcp\' service', () => {
  it('registered the service', () => {
    const service = app.service('mm/v1/micronets/dhcp');

    assert.ok(service, 'Registered the service');
  });
});
