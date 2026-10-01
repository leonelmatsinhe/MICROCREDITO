"use strict";
/**
 * KYC — checklist de documentos do mutuário (fonte única de verdade).
 *
 * Usada por:
 *  - GET /api/document/checklist/:accountNumber (endpoint de auditoria);
 *  - bloqueio de desembolso em POST /api/loan e POST /api/createInstallmentsLoan;
 *  - feedback em tempo real na aba "Documentos & KYC" do mutuário.
 *
 * Regra de negócio: nenhum crédito pode ser desembolsado sem os 3 documentos
 * base (BI, NUIT e Comprovativo de Rendimento).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateKyc = exports.toCanonicalDocumentName = exports.KYC_FULL_DOCUMENTS = exports.KYC_BASE_DOCUMENTS = void 0;
// Nomes canónicos dos documentos base (exactamente como o frontend cadastra
// em customer_documents.documentName).
exports.KYC_BASE_DOCUMENTS = [
    "BI / Passaporte / Carta de condução",
    "NUIT",
    "Comprovativo de rendimentos",
];
// Lista completa (6) apresentada na aba de documentos.
exports.KYC_FULL_DOCUMENTS = [
    ...exports.KYC_BASE_DOCUMENTS,
    "Declaração do bairro",
    "Foto tipo passe",
    "Contrato autenticado",
];
// Alias históricos guardados na BD antes da padronização — reconhecidos como
// equivalentes para não bloquear mutuários antigos por diferença de texto.
const KYC_ALIASES = {
    "BI / Passaporte / Carta de condução": [
        "bi",
        "bilhete de identidade",
        "passaporte",
        "carta de condução",
        "carta de conducao",
        "documento de identificação",
        "documento de identificacao",
    ],
    "NUIT": ["nuit"],
    "Comprovativo de rendimentos": [
        "comprovativo de rendimento",
        "comprovativo de rendimentos",
        "comprovativo rendimento",
        "rendimentos",
    ],
    "Declaração do bairro": ["declaração do bairro", "declaracao do bairro", "declaração de bairro", "declaracao de bairro"],
    "Foto tipo passe": ["foto", "foto tipo passe", "fotografia", "foto passe"],
    "Contrato autenticado": ["contrato", "contrato autenticado"],
};
const normalize = (value) => String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
// Normaliza alias → nome canónico
const canonicalByNormalized = {};
for (const canonical of exports.KYC_FULL_DOCUMENTS) {
    canonicalByNormalized[normalize(canonical)] = canonical;
    for (const alias of KYC_ALIASES[canonical] || []) {
        canonicalByNormalized[normalize(alias)] = canonical;
    }
}
/** Devolve o nome canónico do documento ou null se desconhecido. */
const toCanonicalDocumentName = (documentName) => {
    return canonicalByNormalized[normalize(documentName)] || null;
};
exports.toCanonicalDocumentName = toCanonicalDocumentName;
/**
 * Avalia a checklist KYC a partir das linhas de customer_documents.
 * Um documento só conta se tiver ficheiro anexado (documentFileUrl).
 */
const evaluateKyc = (documents) => {
    const present = new Set();
    const attached = [];
    for (const doc of documents || []) {
        // Documento só é válido para KYC se existir ficheiro físico associado.
        if (!(doc === null || doc === void 0 ? void 0 : doc.documentFileUrl))
            continue;
        attached.push(doc);
        const canonical = (0, exports.toCanonicalDocumentName)(doc.documentName);
        if (canonical)
            present.add(canonical);
    }
    const missing = exports.KYC_BASE_DOCUMENTS.filter((doc) => !present.has(doc));
    return {
        complete: missing.length === 0,
        missing,
        present: [...present],
        documents: attached,
        total: attached.length,
    };
};
exports.evaluateKyc = evaluateKyc;
