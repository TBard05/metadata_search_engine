// extract/extract.js
import fs from "fs";
import path from "path";
import exifr from "exifr";
import pdf from "pdf-parse";
import mm from "music-metadata";
import pkg from "office-document-properties";
import mysql from "mysql2/promise";

// --- Helper function for DOCX ---
function getDocxProps(buffer) {
  return new Promise((resolve, reject) => {
    pkg.fromBuffer(buffer, (err, props) => {
      if (err) reject(err);
      else resolve(props);
    });
  });
}

// --- MySQL Connection ---
const db = await mysql.createConnection({
  host: "5.189.183.23",
  user: "dm24-hbg-grupp6",
  password: "BPQYL58712",
  database: "dm24-hbg-grupp6",
  port: 4567,
  ssl: { rejectUnauthorized: false }
});

// --- Path to files folder ---
const folderPath = path.join(process.cwd(), "files");
if (!fs.existsSync(folderPath)) {
  console.error(" Folder 'files' does not exist!");
  process.exit(1);
}

const files = fs.readdirSync(folderPath);

// --- CSV output array ---
const csvRows = [];

for (const [index, file] of files.entries()) {
  const filePath = path.join(folderPath, file);
  const ext = path.extname(file).toLowerCase();
  let metadata = {};
  let filetype = "";
  let timestamp = new Date().toISOString().replace("T", " ").split(".")[0];

  try {
    // --- Images ---
    if ([".jpg", ".jpeg", ".png"].includes(ext)) {
      metadata = (await exifr.parse(filePath, { gps: true })) || {};
      filetype = "image";
    }
    // --- PDFs ---
    else if (ext === ".pdf") {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdf(dataBuffer);
      metadata = { textLength: data.text.length };
      filetype = "pdf";
    }
    // --- Audio ---
    else if ([".mp3", ".wav", ".flac"].includes(ext)) {
      const data = await mm.parseFile(filePath);
      metadata = {};

      for (const [key, value] of Object.entries(data.common)) {
        if (value && typeof value === "object") {
          for (const [subKey, subValue] of Object.entries(value)) {
            if (subValue !== undefined && subValue !== null) {
              metadata[`${key}_${subKey}`] = subValue;
            }
          }
        } else if (value !== undefined && value !== null) {
          metadata[key] = value;
        }
      }

      if (data.format) {
        if (data.format.bitrate) metadata.bitrate = data.format.bitrate;
        if (data.format.duration) metadata.durationSec = data.format.duration;
      }

      filetype = "audio";
    }
    // --- DOCX ---
    else if (ext === ".docx") {
      const buffer = fs.readFileSync(filePath);
      const props = await getDocxProps(buffer);
      metadata = props || {};
      filetype = "docx";
      console.log(" DOCX metadata:", metadata);
    }
    // --- Skip unsupported files ---
    else {
      console.log(`⏭ Skipping unsupported file: ${file}`);
      continue;
    }

    // --- Insert into files table ---
    const [result] = await db.execute(
      "INSERT INTO files (filename, filepath, filetype, upload_date) VALUES (?, ?, ?, NOW())",
      [file, filePath, filetype]
    );
    const fileId = result.insertId;

    // --- Insert metadata into metadata table ---
    for (const [key, value] of Object.entries(metadata)) {
      if (value !== null && value !== undefined) {
        await db.execute(
          "INSERT INTO metadata (file_id, metadata_key, metadata_value) VALUES (?, ?, ?)",
          [fileId, key, String(value)]
        );
      }
    }

    // --- Insert GPS into geodata if present ---
    if (metadata.latitude && metadata.longitude) {
      await db.execute(
        "INSERT INTO geodata (file_id, latitude, longitude) VALUES (?, ?, ?)",
        [fileId, metadata.latitude, metadata.longitude]
      );
      console.log(` Inserted GPS for ${file}: ${metadata.latitude}, ${metadata.longitude}`);
    }

    console.log(` Inserted ${file} (id=${fileId}) with ${Object.keys(metadata).length} metadata fields`);

    // --- Add CSV row ---
    csvRows.push(`${index + 1},${file},${filePath},${filetype},${timestamp}`);
  } catch (err) {
    console.error(` Error processing ${file}:`, err.message);
  }
}

// --- Close DB connection ---
await db.end();

// --- Write CSV output ---
const csvOutput = csvRows.join("\n");
fs.writeFileSync(path.join(process.cwd(), "files_metadata.csv"), csvOutput, "utf8");

console.log(" CSV output saved as files_metadata.csv");
console.log(" All files processed!");
