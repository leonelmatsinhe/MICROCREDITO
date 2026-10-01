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
Object.defineProperty(exports, "__esModule", { value: true });
require("./../config/env");
const index_1 = require("./index");
/**
 * Executa as migrações de base de dados de forma isolada.
 * Uso: npm run migrate   (ou: node build/src/migrations/run.js)
 */
const main = () => __awaiter(void 0, void 0, void 0, function* () {
    console.log("[Migration] A aplicar migrações de base de dados...");
    const result = yield (0, index_1.runMigrations)();
    console.log(`[Migration] Concluído: ${result.applied} aplicadas, ${result.skipped} já existentes, ${result.errors.length} erros.`);
    if (result.errors.length > 0) {
        result.errors.forEach((error) => console.error("[Migration]", error));
        process.exit(1);
    }
    process.exit(0);
});
main().catch((error) => {
    console.error("[Migration] Falha geral:", (error === null || error === void 0 ? void 0 : error.message) || error);
    process.exit(1);
});
