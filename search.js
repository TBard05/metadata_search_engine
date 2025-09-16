import express from "express";
import db from "../db.js";
import path from "path";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    let { filename, key, value, operator, filetype, lat, lng, radius } = req.query;

    // Base query
    let query = `
      SELECT f.id, f.filename, f.filepath, f.filetype, f.upload_date,
             m.metadata_key AS meta_key, m.metadata_value AS meta_value,
             CASE
               WHEN f.filename LIKE ? THEN 2
               WHEN m.metadata_value LIKE ? THEN 1
               ELSE 0
             END AS relevance
      FROM files f
      LEFT JOIN metadata m ON f.id = m.file_id
      WHERE 1=1
    `;
    
    const params = [`%${filename || ''}%`, `%${value || ''}%`];

    // Filters
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

    const [rows] = await db.query(query, params);

    // --- Deduplicate files and metadata ---
    const filesMap = new Map();

    rows.forEach(r => {
      if (!filesMap.has(r.id)) {
        filesMap.set(r.id, {
          id: r.id,
          filename: r.filename,
          filepath: r.filepath,
          filetype: r.filetype,
          relevance: r.relevance,
          metadata: new Map(), // temporary Map to dedupe metadata
          viewUrl: `/files/${path.basename(r.filepath)}`,
          downloadUrl: `/download/${path.basename(r.filepath)}`
        });
      }

      if (r.meta_key && r.meta_value) {
        let metaValue = r.meta_value;

        // Parse JSON if looks like JSON
        if (typeof metaValue === "string" && (metaValue.startsWith("{") || metaValue.startsWith("["))) {
          try {
            metaValue = JSON.stringify(JSON.parse(metaValue), null, 2);
          } catch {}
        }

        filesMap.get(r.id).metadata.set(r.meta_key, metaValue);
      }
    });

    // Convert metadata Map to array for JSON
    const results = Array.from(filesMap.values()).map(f => ({
      ...f,
      metadata: Array.from(f.metadata, ([key, value]) => ({ key, value }))
    }));

    res.json({ results });

  } catch (err) {
    console.error("Search error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;


