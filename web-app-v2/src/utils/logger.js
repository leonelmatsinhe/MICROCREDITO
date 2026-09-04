import { api } from '@/boot/axios'

/**
 * Regista uma acção no sistema de logs
 * @param {Object} params - Parâmetros do log
 */
export async function logAction({ userId, companyId, userName, userRole, action, module, description }) {
  if (!userId || !companyId) return
  try {
    await api.post('/api/logs', {
      userId,
      companyId,
      userName: String(userName || 'Utilizador').trim() || 'Utilizador',
      userRole: userRole === undefined || userRole === null || userRole === '' ? null : userRole,
      action: String(action || 'ACÇÃO').trim() || 'ACÇÃO',
      module: module || null,
      description: String(description || '').trim()
    })
  } catch (error) {
    console.error('Erro ao registar log:', error)
  }
}

/**
 * Nome do utilizador — staff usa `name`, mutuário usa `customerName`
 */
function resolveUserName(user) {
  if (!user) return 'Utilizador'
  return (user.name || user.customerName || 'Cliente').trim()
}

/**
 * Helper para obter dados do utilizador actual
 */
function getCurrentUser() {
  try {
    const userStr = localStorage.getItem('user')
    if (userStr) {
      return JSON.parse(userStr)
    }
  } catch {}
  return null
}

/**
 * Helper para logs de autenticação
 */
export async function logLogin(user) {
  const name = resolveUserName(user)
  return logAction({
    userId: user.id,
    companyId: user.companyId,
    userName: name,
    userRole: user.userRole,
    action: 'LOGIN',
    module: 'Autenticação',
    description: `${name} fez login no sistema`
  })
}

export async function logLogout(user) {
  const name = resolveUserName(user)
  return logAction({
    userId: user.id,
    companyId: user.companyId,
    userName: name,
    userRole: user.userRole,
    action: 'LOGOUT',
    module: 'Autenticação',
    description: `${name} fez logout do sistema`
  })
}

/**
 * Helper para logs de Mutuários
 */
export async function logCreateCustomer(customerName) {
  const user = getCurrentUser()
  if (!user) return
  return logAction({
    userId: user.id,
    companyId: user.companyId,
    userName: user.name,
    userRole: user.userRole,
    action: 'CRIAR',
    module: 'Mutuários',
    description: `Mutuário "${customerName}" criado com sucesso`
  })
}

export async function logEditCustomer(customerName) {
  const user = getCurrentUser()
  if (!user) return
  return logAction({
    userId: user.id,
    companyId: user.companyId,
    userName: user.name,
    userRole: user.userRole,
    action: 'EDITAR',
    module: 'Mutuários',
    description: `Dados do mutuário "${customerName}" actualizados`
  })
}

export async function logDeleteCustomer(customerName) {
  const user = getCurrentUser()
  if (!user) return
  return logAction({
    userId: user.id,
    companyId: user.companyId,
    userName: user.name,
    userRole: user.userRole,
    action: 'ELIMINAR',
    module: 'Mutuários',
    description: `Mutuário "${customerName}" eliminado`
  })
}

export async function logDeactivateCustomer(customerName) {
  const user = getCurrentUser()
  if (!user) return
  return logAction({
    userId: user.id,
    companyId: user.companyId,
    userName: user.name,
    userRole: user.userRole,
    action: 'DESACTIVAR',
    module: 'Mutuários',
    description: `Mutuário "${customerName}" desactivado`
  })
}

/**
 * Helper para logs de Créditos
 */
export async function logCreateLoan(customerName, amount) {
  const user = getCurrentUser()
  if (!user) return
  return logAction({
    userId: user.id,
    companyId: user.companyId,
    userName: user.name,
    userRole: user.userRole,
    action: 'CRIAR',
    module: 'Créditos',
    description: `Crédito de ${formatMoney(amount)} criado para "${customerName}"`
  })
}

export async function logApproveLoan(customerName, amount) {
  const user = getCurrentUser()
  if (!user) return
  return logAction({
    userId: user.id,
    companyId: user.companyId,
    userName: user.name,
    userRole: user.userRole,
    action: 'APROVAR',
    module: 'Créditos',
    description: `Crédito de ${formatMoney(amount)} aprovado para "${customerName}"`
  })
}

