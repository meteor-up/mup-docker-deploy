import joi from 'joi';

export const schema = joi.object().keys({
  name: joi.string().min(1).required(),
  path: joi.string().min(1),
  image: joi.string(),
  type: joi.string().required(),
  servers: joi.object().required().pattern(
    /[\s\S]*/,
    joi.object().keys(),
  ),
  env: joi.object().pattern(/[\s\S]*/, [joi.string(), joi.number(), joi.bool()]),
  docker: joi.object().keys({
    args: joi.array().items(joi.string()),
    networks: joi.array().items(joi.string()),
    imagePort: joi.number(),
  }),
  volumes: joi.object(),
});

export default function validate(config, utils) {
  let details = [];

  details = utils.combineErrorDetails(
    details,
    schema.validate(config.app, utils.VALIDATE_OPTIONS),
  );

  details = utils.combineErrorDetails(
    details,
    utils.serversExist(config.servers, config.app.servers),
  );

  return utils.addLocation(details, 'app');
}
