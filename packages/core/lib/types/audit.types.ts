/**
 * Audit Logging Types
 *
 * Types for tracking permission checks and authorization events
 */

/**
 * Audit event for permission checks
 */
export interface AuditEvent {
  /** Event type */
  type: 'permission_check' | 'authorization' | 'role_check';

  /** User who performed the action */
  userId: string;

  /** Permission or role being checked */
  permission: string;

  /** Whether access was granted */
  allowed: boolean;

  /** Reason for denial (if denied) */
  reason?: string;

  /** Additional context */
  context?: {
    /** User roles at time of check */
    roles?: string[];
    /** IP address */
    ip?: string;
    /** User agent */
    userAgent?: string;
    /** Resource being accessed */
    resource?: string;
    /** Action being performed */
    action?: string;
    /** Additional metadata */
    metadata?: Record<string, any>;
  };

  /** Timestamp */
  timestamp: number;
}

/**
 * Audit logger interface
 */
export interface AuditLogger {
  /**
   * Log an audit event
   */
  log(event: AuditEvent): void | Promise<void>;

  /**
   * Flush any buffered events (optional)
   */
  flush?(): void | Promise<void>;
}