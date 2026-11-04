# mup-docker-deploy

Deploy using a custom `Dockerfile`.

This plugin is under development and is missing some features

## Getting started

Before starting, you should have a `Dockerfile` in your app's directory.

First, install mup and mup-docker-deploy with:

```bash
npm i -g mup mup-docker-deploy
```

Second, create a config with:

```bash
mup init
```

Open the config (`mup.js`), and make the following adjustments:

For each server:

- host - Usually is the Public IP Address of the server
- server authentication - You can use a password or set pem to the path to a private key. If neither are set, it uses ssh-agent

Remember to enable this plugin by adding this line

```
  plugins: ["mup-docker-deploy"],
```

In the `app` section:

- name: A unique name, with no spaces
- path: Path to the app, relative to the config. `'./'` will do for a docker image.
- type: Set to `docker-image` to let mup know that this plugin will manage the app

## Ports

The nginx reverse proxy will listen on ports 80 and 443 for you, and direct traffic to your docker image, which should use a different port.

To do this, you'll need to do a few things. Let's assume you are going to use port 3000

In the `app` section

```
  docker: { imagePort: 3000 },
  env: {PORT: 3000}, // This may generate a warning from MUP, you can ignore it.
```

and in your `Dockerfile`, you will need to add a line

```
EXPOSE 3000
```

You may also need to adjust some settings in your docker files to make it listen on port 3000. You should remove anything that attempts to listen on port 443.

Thirdly, setup the server. Mup will install everything needed to run the app. Run:

```bash
mup setup
```

Fourth, deploy the app. Run

```bash
mup deploy
```

Mup will upload your app, build the docker image, and run it.

> TODO: Describe how `type: 'remote-image` works. (This appears to be the incomplete part)

## Sample mup.js file for shared environment

```
module.exports = {
  servers: {
    one: {
      host: "1.2.3.4",
      username: "ubuntu",
// authenticate from ssh-agent
    },
  },
  plugins: ["mup-docker-deploy"],
  app: {
    // TODO: change app name and path
    name: "sample",
    path: "./",
    type: "docker-image",
    servers: {
      one: {},
    },
    docker: { imagePort: 3000 },
    env: {
      // TODO: Change to your app's url
      // If you are using ssl, it needs to start with https://
      ROOT_URL: "https://my-app.com",
      PORT: 3000,
    },
  },

  // (Optional)
  // Use the proxy to setup ssl or to route requests to the correct
  // app when there are several apps

  proxy: {
    domains: "my-app.com",

    ssl: {
      // Enable Let's Encrypt
      letsEncryptEmail: "my@email.me",
      forceSSL: true,
    },
  },
};

```

You need to change

- host
- username
- app.name
- app.env.ROOT_URL
- proxy.domains
- proxy.ssl.letsEncrptEmail
