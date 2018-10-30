const WebSocket = require('websocket').w3cwebsocket;
const fs = require('fs')
const WebSocketAsPromised = require('websocket-as-promised');
const EventEmitter = require('events');
class MyEmitter extends EventEmitter {}


const wsOptions = {
  // Chain of certificate autorities
  // Client and server have these to authenticate keys
  ca: [

    // Use these for localhost server
    fs.readFileSync('certs/micronets-ws-root.cert.pem'),
    fs.readFileSync('certs/micronets-ws-proxy.pkeycert.pem'),

    // fs.readFileSync('ssl/ca1-cert.pem')

  ],

  // ### Use this to test aginst localhost server #######
  // // Private key of the client
  key: fs.readFileSync('certs/micronets-manager.key.pem'),
  // key: fs.readFileSync('ssl/ca1-key.pem'),

  // // Public key of the client (certificate key)
  cert: fs.readFileSync('certs/micronets-manager.cert.pem'),
  // cert: fs.readFileSync('ssl/ca1-cert.pem'),

  // ####################################################

  // Automatically reject clients with invalid certificates.
  rejectUnauthorized: false, // Set false to see what happens.
  cipherSuites: [
    'TLS_RSA_WITH_AES_128_CBC_SHA',
    'TLS_ECDHE_ECDSA_WITH_AES_128_CBC_SHA',
    'TLS_RSA_WITH_AES_256_CBC_SHA'
  ]
}

module.exports = {
  state: 'DISCONNECTED',
  requests: [],
  eventEmitter: new MyEmitter(),
  address: ''
};

var messageId = 0;
var wsp;

const hello = {
  message: {
    messageId: 0,
    'messageType': 'CONN:HELLO',
    'requiresResponse': false,
    'peerClass': 'micronets-ws-test-client',
    'peerId': '12345678'
  }
};

module.exports.isOpen = function() {
  if (wsp && wsp.isOpened) {
    return true
  }
  else {
    return false
  }
};

module.exports.event = function() {
  this.eventEmitter.emit('Test', {test: '123'})
}

module.exports.setAddress = function(address) {
  this.address = address
}

module.exports.connect = function() {
  let me = this
  return new Promise(async function (resolve, reject) {
    if (!me.address) {
      reject(new Error('No WSS Address provided'))
    }
    else if (wsp && wsp.isOpened) {
      resolve()
    }
    else {
      wsp = new WebSocketAsPromised(me.address, {
        createWebSocket: url => new WebSocket(url, null, null, null, null, {tlsOptions: wsOptions}),
        packMessage: data => JSON.stringify(data),
        unpackMessage: message => {
          let temp = JSON.parse(message);
          if (temp && temp.message && temp.message.inResponseTo) temp.id = temp.message.inResponseTo;
          return temp
        },
        attachRequestId: (data, requestId) => Object.assign({id: requestId}, data), // attach requestId to message as 'id' field
        extractRequestId: data => data && data.id,                                  // read requestId from message 'id' field
      });
      wsp.open()
        .then(() => wsp.sendPacked(hello));

      wsp.onUnpackedMessage.addListener(message => {
        if (message.message.messageType === 'CONN:HELLO') {
          console.log('connected to ' + me.address)
          resolve()
        }
        else if(message.message.messageType === 'EVENT:DHCP:leaseAcquired')
        {
          let leaseAcquired = convertFrom(message)
          me.eventEmitter.emit('LeaseAcquired', leaseAcquired)
        }
        else if(message.message.messageType === 'EVENT:DHCP:leaseExpired')
        {
          let leaseExpired = convertFrom(message)
          me.eventEmitter.emit('LeaseExpired', leaseExpired)
        }
        else {
          console.log('Received Message')
          console.log(message)
        }
      })

      wsp.onClose.addListener(event => {
        console.log('Connections closed: ' + event.reason)
        setTimeout(()=> {
          me.connect()
            .then(() => { console.log('Reconnected') })
            .catch((error => {
              console.err("ERROR: Could not reconnect")
              throw new Error('Could not reconnect to the Web Socket at ' + me.address)
            }))
        }, 20000) // Try every 20 secs
      });

      // wsp.onError.addListener(event => {
      //   console.error('Connection Error: ' + event)
      //   setTimeout(()=> {
      //   me.connect()
      //     .then(() => {
      //       console.log('Reconnected')
      //     })
      //     .catch((error => {
      //       console.err("ERROR: Could not reconnect")
      //       console.err(error)
      //       throw new Error('Could not reconnect to the Web Socket at ' + me.address)
      //     }))
      //   }, 2000)
      // });
    }
  })
};


