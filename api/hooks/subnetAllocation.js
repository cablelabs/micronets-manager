const ipaddress = require('ip-address');
const AwaitLock = require('await-lock')

module.exports.setup = function (app, config) {
  this.lock = new AwaitLock()
  me = this;
  return new Promise(async function (resolve, reject) {
    app.get('mongoClient')
      .then((dbP) => {
        console.log('subnet allocator connected');
        me.db = dbP.db().collection('subnetAllocation');
        me.db.createIndex({"subnetAddress": 1}, {unique: true})
        resolve(me)
      })
      .catch(err => {
        console.log(err);
        reject(err)
      })
  })
};

/**
 *
 * @returns {Promise<Subnet>}
 */
module.exports.allocateSubnetAddress = function (subnetSpec, gatewaySpec) {
  // console.log(`allocateSubnetAddress(${JSON.stringify(subnetSpec)},${JSON.stringify(gatewaySpec)})`)
  me = this; // The Promise won't get this without using nn intermediate var
  return new Promise(async function (resolve, reject) {
    await me.lock.acquireAsync()
    me.db.find({}).toArray(function (err, results) {
      if (err) {
        console.log(err);
        reject(err)
        me.lock.release()
      } else {
        allocatedSubnets = results

        let sr = subnetSpec
        let gw = gatewaySpec
        let subnetBits = 24

        if (!sr.octetC) {
          minC = maxC = 0
          subnetBits = 16
        } else if (sr.octetC instanceof Object) {
          minC = sr.octetC.min
          maxC = sr.octetC.max
        } else {
          minC =  maxC = sr.octetC
        }

        if (!sr.octetB) {
          minB = maxB = 0
          subnetBits = 8
        } else if (sr.octetB instanceof Object) {
          minB = sr.octetB.min
          maxB = sr.octetB.max
        } else {
          minB = maxB = sr.octetB
        }

        if (!sr.octetA) {
          reject(new Error('The provided subnetspec must contain an octetA element'))
          return
        } else if (sr.octetA instanceof Object) {
          minA = sr.octetA.min
          maxA = sr.octetA.max
        } else {
          minA = maxA = sr.octetA
        }

        if (!gw || !gw.octetD) {
          reject(new Error('The gateway pattern must be provided and must have octetD set'))
          me.lock.release()
          return
        }

        if (sr.octetC && gw.octetC) {
          reject(new Error('The subnet and gateway both have octetC set (' 
                           + sr.octetC +' vs ' + gw.octetC + ')'))
          me.lock.release()
          return
        }

        if (sr.octetB && gw.octetB) {
          reject(new Error('The subnet and gateway both have octetB set (' 
                           + sr.octetB +' vs ' + gw.octetB + ')'))
          me.lock.release()
          return
        }

        found = false
        let subnetCount = 0
        for (let a = minA; a <= maxA && !found; a++) {
          for (let b = minB; b <= maxB && !found; b++) {
            for (let c = minC; c <= maxC && !found; c++) {
              curSubnetAddress = a + '.' + b + '.' + c + '.0/' + subnetBits
              // console.log("Considering subnet address: " + curSubnetAddress)
              // let subnet = new ipaddress.Address4(a + '.' + b + '.' + c + '.0/' + subnetBits);
              subnetCount++
              subnetInUse = false
              for (let i=0; i<allocatedSubnets.length; i++) {
                inUseAddress = allocatedSubnets[i].subnetAddress
                // console.log("  Found in-use address: " + inUseAddress )
                if (curSubnetAddress === inUseAddress) {
                  subnetInUse = true
                  break
                }
              }
              if (subnetInUse) {
                // console.log("Subnet " + curSubnetAddress + " already in use")
              } else {
                // console.log("Found unused subnet address: " + curSubnetAddress)
                gwAddress = a + '.' + (b || gw.octetB) + '.'
                            + (c || gw.octetC) + '.' + gw.octetD
                dbRecord = {subnetAddress: curSubnetAddress, gatewayAddress: gwAddress}
                // console.log("subnet dbRecord: " + JSON.stringify(dbRecord)) 
                me.db.insertOne(dbRecord, function (err, res) {
                  if (err) {
                    console.log("Error adding subnet " + JSON.stringify(dbRecord)
                                + ": " + err)
                    reject(err)
                  } else {
                    resolve(dbRecord)
                  }
                  me.lock.release()
                })
                found = true
              }
            }
          }
        }
        if (!found) {
          msg = `Could not allocate a subnet from ${JSON.stringify(subnetSpec)}`
                + ` - all ${subnetCount} subnets already allocated`
          console.log(msg)
          reject(new Error(msg))
          me.lock.release()
        }
      }
    })
  })
}

