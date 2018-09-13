module.exports = {
  "micronets": {
    "micronet": [
      {
        "name": "Medical",
        "trunk-gateway-port": "1",
        "micronet-bridge-openflow-node-id": "openflow:2945788526319",
        "ovs-manager-ip": "10.36.32.55",
        "dhcp-server-port": "LOCAL",
        "micronet-subnet-id": "WIRED_enp4s0",
        "dhcp-zone": "192.168.250.0/24",
        "micronet-id": 1534270984,
        "micronet-bridge-nodeid": "ovsdb://uuid/686dcad0-9517-4471-b3a1-efc8a204130b/bridge/brmn001",
        "micronet-subnet": "192.168.250.0/24",
        "micronet-gateway-ip": "192.168.250.1",
        "ovs-bridge-name": "brmn001",
        "trunk-gateway-ip": "10.36.32.55"
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