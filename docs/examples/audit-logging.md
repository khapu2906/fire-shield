# Audit Logging Examples

Practical examples of implementing audit logging for compliance, security, and monitoring.

## Basic Audit Logging

Simple console-based audit logging:

```typescript
import { RBAC, ConsoleAuditLogger } from '@fire-shield/core';

// Create RBAC with console logger
const rbac = new RBAC({
  auditLogger: new ConsoleAuditLogger()
});

rbac.createRole('admin', ['users:*']);
rbac.createRole('viewer', ['users:read']);

const admin = { id: 'admin-1', roles: ['admin'] };
const viewer = { id: 'viewer-1', roles: ['viewer'] };

// All permission checks are logged
rbac.hasPermission(admin, 'users:delete');
// Console output:
// [AUDIT] permission_check | user: admin-1 | permission: users:delete | allowed: true

rbac.hasPermission(viewer, 'users:delete');
// Console output:
// [AUDIT] permission_check | user: viewer-1 | permission: users:delete | allowed: false | reason: User lacks permission: users:delete
```

## Database Audit Logging

Example of logging to a database with buffering:

```typescript
import { RBAC, BufferedAuditLogger, AuditEvent } from '@fire-shield/core';
import { db } from './database'; // Your database client

// Create buffered logger that writes to database
const auditLogger = new BufferedAuditLogger(
  async (events: AuditEvent[]) => {
    // Batch insert audit events
    await db.auditLogs.insertMany(
      events.map(event => ({
        type: event.type,
        userId: event.userId,
        permission: event.permission,
        allowed: event.allowed,
        reason: event.reason,
        context: event.context,
        timestamp: new Date(event.timestamp),
        createdAt: new Date()
      }))
    );
  },
  {
    maxBufferSize: 100, // Flush when buffer reaches 100 events
    flushIntervalMs: 5000 // Or every 5 seconds
  }
);

const rbac = new RBAC({ auditLogger });

// Events are buffered and batch-written to database
rbac.hasPermission(user, 'post:delete');
rbac.hasPermission(user, 'user:create');
// ... more checks

// Manual flush if needed
await auditLogger.flush();
```

## Security Monitoring System

Example of real-time security monitoring:

