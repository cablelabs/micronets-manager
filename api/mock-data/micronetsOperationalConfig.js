module.exports = {
  "micronets": {
    "micronet": [
      {
        "name": "Micronet_Wired250",
        "trunk-gateway-port": "2",
        "connected-devices": [
          {
            "device-mac": "08:00:27:bc:47:8c",
            "device-ip": "192.168.250.2",
            "device-openflow-port": "3",
            "device-name": "ovsdev-250-2",
            "device-id": "Ubuntu Server VM 1"
          },
          {
            "device-mac": "08:00:27:44:7d:9d",
            "device-ip": "192.168.250.3",
            "device-openflow-port": "3",
            "device-name": "ovsdev-250-3",
            "device-id": "Ubuntu Server VM 2"
          }
        ],
        "micronet-id": 1534270984,
        "ovs-manager-ip": "192.168.100.165",
        "micronet-subnet": "192.168.250.0/24",
        "dhcp-server-port": "LOCAL",
        "micronet-gateway-ip": "192.168.250.1",
        "ovs-bridge-name": "brmn001",
        "micronet-subnet-id": "WIRED_250",
        "dhcp-zone": "192.168.250.0/24",
        "trunk-gateway-ip": "192.168.100.165"
      },
      {
        "name": "Entertainment",
        "trunk-gateway-port": "1",
        "micronet-bridge-openflow-node-id": "openflow:2945788526319",
        "ovs-manager-ip": "10.36.32.55",
        "dhcp-server-port": "LOCAL",
        "micronet-subnet-id": "WIRELESS_wlp2s0",
        "dhcp-zone": "192.168.251.0/24",
        "micronet-id": 1534270985,
        "micronet-bridge-nodeid": "ovsdb://uuid/686dcad0-9517-4471-b3a1-efc8a204130b/bridge/brmn001",
        "micronet-subnet": "192.168.251.0/24",
        "micronet-gateway-ip": "192.168.251.1",
        "ovs-bridge-name": "brmn001",
        "trunk-gateway-ip": "10.36.32.55"
      }
    ]
  }
}