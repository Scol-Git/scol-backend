import * as Joi from 'joi';

const jwtExpiry = Joi.string().pattern(/^\d+[smhd]$/i);

export const AppEnvSchema = Joi.object({
  // Application stage (dev, qa, prod) - use this for stage-dependent logic
  APP_STAGE: Joi.string().valid('dev', 'qa', 'prod').default('dev'),

  PORT: Joi.number().default(3000),

  DATABASE_URL: Joi.string().uri().required(),

  // Redis Cache
  REDIS_URL: Joi.string().uri().optional(),

  // Trusted proxy hops for req.ip (0 = off, 1 = behind one proxy)
  TRUST_PROXY_HOPS: Joi.number().integer().min(0).default(0),

  // JWT Configuration
  JWT_SECRET: Joi.string().min(32).optional(),
  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_OTP_SECRET: Joi.string().min(32).required(),
  JWT_ISSUER: Joi.string().min(1).required(),
  JWT_ACCESS_TOKEN_EXPIRES_IN: jwtExpiry.default('10m'),
  JWT_REFRESH_TOKEN_EXPIRES_IN: jwtExpiry.default('7d'),
  AUTH_SESSION_ABSOLUTE_MAX: jwtExpiry.default('30d'),

  // Password / hashing
  BCRYPT_SALT_ROUNDS: Joi.number().integer().min(8).default(12),
  PASSWORD_MIN_LENGTH: Joi.number().integer().min(6).default(8),
  PASSWORD_BLOCK_COMMON: Joi.string().valid('true', 'false').default('true'),

  // OTP settings
  OTP_LENGTH: Joi.number().integer().min(4).max(10).default(6),
  OTP_TTL_SECONDS: Joi.number().integer().min(30).default(300),
  OTP_MAX_ATTEMPTS: Joi.number().integer().min(1).default(3),
  OTP_RESEND_COOLDOWN_SECONDS: Joi.number().integer().min(10).default(60),
  OTP_MAX_RESEND_PER_SESSION: Joi.number().integer().min(1).default(2),
  OTP_DAILY_PHONE_LIMIT: Joi.number().integer().min(1).default(5),
  OTP_DAILY_IP_LIMIT: Joi.number().integer().min(1).default(20),
  REDIS_KEY_PREFIX_AUTH: Joi.string().default('auth:'),

  // Application Configuration
  AUTH_ACCOUNT_LOCKOUT_THRESHOLD: Joi.number().default(5),
  AUTH_ACCOUNT_LOCKOUT_DURATION_MINUTES: Joi.number().default(30),
  AUTH_FAILED_ATTEMPT_DECAY_HOURS: Joi.number().integer().min(1).default(24),
  AUTH_USER_SESSION_RETENTION_DAYS: Joi.number().integer().min(1).default(30),
  PAGINATION_DEFAULT_PAGE_SIZE: Joi.number().default(10),
  PAGINATION_MAX_PAGE_SIZE: Joi.number().default(100),

  // API Configuration
  CORS_ENABLED: Joi.string().valid('true', 'false').default('true'),
  CORS_ORIGINS: Joi.string().default('*'),

  // Cron Jobs (APP.JOB)
  JOBS_ENABLED: Joi.string().valid('true', 'false').default('false'),
  OTP_SESSION_CLEANUP_CRON: Joi.string().optional(),
  OTP_SESSION_CLEANUP_ENABLED: Joi.string()
    .valid('true', 'false')
    .default('true'),
  DB_PING_CRON: Joi.string().optional(),
  DB_PING_ENABLED: Joi.string().valid('true', 'false').default('true'),
  USER_SESSION_CLEANUP_CRON: Joi.string().optional(),
  USER_SESSION_CLEANUP_ENABLED: Joi.string()
    .valid('true', 'false')
    .default('true'),
  ACCOUNT_LOCKOUT_MAINTENANCE_CRON: Joi.string().optional(),
  ACCOUNT_LOCKOUT_MAINTENANCE_ENABLED: Joi.string()
    .valid('true', 'false')
    .default('true'),

  // Rate Limiting Configuration
  RATE_LIMIT_ENABLED: Joi.string().valid('true', 'false').default('true'),

  RATE_LIMIT_GLOBAL_LIMIT: Joi.number().integer().min(1).default(10000),
  RATE_LIMIT_GLOBAL_WINDOW_SECONDS: Joi.number().integer().min(1).default(60),

  RATE_LIMIT_IP_LIMIT: Joi.number().integer().min(1).default(100),
  RATE_LIMIT_IP_WINDOW_SECONDS: Joi.number().integer().min(1).default(60),

  RATE_LIMIT_USER_LIMIT: Joi.number().integer().min(1).default(1000),
  RATE_LIMIT_USER_WINDOW_SECONDS: Joi.number().integer().min(1).default(60),

  RATE_LIMIT_EXEMPT_USERS: Joi.string().allow('').optional(),
  RATE_LIMIT_EXEMPT_ROLES: Joi.string().allow('').optional(),

  // Backblaze B2
  B2_KEY_ID: Joi.string().optional(),
  B2_APPLICATION_KEY: Joi.string().optional(),
  B2_BUCKET_NAME: Joi.string().optional(),
  B2_ENDPOINT: Joi.string().uri().optional(),
  B2_REGION: Joi.string().optional(),

  STORAGE_UPLOAD_URL_EXPIRES_SECONDS: Joi.number()
    .integer()
    .min(60)
    .default(900),
  STORAGE_DOWNLOAD_URL_EXPIRES_SECONDS: Joi.number()
    .integer()
    .min(60)
    .default(3600),
});
