/**
 * Example audit logger implementations
 * These are ready-to-use implementations for common audit logging patterns
 */

import type { AuditLogger, AuditEvent } from '../types/audit.types';

/**
 * Security monitoring audit logger
 * Tracks failed attempts and alerts on suspicious activity
 */
export class SecurityMonitorLogger implements AuditLogger {
	private readonly failedAttempts = new Map<string, number>();
	private readonly alertThreshold = 5;

	log(event: AuditEvent): void {
		if (!event.allowed) {
			this.handleFailedAttempt(event);
		} else {
			this.resetFailedAttempts(event.userId);
		}
	}

	private handleFailedAttempt(event: AuditEvent): void {
		const count = (this.failedAttempts.get(event.userId) || 0) + 1;
		this.failedAttempts.set(event.userId, count);

		console.log(`⚠️ Security Alert: User ${event.userId} denied ${event.permission}`);
		console.log(`   Failed attempts: ${count}`);

		if (count >= this.alertThreshold) {
			this.triggerSecurityAlert(event.userId, count);
		}
	}

	private resetFailedAttempts(userId: string): void {
		this.failedAttempts.delete(userId);
	}

	private triggerSecurityAlert(userId: string, count: number): void {
		console.log(`   🚨 SECURITY WARNING: User ${userId} has ${count} failed permission checks!`);
		// In production: trigger alerts, IP blocks, etc.
	}
}

/**
 * Compliance audit logger for GDPR, HIPAA, SOC2
 * Stores audit logs with compliance metadata
 */
export class ComplianceLogger implements AuditLogger {
	private readonly complianceRules = {
		gdpr: true,
		hipaa: (event: AuditEvent) => event.permission.includes('medical'),
		soc2: true
	} as const;

	async log(event: AuditEvent): Promise<void> {
		const compliance = this.buildComplianceMetadata(event);

		console.log(`📋 Compliance Log: ${event.allowed ? '✓' : '✗'} ${event.userId} → ${event.permission}`);
		console.log(`   Compliance: GDPR=${compliance.gdpr}, HIPAA=${compliance.hipaa}, SOC2=${compliance.soc2}`);

		await this.saveToComplianceDatabase(event, compliance);
	}

	private buildComplianceMetadata(event: AuditEvent) {
		return {
			gdpr: this.complianceRules.gdpr,
			hipaa: this.complianceRules.hipaa(event),
			soc2: this.complianceRules.soc2,
			retentionPeriod: '7years',
			encrypted: true
		} as const;
	}

	private async saveToComplianceDatabase(
		event: AuditEvent,
		compliance: Record<string, boolean | string>
	): Promise<void> {
		// In production: save to encrypted, compliant database
		console.log(`💾 Saved to compliance database`);
	}
}

/**
 * Analytics audit logger for usage patterns
 * Tracks permission usage statistics
 */
export class AnalyticsLogger implements AuditLogger {
	private readonly analytics = new Map<string, number>();
	private readonly batchSize = 100;

	log(event: AuditEvent): void {
		const key = `${event.permission}:${event.allowed ? 'allowed' : 'denied'}`;
		const count = (this.analytics.get(key) || 0) + 1;
		this.analytics.set(key, count);

		if (this.getTotalCount() % this.batchSize === 0) {
			this.sendAnalytics();
		}
	}

	private getTotalCount(): number {
		return Array.from(this.analytics.values()).reduce((sum, count) => sum + count, 0);
	}

	private sendAnalytics(): void {
		const stats = Object.fromEntries(this.analytics);
		console.log('📊 Permission Analytics:', stats);
		// In production: send to analytics service
	}
}

/**
 * Database audit logger with automatic rotation
 * Stores logs in database with cleanup
 */
export class RotatingDatabaseLogger implements AuditLogger {
	private readonly buffer: AuditEvent[] = [];
	private readonly maxAge = 90 * 24 * 60 * 60 * 1000; // 90 days
	private readonly batchSize = 50;

	async log(event: AuditEvent): Promise<void> {
		this.buffer.push(event);

		if (this.buffer.length >= this.batchSize) {
			await this.flush();
		}
	}

	async flush(): Promise<void> {
		if (this.buffer.length === 0) return;

		const eventsToSave = [...this.buffer];
		this.buffer.length = 0; // Clear buffer

		await Promise.all([
			this.saveLogsToDatabase(eventsToSave),
			this.cleanupOldLogs()
		]);
	}

	private async saveLogsToDatabase(events: AuditEvent[]): Promise<void> {
		console.log(`Saved ${events.length} audit events to database`);
		// In production: batch insert to database
	}

	private async cleanupOldLogs(): Promise<void> {
		const cutoff = Date.now() - this.maxAge;
		console.log(`Cleaned up audit logs older than ${new Date(cutoff).toISOString()}`);
		// In production: delete old records
	}
}

/**
 * Async audit logger for high-performance scenarios
 * Fire-and-forget logging to avoid blocking
 */
export class AsyncLogger implements AuditLogger {
	private readonly saveDelay = 10; // ms

	log(event: AuditEvent): void {
		// Fire and forget for performance
		this.saveToDatabase(event).catch(error =>
			console.error('Failed to save audit log:', error)
		);
	}

	private async saveToDatabase(event: AuditEvent): Promise<void> {
		await new Promise(resolve => setTimeout(resolve, this.saveDelay));
		console.log(`📝 [ASYNC] Saved audit event: ${event.userId} → ${event.permission}`);
	}
}

/**
 * Sampling audit logger for high-traffic applications
 * Logs only a percentage of events to reduce overhead
 */
export class SamplingLogger implements AuditLogger {
	private readonly sampleRate = 0.1; // 10%

	log(event: AuditEvent): void {
		if (!event.allowed || Math.random() < this.sampleRate) {
			this.saveLog(event);
		}
	}

	private saveLog(event: AuditEvent): void {
		const status = event.allowed ? '✓' : '✗';
		console.log(`🎯 [SAMPLED] ${status} ${event.userId} → ${event.permission}`);
	}
}