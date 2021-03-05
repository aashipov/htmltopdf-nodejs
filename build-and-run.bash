#!/bin/bash

set -x

#To ease copy-paste
IMAGE="aashipov/htmltopdf-nodejs"
CONTAINER_NAME=htmltopdf-dev
TOP_COMMIT=$(git log --pretty=format:'%h' -n 1)
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

docker build --file=Dockerfile --tag=${IMAGE}:latest --tag=${IMAGE}:${TOP_COMMIT} --tag=${IMAGE}:${CURRENT_BRANCH} .
source ./down.bash
docker run -d --name=${CONTAINER_NAME} --hostname=${CONTAINER_NAME} -p 8080:8080 ${IMAGE}:${TOP_COMMIT}
# Push VCS commit sha as docker hub tag to bypass nexus bug
docker push ${IMAGE}:latest
docker push ${IMAGE}:${TOP_COMMIT}
docker push ${IMAGE}:${CURRENT_BRANCH}
