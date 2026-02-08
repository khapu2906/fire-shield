# Audit Logging

Comprehensive audit logging system for tracking permission checks, authorization events, and compliance.

## Overview

Fire Shield provides built-in audit logging to track all permission checks, helping with:
- **Security**: Track unauthorized access attempts
- **Compliance**: GDPR, SOC2, HIPAA requirements
- **Debugging**: Find permission logic errors
- **Analytics**: Understand user behavior patterns

## Audit Loggers

### ConsoleAuditLogger

Logs events to console (ideal for development).

```typescript
import { RBAC, ConsoleAuditLogger } from '@fire-shield/core';

const rbac = new RBAC({
  auditLogger: new ConsoleAuditLogger()
});
```

**Output:**
```
[AUDIT 2025-01-15T10:30:00.000Z] ✓ ALLOWED: User user-123 - post:read
[AUDIT 2025-01-15T10:30:01.000Z] ✗ DENIED: User user-123 - admin:delete
  Reason: User lacks permission: admin:delete
```

### BufferedAuditLogger

Buffers events and flushes in batches (recommended for production).

```typescript
import { BufferedAuditLogger } from '@fire-shield/core';

const logger = new BufferedAuditLogger(
  async (events) => {
    // Save to database
    await db.auditLogs.insertMany(events);
  },
  {
    maxBufferSize: 100,       // Flush after 100 events
    flushIntervalMs: 5000     // Or every 5 seconds
  }
);

const rbac = new RBAC({ auditLogger: logger });
```

**Options:**
```typescript
interface BufferedAuditLoggerOptions {
  maxBufferSize?: number;      // Default: 100
  flushIntervalMs?: number;    // Default: 5000
}
```

### MultiAuditLogger

Log to multiple destinations simultaneously.

```typescript
import { MultiAuditLogger, ConsoleAuditLogger, BufferedAuditLogger } from '@fire-shield/core';

const logger = new MultiAuditLogger([
  new ConsoleAuditLogger(),
  new BufferedAuditLogger(async (events) => {
    await db.auditLogs.insertMany(events);
  })
]);

const rbac = new RBAC({ auditLogger: logger });
```

## Audit Event Structure

```typescript
interface AuditEvent {
  // Event type
  type: 'permission_check' | 'authorization' | 'role_check';

  // User information
  userId: string;

  // Permission being checked
  permission: string;

  // Result
  allowed: boolean;

  // Reason for denial (if denied)
  reason?: string;

  // Additional context
  context?: {
    roles?: string[];
    ip?: string;
    userAgent?: string;
    resource?: string;
    action?: string;
    metadata?: Record<string, any>;
  };

  // Timestamp (milliseconds since epoch)
  timestamp: number;
}
```

**Example:**
```typescript
{
  type: 'permission_check',
  userId: 'user-123',
  permission: 'post:write',
  allowed: false,
  reason: 'User lacks permission: post:write',
  context: {
    roles: ['viewer'],
    ip: '192.168.1.1',
    userAgent: 'Mozilla/5.0...'
  },
  timestamp: 1642345678901
}
```

## Custom Audit Logger

Implement your own audit logger:

```typescript
import type { AuditLogger, AuditEvent } from '@fire-shield/core';

class DatabaseAuditLogger implements AuditLogger {
  async log(event: AuditEvent): Promise<void> {
    await database.auditLogs.insert({
      type: event.type,
      userId: event.userId,
      permission: event.permission,
      allowed: event.allowed,
      reason: event.reason,
      context: event.context,
      createdAt: new Date(event.timestamp)
    });
  }
}

const rbac = new RBAC({
  auditLogger: new DatabaseAuditLogger()
});
```

## Real-World Examples

### Security Monitoring

Track failed authorization attempts and alert on suspicious activity:

```typescript
class SecurityMonitorLogger implements AuditLogger {
  private failedAttempts = new Map<string, number>();

  log(event: AuditEvent): void {
    if (!event.allowed) {
      // Track failed attempts
      const count = (this.failedAttempts.get(event.userId) || 0) + 1;
      this.failedAttempts.set(event.userId, count);

      // Alert after 5 failed attempts
      if (count >= 5) {
        this.alertSecurityTeam({
          userId: event.userId,
          failedAttempts: count,
          lastPermission: event.permission,
          timestamp: event.timestamp
        });
      }
    } else {
      // Reset on successful check
      this.failedAttempts.delete(event.userId);
    }
  }

  private alertSecurityTeam(alert: any) {
    console.warn('⚠️ Security Alert:', alert);
    // Send to monitoring service
  }
}
```

### Compliance Logging

Store audit logs for compliance (GDPR, HIPAA, SOC2):

```typescript
class ComplianceLogger implements AuditLogger {
  async log(event: AuditEvent): Promise<void> {
    // Store with encryption
    await database.auditLogs.insert({
      ...event,
      encrypted: true,
      retentionPeriod: '7years', // Compliance requirement
      compliance: {
        gdpr: true,
        hipaa: event.permission.includes('medical'),
        soc2: true
      }
    });

    // Also send to compliance monitoring service
    await fetch('https://compliance.example.com/audit', {
      method: 'POST',
      body: JSON.stringify(event)
    });
  }
}
```

