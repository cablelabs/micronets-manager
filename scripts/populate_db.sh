#!/usr/bin/env bash

<<<<<<< HEAD
MSO_PORTAL_HOSTNAME='10.0.0.238:3210'
MM_HOSTNAME='10.0.0.238:3030'
=======
MSO_PORTAL_HOSTNAME='nccoe-mso-api.micronets.in'
MM_HOSTNAME='nccoe-mm-api.micronets.in'
>>>>>>> micronets-manager-integration

echo 'Getting Authorization token from ' $MSO_PORTAL_HOSTNAME

TOKEN=$(curl -s -X POST -H 'Accept: application/json' -H 'Content-Type: application/json' --data-binary @./data/tokenPost.json http://${MSO_PORTAL_HOSTNAME}/portal/registration/token | jq -r '.accessToken')
JWT_TOKEN="Bearer ${TOKEN}"

echo ' JWT Token : ' $JWT_TOKEN

<<<<<<< HEAD
=======
#! DELETE REGISTRY CURL

echo ' Delete existing registry on ' $MM_HOSTNAME

REGISTRIES=$(curl -s -X DELETE -H "Authorization: ${JWT_TOKEN}" -H 'Accept: application/json' -H 'Content-Type: application/json'  http://${MM_HOSTNAME}/mm/v1/micronets/registry )


>>>>>>> micronets-manager-integration
#! POST REGISTRY CURL

echo ' Populating registry on ' $MM_HOSTNAME

REGISTRY=$(curl -s -X POST -H "Authorization: ${JWT_TOKEN}" -H 'Accept: application/json' -H 'Content-Type: application/json' --data-binary @./data/registryPost.json http://${MM_HOSTNAME}/mm/v1/micronets/registry )

echo ' Registry : ' ${REGISTRY}

<<<<<<< HEAD
echo ' Populating switch config on ' $MM_HOSTNAME

#! POST SWITCH CONFIG CURL

SWITCH_CONFIG=$(curl -s -X POST -H "Authorization: ${JWT_TOKEN}" -H 'Accept: application/json' -H 'Content-Type: application/json' --data-binary @./data/odlPost.json http://${MM_HOSTNAME}/mm/v1/micronets/odl )

echo ' Switch Config : ' ${SWITCH_CONFIG}

=======

#! DELETE REGISTRY CURL

echo ' Delete existing switch config on ' $MM_HOSTNAME

SWITCH_CONFIGS=$(curl -s -X DELETE -H "Authorization: ${JWT_TOKEN}" -H 'Accept: application/json' -H 'Content-Type: application/json'  http://${MM_HOSTNAME}/mm/v1/micronets/odl )


#! POST SWITCH CONFIG CURL

echo ' Populating switch config on ' $MM_HOSTNAME

SWITCH_CONFIG=$(curl -s -X POST -H "Authorization: ${JWT_TOKEN}" -H 'Accept: application/json' -H 'Content-Type: application/json' --data-binary @./data/odlPost.json http://${MM_HOSTNAME}/mm/v1/micronets/odl )

echo ' Switch Config : ' ${SWITCH_CONFIG}
>>>>>>> micronets-manager-integration
