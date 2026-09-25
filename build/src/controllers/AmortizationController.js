"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInstallmentsControl = exports.createAmortizationLoan = exports.getPastAmortizations = exports.getUpcomingAmortizations = void 0;
const moment_1 = __importDefault(require("moment"));
const AmortizationLoanModel_1 = require("../database/models/AmortizationLoanModel");
const sequelize_1 = require("sequelize");
const loanAmortization_1 = require("../utils/loanAmortization");
const LoanModel_1 = require("../database/models/LoanModel");
const DebtModel_1 = require("../database/models/DebtModel");
const CustomerModel_1 = require("../database/models/CustomerModel");
const CompanyModel_1 = require("../database/models/CompanyModel");
const TranzactionModel_1 = require("../database/models/TranzactionModel");
const calculateLateAmount_1 = require("../utils/calculateLateAmount");
const SmsGatewayService_1 = require("../services/SmsGatewayService");
const kycDocuments_1 = require("../utils/kycDocuments");
const CustomerDocumentsModel_1 = require("../database/models/CustomerDocumentsModel");
const getUpcomingAmortizations = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        // dueDate é string (YYYY-MM-DD); comparar por string evita cast em memória.
        const now = (0, moment_1.default)().format("YYYY-MM-DD");
        const loans = yield AmortizationLoanModel_1.AmorizationLoanModel.findAll({
            where: {
                dueDate: {
                    [sequelize_1.Op.gte]: now,
                },
                companyId: id,
                status: { [sequelize_1.Op.in]: [0, -1] },
            },
            order: [["dueDate", "ASC"]],
        });
        const partialIds = loans
            .filter((l) => l.status === -1)
            .map((l) => l.id);
        let debtsMap = {};
        if (partialIds.length > 0) {
            const debts = yield DebtModel_1.DebtModel.findAll({
                where: { amortisationId: { [sequelize_1.Op.in]: partialIds } },
            });
            debts.forEach((d) => {
                debtsMap[d.amortisationId] = {
                    debtAmount: d.debtAmount,
                    debtDate: d.updatedAt || d.dateInserted,
                };
            });
        }
        const result = loans.map((loan) => {
            const plain = loan.toJSON ? loan.toJSON() : Object.assign({}, loan);
            if (plain.status === -1 && debtsMap[plain.id]) {
                plain.debtAmount = debtsMap[plain.id].debtAmount;
                plain.debtDate = debtsMap[plain.id].debtDate;
            }
            return plain;
        });
        return res.status(200).send({ success: true, result });
    }
    catch (error) {
        return res.status(500).send({
            success: false,
            message: error.message || "Erro ao buscar prestações próximas.",
        });
    }
});
exports.getUpcomingAmortizations = getUpcomingAmortizations;
const getPastAmortizations = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const now = (0, moment_1.default)().format("YYYY-MM-DD");
        const pastAmortizations = yield AmortizationLoanModel_1.AmorizationLoanModel.findAll({
            where: {
                dueDate: {
                    [sequelize_1.Op.lt]: now,
                },
                companyId: id,
            },
            order: [["dueDate", "DESC"]],
        });
        return res.status(200).send({ success: true, result: pastAmortizations || [] });
    }
    catch (error) {
        return res.status(500).send({
            success: false,
            message: error.message || "Erro ao buscar prestações vencidas.",
        });
    }
});
exports.getPastAmortizations = getPastAmortizations;
const createAmortizationLoan = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e;
    try {
        const { companyId, loanId, accountNumber, interestRate, numberOfInstallments, amount, dueDate, status } = req.body;
        // Validações de entrada
        if (!companyId || !loanId || !accountNumber || !interestRate || !numberOfInstallments || !amount || !dueDate) {
            return res.status(400).json({
                success: false,
                message: "Campos obrigatórios faltando. Verifique: companyId, loanId, accountNumber, interestRate, numberOfInstallments, amount, dueDate",
            });
        }
        const loanAmount = parseFloat(amount);
        const rate = parseFloat(interestRate);
        const installments = parseInt(numberOfInstallments);
        if (isNaN(loanAmount) || loanAmount <= 0) {
            return res.status(400).json({
                success: false,
                message: "O valor do empréstimo deve ser maior que zero.",
            });
        }
        if (isNaN(rate) || rate < 0) {
            return res.status(400).json({
                success: false,
                message: "A taxa de juros deve ser um número positivo ou zero.",
            });
        }
        if (isNaN(installments) || installments <= 0) {
            return res.status(400).json({
                success: false,
                message: "O número de prestações deve ser maior que zero.",
            });
        }
        // Verifica se já existe um plano de amortização para este empréstimo
        const existingAmortization = yield AmortizationLoanModel_1.AmorizationLoanModel.findOne({
            where: { loanId }
        });
        if (existingAmortization) {
            return res.status(409).json({
                success: false,
                message: "Já existe um plano de amortização para este empréstimo.",
            });
        }
        const loan = yield LoanModel_1.LoanModel.findByPk(loanId);
        if (!loan) {
            return res.status(404).json({
                success: false,
                message: "Crédito não encontrado.",
            });
        }
        const customerId = loan.getDataValue("customerId");
        if (!customerId) {
            return res.status(409).json({
                success: false,
                message: "O crédito ainda não está associado a uma conta oficial.",
            });
        }
        // ── KYC BLOQUEANTE NO DESEMBOLSO ──
        // Última linha de defesa: mesmo que o pedido tenha sido criado antes da
        // regra, o dinheiro só sai sem os 3 documentos base (BI, NUIT,
        // Comprovativo de rendimentos).
        const kycDocuments = yield CustomerDocumentsModel_1.CustomerDocumentsModel.findAll({
            where: {
                accountNumber: Number(accountNumber),
                companyId: Number(companyId),
            },
            raw: true,
        });
        const kyc = (0, kycDocuments_1.evaluateKyc)(kycDocuments);
        if (!kyc.complete) {
            return res.status(400).json({
                success: false,
                error: "KYC_INCOMPLETE",
                message: `Desembolso bloqueado: checklist KYC incompleta. Documentos em falta: ${kyc.missing.join(", ")}.`,
                missing: kyc.missing,
            });
        }
        // ── CARTEIRA DE FINANCIAMENTO (analítica) + SALDO REAL ──
        // O desembolso tem obrigatoriamente de ser classificado numa carteira de
        // financiamento. A carteira é validada em duas camadas:
        //   1. analítica — não pode exceder o capital alocado ao fundo/parceria;
        //   2. real — tem de existir dinheiro na conta de desembolso da empresa.
        const bodyForWallet = req.body;
        const walletIdRaw = (_b = (_a = bodyForWallet === null || bodyForWallet === void 0 ? void 0 : bodyForWallet.walletId) !== null && _a !== void 0 ? _a : bodyForWallet === null || bodyForWallet === void 0 ? void 0 : bodyForWallet.wallet_id) !== null && _b !== void 0 ? _b : null;
        let walletId = walletIdRaw ? Number(walletIdRaw) : null;
        // ── CARTEIRA DERIVADA DA TAXA DE JURO ──
        // A taxa escolhida para o crédito pode estar ligada a uma carteira
        // (`interest_rates.walletId`): nesse caso o desembolso já não obriga a
        // escolher a carteira à mão. Se a taxa estiver ligada a mais do que uma
        // carteira, avisa-se e pede-se a escolha explícita.
        let carteiraDerivada = null;
        if (!walletId) {
            try {
                const { resolveWalletFromRate } = yield Promise.resolve().then(() => __importStar(require("../services/financingWalletService")));
                carteiraDerivada = yield resolveWalletFromRate(Number(companyId), loan.getDataValue("interestRate"));
                if (carteiraDerivada === null || carteiraDerivada === void 0 ? void 0 : carteiraDerivada.walletId)
                    walletId = Number(carteiraDerivada.walletId);
            }
            catch (deriveError) {
                console.error("[Carteiras] Falha ao derivar a carteira da taxa:", (deriveError === null || deriveError === void 0 ? void 0 : deriveError.message) || deriveError);
            }
        }
        if (!walletId && (carteiraDerivada === null || carteiraDerivada === void 0 ? void 0 : carteiraDerivada.ambiguo)) {
            return res.status(400).json({ success: false, message: carteiraDerivada.motivo });
        }
        let walletValidation = null;
        try {
            const { validateDisbursement } = yield Promise.resolve().then(() => __importStar(require("../services/financingWalletService")));
            walletValidation = yield validateDisbursement({
                companyId: Number(companyId),
                walletId,
                amount: Number(amount),
                requireWallet: true,
            });
        }
        catch (walletError) {
            console.error("[Carteiras] Falha ao validar a carteira do desembolso:", (walletError === null || walletError === void 0 ? void 0 : walletError.message) || walletError);
        }
        if (walletValidation && !walletValidation.ok) {
            return res.status(400).json({ success: false, message: walletValidation.message });
        }
        // ── TESOURARIA: validações de saldo antes de desembolsar ──
        // Desembolso electrónico (BANK/MPESA/EMOLA) exige saldo suficiente na
        // conta de origem — bloqueia o crédito se não houver dinheiro.
        const bodyAny = req.body;
        const payMethod = String((bodyAny === null || bodyAny === void 0 ? void 0 : bodyAny.payment_method) || "CASH").toUpperCase();
        const disburseAccountId = (bodyAny === null || bodyAny === void 0 ? void 0 : bodyAny.bank_account_id) ? Number(bodyAny.bank_account_id) : null;
        if (payMethod !== "CASH" && disburseAccountId) {
            const { getBalance } = yield Promise.resolve().then(() => __importStar(require("../services/bankAccountService")));
            const available = yield getBalance(Number(companyId), disburseAccountId);
            if (available < Number(amount)) {
                return res.status(400).json({
                    success: false,
                    message: `Saldo insuficiente na conta seleccionada (disponível: ${available.toFixed(2)} MZN; necessário: ${Number(amount).toFixed(2)} MZN). Transfira fundos ou escolha outra conta.`,
                });
            }
        }
        // ── TAXA ADMINISTRATIVA: entrada obrigatória numa conta ──
        // Se o crédito cobra taxa administrativa, o valor TEM de entrar numa
        // conta (banco / mobile money) — é dinheiro real da empresa.
        const adminFeeValue = Number((bodyAny === null || bodyAny === void 0 ? void 0 : bodyAny.admin_fee_value) || 0);
        const adminFeeAccountId = (bodyAny === null || bodyAny === void 0 ? void 0 : bodyAny.admin_fee_account_id) ? Number(bodyAny.admin_fee_account_id) : null;
        if (adminFeeValue > 0) {
            if (!adminFeeAccountId) {
                return res.status(400).json({
                    success: false,
                    message: "Taxa administrativa cobrada: indique a conta de entrada do respectivo valor (banco, mobile money ou caixa).",
                });
            }
            try {
                const { registerMovement, isElectronic } = yield Promise.resolve().then(() => __importStar(require("../services/treasuryService")));
                const { getOne } = yield Promise.resolve().then(() => __importStar(require("../services/bankAccountService")));
                const feeAccount = yield getOne(Number(companyId), adminFeeAccountId);
                if (!feeAccount) {
                    return res.status(400).json({ success: false, message: "Conta da taxa administrativa não encontrada." });
                }
                // Método de pagamento derivado do tipo da conta de destino.
                const accType = String(feeAccount.type || "BANCO").toUpperCase();
                const accName = String(feeAccount.bank_name || "").toLowerCase();
                const feeMethod = accType === "CAIXA_FISICO"
                    ? "CASH"
                    : accName.includes("mpesa") || accName.includes("m-pesa")
                        ? "MPESA"
                        : accName.includes("emola") || accName.includes("e-mola")
                            ? "EMOLA"
                            : "BANK";
                if (isElectronic(feeMethod) && !Number(feeAccount.is_active)) {
                    return res.status(400).json({ success: false, message: "A conta da taxa administrativa está inactiva." });
                }
                const jwt = yield Promise.resolve().then(() => __importStar(require("jsonwebtoken")));
                const decoded = jwt.verify((req.headers.authorization || "").split(" ")[1] || "", process.env.APP_SECRET + "");
                yield registerMovement({
                    companyId: Number(companyId),
                    userId: Number(decoded === null || decoded === void 0 ? void 0 : decoded.id) || undefined,
                    type: "ENTRADA",
                    category: "TAXA_ADMIN",
                    amount: adminFeeValue,
                    paymentMethod: feeMethod,
                    bankAccountId: feeMethod !== "CASH" ? adminFeeAccountId : null,
                    description: `Taxa administrativa do crédito #${loanId} — entrada em ${feeAccount.bank_name} ${feeAccount.accountNumber}`,
                    loanId: Number(loanId),
                    customerId: Number(customerId) || null,
                    reference: { type: "customer_loans", id: Number(loanId) },
                    automatic: true,
                });
            }
            catch (feeError) {
                // Sem caixa aberto ou conta sem saldo → bloqueia a aprovação
                // (a taxa é dinheiro real: não pode ficar por registar).
                if ((feeError === null || feeError === void 0 ? void 0 : feeError.code) === "CAIXA_FECHADO") {
                    return res.status(403).json({ success: false, error: "CAIXA_FECHADO", message: "Abra o caixa do dia para registar a taxa administrativa." });
                }
                return res.status(400).json({ success: false, message: (feeError === null || feeError === void 0 ? void 0 : feeError.message) || "Erro ao registar a entrada da taxa administrativa." });
            }
        }
        // Gera o plano de amortização usando o sistema francês
        const customerAmortizationPlan = (0, loanAmortization_1.simulator)({
            companyId,
            loanId,
            accountNumber,
            interestRate,
            numberOfInstallments,
            amount,
            dueDate,
            status
        });
        // Insere o plano de amortização no banco de dados — cada prestação herda a
        // carteira de financiamento do crédito (permite os relatórios por parceiro).
        const bulckInsert = yield AmortizationLoanModel_1.AmorizationLoanModel.bulkCreate(customerAmortizationPlan.map((installment) => (Object.assign(Object.assign({}, installment), { customerId, walletId: walletId || loan.getDataValue("walletId") || null }))));
        // Atualiza o status do empréstimo e guarda a data real de desembolso:
        // o dueDate enviado é a base do plano (a 1ª prestação vence 1 mês depois).
        yield LoanModel_1.LoanModel.update(Object.assign({ status: 1, disbursementDate: String(dueDate || "").slice(0, 10) || null }, (walletId ? { walletId } : {})), {
            where: {
                id: loanId
            }
        });
        try {
            yield (0, SmsGatewayService_1.enqueueDisbursementSms)({
                companyId: Number(companyId),
                loanId: Number(loanId),
                accountNumber,
                amount: Number(amount),
                installments: Number(numberOfInstallments),
                firstDueDate: ((_c = customerAmortizationPlan[0]) === null || _c === void 0 ? void 0 : _c.dueDate)
                    ? String(customerAmortizationPlan[0].dueDate)
                    : null,
            });
        }
        catch (smsError) {
            console.error("Erro ao enfileirar SMS de desembolso:", smsError);
        }
        // ── CAIXA DIÁRIO: movimento automático SAIDA / DESEMBOLSO ──
        // Best-effort: se falhar, NÃO impede o desembolso (apenas regista o erro).
        // O caixa ABERTO já foi validado pelo middleware checkCashRegisterOpen e
        // chega em req.cashRegister.
        try {
            const { recordDisbursement } = yield Promise.resolve().then(() => __importStar(require("../services/cashRegisterService")));
            const openRegister = req.cashRegister;
            if (openRegister) {
                const jwt = yield Promise.resolve().then(() => __importStar(require("jsonwebtoken")));
                const decoded = jwt.verify((req.headers.authorization || "").split(" ")[1] || "", process.env.APP_SECRET + "");
                yield recordDisbursement({
                    companyId: Number(companyId),
                    userId: Number(decoded === null || decoded === void 0 ? void 0 : decoded.id) || undefined,
                    loanId: Number(loanId),
                    customerId: loan ? Number(loan.getDataValue("customerId")) : null,
                    amount: Number(amount),
                    accountNumber,
                    // Método/conta vindos do form do Quasar (CASH por defeito nos antigos).
                    paymentMethod: String(((_d = req.body) === null || _d === void 0 ? void 0 : _d.payment_method) || "CASH"),
                    bankAccountId: ((_e = req.body) === null || _e === void 0 ? void 0 : _e.bank_account_id)
                        ? Number(req.body.bank_account_id)
                        : null,
                });
            }
        }
        catch (cashError) {
            console.error("[CAIXA] Falha ao registar desembolso no caixa (desembolso mantido):", (cashError === null || cashError === void 0 ? void 0 : cashError.message) || cashError);
        }
        return bulckInsert != null && bulckInsert.length > 0
            ? res.status(200).json({
                success: true,
                message: "Plano de amortização criado com sucesso",
                installmentsCount: bulckInsert.length
            })
            : res.status(500).json({
                success: false,
                message: "Erro ao criar o plano de amortização.",
            });
    }
    catch (error) {
        console.error("Erro ao criar plano de amortização:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Erro interno ao processar o plano de amortização.",
        });
    }
});
exports.createAmortizationLoan = createAmortizationLoan;
/**
 * Controle de Prestações (admin) — endpoint consolidado.
 *
 * Resolve no servidor tudo o que a página precisa, numa só chamada:
 *  - créditos activos (1) ou liquidados (3) da empresa;
 *  - TODAS as prestações desses créditos (1 query, sem o padrão N+1 anterior);
 *  - nome/telefone do mutuário via lista COMPLETA de clientes (sem paginação —
 *    a paginação silenciosa de /api/customers/:id fazia desaparecer mutuários
 *    fora da 1.ª página, que caíam no placeholder "Conta X" e eram escondidos);
 *  - mora diária calculada com o forfeit da empresa (installmentPanification);
 *  - mora REAL cobrada nas prestações pagas (transacções, com de-duplicação
 *    por dia, como em getLoanAmortization / findAllPaymentsOverview);
 *  - daysOverdue / daysUntilDue calculados no servidor (data única de referência).
 *
 * Linhas sem cliente correspondente são devolvidas com customerName=null e
 * hasCustomer=false — cabe ao frontend MOSTRÁ-LAS com selo (nunca esconder
 * dados financeiros).
 */
