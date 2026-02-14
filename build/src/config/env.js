"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = require("path");
const dotenv_1 = require("dotenv");
// Determina a raiz do projecto com base em __dirname
const isCompiled = __dirname.includes(path_1.sep + "build" + path_1.sep) || __dirname.endsWith(path_1.sep + "build");
const projectRoot = isCompiled
    ? (0, path_1.resolve)(__dirname, "..", "..", "..")
    : (0, path_1.resolve)(__dirname, "..", "..");
(0, dotenv_1.config)({ path: (0, path_1.join)(projectRoot, ".env") });
