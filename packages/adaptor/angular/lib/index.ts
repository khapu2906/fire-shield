// Service
export { RBACService } from './rbac.service';

// Directives
export { CanPermissionDirective, HasRoleDirective, CannotPermissionDirective } from './can.directive';

// Guards
export { canActivatePermission, canActivateRole, canActivateRBAC, type RBACRouteData } from './rbac.guard';

// Re-export core types
export type { RBACUser, AuthorizationResult } from '@fire-shield/core';
export { RBAC } from '@fire-shield/core';
