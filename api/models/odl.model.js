// odl-model.js - A mongoose model
// 
// See http://mongoosejs.com/docs/models.html
// for more of what you can do here.
module.exports = function (app) {
  const mongooseClient = app.get('mongooseClient');
  const { Schema } = mongooseClient;

  const switchConfig = new Schema({
    portTrunk: { type: String, required: true },
    ovsHost: { type: String, required: true },
    subnet: { type: String, required: true },
    vLanId: { type: String, required: true },
    portWired: { type: String, required: false },
    portWireless:{ type: String, required: false },
    bridge: { type: String, required: true  },
    portBridge: { type:String, required: true  }
  });

  const odl = new Schema({
    switchConfig: { type: [switchConfig], required: true },
  }, {
    timestamps: true
  });
  return mongooseClient.model('odl', odl);
};

/* Sample data
{
   gatewayId: '123',
   hw_model_id: '123456-789',
   'ovs-version': '2.9.2',
   bridges: [
     {
       bridge: 'brmn001',
       ports: [
         { port: 1, interface: 'enp3s0',        hwtype: 'trunk', subnet: '10.36.32.0/24', ipv4: "10.36.32.55", hwaddr: '02:ad:de:ad:be:ef', vlanid: 0 },
         { port: 2, interface: 'enp4s0',        hwtype: 'wired', subnet: '192.168.250.0/24', vlanid: 0 },
         { port: 3, interface: 'enp5s0',        hwtype: 'wired', subnet: '192.168.251.0/24', vlanid: 0 },
         { port: 4, interface: 'veth00001.128', hwtype: 'wifi',  subnet: '192.168.252.0/24', vlanid: 128 },
         { port: 4, interface: 'veth00001.129', hwtype: 'wifi',  subnet: '192.168.253.0/24', vlanid: 129 },
         { port: 4, interface: 'veth00001.130', hwtype: 'wifi',  subnet: '192.168.254.0/24', vlanid: 130 },
         { port: 4, interface: 'veth00001.131', hwtype: 'wifi',  subnet: '192.168.255.0/24', vlanid: 131 }
       ]
     }
   ]
 }
*/

