module.exports = {
    "id" : "7B2A-BE88-08817Z" ,
    "name" : "Grandma's LINKSYS 1900" ,
    "ssid" : "grandma-gw" ,
    "devices" : [
      {
        "clientId" : "https://ST-healthcare.org/" ,
        "deviceId" : "h2h0h43188fh1h148pfbf4c8996fb92427ae41e4649b934ca495991b7852b842" ,
        "macAddress" : "b8:27:eb:8d:30:27" ,
        "class" : "Medical"
      } ,
      {
        "clientId" : "https://ST-healthcare.org/" ,
        "deviceId" : "j2h0j42188fh1h148pfbf4c8996fb92427ae41e4649b934ca495991b7852b842" ,
        "macAddress" : "b8:27:eb:df:ae:a7" ,
        "class" : "CableLabs"
      } ,
      {
        "clientId" : "https://ST-healthcare.org/" ,
        "deviceId" : "e2h0e52188fh1h148pfbf4c8996fb92427ae41e4649b934ca495991b7852b842" ,
        "macAddress" : "b8:27:eb:ab:41:12" ,
        "class" : "Entertainment"
      }
    ] ,
    "micronets" : {
      "subnets" : [
        {
          "name" : "Micronet_Medical" ,
          "class" : "Medical",
          "trunk-gateway-port" : "1" ,
          "connected-devices" : [
            {
              "device-mac" : "b8:27:eb:8d:30:27" ,
              "device-ip" : "192.168.250.2" ,
              "device-openflow-port" : "2" ,
              "device-name" : "pia" ,
              "device-id" : "Raspberry-Pi3-Model-B-v1.2"
            }
          ] ,
          "ovs-manager-ip" : "10.36.32.55" ,
          "micronet-subnet" : "192.168.250.0/24" ,
          "dhcp-server-port" : "LOCAL" ,
          "micronet-gateway-ip" : "192.168.250.1" ,
          "ovs-bridge-name" : "brmn001" ,
          "micronet-subnet-id" : "WIRED_enp4s0" ,
          "dhcp-zone" : "10.36.32.0/24" ,
          "trunk-gateway-ip" : "10.36.32.55"
        } ,
        {
          "name" : "Micronet_CableLabs" ,
          "class" : "CableLabs",
          "trunk-gateway-port" : "1" ,
          "connected-devices" : [
            {
              "device-mac" : "b8:27:eb:df:ae:a7" ,
              "device-ip" : "192.168.251.2" ,
              "device-openflow-port" : "3" ,
              "device-name" : "pib" ,
              "device-id" : "Raspberry-Pi3-Model-B-v1.2"
            }
          ] ,
          "ovs-manager-ip" : "10.36.32.55" ,
          "micronet-subnet" : "192.168.251.0/24" ,
          "dhcp-server-port" : "LOCAL" ,
          "micronet-gateway-ip" : "192.168.251.1" ,
          "ovs-bridge-name" : "brmn001" ,
          "micronet-subnet-id" : "WIRED_enp4s0" ,
          "dhcp-zone" : "192.168.251.0/24" ,
          "trunk-gateway-ip" : "10.36.32.55"
        } ,
        {
          "name" : "Micronet_Entertainment" ,
          "class" : "Entertainment",
          "trunk-gateway-port" : "1" ,
          "connected-devices" : [
            {
              "device-mac" : "b8:27:eb:ab:41:12" ,
              "device-ip" : "192.168.252.2" ,
              "device-openflow-port" : "4" ,
              "device-name" : "picw" ,
              "device-id" : "Raspberry-Pi3-Model-B-v1.2"
            }
          ] ,
          "ovs-manager-ip" : "10.36.32.55" ,
          "micronet-subnet" : "192.168.252.0/24" ,
          "dhcp-server-port" : "LOCAL" ,
          "micronet-gateway-ip" : "192.168.252.1" ,
          "ovs-bridge-name" : "brmn001" ,
          "micronet-subnet-id" : "WIRELESS_wlp2s0" ,
          "dhcp-zone" : "10.36.32.0/24" ,
          "trunk-gateway-ip" : "10.36.32.55"
        }
      ]
    }
  }
