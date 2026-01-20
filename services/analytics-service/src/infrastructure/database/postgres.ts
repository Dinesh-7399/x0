// src/infrastructure/database/postgres.ts

import postgres from "postgres";
import { getConfig } from "../../config/index.js";

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

    if (config.nodeEnv === "development") {
      console.log("📦 Database connection initialized");
    }
  }
  return sql;
}

/**
 * Query helper - returns array of rows
 */
export async function query<T>(
  strings: TemplateStringsArray,
  ...values: unknown[]
): Promise<T[]> {
  const db = getDb();
  return db(strings, ...values) as unknown as Promise<T[]>;
}

/**
 * Query one row
 */
export async function queryOne<T>(
  strings: TemplateStringsArray,
  ...values: unknown[]
): Promise<T | null> {
  const rows = await query<T>(strings, ...values);
  return rows[0] || null;
}

/**
 * Execute SQL string
 */
export async function execute(sqlString: string, params?: unknown[]): Promise<number> {
  const db = getDb();
  const result = await db.unsafe(sqlString, params || []);
  return result.count ?? 0;
}

/**
 * Close the connection (for graceful shutdown)
 */
export async function closePool(): Promise<void> {
  if (sql) {
    await sql.end();
    sql = null;
    console.log("📦 Database connection closed");
  }
}

/**
 * Check database connection
 */
export async function checkConnection(): Promise<boolean> {
  try {
    const db = getDb();
    await db`SELECT 1`;
    return true;
  } catch (error) {
    console.error("Database connection check failed:", error);
    return false;
  }
}
