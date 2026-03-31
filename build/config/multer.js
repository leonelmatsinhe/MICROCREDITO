"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.multerConfig = void 0;
const crypto_1 = require("crypto");
const fs_1 = require("fs");
const multer_1 = require("multer");
const path_1 = require("path");
const isCompiled = __dirname.includes(`${path_1.sep}build${path_1.sep}`) || __dirname.endsWith(`${path_1.sep}build`);
const projectRoot = isCompiled
    ? (0, path_1.join)(__dirname, "..", "..", "..")
    : (0, path_1.join)(__dirname, "..", "..");
const documentsUploadDir = (0, path_1.join)(projectRoot, "uploads", "documents");
(0, fs_1.mkdirSync)(documentsUploadDir, { recursive: true });
exports.multerConfig = {
    storage: (0, multer_1.diskStorage)({
        destination: (request, file, callback) => {
            callback(null, documentsUploadDir);
        },
        filename: (request, file, callback) => {
            (0, crypto_1.randomBytes)(16, (error, hash) => {
                if (error) {
                    callback(error, file.filename);
                }
                const filename = `${hash.toString("hex")}_${file.originalname}`;
                callback(null, filename);
            });
        },
    }),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
    },
    fileFilter: (request, file, callback) => {
        const formats = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];
        if (formats.includes(file.mimetype)) {
            callback(null, true);
        }
        else {
            callback(new Error("Format not accepted."));
        }
    },
};
