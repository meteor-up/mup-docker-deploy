#!/bin/bash

APPNAME=<%= appName %>
STOP_TIMEOUT=<%= stopTimeout %>

sudo docker stop -t $STOP_TIMEOUT $APPNAME || true
sudo docker rm $APPNAME || true
sudo docker network disconnect bridge -f $APPNAME || true
