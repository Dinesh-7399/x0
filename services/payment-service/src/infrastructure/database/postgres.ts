import postgres from 'postgres';
import { getConfig } from '../../config/index.js';

const config = getConfig();

export const sql = postgres(config.databaseUrl, {
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

export const closePool = async () => {
  await sql.end();
};