```typescript
import { AuditLogger, AuditEvent } from '@fire-shield/core';

class SecurityMonitorLogger implements AuditLogger {
  private failedAttempts = new Map&lt;string, number&gt;();
  private suspiciousActivity = new Map&lt;string, AuditEvent[]&gt;();

  log(event: AuditEvent): void {
    // Track failed authorization attempts
    if (!event.allowed) {
      this.trackFailedAttempt(event);
    }

    // Detect suspicious patterns
    this.detectSuspiciousActivity(event);

    // Log high-privilege access
    if (this.isHighPrivilegeAccess(event)) {
      this.alertSecurityTeam(event);
    }
  }

  private trackFailedAttempt(event: AuditEvent): void {
    const userId = event.userId;
    const count = (this.failedAttempts.get(userId) || 0) + 1;
    this.failedAttempts.set(userId, count);

    // Alert after 5 failed attempts
    if (count >= 5) {
      console.error(`🚨 SECURITY ALERT: User ${userId} has ${count} failed authorization attempts`);
      this.lockUser(userId);
    }

    // Reset counter after 1 hour
    setTimeout(() => {
      this.failedAttempts.set(userId, 0);
    }, 3600000);
  }

  private detectSuspiciousActivity(event: AuditEvent): void {
    const userId = event.userId;
    const recentEvents = this.suspiciousActivity.get(userId) || [];
    recentEvents.push(event);

    // Keep only last 10 minutes of activity
    const tenMinutesAgo = Date.now() - 600000;
    const filtered = recentEvents.filter(e => e.timestamp > tenMinutesAgo);
    this.suspiciousActivity.set(userId, filtered);

    // Alert on unusual patterns
    if (this.hasUnusualPattern(filtered)) {
      console.warn(`⚠️  Suspicious activity detected for user ${userId}`);
      this.notifySecurityTeam(userId, filtered);
    }
  }

  private hasUnusualPattern(events: AuditEvent[]): boolean {
    // More than 50 requests in 10 minutes
    if (events.length > 50) return true;

    // Multiple failed high-privilege attempts
    const failedHighPriv = events.filter(
      e => !e.allowed && this.isHighPrivilegeAccess(e)
    );
    if (failedHighPriv.length > 3) return true;

    // Accessing many different resources rapidly
    const uniquePermissions = new Set(events.map(e => e.permission));
    if (uniquePermissions.size > 20) return true;

    return false;
  }

  private isHighPrivilegeAccess(event: AuditEvent): boolean {
    const highPrivPermissions = [
      'admin:*',
      'system:*',
      'user:delete',
      'database:*'
    ];

    return highPrivPermissions.some(pattern =>
      event.permission.includes(pattern.replace('*', ''))
    );
  }

  private alertSecurityTeam(event: AuditEvent): void {
    console.log(`🔐 High-privilege access: ${event.userId} → ${event.permission}`);
    // Send to monitoring service (Datadog, New Relic, etc.)
  }

  private lockUser(userId: string): void {
    console.log(`🔒 Locking user ${userId} due to failed attempts`);
    // Implement user locking logic
  }

  private notifySecurityTeam(userId: string, events: AuditEvent[]): void {
    console.log(`📧 Notifying security team about user ${userId}`);
    // Send email/Slack notification
  }
}

// Usage
const rbac = new RBAC({
  auditLogger: new SecurityMonitorLogger()
});
```

## Compliance Audit System

Example for GDPR/SOC2 compliance:

```typescript
import { AuditLogger, AuditEvent } from '@fire-shield/core';

interface ComplianceAuditLog extends AuditEvent {
  // Additional compliance fields
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  dataClassification?: 'public' | 'internal' | 'confidential' | 'restricted';
  retentionDays?: number;
}

class ComplianceAuditLogger implements AuditLogger {
  private retentionPolicies = new Map&lt;string, number&gt;([
    ['public', 30],
    ['internal', 90],
    ['confidential', 365],
    ['restricted', 2555] // 7 years
  ]);

  async log(event: AuditEvent): Promise&lt;void&gt; {
    const complianceLog: ComplianceAuditLog = {
      ...event,
      ipAddress: event.context?.ip,
      userAgent: event.context?.userAgent,
      sessionId: event.context?.sessionId,
      dataClassification: this.classifyData(event.permission),
      retentionDays: this.getRetentionPeriod(event.permission)
    };

    // Write to compliance database
    await this.writeToComplianceLog(complianceLog);

    // Check if requires immediate reporting
    if (this.requiresImmediateReporting(complianceLog)) {
      await this.reportToComplianceOfficer(complianceLog);
    }
  }

  private classifyData(permission: string): string {
    if (permission.includes('pii') || permission.includes('sensitive')) {
      return 'restricted';
    }
    if (permission.includes('financial') || permission.includes('health')) {
      return 'confidential';
    }
    if (permission.includes('internal')) {
      return 'internal';
    }
    return 'public';
  }

  private getRetentionPeriod(permission: string): number {
    const classification = this.classifyData(permission);
    return this.retentionPolicies.get(classification) || 30;
  }

  private requiresImmediateReporting(log: ComplianceAuditLog): boolean {
    // Report access to restricted data
    if (log.dataClassification === 'restricted') {
      return true;
    }

    // Report failed high-privilege attempts
    if (!log.allowed && log.permission.includes('admin')) {
      return true;
    }

    return false;
  }

  private async writeToComplianceLog(log: ComplianceAuditLog): Promise&lt;void&gt; {
    // Write to secure, immutable storage
    await db.complianceLogs.insert({
      ...log,
      hash: this.calculateHash(log), // Tamper detection
      encrypted: this.encrypt(log), // Encryption for sensitive data
      expiresAt: new Date(Date.now() + log.retentionDays! * 86400000)
    });
  }

  private async reportToComplianceOfficer(log: ComplianceAuditLog): Promise&lt;void&gt; {
    // Send notification
    await emailService.send({
      to: 'compliance@company.com',
      subject: `Compliance Alert: ${log.dataClassification} data access`,
      body: `
        User: ${log.userId}
        Permission: ${log.permission}
        Allowed: ${log.allowed}
        IP: ${log.ipAddress}
        Time: ${new Date(log.timestamp).toISOString()}
      `
    });
  }

  private calculateHash(log: ComplianceAuditLog): string {
    // Calculate hash for tamper detection
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(log))
      .digest('hex');
  }

  private encrypt(log: ComplianceAuditLog): string {
    // Encrypt sensitive fields
    return encryptionService.encrypt(JSON.stringify(log));
  }
}

// Usage
const rbac = new RBAC({
  auditLogger: new ComplianceAuditLogger()
});
```

