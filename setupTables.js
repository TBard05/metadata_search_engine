// setupTables.js
import db from "./db.js"; // make sure db.js is in the same folder

async function setupTables() {
  try {
    // Drop tables individually if they exist
    await db.query("DROP TABLE IF EXISTS geodata");
    await db.query("DROP TABLE IF EXISTS metadata");
    await db.query("DROP TABLE IF EXISTS files");

    // Create files table
    await db.query(`
      CREATE TABLE files (
        id INT AUTO_INCREMENT PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        filepath VARCHAR(255) NOT NULL,
        filetype VARCHAR(50),
        upload_date DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create metadata table
    await db.query(`
      CREATE TABLE metadata (
        id INT AUTO_INCREMENT PRIMARY KEY,
        file_id INT NOT NULL,
        metadata_key VARCHAR(255) NOT NULL,
        metadata_value TEXT,
        FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
      )
    `);

    // Create geodata table
    await db.query(`
      CREATE TABLE geodata (
        id INT AUTO_INCREMENT PRIMARY KEY,
        file_id INT NOT NULL,
        latitude DECIMAL(9,6),
        longitude DECIMAL(9,6),
        FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
      )
    `);

    console.log(" Tables created successfully!");
  } catch (err) {
    console.error(" Error setting up tables:", err.message);
  } finally {
    await db.end();
  }
}

// Run the setup
setupTables();
