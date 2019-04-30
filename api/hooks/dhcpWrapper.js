const WebSocket = require('ws');
const fs = require('fs')
const WebSocketAsPromised = require('websocket-as-promised');

const wsp = new WebSocketAsPromised('ws://example.com', {
  createWebSocket: url => new WebSocket(url)
});


options = {
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
  ws: null,
  state: 'DISCONNECTED',
  requests: [],
  messageId: 1,
  helloCB: null
};

var hello = {
    'message': {
      'messageId': 1,
        'messageType': 'CONN:HELLO',
        'requiresResponse': false,
        'peerClass': 'micronets-ws-test-client',
        'peerId': '12345678'
    }
}


const response = () => {
  return new Promise(async function (resolve, reject) {

  })
}

module.exports.connect = (address, cb) => {
  this.ws = new WebSocket(address, null, options);
  this.helloCB = cb;
  this.ws.on('error', (error) => {
    console.log('Error:' + JSON.stringify(error))
    this.state = 'ERROR'
  });

  this.ws.on('open', () => {
    this.ws.send(JSON.stringify(hello), function (err) {
      if (err) console.log('Send:' + err)
    });
    this.state = 'OPEN'
  })

  this.ws.on('message', (data) => {
    data = JSON.parse(data)
    console.log('Received Message')
    if (data.message.messageType === 'CONN:HELLO') {
      console.log(data)
      this.state = 'CONNECTED'
      this.helloCB(null, true)
    }
    else if (data.message.messageType === 'REST:RESPONSE') {
      let cb = null;
      for (let requestId in this.requests) {
        if (data.message.inResponseTo === this.requests[requestId].id) {
          console.log('Found Promise for ' + data.message.inResponseTo )
          cb = this.requests[requestId].cb;
        }
      }
      if (cb) cb(null, data)
    }
  })
};



module.exports.convertTo = function(json, method) {
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
  this.messageId++;
  let webSocketFormat = {
    message: {
      messageId: this.messageId,
      messageType: 'REST:REQUEST',
      requiresResponse: true,
      method: method,
      path: "/micronets/v1/gateway/micronets",
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
      messageBody: json
    }
  }
  return (webSocketFormat)
}


module.exports.request = function (json, cb) {
    if (this.state === 'CONNECTED') {
      let webSocketFormat = this.convertTo(json, 'GET')
      console.log(webSocketFormat)

      this.ws.send(JSON.stringify(webSocketFormat))
      if (!this.requests || this.requests.length === 0) {
        this.requests = []
      }
      this.requests.push({id: webSocketFormat.message.messageId, cb: cb})
    }
    else {
      console.log(this.state)
    }
};

module.exports.write = function (json, cb) {
  if (this.state === 'CONNECTED') {
    let webSocketFormat = this.convertTo(json, 'POST')
    console.log(webSocketFormat)
    this.ws.send(JSON.stringify(webSocketFormat))
    if (!this.requests || this.requests.length === 0) {
      this.requests = []
    }
    this.requests.push({id: webSocketFormat.message.messageId, cb: cb})
  }
};


module.exports.convertFrom = function (webSocketFormat) {
  
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
