// src/infrastructure/database/postgres.ts

import { Pool, type PoolClient, type QueryResultRow } from "pg";
import { getConfig } from "../../config/index.js";

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    const config = getConfig();
    pool = new Pool({
      connectionString: config.databaseUrl,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    pool.on("error", (err) => {
      console.error("Unexpected database pool error:", err);
    });
  }
  return pool;
}

export async function query<T extends QueryResultRow>(
  sql: string,
  params?: unknown[],
): Promise<T[]> {
  const client = await getPool().connect();
  try {
    const result = await client.query<T>(sql, params);
    return result.rows;
  } finally {
    client.release();
  }
}

export async function queryOne<T extends QueryResultRow>(
  sql: string,
  params?: unknown[],
): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] || null;
}

export async function execute(sql: string, params?: unknown[]): Promise<number> {
  const client = await getPool().connect();
  try {
    const result = await client.query(sql, params);
    return result.rowCount ?? 0;
  } finally {
    client.release();
  }
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

export async function checkConnection(): Promise<boolean> {
  try {
    await query("SELECT 1");
    return true;
  } catch {
    return false;
  }
}
