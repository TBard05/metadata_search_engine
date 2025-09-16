import exifr from "exifr";
import fs from "fs";
import path from "path";
import db from "./db.js";

async function getLocationFromCoords(/* lat, lng */) {
  return { city: null, country: null };
}

export async function processImageFile(filePath) {
  const filename = path.basename(filePath);
  try {
    const exif = (await exifr.parse(filePath).catch(() => null)) || {};
    const lat = exif?.latitude ?? null;
    const lng = exif?.longitude ?? null;
    const loc = lat != null && lng != null ? await getLocationFromCoords(lat, lng) : { city: null, country: null };

    const meta = {
      Make: exif?.Make || null,
      Model: exif?.Model || null,
      DateTimeOriginal: exif?.DateTimeOriginal ? new Date(exif.DateTimeOriginal).toISOString() : null
    };

    await db.query(
      `INSERT INTO files (filename, filepath, filetype, city, country)
       VALUES (?, ?, 'image', ?, ?)
       ON DUPLICATE KEY UPDATE filepath=VALUES(filepath), filetype='image', city=VALUES(city), country=VALUES(country)`,
      [filename, filePath, loc.city, loc.country]
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

    if (lat != null && lng != null) {
      await db.query(
        `INSERT INTO geodata (file_id, latitude, longitude)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE latitude=VALUES(latitude), longitude=VALUES(longitude)`,
        [fileId, lat, lng]
      );
    }

    console.log(`[image] Saved ${filename}`);
  } catch (err) {
    console.error(`[image] Error ${filename}:`, err.message);
  }
}
