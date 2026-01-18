import { Pool } from 'pg';
import { getConfig } from '../../config/index.js';

const config = getConfig();

export const pool = new Pool({
  connectionString: config.databaseUrl,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export const query = async (text: string, params?: any[]) => {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  // console.log('executed query', { text, duration, rows: res.rowCount });
  return res;
};

export const getClient = async () => {
  return await pool.connect();
};

export const checkConnection = async (): Promise<boolean> => {
  try {
    const res = await pool.query('SELECT NOW()');
    return res.rowCount !== null && res.rowCount > 0;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
};

export const closePool = async () => {
  await pool.end();
};
