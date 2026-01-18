import postgres from 'postgres';
import { getConfig } from '../../config/index.js';

const config = getConfig();

const sql = postgres(config.databaseUrl, {
  max: 20,
  idle_timeout: 30,
  connect_timeout: 2,
});

export const query = async (text: string, params?: any[]) => {
  const result = await sql.unsafe(text, params);
  return {
    rows: result,
    rowCount: result.count,
  };
};

export const getClient = async () => {
  // postgres.js manages connections mostly automatically. 
  // Returning the sql object as client proxy if needed, 
  // but better to just use query.
  return sql;
};

export const checkConnection = async (): Promise<boolean> => {
  try {
    await sql`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
};

export const closePool = async () => {
  await sql.end();
};