module.exports.send = function (json, method, type, subnetId, deviceId) {
  let me = this
  return new Promise(async function (resolve, reject) {
      if (!wsp.isOpened) {
        console.log('Web Socket is not opened')
        me.connect(() => {
          let webSocketFormat = convertTo(json, method, type, subnetId, deviceId)
          wsp.sendRequest(webSocketFormat, {requestId: webSocketFormat.message.messageId})
            .then(response => {
              console.log('Received Response')
              console.log(response)
              resolve(convertFrom(response))
            })
        })
          .catch((err) => {
            console.err(err)
            throw new Error('Could not send request, Address is not set')
          })
      }
      else {
        let webSocketFormat = convertTo(json, method, type, subnetId, deviceId)
        wsp.sendRequest(webSocketFormat, {requestId: webSocketFormat.message.messageId})
          .then(response => {
            console.log('Received Response')
            console.log(response)
            resolve(convertFrom(response))
          })
      }
  });
};




module.exports.close = function() {
  wsp.close()
    .then(event => {
      console.log(event.reason)
    })
  return
}


const convertTo = function (json, method, type, subnetId, deviceId) {
  /*
  “messageType”: “REST:REQUEST”,
   “requiresResponse”: true,
   “method”: <HEAD|GET|POST|PUT|DELETE|…>,
   “path”: <URI path>,
   “queryStrings”: [{“name”: <name string>, “value”: <val string>}, …],
   “headers”: [{“name”: <name string>, “value”: <val string>}, …],
   “dataFormat”: <mime data format for the messageBody>
   “messageBody”: <either a string encoded according to the mime type, base64 string if dataFormat is “application/octet-stream”, or JSON object if dataFormat is “application/json”>
   */
  let path = '';
  if (type && type === 'device') {
    path = '/micronets/v1/dhcp/subnets/' + subnetId + '/devices';
    if (deviceId) {
      path = path + '/' + deviceId;
    }
  }
  else { //Assume subnets
    path = '/micronets/v1/dhcp/subnets';
    if (subnetId) {
      path = path + '/' + subnetId;
    }
  }

  let body = json;
  if (Array.isArray(json)) {
    body = {subnets: json}
  }
  messageId++;
  let webSocketFormat = {
    message: {
      messageId: messageId,
      messageType: 'REST:REQUEST',
      requiresResponse: true,
      method: method,
      path: path,
      headers: [
        {
          name: "Host",
          value: "localhost:5001"
        },
        {
          name: "User-Agent",
          value: "curl/7.54.0"
        },
        {
          name: "Accept",
          value: "*/*"
        }
      ],
      dataFormat: 'application/json',
      messageBody: body
    }
  };
  console.log(JSON.stringify(webSocketFormat))
  return (webSocketFormat)
};


const convertFrom = function (webSocketFormat) {
  let result = {
    body: webSocketFormat.message.messageBody,
    status: webSocketFormat.message.statusCode
  };
  return result;
}

// let newJson = transform_json_to_craig_json(json)
// send(newJson)
// wait on response().
// then(reposne => {
//   resolve(response)
// })
//   .catch((err) => {
//     if (err === disconnect) {
//       connect()
//       resend(newJson)
//     }
//     else {
//       reject(err)
//     }
//   })
