var axios = require('axios');


const initializeRedisPubSub = ( subnets, hosts )  => {
  console.log('\n initializeRedisPubSub called')
  const initialize =
          axios({ method:'get', url:`http://127.0.0.1:18080/odl/mdl/test/publish/${subnets}/${hosts}`})
            .then(function(response) {
              console.log('\n Axios response data : ' + JSON.stringify(response.data))
              return response.data.statusCode == 1 ? true : false
            });
  console.log('\n initialize value : '  + JSON.stringify(initialize));
  return initialize;
}

const publishToMTC = ( subnets, hosts )  => {
  console.log('\n initializeRedisPubSub called')
  const initialize =
          axios({ method:'get', url:`http://127.0.0.1:18080/odl/mdl/test/publish/?${subnets}/${hosts}`})
            .then(function(response) {
              console.log('\n Axios response data : ' + JSON.stringify(response.data))
              return response.data.statusCode == 1 ? true : false
            });
  console.log('\n initialize value : '  + JSON.stringify(initialize));
  return initialize;
}

const subscribeToMTC = ( subnets, hosts )  => {
  console.log('\n initializeRedisPubSub called')
  const initialize =
          axios({ method:'get', url:`http://127.0.0.1:18080/odl/mdl/test/publish/?${subnets}/${hosts}`})
            .then(function(response) {
              console.log('\n Axios response data : ' + JSON.stringify(response.data))
              return response.data.statusCode == 1 ? true : false
            });
  console.log('\n initialize value : '  + JSON.stringify(initialize));
  return initialize;
}