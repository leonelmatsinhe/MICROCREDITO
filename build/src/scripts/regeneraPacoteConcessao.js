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
/**
 * REGENERAÇÃO ADMINISTRATIVA de um pacote de concessão já emitido.
 *
 * Excepção à imutabilidade: destinada a corrigir documentos gerados com
 * cálculos antigos/errados (ex.: coluna Saldo do plano com a fórmula da
 * dívida total). Re-renderiza os 4 PDFs com o código ACTUAL, substitui os
 * ficheiros no storage, recalcula o package_hash (mesma fórmula: SHA-256 de
 * loanId + conteúdo dos PDFs) e registra a operação no audit_log.
 *
 * Uso: node --env-file=.env --require ts-node/register/transpile-only src/scripts/regeneraPacoteConcessao.ts <loanId> [...]
 */
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const db_1 = require("../database/db");
const legalDocsService_1 = require("../services/legalDocsService");
const concessionPackageService_1 = require("../services/concessionPackageService");
const paymentsV2Models_1 = require("../database/models/paymentsV2Models");
const main = () => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const loanIds = process.argv.slice(2).map(Number).filter(Boolean);
    if (loanIds.length === 0) {
        console.error("Uso: node --env-file=.env --require ts-node/register/transpile-only src/scripts/regeneraPacoteConcessao.ts <loanId> [...]");
        process.exit(1);
    }
    for (const loanId of loanIds) {
        const [rows] = yield db_1.db.query("SELECT * FROM concession_packages WHERE loanId = ? LIMIT 1", { replacements: [loanId] });
        const pacote = rows[0];
        if (!pacote) {
            console.log(`[Pacote] Crédito #${loanId}: sem pacote emitido — nada a fazer.`);
            continue;
        }
        const data = yield (0, legalDocsService_1.loadLegalDocsData)(loanId);
        if (!data || !data.loan) {
            console.log(`[Pacote] Crédito #${loanId}: crédito não encontrado.`);
            continue;
        }
        const dirAbs = path_1.default.join(process.cwd(), String(pacote.storage_dir || ""));
        if (!fs_1.default.existsSync(dirAbs)) {
            console.log(`[Pacote] Crédito #${loanId}: storage não encontrado (${dirAbs}).`);
            continue;
        }
        const docsAntigos = typeof pacote.docs === "string" ? JSON.parse(pacote.docs) : pacote.docs || {};
        const docs = {};
        const buffers = [];
        for (const docDef of concessionPackageService_1.DOCS_DO_PACOTE) {
            const pdf = yield (0, legalDocsService_1.renderLegalDoc)(docDef.key, data, {
                emitidoEm: pacote.created_at ? new Date(pacote.created_at) : new Date(),
            });
            const fileName = String(((_a = docsAntigos[docDef.key]) === null || _a === void 0 ? void 0 : _a.file) || `${docDef.file}-conta-${data.loan.getDataValue("accountNumber")}-${loanId}.pdf`);
            fs_1.default.writeFileSync(path_1.default.join(dirAbs, fileName), pdf);
            docs[docDef.key] = {
                file: fileName,
                bytes: pdf.length,
                hash: crypto_1.default.createHash("sha256").update(pdf).digest("hex"),
            };
            buffers.push(pdf);
            console.log(`[Pacote] Crédito #${loanId}: ${docDef.label} → ${fileName} (${pdf.length} bytes)`);
        }
        // Mesma fórmula do generateConcessionPackage: SHA-256 de loanId + PDFs.
        const packageHash = crypto_1.default
            .createHash("sha256")
            .update(Buffer.concat([Buffer.from(String(loanId)), ...buffers]))
            .digest("hex");
        yield db_1.db.query("UPDATE concession_packages SET docs = ?, package_hash = ? WHERE id = ?", { replacements: [JSON.stringify(docs), packageHash, Number(pacote.id)] });
        try {
            yield paymentsV2Models_1.AuditLogModel.create({
                user_id: null,
                company_id: Number(data.loan.getDataValue("companyId")) || null,
                ip: null,
                action: "CONCESSION_REGENERADO",
                entity: "concession_packages",
                entity_id: Number(pacote.id),
                before_data: { package_hash: String(pacote.package_hash || "") },
                after_data: { loanId, package_hash: packageHash, docs: Object.keys(docs) },
            });
        }
        catch ( /* audit best-effort */_b) { /* audit best-effort */ }
        console.log(`[Pacote] Crédito #${loanId}: regenerado ✓ · novo package_hash ${packageHash.slice(0, 24)}…`);
    }
    process.exit(0);
});
main()
    .catch((error) => {
    console.error("[Pacote] Erro:", (error === null || error === void 0 ? void 0 : error.message) || error);
    process.exit(1);
})
    .finally(() => db_1.db.close().catch(() => { }));
