// Databasanslutning

// Det här betyder att om du har en .env-fil i projektet (t.ex. med användarnamn/lösenord) så laddas de automatiskt in.
require("dotenv").config();

const mysql = require("mysql2/promise");

// Skapar en connection pool. När extractor.js eller server.js behöver köra en SQL-fråga så “lånar” de en anslutning från poolen, och när de är klara “släpper” de tillbaka den.
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

// Testfunktion
async function test() {
  try {
    const conn = await pool.getConnection();
    console.log("DB-anslutning OK");
    conn.release();
  } catch (err) {
    console.error("DB-anslutning misslyckades:", err.message);
  }
}

// Gör så att du kan importera pool och test i andra filer (extractor.js, server.js).
module.exports = { pool, test };
