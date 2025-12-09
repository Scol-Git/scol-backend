# SCOL Backend - Developer Documentation

Complete developer guide for the SCOL Backend NestJS application. This documentation covers project structure, architecture, setup, and best practices for onboarding new developers.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Clean Architecture Workflow](#2-clean-architecture-workflow)
3. [Environment Setup](#3-environment-setup)
4. [Docker Setup](#4-docker-setup)
5. [Database & Migrations](#5-database--migrations)
6. [Running the Project](#6-running-the-project)
7. [Guards, Interceptors, Filters, Pipes](#7-guards-interceptors-filters-pipes)
8. [API Documentation (Swagger)](#8-api-documentation-swagger)
9. [Services & Business Logic](#9-services--business-logic)
10. [Caching & Rate Limiting](#10-caching--rate-limiting)
11. [Logging](#11-logging)
12. [Security](#12-security)
13. [Messaging](#13-messaging)
14. [Contribution Guide](#14-contribution-guide)
15. [Testing](#15-testing)
16. [Troubleshooting](#16-troubleshooting)

---

## 1. Project Overview

### Purpose

SCOL Backend is a RESTful API built with NestJS, following Clean Architecture principles. It provides a robust, scalable backend for managing organizations, users, projects, todos, and related business operations.

### Tech Stack

- **Framework**: NestJS 11.0.1
- **Language**: TypeScript 5.7.3
- **Database**: PostgreSQL (via TypeORM 0.3.27)
- **Cache**: Redis (ioredis 5.8.2)
- **Message Queue**: RabbitMQ (amqplib 0.10.9)
- **Authentication**: JWT (jsonwebtoken 9.0.2)
- **Logging**: Pino (nestjs-pino 4.4.1)
- **API Documentation**: Swagger/OpenAPI (@nestjs/swagger 11.2.1)
- **Mapping**: AutoMapper (@automapper/core 8.8.1)
- **Validation**: class-validator 0.14.2

### Clean Architecture Layers

The project follows Clean Architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                    APP.API (Presentation)                   │
│  Controllers, Guards, Interceptors, Filters, Middleware     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   APP.BLL (Application)                     │
│              Services, Use Cases, Business Logic            │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  APP.Entity (Domain)                        │
│         Entities, Domain Events, Business Rules             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              APP.Infrastructure (Infrastructure)            │
│  Database, Cache, Security, Messaging, Logging, Config      │
└─────────────────────────────────────────────────────────────┘
                            ↑
┌─────────────────────────────────────────────────────────────┐
│                   APP.Shared (Shared)                       │
│      DTOs, Interfaces, Enums, Exceptions, Utilities         │
└─────────────────────────────────────────────────────────────┘
```

#### Layer Descriptions

1. **APP.API (Presentation Layer)**
   - REST API endpoints
   - Request/response handling
   - Authentication & authorization guards
   - Input validation
   - Error handling

2. **APP.BLL (Application/Business Logic Layer)**
   - Business logic and use cases
   - Service implementations
   - Application services
   - DTO mapping

3. **APP.Entity (Domain Layer)**
   - Domain entities
   - Domain events
   - Business rules
   - Value objects

4. **APP.Infrastructure (Infrastructure Layer)**
   - Database access (TypeORM)
   - External service integrations
   - Caching (Redis)
   - Message queue (RabbitMQ)
   - Security services (JWT, password hashing)
   - Logging (Pino)

5. **APP.Shared (Shared Layer)**
   - DTOs (Data Transfer Objects)
   - Interfaces/Contracts
   - Enums
   - Custom exceptions
   - Shared utilities
   - Context accessors

### Complete Folder Structure

```
src/
├── APP.API/                         # Presentation Layer
│   ├── common/
│   │   ├── decorators/              # Custom decorators (@CurrentUser, @RequireRole, etc.)
│   │   ├── filters/                 # Exception filters
│   │   ├── guards/                  # Authentication & authorization guards
│   │   ├── interceptors/            # Request/response interceptors
│   │   └── middleware/              # Request middleware
│   └── feature-controllers/         # Feature-based controllers
│       ├── auth/
│       ├── health-check/
│       ├── notifications/
│       └── organizations/
│
├── APP.BLL/                          # Application Layer
│   ├── core/                         # Base classes (BaseService)
│   ├── mappings/                     # AutoMapper configurations
│   └── services/                     # Application services
│
├── APP.Entity/                        # Domain Layer
│   ├── domain.events/                # Domain events
│   └── entities/                     # Domain entities
│
├── APP.Infrastructure/                # Infrastructure Layer
│   ├── cache/                        # Redis caching
│   ├── config/                       # Configuration management
│   ├── db/                           # Database (TypeORM)
│   ├── logging/                      # Pino logger
│   ├── messaging/                    # RabbitMQ, Email
│   ├── rate-limiting/                # Rate limiting storage
│   └── security/                    # JWT, password hashing
│
├── APP.Shared/                        # Shared Layer
│   ├── constants/                    # Application constants
│   ├── context/                      # UserContextAccessor
│   ├── dtos/                         # Data Transfer Objects
│   ├── enums/                        # Enumerations
│   ├── exceptions/                  # Custom exceptions
│   ├── helpers/                      # Utility functions
│   ├── interfaces/                   # TypeScript interfaces
│   ├── mappers/                      # Manual mappers
│   ├── models/                       # Shared models
│   └── tokens/                       # Dependency injection tokens
│
├── AppModule.module.ts               # Root application module
└── main.ts                           # Application entry point
```

### Naming Conventions

- **Folders**: PascalCase (e.g., `APP.API`, `APP.BLL`)
- **Files**: kebab-case with descriptive suffix
  - Modules: `*.module.ts` (e.g., `AuthModule.module.ts`)
  - Services: `*.service.ts` (e.g., `AuthService.service.ts`)
  - Controllers: `*.controller.ts` (e.g., `AuthController.controller.ts`)
  - Entities: `*.entity.ts` (e.g., `User.entity.ts`)
  - DTOs: `*.dto.ts` (e.g., `LoginRequestDto.dto.ts`)
  - Guards: `*.guard.ts` (e.g., `JwtAuthGuard.guard.ts`)
  - Interceptors: `*.interceptor.ts` (e.g., `UserContextInterceptor.interceptor.ts`)
  - Filters: `*.filter.ts` (e.g., `HttpExceptionFilter.filter.ts`)
  - Mappers: `*.mapper.ts` (e.g., `OrganizationMapper.mapper.ts`)

### Interface-Based Dependency Injection

The project follows a .NET-style approach of programming to interfaces, not implementations:

- Services implement interfaces (e.g., `IOrganizationService`)
- Dependencies are injected via interface tokens
- Infrastructure implementations are abstracted behind interfaces
- This enables easy testing and swapping implementations

---

## 2. Clean Architecture Workflow

### Request Lifecycle (Complete Flow)

Understanding how a request flows through the application is crucial for development. Here's the complete execution order:

```
HTTP Request
    ↓
┌─────────────────────────────────────────────────────────────┐
│ 1. MIDDLEWARE (runs first)                                  │
│    - RequestLoggingMiddleware                               │
│    - Logs incoming request                                  │
│    - Sets correlation ID                                    │
└─────────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. GUARDS (run after middleware)                            │
│    - JwtAuthGuard: Validates JWT token, sets req.user       │
│    - RoleGuard: Checks user roles                           │  
|                             (if @RequireRole used)          │
│    - PermissionGuard: Checks permissions                    │
|                             (if @RequirePermission used)    │
│    - RateLimitGuard: Enforces rate limits (if enabled)      │
└─────────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. INTERCEPTORS (run after guards)                          │
│    - UserContextInterceptor: Sets AsyncLocalStorage context │
│    - Other interceptors (if any)                            │
└─────────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. PIPES (run after interceptors)                           │
│    - ValidationPipe: Validates and transforms DTOs          │
│    - Custom pipes (if any)                                  │
└─────────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. CONTROLLER                                               │
│    - Receives validated DTO                                 │
│    - Can access user via @CurrentUser() or                  │
│      UserContextAccessor.userContext                        │
│    - Calls service method                                   │
└─────────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. SERVICE (Application Layer)                              │
│    - Implements business logic                              │
│    - Uses UserContextAccessor.userContext (no req access)   │
│    - Uses DbContext via @InjectDataSource()                 │
│    - Uses IMapper for DTO mapping                           │
│    - Uses ILogger for logging                               │
└─────────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────────┐
│ 7. REPOSITORY (via DbContext)                               │
│    - Direct TypeORM repository access                       │
│    - No repository abstraction layer                        │
│    - Uses UserContextAccessor for filtering by orgId        │
└─────────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────────┐
│ 8. DATABASE                                                 │
│    - PostgreSQL                                             │
│    - Returns entity data                                    │
└─────────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────────┐
│ 9. RESPONSE FLOW (back up the chain)                        │
│    - Entity → Service (maps to DTO)                         │
│    - DTO → Controller                                       │
│    - Controller → Interceptor (if response transformation)  │
│    - Interceptor → HTTP Response                            │
└─────────────────────────────────────────────────────────────┘
```

### Detailed Guard Execution

Guards execute in the order they are specified in `@UseGuards()`:

```typescript
@Get('example')
@UseGuards(JwtAuthGuard, RoleGuard, PermissionGuard, RateLimitGuard)
@RequireRole(Role.ADMIN)
@RequirePermission(Permission.TODO_CREATE)
async example() {
  // All guards must pass before reaching here
}
```

**Guard Execution Order:**
1. **JwtAuthGuard** - Validates JWT, sets `req.user`
2. **RoleGuard** - Checks if user has required role
3. **PermissionGuard** - Checks if user has required permission
4. **RateLimitGuard** - Checks rate limits

If any guard fails, the request is rejected and the chain stops.

### Data Flow Between Layers

#### Example: Creating an Organization

```
1. HTTP POST /organizations
   Body: { name: "Acme Corp", ... }
   
2. RequestLoggingMiddleware
   → Logs: "POST /organizations"
   
3. JwtAuthGuard
   → Validates JWT token
   → Sets: req.user = { userId: "123", orgId: "456", ... }
   
4. UserContextInterceptor
   → Reads req.user
   → Sets: AsyncLocalStorage context = user
   
5. ValidationPipe
   → Validates CreateOrganizationDto
   → Transforms to DTO instance
   
6. OrganizationController.create()
   → Receives validated DTO
   → Calls: organizationService.create(dto)
   
7. OrganizationService.create()
   → Gets current user: UserContextAccessor.userContext
   → Validates business rules
   → Creates entity: new Organization(...)
   → Saves: await this.getRepository().save(entity)
   → Maps to DTO: this._mapper.map(entity, OrganizationResponseDto)
   → Returns DTO
   
8. Controller
   → Returns HTTP 201 with DTO
```

### How Controllers Call Services

Controllers inject services via interface tokens:

```typescript
// Controller
@Controller('organizations')
export class OrganizationController {
  constructor(
    @Inject(IOrganizationServiceToken)
    private readonly _organizationService: IOrganizationService,
  ) {}

  @Post()
  async create(@Body() dto: CreateOrganizationDto) {
    return this._organizationService.create(dto);
  }
}
```

### Interfaces, DTOs, Mappers, Repositories, and Providers

#### Interfaces (Contracts)

Interfaces define contracts that implementations must follow:

```typescript
// APP.Shared/interfaces/services/IOrganizationService.interface.ts
export interface IOrganizationService {
  create(dto: CreateOrganizationDto): Promise<OrganizationResponseDto>;
  findById(id: string): Promise<OrganizationResponseDto>;
  // ...
}
```

#### DTOs (Data Transfer Objects)

DTOs define the shape of data transferred between layers:

```typescript
// APP.Shared/dtos/organizations/CreateOrganizationDto.dto.ts
export class CreateOrganizationDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;
}
```

#### Mappers (AutoMapper)

AutoMapper converts between entities and DTOs:

```typescript
// APP.BLL/mappings/mappers/OrganizationMapper.mapper.ts
@Injectable()
export class OrganizationMapper {
  constructor(@Inject(MAPPER) private readonly mapper: Mapper) {
    // Configure mappings
    createMap(mapper, Organization, OrganizationResponseDto);
  }
}

// In Service
const dto = this._mapper.map(entity, OrganizationResponseDto, Organization);
```

#### Repositories (Direct DbContext Pattern)

The project uses **Direct DbContext Pattern** - no repository abstraction:

```typescript
// In Service (extends BaseService)
protected getRepository(): Repository<Organization> {
  return this._dbContext.getRepository(Organization);
}

// Usage
const org = await this.getRepository().findOne({ where: { id } });
```

#### Providers (Dependency Injection)

Services are registered as providers in modules:

```typescript
@Module({
  providers: [
    {
      provide: IOrganizationServiceToken,
      useClass: OrganizationService,
    },
  ],
})
export class OrganizationModule {}
```

### User Context Pattern

The application uses two complementary patterns for accessing the current user:

#### 1. `@CurrentUser()` Decorator (Controller Level)

```typescript
@Get('me')
@UseGuards(JwtAuthGuard)
async getProfile(@CurrentUser() user: ICurrentUser) {
  return user; // Direct access to req.user
}
```

**When to use**: In controllers when you need the user as a parameter.

#### 2. `UserContextAccessor` (Service/Repository Level)

```typescript
// In Service
async getTodos() {
  const user = UserContextAccessor.userContext; // From AsyncLocalStorage
  return this.getRepository().find({
    where: { orgId: user.orgId }
  });
}
```

**When to use**: In services, repositories, or anywhere without access to the request object.

**How it works**:
- `UserContextInterceptor` (runs after guards) reads `req.user`
- Stores it in `AsyncLocalStorage` via `UserContextAccessor.run()`
- All subsequent async operations in the request can access it
- Context is automatically cleaned up when request completes

**Why not middleware?**
- Middleware runs **before** guards, so `req.user` doesn't exist yet
- Interceptors run **after** guards, so `req.user` is available
- This is why `UserContextInterceptor` is used instead of `UserContextMiddleware`

### Domain Events

Domain events allow decoupled communication between domain components:

```typescript
// APP.Entity/domain.events/TodoCreated.event.ts
export class TodoCreated {
  constructor(
    public readonly todoId: string,
    public readonly projectId: string,
    public readonly assignedTo: string,
  ) {}
}

// In Entity
const event = new TodoCreated(this.id, this.projectId, this.assignedTo);
// Publish event (implementation depends on your event bus)
```

---

## 3. Environment Setup

### Prerequisites

- **Node.js**: 18.x or higher
- **npm**: 9.x or higher (or yarn)
- **PostgreSQL**: 14.x or higher
- **Redis**: 7.x or higher (required for caching and rate limiting)
- **RabbitMQ**: 3.12.x or higher (optional)

### Installation Steps

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd scol-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # Copy .env.example to .env.local (if exists)
   # Or create .env.local with required variables
   ```

4. **Set up PostgreSQL database**
   ```bash
   # Create database
   createdb scol_backend
   ```

5. **Run migrations**
   ```bash
   npm run typeorm:run
   ```

### Environment Variables

#### File Priority

The application loads environment variables in this order:
1. `.env.local` (highest priority, not committed to git)
2. `.env` (committed to git, default values)
3. `process.env` (system environment variables)

#### Required Variables

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/scol_backend

# JWT
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long

# Application
NODE_ENV=development
PORT=3000
```

#### Optional Variables

```bash
# Redis (required for caching and rate limiting - app starts without it but features fail-open)
REDIS_URL=redis://localhost:6379

# RabbitMQ (optional)
RABBITMQ_URL=amqp://admin:admin123@localhost:5672

# Email (optional - defaults to console mode)
EMAIL_PROVIDER=console  # or 'smtp'
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=true
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-password
SMTP_FROM=noreply@example.com

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback

# Rate Limiting (optional)
RATE_LIMIT_ENABLED=true
RATE_LIMIT_GLOBAL_LIMIT=10000
RATE_LIMIT_GLOBAL_WINDOW_SECONDS=60
RATE_LIMIT_IP_LIMIT=100
RATE_LIMIT_IP_WINDOW_SECONDS=60
RATE_LIMIT_USER_LIMIT=1000
RATE_LIMIT_USER_WINDOW_SECONDS=60
RATE_LIMIT_EXEMPT_USERS=user-id-1,user-id-2
RATE_LIMIT_EXEMPT_ROLES=admin,super-admin

# CORS
CORS_ENABLED=true
CORS_ORIGINS=*

# Pagination
PAGINATION_DEFAULT_PAGE_SIZE=10
PAGINATION_MAX_PAGE_SIZE=100

# Auth
AUTH_ACCOUNT_LOCKOUT_THRESHOLD=5
AUTH_ACCOUNT_LOCKOUT_DURATION_MINUTES=30
AUTH_REFRESH_TOKEN_EXPIRATION_DAYS=7
AUTH_PASSWORD_RESET_TOKEN_EXPIRATION_HOURS=1
```

### Config Module

The application uses `@nestjs/config` with Joi validation:

**Location**: `src/APP.Infrastructure/config/AppConfigModule.module.ts`

**Schema**: `src/APP.Infrastructure/config/AppEnvSchema.schema.ts`

The config module:
- Validates all environment variables on startup
- Provides type-safe configuration interfaces
- Separates config by layer (Infrastructure, Application, Security, API)

**Usage in Services**:

```typescript
@Inject(IInfrastructureConfigToken)
private readonly _config: IInfrastructureConfig

// Access config
const dbUrl = this._config.database.url;
```

### Environment-Specific Loading

The application automatically loads the correct environment:

- **Development**: `NODE_ENV=development` (default)
- **Test**: `NODE_ENV=test`
- **Production**: `NODE_ENV=production`

Different behaviors:
- **Logging**: Pretty-printed in development, JSON in production
- **Database**: Synchronization disabled in all environments (use migrations)
- **Error Details**: Full stack traces in development, sanitized in production

---

## 4. Docker Setup

### Dockerfile

The project includes a Dockerfile for containerizing the application. Key features:

- Multi-stage build for optimization
- Production-ready Node.js setup
- Health checks
- Non-root user for security

### docker-compose.yml

The `docker-compose.yml` file provides infrastructure services:

#### Services

1. **Redis** (Port 6379)
   - Used for caching and rate limiting
   - Persistent volume: `redis_data`
   - Health checks enabled

2. **RabbitMQ** (Ports 5672, 15672)
   - Message queue for async operations
   - Management UI: http://localhost:15672
   - Default credentials: `admin` / `admin123`
   - Persistent volumes: `rabbitmq_data`, `rabbitmq_logs`

3. **MailHog** (Optional, commented out)
   - SMTP server for email testing
   - Web UI: http://localhost:8025
   - Uncomment in `docker-compose.yml` to enable

#### Network

All services run on `scol-network` bridge network.

### Running the Full Stack

1. **Start infrastructure services**
   ```bash
   docker-compose up -d
   ```

2. **Verify services are running**
   ```bash
   docker-compose ps
   ```

3. **View logs**
   ```bash
   docker-compose logs -f
   ```

4. **Stop services**
   ```bash
   docker-compose down
   ```

5. **Stop and remove volumes** (clean slate)
   ```bash
   docker-compose down -v
   ```

### Configuring Docker for Local Testing

Update your `.env.local` to connect to Docker services:

```bash
# Connect to Docker services
REDIS_URL=redis://localhost:6379
RABBITMQ_URL=amqp://admin:admin123@localhost:5672

# Database (if running PostgreSQL in Docker)
DATABASE_URL=postgresql://user:password@localhost:5432/scol_backend
```

### Attaching Debugger to NestJS in Docker

To debug NestJS running inside Docker:

1. **Add debug configuration to Dockerfile**:
   ```dockerfile
   CMD ["node", "--inspect=0.0.0.0:9229", "dist/main.js"]
   ```

2. **Expose debug port in docker-compose.yml**:
   ```yaml
   services:
     api:
       ports:
         - "3000:3000"
         - "9229:9229"  # Debug port
   ```

3. **Attach VS Code debugger**:
   - Create `.vscode/launch.json`:
   ```json
   {
     "type": "node",
     "request": "attach",
     "name": "Docker: Attach to Node",
     "address": "localhost",
     "port": 9229,
     "localRoot": "${workspaceFolder}",
     "remoteRoot": "/app"
   }
   ```

---

## 5. Database & Migrations

### TypeORM Configuration

The project uses TypeORM for database access with two configurations:

#### 1. Application Configuration

**Location**: `src/APP.Infrastructure/db/typeorm/TypeOrmModule.module.ts`

- Used by the running application
- Loads entities from `@entity` imports
- Synchronization disabled (`synchronize: false`)
- Logging configured based on environment

#### 2. CLI Configuration

**Location**: `src/APP.Infrastructure/db/typeorm/DbContext.datasource.ts`

- Used by TypeORM CLI for migrations
- Loads entities explicitly
- Loads migrations from `migrations/*.ts`
- Used by npm scripts

### Connection Setup

The application supports two connection methods:

1. **Connection URL** (preferred):
   ```bash
   DATABASE_URL=postgresql://user:password@host:5432/database
   ```

2. **Individual Parameters** (fallback):
   ```bash
   DB_HOST=localhost
   DB_PORT=5432
   DB_USER=user
   DB_PASS=password
   DB_NAME=scol_backend
   ```

### Migration Commands

#### Generate Migration

Creates a new migration file based on entity changes:

```bash
npm run typeorm:gen -- migrations/AddNewColumn
```

**Note**: The migration name is required. TypeORM will compare entities with the current database schema and generate the migration.

#### Run Migrations

Applies all pending migrations:

```bash
npm run typeorm:run
```

#### Revert Migration

Reverts the last migration:

```bash
npm run typeorm:revert
```

### Migration File Organization

Migrations are stored in the `migrations/` folder at the project root:

```
migrations/
├── 1762945745677-InitSchema.ts
├── 1763568353250-AddAuthTables.ts
└── 1763573793190-AddRolePermissionTable.ts
```

**Naming Convention**: `{timestamp}-{Description}.ts`

### Running Migrations in Docker

If your database runs in Docker:

```bash
# Ensure DATABASE_URL points to Docker service
DATABASE_URL=postgresql://user:password@localhost:5432/scol_backend

# Run migrations (from host)
npm run typeorm:run
```

### CI/CD Migration Strategy

**Recommended approach**:

1. **Run migrations as part of deployment**:
   ```yaml
   # Example GitHub Actions
   - name: Run migrations
     run: npm run typeorm:run
     env:
       DATABASE_URL: ${{ secrets.DATABASE_URL }}
   ```

2. **Never use `synchronize: true` in production**
   - Always use migrations for schema changes
   - Review migration files before deploying

3. **Backup before migrations**:
   - Always backup production database before running migrations
   - Test migrations in staging first

### Entity Registration

All entities must be registered in:

1. **TypeOrmModule** (for application):
   ```typescript
   TypeOrmModule.forFeature([Organization, User, ...])
   ```

2. **DbContext.datasource.ts** (for migrations):
   ```typescript
   entities: [Organization, User, ...]
   ```

**Important**: When adding a new entity, register it in both places.

---

## 6. Running the Project

### Local Development (Without Docker)

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment**
   ```bash
   # Create .env.local with required variables
   cp .env.example .env.local  # if .env.example exists
   # Edit .env.local with your values
   ```

3. **Start PostgreSQL and Redis** (if not using Docker)
   ```bash
   # PostgreSQL
   pg_ctl start

   # Redis
   redis-server
   ```

4. **Run migrations**
   ```bash
   npm run typeorm:run
   ```

5. **Start development server**
   ```bash
   npm run start:dev
   ```

   The server will:
   - Start on http://localhost:3000
   - Watch for file changes
   - Auto-reload on changes
   - Show pretty-printed logs

### Running Within Docker

1. **Start infrastructure services**
   ```bash
   docker-compose up -d
   ```

2. **Update .env.local** to point to Docker services:
   ```bash
   REDIS_URL=redis://localhost:6379
   RABBITMQ_URL=amqp://admin:admin123@localhost:5672
   ```

3. **Run the application locally** (connects to Docker services):
   ```bash
   npm run start:dev
   ```

### Production Mode

1. **Build the application**
   ```bash
   npm run build
   ```

   This compiles TypeScript to JavaScript in the `dist/` folder.

2. **Set production environment**
   ```bash
   export NODE_ENV=production
   # Or set in .env.local
   ```

3. **Start production server**
   ```bash
   npm run start:prod
   ```

   Or:
   ```bash
   npm start
   ```

### Health Check Endpoints

The application includes health check endpoints:

- **GET /health** - Basic health check
- **GET /health/detailed** - Detailed health check (database, Redis, etc.)

Use these endpoints to verify the application is running correctly.

### Seeders

If seeders are available, they can be run with:

```bash
# Example (if implemented)
npm run seed
```

**Note**: Seeders are typically used for development/testing data.

---

## 7. Guards, Interceptors, Filters, Pipes

### Execution Order

Understanding the execution order is critical:

```
1. Middleware
2. Guards
3. Interceptors (before)
4. Pipes
5. Controller
6. Interceptors (after)
7. Exception Filters
```

### Guards

Guards determine whether a request should be handled by the route handler. They run **after middleware** and **before interceptors**.

#### JwtAuthGuard

**Purpose**: Validates JWT tokens and attaches user to request.

**Location**: `src/APP.API/common/guards/JwtAuthGuard.guard.ts`

**Usage**:
```typescript
@Get('profile')
@UseGuards(JwtAuthGuard)
async getProfile(@CurrentUser() user: ICurrentUser) {
  return user;
}
```

**What it does**:
1. Extracts JWT token from `Authorization: Bearer <token>` header
2. Verifies token using `IJwtService`
3. Converts `JwtPayload` to `ICurrentUser` (domain model)
4. Attaches user to `req.user`
5. Throws `UnauthorizedException` if token is invalid

#### RoleGuard

**Purpose**: Checks if user has required roles.

**Location**: `src/APP.API/common/guards/RoleGuard.guard.ts`

**Usage**:
```typescript
@Delete('users/:id')
@UseGuards(JwtAuthGuard, RoleGuard)
@RequireRole(Role.ADMIN)
async deleteUser(@Param('id') id: string) {
  // Only users with ADMIN role can access
}
```

**What it does**:
1. Reads required roles from `@RequireRole()` decorator
2. Checks if user has any of the required roles
3. Super admins bypass all role checks
4. Throws `ForbiddenException` if user lacks required role

**Decorator**: `@RequireRole(Role.ADMIN, Role.MANAGER)`

#### PermissionGuard

**Purpose**: Checks if user has required permissions.

**Location**: `src/APP.API/common/guards/PermissionGuard.guard.ts`

**Usage**:
```typescript
@Post('todos')
@UseGuards(JwtAuthGuard, PermissionGuard)
@RequirePermission(Permission.TODO_CREATE)
async createTodo(@Body() dto: CreateTodoDto) {
  // Only users with TODO_CREATE permission can access
}
```

**What it does**:
1. Reads required permissions from `@RequirePermission()` decorator
2. Checks if user has any of the required permissions
3. Super admins bypass all permission checks
4. Throws `ForbiddenException` if user lacks required permission

**Decorator**: `@RequirePermission(Permission.TODO_CREATE, Permission.PROJECT_DELETE)`

#### RateLimitGuard

**Purpose**: Enforces rate limiting using sliding window algorithm.

**Location**: `src/APP.API/common/guards/RateLimitGuard.guard.ts`

**Usage**:
```typescript
@Post('login')
@UseGuards(RateLimitGuard)
@RateLimit({ limit: 5, windowSeconds: 60 }) // 5 requests per minute
async login(@Body() dto: LoginRequestDto) {
  // Rate limited endpoint
}
```

**What it does**:
1. Checks if rate limiting is enabled in config
2. Determines identifier (user ID or IP address)
3. Checks endpoint-specific limits (from `@RateLimit()` decorator)
4. Falls back to user-based or IP-based limits
5. Uses Redis for storage (falls back to in-memory)
6. Sets rate limit headers on response
7. Throws `TooManyRequestsException` (429) if limit exceeded

**Configuration Priority**:
1. Endpoint-specific (`@RateLimit()` decorator)
2. User-based (for authenticated users)
3. IP-based (for anonymous users)
4. Global (overall API protection)

**Decorators**:
- `@RateLimit({ limit: 10, windowSeconds: 60 })` - Set endpoint-specific limits
- `@SkipRateLimiting()` - Skip rate limiting for this endpoint

### Interceptors

Interceptors run **after guards** and can transform requests/responses.

#### UserContextInterceptor

**Purpose**: Establishes user context in AsyncLocalStorage after guards have set `req.user`.

**Location**: `src/APP.API/common/interceptors/UserContextInterceptor.interceptor.ts`

**Why Interceptor, Not Middleware?**
- Middleware runs **before** guards, so `req.user` doesn't exist yet
- Interceptors run **after** guards, so `req.user` is available
- This is why user context is set in an interceptor

**What it does**:
1. Reads `req.user` (set by `JwtAuthGuard`)
2. Stores user in `AsyncLocalStorage` via `UserContextAccessor.run()`
3. Wraps the entire request handler in the context
4. Services can access user via `UserContextAccessor.userContext`

**Registration**: Registered globally in `main.ts`:
```typescript
app.useGlobalInterceptors(new UserContextInterceptor());
```

### Custom Decorators

#### @CurrentUser()

**Purpose**: Injects current user into controller method parameter.

**Location**: `src/APP.API/common/decorators/CurrentUser.decorator.ts`

**Usage**:
```typescript
@Get('me')
@UseGuards(JwtAuthGuard)
async getProfile(@CurrentUser() user: ICurrentUser) {
  return user;
}
```

**How it works**: Extracts `req.user` set by `JwtAuthGuard`.

#### @RequireRole()

**Purpose**: Specifies required roles for an endpoint.

**Location**: `src/APP.API/common/decorators/RequireRole.decorator.ts`

**Usage**:
```typescript
@Delete('users/:id')
@UseGuards(JwtAuthGuard, RoleGuard)
@RequireRole(Role.ADMIN)
async deleteUser(@Param('id') id: string) {
  // ...
}
```

#### @RequirePermission()

**Purpose**: Specifies required permissions for an endpoint.

**Location**: `src/APP.API/common/decorators/RequirePermission.decorator.ts`

**Usage**:
```typescript
@Post('todos')
@UseGuards(JwtAuthGuard, PermissionGuard)
@RequirePermission(Permission.TODO_CREATE)
async createTodo(@Body() dto: CreateTodoDto) {
  // ...
}
```

#### @RateLimit()

**Purpose**: Sets endpoint-specific rate limits.

**Location**: `src/APP.API/common/decorators/RateLimit.decorator.ts`

**Usage**:
```typescript
@Post('login')
@UseGuards(RateLimitGuard)
@RateLimit({ limit: 5, windowSeconds: 60 })
async login(@Body() dto: LoginRequestDto) {
  // 5 requests per minute
}
```

#### @SkipRateLimiting()

**Purpose**: Skips rate limiting for an endpoint.

**Usage**:
```typescript
@Get('health')
@SkipRateLimiting()
async health() {
  // Not rate limited
}
```

### Global Exception Filter

**Purpose**: Catches all exceptions and formats them consistently.

**Location**: `src/APP.API/common/filters/HttpExceptionFilter.filter.ts`

**What it does**:
1. Catches all exceptions (HTTP and non-HTTP)
2. Formats as Problem Details (RFC 7807)
3. Logs errors with correlation ID
4. Returns consistent error format

**Response Format**:
```json
{
  "type": "about:blank",
  "title": "HTTP Error",
  "status": 401,
  "detail": "Unauthorized",
  "instance": "/api/auth/me",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Registration**: Registered globally in `main.ts`:
```typescript
app.useGlobalFilters(app.get(HttpExceptionFilter));
```

### ValidationPipe

**Purpose**: Validates and transforms incoming DTOs.

**Configuration** (in `main.ts`):
```typescript
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,              // Strip unknown properties
    forbidNonWhitelisted: true,    // Throw error on unknown properties
    transform: true,               // Transform to DTO instance
  }),
);
```

**How it works**:
1. Validates DTO using `class-validator` decorators
2. Strips unknown properties (`whitelist: true`)
3. Throws error if unknown properties exist (`forbidNonWhitelisted: true`)
4. Transforms plain object to DTO instance (`transform: true`)

**DTO Example**:
```typescript
export class CreateOrganizationDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;
}
```

### Middleware

#### RequestLoggingMiddleware

**Purpose**: Logs incoming requests.

**Location**: `src/APP.API/common/middleware/RequestLoggingMiddleware.ts`

**What it does**:
- Logs request method, path, and headers
- Sets correlation ID
- Runs before all other middleware

**Registration**: Registered in `ApiModule`:
```typescript
consumer.apply(RequestLoggingMiddleware).forRoutes('*');
```

---

## 8. API Documentation (Swagger)

### Swagger Setup

Swagger is configured in `main.ts`:

```typescript
const swaggerCfg = new DocumentBuilder()
  .setTitle('SCOL Backend')
  .setDescription('API documentation')
  .setVersion('1.0.0')
  .addBearerAuth(
    {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      name: 'JWT',
      description: 'Enter JWT token',
      in: 'header',
    },
    'JWT-auth', // This name must match @ApiBearerAuth('JWT-auth')
  )
  .build();

const doc = SwaggerModule.createDocument(app, swaggerCfg);
SwaggerModule.setup('/swagger', app, doc);
```

### Accessing Swagger UI

Once the application is running, access Swagger UI at:

**http://localhost:3000/swagger**

### Adding Endpoints to Swagger

#### Basic Endpoint Documentation

```typescript
@Controller('organizations')
@ApiTags('Organizations') // Groups endpoints in Swagger
export class OrganizationController {
  @Post()
  @ApiOperation({ summary: 'Create a new organization' })
  @ApiResponse({ status: 201, description: 'Organization created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiBearerAuth('JWT-auth') // Requires authentication
  async create(@Body() dto: CreateOrganizationDto) {
    // ...
  }
}
```

#### Request Body Documentation

```typescript
@Post()
@ApiBody({ type: CreateOrganizationDto })
@ApiOperation({ summary: 'Create organization' })
async create(@Body() dto: CreateOrganizationDto) {
  // ...
}
```

#### Response Documentation

```typescript
@Get(':id')
@ApiOperation({ summary: 'Get organization by ID' })
@ApiResponse({
  status: 200,
  description: 'Organization found',
  type: OrganizationResponseDto,
})
@ApiResponse({ status: 404, description: 'Organization not found' })
async findById(@Param('id') id: string) {
  // ...
}
```

### Updating DTOs for Swagger

Use `@ApiProperty()` decorators in DTOs:

```typescript
export class CreateOrganizationDto {
  @ApiProperty({
    description: 'Organization name',
    example: 'Acme Corporation',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description: 'Organization description',
    example: 'A leading technology company',
  })
  @IsString()
  @IsOptional()
  description?: string;
}
```

**Decorators**:
- `@ApiProperty()` - Required property
- `@ApiPropertyOptional()` - Optional property

### Best Practices

1. **Always document endpoints**: Use `@ApiOperation()` for descriptions
2. **Document responses**: Use `@ApiResponse()` for all possible status codes
3. **Use DTOs**: Always use DTOs for request/response bodies
4. **Group endpoints**: Use `@ApiTags()` to group related endpoints
5. **Document authentication**: Use `@ApiBearerAuth()` for protected endpoints

---

## 9. Services & Business Logic

### Service Structure

Services implement business logic and use cases. They follow a consistent pattern:

```typescript
@Injectable()
export class OrganizationService
  extends BaseService<Organization>
  implements IOrganizationService
{
  protected getEntityClass(): new () => Organization {
    return Organization;
  }

  async create(dto: CreateOrganizationDto): Promise<OrganizationResponseDto> {
    // Business logic here
  }
}
```

### BaseService

Most services extend `BaseService` which provides:

- **Repository Access**: `getRepository()` method
- **Logger**: `_logger` property (ILogger)
- **Mapper**: `_mapper` property (IMapper)
- **DbContext**: `_dbContext` property (TypeORM DataSource)

**Location**: `src/APP.BLL/core/BaseService.ts`

**When to extend BaseService**:
- Services that work with a single entity type
- Services that need repository access

**When NOT to extend BaseService**:
- Services that work with multiple entities (e.g., `AuthService`)
- Services that don't need repository access

### Accessing Current User in Services

Services use `UserContextAccessor` to get the current user:

```typescript
async getTodos() {
  const user = UserContextAccessor.userContext;
  
  return this.getRepository().find({
    where: { orgId: user.orgId }
  });
}
```

**Important**: Services don't have access to the request object, so they must use `UserContextAccessor`.

### Using DbContext

Services access the database via TypeORM's DataSource:

```typescript
// Get repository for entity
const repo = this.getRepository(); // Returns Repository<Organization>

// Use repository methods
const org = await repo.findOne({ where: { id } });
await repo.save(org);
await repo.delete(id);

// Or use query builder
const orgs = await repo
  .createQueryBuilder('org')
  .where('org.name LIKE :name', { name: `%${search}%` })
  .getMany();
```

### Using Mapper

Services use AutoMapper to convert between entities and DTOs:

```typescript
// Entity to DTO
const dto = this._mapper.map(
  entity,
  OrganizationResponseDto,
  Organization,
);

// DTO to Entity (if mapping configured)
const entity = this._mapper.map(
  dto,
  Organization,
  CreateOrganizationDto,
);
```

### Using Logger

Services use the logger for structured logging:

```typescript
this._logger.LogInfo('Organization created', { orgId: org.id });
this._logger.LogWarning('Low inventory', { productId });
this._logger.LogError('Failed to process order', error, { orderId });
```

### Interface-Based DI

Services are injected via interfaces:

```typescript
// Controller
constructor(
  @Inject(IOrganizationServiceToken)
  private readonly _organizationService: IOrganizationService,
) {}
```

**Benefits**:
- Easy to mock for testing
- Can swap implementations
- Clear contracts

---

## 10. Caching & Rate Limiting

### Caching Strategy

The application uses Redis for caching with fail-open behavior.

#### Cache Service Interface

**Location**: `src/APP.Shared/interfaces/infrastructure/ICacheService.interface.ts`

**Implementation**: 
- `src/APP.Infrastructure/cache/redis/CacheService.service.ts` (Redis-only)

#### Fail-Open Behavior

When Redis is unavailable:
- `cache.get()` returns `null`
- `cache.set()` becomes no-op (silent)
- `cache.getOrSet()` executes factory function directly
- Application continues to function without caching

#### Using Cache

```typescript
@Inject(ICacheServiceToken)
private readonly _cacheService: ICacheService

// Get from cache
const cached = await this._cacheService.get<string>('key');

// Set in cache
await this._cacheService.set('key', 'value', 3600); // TTL in seconds

// Delete from cache
await this._cacheService.delete('key');
```

#### Cache Key Builder

**Location**: `src/APP.Infrastructure/cache/utils/CacheKeyBuilder.ts`

Builds consistent cache keys:

```typescript
const key = CacheKeyBuilder.build('user', userId, 'profile');
// Result: "cache:user:{userId}:profile"
```

#### Compression

Large cache values are automatically compressed:

**Location**: `src/APP.Infrastructure/cache/utils/CompressionHelper.ts`

### Rate Limiting

Rate limiting uses a sliding window algorithm with Redis storage. When Redis is unavailable, rate limiting fails open (allows all requests).

#### Fail-Open Behavior

When Redis is unavailable:
- `increment()` returns allow-all values: `{ count: 0, remaining: limit }`
- No requests are blocked due to rate limiting
- Application continues to function without rate limiting protection

#### Configuration

```bash
RATE_LIMIT_ENABLED=true
RATE_LIMIT_GLOBAL_LIMIT=10000
RATE_LIMIT_GLOBAL_WINDOW_SECONDS=60
RATE_LIMIT_IP_LIMIT=100
RATE_LIMIT_IP_WINDOW_SECONDS=60
RATE_LIMIT_USER_LIMIT=1000
RATE_LIMIT_USER_WINDOW_SECONDS=60
```

#### How It Works

1. **Identifier**: User ID (if authenticated) or IP address (if anonymous)
2. **Storage**: Redis-only (fails open if unavailable)
3. **Algorithm**: Sliding window (Lua script for atomicity)
4. **Headers**: Sets `X-RateLimit-*` headers on response

#### Rate Limit Headers

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1705312800
X-RateLimit-Used: 1
```

#### Exemptions

```bash
RATE_LIMIT_EXEMPT_USERS=user-id-1,user-id-2
RATE_LIMIT_EXEMPT_ROLES=admin,super-admin
```

---

## 11. Logging

### Pino Logger

The application uses Pino for structured logging.

**Location**: `src/APP.Infrastructure/logging/LoggingModule.module.ts`

### Logger Interface

**Location**: `src/APP.Shared/interfaces/logging/ILogger.interface.ts`

**Methods**:
- `LogInfo(message: string, context?: object)`
- `LogWarning(message: string, context?: object)`
- `LogError(message: string, error?: Error, context?: object)`

### Using Logger

```typescript
@Inject(ILoggerToken)
private readonly _logger: ILogger

// Info log
this._logger.LogInfo('User logged in', { userId, email });

// Warning log
this._logger.LogWarning('Rate limit approaching', { userId, count });

// Error log
this._logger.LogError('Failed to save user', error, { userId });
```

### Correlation IDs

Each request gets a unique correlation ID:

- Extracted from `x-correlation-id` or `x-request-id` header
- Or generated as UUID
- Included in all log entries for the request

### Log Levels

- **Development**: `debug` level, pretty-printed
- **Production**: `info` level, JSON format

### Sensitive Data Redaction

Automatically redacts sensitive fields:
- `authorization` headers
- `password` fields
- `token` fields

---

## 12. Security

### JWT Authentication

**Location**: `src/APP.Infrastructure/security/JwtService.service.ts`

#### Token Types

1. **Access Token**: Short-lived (default: 15 minutes)
2. **Refresh Token**: Long-lived (default: 7 days)

#### Configuration

```bash
JWT_SECRET=your-super-secret-key-minimum-32-characters
JWT_ACCESS_TOKEN_EXPIRES_IN=15m
JWT_REFRESH_TOKEN_EXPIRES_IN=7d
```

#### Token Payload

```typescript
interface JwtPayload {
  sub: string;        // User ID
  email: string;
  orgId: string;
  roles: string[];
  permissions: string[];
  iat: number;       // Issued at
  exp: number;        // Expires at
}
```

### Password Hashing

**Location**: `src/APP.Infrastructure/security/PasswordHasher.service.ts`

Uses bcrypt for password hashing:

```typescript
@Inject(IPasswordHasherToken)
private readonly _passwordHasher: IPasswordHasher

// Hash password
const hashed = await this._passwordHasher.hashPassword('plaintext');

// Verify password
const isValid = await this._passwordHasher.verifyPassword('plaintext', hashed);
```

### OAuth Integration

Google OAuth is supported:

**Configuration**:
```bash
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
```

### Security Best Practices

1. **Never log sensitive data**: Passwords, tokens are automatically redacted
2. **Use HTTPS in production**: Always use TLS/SSL
3. **Validate input**: Use DTOs with validation decorators
4. **Rate limiting**: Enable rate limiting to prevent abuse
5. **Strong JWT secret**: Use a strong, random JWT secret (minimum 32 characters)

---

## 13. Messaging

### RabbitMQ Integration

**Location**: `src/APP.Infrastructure/messaging/`

#### Message Sender Interface

```typescript
@Inject(IMessageSenderToken)
private readonly _messageSender: IMessageSender

// Send message
await this._messageSender.send('queue-name', { data: 'value' });
```

#### Implementations

1. **RabbitMQMessageSender**: Sends to RabbitMQ
2. **ConsoleMessageSender**: Logs to console (development)

### Email Service

**Location**: `src/APP.Infrastructure/messaging/`

The email service provides abstraction for sending emails with two implementations:

1. **ConsoleEmailSender** (Development): Logs emails to console
2. **SmtpEmailSender** (Production): Sends emails via SMTP

#### Email Sender Interface

```typescript
@Inject(IEmailSender)
private readonly _emailSender: IEmailSender

// Send simple email
await this._emailSender.sendEmail({
  to: 'user@example.com',
  subject: 'Welcome',
  html: '<h1>Welcome!</h1>',
  text: 'Welcome!'
});

// Send HTML email
await this._emailSender.sendHtmlEmail(
  'user@example.com',
  'Subject',
  '<h1>HTML Content</h1>'
);

// Send text email
await this._emailSender.sendTextEmail(
  'user@example.com',
  'Subject',
  'Plain text content'
);

// Send templated email
await this._emailSender.sendTemplatedEmail(
  'welcome-template',
  'user@example.com',
  { userName: 'John', organizationName: 'Acme Corp' }
);

// Send batch emails
await this._emailSender.sendBatch([
  { to: 'user1@example.com', subject: 'Hello', text: 'Message 1' },
  { to: 'user2@example.com', subject: 'Hello', text: 'Message 2' }
]);
```

#### Configuration

The email provider is selected based on `EMAIL_PROVIDER` environment variable:

- `console` (default): Uses `ConsoleEmailSender` - logs to console
- `smtp`: Uses `SmtpEmailSender` - sends via SMTP

**Environment Variables for SMTP:**

```env
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false  # false for STARTTLS (587), true for SSL (465)
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@yourdomain.com
```

**Important Notes:**

- Port 587 requires `SMTP_SECURE=false` (STARTTLS)
- Port 465 requires `SMTP_SECURE=true` (SSL)
- Gmail requires an "App Password" (not your regular password)
- Gmail may override the `FROM` address if it doesn't match the authenticated account

#### ConsoleEmailSender (Development)

**Use Case**: Local development and testing without SMTP configuration

**Features:**
- Logs email details to console
- Shows email content preview
- No actual email sending
- Useful for development and CI/CD testing

**Example Output:**

```
📧 [CONSOLE EMAIL] Email would be sent: {
  from: 'noreply@scol.com',
  to: 'user@example.com',
  subject: 'Welcome',
  hasText: true,
  hasHtml: true
}

📝 Text Content:
Welcome to SCOL!...

🌐 HTML Content:
<h1>Welcome!</h1>...
```

#### SmtpEmailSender (Production)

**Use Case**: Production email sending via SMTP

**Features:**
- Full SMTP support via Nodemailer
- HTML and text email support
- Template rendering (placeholder implementation)
- Batch email sending
- Connection pooling for performance
- Automatic connection verification on startup

**Template Support:**

Currently includes placeholder templates:
- `welcome`: Welcome email template
- `organization-created`: Organization creation notification

Templates use simple `{{variable}}` syntax for replacement.

**Example Usage:**

```typescript
// In a service
constructor(
  @Inject(IEmailSender) private readonly _emailSender: IEmailSender
) {}

async sendWelcomeEmail(userEmail: string, userName: string) {
  await this._emailSender.sendTemplatedEmail(
    'welcome',
    userEmail,
    {
      userName,
      organizationName: 'Acme Corp'
    }
  );
}
```

#### Error Handling

- If SMTP is not configured, emails are logged as warnings but not sent
- Connection errors are logged with detailed error information
- Failed email sends throw exceptions that should be caught by the caller

---

## 14. Contribution Guide

### Branch Naming Conventions

Follow these naming patterns for branches:

- **Feature branches**: `feature/description-of-feature`
  - Example: `feature/user-authentication`, `feature/todo-crud-operations`
  
- **Bugfix branches**: `bugfix/description-of-bug`
  - Example: `bugfix/rate-limit-not-working`, `bugfix/migration-error`
  
- **Hotfix branches**: `hotfix/urgent-fix-description`
  - Example: `hotfix/security-patch`, `hotfix/critical-bug-production`

### Git Workflow

1. **Create a feature branch from `main`**:
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes and commit**:
   ```bash
   git add .
   git commit -m "feat: add user authentication endpoint"
   ```

3. **Push and create Pull Request**:
   ```bash
   git push origin feature/your-feature-name
   ```
   Then create a Pull Request on GitHub/GitLab

4. **Code Review**: Wait for approval from at least one reviewer

5. **Merge**: Once approved, merge the PR (squash and merge recommended)

### Commit Message Conventions

Follow [Conventional Commits](https://www.conventionalcommits.org/) format:

**Format**: `<type>(<scope>): <subject>`

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks (dependencies, build, etc.)

**Examples:**

```bash
feat(auth): add JWT refresh token endpoint
fix(rate-limit): correct sliding window calculation
docs(readme): update installation instructions
refactor(services): extract common logic to BaseService
test(guards): add unit tests for PermissionGuard
chore(deps): update NestJS to version 11.0.1
```

**Subject Guidelines:**
- Use imperative mood: "add" not "added" or "adds"
- Don't capitalize first letter
- No period at the end
- Keep it concise (50 characters or less)

### Folder Naming Rules

**Folders (PascalCase):**
- `APP.API` - API layer
- `APP.BLL` - Business logic layer
- `APP.Entity` - Domain entities
- `APP.Infrastructure` - Infrastructure layer
- `APP.Shared` - Shared code

**Files (kebab-case with suffix):**
- `AuthController.controller.ts`
- `OrganizationService.service.ts`
- `User.entity.ts`
- `JwtAuthGuard.guard.ts`
- `HttpExceptionFilter.filter.ts`
- `UserContextInterceptor.interceptor.ts`
- `CurrentUser.decorator.ts`
- `AppModule.module.ts`

**Suffix Conventions:**
- Controllers: `.controller.ts`
- Services: `.service.ts`
- Entities: `.entity.ts`
- Guards: `.guard.ts`
- Filters: `.filter.ts`
- Interceptors: `.interceptor.ts`
- Decorators: `.decorator.ts`
- Modules: `.module.ts`
- DTOs: `.dto.ts`
- Interfaces: `.interface.ts`
- Mappers: `.mapper.ts`
- Enums: `.enum.ts`
- Constants: `.constants.ts`

### Clean Architecture Best Practices

#### 1. Layer Boundaries

**Dependency Direction** (always inward):
```
APP.API → APP.BLL → APP.Entity
         ↓
APP.Infrastructure → APP.Entity
```

**Rules:**
- ✅ API can depend on BLL and Shared
- ✅ BLL can depend on Entity and Shared
- ✅ Infrastructure can depend on Entity and Shared
- ❌ Entity cannot depend on anything
- ❌ BLL cannot depend on API or Infrastructure
- ❌ API cannot depend on Infrastructure directly

#### 2. Interface-Based Dependency Injection

**Always program to interfaces, not implementations:**

```typescript
// ✅ Good: Inject interface
constructor(
  @Inject(IAuthServiceToken) 
  private readonly _authService: IAuthService
) {}

// ❌ Bad: Inject concrete class
constructor(
  private readonly _authService: AuthService
) {}
```

#### 3. Where to Place New Code

**New Entity/Model:**
- Location: `src/APP.Entity/entities/`
- Example: `src/APP.Entity/entities/Product.entity.ts`

**New Service/Use Case:**
- Location: `src/APP.BLL/services/`
- Example: `src/APP.BLL/services/ProductService.service.ts`
- Also create interface: `src/APP.Shared/interfaces/services/IProductService.interface.ts`

**New Controller:**
- Location: `src/APP.API/feature-controllers/`
- Example: `src/APP.API/feature-controllers/products/ProductController.controller.ts`
- Also create module: `src/APP.API/feature-controllers/products/ProductModule.module.ts`

**New Infrastructure Service:**
- Location: `src/APP.Infrastructure/`
- Example: `src/APP.Infrastructure/storage/FileStorageService.service.ts`
- Also create interface: `src/APP.Shared/interfaces/infrastructure/IFileStorage.interface.ts`

**New DTO:**
- Location: `src/APP.Shared/dtos/`
- Example: `src/APP.Shared/dtos/products/CreateProductDto.dto.ts`

**New Exception:**
- Location: `src/APP.Shared/exceptions/`
- Example: `src/APP.Shared/exceptions/products/ProductNotFoundException.ts`

#### 4. Dependency Injection Pattern

**Step 1: Define Interface** (in `APP.Shared`):
```typescript
// src/APP.Shared/interfaces/services/IProductService.interface.ts
export interface IProductService {
  create(dto: CreateProductDto): Promise<ProductResponseDto>;
  findById(id: string): Promise<ProductResponseDto>;
}
```

**Step 2: Create Token** (in `APP.Shared`):
```typescript
// src/APP.Shared/tokens/injection.tokens.ts
export const IProductService = Symbol('IProductService');
```

**Step 3: Implement Service** (in `APP.BLL`):
```typescript
// src/APP.BLL/services/ProductService.service.ts
@Injectable()
export class ProductService implements IProductService {
  // Implementation
}
```

**Step 4: Register in Module**:
```typescript
// src/APP.API/feature-controllers/products/ProductModule.module.ts
@Module({
  providers: [
    {
      provide: IProductServiceToken,
      useClass: ProductService,
    },
  ],
  // ...
})
```

**Step 5: Inject in Controller**:
```typescript
// src/APP.API/feature-controllers/products/ProductController.controller.ts
constructor(
  @Inject(IProductServiceToken)
  private readonly _productService: IProductService
) {}
```

### Code Style Guidelines

#### TypeScript

- Use **strict mode** (enabled in `tsconfig.json`)
- Prefer **interfaces** over types for object shapes
- Use **explicit return types** for public methods
- Use **private/protected** access modifiers appropriately
- Prefix private fields with `_` (e.g., `_logger`, `_dbContext`)

#### Naming Conventions

- **Classes**: PascalCase (`AuthService`, `JwtAuthGuard`)
- **Interfaces**: PascalCase with `I` prefix (`IAuthService`, `ICurrentUser`)
- **Variables/Functions**: camelCase (`getUserById`, `currentUser`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_RETRY_COUNT`, `DEFAULT_PAGE_SIZE`)
- **Enums**: PascalCase (`Role`, `Permission`, `TodoStatus`)

#### File Organization

- One class/interface per file
- File name should match class/interface name (with suffix)
- Group related files in feature folders
- Keep files focused and small (< 300 lines ideally)

#### Example Service Structure

```typescript
import { Injectable, Inject } from '@nestjs/common';
import type { IProductService } from '@shared/interfaces/services';
import { IProductService as IProductServiceToken } from '@shared/tokens/injection.tokens';
import type { ILogger } from '@shared/interfaces/logging';
import { ILogger as ILoggerToken } from '@shared/tokens/injection.tokens';

/**
 * Product Service
 * 
 * Handles product-related business logic.
 * Implements IProductService interface.
 */
@Injectable()
export class ProductService implements IProductService {
  constructor(
    @Inject(ILoggerToken) private readonly _logger: ILogger,
    // ... other dependencies
  ) {}

  async create(dto: CreateProductDto): Promise<ProductResponseDto> {
    this._logger.LogInfo('Creating product', { name: dto.name });
    
    // Business logic here
    
    return result;
  }
}
```

---

## 15. Testing

### Test Structure

Tests are organized alongside source code:

```
src/
  APP.API/
    __tests__/          # API layer tests
  APP.BLL/
    __tests__/          # Service tests
  APP.Entity/
    __tests__/          # Entity tests
  APP.Infrastructure/
    __tests__/          # Infrastructure tests

test/                   # E2E tests
  e2e/
```

### Running Tests

```bash
# Unit tests (fast, no external dependencies)
npm run test

# Watch mode (during development)
npm run test:watch

# E2E tests (uses Docker containers)
npm run test:e2e

# Test coverage
npm run test:cov
```

### Writing Tests

#### Service Test Example

```typescript
// src/APP.BLL/services/__tests__/ProductService.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { ProductService } from '../ProductService.service';
import { IProductService } from '@shared/tokens/injection.tokens';

describe('ProductService', () => {
  let service: ProductService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: IProductService,
          useClass: ProductService,
        },
        // Mock other dependencies
      ],
    }).compile();

    service = module.get<ProductService>(IProductService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a product', async () => {
      const dto = { name: 'Test Product', price: 100 };
      const result = await service.create(dto);
      
      expect(result).toBeDefined();
      expect(result.name).toBe(dto.name);
    });
  });
});
```

#### Controller Test Example

```typescript
// src/APP.API/feature-controllers/products/__tests__/ProductController.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { ProductController } from '../ProductController.controller';
import { IProductService } from '@shared/tokens/injection.tokens';

describe('ProductController', () => {
  let controller: ProductController;
  let service: IProductService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductController],
      providers: [
        {
          provide: IProductService,
          useValue: {
            create: jest.fn(),
            findById: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ProductController>(ProductController);
    service = module.get<IProductService>(IProductService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
```

### Testing Best Practices

1. **Test isolation**: Each test should be independent
2. **Mock external dependencies**: Database, cache, external APIs
3. **Test edge cases**: Null values, empty arrays, boundary conditions
4. **Use descriptive test names**: `it('should throw error when product not found')`
5. **Arrange-Act-Assert pattern**: Set up, execute, verify

---

## 16. Troubleshooting

### Common Issues

#### User Context Not Found

**Error**: `User context not found. Ensure UserContextMiddleware is registered and user is authenticated.`

**Cause**: Trying to access `UserContextAccessor.userContext` before the interceptor runs or without authentication.

**Solution**:
- Ensure `UserContextInterceptor` is registered globally in `main.ts`
- Ensure `JwtAuthGuard` is applied to the endpoint
- Use `UserContextAccessor.tryGetUserContext()` for optional access

#### Database Connection Issues

**Error**: `Connection refused` or `Connection timeout`

**Solutions**:
1. Check `DATABASE_URL` in `.env.local`
2. Verify PostgreSQL is running: `docker-compose ps`
3. Test connection: `psql $DATABASE_URL`
4. Check firewall/network settings

#### Redis Connection Failures

**Error**: `Redis connection failed`

**Solutions**:
1. Check `REDIS_URL` in `.env.local`
2. Verify Redis is running: `docker-compose ps redis`
3. Test connection: `redis-cli -u $REDIS_URL ping`
4. Application will continue with fail-open behavior (cache returns null, rate limiting allows all)

#### Migration Errors

**Error**: `Migration failed` or `Entity metadata not found`

**Solutions**:
1. Ensure all entities are imported in `DbContext.datasource.ts`
2. Check migration file syntax
3. Verify database connection
4. Try reverting and re-running: `npm run typeorm:revert && npm run typeorm:run`

#### Rate Limiting Not Working

**Symptoms**: Rate limits not being enforced

**Solutions**:
1. Check `RATE_LIMIT_ENABLED=true` in `.env.local`
2. Verify Redis is running (rate limiting requires Redis, fails open without it)
3. Check guard is applied: `@UseGuards(RateLimitGuard)`
4. Review rate limit configuration in environment variables
5. If Redis is down, rate limiting will be disabled (fail-open behavior)

#### SMTP Email Not Sending

**Symptoms**: Emails not being sent in production

**Solutions**:
1. Check `EMAIL_PROVIDER=smtp` in environment
2. Verify SMTP credentials are correct
3. Check SMTP port and secure settings:
   - Port 587: `SMTP_SECURE=false` (STARTTLS)
   - Port 465: `SMTP_SECURE=true` (SSL)
4. Review application logs for SMTP connection errors
5. For Gmail: Use App Password, not regular password

### Debugging Tips

1. **Enable verbose logging**: Set `NODE_ENV=development` for detailed logs
2. **Check correlation IDs**: Each request has a correlation ID in logs
3. **Use Swagger UI**: Test endpoints interactively at `/swagger`
4. **Database queries**: Enable TypeORM logging in development
5. **Redis debugging**: Use `redis-cli MONITOR` to see commands

### Performance Optimization

1. **Database indexes**: Add indexes for frequently queried columns
2. **Query optimization**: Use `EXPLAIN ANALYZE` for slow queries
3. **Caching**: Use Redis cache for expensive operations
4. **Connection pooling**: Already configured in TypeORM and SMTP
5. **Rate limiting**: Prevents abuse and ensures fair resource usage

---

## Conclusion

This documentation covers the essential aspects of the SCOL Backend project. For additional questions or clarifications, refer to:

- **NestJS Documentation**: https://docs.nestjs.com
- **TypeORM Documentation**: https://typeorm.io
- **Project Issues**: Create an issue in the repository

**Happy Coding! 🚀**