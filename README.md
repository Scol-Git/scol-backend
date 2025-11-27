# SCOL Backend

A NestJS-based REST API backend built with Clean Architecture principles.

## 🚀 Quick Start

Get the project running in 5 minutes:

1. **Install dependencies**: `npm install`
2. **Choose your setup**: [All Docker](#option-1-all-services-with-docker-recommended) or [Custom Setup](#option-2-custom-setup)
3. **Setup environment**: Create `.env.local` file (see below)
4. **Run migrations**: `npm run typeorm:run`
5. **Run the app**: `npm run start:dev`

The API will be available at `http://localhost:3000` and Swagger UI at `http://localhost:3000/swagger`

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: 18.x or higher ([Download](https://nodejs.org/))
- **npm**: 9.x or higher (comes with Node.js)
- **Docker & Docker Compose** (recommended) ([Download](https://www.docker.com/))
  - OR **PostgreSQL**: 14.x or higher if not using Docker ([Download](https://www.postgresql.org/download/))

---

## 🐳 Docker Setup Options

Choose the setup that works best for you:

### Option 1: All Services with Docker (Recommended) ⭐

**Best for**: Quick setup, consistent environment, no local PostgreSQL needed

1. **Start all services**:
   ```bash
   docker-compose up -d
   ```

2. **Create `.env.local`** with Docker configuration:
   ```env
   NODE_ENV=development
   PORT=3000
   
   # Database (Docker PostgreSQL)
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/scol_db
   
   # JWT Secret (REQUIRED - must be at least 32 characters)
   JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long
   JWT_ACCESS_TOKEN_EXPIRES_IN=15m
   JWT_REFRESH_TOKEN_EXPIRES_IN=7d
   
   # Redis (Docker)
   REDIS_URL=redis://localhost:6379
   
   # RabbitMQ (Docker)
   RABBITMQ_URL=amqp://admin:admin123@localhost:5672
   
   # Email (optional)
   EMAIL_PROVIDER=console
   RATE_LIMIT_ENABLED=false
   ```

3. **Run migrations**: `npm run typeorm:run`
4. **Start app**: `npm run start:dev`

**Docker Services Started:**
- ✅ PostgreSQL on port `5432`
- ✅ Redis on port `6379`
- ✅ RabbitMQ on ports `5672` (AMQP) and `15672` (Management UI)

**Access RabbitMQ Management UI:** http://localhost:15672 (admin/admin123)

---

### Option 2: Custom Setup

**Best for**: Using existing services or specific requirements

#### A. Start Specific Services Only

```bash
# Only PostgreSQL
docker-compose up -d postgres

# Only Redis
docker-compose up -d redis

# Only RabbitMQ
docker-compose up -d rabbitmq

# PostgreSQL + Redis
docker-compose up -d postgres redis

# PostgreSQL + Redis + RabbitMQ
docker-compose up -d postgres redis rabbitmq
```

#### B. Configure `.env.local` Based on Your Setup

**If using Docker PostgreSQL:**
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/scol_db
```

**If using local PostgreSQL:**
```env
DATABASE_URL=postgresql://your-username:your-password@localhost:5432/scol_db
```

**If using Docker Redis:**
```env
REDIS_URL=redis://localhost:6379
```

**If using local Redis:**
```env
REDIS_URL=redis://localhost:6379  # Or your Redis URL
```

**If using Docker RabbitMQ:**
```env
RABBITMQ_URL=amqp://admin:admin123@localhost:5672
```

**If NOT using Redis/RabbitMQ:**
```env
# Leave these out - app will use fallbacks
# REDIS_URL=...
# RABBITMQ_URL=...
```

#### C. Complete `.env.local` Template

```env
# Node Environment
NODE_ENV=development
PORT=3000

# Database (REQUIRED)
# Docker: postgresql://postgres:postgres@localhost:5432/scol_db
# Local:  postgresql://username:password@localhost:5432/scol_db
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/scol_db

# JWT Secret (REQUIRED - must be at least 32 characters)
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long
JWT_ACCESS_TOKEN_EXPIRES_IN=15m
JWT_REFRESH_TOKEN_EXPIRES_IN=7d

# Redis (optional - falls back to in-memory if not provided)
REDIS_URL=redis://localhost:6379

# RabbitMQ (optional)
RABBITMQ_URL=amqp://admin:admin123@localhost:5672

# Email (optional - defaults to console mode)
EMAIL_PROVIDER=console  # Use 'smtp' for production
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_SECURE=false
# SMTP_USER=your-email@gmail.com
# SMTP_PASS=your-app-password
# SMTP_FROM=noreply@yourdomain.com

# Rate Limiting (optional)
RATE_LIMIT_ENABLED=false
```

**Note**: 
- If you don't provide `REDIS_URL`, the app uses in-memory cache
- If you don't provide `RABBITMQ_URL`, message sending will be skipped or logged to console
- Only `DATABASE_URL` and `JWT_SECRET` are required

---

## 🗄️ Database Setup

### If Using Docker PostgreSQL

The database is automatically created when you start the Docker container. Just run migrations:

```bash
npm run typeorm:run
```

### If Using Local PostgreSQL

1. **Create the database**:
   ```bash
   # Using psql
   psql -U postgres
   CREATE DATABASE scol_db;
   \q
   
   # Or using createdb command
   createdb -U postgres scol_db
   ```

2. **Run migrations**:

Run database migrations to create all tables:

```bash
npm run typeorm:run
```

This will:
- Connect to your database using `DATABASE_URL`
- Run all pending migrations from the `migrations/` folder
- Create all necessary tables and schema

**If you need to revert a migration:**

```bash
npm run typeorm:revert
```

**If you need to generate a new migration:**

```bash
npm run typeorm:gen -- migrations/YourMigrationName
```

---

## 🐳 Docker Commands Reference

### Start Services

```bash
# Start all services (PostgreSQL, Redis, RabbitMQ)
docker-compose up -d

# Start specific services only
docker-compose up -d postgres        # Only PostgreSQL
docker-compose up -d redis           # Only Redis
docker-compose up -d rabbitmq       # Only RabbitMQ
docker-compose up -d postgres redis  # PostgreSQL + Redis
```

### Manage Services

```bash
# Check service status
docker-compose ps

# View logs for all services
docker-compose logs -f

# View logs for specific service
docker-compose logs -f postgres
docker-compose logs -f redis
docker-compose logs -f rabbitmq

# Stop all services
docker-compose down

# Stop and remove volumes (⚠️ deletes data)
docker-compose down -v
```

### Service Ports

- **PostgreSQL**: `5432`
- **Redis**: `6379`
- **RabbitMQ AMQP**: `5672`
- **RabbitMQ Management UI**: `15672` (http://localhost:15672 - admin/admin123)

---

## 🏃 Running the Project

### Option 1: Development Mode (Recommended)

Run with hot-reload (automatically restarts on file changes):

```bash
npm run start:dev
```

The server will start on `http://localhost:3000` (or the port specified in `PORT`).

### Option 2: Production Mode

Build and run the production version:

```bash
# Build the project
npm run build

# Run production server
npm run start:prod
```

### Option 3: Standard Start

Run without watch mode:

```bash
npm start
```

---

## ✅ Verify Installation

### 1. Check Server Status

Visit the health check endpoint:

```bash
curl http://localhost:3000/health
```

Or open in browser: http://localhost:3000/health

### 2. Access Swagger UI

Open the interactive API documentation:

http://localhost:3000/swagger

Here you can:
- View all available endpoints
- Test API endpoints directly
- See request/response schemas

### 3. Test Database Connection

The health check endpoint will show database status. If migrations ran successfully, you should see database tables created.

---

## 📝 Common Commands

```bash
# Install dependencies
npm install

# Development (with hot-reload)
npm run start:dev

# Build for production
npm run build

# Run production build
npm run start:prod

# Run tests
npm run test

# Run tests in watch mode
npm run test:watch

# Database migrations
npm run typeorm:run      # Run migrations
npm run typeorm:revert    # Revert last migration
npm run typeorm:gen       # Generate new migration

# Docker services
docker-compose up -d              # Start all services
docker-compose up -d postgres     # Start specific service
docker-compose down               # Stop all services
docker-compose ps                 # Check service status
docker-compose logs -f            # View logs for all services
docker-compose logs -f postgres   # View logs for specific service
```

---

## 🔧 Troubleshooting

### Database Connection Issues

**Problem**: `Connection refused` or `Connection timeout`

**Solutions**:

**If using Docker PostgreSQL:**
1. Check if container is running: `docker-compose ps postgres`
2. Check container logs: `docker-compose logs postgres`
3. Verify `DATABASE_URL` in `.env.local` matches Docker config:
   ```env
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/scol_db
   ```
4. Wait a few seconds after starting - PostgreSQL needs time to initialize

**If using local PostgreSQL:**
1. Verify PostgreSQL is running: `pg_isready` or `psql -U postgres`
2. Check `DATABASE_URL` in `.env.local` is correct
3. Ensure database exists: `psql -U postgres -l` (list databases)
4. Check firewall/network settings

### Migration Errors

**Problem**: `Migration failed` or `Entity metadata not found`

**Solutions**:
1. Ensure all entities are imported in `DbContext.datasource.ts`
2. Check database connection is working
3. Try reverting and re-running: `npm run typeorm:revert && npm run typeorm:run`

### Port Already in Use

**Problem**: `Port 3000 is already in use`

**Solutions**:
1. Change `PORT` in `.env.local` to a different port (e.g., `3001`)
2. Or stop the process using port 3000

### Redis/RabbitMQ Connection Issues

**Problem**: Cannot connect to Redis or RabbitMQ

**Solutions**:
1. Ensure Docker services are running: `docker-compose ps`
2. Check service logs: `docker-compose logs redis` or `docker-compose logs rabbitmq`
3. Verify URLs in `.env.local` match Docker ports
4. **Note**: Application will work without these services (uses fallbacks)

### JWT Secret Too Short

**Problem**: `JWT_SECRET must be at least 32 characters`

**Solutions**:
1. Generate a secure random string (at least 32 characters)
2. Update `JWT_SECRET` in `.env.local`

---

## 🆘 Need Help?

- **Documentation**: See [DEV.GUIDE.md](./DEV.GUIDE.md) for detailed guides
- **Issues**: Create an issue in the repository
- **Questions**: Contact the development team

---

## 📄 License

UNLICENSED - Private project
