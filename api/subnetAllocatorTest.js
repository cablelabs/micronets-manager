// var subnet
// var newSubnet = {}
const app = require('./app');
const logger = require('./logger');
const subnetAllocation = require ( './hooks/subnetAllocaiton' );

// Get random subnet
(module.exports.getRandomSubnet = async() => {
logger.debug('\n Testing the invocation of getRandomSubnet')
  // app.get('subnet').then(async(subnetObj) => {
  //   subnet = subnetObj
  //   const randomSubnet = await subnet.getNewSubnet(0)
  //   logger.debug('\n Random subnet : ' + JSON.stringify(randomSubnet))
  // })


  const app = this;
  const config = app.get('subnets');
  const promise = subnetAllocation.setup(app, config)

  // const randomSubnet = await subnetAllocation.getNewSubnet(0)
  // logger.debug('\n Random subnet : ' + JSON.stringify(randomSubnet))
})()