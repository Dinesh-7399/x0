import postgres from 'postgres';

const sql = postgres('postgresql://gymato:gymato_dev@localhost:5432/gymato');

try {
  const result = await sql`SELECT 1 as test`;
  console.log('✅ Connection OK:', result);
} catch (e: any) {
  console.error('❌ Connection Failed:', e.code, e.message);
} finally {
  await sql.end();
}
