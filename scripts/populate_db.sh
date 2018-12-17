#!/usr/bin/env bash

MSO_PORTAL_HOSTNAME='nccoe-mso-api.micronets.in'
MM_HOSTNAME='nccoe-mm-api.micronets.in'

echo 'Getting Authorization token from ' $MSO_PORTAL_HOSTNAME

TOKEN=$(curl -s -X POST -H 'Accept: application/json' -H 'Content-Type: application/json' --data-binary @./data/tokenPost.json http://${MSO_PORTAL_HOSTNAME}/portal/registration/token | jq -r '.accessToken')
JWT_TOKEN="Bearer ${TOKEN}"

echo ' JWT Token : ' $JWT_TOKEN

#! POST REGISTRY CURL

echo ' Populating registry on ' $MM_HOSTNAME

REGISTRY=$(curl -s -X POST -H "Authorization: ${JWT_TOKEN}" -H 'Accept: application/json' -H 'Content-Type: application/json' --data-binary @./data/registryPost.json http://${MM_HOSTNAME}/mm/v1/micronets/registry )

echo ' Registry : ' ${REGISTRY}

echo ' Populating switch config on ' $MM_HOSTNAME

#! POST SWITCH CONFIG CURL

SWITCH_CONFIG=$(curl -s -X POST -H "Authorization: ${JWT_TOKEN}" -H 'Accept: application/json' -H 'Content-Type: application/json' --data-binary @./data/odlPost.json http://${MM_HOSTNAME}/mm/v1/micronets/odl )

echo ' Switch Config : ' ${SWITCH_CONFIG}