module.exports.getSubnet = function (subnetAddress) {
  let me = this
  return new Promise(async function (resolve, reject) {
    await me.lock.acquireAsync()
    let subnet = new ipaddress.Address4(subnetAddress);
    if (!subnet) {
      reject(new Error('The provided subnet cannot be parsed (' + subnetAddress + ')'))
      return
    }
    me.db.find({subnetAddress: subnetAddress}).toArray(function (err, results) {
      if (err) {
        console.log("Error retrieving subnet " + subnetAddress + ": " + err)
        reject(err)
      } else {
        if (results.length !== 1) {
          reject(new Error('Cannot find subnet record for ' + subnetAddress))
        } else {
          subnet = results[0]
          resolve(subnet)
        }
      }
      me.lock.release()
    })
  })
}

module.exports.releaseSubnetAddress = function (subnetAddress) {
  let me = this
  return new Promise(async function (resolve, reject) {
    await me.lock.acquireAsync()
    // console.log("Releasing " + subnetAddress)
    count = me.db.deleteOne({subnetAddress: subnetAddress}, function(err, obj) {
      if (err) {
        // console.log("Error releasing subnet address " + subnetAddress + ": " + err)
        reject(err)
      } else {
        if (obj.deletedCount === 1) {
          resolve(subnetAddress)
        } else {
          resolve(null)
        }
      }
      me.lock.release()
    });
  })
}

module.exports.allocateDeviceAddress = function (subnetAddress, deviceSpec, deviceObj) {
      //console.log(`allocateDeviceAddress(${subnetAddress},${JSON.stringify(deviceSpec)},${JSON.stringify(deviceObj)})`)
  let me = this
  if (!deviceObj) {
    deviceObj = {}
  }
  return new Promise(async function (resolve, reject) {
    await me.lock.acquireAsync()
    // ("Getting device address for subnet " + subnetAddress)
    let subnet = new ipaddress.Address4(subnetAddress);
    if (!subnet) {
      reject(new Error('The provided subnet cannot be parsed (' + subnetAddress + ')'))
      me.lock.release()
      return
    }
    // console.log("device subnet: " + JSON.stringify(subnet))
    subnetA = subnet.parsedAddress[0]
    subnetB = subnet.parsedAddress[1]
    subnetC = subnet.parsedAddress[2]

    let dr = deviceSpec

    if (dr.octetA) {
      reject(new Error('The provided device spec cannot contain an octetA element'))
      me.lock.release()
      return
    }
    
    if ((dr.octetB && dr.octetB != 0) && (subnetB && subnetB != 0)) {
      reject(new Error('The devicespec contains an octetB (' + JSON.stringify(dr.octetB)
                       + '), but so does the provided subnet (' + JSON.stringify(subnetB) 
                       + ')'))
      me.lock.release()
      return
    }

    if ((dr.octetC && dr.octetC != 0) && (subnetC && subnetC != 0)) {
      reject(new Error('The devicespec contains an octetC (' + JSON.stringify(dr.octetC) 
                       + '), but so does the provided subnet (' + JSON.stringify(subnetC) 
                       + ')'))
      me.lock.release()
      return
    }

    if (!dr.octetD) {
      reject(new Error('The devicespec must contain an octetD'))
      me.lock.release()
      return
    }

    me.db.find({subnetAddress: subnetAddress}).toArray(function (err, results) {
      if (err) {
        console.log("Could not find subnet " + subnetAddress + ": " + err)
        reject(err)
        me.lock.release()
      } else {
        if (results.length !== 1) {
          reject(new Error('Cannot find subnet record for ' + subnetAddress))
          me.lock.release()
          return
        } else {
          subnet = results[0]
          if (!subnet.devices) subnet.devices = []

          if (dr.octetD instanceof Object) {
            minD = dr.octetD.min
            maxD = dr.octetD.max
          } else {
            minD = maxD = dr.octetD
          }

          if (!dr.octetC) {
            minC = maxC = subnetC
          } else if (dr.octetC instanceof Object) {
            minC = dr.octetC.min
            maxC = dr.octetC.max
          } else {
            minC = maxC = dr.octetC
          }

          if (!dr.octetB) {
            minB = maxB = subnetB
          } else if (dr.octetB instanceof Object) {
            minB = dr.octetB.min
            maxB = dr.octetB.max
          } else {
            minB = maxB = dr.octetB
          }

          // console.log("deviceA: " + subnetA)
          // console.log("deviceB: minB " + minB + ", maxA " + maxB)
          // console.log("deviceC: minC " + minC + ", maxA " + maxC)
          // console.log("deviceD: minD " + minD + ", maxA " + maxD)

          found = false
          for (let b = minB; b <= maxB && !found; b++) {
            for (let c = minC; c <= maxC && !found; c++) {
              for (let d = minD; d <= maxD && !found; d++) {
                curDeviceAddress = subnetA + '.' + b + '.' + c + '.' + d
                // console.log("Considering device address: " + curDeviceAddress)
                deviceInUse = false
                for (let i=0; i<subnet.devices.length; i++) {
                  inUseAddress = subnet.devices[i].deviceAddress
                  if (curDeviceAddress === inUseAddress) {
                    deviceInUse = true
                    break
                  }
                }
                if (deviceInUse) {
                  console.log("Device address " + curDeviceAddress + " already in use")
                } else {
                  // console.log("Found unused device address: " + curDeviceAddress)
                  deviceObj.deviceAddress = curDeviceAddress
                  subnet.devices.push(deviceObj)
                  me.db.updateOne({subnetAddress: subnetAddress}, 
                                  {$set: {devices: subnet.devices}}, function (err, res) {
                    if (err) {
                      console.log("Error adding device address " + JSON.stringify(curDeviceAddress) 
                                  + ": " + err)
                      reject(err)
                    } else {
                      if (res.modifiedCount === 1) {
                        // console.log(`Updated subnet for device ${curDeviceAddress}: ${JSON.stringify(subnet)}`)
                        resolve(subnet)
                      } else {
                        reject(new Error(`DB record for ${subnetAddress} could not be modified`))
                      }
                    }
                    me.lock.release()
                  })
                  found = true
                }
              }
            }
          }
          if (!found) {
            msg = `Could not allocate a device for subnet ${subnetAddress} using ${JSON.stringify(deviceSpec)}`
            console.log(msg)
            reject(new Error(msg))
            me.lock.release()
          }
        }
      }
    })
  })
}

