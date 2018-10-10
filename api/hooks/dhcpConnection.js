// A hook that logs service method before, after and error
const dw = require('./dhcpWrapperPromise')
const webSocketUrl = 'wss://localhost:5050/micronets/v1/ws-proxy/micronets-gw-7B2A-BE88-08817Z'


module.exports = function ()  {
  return async(context) => {
    const dhcpAddress = await dw.setAddress(webSocketUrl)
    console.log('DHCP CONNECTION HOOK dhcpAddress : ' + JSON.stringify(dhcpAddress))
    const isDhcpConnect = await dw.connect().then(()=> {return true})
    console.log('\n DHCP CONNECTION HOOK isDhcpConnect : ' + JSON.stringify(isDhcpConnect))
    if (context.error) {
      logger.error(context.error.stack);
    }
  };
};
