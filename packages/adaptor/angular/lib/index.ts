// Service
export { RBACService } from './rbac.service';

// Directives
export { CanPermissionDirective, HasRoleDirective, CannotPermissionDirective, DeniedDirective, NotDeniedDirective } from './can.directive';

// Guards
export { canActivatePermission, canActivateRole, canActivateRBAC, canActivateNotDenied, type RBACRouteData } from './rbac.guard';

// Re-export core types
export type { RBACUser, AuthorizationResult } from '@fire-shield/core';
export { RBAC } from '@fire-shield/core';
