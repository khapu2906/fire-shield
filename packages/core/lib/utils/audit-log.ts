import { AuditEvent, AuditLogger } from "../types/audit.types";

/**
 * Simple console audit logger (for development)
 */
export class ConsoleAuditLogger implements AuditLogger {
	log(event: AuditEvent): void {
		const status = event.allowed ? 'ALLOWED' : 'DENIED';
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
	private maxBufferSize: number;

	constructor(
		private onFlush: (events: AuditEvent[]) => void | Promise<void>,
		private options: {
			maxBufferSize?: number;
			flushIntervalMs?: number;
		} = {}
	) {
		const { maxBufferSize = 100, flushIntervalMs = 5000 } = options;

		this.maxBufferSize = maxBufferSize;

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
		if (this.buffer.length >= this.maxBufferSize) {
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
