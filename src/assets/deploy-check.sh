#!/bin/bash
set -e

APPNAME=<%= appName %>
APP_PATH=/opt/$APPNAME
START_SCRIPT=$APP_PATH/config/start.sh
APP_IMAGE=<%= image %>
ROLLBACK_IMAGE=<%= rollbackImage %>
DEPLOY_CHECK_PATH=<%= path %>
DEPLOY_CHECK_PORT=<%= port %>
DEPLOY_CHECK_TIMEOUT=<%= timeout %>
DEPLOY_CHECK_INTERVAL=<%= interval %>
DEPLOY_CHECK_STATUS=<%= expectedStatus %>

rollback_app () {
  if sudo docker image inspect $ROLLBACK_IMAGE >/dev/null 2>&1; then
    sudo docker tag $ROLLBACK_IMAGE $APP_IMAGE
    SKIP_PREVIOUS_TAG=1 sudo -E bash $START_SCRIPT >/dev/null 2>&1 || true
    echo "=> Redeployed previous image: $ROLLBACK_IMAGE" 1>&2
  else
    echo "=> Rollback image not found: $ROLLBACK_IMAGE" 1>&2
  fi
}

START_TIME=$(date +%s)
END_AT=$((START_TIME + DEPLOY_CHECK_TIMEOUT))

while true; do
  if [ $(date +%s) -ge "$END_AT" ]; then
    echo "=> Deploy health check timed out after ${DEPLOY_CHECK_TIMEOUT}s" 1>&2
    rollback_app
    exit 1
  fi

  STATUS_CODE=$(curl \
    --max-time 10 \
    --silent \
    --show-error \
    --output /dev/null \
    --write-out '%{http_code}' \
    "http://127.0.0.1:${DEPLOY_CHECK_PORT}${DEPLOY_CHECK_PATH}" || true)

  if [ "$STATUS_CODE" = "$DEPLOY_CHECK_STATUS" ]; then
    echo "=> Deploy health check verified (${STATUS_CODE}) at http://127.0.0.1:${DEPLOY_CHECK_PORT}${DEPLOY_CHECK_PATH}"
    exit 0
  fi

  sleep $DEPLOY_CHECK_INTERVAL
done
