const subnetAllocation = require('./hooks/subnetAllocaiton')

module.exports = function () {
  const app = this;
  const config = app.get('subnets');
  const promise = subnetAllocation.setup(app, config)
  app.set('subnet', promise);
};
