import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import searchRoutes from "./routes/search.js";

// --- Create Express app ---
const app = express();

// --- Set up __dirname for ES modules ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Middleware ---
app.use(express.json());
app.use(express.static(path.join(__dirname, "client"))); // Serve static files (images/audio/video)

// --- Routes ---
app.use("/api/search", searchRoutes);

// --- Serve frontend index.html ---
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "client", "index.html"));
});

// --- Start server ---
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
