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

/**
 * Simple console audit logger (for development)
 */
export class ConsoleAuditLogger implements AuditLogger {
  log(event: AuditEvent): void {
    const status = event.allowed ? '✓ ALLOWED' : '✗ DENIED';
    const timestamp = new Date(event.timestamp).toISOString();

    console.log(`[AUDIT ${timestamp}] ${status}: User ${event.userId} - ${event.permission}`);

    if (!event.allowed && event.reason) {
      console.log(`  Reason: ${event.reason}`);
    }

    if (event.context) {
      console.log(`  Context:`, event.context);
    }
  }
}

/**
 * Buffered audit logger (batch writes)
 */
export class BufferedAuditLogger implements AuditLogger {
  private buffer: AuditEvent[] = [];
  private flushInterval: NodeJS.Timeout | null = null;

  constructor(
    private onFlush: (events: AuditEvent[]) => void | Promise<void>,
    private options: {
      maxBufferSize?: number;
      flushIntervalMs?: number;
    } = {}
  ) {
    const { maxBufferSize = 100, flushIntervalMs = 5000 } = options;

    // Auto-flush on interval
    if (flushIntervalMs > 0) {
      this.flushInterval = setInterval(() => {
        this.flush();
      }, flushIntervalMs);
    }
  }

  log(event: AuditEvent): void {
    this.buffer.push(event);

    // Flush if buffer is full
    const maxSize = this.options.maxBufferSize || 100;
    if (this.buffer.length >= maxSize) {
      this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const events = [...this.buffer];
    this.buffer = [];

    await this.onFlush(events);
  }

  destroy(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    this.flush();
  }
}

/**
 * Audit logger that writes to multiple destinations
 */
export class MultiAuditLogger implements AuditLogger {
  constructor(private loggers: AuditLogger[]) {}

  async log(event: AuditEvent): Promise<void> {
    await Promise.all(this.loggers.map(logger => logger.log(event)));
  }

  async flush(): Promise<void> {
    await Promise.all(
      this.loggers.map(logger => logger.flush?.())
    );
  }
}