## Multi-Channel Audit Logging

Example of logging to multiple destinations:

```typescript
import { MultiAuditLogger, ConsoleAuditLogger, BufferedAuditLogger } from '@fire-shield/core';

// Log to console
const consoleLogger = new ConsoleAuditLogger();

// Log to database
const dbLogger = new BufferedAuditLogger(
  async (events) => await db.auditLogs.insertMany(events),
  { maxBufferSize: 50, flushIntervalMs: 3000 }
);

// Log to external monitoring service
const monitoringLogger = new BufferedAuditLogger(
  async (events) => {
    await fetch('https://monitoring.example.com/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(events)
    });
  },
  { maxBufferSize: 100, flushIntervalMs: 10000 }
);

// Log to Slack for critical events
class SlackAuditLogger implements AuditLogger {
  async log(event: AuditEvent): Promise&lt;void&gt; {
    // Only log critical events to Slack
    if (this.isCritical(event)) {
      await fetch(process.env.SLACK_WEBHOOK_URL!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `🔐 Critical Access: ${event.userId} → ${event.permission}`,
          attachments: [{
            color: event.allowed ? 'good' : 'danger',
            fields: [
              { title: 'User', value: event.userId, short: true },
              { title: 'Permission', value: event.permission, short: true },
              { title: 'Allowed', value: event.allowed.toString(), short: true },
              { title: 'Reason', value: event.reason || 'N/A', short: true }
            ]
          }]
        })
      });
    }
  }

  private isCritical(event: AuditEvent): boolean {
    return event.permission.includes('admin') ||
           event.permission.includes('delete') ||
           event.permission.includes('system');
  }
}

// Combine all loggers
const multiLogger = new MultiAuditLogger([
  consoleLogger,
  dbLogger,
  monitoringLogger,
  new SlackAuditLogger()
]);

const rbac = new RBAC({ auditLogger: multiLogger });
```

## Query and Analysis

Example of querying audit logs:

