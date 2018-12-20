#!/usr/bin/env bash

MSO_PORTAL_HOST='nccoe-mso-api.micronets.in'
MM_HOST='nccoe-mm-api.micronets.in'

echo 'Getting Authorization token from ' $MSO_PORTAL_HOST

TOKEN=$(curl -s -X POST -H 'Accept: application/json' -H 'Content-Type: application/json' --data-binary @./data/tokenPost.json http://${MSO_PORTAL_HOST}/portal/registration/token | jq -r '.accessToken')
JWT_TOKEN="Bearer ${TOKEN}"

echo ' JWT Token : ' $JWT_TOKEN

#! DELETE REGISTRY CURL

echo ' Delete existing registry on ' $MM_HOST

REGISTRIES=$(curl -s -X DELETE -H "Authorization: ${JWT_TOKEN}" -H 'Accept: application/json' -H 'Content-Type: application/json'  http://${MM_HOST}/mm/v1/micronets/registry )


#! POST REGISTRY CURL

echo ' Populating registry on ' $MM_HOST

REGISTRY=$(curl -s -X POST -H "Authorization: ${JWT_TOKEN}" -H 'Accept: application/json' -H 'Content-Type: application/json' --data-binary @./data/registryPost.json http://${MM_HOST}/mm/v1/micronets/registry )

echo ' Registry : ' ${REGISTRY}

echo ' Populating switch config on ' $MM_HOST

#! POST SWITCH CONFIG CURL

SWITCH_CONFIG=$(curl -s -X POST -H "Authorization: ${JWT_TOKEN}" -H 'Accept: application/json' -H 'Content-Type: application/json' --data-binary @./data/odlPost.json http://${MM_HOST}/mm/v1/micronets/odl )

echo ' Switch Config : ' ${SWITCH_CONFIG}

