#!/bin/bash

set -e

export BACKEND=${BACKEND:-http://backend:8000}

echo "Configuring nginx with BACKEND=$BACKEND"

envsubst '${BACKEND}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf

echo "Starting nginx..."
exec nginx -g "daemon off;"