#!/usr/bin/env bash 
set -m
/usr/local/bin/docker-entrypoint.sh echo "Bootstrapping application"

function setupGCS() 
{
    mkdir -p /tmp/gcs ${GHOST_CONTENT}/adapters/storage/gcs && \
    wget -O - "$(npm view @danmasta/ghost-gcs-adapter@0.0.3 dist.tarball)" | tar xz -C /tmp/gcs && \
    npm install --prefix /tmp/gcs/package --silent --only=production --no-optional --no-progress && \
    mv /tmp/gcs/package/* ${GHOST_CONTENT}/adapters/storage/gcs

}

function waitForService() 
{
    status=1
    while [[ $status -ne "0" ]]; do
            nc -vz data_volume 2368 >& /dev/null  || echo "Port not open"
            status=$?
            echo "waiting for port, sleeping for 10 seconds"
            sleep 10
    done
}



setupGCS

/usr/local/bin/docker-entrypoint.sh node current/index.js 
