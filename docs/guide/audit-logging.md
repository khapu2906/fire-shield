# Audit Logging

Complete guide to implementing audit logging for security, compliance, and debugging.

## Why Audit Logging?

Audit logging provides:
- **Security**: Track unauthorized access attempts
- **Compliance**: Meet GDPR, SOC2, HIPAA requirements
- **Debugging**: Identify permission configuration issues
- **Analytics**: Understand user behavior patterns
- **Forensics**: Investigate security incidents

## Quick Start

```typescript
import { RBAC, ConsoleAuditLogger } from '@fire-shield/core';

const rbac = new RBAC({
  auditLogger: new ConsoleAuditLogger()
});

// All permission checks are automatically logged
rbac.hasPermission(user, 'post:delete');
// [AUDIT] ✓ ALLOWED: User user-123 - post:delete
```

## Built-in Loggers

### ConsoleAuditLogger

Development logger that outputs to console:

```typescript
import { ConsoleAuditLogger } from '@fire-shield/core';

const logger = new ConsoleAuditLogger();
const rbac = new RBAC({ auditLogger: logger });
```

**Output Example:**
```
[AUDIT 2025-01-15T10:30:00.000Z] ✓ ALLOWED: User user-123 - post:read
[AUDIT 2025-01-15T10:30:01.000Z] ✗ DENIED: User user-123 - admin:delete
  Reason: User lacks permission: admin:delete
```

### BufferedAuditLogger

Production logger with batching:

```typescript
import { BufferedAuditLogger } from '@fire-shield/core';

const logger = new BufferedAuditLogger(
  async (events) => {
    await database.auditLogs.insertMany(events);
  },
  {
    maxBufferSize: 100,      // Flush after 100 events
    flushIntervalMs: 5000    // Or every 5 seconds
  }
);

const rbac = new RBAC({ auditLogger: logger });
```

### MultiAuditLogger

Log to multiple destinations:

```typescript
import { MultiAuditLogger, ConsoleAuditLogger, BufferedAuditLogger } from '@fire-shield/core';

const logger = new MultiAuditLogger([
  new ConsoleAuditLogger(), // Development
  new BufferedAuditLogger(async (events) => {
    await database.save(events); // Production
  })
]);

const rbac = new RBAC({ auditLogger: logger });
```

## Custom Loggers

### Basic Custom Logger

```typescript
import type { AuditLogger, AuditEvent } from '@fire-shield/core';

class FileAuditLogger implements AuditLogger {
  async log(event: AuditEvent): Promise<void> {
    const logEntry = `${new Date(event.timestamp).toISOString()} - ${event.userId} - ${event.permission} - ${event.allowed ? 'ALLOW' : 'DENY'}\n`;

    await fs.appendFile('audit.log', logEntry);
  }
}

const rbac = new RBAC({ auditLogger: new FileAuditLogger() });
```

### Database Logger

```typescript
class DatabaseLogger implements AuditLogger {
  async log(event: AuditEvent): Promise<void> {
    await db.auditLogs.insert({
      userId: event.userId,
      permission: event.permission,
      allowed: event.allowed,
      reason: event.reason,
      timestamp: new Date(event.timestamp),
      context: event.context
    });
  }
}
```

### Security Monitoring Logger

```typescript
class SecurityMonitorLogger implements AuditLogger {
  private failedAttempts = new Map<string, number>();
  private readonly threshold = 5;

  log(event: AuditEvent): void {
    if (!event.allowed) {
      const count = (this.failedAttempts.get(event.userId) || 0) + 1;
      this.failedAttempts.set(event.userId, count);

      if (count >= this.threshold) {
        this.alertSecurityTeam({
          userId: event.userId,
          attempts: count,
          permission: event.permission,
          timestamp: event.timestamp
        });
      }
    } else {
      // Reset on successful check
      this.failedAttempts.delete(event.userId);
    }
  }

  private alertSecurityTeam(alert: any) {
    console.warn('🚨 Security Alert:', alert);
    // Send to monitoring service
  }
}
```

## Real-World Examples

### E-Commerce Compliance

