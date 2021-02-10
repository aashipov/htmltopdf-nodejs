#!/bin/bash

# Run 3 htmltopdf containers and haproxy
set -x

HTML_TO_PDF_IMAGE="aashipov/htmltopdf-nodejs"
HAPROXY_IMAGE="haproxy"
THIS_DIR=$(pwd)
NODE_NAMES=("htmltopdf-nodejs1" "htmltopdf-nodejs2" "htmltopdf-nodejs3" "htmltopdf-nodejs4" "htmltopdf-nodejs5" "htmltopdf-nodejs6" "htmltopdf-nodejs7" "htmltopdf-nodejs8" "htmltopdf-nodejs9")
HAPROXY=htmltopdf-nodejs-haproxy
NETWORK_NAME=htmltopdf-nodejs
VOLUMES_HAPROXY="-v /${THIS_DIR}/haproxy/:/usr/local/etc/haproxy/:ro"
PORTS_TO_PUBLISH_HAPROXY="-p8080:8080 -p9999:9999"

docker pull ${HTML_TO_PDF_IMAGE}
docker pull ${HAPROXY_IMAGE}
source ${THIS_DIR}/down.bash

docker network create -d bridge ${NETWORK_NAME}

for node_name in "${NODE_NAMES[@]}"
do
    docker run -d --name=${node_name} --hostname=${node_name} --net=${NETWORK_NAME} ${HTML_TO_PDF_IMAGE}
done

docker run -d --name=${HAPROXY} --hostname=${HAPROXY} --net=${NETWORK_NAME} ${PORTS_TO_PUBLISH_HAPROXY} ${VOLUMES_HAPROXY} ${HAPROXY_IMAGE}
