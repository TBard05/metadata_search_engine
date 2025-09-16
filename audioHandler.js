import { parseFile } from "music-metadata";
import path from "path";
import db from "./db.js";

export async function processAudioFile(filePath) {
  const filename = path.basename(filePath);
  try {
    const metadata = await parseFile(filePath);

    const commonMetadata = { ...metadata.common };

    delete commonMetadata.native;
    delete commonMetadata.quality;
    delete commonMetadata.label;
    delete commonMetadata.website;
    delete commonMetadata.picture;
    delete commonMetadata.encodedby;
    delete commonMetadata.movementIndex;
    delete commonMetadata.copyright;
    delete commonMetadata.license;
    delete commonMetadata.comment;
    delete commonMetadata.disk;

    const insertFile = `
      INSERT INTO files (filename, filepath, filetype)
      VALUES (?, ?, 'audio')
      ON DUPLICATE KEY UPDATE filepath = VALUES(filepath), filetype = 'audio'
    `;
    await db.query(insertFile, [filename, filePath]);

    const [fileRow] = await db.query(`SELECT id FROM files WHERE filename = ?`, [filename]);
    if (!fileRow) throw new Error("Kunde inte hämta file_id för " + filename);
    const fileId = fileRow.id;

    for (const [key, value] of Object.entries(commonMetadata)) {
      if (value === undefined || value === null) continue;
      const valStr = typeof value === "string" ? value : JSON.stringify(value);

      const insertMeta = `
        INSERT INTO metadata (file_id, metadata_key, metadata_value)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE metadata_value = VALUES(metadata_value)
      `;
      await db.query(insertMeta, [fileId, key, valStr]);
    }

    console.log(`[audio] Saved ${filename}`);
  } catch (err) {
    console.error(`[audio] Error processing ${filename}:`, err.message);
  }
}
