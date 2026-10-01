/**
 * CERTIFICAÇÃO AT — FEATURE FLAG
 * ─────────────────────────────────────────────────────────────────────────────
 * TODO AT: Ativar quando tiver Certificado AT 2026/001
 *
 * Enquanto a instituição não tiver o certificado da Autoridade Tributária, o
 * recibo NÃO apresenta os elementos do selo AT (QR Code, hash SHA-256, código
 * de validação, link de validação, texto legal do Decreto n.º 22/2023 e
 * segunda página fiscal) — mas a LÓGICA continua 100% activa no backend:
 *
 *   · numeração sequencial legal (REC-AAAA-NNNNN) — sempre;
 *   · hash SHA-256, código de validação AT-AAAA-NNNNN, conteúdo e PNG do QR —
 *     calculados e gravados em `recibos` (hash_at, at_validation_code,
 *     qr_content, qr_code_url, software_certification) — sempre;
 *   · página pública de validação `/validar?rec=…&hash=…` — sempre activa.
 *
 * Quando a licença chegar, basta colocar AT_CERTIFICADO_ENABLED=true (aqui ou
 * na variável de ambiente) que os elementos voltam a aparecer no PDF sem
 * alterar código.
 */
export const AT_CERTIFICADO_ENABLED: boolean =
  String(process.env.AT_CERTIFICADO_ENABLED ?? "false").trim().toLowerCase() === "true";

export default { AT_CERTIFICADO_ENABLED };
