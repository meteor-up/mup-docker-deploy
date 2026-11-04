const handlers = require('./command-handlers');

exports.setup = {
  description: 'Prepare server to run the app',
  handler: handlers.setup,
};

exports.deploy = {
  description: 'Deploy app',
  handler: handlers.deploy,
};

exports.build = {
  description: 'Build the docker image',
  handler: handlers.build,
};

exports.reconfig = {
  description: 'Reconfig the app',
  handler: handlers.reconfig,
};

exports.start = {
  description: 'Start the app',
  handler: handlers.start,
};

exports.stop = {
  description: 'Stop the app',
  handler: handlers.stop,
};

exports.logs = {
  description: 'View the app\'s logs',
  builder(yargs) {
    return yargs
      // Since any docker log option is allowed, disable validating options
      .strict(false)
      .option('tail', {
        description: 'Number of lines to show from the end of the logs',
        alias: 't',
        number: true,
      })
      .option('follow', {
        description: 'Follow log output',
        alias: 'f',
        boolean: true,
      });
  },
  handler: handlers.logs,
};

// Hidden commands

exports.bundle = {
  description: false,
  handler: handlers.bundle,
};

exports.push = {
  description: false,
  handler: handlers.push,
};
