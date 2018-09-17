const WebSocket = require('websocket').w3cwebsocket
const fs = require('fs')
const WebSocketAsPromised = require('websocket-as-promised');


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
}

module.exports.connect = (address) => {
  return new Promise(async function (resolve, reject) {
    if (wsp && wsp.isOpened) {
      resolve()
    }
    else {
      wsp = new WebSocketAsPromised(address, {
        createWebSocket: url => new WebSocket(url, null, null, null, null, {tlsOptions: wsOptions}),
        packMessage: data => JSON.stringify(data),
        unpackMessage: message => {
          let temp = JSON.parse(message);
          if (temp && temp.message && temp.message.inResponseTo) temp.id = temp.message.inResponseTo;
          return temp
        },
        attachRequestId: (data, requestId) => Object.assign({id: requestId}, data), // attach requestId to message as `id` field
        extractRequestId: data => data && data.id,                                  // read requestId from message `id` field
      });
      wsp.open()
        .then(() => wsp.sendPacked(hello));
      wsp.onSend.addListener(data => console.log(data));
      // wsp.onMessage.addListener(message => console.log(message));

      wsp.onUnpackedMessage.addListener(message => {
        if (message.message.messageType === 'CONN:HELLO') {
          console.log('connected to ' + address)
          resolve()
        }
      })
    }
  })
};


module.exports.send = function (json, method, id) {
  return new Promise(async function (resolve, reject) {
    if (wsp.isOpened) {
      let webSocketFormat = convertTo(json, method, id)
      wsp.sendRequest(webSocketFormat, {requestId: webSocketFormat.message.messageId})
        .then(response => {
          console.log('Received Response')
          console.log(response)
          resolve(convertFrom(response))
        })
    }
    else {
      console.log('Websocket is not opened')
      reject(new Error('Websocket is not opened'))
    }
  })
};




module.exports.close = function() {
  wsp.close()
    .then(event => {
      console.log(event.reason)
      return;
    })
}


const convertTo = function (json, method, id) {
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
  let path = '/micronets/v1/dhcp/subnets';
  if (id) {
    path = path + '/' + id;
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
