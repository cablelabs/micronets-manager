#!/usr/bin/env bash
#! The MM_HOSTNAME in the script are samples.Please change to point to respective instances.

MM_HOSTNAME='127.0.0.1:3030'

#! DELETE MICRO-NETS CURL

MICRONETS=$(curl -s -X DELETE  -H 'Accept: application/json' -H 'Content-Type: application/json'  http://${MM_HOSTNAME}/mm/v1/micronets )

echo ' Micronets : ' ${MICRONETS}