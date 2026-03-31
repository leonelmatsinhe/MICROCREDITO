import { randomBytes } from "crypto";
import { mkdirSync } from "fs";
import { diskStorage, Options } from "multer";
import { join, sep } from "path";

const isCompiled =
  __dirname.includes(`${sep}build${sep}`) || __dirname.endsWith(`${sep}build`);
const projectRoot = isCompiled
  ? join(__dirname, "..", "..", "..")
  : join(__dirname, "..", "..");
const documentsUploadDir = join(projectRoot, "uploads", "documents");

mkdirSync(documentsUploadDir, { recursive: true });

export const multerConfig = {
  storage: diskStorage({
    destination: (request, file, callback) => {
      callback(null, documentsUploadDir);
    },
    filename: (request, file, callback) => {
      randomBytes(16, (error, hash) => {
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
    } else {
      callback(new Error("Format not accepted."));
    }
  },
} as Options;
