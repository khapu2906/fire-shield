import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, map } from 'rxjs';
import { RBAC, type RBACUser, type AuthorizationResult } from '@fire-shield/core';

/**
 * Angular RBAC Service
 *
 * Provides reactive RBAC functionality through Angular's dependency injection
 */
@Injectable({
  providedIn: 'root'
})
export class RBACService {
  private rbacInstance!: RBAC;
  private userSubject = new BehaviorSubject<RBACUser | null>(null);

  /**
   * Observable of current user
   */
  public readonly user$: Observable<RBACUser | null> = this.userSubject.asObservable();

  /**
   * Initialize the RBAC service with an RBAC instance
   */
  initialize(rbac: RBAC, initialUser: RBACUser | null = null): void {
    this.rbacInstance = rbac;
    if (initialUser) {
      this.userSubject.next(initialUser);
    }
  }

  /**
   * Get the RBAC instance
   */
  getRBAC(): RBAC {
    if (!this.rbacInstance) {
      throw new Error('[Fire Shield] RBACService not initialized. Call initialize() first.');
    }
    return this.rbacInstance;
  }

  /**
   * Get current user
   */
  getUser(): RBACUser | null {
    return this.userSubject.value;
  }

  /**
   * Set current user
   */
  setUser(user: RBACUser | null): void {
    this.userSubject.next(user);
  }

  /**
   * Check if current user has permission (observable)
   */
  can$(permission: string): Observable<boolean> {
    return this.user$.pipe(
      map(user => {
        if (!user) return false;
        return this.rbacInstance.hasPermission(user, permission);
      })
    );
  }

  /**
   * Check if current user has permission (synchronous)
   */
  can(permission: string): boolean {
    const user = this.userSubject.value;
    if (!user) return false;
    return this.rbacInstance.hasPermission(user, permission);
  }

  /**
   * Check if current user has role (observable)
   */
  hasRole$(role: string): Observable<boolean> {
    return this.user$.pipe(
      map(user => {
        if (!user) return false;
        return user.roles?.includes(role) || false;
      })
    );
  }

  /**
   * Check if current user has role (synchronous)
   */
  hasRole(role: string): boolean {
    const user = this.userSubject.value;
    if (!user) return false;
    return user.roles?.includes(role) || false;
  }

  /**
   * Authorize current user (observable)
   */
  authorize$(permission: string): Observable<AuthorizationResult> {
    return this.user$.pipe(
      map(user => {
        if (!user) {
          return {
            allowed: false,
            reason: 'No user found'
          };
        }
        return this.rbacInstance.authorize(user, permission);
      })
    );
  }

  /**
   * Authorize current user (synchronous)
   */
  authorize(permission: string): AuthorizationResult {
    const user = this.userSubject.value;
    if (!user) {
      return {
        allowed: false,
        reason: 'No user found'
      };
    }
    return this.rbacInstance.authorize(user, permission);
  }

  /**
   * Check if user has all permissions (observable)
   */
  canAll$(permissions: string[]): Observable<boolean> {
    return this.user$.pipe(
      map(user => {
        if (!user) return false;
        return permissions.every(permission =>
          this.rbacInstance.hasPermission(user, permission)
        );
      })
    );
  }

  /**
   * Check if user has all permissions (synchronous)
   */
  canAll(permissions: string[]): boolean {
    const user = this.userSubject.value;
    if (!user) return false;
    return permissions.every(permission =>
      this.rbacInstance.hasPermission(user, permission)
    );
  }

  /**
   * Check if user has any permission (observable)
   */
  canAny$(permissions: string[]): Observable<boolean> {
    return this.user$.pipe(
      map(user => {
        if (!user) return false;
        return permissions.some(permission =>
          this.rbacInstance.hasPermission(user, permission)
        );
      })
    );
  }

  /**
   * Check if user has any permission (synchronous)
   */
  canAny(permissions: string[]): boolean {
    const user = this.userSubject.value;
    if (!user) return false;
    return permissions.some(permission =>
      this.rbacInstance.hasPermission(user, permission)
    );
  }
}
