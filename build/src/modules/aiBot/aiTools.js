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
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_IMPLEMENTATIONS = exports.toolTotalDesembolsadoHoje = exports.toolPrestacoesAtrasoCliente = exports.toolClientesEmAtraso = exports.toolMovimentosCaixaHoje = exports.toolSaldoCarteiras = exports.toolVencimentosHoje = exports.toolEstadoCaixaHoje = exports.toolConsultarCliente = exports.AI_TOOLS = void 0;
const db_1 = require("../../database/db");
const cashRegisterService_1 = require("../../services/cashRegisterService");
const round2 = (v) => Math.round(Number(v || 0) * 100) / 100;
// ─────────────────────────────────────────────────────────────────────────────
// Definição das tools no formato Groq (OpenAI tool-calling).
// NOTA: os parâmetros de segurança (companyId, userId) NUNCA são aceites daqui.
// ─────────────────────────────────────────────────────────────────────────────
exports.AI_TOOLS = [
    {
        type: "function",
        function: {
            name: "consultar_cliente",
            description: "Consulta o estado de um cliente: saldo devedor, mora, créditos e parcelas em atraso. Aceita número da conta, id do cliente ou telefone.",
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
            name: "prestacoes_atraso_cliente",
            description: "Lista as prestações EM ATRASO de um cliente específico (por número da conta, id ou telefone), com dias de atraso de cada uma, valor e total.",
            parameters: {
                type: "object",
                properties: {
                    accountNumber: { type: "string", description: "Número da conta do cliente (ex.: 100)" },
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
            description: "Estado do caixa de hoje do utilizador autenticado: abertura, totais de entradas/saídas (cash e electrónico), saldo calculado, valor contado e diferença.",
            parameters: { type: "object", properties: {} },
        },
    },
    {
        type: "function",
        function: {
            name: "vencimentos_hoje",
            description: "Parcelas (prestações) que vencem hoje na empresa, com cliente, valor e conta.",
            parameters: { type: "object", properties: {} },
        },
    },
    {
        type: "function",
        function: {
            name: "saldo_carteiras",
            description: "Saldos das carteiras reais da empresa: bancos, caixa físico e mobile money (M-Pesa/e-Mola).",
            parameters: { type: "object", properties: {} },
        },
    },
    {
        type: "function",
        function: {
            name: "movimentos_caixa_hoje",
            description: "Movimentos do caixa aberto de hoje do utilizador autenticado (entradas e saídas, com categoria e método de pagamento).",
            parameters: { type: "object", properties: {} },
        },
    },
    {
        type: "function",
        function: {
            name: "total_desembolsado_hoje",
            description: "Total desembolsado hoje na empresa (saídas da categoria DESEMBOLSO), com desagregação por método de pagamento e por caixa. Perguntas como 'quanto desembolsámos hoje?' ou 'total de créditos concedidos hoje'.",
            parameters: {
                type: "object",
                properties: {
                    data: {
                        type: ["string", "null"],
                        description: "Data a consultar em YYYY-MM-DD, ou null para hoje.",
                    },
                },
            },
        },
    },
    {
        type: "function",
        function: {
            name: "clientes_em_atraso",
            description: "Ranking dos clientes com parcelas em atraso, ordenado por dias de atraso ou por valor em dívida. Perguntas como 'quem está mais em atraso?' ou 'clientes em atraso hoje'.",
            parameters: {
                type: "object",
                properties: {
                    ordenar_por: {
                        type: "string",
                        enum: ["dias_atraso", "valor"],
                        description: "Critério de ordenação do ranking (default: dias_atraso)",
                    },
                    limite: {
                        type: "integer",
                        description: "Quantos clientes listar (default 10, máximo 25)",
                    },
                    dias_minimos: {
                        type: "integer",
                        description: "Só incluir atrasos com pelo menos X dias (default 1)",
                    },
                },
            },
        },
    },
];
// ─────────────────────────────────────────────────────────────────────────────
// Implementação das tools — apenas SELECT parametrizado.
// ─────────────────────────────────────────────────────────────────────────────
function clienteBase(companyId, args) {
    return __awaiter(this, void 0, void 0, function* () {
        if (args.customerId) {
            const [rows] = yield db_1.db.query(`SELECT id, accountNumber, customerName, customerPhone FROM customers
       WHERE companyId = :companyId AND id = :customerId LIMIT 1`, { replacements: { companyId, customerId: args.customerId } });
            return (rows || [])[0] || null;
        }
        if (args.accountNumber) {
            const [rows] = yield db_1.db.query(`SELECT id, accountNumber, customerName, customerPhone FROM customers
       WHERE companyId = :companyId AND CAST(accountNumber AS CHAR) = :accountNumber LIMIT 1`, { replacements: { companyId, accountNumber: String(args.accountNumber) } });
            return (rows || [])[0] || null;
        }
        if (args.telefone) {
            const [rows] = yield db_1.db.query(`SELECT id, accountNumber, customerName, customerPhone FROM customers
       WHERE companyId = :companyId AND customerPhone LIKE :telefone LIMIT 1`, { replacements: { companyId, telefone: `%${String(args.telefone).replace(/[^0-9+]/g, "")}%` } });
            return (rows || [])[0] || null;
        }
        return null;
    });
}
function toolConsultarCliente(identity, args = {}) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        const { companyId } = identity;
        const cliente = yield clienteBase(companyId, args);
        if (!cliente) {
            return {
                encontrado: false,
                mensagem: "Cliente não encontrado nesta empresa. Verifique o número da conta, id ou telefone.",
            };
        }
        // Créditos do cliente
        const [loans] = yield db_1.db.query(`SELECT id, amount, numberOfInstallments, interestRate, disbursementDate, status
     FROM customer_loans WHERE companyId = :companyId AND customerId = :customerId`, { replacements: { companyId, customerId: cliente.id } });
        // Saldo pendente nas prestações
        const [parcelas] = yield db_1.db.query(`SELECT COUNT(*) AS total,
            SUM(CASE WHEN status = 0 THEN 1 ELSE 0 END) AS pendentes,
            SUM(CASE WHEN status = 0 THEN IFNULL(installment,0) - IFNULL(paidAmount,0) ELSE 0 END) AS saldo_pendentes,
            SUM(CASE WHEN status = 0 AND CAST(dueDate AS DATE) < CURDATE() THEN 1 ELSE 0 END) AS em_atraso,
            SUM(CASE WHEN status = 0 AND CAST(dueDate AS DATE) < CURDATE()
                     THEN IFNULL(installment,0) - IFNULL(paidAmount,0) ELSE 0 END) AS valor_em_atraso
     FROM amortization_loans
     WHERE companyId = :companyId AND customerId = :customerId`, { replacements: { companyId, customerId: cliente.id } });
        // Moras registadas
        const [dividas] = yield db_1.db.query(`SELECT IFNULL(SUM(debtAmount),0) AS mora FROM debts
     WHERE companyId = :companyId AND customerId = :customerId`, { replacements: { companyId, customerId: cliente.id } });
        // Parcelas em atraso (detalhe, limitado)
        const [atrasoDetalhe] = yield db_1.db.query(`SELECT installmentOrder, installment, paidAmount, dueDate
     FROM amortization_loans
     WHERE companyId = :companyId AND customerId = :customerId
       AND status = 0 AND CAST(dueDate AS DATE) < CURDATE()
     ORDER BY dueDate ASC LIMIT 5`, { replacements: { companyId, customerId: cliente.id } });
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
            mora_registada_mzn: round2((_a = (dividas || [])[0]) === null || _a === void 0 ? void 0 : _a.mora),
            detalhe_atraso: (atrasoDetalhe || []).map((a) => ({
                prestacao: a.installmentOrder,
                valor: round2(a.installment),
                pago: round2(a.paidAmount),
                vencimento: a.dueDate,
            })),
        };
    });
}
exports.toolConsultarCliente = toolConsultarCliente;
function toolEstadoCaixaHoje(identity) {
    return __awaiter(this, void 0, void 0, function* () {
        const { userId, companyId } = identity;
        const register = yield (0, cashRegisterService_1.getOpenRegister)(userId, companyId);
        if (!register) {
            // Pode haver caixa já FECHADO hoje — informativo.
            const [rows] = yield db_1.db.query(`SELECT opening_balance, total_in, total_out, total_cash_in, total_cash_out,
              total_bank_in, total_bank_out, status, closing_balance_informed,
              closing_balance_calculated, difference, closed_at
       FROM cash_registers
       WHERE companyId = :companyId AND userId = :userId AND opening_date = :hoje
       ORDER BY id DESC LIMIT 1`, { replacements: { companyId, userId, hoje: (0, cashRegisterService_1.todayKey)() } });
            const r = (rows || [])[0];
            if (!r) {
                return {
                    caixa: null,
                    status: "SEM_CAIXA",
                    mensagem: "Nenhum caixa aberto hoje. Abra o caixa no menu Caixa.",
                };
            }
            return { caixa: r, status: r.status, mensagem: "Caixa de hoje já fechado." };
        }
        return {
            caixa: register,
            status: register.status,
            mensagem: `Caixa aberto desde ${register.opening_time || register.opening_date}.`,
        };
    });
}
exports.toolEstadoCaixaHoje = toolEstadoCaixaHoje;
function toolVencimentosHoje(identity) {
    return __awaiter(this, void 0, void 0, function* () {
        const { companyId } = identity;
        const [rows] = yield db_1.db.query(`SELECT c.accountNumber, c.customerName, c.customerPhone,
            al.installmentOrder, al.installment, al.paidAmount, al.dueDate, al.loanId
     FROM amortization_loans al
     JOIN customers c ON c.id = al.customerId
     WHERE al.companyId = :companyId
       AND al.status = 0
       AND al.dueDate LIKE :hoje
     ORDER BY al.dueDate ASC
     LIMIT 50`, { replacements: { companyId, hoje: `${(0, cashRegisterService_1.todayKey)()}%` } });
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
    });
}
exports.toolVencimentosHoje = toolVencimentosHoje;
function toolSaldoCarteiras(identity) {
    return __awaiter(this, void 0, void 0, function* () {
        const { companyId } = identity;
        const [rows] = yield db_1.db.query(`SELECT accountDescription, bank_name, type, balance, currency, is_active
     FROM accounts
     WHERE companyId = :companyId AND is_active = 1
     ORDER BY type, bank_name`, { replacements: { companyId } });
        const carteiras = (rows || []).map((r) => ({
            descricao: r.accountDescription,
            banco: r.bank_name,
            tipo: r.type,
            saldo_mzn: round2(r.balance),
            moeda: r.currency || "MZN",
        }));
        return {
            total_mzn: round2(carteiras.reduce((s, c) => s + c.saldo_mzn, 0)),
            carteiras,
        };
    });
}
exports.toolSaldoCarteiras = toolSaldoCarteiras;
function toolMovimentosCaixaHoje(identity) {
    return __awaiter(this, void 0, void 0, function* () {
        const { userId, companyId } = identity;
        const register = (yield (0, cashRegisterService_1.getOpenRegister)(userId, companyId));
        if (!register) {
            return { caixa: null, mensagem: "Nenhum caixa aberto hoje. Abra o caixa no menu Caixa." };
        }
        const [rows] = yield db_1.db.query(`SELECT type, paymentMethod, category, amount, description, createdAt
     FROM cash_movements
     WHERE companyId = :companyId AND cashRegisterId = :cashRegisterId
     ORDER BY createdAt ASC
     LIMIT 100`, { replacements: { companyId, cashRegisterId: register.id } });
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
    });
}
exports.toolMovimentosCaixaHoje = toolMovimentosCaixaHoje;
// ─────────────────────────────────────────────────────────────────────────────
// AMARELA 16 do audit — ranking de clientes em atraso (JOIN + cálculo de dias).
// Atraso = parcela status=0 com dueDate < hoje. Dias = DATEDIFF(hoje, dueDate).
// ─────────────────────────────────────────────────────────────────────────────
function toolClientesEmAtraso(identity, args = {}) {
    return __awaiter(this, void 0, void 0, function* () {
        const { companyId } = identity;
        const ordenarPor = args.ordenar_por === "valor" ? "valor" : "dias_atraso";
        const limite = Math.min(Math.max(Number(args.limite) || 10, 1), 25);
        const diasMinimos = Math.max(Number(args.dias_minimos) || 1, 1);
        const [rows] = yield db_1.db.query(`SELECT
       c.accountNumber,
       c.customerName,
       c.customerPhone,
       COUNT(*) AS parcelas_atraso,
       SUM(IFNULL(al.installment,0) - IFNULL(al.paidAmount,0)) AS valor_atraso,
       MAX(DATEDIFF(CURDATE(), CAST(al.dueDate AS DATE))) AS maior_atraso_dias,
       MIN(al.dueDate) AS vencimento_mais_antigo,
       GROUP_CONCAT(al.installmentOrder ORDER BY al.dueDate ASC SEPARATOR ', ') AS prestacoes
     FROM amortization_loans al
     JOIN customers c ON c.id = al.customerId
     WHERE al.companyId = :companyId
       AND al.status = 0
       AND CAST(al.dueDate AS DATE) < CURDATE()
       AND DATEDIFF(CURDATE(), CAST(al.dueDate AS DATE)) >= :diasMinimos
     GROUP BY c.id, c.accountNumber, c.customerName, c.customerPhone
     ORDER BY
       ${ordenarPor === "valor"
            ? `valor_atraso DESC`
            : `maior_atraso_dias DESC, valor_atraso DESC`}
     LIMIT :limite`, { replacements: { companyId, limite, diasMinimos } });
        const ranking = (rows || []).map((r, i) => ({
            posicao: i + 1,
            conta: r.accountNumber,
            cliente: r.customerName,
            telefone: r.customerPhone,
            parcelas_atraso: Number(r.parcelas_atraso) || 0,
            valor_atraso_mzn: round2(r.valor_atraso),
            maior_atraso_dias: Number(r.maior_atraso_dias) || 0,
            vencimento_mais_antigo: r.vencimento_mais_antigo,
            prestacoes: r.prestacoes,
        }));
        return {
            ordenado_por: ordenarPor,
            total_clientes: ranking.length,
            total_valor_mzn: round2(ranking.reduce((s, r) => s + r.valor_atraso_mzn, 0)),
            ranking,
        };
    });
}
exports.toolClientesEmAtraso = toolClientesEmAtraso;
// ─────────────────────────────────────────────────────────────────────────────
// Detalhe de atrasos de UM cliente (Amarela 16 do audit, vista detalhada):
// prestação a prestação, com dias de atraso de cada uma.
// ─────────────────────────────────────────────────────────────────────────────
function toolPrestacoesAtrasoCliente(identity, args = {}) {
    return __awaiter(this, void 0, void 0, function* () {
        const { companyId } = identity;
        const cliente = yield clienteBase(companyId, args);
        if (!cliente) {
            return {
                encontrado: false,
                mensagem: "Cliente não encontrado nesta empresa. Verifique o número da conta, id ou telefone.",
            };
        }
        const [rows] = yield db_1.db.query(`SELECT
       al.id,
       al.loanId,
       al.installmentOrder,
       al.installment,
       IFNULL(al.paidAmount,0) AS paidAmount,
       IFNULL(al.installment,0) - IFNULL(al.paidAmount,0) AS falta_pagar,
       al.dueDate,
       DATEDIFF(CURDATE(), CAST(al.dueDate AS DATE)) AS dias_atraso
     FROM amortization_loans al
     WHERE al.companyId = :companyId
       AND al.customerId = :customerId
       AND al.status = 0
       AND CAST(al.dueDate AS DATE) < CURDATE()
     ORDER BY al.dueDate ASC
     LIMIT 24`, { replacements: { companyId, customerId: cliente.id } });
        const prestacoes = (rows || []).map((r) => ({
            prestacao: r.installmentOrder,
            loanId: r.loanId,
            valor_mzn: round2(r.installment),
            pago_mzn: round2(r.paidAmount),
            falta_pagar_mzn: round2(r.falta_pagar),
            vencimento: r.dueDate,
            dias_atraso: Number(r.dias_atraso) || 0,
        }));
        return {
            encontrado: true,
            cliente: {
                id: cliente.id,
                accountNumber: cliente.accountNumber,
                nome: cliente.customerName,
                telefone: cliente.customerPhone,
            },
            total_em_atraso_mzn: round2(prestacoes.reduce((s, p) => s + p.falta_pagar_mzn, 0)),
            maior_atraso_dias: prestacoes.reduce((m, p) => Math.max(m, p.dias_atraso), 0),
            quantidade: prestacoes.length,
            prestacoes,
        };
    });
}
exports.toolPrestacoesAtrasoCliente = toolPrestacoesAtrasoCliente;
// ─────────────────────────────────────────────────────────────────────────────
// AMARELA 17 do audit — total desembolsado hoje (JOIN cash_movements ×
// cash_registers). A desagregação por caixa permite ver quem desembolsou.
// ─────────────────────────────────────────────────────────────────────────────
function toolTotalDesembolsadoHoje(identity, args = {}) {
    return __awaiter(this, void 0, void 0, function* () {
        const { companyId } = identity;
        // Validação dura da data: só aceita YYYY-MM-DD vinda do LLM (anti-injection
        // adicional — mesmo com replacements, limitamos ao formato esperado).
        const hoje = (0, cashRegisterService_1.todayKey)();
        let data = hoje;
        if (args.data && /^\d{4}-\d{2}-\d{2}$/.test(String(args.data))) {
            data = String(args.data);
        }
        const [rows] = yield db_1.db.query(`SELECT
       cm.cashRegisterId,
       cr.userId,
       u.name AS caixa_nome,
       cm.paymentMethod,
       COUNT(*) AS movimentos,
       SUM(cm.amount) AS total
     FROM cash_movements cm
     JOIN cash_registers cr ON cr.id = cm.cashRegisterId       LEFT JOIN users u ON u.id = cr.userId
     WHERE cm.companyId = :companyId
       AND cm.type = 'SAIDA'
       AND cm.category = 'DESEMBOLSO'
       AND cr.opening_date = :data
     GROUP BY cm.cashRegisterId, cr.userId, u.name, cm.paymentMethod
     ORDER BY total DESC`, { replacements: { companyId, data } });
        const linhas = (rows || []).map((r) => ({
            caixa_id: r.cashRegisterId,
            caixa_nome: r.caixa_nome || `Utilizador ${r.userId}`,
            metodo: r.paymentMethod,
            movimentos: Number(r.movimentos) || 0,
            total_mzn: round2(r.total),
        }));
        const total = round2(linhas.reduce((s, l) => s + l.total_mzn, 0));
        const porMetodo = {};
        for (const l of linhas) {
            porMetodo[l.metodo] = round2((porMetodo[l.metodo] || 0) + l.total_mzn);
        }
        return {
            data,
            total_mzn: total,
            total_desembolsos: linhas.reduce((s, l) => s + l.movimentos, 0),
            caixas_envolvidos: new Set(linhas.map((l) => l.caixa_id)).size,
            por_metodo: porMetodo,
            detalhe: linhas,
        };
    });
}
exports.toolTotalDesembolsadoHoje = toolTotalDesembolsadoHoje;
exports.TOOL_IMPLEMENTATIONS = {
    consultar_cliente: toolConsultarCliente,
    estado_caixa_hoje: toolEstadoCaixaHoje,
    vencimentos_hoje: toolVencimentosHoje,
    saldo_carteiras: toolSaldoCarteiras,
    movimentos_caixa_hoje: toolMovimentosCaixaHoje,
    clientes_em_atraso: toolClientesEmAtraso,
    prestacoes_atraso_cliente: toolPrestacoesAtrasoCliente,
    total_desembolsado_hoje: toolTotalDesembolsadoHoje,
};
