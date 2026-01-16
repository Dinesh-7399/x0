// @gymato/observability - Logging and Metrics utilities
// Lightweight implementation without external dependencies

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  service: string;
  requestId?: string;
  userId?: string;
  [key: string]: unknown;
}

interface Logger {
  debug: (message: string, context?: Record<string, unknown>) => void;
  info: (message: string, context?: Record<string, unknown>) => void;
  warn: (message: string, context?: Record<string, unknown>) => void;
  error: (message: string, error?: Error, context?: Record<string, unknown>) => void;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * Creates a simple JSON logger for a service
 */
export function createLogger(config: { service: string; level?: LogLevel }): Logger {
  const minLevel = LOG_LEVELS[config.level ?? 'info'];
  const serviceName = config.service;

  const log = (level: LogLevel, message: string, context?: Record<string, unknown>) => {
    if (LOG_LEVELS[level] < minLevel) return;

    const entry = {
      timestamp: new Date().toISOString(),
      level,
      service: serviceName,
      message,
      ...context,
    };

    const output = JSON.stringify(entry);

    if (level === 'error') {
      console.error(output);
    } else if (level === 'warn') {
      console.warn(output);
    } else {
      console.log(output);
    }
  };

  return {
    debug: (message, context) => log('debug', message, context),
    info: (message, context) => log('info', message, context),
    warn: (message, context) => log('warn', message, context),
    error: (message, error, context) => {
      log('error', message, {
        ...context,
        error: error ? { name: error.name, message: error.message, stack: error.stack } : undefined,
      });
    },
  };
}

/**
 * Simple in-memory metrics (for development)
 * In production, this would connect to Prometheus/StatsD
 */
export class Metrics {
  private counters = new Map<string, number>();
  private gauges = new Map<string, number>();
  private histograms = new Map<string, number[]>();
  private readonly prefix: string;

  constructor(prefix: string) {
    this.prefix = prefix;
  }

  increment(name: string, value = 1, tags?: Record<string, string>): void {
    const key = this.formatKey(name, tags);
    this.counters.set(key, (this.counters.get(key) ?? 0) + value);
  }

  gauge(name: string, value: number, tags?: Record<string, string>): void {
    const key = this.formatKey(name, tags);
    this.gauges.set(key, value);
  }

  histogram(name: string, value: number, tags?: Record<string, string>): void {
    const key = this.formatKey(name, tags);
    const values = this.histograms.get(key) ?? [];
    values.push(value);
    this.histograms.set(key, values);
  }

  /**
   * Get all metrics in Prometheus format
   */
  toPrometheusFormat(): string {
    const lines: string[] = [];

    for (const [key, value] of this.counters) {
      lines.push(`${key} ${value}`);
    }
    for (const [key, value] of this.gauges) {
      lines.push(`${key} ${value}`);
    }

    return lines.join('\n');
  }

  private formatKey(name: string, tags?: Record<string, string>): string {
    let key = `${this.prefix}_${name}`;
    if (tags) {
      const tagStr = Object.entries(tags)
        .map(([k, v]) => `${k}="${v}"`)
        .join(',');
      key += `{${tagStr}}`;
    }
    return key;
  }
}

/**
 * Request timing helper
 */
export function createTimer() {
  const start = performance.now();
  return {
    elapsed: () => performance.now() - start,
  };
}
