const ipaddress = require('ip-address');

module.exports.setup = function (app, config) {
  me = this;
  return new Promise(async function (resolve, reject) {
    app.get('mongoClient')
      .then((dbP) => {
        console.log('subnet allocator connected');
        me.db = dbP.db().collection('subnetAllocation');
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
module.exports.getNewSubnetAddress = function (subnetRange, requestedSubnet, subnetGateway) {
  me = this; // The Promise won't get this without using nn intermediate var
  return new Promise(async function (resolve, reject) {
    if (!requestedSubnet) {
      me.db.find({}).toArray(function (err, results) {
        if (err) {
          console.log(err);
          reject(err)
        } else {
          allocatedSubnets = results

          let sr = subnetRange
          let gw = subnetGateway
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
            reject(new Error('The provided subnet range must contain an octetA element'))
            return
          } else if (sr.octetA instanceof Object) {
            minA = sr.octetA.min
            maxA = sr.octetA.max
          } else {
            minA = maxA = sr.octetA
          }

          if (sr.octetC && gw.octetC) {
            reject(new Error('The subnet and gateway both have octetC set (' 
                             + sr.octetC +' vs ' + gw.octetC + ')'))
            return
          }

          if (sr.octetB && gw.octetB) {
            reject(new Error('The subnet and gateway both have octetB set (' 
                             + sr.octetB +' vs ' + gw.octetB + ')'))
            return
          }

          if (!gw.octetD) {
            reject(new Error('The gateway must have octetD set'))
            return
          }

          found = false
          for (let a = minA; a <= maxA && !found; a++) {
            for (let b = minB; b <= maxB && !found; b++) {
              for (let c = minC; c <= maxC && !found; c++) {
                curSubnetAddress = a + '.' + b + '.' + c + '.0/' + subnetBits
                // console.log("Considering subnet address: " + curSubnetAddress)
                // let subnet = new ipaddress.Address4(a + '.' + b + '.' + c + '.0/' + subnetBits);
                subnetInUse = false
                for (let i=0; i<allocatedSubnets.length; i++) {
                  inUseAddress = allocatedSubnets[i].subnetAddress
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
                  dbRecord = {subnetAddress: curSubnetAddress, subnetGateway: gwAddress}
                  // console.log("subnet dbRecord: " + JSON.stringify(dbRecord)) 
                  me.db.insertOne(dbRecord, function (err, res) {
                    resolve(dbRecord)
                  })
                  found = true
                }
              }
            }
          }
          if (!found) {
            resolve(null)
          }
        }
      })
    } else {
      me.db.find({subnetAddress: requestedSubnet}).toArray(function (err, results) {
        if (err) {
          console.log(err);
          reject(err)
        } else {
          if (!results.length === 0) {
            reject(new Error('That Subnet " + requestedSubnet + " is already taken'))
          }
          me.db.insertOne({subnetAddress: requestedSubnet}, function (err, res) {
            resolve(requestedSubnet)
          })
        }
      })
    }
  })
}

module.exports.releaseSubnet = function (subnetAddress) {
  let me = this
  return new Promise(async function (resolve, reject) {
    console.log("Deleting " + subnetAddress)
    count = me.db.deleteOne({subnetAddress: subnetAddress}, function(err, obj) {
      if (err) {
        reject(err)
      } else {
        if (obj.deletedCount === 1) {
          resolve(subnetAddress)
        } else {
          resolve(null)
        }
      }
    });
  })
}

module.exports.getNewDeviceAddress = function (subnetAddress, deviceRange) {
  let me = this
  return new Promise(async function (resolve, reject) {
    console.log("Getting device address for subnet " + subnetAddress)
    let subnet = new ipaddress.Address4(subnetAddress);
    if (!subnet) {
      reject(new Error('The provided subnet cannot be parsed (' + subnetAddress + ')'))
      return
    }
    console.log("device subnet: " + subnet)
    subnetA = subnet.parsedAddress[0]
    subnetB = subnet.parsedAddress[1]
    subnetC = subnet.parsedAddress[2]

    let dr = deviceRange

    if (dr.octetA) {
      reject(new Error('The provided device range cannot contain an octetA element'))
      return
    }
    
    if (dr.octetB && subnetB) {
      reject(new Error('The device range contains an octetB (' + dr.octetB 
                       + '), but so does the provided subnet (' + subnetB + ')'))
      return
    }

    if (dr.octetC && subnetC) {
      reject(new Error('The device range contains an octetC (' + dr.octetC 
                       + '), but so does the provided subnet (' + subnetC + ')'))
      return
    }

    if (!dr.octetD) {
      reject(new Error('The device range must contain an octetD'))
      return
    }

    me.db.find({subnetAddress: subnetAddress}).toArray(function (err, results) {
      if (err) {
        console.log(err);
        reject(err)
      } else {
        if (results.length !== 1) {
          reject(new Error('Cannot find subnet record for ' + subnetAddress))
        } else {
          devices = results[0].devices
          if (!devices) devices = []

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

          console.log("deviceA: " + subnetA)
          console.log("deviceB: minB " + minB + ", maxA " + maxB)
          console.log("deviceC: minC " + minC + ", maxA " + maxC)
          console.log("deviceD: minD " + minD + ", maxA " + maxD)

          found = false
          for (let b = minB; b <= maxB && !found; b++) {
            for (let c = minC; c <= maxC && !found; c++) {
              for (let d = minD; d <= maxD && !found; d++) {
                curDeviceAddress = subnetA + '.' + b + '.' + c + '.' + d
                console.log("Considering device address: " + curDeviceAddress)
                deviceInUse = false
                for (let i=0; i<devices.length; i++) {
                  inUseAddress = devices[i]
                  if (curDeviceAddress === inUseAddress) {
                    deviceInUse = true
                    break
                  }
                }
                if (deviceInUse) {
                  console.log("Device address " + curDeviceAddress + " already in use")
                } else {
                  console.log("Found unused device address: " + curDeviceAddress)
                  // TODO
                  devices.push(curDeviceAddress)
                  me.db.updateOne({subnetAddress: subnetAddress}, 
                                  {$set: {devices: devices}}, function (err, res) {
                    if (err) {
                      reject(err)
                    } else {
                      if (res.modifiedCount === 1) {
                        resolve(curDeviceAddress)
                      } else {
                        resolve(null)
                      }
                    }
                  })
                  found = true
                }
              }
            }
          }
          if (!found) {
            resolve(null)
          }
        }
      }
    })
  })
}


