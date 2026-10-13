#!/bin/bash
set -e
set -x

APPNAME=<%= appName %>
APP_PATH=/opt/$APPNAME
ENV_FILE=$APP_PATH/config/env.list
APP_IMAGE=<%= image %>
ROLLBACK_IMAGE=<%= rollbackImage %>
BIND="0.0.0.0"
PUBLISHED_PORT=<%= publishedPort %>
EXPOSED_PORT=<%= exposedPort %>
STOP_TIMEOUT=<%= stopTimeout %>

if [ "${SKIP_PREVIOUS_TAG:-0}" != "1" ]; then
  CURRENT_IMAGE_ID=$(sudo docker container inspect $APPNAME --format '{{.Image}}' 2>/dev/null || true)
  if [ -n "$CURRENT_IMAGE_ID" ]; then
    sudo docker tag $CURRENT_IMAGE_ID $ROLLBACK_IMAGE || true
  fi

  # SIGTERM first so the app can finish what it is doing; SIGKILL after STOP_TIMEOUT seconds
  sudo docker stop -t $STOP_TIMEOUT $APPNAME || true
  sudo docker rm $APPNAME || true
else
  # Rolling back: the container being replaced never became healthy, so there is nothing to wait for
  sudo docker rm -f $APPNAME || true
fi
sudo docker network disconnect bridge -f $APPNAME || true

sudo docker run \
  -d \
  --restart=always \
  --stop-timeout=$STOP_TIMEOUT \
  --publish=$BIND:$PUBLISHED_PORT:$EXPOSED_PORT \
  --hostname="$HOSTNAME-$APPNAME" \
  --env-file=$ENV_FILE \
  --name=$APPNAME \
  <% for(var args in docker.args) { %> <%- docker.args[args] %> <% } %> \
  <% for(var volume in volumes) { %>-v <%= volume %>:<%= volumes[volume] %> <% } %> \
  $APP_IMAGE

echo "Started app's container"

<% for(var network in docker.networks) { %>
  sudo docker network connect <%=  docker.networks[network] %> $APPNAME
<% } %>

# When using a private docker registry, the cleanup run when 
# building the image is only done on one server, so we also
# cleanup here so the other servers don't run out of disk space
<% if (privateRegistry) { %>
  echo "pruning images"
  sudo docker image prune -f || true
<% } %>
