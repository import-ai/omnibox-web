#!/bin/bash

set -e

export BACKEND_OSS=${BACKEND_OSS:-http://backend:8000}
export BACKEND_PRO=${BACKEND_PRO:-http://backend-pro:8001}

echo "Configuring nginx with:"
echo "  BACKEND_OSS=$BACKEND_OSS (open source module)"
echo "  BACKEND_PRO=$BACKEND_PRO (commercial module)"

envsubst '${BACKEND_OSS} ${BACKEND_PRO}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf

echo "Starting nginx..."
exec nginx -g "daemon off;"