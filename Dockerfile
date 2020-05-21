# NOTE: This Dockerfile is for the API only

FROM node:8-alpine
WORKDIR /usr/src/micronets-manager

# TODO: Only copy what's needed for the API
COPY . .
RUN ls -a

# The MM currently execs curl - so make sure it's installed
RUN apk add curl

ENV MONGO_URL=
RUN npm install

CMD ["node", "api/"]
