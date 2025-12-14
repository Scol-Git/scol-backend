# Deploying SCOL Backend to Vercel

This guide covers deploying the SCOL Backend API to Vercel as a serverless function.

## Prerequisites

- A Vercel account (https://vercel.com)
- A Neon database (https://neon.tech)
- An Upstash Redis instance (https://upstash.com) - optional but recommended
- A Sentry project (https://sentry.io) - optional for error tracking

## Required Environment Variables

Configure these in Vercel Dashboard > Project Settings > Environment Variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Neon PostgreSQL connection string (pooled) |
| `JWT_SECRET` | Yes | Minimum 32 characters for signing JWTs |
| `NODE_ENV` | Yes | Set to `production` |
| `REDIS_URL` | No | Upstash Redis URL (rediss://...) |
| `SENTRY_DSN` | No | Sentry DSN for error tracking |
| `SENTRY_TRACES_SAMPLE_RATE` | No | Trace sample rate (default: 0.05) |

### Additional Optional Variables

See `src/APP.Infrastructure/config/AppEnvSchema.schema.ts` for all available configuration options including:

- JWT token expiration settings
- OTP configuration
- Rate limiting configuration
- Email/SMTP settings

## Recommended Configuration Values

### Neon Database

Use the **pooled connection string** from Neon Dashboard:

```
postgresql://username:password@ep-xxx-pooler.us-east-2.aws.neon.tech/dbname?sslmode=require
```

The pooler endpoint (`-pooler` suffix) is essential for serverless to avoid connection exhaustion.

### Upstash Redis

Use the **REST URL** or **rediss:// URL** from Upstash Console:

```
rediss://default:xxx@xxx.upstash.io:6379
```

The `rediss://` protocol (with double 's') enables TLS which is required by Upstash.

## Deployment Steps

### 1. Push to Git Repository

Ensure your code is pushed to GitHub, GitLab, or Bitbucket.

### 2. Import Project in Vercel

1. Go to https://vercel.com/new
2. Import your Git repository
3. Vercel will auto-detect the `vercel.json` configuration

### 3. Configure Environment Variables

1. Go to Project Settings > Environment Variables
2. Add all required variables listed above
3. Ensure variables are set for Production environment

### 4. Deploy

Click "Deploy" or push to your main branch to trigger automatic deployment.

### 5. Run Database Migrations

Migrations must be run **outside of Vercel runtime**. Options:

**Option A: Run locally against production database**
```bash
# Set DATABASE_URL to your Neon connection string
export DATABASE_URL="postgresql://..."
npm run typeorm:run
```

**Option B: Use Neon SQL Editor**
Run migration SQL directly in Neon Dashboard SQL Editor.

**Option C: Use a CI/CD step**
Add a migration step in your CI pipeline before deployment.

## Testing Your Deployment

### Verify API is Running

```bash
curl https://your-project.vercel.app/swagger
```

This should return the Swagger UI HTML.

### Test an Endpoint

```bash
curl https://your-project.vercel.app/auth/health
```

## Swagger Documentation

After deployment, access Swagger UI at:

```
https://your-project.vercel.app/swagger
```

## Important Notes

### Vercel Payload Limit

Vercel serverless functions have a **4.5MB request/response payload limit**. Large file uploads or responses will fail. Consider:

- Using signed URLs for file uploads (e.g., Cloudinary, S3)
- Paginating large responses
- Compressing response data

### Cold Starts

Serverless functions may experience cold starts (initial request latency). The codebase is configured to:

- Reuse database connections across invocations
- Cache the Nest app instance between requests
- Use minimal connection pool sizes

### Redis Fail-Open Behavior

If Redis is unavailable (no `REDIS_URL` or connection failure), the application falls back to in-memory caching. This behavior is preserved to prevent complete outages.

### Connection Limits

Database connections are limited to 2 per serverless instance to avoid exhausting Neon's connection pool:

```typescript
extra: {
  max: 2,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 10000,
}
```

## Troubleshooting

### "Too Many Connections" Error

- Ensure you're using the Neon pooler endpoint (`-pooler` suffix)
- Check if there are stuck connections in Neon Dashboard
- Reduce `extra.max` in TypeORM config if needed

### "Module not found" Errors

The build script uses `tsc-alias` to resolve TypeScript path aliases. Ensure:

```bash
npm run build
```

Completes without errors before deploying.

### Sentry Not Receiving Events

- Verify `SENTRY_DSN` is correctly set in Vercel
- Check Sentry project ingest is not paused
- Only 5xx errors and unexpected exceptions are sent (not 4xx validation errors)

## Local Development

Local development remains unchanged:

```bash
npm install
npm run start:dev
```

The local setup uses the same bootstrap code but runs `app.listen()` instead of the serverless handler.

## Architecture Overview

```
src/
  bootstrap.ts      # Shared Nest app setup (CORS, pipes, filters, Swagger)
  main.ts           # Local development entry (calls listen())

api/
  index.ts          # Vercel serverless entry (lazy init, no listen())

vercel.json         # Routes all traffic to api/index.ts
```

Both entry points share `createNestApp()` from `bootstrap.ts` to ensure consistent configuration.

