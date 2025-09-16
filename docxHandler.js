import fs from "fs";
import path from "path";
import PizZip from "pizzip";
import mammoth from "mammoth";
import db from "./db.js";

function extractDocxCore(filePath) {
  const content = fs.readFileSync(filePath, "binary");
  const zip = new PizZip(content);
  const coreXml = zip.files["docProps/core.xml"];
  if (!coreXml) return {};
  const xml = coreXml.asText();
  const pick = (tag) => {
    const m = new RegExp(`<${tag}>(.*?)</${tag}>`).exec(xml);
    return m ? m[1] : null;
  };
  return {
    Title: pick("dc:title") || "Ingen titel",
    Creator: pick("dc:creator") || "Okänd"
  };
}

export async function processDocxFile(filePath) {
  const filename = path.basename(filePath);
  try {
    const { value: text } = await mammoth.extractRawText({ path: filePath });
    const wordCount = (text || "").split(/\s+/).filter(Boolean).length;
    const stat = fs.statSync(filePath);

    const meta = {
      ...extractDocxCore(filePath),
      WordCount: wordCount,
      CreateDate: stat.birthtime?.toISOString?.() || null,
      ModifyDate: stat.mtime?.toISOString?.() || null,
      text
    };

    await db.query(
      `INSERT INTO files (filename, filepath, filetype)
       VALUES (?, ?, 'document')
       ON DUPLICATE KEY UPDATE filepath=VALUES(filepath), filetype='document'`,
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

    console.log(`[docx] Saved ${filename}`);
  } catch (err) {
    console.error(`[docx] Error ${filename}:`, err.message);
  }
}
