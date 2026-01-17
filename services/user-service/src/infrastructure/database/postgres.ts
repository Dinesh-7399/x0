// src/infrastructure/database/postgres.ts

import postgres from 'postgres';
import { getConfig } from '../../config/index.js';

const config = getConfig();

// Create connection pool
const sql = postgres(config.databaseUrl, {
  max: 10, // Max connections
  idle_timeout: 20, // Idle connection timeout in seconds
  connect_timeout: 10, // Connection timeout
  debug: config.nodeEnv === 'development',
});

// Test connection
export const checkConnection = async () => {
  try {
    await sql`SELECT 1`;
    console.log('✅ Database connected');
  } catch (err) {
    console.error('❌ Database connection error:', err);
    process.exit(1);
  }
};

/**
 * Get database instance
 */
export const getDb = () => sql;

/**
 * Close database pool
 */
export const closePool = async () => {
  await sql.end();
  console.log('Database pool closed');
};
