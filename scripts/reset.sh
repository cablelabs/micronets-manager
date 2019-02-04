#!/usr/bin/env bash

MM_HOSTNAME='127.0.0.1:3030'

#! DELETE MICRONETS CURL

MICRONETS=$(curl -s -X DELETE  -H 'Accept: application/json' -H 'Content-Type: application/json'  http://${MM_HOSTNAME}/mm/v1/micronets )

echo ' Micronets : ' ${MICRONETS}