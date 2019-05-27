const API_VERSION = 'v1'
const API_PREFIX = `mm/${API_VERSION}/micronets`
const API_PREFIX2 = `mm/${API_VERSION}`
const MSO_API_PREFIX = `portal/${API_VERSION}`
const MICRONETS_PATH = `mm/v1/subscriber`
const MOCK_MICRONET_PATH = `mm/v1/mock/subscriber`
const CSRT_PATH = `${API_PREFIX}/csrt`
const CERTIFICATES_PATH = `${API_PREFIX}/certificates`
const USERS_PATH = `${API_PREFIX}/users`
const REGISTRY_PATH = `${API_PREFIX}/registry`
const ODL_PATH = `${API_PREFIX}/odl`
const DHCP_PATH = `${API_PREFIX2}/dhcp/subnets`
const GATEWAY_PATH = `${API_PREFIX}/gateway`
const DPP_PATH =  `${API_PREFIX2}/dpp`
const MSO_DPP_API_ONBOARD = `${MSO_API_PREFIX}/onboarding/dpp`
const MSO_STATUS_PATH = `${MSO_API_PREFIX}/status`
const paths = () => {
  return {
    API_PREFIX ,
    MICRONETS_PATH ,
    GATEWAY_PATH ,
    MOCK_MICRONET_PATH ,
    CSRT_PATH ,
    CERTIFICATES_PATH ,
    USERS_PATH ,
    REGISTRY_PATH ,
    ODL_PATH ,
    DHCP_PATH,
    DPP_PATH,
    MSO_DPP_API_ONBOARD,
    MSO_STATUS_PATH
  }
}

module.exports = paths()