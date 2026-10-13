# @sergeant61/mup-docker-deploy

Deploy using a custom `Dockerfile`.

Fork of [meteor-up/mup-docker-deploy](https://github.com/meteor-up/mup-docker-deploy) with deployment health checks and automatic rollback. The upstream package on npm is [`mup-docker-deploy`](https://www.npmjs.com/package/mup-docker-deploy).

## Getting started

Before starting, you should have a `Dockerfile` in your app's directory.

First, install mup and this plugin with:

```bash
npm i -g mup @sergeant61/mup-docker-deploy
```

In `mup.js`, add the plugin:

```js
module.exports = {
  plugins: ['@sergeant61/mup-docker-deploy'],
  // ...
};
```

Second, create a config with:
```bash
mup init
```

Open the config, and make the following adjustments:

For each server:
- host - Usually is the IP Address of the server
- server authentication - You can use a password or set pem to the path to a private key. If neither are set, it uses ssh-agent

In the `app` section:

- name: A unique name, with no spaces
- path: Path to the app, relative to the config.
- type: Set to `docker-image` to let mup know that this plugin will manage the app

Third, setup the server. Mup will install everything needed to run the app. Run:

```bash
mup setup
```

Fourth, deploy the app. Run

```bash
mup deploy
```

Mup will upload your app, build the docker image, and run it.

## Health check and rollback

You can configure a deployment health check with `app.healthCheck`.
If the health check fails or times out, the plugin will fail deployment
and try to roll back to the previous image tag.

```js
module.exports = {
  app: {
    // ...
    healthCheck: {
      path: '/',
      expectedStatus: 200,
      interval: 1,
      timeout: 60,
      // Optional. If omitted, env.PORT is used.
      port: 3000
    }
  }
}
```

Defaults:
- `path`: `/`
- `expectedStatus`: `200`
- `interval`: `1` second
- `timeout`: `60` seconds
- `port`: `app.env.PORT`

Notes:
- `app.healthCheck` is preferred. `app.docker.healthCheck` is also supported for compatibility.
- Rollback requires a `:previous` image tag to exist locally on the server.

## Graceful stop

On deploy, `mup restart` and `mup stop`, the running container is stopped with
`docker stop`: it receives SIGTERM and is killed after `app.docker.stopTimeout`
seconds (default 10, docker's own default). The container is also started with
`--stop-timeout` set to the same value, so a docker daemon restart or a host
reboot gives the app the same grace period. Give the app enough time to finish
in-flight requests and jobs when it handles SIGTERM:

```js
module.exports = {
  app: {
    // ...
    docker: {
      imagePort: 3000,
      stopTimeout: 60
    }
  }
}
```

A rollback after a failed health check removes the unhealthy container
immediately, since it never served traffic.
