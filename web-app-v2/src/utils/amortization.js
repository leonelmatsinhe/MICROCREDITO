/**
 * Utilitário partilhado de cálculo de amortização
 * Sistema Francês (Price)
 * Usado pelo simulador e pela CLÁUSULA QUARTA do contrato
 */

/**
 * Calcula o valor da prestação (PMT) no sistema francês
 * PMT = P * [r(1+r)^n] / [(1+r)^n - 1]
 */
export function calculateInstallment(principal, monthlyRate, periods) {
  const amount = Number(principal) || 0
  const rate = Number(monthlyRate) || 0
  const count = Math.max(1, Math.trunc(Number(periods) || 0))
  if (rate === 0) return amount / count
  if (count === 1) return amount * (1 + rate)
  const num = rate * Math.pow(1 + rate, count)
  const den = Math.pow(1 + rate, count) - 1
  return amount * (num / den)
}

/**
 * Gera o plano completo de amortização
 * @param {number} capital - Montante do empréstimo
 * @param {number} monthlyRate - Taxa mensal (ex: 0.02 para 2%)
 * @param {number} periods - Número de prestações
 * @param {Date|string} disbursementDate - Data de desembolso (opcional, usa hoje se não fornecido)
 * @returns {Array} Plano de amortização
 */
export function generateAmortizationPlan(capital, monthlyRate, periods, disbursementDate = null) {
  const amount = Number(capital) || 0
  const rate = Number(monthlyRate) || 0
  const count = Math.max(1, Math.trunc(Number(periods) || 0))
  const installment = calculateInstallment(amount, rate, count)
  let balance = amount
  const plan = []

  // Usar data de desembolso ou hoje
  const startDate = disbursementDate ? new Date(disbursementDate) : new Date()
  
  for (let i = 0; i < count; i++) {
    const interest = balance * rate
    const amort = installment - interest
    balance -= amort
    
    // Calcular data de vencimento: 1 mês após o desembolso para a 1ª prestação
    // Depois 1 mês de intervalo para cada prestação seguinte
    // Ex: desembolso 01/09 → 1ª prestação 01/10
    const dueDate = new Date(startDate)
    dueDate.setMonth(dueDate.getMonth() + (i + 1))

    plan.push({
      installmentOrder: `${i + 1}ª`,
      capitalPerInstall: Math.round(amort * 100) / 100,
      rateAmount: Math.round(interest * 100) / 100,
      installment: Math.round(installment * 100) / 100,
      remainingBalance: i === periods - 1 ? 0 : Math.round(balance * 100) / 100,
      dueDate: dueDate,
      // Para compatibilidade com a API e CLÁUSULA QUARTA
      amortization: Math.round(amort * 100) / 100,
      balance: i === periods - 1 ? 0 : Math.round(balance * 100) / 100,
      status: 0 // pendente
    })
  }

  return plan
}

/**
 * Calcula o plano de amortização com saldo decrecente (sistema francês)
 * Usado na CLÁUSULA QUARTA do contrato
 * @param {number} capital - Capital financiado
 * @param {number} monthlyRate - Taxa mensal
 * @param {number} periods - Número de prestações
 * @returns {Array} Plano com saldo calculado
 */
export function generateAmortizationWithBalance(capital, monthlyRate, periods) {
  const plan = generateAmortizationPlan(capital, monthlyRate, periods)
  let saldo = capital

  return plan.map((row, idx) => {
    saldo = Math.max(0, saldo - row.amortization)
    return {
      ...row,
      balance: saldo
    }
  })
}
