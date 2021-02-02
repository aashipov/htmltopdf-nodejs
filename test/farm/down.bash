#!/bin/bash

set -x

NODE_1=htmltopdf-nodejs1
NODE_2=htmltopdf-nodejs2
NODE_3=htmltopdf-nodejs3
HAPROXY=htmltopdf-nodejs-haproxy
NETWORK_NAME=htmltopdf-nodejs

docker stop ${HAPROXY} ${NODE_1} ${NODE_2} ${NODE_3} ; docker rm ${HAPROXY} ${NODE_1} ${NODE_2} ${NODE_3} ; docker network rm ${NETWORK_NAME}