```typescript
class ComplianceLogger implements AuditLogger {
  async log(event: AuditEvent): Promise<void> {
    await db.auditLogs.insert({
      ...event,
      // Compliance metadata
      retentionPeriod: 7 * 365, // 7 years
      encrypted: true,
      compliance: {
        gdpr: true,
        pciDss: event.permission.includes('payment'),
        hipaa: event.permission.includes('health')
      }
    });

    // Also send to compliance monitoring
    await fetch('https://compliance.example.com/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event)
    });
  }
}
```

### Analytics Logger

```typescript
class AnalyticsLogger implements AuditLogger {
  private buffer: AuditEvent[] = [];

  log(event: AuditEvent): void {
    this.buffer.push(event);

    if (this.buffer.length >= 100) {
      this.sendAnalytics();
    }
  }

  private sendAnalytics() {
    const stats = {
      total: this.buffer.length,
      allowed: this.buffer.filter(e => e.allowed).length,
      denied: this.buffer.filter(e => !e.allowed).length,
      byPermission: this.groupByPermission(),
      byUser: this.groupByUser()
    };

    console.log('📊 Permission Analytics:', stats);
    this.buffer = [];
  }

  private groupByPermission() {
    return this.buffer.reduce((acc, event) => {
      acc[event.permission] = (acc[event.permission] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private groupByUser() {
    return this.buffer.reduce((acc, event) => {
      acc[event.userId] = (acc[event.userId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }
}
```

### Rotating Logger

```typescript
class RotatingFileLogger implements AuditLogger {
  private currentDate = new Date().toISOString().split('T')[0];
  private buffer: string[] = [];

  async log(event: AuditEvent): Promise<void> {
    const logDate = new Date(event.timestamp).toISOString().split('T')[0];

    // Rotate log file if date changed
    if (logDate !== this.currentDate) {
      await this.flush();
      await this.rotateOldLogs();
      this.currentDate = logDate;
    }

    const entry = JSON.stringify(event);
    this.buffer.push(entry);

    if (this.buffer.length >= 100) {
      await this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const filename = `audit-${this.currentDate}.log`;
    await fs.appendFile(filename, this.buffer.join('\n') + '\n');
    this.buffer = [];
  }

  private async rotateOldLogs() {
    const maxAge = 90 * 24 * 60 * 60 * 1000; // 90 days
    const cutoff = Date.now() - maxAge;

    const files = await fs.readdir('.');
    for (const file of files) {
      if (file.startsWith('audit-') && file.endsWith('.log')) {
        const stats = await fs.stat(file);
        if (stats.mtimeMs < cutoff) {
          await fs.unlink(file);
        }
      }
    }
  }
}
```

## Querying Audit Logs

### By User

```typescript
// Find all logs for a specific user
const userLogs = await db.auditLogs.find({
  userId: 'user-123'
}).sort({ timestamp: -1 }).limit(100);

// Find denied attempts for user
const deniedLogs = await db.auditLogs.find({
  userId: 'user-123',
  allowed: false
});
```

### By Permission

```typescript
// Find all attempts for a permission
const permissionLogs = await db.auditLogs.find({
  permission: 'admin:delete'
});

// Find denied admin permission attempts
const deniedAdminLogs = await db.auditLogs.find({
  permission: { $regex: '^admin:' },
  allowed: false
});
```

### By Time Range

```typescript
// Last 24 hours
const recentLogs = await db.auditLogs.find({
  timestamp: {
    $gte: Date.now() - 24 * 60 * 60 * 1000
  }
});

// Specific date range
const rangeLogs = await db.auditLogs.find({
  timestamp: {
    $gte: new Date('2025-01-01').getTime(),
    $lte: new Date('2025-01-31').getTime()
  }
});
```

### Aggregation

```typescript
// Count by permission
const permissionCounts = await db.auditLogs.aggregate([
  {
    $group: {
      _id: '$permission',
      count: { $sum: 1 },
      deniedCount: {
        $sum: { $cond: ['$allowed', 0, 1] }
      }
    }
  },
  { $sort: { count: -1 } }
]);

// Failed attempts by user
const userFailures = await db.auditLogs.aggregate([
  { $match: { allowed: false } },
  {
    $group: {
      _id: '$userId',
      failures: { $sum: 1 },
      permissions: { $addToSet: '$permission' }
    }
  },
  { $sort: { failures: -1 } }
]);
```

