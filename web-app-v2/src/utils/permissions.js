/**
 * Sistema de Permissões por Perfil
 * 
 * Admin (role 1): Acesso total
 * Gestor (role 3): Acesso restrito (sem aprovar, sem pagar, sem deletar)
 */

const DEFAULT_PERMISSIONS = {
  // Gestor de Crédito
  gestor: {
    viewCustomers: true,
    createCustomer: true,
    editCustomer: true,
    deactivateCustomer: true,
    viewLoans: true,
    submitDocuments: true,
    submitGuarantees: true,
    simulateLoan: true,
    approveLoan: false,
    registerPayment: false,
    viewReports: false,
    deleteCustomer: false
  }
}

/**
 * Obter permissões guardadas (ou usar defaults)
 */
function getStoredPermissions() {
  try {
    const saved = localStorage.getItem('rolePermissions')
    if (saved) {
      const parsed = JSON.parse(saved)
      return {
        gestor: { ...DEFAULT_PERMISSIONS.gestor, ...parsed.gestor }
      }
    }
  } catch (e) {
    console.error('Erro ao ler permissões:', e)
  }
  return { ...DEFAULT_PERMISSIONS }
}

/**
 * Verificar se o utilizador tem uma permissão específica
 * @param {number} userRole - Role do utilizador (1=Admin, 3=Gestor)
 * @param {string} permission - Nome da permissão
 * @returns {boolean}
 */
export function hasPermission(userRole, permission) {
  // Admin tem acesso total
  if (userRole === 1) return true

  // Gestor - verificar permissões guardadas
  if (userRole === 3) {
    const permissions = getStoredPermissions()
    return permissions.gestor[permission] === true
  }

  // Outros roles - sem permissão
  return false
}

/**
 * Verificar se o utilizador pode deletar clientes
 */
export function canDeleteCustomer(userRole) {
  return hasPermission(userRole, 'deleteCustomer')
}

/**
 * Verificar se o utilizador pode registar pagamentos
 */
export function canRegisterPayment(userRole) {
  return hasPermission(userRole, 'registerPayment')
}

/**
 * Verificar se o utilizador pode aprovar créditos
 */
export function canApproveLoan(userRole) {
  return hasPermission(userRole, 'approveLoan')
}

/**
 * Verificar se o utilizador pode editar clientes
 */
export function canEditCustomer(userRole) {
  return hasPermission(userRole, 'editCustomer')
}

/**
 * Verificar se o utilizador pode desactivar clientes
 */
export function canDeactivateCustomer(userRole) {
  return hasPermission(userRole, 'deactivateCustomer')
}

/**
 * Obter label da role
 */
export function getRoleLabel(role) {
  const labels = { 1: 'Administrador', 3: 'Gestor de Crédito' }
  return labels[role] || 'Utilizador'
}

/**
 * Obter cor da role
 */
export function getRoleColor(role) {
  return { 1: 'negative', 3: 'warning' }[role] || 'grey'
}
