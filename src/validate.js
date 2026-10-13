import joi from 'joi';

export const schema = joi.object().keys({
  name: joi.string().min(1).required(),
  path: joi.string().min(1),
  image: joi.string(),
  type: joi.string().required(),
  servers: joi.object().required().pattern(
    /[/s/S]*/,
    joi.object().keys(),
  ),
  env: joi.object().pattern(/[/s/S]*/, [joi.string(), joi.number(), joi.bool()]).default(),
  docker: joi.object().keys({
    args: joi.array().items(joi.string()),
    networks: joi.array().items(joi.string()),
    imagePort: joi.number(),
    stopTimeout: joi.number().integer().min(0),
    healthCheck: joi.object().keys({
      path: joi.string(),
      expectedStatus: joi.number().integer().min(100).max(599),
      interval: joi.number().positive(),
      timeout: joi.number().positive(),
      port: joi.number().integer().positive(),
    }),
  }).default(),
  healthCheck: joi.object().keys({
    path: joi.string(),
    expectedStatus: joi.number().integer().min(100).max(599),
    interval: joi.number().positive(),
    timeout: joi.number().positive(),
    port: joi.number().integer().positive(),
  }),
  volumes: joi.object(),
});

export default function validate(config, utils) {
  let details = [];

  details = utils.combineErrorDetails(
    details,
    joi.validate(config.app, schema, utils.VALIDATE_OPTIONS),
  );

  details = utils.combineErrorDetails(
    details,
    utils.serversExist(config.servers, config.app.servers),
  );

  return utils.addLocation(details, 'app');
}
