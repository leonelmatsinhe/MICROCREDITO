"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = require("path");
const dotenv_1 = require("dotenv");
// Quando compilado, __dirname é build/src/config/, então precisamos subir 3 níveis
const envPath1 = (0, path_1.resolve)(__dirname, '../../../.env');
const envPath2 = (0, path_1.resolve)(__dirname, '../../.env');
const result = (0, dotenv_1.config)({ path: envPath1 });
if (result.error) {
    (0, dotenv_1.config)({ path: envPath2 });
}
