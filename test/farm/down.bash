#!/bin/bash

set -x

NODE_NAMES=("htmltopdf-nodejs1" "htmltopdf-nodejs2" "htmltopdf-nodejs3" "htmltopdf-nodejs4" "htmltopdf-nodejs5" "htmltopdf-nodejs6" "htmltopdf-nodejs7" "htmltopdf-nodejs8" "htmltopdf-nodejs9")

HAPROXY=htmltopdf-nodejs-haproxy
NETWORK_NAME=htmltopdf-nodejs

docker stop ${HAPROXY}
docker rm ${HAPROXY}

for node_name in "${NODE_NAMES[@]}"
do
    docker stop ${node_name}
    docker rm ${node_name}
done

docker network rm ${NETWORK_NAME}
