const subnetAllocation = require('./hooks/subnetAllocation')

module.exports = function () {
  const app = this;
  const config = app.get('subnets');
  const promise = subnetAllocation.setup(app, config)
  app.set('subnet', promise);
};
