#!/usr/bin/env bash
source env.sh; rm -rf docker-compose.yml; envsubst < "micronets-template.yml" > "docker-compose.yml";
docker-compose --verbose up --build --force-recreate