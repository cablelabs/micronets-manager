#!/usr/bin/env bash

MM_HOSTNAME='nccoe-mm-api.micronets.in'

#! DELETE MICRONETS CURL

MICRONETS=$(curl -s -X DELETE  -H 'Accept: application/json' -H 'Content-Type: application/json'  http://${MM_HOSTNAME}/mm/v1/micronets )

echo ' Micronets : ' ${MICRONETS}