/**
 * Espelho frontend de src/utils/kycDocuments.ts (backend).
 * Mantém a lista de documentos KYC e os alias sincronizados com o servidor,
 * de forma a que a checklist da aba Documentos & KYC classifique os documentos
 * exactamente como o backend os avalia.
 */

export const KYC_BASE_DOCUMENTS = [
  'BI / Passaporte / Carta de condução',
  'NUIT',
  'Comprovativo de rendimentos'
]

export const KYC_FULL_DOCUMENTS = [
  ...KYC_BASE_DOCUMENTS,
  'Declaração do bairro',
  'Foto tipo passe',
  'Contrato autenticado'
]

const KYC_ALIASES = {
  'BI / Passaporte / Carta de condução': ['bi', 'bilhete de identidade', 'passaporte', 'carta de condução', 'carta de conducao', 'documento de identificação', 'documento de identificacao'],
  'NUIT': ['nuit'],
  'Comprovativo de rendimentos': ['comprovativo de rendimento', 'comprovativo de rendimentos', 'comprovativo rendimento', 'rendimentos'],
  'Declaração do bairro': ['declaração do bairro', 'declaracao do bairro', 'declaração de bairro', 'declaracao de bairro'],
  'Foto tipo passe': ['foto', 'foto tipo passe', 'fotografia', 'foto passe'],
  'Contrato autenticado': ['contrato', 'contrato autenticado']
}

const normalize = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

const canonicalByNormalized = {}
for (const canonical of KYC_FULL_DOCUMENTS) {
  canonicalByNormalized[normalize(canonical)] = canonical
  for (const alias of KYC_ALIASES[canonical] || []) {
    canonicalByNormalized[normalize(alias)] = canonical
  }
}

/** Nome canónico do documento ou null se desconhecido (igual ao backend). */
export function toCanonicalDocumentName(documentName) {
  return canonicalByNormalized[normalize(documentName)] || null
}
