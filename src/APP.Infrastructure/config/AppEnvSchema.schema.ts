import * as Joi from 'joi';

export const AppEnvSchema = Joi.object({
  // Application stage (dev, qa, prod) - use this for stage-dependent logic
  APP_STAGE: Joi.string().valid('dev', 'qa', 'prod').default('dev'),

  PORT: Joi.number().default(3000),

  DATABASE_URL: Joi.string().uri().required(), // prefer URL in cloud

  // Redis Cache (optional, falls back to in-memory if not provided)
  REDIS_URL: Joi.string().uri().optional(),

  // JWT Configuration
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_ACCESS_SECRET: Joi.string().min(32).optional(),
  JWT_REFRESH_SECRET: Joi.string().min(32).optional(),
  JWT_ACCESS_TOKEN_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_TOKEN_EXPIRES_IN: Joi.string().default('7d'),

  // Password / hashing
  BCRYPT_SALT_ROUNDS: Joi.number().integer().min(8).default(12),
  PASSWORD_MIN_LENGTH: Joi.number().integer().min(6).default(8),
  PASSWORD_BLOCK_COMMON: Joi.string().valid('true', 'false').default('true'),

  // OTP settings
  OTP_LENGTH: Joi.number().integer().min(4).max(10).default(6),
  OTP_TTL_SECONDS: Joi.number().integer().min(30).default(300),
  OTP_MAX_ATTEMPTS: Joi.number().integer().min(1).default(3),
  OTP_RESEND_COOLDOWN_SECONDS: Joi.number().integer().min(10).default(60),
  OTP_DAILY_PHONE_LIMIT: Joi.number().integer().min(1).default(5),
  OTP_DAILY_IP_LIMIT: Joi.number().integer().min(1).default(20),
  REDIS_KEY_PREFIX_AUTH: Joi.string().default('auth:'),

  // Application Configuration
  AUTH_ACCOUNT_LOCKOUT_THRESHOLD: Joi.number().default(5),
  AUTH_ACCOUNT_LOCKOUT_DURATION_MINUTES: Joi.number().default(30),
  AUTH_REFRESH_TOKEN_EXPIRATION_DAYS: Joi.number().default(7),
  AUTH_PASSWORD_RESET_TOKEN_EXPIRATION_HOURS: Joi.number().default(1),
  PAGINATION_DEFAULT_PAGE_SIZE: Joi.number().default(10),
  PAGINATION_MAX_PAGE_SIZE: Joi.number().default(100),

  // Wishlist (favourite courses) configuration
  WISHLIST_PER_USER_LIMIT: Joi.number().integer().min(1).default(5),

  // API Configuration
  CORS_ENABLED: Joi.string().valid('true', 'false').default('true'),
  CORS_ORIGINS: Joi.string().default('*'),

  // Cron Job Security (required in qa/prod for Vercel Cron)
  CRON_SECRET: Joi.string()
    .min(16)
    .when('APP_STAGE', {
      is: Joi.valid('qa', 'prod'),
      then: Joi.required(),
      otherwise: Joi.optional(),
    }),

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

  // Backblaze B2 (optional; required when using Document upload)
  B2_KEY_ID: Joi.string().optional(),
  B2_APPLICATION_KEY: Joi.string().optional(),
  B2_BUCKET_NAME: Joi.string().optional(),
  B2_ENDPOINT: Joi.string().uri().optional(),
  B2_REGION: Joi.string().optional(),
});
