const commands = require('./commands');
const validator = require('./validate');

exports.name = 'docker-deploy';
exports.description = 'Deploy an app using a docker image';

exports.commands = commands;

const appTypes = [
  'docker-image',
  'remote-image',
];

exports.validate = {
  app(config, utils) {
    if (!config.app || !appTypes.includes(config.app.type)) {
      return [];
    }

    return validator(config, utils);
  },
};

function runIfEnabled(...commandList) {
  return function run(api) {
    if (api.getConfig().app && appTypes.includes(api.getConfig().app.type)) {
      return commandList.reduce(
        (promise, command) => promise.then(() => api.runCommand(command)),
        Promise.resolve(),
      );
    }
  };
}

exports.hooks = {
  'post.default.setup': runIfEnabled('docker-deploy.setup'),
  'post.default.deploy': runIfEnabled('docker-deploy.deploy'),
  'post.default.reconfig': runIfEnabled('docker-deploy.reconfig', 'docker-deploy.start'),
  'post.default.start': runIfEnabled('docker-deploy.start'),
  'post.default.stop': runIfEnabled('docker-deploy.stop'),
  'post.default.logs': runIfEnabled('docker-deploy.logs'),
};
