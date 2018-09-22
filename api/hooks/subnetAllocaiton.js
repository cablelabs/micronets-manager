const ipaddress = require('ip-address');

// const SUBNET_SIZE = 256;
// const HOSTS_SIZE = 256;
//
// const MIN_NETWORK = 0;
// const MAX_NETWORK = 254;
// const MIN_HOSTS = 2; // Reserve 0 for subnet, 1 for gateway.
// const MAX_HOSTS = 254;
// const OCTET_MAX = 254;

module.exports = {
  OCTET_A: 10,
  OCTET_B: 20,
  SUBNET_MAX: 254,
  SUBNET_MIN: 1,
  GATEWAY_HOST: 1,
  SUBNET_OFFSET: 1,
  IP_MIN: 2,
  IP_MAX: 254,

  lock: false,
  currentSubnet: {},
  nextSubnet: 0,
  db: {},
  nextAvailableHost: 1
};

module.exports.setup = function (app, config) {
  me = this;
  return new Promise(async function (resolve, reject) {
    if (config) {
      if (config.octetA) me.OCTET_A = config.octetA;
      if (config.octetB) me.OCTET_B = config.octetB;
      if (config.subnetMax) me.SUBNET_MAX = config.subnetMax;
      if (config.subnetMin) me.SUBNET_MIN = config.subnetMin;
      if (config.gateway) me.GATEWAY_HOST = config.gateway;
      if (config.offset) me.SUBNET_OFFSET = config.offset;
      if (config.ipMin) me.IP_MIN = config.ipMin;
      if (config.ipMax) me.IP_MAX = config.ipMax;
      me.nextAvailableHost = me.IP_MIN;
    }
    app.get('mongoClient')
      .then((dbP) => {
        console.log('connected');
        me.db = dbP.db().collection('subnetAllocation');
        resolve(me)
      })
      .catch(err => {
        console.log(err);
        reject(err)
      })
  })
};

module.exports.getNewSubnet = function (vlan, requestedSubnet) {
  let me = this;
  return new Promise(async function (resolve, reject) {
    if (me.lock) {
      resolve(me.getSyncNewSubnet(vlan, requestedSubnet))
    }
    else {
      const intervalObj = setInterval(() => {
        if (me.lock === false) {
          clearInterval(intervalObj)
          resolve(me.getSyncNewSubnet(vlan, requestedSubnet))
        }
        else {
          // console.log('no lock for me')
        }
      }, 10);
    }
  })
}

module.exports.deallocateSubnet = function (vlan, requestedSubnet) {
  let me = this
  return new Promise(async function (resolve, reject) {
    if (me.lock) {
      resolve(me.removeSyncNewSubnet(vlan, requestedSubnet))
    }
    else {
      const intervalObj2 = setInterval(() => {
        if (me.lock === false) {
          clearInterval(intervalObj2)
          resolve(me.removeSyncNewSubnet(vlan, requestedSubnet))
        }
        else {
          // console.log('no lock for me')
        }
      }, 10);
    }
  })
};

module.exports.getSyncNewSubnet = function (vlan, requestedSubnet) {
  if (this.lock) console.log('Error:  Lock System Broke')
  this.lock = true
  // console.log('I have the lock')
  let me = this;
  return new Promise(async function (resolve, reject) {
    allocateSubnet(me, requestedSubnet)
      .then((blob) => {
        let network = blob[0];
        let gateway = blob[1];
        let mask = getNetworkMask(network);
        me.currentSubnet = {
          subnet: me.nextSubnet,
          micronetSubnet: network.address,
          cidr: network.subnetMask,
          mask: mask.addressMinusSuffix,
          micronetGatewayIp: gateway.addressMinusSuffix,
          vlan: vlan
        };
        me.db.insertOne(me.currentSubnet, function (err, res) {
          resolve(me.currentSubnet)
          me.lock = false
          // console.log('I have released the lock')
        })
      })
      .catch((err) => {
        console.log(err);
        reject(err)
      })
  })
};


module.exports.removeSyncNewSubnet = function (vlan, requestedSubnet) {
  if (this.lock) console.log('Error:  Lock System Broke')
  this.lock = true
  // console.log('I have the lock')
  let me = this;
  return new Promise(async function (resolve, reject) {
    deAllocateSubnet(me, requestedSubnet)
      .then(() => {
        me.lock = false
        resolve()
      })
      .catch((err) => {
        console.log(err);
        reject(err)
      })
  })
};

