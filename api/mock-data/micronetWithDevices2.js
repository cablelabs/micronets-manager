module.exports = {
  "micronets" : {
    "micronet" : [
      {
        "name" : "Medical" ,
        "class" : "Medical" ,
        "trunk-gateway-port" : "1" ,
        "micronet-bridge-openflow-node-id" : "openflow:2945788526319" ,
        "ovs-manager-ip" : "10.36.32.55" ,
        "dhcp-server-port" : "LOCAL" ,
        "micronet-subnet-id" : "WIRED_enp4s0" ,
        "dhcp-zone" : "192.168.12.0/24" ,
        "micronet-id" : 1534270984 ,
        "micronet-bridge-nodeid" : "ovsdb://uuid/686dcad0-9517-4471-b3a1-efc8a204130b/bridge/brmn001" ,
        "connected-devices" : [
          {
            "device-mac" : "b8:27:eb:8d:30:27" ,
            "device-ip" : "192.168.250.2" ,
            "device-openflow-port" : "2" ,
            "device-name" : "pia" ,
            "device-id" : "Raspberry-Pi3-Model-B-v1.2"
          },
          {
            "device-mac" : "b2:25:eb:8d:30:27" ,
            "device-ip" : "192.168.250.2" ,
            "device-openflow-port" : "2" ,
            "device-name" : "pia" ,
            "device-id" : "Raspberry-Pi3-Model-B-v1.3"
          }
        ],
        "micronet-subnet" : "192.168.12.0/24" ,
        "micronet-gateway-ip" : "192.168.12.1" ,
        "ovs-bridge-name" : "brmn001" ,
        "trunk-gateway-ip" : "10.36.32.55"

      } ,
      {
        "name" : "CableLabs" ,
        "class" : "CableLabs" ,
        "trunk-gateway-port" : "1" ,
        "micronet-bridge-openflow-node-id" : "openflow:2945788526319" ,
        "ovs-manager-ip" : "10.36.32.55" ,
        "dhcp-server-port" : "LOCAL" ,
        "micronet-subnet-id" : "WIRELESS_wlp2s0" ,
        "dhcp-zone" : "192.168.10.0/24" ,
        "micronet-id" : 1534270985 ,
        "micronet-bridge-nodeid" : "ovsdb://uuid/686dcad0-9517-4471-b3a1-efc8a204130b/bridge/brmn001" ,
        "connected-devices" : [
          {
            "device-mac" : "b8:27:eb:df:ae:a7" ,
            "device-ip" : "192.168.251.2" ,
            "device-openflow-port" : "3" ,
            "device-name" : "pib" ,
            "device-id" : "Raspberry-Pi3-Model-B-v1.2"
          }
        ],
        "micronet-subnet" : "192.168.10.0/24" ,
        "micronet-gateway-ip" : "192.168.10.1" ,
        "ovs-bridge-name" : "brmn001" ,
        "trunk-gateway-ip" : "10.36.32.55"
      }
    ]
  }
}

