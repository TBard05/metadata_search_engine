import express from "express";
import db from "./db.js"; 
import path from "path";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    let { filename, key, value, operator, filetype, lat, lng, radius } = req.query;

    const relevance = `
      (CASE
        WHEN f.filename LIKE ? THEN 2
        WHEN m.metadata_value LIKE ? THEN 1
        ELSE 0
      END) AS relevance
    `;

    let query = `
      SELECT f.id, f.filename, f.filepath, f.filetype, f.upload_date,
             m.metadata_key AS \`key\`, m.metadata_value AS value,
             ${relevance}
      FROM files f
      LEFT JOIN metadata m ON f.id = m.file_id
      WHERE 1=1
    `;

    const params = [`%${filename || ""}%`, `%${value || ""}%`];

    if (filename) {
      query += " AND f.filename LIKE ?";
      params.push(`%${filename}%`);
    }

    if (filetype) {
      query += " AND f.filetype = ?";
      params.push(filetype);
    }

    if (key && value) {
      operator = ["=", "!=", ">", "<"].includes(operator) ? operator : "=";
      if (operator === "=") {
        query += " AND m.metadata_key = ? AND m.metadata_value LIKE ?";
        params.push(key, `%${value}%`);
      } else if (operator === "!=") {
        query += " AND m.metadata_key = ? AND m.metadata_value NOT LIKE ?";
        params.push(key, `%${value}%`);
      } else {
        query += ` AND m.metadata_key = ? AND m.metadata_value ${operator} ?`;
        params.push(key, value);
      }
    }

    if (lat && lng && radius) {
      query += `
        AND f.id IN (
          SELECT g.file_id
          FROM geodata g
          WHERE ST_Distance_Sphere(
            point(g.longitude, g.latitude),
            point(?, ?)
          ) <= ? * 1000
        )
      `;
      params.push(lng, lat, radius);
    }

    query += " ORDER BY relevance DESC, f.upload_date DESC";

    const rows = await db.query(query, params);

    const filesMap = new Map();
    rows.forEach(r => {
      if (!filesMap.has(r.id)) {
        filesMap.set(r.id, {
          id: r.id,
          filename: r.filename,
          filepath: r.filepath,
          filetype: r.filetype,
          relevance: r.relevance,
          metadata: [],
          imageUrl: r.filetype === "image" ? `/files/${path.basename(r.filepath) || r.filename}` : null
        });
      }

      if (r.key) {
        let metaValue = r.value;
        if (metaValue === "[object Object]") metaValue = "";
        if (typeof metaValue === "string" && (metaValue.startsWith("{") || metaValue.startsWith("["))) {
          try {
            metaValue = JSON.stringify(JSON.parse(metaValue), null, 2);
          } catch {}
        }
        filesMap.get(r.id).metadata.push({ key: r.key, value: metaValue });
      }
    });

    res.json({ results: Array.from(filesMap.values()) });
  } catch (err) {
    console.error("Search error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
