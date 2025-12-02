# SCOL Backend - Enterprise NestJS Application

> **A production-ready, multi-tenant REST API built with NestJS, TypeORM, and PostgreSQL.**
> 
> This project demonstrates enterprise-grade architecture patterns, clean code principles, and best practices for building scalable Node.js applications.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [Authentication](#authentication)
- [Development](#development)
- [Testing](#testing)
- [Deployment](#deployment)
- [Documentation](#documentation)

---

## 🎯 Overview

**SCOL Backend** is an enterprise-grade REST API that provides:

- ✅ **Multi-tenant architecture** - Organizations with isolated user data
- ✅ **JWT authentication** - Access tokens + refresh tokens
- ✅ **Role-Based Access Control (RBAC)** - Roles and permissions system
- ✅ **Advanced querying** - Dynamic filtering, sorting, and pagination
- ✅ **Clean architecture** - Layered architecture with clear boundaries
- ✅ **Type-safe code** - Full TypeScript with strict mode
- ✅ **API documentation** - Auto-generated Swagger/OpenAPI docs

### Tech Stack

- **Framework**: NestJS 11
- **Language**: TypeScript 5.7
- **Database**: PostgreSQL (TypeORM)
- **Authentication**: JWT (jsonwebtoken)
- **Validation**: class-validator, class-transformer
- **Mapping**: AutoMapper
- **Logging**: Pino
- **API Docs**: Swagger/OpenAPI

---

## ✨ Features

### Authentication & Authorization
- User registration and login
- JWT access tokens (15 minutes)
- JWT refresh tokens (7 days)
- Password reset flow
- Account lockout after failed attempts
- Role-based permissions

### Organization Management
- Multi-tenant organization support
- CRUD operations for organizations
- Advanced search with filters
- Pagination and sorting

### Query Features
- Dynamic filtering (equals, contains, greater than, etc.)
- Multi-column sorting
- Pagination (page number, page size)
- Type-safe query building

### Developer Experience
- Auto-generated API documentation (Swagger)
- Structured logging (Pino)
- Type-safe dependency injection
- Interface-based service contracts
- Request/response validation

---

## 🏗️ Architecture

This project follows a **layered architecture** pattern:

```
┌─────────────────────────────────────────┐
│         APP.API (Controllers)           │
│  HTTP Requests → Controllers → Guards   │
└──────────────────┬──────────────────────┘
                   ↓
┌─────────────────────────────────────────┐
│      APP.BLL (Business Logic)           │
│  Services → Business Rules → Mapping    │
└──────────────────┬──────────────────────┘
                   ↓
┌─────────────────────────────────────────┐
│   APP.Infrastructure (Technical)        │
│  Database → Security → Messaging        │
└──────────────────┬──────────────────────┘
                   ↓
┌─────────────────────────────────────────┐
│      APP.Entity (Domain Models)         │
│  Entities → Domain Events               │
└─────────────────────────────────────────┘
```

### Key Principles

1. **Separation of Concerns**: Each layer has a single responsibility
2. **Dependency Inversion**: Depend on interfaces, not implementations
3. **Single Responsibility**: Each class/module does one thing well
4. **DRY (Don't Repeat Yourself)**: Common patterns in base classes

**📖 For detailed architecture documentation, see [ARCHITECTURE.md](./ARCHITECTURE.md)**

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- PostgreSQL 14+
- npm or yarn

### Installation

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
   cp .env.example .env.local
   ```
   
   Edit `.env.local` with your configuration:
   ```env
   DATABASE_URL=postgresql://user:password@localhost:5432/scol_db
   JWT_SECRET=your-super-secret-jwt-key-change-in-production
   PORT=3000
   ```

4. **Run database migrations**
   ```bash
   npm run typeorm:run
   ```

5. **Start the development server**
   ```bash
   npm run start:dev
   ```

6. **Access the API**
   - API: http://localhost:3000
   - Swagger UI: http://localhost:3000/swagger

---

## 📁 Project Structure

```
src/
├── APP.API/                    # Presentation Layer
│   ├── feature-controllers/   # Feature modules
│   │   ├── auth/              # Authentication endpoints
│   │   ├── organizations/    # Organization CRUD
│   │   └── notifications/     # Email/messaging
│   └── common/                # Shared API concerns
│       ├── guards/            # Auth guards
│       ├── middleware/        # Request middleware
│       └── filters/           # Exception filters
│
├── APP.BLL/                   # Business Logic Layer
│   ├── services/              # Business logic services
│   ├── mappings/              # Entity ↔ DTO mappers
│   └── core/                  # Base classes
│
├── APP.Entity/                # Domain Layer
│   ├── entities/              # TypeORM entities
│   └── domain.events/         # Domain events
│
├── APP.Infrastructure/        # Infrastructure Layer
│   ├── db/                    # Database (TypeORM)
│   ├── security/              # JWT, password hashing
│   ├── messaging/             # Email, RabbitMQ
│   ├── cache/                 # Redis, in-memory
│   └── logging/               # Pino logger
│
└── APP.Shared/                # Shared Layer
    ├── dtos/                   # Data Transfer Objects
    ├── interfaces/             # Service contracts
    ├── exceptions/             # Custom exceptions
    ├── enums/                  # Enumerations
    └── models/                 # Shared models
```

---

## 📚 API Documentation

### Swagger UI

Once the server is running, visit:
- **Swagger UI**: http://localhost:3000/swagger

### Authentication Endpoints

#### Register User
```http
POST /auth/register?orgId=<org-id>
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

#### Login
```http
POST /auth/login?orgId=<org-id>
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "roles": ["admin"],
    "permissions": ["todo:create", "todo:read"]
  }
}
```

#### Refresh Token
```http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Organization Endpoints

#### List Organizations
```http
GET /organizations?pageNumber=1&pageSize=10&sortColumns=name&sortDirections=asc
Authorization: Bearer <access-token>
```

#### Search Organizations (Advanced)
```http
POST /organizations/search
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "pageNumber": 1,
  "pageSize": 10,
  "sortColumns": "name,createdAt",
  "sortDirections": "asc,desc",
  "filters": [
    {
      "propertyName": "name",
      "operator": "contains",
      "value": "Acme"
    }
  ]
}
```

#### Get Organization by ID
```http
GET /organizations/:id
Authorization: Bearer <access-token>
```

#### Create Organization
```http
POST /organizations
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "name": "Acme Corporation"
}
```

---

## 🔐 Authentication

### How It Works

1. **User logs in** → Receives `accessToken` (15 min) and `refreshToken` (7 days)
2. **Use accessToken** → Include in `Authorization: Bearer <token>` header
3. **Token expires** → Use `refreshToken` to get new tokens
4. **Guards validate** → `JwtAuthGuard` validates token and extracts user info

### Using Protected Endpoints

```typescript
// Include token in request header
const response = await fetch('http://localhost:3000/organizations', {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  }
});
```

### Role-Based Access Control

```typescript
// Require specific permission
@UseGuards(JwtAuthGuard, PermissionGuard)
@RequirePermission(Permission.TODO_CREATE)
@Post('todos')
async createTodo() { }

// Require specific role
@UseGuards(JwtAuthGuard, RoleGuard)
@RequireRole(Role.ADMIN)
@Delete('todos/:id')
async deleteTodo() { }
```

---

## 💻 Development

### Available Scripts

```bash
# Development
npm run start:dev          # Start with hot reload

# Production
npm run build               # Build for production
npm run start:prod         # Start production server

# Database
npm run typeorm:gen         # Generate migration
npm run typeorm:run         # Run migrations
npm run typeorm:revert     # Revert last migration

# Testing
npm run test                # Unit tests
npm run test:watch          # Watch mode
npm run test:e2e           # E2E tests
```

### Code Style

- **TypeScript**: Strict mode enabled
- **Linting**: ESLint with Prettier
- **Path Aliases**: Use `@api`, `@bll`, `@infra`, `@entity`, `@shared`

### Adding a New Feature

1. **Create Entity** (if needed)
   ```typescript
   // src/APP.Entity/entities/MyEntity.entity.ts
   @Entity('my_entities')
   export class MyEntity extends BaseEntity {
     @Column()
     name!: string;
   }
   ```

2. **Create DTOs**
   ```typescript
   // src/APP.Shared/dtos/myfeature/CreateMyEntityDto.dto.ts
   export class CreateMyEntityDto {
     @IsString()
     name!: string;
   }
   ```

3. **Create Service Interface**
   ```typescript
   // src/APP.Shared/interfaces/services/IMyEntityService.interface.ts
   export interface IMyEntityService {
     create(dto: CreateMyEntityDto): Promise<MyEntityResponseDto>;
   }
   ```

4. **Implement Service**
   ```typescript
   // src/APP.BLL/services/MyEntityService.service.ts
   @Injectable()
   export class MyEntityService extends BaseService<MyEntity> 
     implements IMyEntityService {
     // Implementation
   }
   ```

5. **Create Controller**
   ```typescript
   // src/APP.API/feature-controllers/myfeature/MyEntityController.controller.ts
   @Controller('my-entities')
   export class MyEntityController {
     // Endpoints
   }
   ```

6. **Register Module**
   ```typescript
   // Add to ApiModule imports
   ```

---

## 🧪 Testing

### Unit Tests

```bash
npm run test
```

### E2E Tests

```bash
npm run test:e2e
```

### Test Structure

```typescript
describe('AuthService', () => {
  it('should login user with valid credentials', async () => {
    // Test implementation
  });
});
```

---

## 🚢 Deployment

### Environment Variables

Required environment variables:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `PORT` - Server port (default: 3000)

### Production Build

```bash
npm run build
npm run start:prod
```

### Docker (Optional)

```bash
docker-compose up -d
```

---

## 📖 Documentation

### Architecture Documentation

For a complete understanding of the architecture, patterns, and design decisions:

📘 **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Complete architecture guide

Includes:
- Layer-by-layer breakdown
- Request flow diagrams
- Authentication flow
- Business logic patterns
- Best practices
- Learning path

### Key Concepts

- **Layered Architecture**: Clear separation of concerns
- **Interface-Based DI**: Programming to interfaces
- **BLL Pattern**: Business logic in services
- **DTO Mapping**: Entity ↔ DTO conversion
- **QueryBuilder Extensions**: Reusable query patterns

---

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Add tests
4. Submit a pull request

---

## 📝 License

This project is private and proprietary.

---

## 🙏 Acknowledgments

- Built with [NestJS](https://nestjs.com/)
- Inspired by .NET Core architecture patterns
- Uses [TypeORM](https://typeorm.io/) for database access

---

**Happy Coding! 🚀**
