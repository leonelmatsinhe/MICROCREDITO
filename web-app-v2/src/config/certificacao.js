/**
 * CERTIFICAÇÃO AT — FEATURE FLAG (frontend)
 * ─────────────────────────────────────────────────────────────────────────────
 * TODO AT: Ativar quando tiver Certificado AT 2026/001
 *
 * Deve espelhar AT_CERTIFICADO_ENABLED do backend (src/config/certificacao.ts).
 * Controla apenas a APRESENTAÇÃO do selo AT no ecrã (faixa de hash, botão
 * "Validar QR", menções ao hash) — a lógica do selo é 100% backend e continua a
 * gravar hash/QR/código na base de dados independentemente desta flag.
 *
 * Quando a licença chegar: colocar true aqui E no backend
 * (ou via variável de ambiente AT_CERTIFICADO_ENABLED=true) — sem tocar em código.
 */
export const AT_CERTIFICADO_ENABLED = false
export default { AT_CERTIFICADO_ENABLED }
