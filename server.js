import 'dotenv/config';
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import searchRoutes from "./search.js"; 

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());

app.use(express.static(path.join(__dirname, "frontend")));

const FILES_DIR = process.env.FILES_DIR || "files";
app.use("/files", express.static(path.join(__dirname, FILES_DIR)));

app.use("/api/search", searchRoutes);

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "frontend", "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Serving files from: ${path.join(__dirname, FILES_DIR)}  at  /files`);
});

