"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("./config/env");
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const db_1 = require("./database/db");
const routes_1 = require("./routes");
const cors_1 = __importDefault(require("cors"));
const morgan_1 = __importDefault(require("morgan"));
const body_parser_1 = __importDefault(require("body-parser"));
const app = (0, express_1.default)();
const isCompiled = __dirname.includes(path_1.default.sep + "build" + path_1.default.sep) || __dirname.endsWith(path_1.default.sep + "build");
const projectRoot = isCompiled
    ? path_1.default.join(__dirname, "..", "..")
    : path_1.default.join(__dirname, "..");
// Frontend: servir de public-v2 (Quasar/Vue 3)
const publicDir = process.env.PUBLIC_DIR
    || path_1.default.join(projectRoot, "public-v2");
// Uploads
const uploadsDir = process.env.UPLOADS_DIR
    || path_1.default.join(projectRoot, "uploads");
app.use(body_parser_1.default.urlencoded({ extended: true, limit: "10mb" }));
app.use(body_parser_1.default.json({ limit: "10mb" }));
app.use(express_1.default.static(uploadsDir));
app.use(express_1.default.static(publicDir));
app.use((0, cors_1.default)());
app.use((0, morgan_1.default)("dev"));
app.use(routes_1.routes);
// SPA catch-all: serve index.html for any non-API route
app.get("*", (req, res) => {
    res.sendFile(path_1.default.join(publicDir, "index.html"));
});
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => __awaiter(void 0, void 0, void 0, function* () {
    console.log(`MBR Server is running on PORT ${PORT}`);
    // Migrações: adicionar colunas novas usando SQL raw (evita problemas de tipo Sequelize)
    try {
        const [cols] = yield db_1.db.query("SHOW COLUMNS FROM customers LIKE 'credentialsSent'").catch(() => [[]]);
        if (cols.length === 0) {
            yield db_1.db.query('ALTER TABLE customers ADD COLUMN credentialsSent INTEGER DEFAULT 0');
            console.log('[Migration] Coluna credentialsSent adicionada a customers');
        }
        const [cols2] = yield db_1.db.query("SHOW COLUMNS FROM customers LIKE 'credentialsSentAt'").catch(() => [[]]);
        if (cols2.length === 0) {
            yield db_1.db.query('ALTER TABLE customers ADD COLUMN credentialsSentAt VARCHAR(255)');
            console.log('[Migration] Coluna credentialsSentAt adicionada a customers');
        }
        const [uCols] = yield db_1.db.query("SHOW COLUMNS FROM users LIKE 'credentialsSent'").catch(() => [[]]);
        if (uCols.length === 0) {
            yield db_1.db.query('ALTER TABLE users ADD COLUMN credentialsSent INTEGER DEFAULT 0');
            console.log('[Migration] Coluna credentialsSent adicionada a users');
        }
        const [uCols2] = yield db_1.db.query("SHOW COLUMNS FROM users LIKE 'credentialsSentAt'").catch(() => [[]]);
        if (uCols2.length === 0) {
            yield db_1.db.query('ALTER TABLE users ADD COLUMN credentialsSentAt VARCHAR(255)');
            console.log('[Migration] Coluna credentialsSentAt adicionada a users');
        }
        const [wmExists] = yield db_1.db.query("SHOW TABLES LIKE 'whatsapp_messages'").catch(() => [[]]);
        if (wmExists.length === 0) {
            yield db_1.db.query(`CREATE TABLE whatsapp_messages (
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
    }
    catch (error) {
        console.error('[Migration] Erro:', error);
    }
}));
