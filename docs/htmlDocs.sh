#!/usr/bin/env bash
#! Script file to generate HTML docs from swagger docs.See [here](https://github.com/yousan/swagger-yaml-to-html)

#! Delete existing html docs
rm -rf ./html/MM_API.html

#! Regenerate HTML docs
docker run -i yousan/swagger-yaml-to-html < ./swagger/MM_Open_api_3.0.yaml > ./html/MM_API.html
