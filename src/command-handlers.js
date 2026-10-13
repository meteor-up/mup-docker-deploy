import { v4 } from 'uuid';
import { tmpdir } from 'os';
import { resolve } from 'path';
import { create } from 'random-seed';
import createBundle from './bundle';

function tmpBuildPath(appPath, api) {
  const rand = create(appPath);
  const uuidNumbers = [];
  for (let i = 0; i < 16; i++) {
    uuidNumbers.push(rand(255));
  }

  return api.resolvePath(
    tmpdir(),
    `mup-docker-deploy-${v4({ random: uuidNumbers })}`,
  );
}

function getImagePrefix(privateRegistry) {
  if (privateRegistry && privateRegistry.imagePrefix) {
    return `${privateRegistry.imagePrefix}/`;
  }

  return '';
}

function resolveHealthCheck(appConfig, publishedPort) {
  const healthCheck = appConfig.healthCheck || (appConfig.docker && appConfig.docker.healthCheck) || {};
  const path = healthCheck.path || '/';

  return {
    path: path.startsWith('/') ? path : `/${path}`,
    expectedStatus: healthCheck.expectedStatus || 200,
    interval: healthCheck.interval || 1,
    timeout: healthCheck.timeout || 60,
    port: healthCheck.port || publishedPort,
  };
}

// Seconds between SIGTERM and SIGKILL when a container is replaced or stopped; docker's own default when unset
function resolveStopTimeout(appConfig) {
  const stopTimeout = appConfig.docker && appConfig.docker.stopTimeout;

  return stopTimeout === undefined ? 10 : stopTimeout;
}

export function setup(api, nodemiral) {
  const config = api.getConfig().app;

  if (!config) {
    console.log('error: no configs found for docker-deploy');
    process.exit(1);
  }

  const list = nodemiral.taskList('Setup for App');

  list.executeScript('Setup Envirnment', {
    script: api.resolvePath(__dirname, 'assets/setup.sh'),
    vars: {
      name: config.name,
    },
  });

  const sessions = api.getSessions(['app']);

  return api.runTaskList(list, sessions, {
    verbose: api.verbose,
  });
}

export function bundle(api) {
  const config = api.getConfig().app;
  const tmpPath = tmpBuildPath(config.path, api);

  return createBundle(config.path, tmpPath, api);
}

export function push(api, nodemiral) {
  const config = api.getConfig().app;
  const tmpPath = tmpBuildPath(config.path, api);
  const list = nodemiral.taskList('Pushing App');

  list.copy('Pushing app bundle to the server', {
    src: resolve(tmpPath, 'bundle.tar.gz'),
    dest: `/opt/${config.name}/tmp/bundle.tar.gz`,
    progressBar: true,
  });

  const sessions = api.getSessions(['app']);

  return api.runTaskList(list, sessions, {
    series: true,
    verbose: api.verbose,
  });
}

export function build(api, nodemiral) {
  const {
    app: appConfig,
    privateDockerRegistry,
  } = api.getConfig();
  const list = nodemiral.taskList('Building Docker Image');
  const sessions = api.getSessions(['app']);

  list.executeScript('Build Image', {
    script: api.resolvePath(__dirname, 'assets/build-image.sh'),
    vars: {
      appName: appConfig.name,
      privateRegistry: privateDockerRegistry,
      imagePrefix: getImagePrefix(privateDockerRegistry),
      imageName: appConfig.name.toLowerCase(),
    },
  });

  return api.runTaskList(list, sessions, {
    series: true,
    verbose: api.verbose,
  });
}

