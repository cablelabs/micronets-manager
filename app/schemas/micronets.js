module.exports.Definitions = {
  Subnet: {
    type: 'object',
    properties: {
      timestampUtc: {
        type: 'string',
        format: 'date-time'
      },
      subnets: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            subnetId: {
              type: 'string'
            },
            subnetName: {
              type: 'string',
              minLength: 1
            },
            deviceList: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  timestampUtc: {
                    type: 'string'
                  },
                  deviceId: {
                    type: 'string',
                  },
                  deviceName: {
                    type: 'string',
                    minLength: 1
                  },
                  deviceDescription: {
                    type: 'string',
                    minLength: 1
                  },
                  mac: {
                    type: 'object',
                    properties: {
                      eui48: {
                        type: 'string'
                        // pattern:'^([0-9A-F]{2}[:]){5}([0-9A-F]{2})$' // matches 0123456789AB
                      }
                    }
                  }
                },
                required: ['deviceId', 'deviceName', 'deviceDescription', 'mac','timestampUtc']
              }
            }
          },
          required: ['subnetId', 'subnetName', 'deviceList']
        }
      }
    },
    required: ['timestampUtc', 'subnets']
  }
}