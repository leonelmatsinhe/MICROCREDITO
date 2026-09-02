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

  // Migrações: adicionar colunas novas usando SQL raw (evita problemas de tipo Sequelize)
  try {
    const [cols] = await db.query("SHOW COLUMNS FROM customers LIKE 'credentialsSent'").catch(() => [[]] as any);
    if ((cols as any[]).length === 0) {
      await db.query('ALTER TABLE customers ADD COLUMN credentialsSent INTEGER DEFAULT 0');
      console.log('[Migration] Coluna credentialsSent adicionada a customers');
    }
    const [cols2] = await db.query("SHOW COLUMNS FROM customers LIKE 'credentialsSentAt'").catch(() => [[]] as any);
    if ((cols2 as any[]).length === 0) {
      await db.query('ALTER TABLE customers ADD COLUMN credentialsSentAt VARCHAR(255)');
      console.log('[Migration] Coluna credentialsSentAt adicionada a customers');
    }

    const [uCols] = await db.query("SHOW COLUMNS FROM users LIKE 'credentialsSent'").catch(() => [[]] as any);
    if ((uCols as any[]).length === 0) {
      await db.query('ALTER TABLE users ADD COLUMN credentialsSent INTEGER DEFAULT 0');
      console.log('[Migration] Coluna credentialsSent adicionada a users');
    }
    const [uCols2] = await db.query("SHOW COLUMNS FROM users LIKE 'credentialsSentAt'").catch(() => [[]] as any);
    if ((uCols2 as any[]).length === 0) {
      await db.query('ALTER TABLE users ADD COLUMN credentialsSentAt VARCHAR(255)');
      console.log('[Migration] Coluna credentialsSentAt adicionada a users');
    }

    const [wmExists] = await db.query("SHOW TABLES LIKE 'whatsapp_messages'").catch(() => [[]] as any);
    if ((wmExists as any[]).length === 0) {
      await db.query(`CREATE TABLE whatsapp_messages (
        id INTEGER PRIMARY KEY AUTO_INCREMENT,
        companyId INTEGER NOT NULL,
        phone VARCHAR(50) NOT NULL,
        accountNumber VARCHAR(50),
        customerName VARCHAR(255),
        messageType VARCHAR(100) NOT NULL,
        messageBody TEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'queued',
        direction VARCHAR(50) DEFAULT 'outbound',
        payloadJson TEXT,
        createdAt DATETIME,
        updatedAt DATETIME
      )`);
      console.log('[Migration] Tabela whatsapp_messages criada');
    }
  } catch (error) {
    console.error('[Migration] Erro:', error);
  }
});
