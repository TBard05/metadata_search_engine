import 'dotenv/config';
import mysql from 'mysql2/promise';

export const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
});

export async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

export async function test() {
  try {
    const conn = await pool.getConnection();
    await conn.ping();
    console.log('DB-anslutning OK');
    conn.release();
  } catch (err) {
    console.error('DB-anslutning misslyckades:', err.message);
  }
}

export default { query, pool, test };
