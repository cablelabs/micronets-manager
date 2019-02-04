DOCKER_REGISTRY := community.cablelabs.com:4567
DOCKER_IMAGE_API_PATH := micronets-docker/micronets-manager-api
DOCKER_IMAGE_CLIENT_PATH := micronets-docker/micronets-manager-client
DOCKER_IMAGE_TAG := latest
docker-compose-build:
	docker-compose build

docker-push: docker-compose push
	docker login $(DOCKER_REGISTRY)
	docker push $(DOCKER_REGISTRY)/$(DOCKER_IMAGE_API_PATH):${DOCKER_IMAGE_TAG}
	docker push $(DOCKER_REGISTRY)/$(DOCKER_IMAGE_CLIENT_PATH):${DOCKER_IMAGE_TAG}

docker-pull:
	docker pull $(DOCKER_REGISTRY)/$(DOCKER_IMAGE_API_PATH):${DOCKER_IMAGE_TAG}
	docker pull $(DOCKER_REGISTRY)/$(DOCKER_IMAGE_CLIENT_PATH):${DOCKER_IMAGE_TAG}