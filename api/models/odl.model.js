// odl-model.js - A mongoose model
// 
// See http://mongoosejs.com/docs/models.html
// for more of what you can do here.
module.exports = function (app) {
  const mongooseClient = app.get('mongooseClient');
  const { Schema } = mongooseClient;

  const ports = new Schema({
    _id:false,
    port: { type: Number, required: true },
    interface: { type: String, required: true },
    hwtype: { type: String, required: true },
    subnet: { type: String, required: true },
    ipv4: { type: String, required: false },
    hwaddr:{ type: String, required: false },
    vlanid: { type: String, required: true  },
  });

  const odlConfig = new Schema({
    _id:false,
    portTrunk: { type: String, required: false },
    ovsHost: { type: String, required: true },
    ovsPort: { type: String, required: true },
    subnet: { type: String, required: true },
    vLanId: { type: String, required: true },
    portWired: { type: String, required: false },
    portWireless:{ type: String, required: false },
    bridge: { type: String, required: true  },
    portBridge: { type:String, required: false  }
  });

  const bridge = new Schema({
    bridgeName: { type: String, required: true },
    ports: [{ type:ports, required: true }]
  });

  // const bridges = new Schema({
  //   bridges: [{ type: bridge, required: true }],
  // });

  const bridges = new Schema({
    bridges: [{ type: odlConfig, required: true }],
  });

  // const odl = new Schema({
  //   switchConfig: [{ type:Schema.Types.ObjectId, ref: odlConfig, required: true }],
  // }, {
  //   timestamps: true
  // });

  const odl = new Schema({
    gatewayId: { type: String, required: true , unique: true, primaryKey: true },
    hwModelId: { type: String, required: true },
    ovsVersion: { type: String, required: true },
    switchConfig: { type: bridges, required: true },
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

 {
   gatewayId: '123',
   hw_model_id: '123456-789',
   'ovs-version': '2.9.2',
   bridges: [
     {
       bridge: 'brmn001',
       mac: 'bridge-mac', // One of port mac matches bridge mac
       trunkIp: '10.36.32.0/24',
       trunkPort: 2,
       ports: [
         { portNumber : 2, interface: 'enp4s0',        hwtype: 'wired', subnet: '192.168.250.0/24', vlanid: 0, portMac: '' },
         { portNumber: 3, interface: 'enp5s0',        hwtype: 'wired', subnet: '192.168.251.0/24', vlanid: 0, portMac: '' },
         { portNumber: 4, interface: 'veth00001.128', hwtype: 'wifi',  subnet: '192.168.252.0/24', vlanid: 128, portMac: '' },
         { portNumber: 4, interface: 'veth00001.129', hwtype: 'wifi',  subnet: '192.168.253.0/24', vlanid: 129 , portMac: ''},
         { portNumber: 4, interface: 'veth00001.130', hwtype: 'wifi',  subnet: '192.168.254.0/24', vlanid: 130, portMac: '' },
         { portNumber: 4, interface: 'veth00001.131', hwtype: 'wifi',  subnet: '192.168.255.0/24', vlanid: 131, portMac: '' }
       ]
     }
   ]
 }

*/

/* POST Body
{
   "gatewayId": "123",
   "hwModelId": "123456-789",
   "ovsVersion": "2.9.2",
   "switchConfig":{
   	"bridges": [
     {

       	"bridge": "brmn001",
       "ports": [
         { "port": "1", "interface": "enp3s0","hwtype": "trunk", "subnet": "10.36.32.0/24", "ipv4": "10.36.32.55", "hwaddr": "02:ad:de:ad:be:ef", "vlanid": "0" },
         { "port": "2", "interface": "enp4s0","hwtype": "wired", "subnet": "192.168.250.0/24", "vlanid": "0" },
         { "port": "3", "interface": "enp5s0","hwtype": "wired", "subnet": "192.168.251.0/24", "vlanid": "0" },
         { "port": "4", "interface": "veth00001.128", "hwtype": "wifi",  "subnet": "192.168.252.0/24", "vlanid": "128" },
         { "port": "4", "interface": "veth00001.129", "hwtype": "wifi",  "subnet": "192.168.253.0/24", "vlanid": "129" },
         { "port": "4", "interface": "veth00001.130", "hwtype": "wifi",  "subnet": "192.168.254.0/24", "vlanid": "130" },
         { "port": "4", "interface": "veth00001.131", "hwtype": "wifi",  "subnet": "192.168.255.0/24", "vlanid": "131" }
       ]
     }

   ]
}
 }
 */


/* POST Body
{
   "gatewayId": "1234",
   "hwModelId": "123156-789",
   "ovsVersion": "2.9.2",
   "switchConfig":{
   	"bridges": [
     {

       	"portTrunk":"trunk",
       	"ovsHost":"192.0.0.1",
       	"subnet": "10.36.32.0/24",
       	"vLanId":"0",
       	"portWired":"",
       	"portWireless":"",
       	"bridge":"brmn001",
       	"portBridge":"1"
     },
     {
       	"portTrunk":"",
       	"ovsHost":"192.0.0.1",
       	"subnet": "192.168.250.0/24",
       	"vLanId":"0",
       	"portWired":"wired",
       	"portWireless":"",
       	"bridge":"brmn001",
       	"portBridge":"2"
     }
   ]
}
 }
 */

