import * as Joi from 'joi';

export const AppEnvSchema = Joi.object({
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

  // Application Configuration
  AUTH_ACCOUNT_LOCKOUT_THRESHOLD: Joi.number().default(5),
  AUTH_ACCOUNT_LOCKOUT_DURATION_MINUTES: Joi.number().default(30),
  AUTH_REFRESH_TOKEN_EXPIRATION_DAYS: Joi.number().default(7),
  AUTH_PASSWORD_RESET_TOKEN_EXPIRATION_HOURS: Joi.number().default(1),
  PAGINATION_DEFAULT_PAGE_SIZE: Joi.number().default(10),
  PAGINATION_MAX_PAGE_SIZE: Joi.number().default(100),

  // API Configuration
  CORS_ENABLED: Joi.string().valid('true', 'false').default('true'),
  CORS_ORIGINS: Joi.string().default('*'),

  // Rate Limiting Configuration
  RATE_LIMIT_ENABLED: Joi.string().valid('true', 'false').default('false'),

  // Global rate limiting
  RATE_LIMIT_GLOBAL_LIMIT: Joi.number().integer().min(1).default(10000),
  RATE_LIMIT_GLOBAL_WINDOW_SECONDS: Joi.number().integer().min(1).default(60),

  // IP-based rate limiting (anonymous/unauthenticated users)
  RATE_LIMIT_IP_LIMIT: Joi.number().integer().min(1).default(100),
  RATE_LIMIT_IP_WINDOW_SECONDS: Joi.number().integer().min(1).default(60),

  // User-based rate limiting (authenticated users)
  RATE_LIMIT_USER_LIMIT: Joi.number().integer().min(1).default(1000),
  RATE_LIMIT_USER_WINDOW_SECONDS: Joi.number().integer().min(1).default(60),

  // Exempt users and roles (comma-separated, optional)
  RATE_LIMIT_EXEMPT_USERS: Joi.string().allow('').optional(),
  RATE_LIMIT_EXEMPT_ROLES: Joi.string().allow('').optional(),
});
