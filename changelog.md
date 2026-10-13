## 0.6.0 - May 22, 2026

- Add `app.healthCheck` support with defaults and `env.PORT` fallback
- Run deployment health checks after start and fail deploy on unhealthy app
- Add automatic rollback to `:previous` image on health check failure
- Preserve currently running image as `:previous` before starting a new container
- Stop the running container with `docker stop` (SIGTERM, then SIGKILL after `app.docker.stopTimeout` seconds, default 10) instead of `docker rm -f` on deploy and `mup stop`; a rollback still removes the unhealthy container immediately
- Published as `@sergeant61/mup-docker-deploy` on npm

## 0.5.0 - June 26, 2024

- Support host vars

## 0.4.1 - April 20, 2022

- Update deps

## 0.4.0 - May 10, 2020

- Support private docker registries

## 0.3.0 - March 20, 2020

- Update babel config for compatibility with Meteor Up 1.5
- Fix crash when app.docker is undefined

## 0.2.0 - July 6, 2019

- Add `remote-image` app type
- Add `app.volumes` and `app.docker.imagePort` options

## 0.1.0 - April 3, 2018

- Deploy an app using a custom `Dockerfile`