### Analytics Logger

Track permission usage patterns:

```typescript
class AnalyticsLogger implements AuditLogger {
  private analytics = new Map<string, number>();

  log(event: AuditEvent): void {
    // Track permission usage
    const key = `${event.permission}:${event.allowed ? 'allowed' : 'denied'}`;
    const count = (this.analytics.get(key) || 0) + 1;
    this.analytics.set(key, count);

    // Send to analytics service every 100 events
    if (this.getTotalCount() % 100 === 0) {
      this.sendAnalytics();
    }
  }

  private getTotalCount(): number {
    return Array.from(this.analytics.values()).reduce((a, b) => a + b, 0);
  }

  private sendAnalytics() {
    const stats = Object.fromEntries(this.analytics);
    console.log('📊 Permission Analytics:', stats);
  }
}
```

### Database Logger with Rotation

Store logs in database with automatic rotation:

```typescript
class RotatingDatabaseLogger implements AuditLogger {
  private buffer: AuditEvent[] = [];
  private readonly maxAge = 90 * 24 * 60 * 60 * 1000; // 90 days

  async log(event: AuditEvent): Promise<void> {
    this.buffer.push(event);

    // Flush every 50 events
    if (this.buffer.length >= 50) {
      await this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    // Insert new logs
    await db.auditLogs.insertMany(this.buffer);
    this.buffer = [];

    // Delete old logs
    const cutoff = Date.now() - this.maxAge;
    await db.auditLogs.deleteMany({
      timestamp: { $lt: cutoff }
    });
  }
}
```

## Querying Audit Logs

### Filter by User

```typescript
const userLogs = await db.auditLogs.find({
  userId: 'user-123'
}).sort({ timestamp: -1 }).limit(100);
```

### Filter by Permission

```typescript
const permissionLogs = await db.auditLogs.find({
  permission: 'admin:delete'
}).sort({ timestamp: -1 });
```

### Failed Attempts

```typescript
const failedAttempts = await db.auditLogs.find({
  allowed: false
}).sort({ timestamp: -1 });
```

### Time Range

```typescript
const recentLogs = await db.auditLogs.find({
  timestamp: {
    $gte: Date.now() - 24 * 60 * 60 * 1000 // Last 24 hours
  }
});
```

## Performance Considerations

### Buffering

Always use BufferedAuditLogger in production:

```typescript
// ✅ Good: Buffered for performance
const logger = new BufferedAuditLogger(async (events) => {
  await db.auditLogs.insertMany(events);
}, { maxBufferSize: 100 });

// ❌ Avoid: Synchronous logging on every check
const logger = {
  log: (event) => db.auditLogs.insert(event) // Blocks on every check!
};
```

### Async Logging

Make logging operations async:

```typescript
class AsyncLogger implements AuditLogger {
  async log(event: AuditEvent): Promise<void> {
    // Don't await - fire and forget
    this.saveToDatabase(event).catch(err => {
      console.error('Failed to save audit log:', err);
    });
  }

  private async saveToDatabase(event: AuditEvent) {
    await db.auditLogs.insert(event);
  }
}
```

### Sampling

For high-traffic applications, sample logs:

```typescript
class SamplingLogger implements AuditLogger {
  private sampleRate = 0.1; // Log 10% of events

  log(event: AuditEvent): void {
    // Always log denied events
    if (!event.allowed) {
      this.saveLog(event);
      return;
    }

    // Sample allowed events
    if (Math.random() < this.sampleRate) {
      this.saveLog(event);
    }
  }

  private saveLog(event: AuditEvent) {
    // Save to database
  }
}
```

## Best Practices

### 1. Use Buffered Logging in Production

```typescript
// ✅ Good: Buffered logging
const logger = new BufferedAuditLogger(
  async (events) => await db.auditLogs.insertMany(events),
  { maxBufferSize: 100, flushIntervalMs: 5000 }
);
```

### 2. Include Context

```typescript
// ✅ Good: Rich context
const result = rbac.authorize(user, 'admin:delete', {
  ip: request.ip,
  userAgent: request.headers['user-agent'],
  resource: 'user',
  resourceId: userId
});
```

### 3. Rotate Old Logs

```typescript
// Scheduled job to delete old logs
setInterval(async () => {
  const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000; // 90 days
  await db.auditLogs.deleteMany({ timestamp: { $lt: cutoff } });
}, 24 * 60 * 60 * 1000); // Run daily
```

### 4. Monitor Failed Attempts

```typescript
// Alert on repeated failures
const failures = await db.auditLogs.countDocuments({
  userId: user.id,
  allowed: false,
  timestamp: { $gte: Date.now() - 60 * 60 * 1000 } // Last hour
});

if (failures > 10) {
  await alertSecurityTeam(user.id);
}
```

## Next Steps

- Learn about [Core API](/api/core)
- Explore [TypeScript Types](/api/types)
- Check out [Performance Guide](/guide/performance)
