#!/bin/bash

set - x

CONTAINER_NAME=htmltopdf-nodejs

docker stop ${CONTAINER_NAME}
docker rm ${CONTAINER_NAME}