```typescript
class AuditLogAnalyzer {
  async getUserActivity(userId: string, days: number = 7): Promise&lt;AuditEvent[]&gt; {
    const since = Date.now() - (days * 86400000);

    return await db.auditLogs.find({
      userId,
      timestamp: { $gte: since }
    }).toArray();
  }

  async getFailedAttempts(hours: number = 24): Promise&lt;AuditEvent[]&gt; {
    const since = Date.now() - (hours * 3600000);

    return await db.auditLogs.find({
      allowed: false,
      timestamp: { $gte: since }
    }).toArray();
  }

  async getPermissionUsage(permission: string): Promise&lt;{
    total: number;
    allowed: number;
    denied: number;
    uniqueUsers: number;
  }&gt; {
    const logs = await db.auditLogs.find({ permission }).toArray();

    return {
      total: logs.length,
      allowed: logs.filter(l => l.allowed).length,
      denied: logs.filter(l => !l.allowed).length,
      uniqueUsers: new Set(logs.map(l => l.userId)).size
    };
  }

  async getSecurityReport(days: number = 30): Promise&lt;{
    totalChecks: number;
    failedChecks: number;
    suspiciousUsers: string[];
    topPermissions: Array&lt;{ permission: string; count: number }&gt;;
  }&gt; {
    const since = Date.now() - (days * 86400000);
    const logs = await db.auditLogs.find({
      timestamp: { $gte: since }
    }).toArray();

    // Find users with high failure rate
    const userFailures = new Map&lt;string, number&gt;();
    logs.forEach(log => {
      if (!log.allowed) {
        userFailures.set(log.userId, (userFailures.get(log.userId) || 0) + 1);
      }
    });

    const suspiciousUsers = Array.from(userFailures.entries())
      .filter(([_, count]) => count > 10)
      .map(([userId]) => userId);

    // Count permission usage
    const permissionCounts = new Map&lt;string, number&gt;();
    logs.forEach(log => {
      permissionCounts.set(
        log.permission,
        (permissionCounts.get(log.permission) || 0) + 1
      );
    });

    const topPermissions = Array.from(permissionCounts.entries())
      .map(([permission, count]) => ({ permission, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalChecks: logs.length,
      failedChecks: logs.filter(l => !l.allowed).length,
      suspiciousUsers,
      topPermissions
    };
  }

  async exportAuditLogs(
    startDate: Date,
    endDate: Date,
    format: 'json' | 'csv'
  ): Promise&lt;string&gt; {
    const logs = await db.auditLogs.find({
      timestamp: {
        $gte: startDate.getTime(),
        $lte: endDate.getTime()
      }
    }).toArray();

    if (format === 'csv') {
      return this.convertToCSV(logs);
    }

    return JSON.stringify(logs, null, 2);
  }

  private convertToCSV(logs: AuditEvent[]): string {
    const headers = ['Timestamp', 'Type', 'User ID', 'Permission', 'Allowed', 'Reason'];
    const rows = logs.map(log => [
      new Date(log.timestamp).toISOString(),
      log.type,
      log.userId,
      log.permission,
      log.allowed.toString(),
      log.reason || ''
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }
}

// Usage
const analyzer = new AuditLogAnalyzer();

// Get user activity
const userActivity = await analyzer.getUserActivity('user-123', 7);
console.log(`User had ${userActivity.length} permission checks in last 7 days`);

// Get security report
const report = await analyzer.getSecurityReport(30);
console.log('Security Report:', report);

// Export logs for compliance
const csvData = await analyzer.exportAuditLogs(
  new Date('2025-01-01'),
  new Date('2025-01-31'),
  'csv'
);
```

## Real-time Audit Dashboard

Example of real-time audit monitoring:

```typescript
import { EventEmitter } from 'events';

class RealtimeAuditLogger extends EventEmitter implements AuditLogger {
  log(event: AuditEvent): void {
    // Emit event for real-time processing
    this.emit('audit', event);

    // Also persist to database
    db.auditLogs.insert(event);
  }
}

// Setup real-time monitoring
const realtimeLogger = new RealtimeAuditLogger();

// Listen for audit events
realtimeLogger.on('audit', (event: AuditEvent) => {
  // Send to WebSocket clients
  wsServer.broadcast({
    type: 'audit_event',
    data: event
  });

  // Update real-time metrics
  metrics.increment('permission_checks');
  if (!event.allowed) {
    metrics.increment('permission_denials');
  }
});

const rbac = new RBAC({ auditLogger: realtimeLogger });
```

## Next Steps

- Learn about [Multi-Tenancy](/examples/multi-tenancy)
- Explore [Best Practices](/examples/best-practices)
- Check [Audit API Reference](/api/audit)
