import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').required(),
  PORT: Joi.number().default(3000),

  // Either DATABASE_URL or individual parts
  DATABASE_URL: Joi.string().uri().optional(),

  DB_HOST: Joi.string().default('localhost'),
  DB_PORT: Joi.number().default(5432),
  DB_USER: Joi.string().default('postgres'),
  DB_PASS: Joi.string().default('postgres'),
  DB_NAME: Joi.string().default('worktrack'),

  REDIS_URL: Joi.string().uri().required(),
  RABBITMQ_URL: Joi.string().uri().required(),

  JWT_SECRET: Joi.string().min(16).required(),

  LOG_SHIPPER: Joi.string().valid('LOGTAIL', 'AXIOM').optional(),
  LOGTAIL_TOKEN: Joi.string().allow('').optional(),
  AXIOM_TOKEN: Joi.string().allow('').optional(),
});
