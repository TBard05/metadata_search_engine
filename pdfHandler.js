import fs from "fs/promises";
import path from "path";
import { PDFDocument } from "pdf-lib";
import db from "./db.js";

export async function processPdfFile(filePath) {
  const filename = path.basename(filePath);
  try {
    const data = await fs.readFile(filePath);
    const pdf = await PDFDocument.load(data);

    const fields = ["Title","Author","Subject","Creator","Producer","CreationDate","ModificationDate"];
    const info = Object.fromEntries(fields.map(f => [f, pdf[`get${f}`]?.call(pdf) || null]));
    const meta = { numPages: pdf.getPageCount(), ...info };

    await db.query(
      `INSERT INTO files (filename, filepath, filetype)
       VALUES (?, ?, 'pdf')
       ON DUPLICATE KEY UPDATE filepath=VALUES(filepath), filetype='pdf'`,
      [filename, filePath]
    );

    const [row] = await db.query(`SELECT id FROM files WHERE filename=?`, [filename]);
    if (!row) throw new Error("Kunde inte hämta file_id");
    const fileId = row.id;

    const pairs = Object.entries(meta).filter(([, v]) => v != null);
    if (pairs.length) {
      const sql = `INSERT INTO metadata (file_id, metadata_key, metadata_value)
                   VALUES ${pairs.map(() => "(?, ?, ?)").join(",")}
                   ON DUPLICATE KEY UPDATE metadata_value=VALUES(metadata_value)`;
      const params = pairs.flatMap(([k, v]) => [fileId, k, String(v)]);
      await db.query(sql, params);
    }

    console.log(`[pdf] Saved ${filename}`);
  } catch (err) {
    console.error(`[pdf] Error ${filename}:`, err.message);
  }
}