export function reconfig(api, nodemiral) {
  const list = nodemiral.taskList('Configuring App');
  const sessions = api.getSessions(['app']);
  const {
    app: appConfig,
    privateDockerRegistry,
    servers
  } = api.getConfig();
  const { env } = appConfig;

  const publishedPort = env.PORT || 80;
  const exposedPort = (appConfig.docker && appConfig.docker.imagePort) || 3000;
  const healthCheck = resolveHealthCheck(appConfig, publishedPort);

  env.PORT = exposedPort;

  let hostVars = {};
  Object.keys(appConfig.servers).forEach(key => {
    const host = servers[key].host;
    if (appConfig.servers[key].env) {
      hostVars[host] = {
        env: {
          ...appConfig.servers[key].env,
          // We treat the PORT specially and do not pass it to the container
          PORT: exposedPort
        }
      };
    }
  });

  console.log(hostVars);

  list.copy('Sending Environment Variables', {
    src: api.resolvePath(__dirname, 'assets/env.list'),
    dest: `/opt/${appConfig.name}/config/env.list`,
    vars: {
      env: env || {},
      appName: appConfig.name,
    },
    hostVars
  });

  const localImageName = `${getImagePrefix(privateDockerRegistry)}${appConfig.name.toLowerCase()}:latest`;
  const rollbackImage = `${getImagePrefix(privateDockerRegistry)}${appConfig.name.toLowerCase()}:previous`;

  list.copy('Sending Start Script', {
    src: api.resolvePath(__dirname, 'assets/start.sh'),
    dest: `/opt/${appConfig.name}/config/start.sh`,
    vars: {
      appName: appConfig.name,
      docker: appConfig.docker || {},
      publishedPort,
      exposedPort,
      image: appConfig.type === 'remote-image' ? appConfig.image : localImageName,
      rollbackImage,
      stopTimeout: resolveStopTimeout(appConfig),
      volumes: appConfig.volumes,
      privateRegistry: privateDockerRegistry,
    },
  });

  list.copy('Sending Deploy Check Script', {
    src: api.resolvePath(__dirname, 'assets/deploy-check.sh'),
    dest: `/opt/${appConfig.name}/config/deploy-check.sh`,
    vars: {
      appName: appConfig.name,
      image: appConfig.type === 'remote-image' ? appConfig.image : localImageName,
      rollbackImage,
      path: healthCheck.path,
      expectedStatus: healthCheck.expectedStatus,
      interval: healthCheck.interval,
      timeout: healthCheck.timeout,
      port: healthCheck.port,
    },
  });

  return api.runTaskList(list, sessions, {
    series: true,
    verbose: api.verbose,
  });
}

export function start(api, nodemiral) {
  const config = api.getConfig().app;
  const sessions = api.getSessions(['app']);
  const list = nodemiral.taskList('Start App');

  list.executeScript('Start App', {
    script: api.resolvePath(__dirname, 'assets/run-start.sh'),
    vars: {
      appName: config.name,
    },
  });

  list.executeScript('Verify Deployment', {
    script: api.resolvePath(__dirname, 'assets/run-deploy-check.sh'),
    vars: {
      appName: config.name,
    },
  });

  return api.runTaskList(list, sessions, {
    series: true,
    verbose: api.verbose,
  });
}

export function stop(api, nodemiral) {
  const appConfig = api.getConfig().app;
  const sessions = api.getSessions(['app']);
  const list = nodemiral.taskList('Stop App');

  list.executeScript('Stop App', {
    script: api.resolvePath(__dirname, 'assets/stop.sh'),
    vars: {
      appName: appConfig.name,
      stopTimeout: resolveStopTimeout(appConfig),
    },
  });

  return api.runTaskList(list, sessions, { verbose: api.verbose });
}

export async function deploy(api) {
  const { type } = api.getConfig().app;

  if (type !== 'remote-image') {
    await api.runCommand('docker-deploy.bundle')
      .then(() => api.runCommand('docker-deploy.push'))
      .then(() => api.runCommand('docker-deploy.build'));
  }

  await api.runCommand('docker-deploy.reconfig');
  await api.runCommand('docker-deploy.start');
}

export function logs(api) {
  const config = api.getConfig().app;
  const args = api.getArgs();
  const sessions = api.getSessions(['app']);

  if (args[0] === 'docker-deploy') {
    args.shift();
  }

  return api.getDockerLogs(config.name, sessions, args);
}
