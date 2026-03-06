# SCOL Backend — Project Tree

A **NestJS** REST API with **Clean Architecture** (API → BLL → Entity + Shared + Infrastructure).  
*Excludes: `node_modules`, `dist`, `.git`*

---

## Root

```
scol-backend/
├── api/                    # Vercel serverless entry
│   └── index.js
├── migrations/             # TypeORM migrations (generated)
├── src/                    # Application source
├── test/                   # E2E tests
│   ├── app.e2e-spec.ts
│   └── jest-e2e.json
├── .env, .env.local        # Environment (not committed)
├── docker-compose.yml     # PostgreSQL + Redis
├── nest-cli.json          # Nest CLI config
├── package.json
├── tsconfig.json, tsconfig.build.json
├── eslint.config.mjs
├── .prettierrc
├── vercel.json            # Vercel deployment
├── env.example.txt        # Env template
├── DEV.GUIDE.md
├── README.md
└── Useful-Sql-to-debug.md
```

---

## Source (`src/`) — Layer Overview

| Layer | Folder | Role |
|-------|--------|------|
| **API** | `APP.API` | HTTP controllers, guards, filters, Swagger |
| **BLL** | `APP.BLL` | Business logic, services, mappers |
| **Entity** | `APP.Entity` | Domain entities (TypeORM) |
| **Infrastructure** | `APP.Infrastructure` | DB, Redis, JWT, SMS, config, logging |
| **Shared** | `APP.Shared` | DTOs, enums, interfaces, exceptions, utils |

---

## Source Tree (detailed)

```
src/
├── main.ts                 # Bootstrap entry
├── bootstrap.ts            # App factory (Nest)
├── AppModule.module.ts     # Root module (imports all layers)

├── APP.API/                # ─── API Layer ─────────────────────────
│   ├── ApiModule.module.ts
│   ├── common/
│   │   ├── decorators/     # @CurrentUser, @RequireRole, @RateLimit, etc.
│   │   ├── filters/        # HttpExceptionFilter
│   │   ├── guards/         # JwtAuthGuard, PermissionGuard, RoleGuard, etc.
│   │   ├── interceptors/   # ResponseInterceptor, UserContextInterceptor
│   │   ├── middleware/     # RequestLoggingMiddleware
│   │   └── swagger/        # Swagger docs registry
│   └── feature-controllers/
│       ├── auth/           # AuthController, auth swagger
│       ├── categories/     # CategoriesController (cities, countries, etc.)
│       ├── health/         # HealthController
│       ├── home/           # HomeController (home search)
│       ├── internal/       # InternalCronController
│       ├── leads/          # LeadsProfileController (lead/academic form)
│       └── search/         # SearchController (course search)
│
├── APP.BLL/                # ─── Business Logic Layer ──────────────
│   ├── core/
│   │   └── BaseService.ts
│   ├── mappings/
│   │   ├── MappingModule.module.ts
│   │   ├── mapping.tokens.ts
│   │   ├── auth/           # AuthResponseMapper, UserResponseMapper
│   │   ├── mappers/        # Shared mappers
│   │   └── search/         # CourseResponseMapper
│   └── services/
│       ├── auth/           # AuthService, TokenService
│       ├── categories/     # CategoriesService
│       ├── health/         # Health checks
│       ├── leads/          # LeadProfileService, AcademicFormValidator, AcademicFormMapper
│       └── search/         # CourseSearchService, HomeSearchService, pipeline, cache, filters
│
├── APP.Entity/             # ─── Domain / Data Layer ───────────────
│   ├── domain.events/      # (if any)
│   └── entities/
│       ├── BaseEntity.template.ts
│       ├── Lead*           # Lead academic, English test, preferred countries/programs
│       ├── OtpSession, UserSessions, UserRoles, UserPermissions
│       ├── Sys*            # SysUsers, SysRoles, SysCountries, SysCities, SysProgrammes, etc.
│       └── Uni*            # UniCourses, UniCourseIntakes, UniEngReq, UniAcademicReq, etc.
│
├── APP.Infrastructure/     # ─── Infra (DB, Redis, Auth, Config) ───
│   ├── InfrastructureModule.module.ts
│   ├── config/             # AppConfigModule, env schema, stage
│   ├── db/
│   │   ├── extensions/
│   │   └── typeorm/        # TypeOrmModule, AppDbContext, AppDataSource
│   ├── logging/            # Logger, LoggingModule
│   ├── redis/              # RedisModule, cache, rate-limiting
│   ├── security/           # JwtService, PasswordHasher, SecurityModule
│   └── sms/                # SmsService, SmsModule
│
└── APP.Shared/             # ─── Shared (DTOs, enums, utils) ──────
    ├── constants/
    ├── context/            # UserContextAccessor
    ├── dtos/
    │   ├── auth/           # AuthResponseDto, TokenRefreshResponseDto, etc.
    │   ├── categories/     # CitiesResponseDto, etc.
    │   ├── common/
    │   ├── leads/          # AcademicFormRequestDto, EnglishTest DTOs, etc.
    │   └── search/         # SearchRequestDto, CourseResultDto, CursorPaginationDto, etc.
    ├── enums/              # Role, Permission, UserStatus, AcademicFormStatus, etc.
    ├── exceptions/        # BusinessException, ValidationException, auth exceptions
    ├── helpers/            # SortAndFilterHelper
    ├── interfaces/         # Auth, config, domain, logging, security, services, search
    ├── mappers/            # JwtPayloadToCurrentUser
    ├── models/             # Filter, PagedQuery, PaginatedResponse
    ├── search/             # SearchTypes
    ├── tokens/             # injection.tokens
    └── utils/              # PhoneNumberUtil
```

---

## Request flow (at a glance)

1. **HTTP** → `APP.API` (controller + guards/filters)
2. **Controller** → `APP.BLL` services
3. **Services** → `APP.Entity` (via TypeORM) + `APP.Infrastructure` (Redis, JWT, SMS)
4. **Shared** used by API, BLL, and Infra (DTOs, enums, interfaces)

---

## Feature areas

| Feature | API Controller | BLL Service(s) | Main entities |
|--------|----------------|----------------|----------------|
| Auth | `auth` | AuthService, TokenService | SysUsers, UserSessions, OtpSession |
| Categories | `categories` | CategoriesService | SysCountries, SysCities, SysStates, etc. |
| Search | `search`, `home` | CourseSearchService, HomeSearchService | UniCourses, UniCourseIntakes, etc. |
| Leads | `leads` | LeadProfileService, AcademicForm* | Lead*, SysLeadProfiles |

Use this file to navigate the codebase quickly.
