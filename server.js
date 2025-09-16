import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import searchRoutes from "./routes/search.js";

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Middleware ---
// Serve frontend
app.use(express.static(path.join(__dirname, "client"))); 
// Serve files for preview and download
app.use("/files", express.static(path.join(__dirname, "files"))); 
app.use("/download", express.static(path.join(__dirname, "files"))); 

// --- Routes ---
app.use("/api/search", searchRoutes);

// --- Serve index.html ---
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "client", "index.html"));
});

// --- Start server ---
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});