export async function logRejectLoan(customerName, amount) {
  const user = getCurrentUser()
  if (!user) return
  return logAction({
    userId: user.id,
    companyId: user.companyId,
    userName: user.name,
    userRole: user.userRole,
    action: 'REJEITAR',
    module: 'Créditos',
    description: `Crédito de ${formatMoney(amount)} rejeitado para "${customerName}"`
  })
}

export async function logEditLoan(customerName) {
  const user = getCurrentUser()
  if (!user) return
  return logAction({
    userId: user.id,
    companyId: user.companyId,
    userName: user.name,
    userRole: user.userRole,
    action: 'EDITAR',
    module: 'Créditos',
    description: `Crédito do mutuário "${customerName}" actualizado`
  })
}

export async function logDeleteLoan(customerName) {
  const user = getCurrentUser()
  if (!user) return
  return logAction({
    userId: user.id,
    companyId: user.companyId,
    userName: user.name,
    userRole: user.userRole,
    action: 'ELIMINAR',
    module: 'Créditos',
    description: `Crédito do mutuário "${customerName}" eliminado`
  })
}

/**
 * Helper para logs de Pagamentos
 */
export async function logPayment(customerName, amount, installmentNumber) {
  const user = getCurrentUser()
  if (!user) return
  return logAction({
    userId: user.id,
    companyId: user.companyId,
    userName: user.name,
    userRole: user.userRole,
    action: 'PAGAR',
    module: 'Pagamentos',
    description: `Pagamento de ${formatMoney(amount)} na prestação #${installmentNumber} de "${customerName}"`
  })
}

export async function logPartialPayment(customerName, amount, installmentNumber, remaining) {
  const user = getCurrentUser()
  if (!user) return
  return logAction({
    userId: user.id,
    companyId: user.companyId,
    userName: user.name,
    userRole: user.userRole,
    action: 'PAGAMENTO PARCIAL',
    module: 'Pagamentos',
    description: `Pagamento parcial de ${formatMoney(amount)} na prestação #${installmentNumber} de "${customerName}" (restante: ${formatMoney(remaining)})`
  })
}

export async function logFullPayment(customerName, amount) {
  const user = getCurrentUser()
  if (!user) return
  return logAction({
    userId: user.id,
    companyId: user.companyId,
    userName: user.name,
    userRole: user.userRole,
    action: 'PAGAR',
    module: 'Pagamentos',
    description: `Liquidação total de ${formatMoney(amount)} do mutuário "${customerName}"`
  })
}

/**
 * Helper para logs de Documentos
 */
export async function logUploadDocument(customerName, docType) {
  const user = getCurrentUser()
  if (!user) return
  return logAction({
    userId: user.id,
    companyId: user.companyId,
    userName: user.name,
    userRole: user.userRole,
    action: 'CRIAR',
    module: 'Documentos',
    description: `Documento "${docType}" enviado para "${customerName}"`
  })
}

export async function logDeleteDocument(docType, customerName) {
  const user = getCurrentUser()
  if (!user) return
  return logAction({
    userId: user.id,
    companyId: user.companyId,
    userName: user.name,
    userRole: user.userRole,
    action: 'ELIMINAR',
    module: 'Documentos',
    description: `Documento "${docType}" eliminado de "${customerName}"`
  })
}

/**
 * Helper para logs de Garantias
 */
export async function logCreateGuarantee(customerName, guaranteeType) {
  const user = getCurrentUser()
  if (!user) return
  return logAction({
    userId: user.id,
    companyId: user.companyId,
    userName: user.name,
    userRole: user.userRole,
    action: 'CRIAR',
    module: 'Garantias',
    description: `Garantia "${guaranteeType}" registada para "${customerName}"`
  })
}

export async function logDeleteGuarantee(customerName, guaranteeType) {
  const user = getCurrentUser()
  if (!user) return
  return logAction({
    userId: user.id,
    companyId: user.companyId,
    userName: user.name,
    userRole: user.userRole,
    action: 'ELIMINAR',
    module: 'Garantias',
    description: `Garantia "${guaranteeType}" eliminada de "${customerName}"`
  })
}