const getInstallmentsControl = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _f;
    try {
        const { companyId } = req.params;
        const companyIdNum = Number(companyId);
        if (!Number.isFinite(companyIdNum) || companyIdNum <= 0) {
            return res.status(400).json({ success: false, message: "companyId inválido." });
        }
        const company = yield CompanyModel_1.CompanyModel.findByPk(companyIdNum, { attributes: ["id", "forfeit"] });
        if (!company) {
            return res.status(404).json({ success: false, message: "Empresa não encontrada." });
        }
        const forfeit = Number(company.getDataValue("forfeit") || 0);
        // 1. Créditos activos (1) ou liquidados (3)
        const loans = yield LoanModel_1.LoanModel.findAll({
            where: { companyId: companyIdNum, status: { [sequelize_1.Op.in]: [1, 3] } },
            attributes: ["id", "accountNumber", "customerId", "status"],
            order: [["id", "DESC"]],
            raw: true,
        });
        if (loans.length === 0) {
            return res.status(200).json({ success: true, result: [] });
        }
        const loanIds = loans.map((l) => Number(l.id));
        // 2. Lista COMPLETA de mutuários da empresa (sem paginação), indexada por conta e por id
        const customers = yield CustomerModel_1.CustomerModel.findAll({
            where: { companyId: companyIdNum },
            attributes: ["id", "accountNumber", "customerName", "customerPhone"],
            raw: true,
        });
        const customerByAccount = {};
        const customerById = {};
        customers.forEach((c) => {
            customerByAccount[String(c.accountNumber)] = c;
            customerById[Number(c.id)] = c;
        });
        // 3. Todas as prestações desses créditos numa única query
        const amortizations = yield AmortizationLoanModel_1.AmorizationLoanModel.findAll({
            where: { loanId: { [sequelize_1.Op.in]: loanIds } },
            order: [["dueDate", "ASC"], ["id", "ASC"]],
            raw: true,
        });
        // 4. Mora real cobrada nas prestações pagas (de-duplicada por dia de pagamento)
        const paidAmortIds = amortizations
            .filter((a) => Number(a.status) === 1)
            .map((a) => Number(a.id));
        const realLateByAmortId = {};
        if (paidAmortIds.length > 0) {
            const transactions = yield TranzactionModel_1.TranzactionModel.findAll({
                where: { amortizationLoanId: { [sequelize_1.Op.in]: paidAmortIds } },
                attributes: ["amortizationLoanId", "latePaymentInterest", "paymentDate"],
                raw: true,
            });
            const maxLateByAmortAndDate = {};
            transactions.forEach((tx) => {
                const key = `${Number(tx.amortizationLoanId)}:${String(tx.paymentDate || "").slice(0, 10)}`;
                maxLateByAmortAndDate[key] = Math.max(maxLateByAmortAndDate[key] || 0, Number(tx.latePaymentInterest) || 0);
            });
            Object.entries(maxLateByAmortAndDate).forEach(([key, value]) => {
                const amortId = Number(key.split(":")[0]);
                realLateByAmortId[amortId] = Math.round(((realLateByAmortId[amortId] || 0) + value) * 100) / 100;
            });
        }
        // 5. Panificação por crédito (mora diária e saldo são calculados por empréstimo)
        const amortByLoan = {};
        amortizations.forEach((a) => {
            var _a;
            (amortByLoan[_a = Number(a.loanId)] || (amortByLoan[_a] = [])).push(a);
        });
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const result = [];
        for (const loan of loans) {
            const plan = (0, calculateLateAmount_1.installmentPanification)(amortByLoan[Number(loan.id)] || [], forfeit);
            // Mesma ordem de resolução usada historicamente no frontend: conta → id
            const customer = customerByAccount[String(loan.accountNumber)] ||
                customerById[Number(loan.customerId)] ||
                null;
            for (const a of plan) {
                const due = a.dueDate ? new Date(`${String(a.dueDate).slice(0, 10)}T00:00:00`) : null;
                const diffMs = due ? today.getTime() - due.getTime() : 0;
                const daysOverdue = diffMs > 0 ? Math.floor(diffMs / 86400000) : 0;
                const daysUntilDue = diffMs < 0 ? Math.ceil(-diffMs / 86400000) : 0;
                const status = Number(a.status);
                // Pagas: mora real cobrada; por pagar: mora calculada com o forfeit
                const lateFee = status === 1
                    ? realLateByAmortId[Number(a.id)] || 0
                    : Number(a.latePaymentInterest) || 0;
                result.push({
                    id: `${loan.id}-${a.id || a.installmentOrder}`,
                    loanId: Number(loan.id),
                    accountNumber: loan.accountNumber,
                    customerId: loan.customerId,
                    customerName: (customer === null || customer === void 0 ? void 0 : customer.customerName) || null,
                    customerPhone: (customer === null || customer === void 0 ? void 0 : customer.customerPhone) || "",
                    hasCustomer: !!customer,
                    installmentOrder: (_f = a.installmentOrder) !== null && _f !== void 0 ? _f : "",
                    installment: Number(a.installment) || 0,
                    paidAmount: Number(a.paidAmount) || 0,
                    status,
                    dueDate: a.dueDate ? String(a.dueDate).slice(0, 10) : null,
                    daysOverdue,
                    daysUntilDue,
                    lateFee,
                    totalToPay: Math.round(((Number(a.installment) || 0) + lateFee) * 100) / 100,
                    amortization: Number(a.amortization) || 0,
                    rateAmount: Number(a.rateAmount) || 0,
                });
            }
        }
        return res.status(200).json({ success: true, result });
    }
    catch (error) {
        console.error("Erro no controle de prestações:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Erro ao carregar o controle de prestações.",
        });
    }
});
exports.getInstallmentsControl = getInstallmentsControl;
