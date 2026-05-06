/**
 * Dependency Injection Tokens
 *
 * This file contains all DI tokens used for interface-based dependency injection.
 * Following .NET's approach of programming to interfaces, not implementations.
 *
 * Usage:
 * - Define: export const IServiceName = Symbol('IServiceName');
 * - Register: { provide: IServiceName, useClass: ServiceNameImpl }
 * - Inject: @Inject(IServiceName) private readonly _service: IServiceName
 */

// ============================================================================
// Core Infrastructure Tokens
// ============================================================================

/**
 * Token for ILogger
 * Provides structured logging capabilities (Pino implementation)
 */
export const ILogger = Symbol('ILogger');

/**
 * Token for IMapper
 * Provides object-to-object mapping (AutoMapper implementation)
 */
export const IMapper = Symbol('IMapper');

// ============================================================================
// Service Layer Tokens (APP.BLL)
// ============================================================================

/**
 * Token for IOrganizationService
 * Manages organization CRUD operations with pagination and filtering
 */
export const IOrganizationService = Symbol('IOrganizationService');

/**
 * Token for ITodoService (future implementation)
 * Manages todo CRUD operations with optimistic locking
 */
export const ITodoService = Symbol('ITodoService');

/**
 * Token for IProjectService (future implementation)
 * Manages project CRUD operations
 */
export const IProjectService = Symbol('IProjectService');

/**
 * Token for IUserService (future implementation)
 * Manages user CRUD operations with authentication
 */
export const IUserService = Symbol('IUserService');

/**
 * Token for INotificationService
 * Manages email and message notifications
 */
export const INotificationService = Symbol('INotificationService');

/**
 * Token for IAuthService
 * Manages authentication and authorization operations
 */
export const IAuthService = Symbol('IAuthService');

// ============================================================================
// Infrastructure Layer Tokens (APP.Infrastructure)
// ============================================================================

/**
 * Token for ICacheService (future implementation)
 * Provides caching abstraction (Redis implementation)
 */
export const ICacheService = Symbol('ICacheService');

/**
 * Token for IMessageSender (future implementation)
 * Provides message bus abstraction (RabbitMQ implementation)
 */
export const IMessageSender = Symbol('IMessageSender');

/**
 * Token for IEmailSender (future implementation)
 * Provides email sending abstraction (SMTP implementation)
 */
export const IEmailSender = Symbol('IEmailSender');

/**
 * Token for IEventBus (future implementation)
 * Provides domain event publishing abstraction
 */
export const IEventBus = Symbol('IEventBus');

/**
 * Token for IRateLimitingStorage
 * Provides rate limiting storage abstraction (Redis implementation)
 */
export const IRateLimitingStorage = Symbol('IRateLimitingStorage');

// ============================================================================
// Security Layer Tokens
// ============================================================================

/**
 * Token for IJwtService (future implementation)
 * Provides JWT token generation and validation
 */
export const IJwtService = Symbol('IJwtService');

/**
 * Token for IPasswordHasher (future implementation)
 * Provides password hashing abstraction (bcrypt implementation)
 */
export const IPasswordHasher = Symbol('IPasswordHasher');

/**
 * Token for ISmsService
 * Provides SMS sending abstraction (external provider implementation)
 */
export const ISmsService = Symbol('ISmsService');

/**
 * Token for IStorageService
 * Provides object storage abstraction (Backblaze B2 implementation)
 */
export const IStorageService = Symbol('IStorageService');

// ============================================================================
// Configuration Tokens
// ============================================================================

/**
 * Token for IInfrastructureConfig
 * Provides infrastructure layer configuration (database, email, cache, messaging)
 */
export const IInfrastructureConfig = Symbol('IInfrastructureConfig');

/**
 * Token for IApplicationConfig
 * Provides application/business logic layer configuration (auth, pagination)
 */
export const IApplicationConfig = Symbol('IApplicationConfig');

/**
 * Token for ISecurityConfig
 * Provides security layer configuration (JWT, OAuth)
 */
export const ISecurityConfig = Symbol('ISecurityConfig');

/**
 * Token for IApiConfig
 * Provides API/presentation layer configuration (CORS, rate limiting)
 */
export const IApiConfig = Symbol('IApiConfig');

// ============================================================================
// Bulk Import (Data Entry)
// ============================================================================

/**
 * Token for IFileStore
 * File operations for bulk import (Staging, Reviewed, Errors, Archive)
 */
export const IFileStore = Symbol('IFileStore');

/**
 * Token for ICsvImportProcessor
 * Processes import rows in a transaction (e.g. university resolution)
 */
export const ICsvImportProcessor = Symbol('ICsvImportProcessor');

/**
 * Token for UniversityImportConfig
 * Folder names and behaviour for university CSV import
 */
export const UniversityImportConfig = Symbol('UniversityImportConfig');

/**
 * Token for IFileStore (course bulk import — separate base path from university)
 */
export const IFileStoreCourse = Symbol('IFileStoreCourse');

/**
 * Token for CourseImportConfig
 * Folder names and behaviour for course CSV import
 */
export const CourseImportConfig = Symbol('CourseImportConfig');
