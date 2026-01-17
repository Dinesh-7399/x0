// src/infrastructure/database/postgres.ts
import postgres from 'postgres';
import { getConfig } from '../../config/index.js';

let sql: postgres.Sql | null = null;

/**
 * Get PostgreSQL connection (singleton)
 * Use tagged template literals: sql`SELECT * FROM users WHERE id = ${id}`
 */
export function getDb(): postgres.Sql {
  if (!sql) {
    const config = getConfig();
    sql = postgres(config.databaseUrl, {
      max: 20,
      idle_timeout: 30,
      connect_timeout: 10,
    });

    if (config.nodeEnv === 'development') {
      console.log('📦 Database connection initialized');
    }
  }
  return sql;
}

/**
 * Close the connection (for graceful shutdown)
 */
export async function closePool(): Promise<void> {
  if (sql) {
    await sql.end();
    sql = null;
    console.log('📦 Database connection closed');
  }
}
