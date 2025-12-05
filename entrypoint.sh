#!/bin/bash

set -e

export BACKEND=${BACKEND:-http://backend:8000}
export BACKEND_PRO=${BACKEND_PRO:-http://omnibox-backend-pro:8000}

echo "Configuring nginx with:"
echo "  BACKEND=$BACKEND (open source module)"
echo "  BACKEND_PRO=$BACKEND_PRO (commercial module)"

envsubst '${BACKEND} ${BACKEND_PRO}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf

echo "Starting nginx..."
exec nginx -g "daemon off;"