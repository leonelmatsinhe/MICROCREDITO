import { db } from "../../database/db";
import { getOpenRegister, todayKey } from "../../services/cashRegisterService";

/**
 * AI BOT MAISMOLA — TOOLS READ-ONLY (Fase 2 do MAISMOLA_BOT_AUDIT.md)
 *
 * REGRAS DE OURO:
 *  1. Somente SELECT. Nenhuma função aqui faz UPDATE/INSERT/DELETE.
 *  2. companyId SEMPRE vem do JWT (resolvido no controller) — nunca do prompt.
 *  3. Toda query é parametrizada (replacements) — sem concatenação de strings.
 *  4. Valores em MZN, textos pt-MZ.
 */

const round2 = (v) => Math.round(Number(v || 0) * 100) / 100;

// ─────────────────────────────────────────────────────────────────────────────
// Definição das tools no formato Groq (OpenAI tool-calling).
// NOTA: os parâmetros de segurança (companyId, userId) NUNCA são aceites daqui.
// ─────────────────────────────────────────────────────────────────────────────
export const AI_TOOLS = [
  {
    type: "function",
    function: {
      name: "consultar_cliente",
      description:
        "Consulta o estado de um cliente: saldo devedor, mora, créditos e parcelas em atraso. Aceita número da conta, id do cliente ou telefone.",
      parameters: {
        type: "object",
        properties: {
          accountNumber: { type: "string", description: "Número da conta do cliente (ex.: 108)" },
          customerId: { type: "integer", description: "Id do cliente na tabela customers" },
          telefone: { type: "string", description: "Telefone do cliente (ex.: 25884...)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "estado_caixa_hoje",
      description:
        "Estado do caixa de hoje do utilizador autenticado: abertura, totais de entradas/saídas (cash e electrónico), saldo calculado, valor contado e diferença.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "vencimentos_hoje",
      description:
        "Parcelas (prestações) que vencem hoje na empresa, com cliente, valor e conta.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "saldo_carteiras",
      description:
        "Saldos das carteiras reais da empresa: bancos, caixa físico e mobile money (M-Pesa/e-Mola).",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "movimentos_caixa_hoje",
      description:
        "Movimentos do caixa aberto de hoje do utilizador autenticado (entradas e saídas, com categoria e método de pagamento).",
      parameters: { type: "object", properties: {} },
    },
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Implementação das tools — apenas SELECT parametrizado.
// identity = { userId, companyId } resolvido do JWT no controller.
// ─────────────────────────────────────────────────────────────────────────────

async function clienteBase(companyId, { accountNumber, customerId, telefone }) {
  if (customerId) {
    const [rows] = await db.query(
      `SELECT id, accountNumber, customerName, customerPhone FROM customers
       WHERE companyId = :companyId AND id = :customerId LIMIT 1`,
      { replacements: { companyId, customerId } }
    );
    return (rows || [])[0] || null;
  }
  if (accountNumber) {
    const [rows] = await db.query(
      `SELECT id, accountNumber, customerName, customerPhone FROM customers
       WHERE companyId = :companyId AND CAST(accountNumber AS CHAR) = :accountNumber LIMIT 1`,
      { replacements: { companyId, accountNumber: String(accountNumber) } }
    );
    return (rows || [])[0] || null;
  }
  if (telefone) {
    const [rows] = await db.query(
      `SELECT id, accountNumber, customerName, customerPhone FROM customers
       WHERE companyId = :companyId AND customerPhone LIKE :telefone LIMIT 1`,
      { replacements: { companyId, telefone: `%${String(telefone).replace(/[^0-9+]/g, "")}%` } }
    );
    return (rows || [])[0] || null;
  }
  return null;
}

export async function toolConsultarCliente(identity, args = {}) {
  const { companyId } = identity;
  const cliente = await clienteBase(companyId, args);
  if (!cliente) {
    return {
      encontrado: false,
      mensagem: "Cliente não encontrado nesta empresa. Verifique o número da conta, id ou telefone.",
    };
  }

  // Créditos do cliente
  const [loans] = await db.query(
    `SELECT id, amount, numberOfInstallments, interestRate, disbursementDate, status
     FROM customer_loans WHERE companyId = :companyId AND customerId = :customerId`,
    { replacements: { companyId, customerId: cliente.id } }
  );

  // Saldo pendente nas prestações
  const [parcelas] = await db.query(
    `SELECT COUNT(*) AS total,
            SUM(CASE WHEN status = 0 THEN 1 ELSE 0 END) AS pendentes,
            SUM(CASE WHEN status = 0 THEN IFNULL(installment,0) - IFNULL(paidAmount,0) ELSE 0 END) AS saldo_pendentes,
            SUM(CASE WHEN status = 0 AND CAST(dueDate AS DATE) < CURDATE() THEN 1 ELSE 0 END) AS em_atraso,
            SUM(CASE WHEN status = 0 AND CAST(dueDate AS DATE) < CURDATE()
                     THEN IFNULL(installment,0) - IFNULL(paidAmount,0) ELSE 0 END) AS valor_em_atraso
     FROM amortization_loans
     WHERE companyId = :companyId AND customerId = :customerId`,
    { replacements: { companyId, customerId: cliente.id } }
  );

  // Moras registadas
  const [dividas] = await db.query(
    `SELECT IFNULL(SUM(debtAmount),0) AS mora FROM debts
     WHERE companyId = :companyId AND customerId = :customerId`,
    { replacements: { companyId, customerId: cliente.id } }
  );

  // Parcelas em atraso (detalhe, limitado)
  const [atrasoDetalhe] = await db.query(
    `SELECT installmentOrder, installment, paidAmount, dueDate
     FROM amortization_loans
     WHERE companyId = :companyId AND customerId = :customerId
       AND status = 0 AND CAST(dueDate AS DATE) < CURDATE()
     ORDER BY dueDate ASC LIMIT 5`,
    { replacements: { companyId, customerId: cliente.id } }
  );

  const p = (parcelas || [])[0] || {};
  return {
    encontrado: true,
    cliente: {
      id: cliente.id,
      accountNumber: cliente.accountNumber,
      nome: cliente.customerName,
      telefone: cliente.customerPhone,
    },
    creditos: (loans || []).map((l) => ({
      id: l.id,
      valor: round2(l.amount),
      prestacoes: l.numberOfInstallments,
      taxa_juro: l.interestRate,
      data_desembolso: l.disbursementDate,
      status: l.status,
    })),
    saldo_pendentes_mzn: round2(p.saldo_pendentes),
    parcelas_pendentes: Number(p.pendentes) || 0,
    parcelas_em_atraso: Number(p.em_atraso) || 0,
    valor_em_atraso_mzn: round2(p.valor_em_atraso),
    mora_registada_mzn: round2((dividas || [])[0]?.mora),
    detalhe_atraso: (atrasoDetalhe || []).map((a) => ({
      prestacao: a.installmentOrder,
      valor: round2(a.installment),
      pago: round2(a.paidAmount),
      vencimento: a.dueDate,
    })),
  };
}

export async function toolEstadoCaixaHoje(identity) {
  const { userId, companyId } = identity;
  const register = await getOpenRegister(userId, companyId);
  if (!register) {
    // Pode haver caixa já FECHADO hoje — informativo.
    const [rows] = await db.query(
      `SELECT opening_balance, total_in, total_out, total_cash_in, total_cash_out,
              total_bank_in, total_bank_out, status, closing_balance_informed,
              closing_balance_calculated, difference, closed_at
       FROM cash_registers
       WHERE companyId = :companyId AND userId = :userId AND opening_date = :hoje
       ORDER BY id DESC LIMIT 1`,
      { replacements: { companyId, userId, hoje: todayKey() } }
    );
    const r = (rows || [])[0];
    if (!r) return { caixa: null, status: "SEM_CAIXA", mensagem: "Nenhum caixa aberto hoje. Abra o caixa no menu Caixa." };
    return { caixa: r, status: r.status, mensagem: "Caixa de hoje já fechado." };
  }
  return {
    caixa: register,
    status: register.status,
    mensagem: `Caixa aberto desde ${register.opening_time || register.opening_date}.`,
  };
}

export async function toolVencimentosHoje(identity) {
  const { companyId } = identity;
  const [rows] = await db.query(
    `SELECT c.accountNumber, c.customerName, c.customerPhone,
            al.installmentOrder, al.installment, al.paidAmount, al.dueDate, al.loanId
     FROM amortization_loans al
     JOIN customers c ON c.id = al.customerId
     WHERE al.companyId = :companyId
       AND al.status = 0
       AND al.dueDate LIKE :hoje
     ORDER BY al.dueDate ASC
     LIMIT 50`,
    { replacements: { companyId, hoje: `${todayKey()}%` } }
  );
  const lista = (rows || []).map((r) => ({
    conta: r.accountNumber,
    cliente: r.customerName,
    telefone: r.customerPhone,
    prestacao: r.installmentOrder,
    valor_mzn: round2(r.installment),
    pago_mzn: round2(r.paidAmount),
    vencimento: r.dueDate,
  }));
  return {
    total: lista.length,
    total_valor_mzn: round2(lista.reduce((s, i) => s + (i.valor_mzn - i.pago_mzn), 0)),
    vencimentos: lista,
  };
}

export async function toolSaldoCarteiras(identity) {
  const { companyId } = identity;
  const [rows] = await db.query(
    `SELECT accountDescription, bank_name, type, balance, currency, is_active
     FROM accounts
     WHERE companyId = :companyId AND is_active = 1
     ORDER BY type, bank_name`,
    { replacements: { companyId } }
  );
  const carteiras = (rows || []).map((r) => ({
    descricao: r.accountDescription,
    banco: r.bank_name,
    tipo: r.type, // BANCO | CAIXA_FISICO | MOBILE_MONEY | EWALLET
    saldo_mzn: round2(r.balance),
    moeda: r.currency || "MZN",
  }));
  return {
    total_mzn: round2(carteiras.reduce((s, c) => s + c.saldo_mzn, 0)),
    carteiras,
  };
}

export async function toolMovimentosCaixaHoje(identity) {
  const { userId, companyId } = identity;
  const register = await getOpenRegister(userId, companyId);
  if (!register) {
    return { caixa: null, mensagem: "Nenhum caixa aberto hoje. Abra o caixa no menu Caixa." };
  }
  const [rows] = await db.query(
    `SELECT type, paymentMethod, category, amount, description, createdAt
     FROM cash_movements
     WHERE companyId = :companyId AND cashRegisterId = :cashRegisterId
     ORDER BY createdAt ASC
     LIMIT 100`,
    { replacements: { companyId, cashRegisterId: register.id } }
  );
  const movimentos = (rows || []).map((m) => ({
    tipo: m.type,
    metodo: m.paymentMethod,
    categoria: m.category,
    valor_mzn: round2(m.amount),
    descricao: m.description,
    hora: m.createdAt,
  }));
  return {
    caixa_id: register.id,
    total_movimentos: movimentos.length,
    movimentos,
  };
}

export const TOOL_IMPLEMENTATIONS = {
  consultar_cliente: toolConsultarCliente,
  estado_caixa_hoje: toolEstadoCaixaHoje,
  vencimentos_hoje: toolVencimentosHoje,
  saldo_carteiras: toolSaldoCarteiras,
  movimentos_caixa_hoje: toolMovimentosCaixaHoje,
};
