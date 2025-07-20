interface LogEntry {
	level: 'info' | 'error' | 'debug' | 'warn';
	message: string;
	timestamp: string;
	data?: any;
	browserInfo: BrowserInfo;
}

interface BrowserInfo {
	userAgent: string;
	url: string;
	viewport: {
		width: number;
		height: number;
	};
}

class BrowserLogger {
	private queue: LogEntry[] = [];
	private batchTimer: number | null = null;
	private batchDelay = 1000; // 1 second
	private maxBatchSize = 50;
	private endpoint = '/api/log/browser';
	private isEnabled = true;

	constructor() {
		// Intercept console methods
		this.interceptConsole();
		
		// Send any remaining logs when the page unloads
		if (typeof window !== 'undefined') {
			window.addEventListener('beforeunload', () => {
				this.flush();
			});
		}
	}

	private interceptConsole() {
		if (typeof window === 'undefined') return;

		const originalLog = console.log;
		const originalError = console.error;
		const originalWarn = console.warn;
		const originalDebug = console.debug;

		console.log = (...args: any[]) => {
			this.log('info', args);
			originalLog.apply(console, args);
		};

		console.error = (...args: any[]) => {
			this.log('error', args);
			originalError.apply(console, args);
		};

		console.warn = (...args: any[]) => {
			this.log('warn', args);
			originalWarn.apply(console, args);
		};

		console.debug = (...args: any[]) => {
			this.log('debug', args);
			originalDebug.apply(console, args);
		};
	}

	private getBrowserInfo(): BrowserInfo {
		if (typeof window === 'undefined') {
			return {
				userAgent: 'unknown',
				url: 'unknown',
				viewport: { width: 0, height: 0 }
			};
		}

		return {
			userAgent: navigator.userAgent,
			url: window.location.href,
			viewport: {
				width: window.innerWidth,
				height: window.innerHeight
			}
		};
	}

	private formatMessage(args: any[]): string {
		return args
			.map(arg => {
				if (typeof arg === 'object') {
					try {
						return JSON.stringify(arg, null, 2);
					} catch (e) {
						return String(arg);
					}
				}
				return String(arg);
			})
			.join(' ');
	}

	private log(level: LogEntry['level'], args: any[]) {
		if (!this.isEnabled) return;

		const entry: LogEntry = {
			level,
			message: this.formatMessage(args),
			timestamp: new Date().toISOString(),
			browserInfo: this.getBrowserInfo()
		};

		// Include raw data for objects
		if (args.length === 1 && typeof args[0] === 'object') {
			entry.data = args[0];
		}

		this.queue.push(entry);
		this.scheduleBatch();
	}

	private scheduleBatch() {
		if (this.batchTimer !== null) return;

		// If we've reached max batch size, send immediately
		if (this.queue.length >= this.maxBatchSize) {
			this.sendBatch();
			return;
		}

		// Otherwise, schedule a batch send
		this.batchTimer = window.setTimeout(() => {
			this.sendBatch();
		}, this.batchDelay);
	}

	private async sendBatch() {
		if (this.batchTimer !== null) {
			clearTimeout(this.batchTimer);
			this.batchTimer = null;
		}

		if (this.queue.length === 0) return;

		const batch = this.queue.splice(0, this.maxBatchSize);

		try {
			const response = await fetch(this.endpoint, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ logs: batch })
			});

			if (!response.ok) {
				throw new Error(`Failed to send logs: ${response.status}`);
			}
		} catch (error) {
			// On failure, log to console as fallback
			console.error('[BrowserLogger] Failed to send logs to server:', error);
			batch.forEach(entry => {
				const fallbackMsg = `[${entry.level.toUpperCase()}] ${entry.timestamp} - ${entry.message}`;
				switch (entry.level) {
					case 'error':
						console.error(fallbackMsg, entry.data);
						break;
					case 'warn':
						console.warn(fallbackMsg, entry.data);
						break;
					case 'debug':
						console.debug(fallbackMsg, entry.data);
						break;
					default:
						console.log(fallbackMsg, entry.data);
				}
			});
		}

		// Continue processing remaining items
		if (this.queue.length > 0) {
			this.scheduleBatch();
		}
	}

	// Public methods for direct usage
	info(...args: any[]) {
		this.log('info', args);
	}

	error(...args: any[]) {
		this.log('error', args);
	}

	debug(...args: any[]) {
		this.log('debug', args);
	}

	warn(...args: any[]) {
		this.log('warn', args);
	}

	// Force send all queued logs
	flush() {
		if (this.queue.length > 0) {
			this.sendBatch();
		}
	}

	// Enable/disable logging
	enable() {
		this.isEnabled = true;
	}

	disable() {
		this.isEnabled = false;
	}

	// Configuration methods
	setEndpoint(endpoint: string) {
		this.endpoint = endpoint;
	}

	setBatchDelay(delay: number) {
		this.batchDelay = delay;
	}

	setMaxBatchSize(size: number) {
		this.maxBatchSize = size;
	}
}

// Create singleton instance
const logger = new BrowserLogger();

export default logger;
export { BrowserLogger, type LogEntry, type BrowserInfo };