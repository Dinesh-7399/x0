// @gymato/database - Database connection utilities
// Placeholder implementations - actual connections need env variables

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean;
  maxConnections?: number;
}

export interface DatabaseConnection {
  query: <T>(sql: string, params?: unknown[]) => Promise<T[]>;
  execute: (sql: string, params?: unknown[]) => Promise<{ affectedRows: number }>;
  close: () => Promise<void>;
  isConnected: () => boolean;
}

/**
 * Parse DATABASE_URL into config object
 */
export function parseDatabaseUrl(url: string): DatabaseConfig {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: Number(parsed.port) || 5432,
    database: parsed.pathname.slice(1),
    user: parsed.username,
    password: parsed.password,
    ssl: parsed.searchParams.get('ssl') === 'true',
  };
}

/**
 * Placeholder for database connection
 * In real implementation, this would use pg or postgres.js
 */
export async function createDbConnection(
  _config: DatabaseConfig
): Promise<DatabaseConnection> {
  // This is a stub - actual implementation requires postgres driver
  console.log('[database] Connection stub initialized - implement with postgres driver');

  return {
    query: async <T>(_sql: string, _params?: unknown[]): Promise<T[]> => {
      throw new Error('Database connection not implemented. Install and configure postgres driver.');
    },
    execute: async (_sql: string, _params?: unknown[]): Promise<{ affectedRows: number }> => {
      throw new Error('Database connection not implemented. Install and configure postgres driver.');
    },
    close: async () => {
      // no-op
    },
    isConnected: () => false,
  };
}

/**
 * Build pagination SQL clause
 */
export function buildPaginationQuery(page: number, limit: number): { offset: number; limit: number } {
  const safePage = Math.max(1, page);
  const safeLimit = Math.min(100, Math.max(1, limit));
  return {
    offset: (safePage - 1) * safeLimit,
    limit: safeLimit,
  };
}

/**
 * Transaction helper type
 */
export interface Transaction {
  commit: () => Promise<void>;
  rollback: () => Promise<void>;
}
