import "./config/env";
import express, { json } from "express";
import path from "path";
import { db } from "./database/db";
import { routes } from "./routes";
import cors from "cors";
import morgan from "morgan";
import bodyParser from "body-parser";

const app = express();

// Determina a raiz do projecto:
//   Dev (ts-node):  __dirname = .../src/        → subir 1 nível
//   Prod (compiled): __dirname = .../build/src/ → subir 2 níveis
const isCompiled = __dirname.includes(path.sep + "build" + path.sep) || __dirname.endsWith(path.sep + "build");
const projectRoot = isCompiled
  ? path.join(__dirname, "..", "..")
  : path.join(__dirname, "..");

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(projectRoot, "uploads")));
app.use(express.static(path.join(projectRoot, "public")));
app.use(cors());
app.use(morgan("dev"));
app.use(routes);

// SPA catch-all: serve index.html for any non-API route
app.get("*", (req, res) => {
  res.sendFile(path.join(projectRoot, "public", "index.html"));
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
  // await db.sync();
  console.log(`MBR Server is running on PORT ${PORT}`);
});