module.exports.getNewIps = function (subnet, devices) {
  let me = this;
  return new Promise(async function (resolve, reject) {
    if (!subnet) {
      reject(new Error("Subnet cannot be undefined"))
    }
    me.currentSubnet = await getSubnet(subnet, me);
    for (let i = 0; i < devices.length; i++) {
      me.nextAvailableHost = getNextAvailableIp(me);
      let tempHost = allocateHost(devices[i], me);
      if (tempHost.message) {
        reject(tempHost);
      }
      me.currentSubnet.connectedDevices.push(tempHost)
      me.nextAvailableHost++
    }
    saveSubnet(me)
      .then((newSubnet) => {
        resolve(newSubnet);
      })
      .catch((err) => {
        console.log(err);
        reject(err);
      })
  })
};

function getNextAvailableIp(me) {
  let tempId = me.IP_MIN
  if (!me.currentSubnet.connectedDevices) {
    me.currentSubnet.connectedDevices = []
  }
  else {
    for (let i = 0; i < me.currentSubnet.connectedDevices.length; i++) {
      if (me.currentSubnet.connectedDevices[i].host >= tempId) {
        tempId = me.currentSubnet.connectedDevices[i].host + 1
      }
    }
  }
  return tempId;
}

function saveSubnet(me) {
  let me2 = me
  return new Promise(async function (resolve, reject) {
    me2.db.replaceOne({subnet: me2.currentSubnet.subnet}, me2.currentSubnet, {}, function (err, res) {
      if (err) {
        console.log(err);
        reject(err)
      }
      else {
        resolve(res.ops[0])
      }
    })
  })
}

/**
 *
 * @returns {Promise<Subnet>}
 */
function allocateSubnet(me, requestedSubnet) {
  return new Promise(async function (resolve, reject) {
    if (!requestedSubnet) {
      me.db.find({}).toArray(function (err, results) {
        if (err) {
          console.log(err);
          reject(err)
        }
        else {
          if (results.length === 0) {
            me.nextSubnet = me.SUBNET_MIN;
          }
          else {
            me.nextSubnet = me.SUBNET_MIN;
            for (let i = 0; i < results.length; i++) {
              if (results[i].subnet >= me.nextSubnet) {
                me.nextSubnet = results[i].subnet + me.SUBNET_OFFSET
              }
            }
          }
          let network = new ipaddress.Address4(me.OCTET_A + '.' + me.OCTET_B + '.' + me.nextSubnet + '.' + 0 + '/24');
          let gateway = new ipaddress.Address4(me.OCTET_A + '.' + me.OCTET_B + '.' + me.nextSubnet + '.' + me.GATEWAY_HOST + '/24');
          resolve([network, gateway])
        }
      })
    }
    else {
      me.db.find({subnet: requestedSubnet}).toArray(function (err, results) {
        if (err) {
          console.log(err);
          reject(err)
        }
        else {
          if (results.length === 0) {
            me.nextSubnet = requestedSubnet;
          }
          else {
            reject(new Error('That Subnet is already taken'))
          }
          let network = new ipaddress.Address4(me.OCTET_A + '.' + me.OCTET_B + '.' + me.nextSubnet + '.' + 0 + '/24');
          let gateway = new ipaddress.Address4(me.OCTET_A + '.' + me.OCTET_B + '.' + me.nextSubnet + '.' + me.GATEWAY_HOST + '/24');
          resolve([network, gateway])
        }
      })
    }
  })
}

function deAllocateSubnet(me, requestedSubnet) {
  return new Promise(async function (resolve, reject) {
    me.db.deleteOne({subnet: requestedSubnet}, function(err, obj) {
      if (err) reject(err);
      console.log('Subnet ' + requestedSubnet + ' deleted');
      resolve()
    });
  })
}

function getSubnet(subnet, me) {
  return new Promise(async function (resolve, reject) {
    me.db.find({subnet: subnet}).toArray(function (err, records) {
      if (err) {
        console.log(err);
        reject(err)
      }
      else {
        if (records.length == 0) {
          reject(new Error("No such subnet as " + subnet))
        }
        else {
          resolve(records[0])
        }
      }
    })
  })
}

function allocateHost(device, me) {
  if (me.nextAvailableHost > me.IP_MAX) {
    return (new Error('No Host IPs available on subnet ' + me.currentSubnet.subnet))
  }
  else {
    let host = new ipaddress.Address4(me.OCTET_A + '.' + me.OCTET_B + '.' + me.currentSubnet.subnet + '.' + me.nextAvailableHost + '/' + me.currentSubnet.cidr);
    device.deviceIp = host.addressMinusSuffix;
    device.host = me.nextAvailableHost;
    return device;
  }
}


function getNetworkMask(subnet) {
  let tempBinary = '';
  for (i = 0; i < subnet.subnetMask; i++) {
    tempBinary += '1'
  }
  for (let j = subnet.subnetMask; j < 32; j++) {
    tempBinary += '0'
  }
  let binary = parseInt(tempBinary, 2);
  let mask = new ipaddress.Address4.fromInteger(binary);
  return mask
}