## Best Practices

### 1. Always Buffer in Production

```typescript
// ✅ Good: Buffered logging
const logger = new BufferedAuditLogger(
  async (events) => await db.insert(events),
  { maxBufferSize: 100 }
);

// ❌ Avoid: Synchronous logging on every check
const logger = {
  log: (event) => db.insert(event) // Blocks!
};
```

### 2. Include Context

```typescript
// ✅ Good: Rich context
const context = {
  roles: user.roles,
  ip: request.ip,
  userAgent: request.headers['user-agent'],
  resource: 'document',
  resourceId: docId
};

rbac.authorize(user, 'document:edit', context);

// Logs will include all context
```

### 3. Rotate Old Logs

```typescript
// Schedule log rotation
setInterval(async () => {
  const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
  await db.auditLogs.deleteMany({
    timestamp: { $lt: cutoff }
  });
}, 24 * 60 * 60 * 1000);
```

### 4. Monitor Failed Attempts

```typescript
// Alert on suspicious activity
async function checkForSuspiciousActivity() {
  const recentFailures = await db.auditLogs.countDocuments({
    userId: user.id,
    allowed: false,
    timestamp: { $gte: Date.now() - 60 * 60 * 1000 }
  });

  if (recentFailures > 10) {
    await alertSecurityTeam({
      userId: user.id,
      failures: recentFailures
    });
  }
}
```

### 5. Sampling for High Traffic

```typescript
class SamplingLogger implements AuditLogger {
  private sampleRate = 0.1; // 10%

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

## Performance Optimization

### Async Logging

```typescript
class AsyncLogger implements AuditLogger {
  async log(event: AuditEvent): Promise<void> {
    // Fire and forget
    this.saveToDatabase(event).catch(err => {
      console.error('Audit log error:', err);
    });
  }

  private async saveToDatabase(event: AuditEvent) {
    await db.auditLogs.insert(event);
  }
}
```

### Batch Processing

```typescript
class BatchLogger implements AuditLogger {
  private queue: AuditEvent[] = [];
  private processing = false;

  log(event: AuditEvent): void {
    this.queue.push(event);

    if (!this.processing && this.queue.length >= 50) {
      this.processBatch();
    }
  }

  private async processBatch() {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;
    const batch = this.queue.splice(0, 50);

    try {
      await db.auditLogs.insertMany(batch);
    } catch (error) {
      console.error('Batch insert failed:', error);
      // Re-queue failed events
      this.queue.unshift(...batch);
    } finally {
      this.processing = false;
    }
  }
}
```

## Compliance Requirements

### GDPR

```typescript
class GDPRCompliantLogger implements AuditLogger {
  async log(event: AuditEvent): Promise<void> {
    await db.auditLogs.insert({
      ...event,
      // GDPR metadata
      dataSubject: event.userId,
      processingPurpose: 'access_control',
      legalBasis: 'legitimate_interest',
      retentionPeriod: 90, // days
      consentId: event.context?.consentId
    });
  }

  // Implement right to erasure
  async eraseUserData(userId: string) {
    await db.auditLogs.updateMany(
      { userId },
      { $set: { userId: 'REDACTED', anonymized: true } }
    );
  }
}
```

### SOC 2

```typescript
class SOC2Logger implements AuditLogger {
  async log(event: AuditEvent): Promise<void> {
    await db.auditLogs.insert({
      ...event,
      // SOC 2 requirements
      immutable: true, // Cannot be modified
      signed: this.signEvent(event),
      controlId: 'AC-2', // Access control
      severity: event.allowed ? 'info' : 'warning'
    });
  }

  private signEvent(event: AuditEvent): string {
    // Digital signature for integrity
    return crypto
      .createHmac('sha256', SECRET_KEY)
      .update(JSON.stringify(event))
      .digest('hex');
  }
}
```

## Next Steps

- Explore [Core API](/api/core)
- Learn about [Performance](/guide/performance)
- Check out [API Reference](/api/audit)