/**
 * Helper para logs de Configurações
 */
export async function logUpdateCompany(settings) {
  const user = getCurrentUser()
  if (!user) return
  return logAction({
    userId: user.id,
    companyId: user.companyId,
    userName: user.name,
    userRole: user.userRole,
    action: 'EDITAR',
    module: 'Configurações',
    description: `Dados da empresa actualizados: ${settings.join(', ')}`
  })
}

export async function logUpdateRates() {
  const user = getCurrentUser()
  if (!user) return
  return logAction({
    userId: user.id,
    companyId: user.companyId,
    userName: user.name,
    userRole: user.userRole,
    action: 'CONFIGURAR',
    module: 'Taxas de Juro',
    description: 'Taxas de juro actualizadas'
  })
}

export async function logUpdateAccount(accountName) {
  const user = getCurrentUser()
  if (!user) return
  return logAction({
    userId: user.id,
    companyId: user.companyId,
    userName: user.name,
    userRole: user.userRole,
    action: 'EDITAR',
    module: 'Contas Bancárias',
    description: `Conta "${accountName}" actualizada`
  })
}

/**
 * Helper para logs de Utilizadores
 */
export async function logCreateUser(userName) {
  const user = getCurrentUser()
  if (!user) return
  return logAction({
    userId: user.id,
    companyId: user.companyId,
    userName: user.name,
    userRole: user.userRole,
    action: 'CRIAR',
    module: 'Utilizadores',
    description: `Utilizador "${userName}" criado`
  })
}

export async function logEditUser(userName) {
  const user = getCurrentUser()
  if (!user) return
  return logAction({
    userId: user.id,
    companyId: user.companyId,
    userName: user.name,
    userRole: user.userRole,
    action: 'EDITAR',
    module: 'Utilizadores',
    description: `Utilizador "${userName}" actualizado`
  })
}

export async function logDeleteUser(userName) {
  const user = getCurrentUser()
  if (!user) return
  return logAction({
    userId: user.id,
    companyId: user.companyId,
    userName: user.name,
    userRole: user.userRole,
    action: 'ELIMINAR',
    module: 'Utilizadores',
    description: `Utilizador "${userName}" eliminado`
  })
}

export async function logResetPassword(userName) {
  const user = getCurrentUser()
  if (!user) return
  return logAction({
    userId: user.id,
    companyId: user.companyId,
    userName: user.name,
    userRole: user.userRole,
    action: 'EDITAR',
    module: 'Utilizadores',
    description: `Senha do utilizador "${userName}" resetada`
  })
}

/**
 * Helper para logs de Exportação
 */
export async function logExportReport(reportType) {
  const user = getCurrentUser()
  if (!user) return
  return logAction({
    userId: user.id,
    companyId: user.companyId,
    userName: user.name,
    userRole: user.userRole,
    action: 'EXPORTAR',
    module: 'Relatórios',
    description: `Relatório "${reportType}" exportado`
  })
}

export async function logExportPdf(documentType, customerName) {
  const user = getCurrentUser()
  if (!user) return
  return logAction({
    userId: user.id,
    companyId: user.companyId,
    userName: user.name,
    userRole: user.userRole,
    action: 'EXPORTAR',
    module: 'Documentos',
    description: `PDF "${documentType}" gerado para "${customerName}"`
  })
}

/**
 * Helper para logs de SMS
 */
export async function logSendSms(customerName, message) {
  const user = getCurrentUser()
  if (!user) return
  return logAction({
    userId: user.id,
    companyId: user.companyId,
    userName: user.name,
    userRole: user.userRole,
    action: 'CRIAR',
    module: 'SMS',
    description: `SMS enviado para "${customerName}": ${message.substring(0, 50)}...`
  })
}

/**
 * Formatação de moeda
 */
function formatMoney(value) {
  if (!value) return '0,00 MT'
  return new Intl.NumberFormat('pt-MZ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value) + ' MT'
}
