#!/bin/bash

#!/bin/bash

# Dockerfile local testbed
set -x

#To ease copy-paste
CONTAINER_NAME=htmltopdf-nodejs

docker build . --tag=${CONTAINER_NAME}
source ./down.bash
docker run -d --name=${CONTAINER_NAME} --hostname=${CONTAINER_NAME} -p 8080:8080 ${CONTAINER_NAME}
