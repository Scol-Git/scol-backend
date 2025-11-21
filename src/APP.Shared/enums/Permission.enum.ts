/**
 * Permission Enum
 * 
 * Defines all available permissions in the system.
 * Permissions follow resource:action format (e.g., 'todo:create', 'project:delete').
 * 
 * @enum Permission
 */
export enum Permission {
  // Todo permissions
  TODO_CREATE = 'todo:create',
  TODO_READ = 'todo:read',
  TODO_UPDATE = 'todo:update',
  TODO_DELETE = 'todo:delete',
  
  // Project permissions
  PROJECT_CREATE = 'project:create',
  PROJECT_READ = 'project:read',
  PROJECT_UPDATE = 'project:update',
  PROJECT_DELETE = 'project:delete',
  
  // User permissions
  USER_CREATE = 'user:create',
  USER_READ = 'user:read',
  USER_UPDATE = 'user:update',
  USER_DELETE = 'user:delete',
  USER_MANAGE = 'user:manage',
  
  // Organization permissions
  ORGANIZATION_CREATE = 'organization:create',
  ORGANIZATION_READ = 'organization:read',
  ORGANIZATION_UPDATE = 'organization:update',
  ORGANIZATION_DELETE = 'organization:delete',
}