module.exports.getDevice = function (subnetAddress, deviceAddress) {
  let me = this
  return new Promise(async function (resolve, reject) {
    await me.lock.acquireAsync()

    me.db.find({subnetAddress: subnetAddress}).toArray(function (err, results) {
      if (err) {
        console.log(err);
        reject(err)
        me.lock.release()
        return
      }
      if (results.length !== 1) {
        reject(new Error('Cannot find subnet record for ' + subnetAddress))
        me.lock.release()
        return
      }
      devices = results[0].devices
      if (!devices) devices = []
      let devOffset = -1
      for (let i=0; i<devices.length; i++) {
        dev = devices[i]
        if (dev.deviceAddress === deviceAddress) {
          devOffset = i
          break
        }
      }
      if (devOffset < 0) {
        reject(new Error('Cannot find device with address ' + deviceAddress 
                         + ' in subnet ' + subnetAddress))
        me.lock.release()
        return
      }
      device = devices[devOffset]
      accept(device)
    })
  })
}

module.exports.releaseDeviceAddress = function (subnetAddress, deviceAddress) {
  let me = this
  return new Promise(async function (resolve, reject) {
    await me.lock.acquireAsync()
    // console.log("Deleting device " + deviceAddress + " from subnet " + subnetAddress)

    me.db.find({subnetAddress: subnetAddress}).toArray(function (err, results) {
      if (err) {
        console.log(err);
        reject(err)
        me.lock.release()
        return
      }
      if (results.length !== 1) {
        reject(new Error('Cannot find subnet record for ' + subnetAddress))
        me.lock.release()
        return
      }
      devices = results[0].devices
      if (!devices) devices = []
      let devOffset = -1
      for (let i=0; i<devices.length; i++) {
        dev = devices[i]
        if (dev.deviceAddress === deviceAddress) {
          devOffset = i
          break
        }
      }
      if (devOffset < 0) {
        reject(new Error('Cannot find device with address ' + deviceAddress 
                         + ' in subnet ' + subnetAddress))
        me.lock.release()
        return
      }
      removedDev = devices.splice(devOffset, 1)[0]
      me.db.updateOne({subnetAddress: subnetAddress}, 
                      {$set: {devices: devices}}, function (err, res) {
        if (err) {
          console.log("Error removing " + JSON.stringify(removedDev) 
                      + ": " + err)
          reject(err)
        } else {
          if (res.modifiedCount === 1) {
            console.log("Removed device " + JSON.stringify(removedDev) 
                        + " from subnet " + subnetAddress)
            resolve(removedDev)
          } else {
            resolve(null)
          }
        }
        me.lock.release()
      })
    })
  })
}
