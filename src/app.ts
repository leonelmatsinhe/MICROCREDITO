import "./config/env";
import express, { json } from "express";
import path from "path";
import fs from "fs";
import { db } from "./database/db";
import { routes } from "./routes";
import cors from "cors";
import morgan from "morgan";
import bodyParser from "body-parser";



const app = express();

const isCompiled = __dirname.includes(path.sep + "build" + path.sep) || __dirname.endsWith(path.sep + "build");
const projectRoot = isCompiled
  ? path.join(__dirname, "..", "..")
  : path.join(__dirname, "..");

// Frontend: servir de public-v2 (Quasar/Vue 3)
const publicDir = process.env.PUBLIC_DIR
  || path.join(projectRoot, "public-v2");

// Uploads
const uploadsDir = process.env.UPLOADS_DIR
  || path.join(projectRoot, "uploads");

app.use(bodyParser.urlencoded({ extended: true, limit: "10mb" }));
app.use(bodyParser.json({ limit: "10mb" }));
app.use(express.static(uploadsDir));
app.use(express.static(publicDir));
app.use(cors());
app.use(morgan("dev"));
app.use(routes);

// SPA catch-all: serve index.html for any non-API route
app.get("*", (req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, async () => {
  console.log(`MBR Server is running on PORT ${PORT}`);
});
