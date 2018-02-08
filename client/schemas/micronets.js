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
              type: 'string',
              minLength: 32
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
                    minLength: 32
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
                      }
                    }
                  }
                },
                required: ['deviceId', 'deviceName', 'deviceDescription', 'mac']
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
