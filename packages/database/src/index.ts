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

import postgres from 'postgres';

/**
 * Create a database connection pool
 */
export async function createDbConnection(
  config: DatabaseConfig
): Promise<DatabaseConnection> {
  const sql = postgres({
    host: config.host,
    port: config.port,
    database: config.database,
    username: config.user,
    password: config.password,
    ssl: config.ssl,
    max: config.maxConnections || 10,
    onnotice: () => { }, // excessive logging
  });

  // Test connection
  try {
    await sql`SELECT 1`;
    console.log(`[database] Connected to ${config.database} at ${config.host}:${config.port}`);
  } catch (error) {
    console.error('[database] Connection failed:', error);
    throw error;
  }

  return {
    query: async <T>(queryStr: string, params: unknown[] = []): Promise<T[]> => {
      // postgres.js uses template literals normally, but for raw strings we need unsafe
      // Note: This is an adapter to make it look like a generic query interface
      // Real usage should likely expose the `sql` object directly for better DX
      return (await sql.unsafe(queryStr, params as any[])) as unknown as T[];
    },
    execute: async (queryStr: string, params: unknown[] = []): Promise<{ affectedRows: number }> => {
      const result = await sql.unsafe(queryStr, params as any[]);
      return { affectedRows: result.count };
    },
    close: async () => {
      await sql.end();
    },
    isConnected: () => {
      // postgres.js manages connection state internally
      return true;
    },
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
