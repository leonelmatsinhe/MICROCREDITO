/**
 * Gerar código aleatório de 6 dígitos numéricos
 * Usado para senhas de usuários e mutuários
 * @returns {string} Código de 6 dígitos (ex: "847291")
 */
export function generateSixDigitCode() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

/**
 * Gerar código alfanumérico curto (para referências)
 * @param {number} length - Tamanho do código (padrão: 8)
 * @returns {string} Código alfanumérico
 */
export function generateReferenceCode(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}
