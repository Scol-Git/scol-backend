import * as Joi from 'joi';

export const InfrastructureEnvSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().default(3000),

  DATABASE_URL: Joi.string().uri().required(), // prefer URL in cloud

  // Optional individual parts if you ever need local connection pieces:
  DB_HOST: Joi.string().optional(),
  DB_PORT: Joi.number().optional(),
  DB_USER: Joi.string().optional(),
  DB_PASS: Joi.string().optional(),
  DB_NAME: Joi.string().optional(),

  // Email Configuration (optional, defaults to console mode)
  EMAIL_PROVIDER: Joi.string().valid('console', 'smtp').default('console'),
  SMTP_HOST: Joi.string().optional(),
  SMTP_PORT: Joi.number().optional(),
  SMTP_SECURE: Joi.alternatives()
    .try(
      Joi.boolean(),
      Joi.string().valid('true', 'false', '1', '0', 'yes', 'no'),
    )
    .optional(),
  SMTP_USER: Joi.string().optional(),
  SMTP_PASS: Joi.string().optional(),
  SMTP_FROM: Joi.string().optional(),

  // RabbitMQ (optional)
  RABBITMQ_URL: Joi.string().uri().optional(),

  // Redis Cache (optional, falls back to in-memory if not provided)
  REDIS_URL: Joi.string().uri().optional(),

  // JWT Configuration
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_ACCESS_TOKEN_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_TOKEN_EXPIRES_IN: Joi.string().default('7d'),

  // Google OAuth Configuration (optional)
  GOOGLE_CLIENT_ID: Joi.string().optional(),
  GOOGLE_CLIENT_SECRET: Joi.string().optional(),
  GOOGLE_CALLBACK_URL: Joi.string().uri().optional(),
});
