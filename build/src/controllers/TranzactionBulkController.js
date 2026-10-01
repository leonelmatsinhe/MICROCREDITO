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
exports.addTranzactionBulk = void 0;
const moment_1 = __importDefault(require("moment"));
const db_1 = require("../database/db");
const TranzactionModel_1 = require("../database/models/TranzactionModel");
const AmortizationLoanModel_1 = require("../database/models/AmortizationLoanModel");
const LoanModel_1 = require("../database/models/LoanModel");
const CompanyModel_1 = require("../database/models/CompanyModel");
const sequelize_1 = require("sequelize");
const calculateLateAmount_1 = require("../utils/calculateLateAmount");
const paymentMethodMap_1 = require("../utils/paymentMethodMap");
const money_1 = require("../utils/money");
/**
 * POST /api/tranzaction/bulk — Liquidação Total ATÓMICA.
 *
 * O frontend chamava POST /api/tranzaction em loop: se a 3ª prestação
 * falhasse, ficava um crédito meio pago e sem forma de desfazer.
 * Aqui todas as prestações pendentes são liquidadas DENTRO de uma
 * sequelize.transaction — qualquer falha faz rollback de tudo.
 *
 * Body: {
 *   companyId, accountNumber, loanId,
 *   paymentMethod, tranzactionReference, phoneNumber, staffName,
 *   paymentDate, notes?,
 *   discountApplied?: boolean, discountType?: 'percentage'|'fixed',
 *   discountPercentage?: number, discountFixed?: number
 * }
 */
const addTranzactionBulk = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    const { companyId, accountNumber, loanId, phoneNumber, tranzactionReference, paymentMethod, description, staffName, paymentDate, notes, discountApplied, discountType, discountPercentage, discountFixed, } = req.body || {};
    // ── Validações de entrada ──
    if (!companyId || !accountNumber || !loanId) {
        return res.status(400).send({ success: false, message: "companyId, accountNumber e loanId são obrigatórios." });
    }
    if (!paymentMethod || !tranzactionReference || !staffName) {
        return res.status(400).send({ success: false, message: "Meio de pagamento, referência e funcionário são obrigatórios." });
    }
    // ── CONTA DE DESTINO OBRIGATÓRIA (bug contábil do modal antigo) ──
    // Sem conta válida não há para onde "vai" o dinheiro liquidado: nem o campo
    // bank_account_id era gravado, nem o saldo da conta era creditado.
    const { validateReembolsoAccount } = yield Promise.resolve().then(() => __importStar(require("../services/bankAccountResolver")));
    const requestedAccountId = Number(((_a = req.body) === null || _a === void 0 ? void 0 : _a.bank_account_id) || ((_b = req.body) === null || _b === void 0 ? void 0 : _b.bankAccountId) || 0);
    if (!requestedAccountId) {
        return res.status(400).send({
            success: false,
            code: "BANK_ACCOUNT_REQUIRED",
            message: "Seleccione a conta de destino da liquidação.",
        });
    }
    let destAccount = null;
    try {
        destAccount = yield validateReembolsoAccount(requestedAccountId, Number(companyId));
    }
    catch (e) {
        return res.status((e === null || e === void 0 ? void 0 : e.http) || 400).send((e === null || e === void 0 ? void 0 : e.payload) || { success: false, code: "INVALID_BANK_ACCOUNT", message: "Conta de destino inválida." });
    }
    // Actor (JWT) — auditoria e movimentos de caixa do mesmo pedido
    let actorUserId = null;
    try {
        const jwt = yield Promise.resolve().then(() => __importStar(require("jsonwebtoken")));
        const decoded = jwt.verify((req.headers.authorization || "").split(" ")[1] || "", process.env.APP_SECRET + "");
        actorUserId = Number(decoded === null || decoded === void 0 ? void 0 : decoded.id) || null;
    }
    catch (_k) {
        actorUserId = null;
    }
    // Crédito atómico da conta de destino (saldo + extrato) dentro da transacção
    const { creditAccountInTransaction } = yield Promise.resolve().then(() => __importStar(require("../services/treasuryService")));
    const todayDate = new Date().toISOString().slice(0, 10);
    const payDate = paymentDate ? String(paymentDate).slice(0, 10) : todayDate;
    if (payDate > todayDate) {
        return res.status(400).send({ success: false, message: "A data de pagamento não pode ser futura." });
    }
    try {
        // ── Snapshot FORA da transacção: valida e calcula valores ──
        const loan = yield LoanModel_1.LoanModel.findByPk(Number(loanId));
        if (!loan) {
            return res.status(404).send({ success: false, message: "Crédito não encontrado." });
        }
        const installments = yield AmortizationLoanModel_1.AmorizationLoanModel.findAll({
            where: { loanId: Number(loanId), status: { [sequelize_1.Op.ne]: 1 } },
            order: [["dueDate", "ASC"], ["id", "ASC"]],
        });
        if (installments.length === 0) {
            return res.status(409).send({ success: false, message: "Este crédito já está totalmente liquidado." });
        }
        const company = yield CompanyModel_1.CompanyModel.findByPk(loan.getDataValue("companyId"), { attributes: ["forfeit"] });
        const forfeit = Number((company === null || company === void 0 ? void 0 : company.getDataValue("forfeit")) || 0);
        // Planeamento idêntico ao addTranzaction individual: mora do dia menos a
        // mora já cobrada em transacções anteriores da mesma prestação.
        const planned = [];
        for (const installment of installments) {
            const amortizationLoanId = Number(installment.getDataValue("id"));
            const calculatedInstallment = (0, calculateLateAmount_1.installmentPanification)([installment], forfeit, payDate)[0];
            const previousLateInterest = yield TranzactionModel_1.TranzactionModel.findAll({
                where: { amortizationLoanId },
                attributes: ["latePaymentInterest"],
                raw: true,
            });
            const alreadyChargedLate = previousLateInterest.reduce((sum, t) => sum + (Number(t.latePaymentInterest) || 0), 0);
            const effectiveLateInterest = Math.max(0, Number((calculatedInstallment === null || calculatedInstallment === void 0 ? void 0 : calculatedInstallment.latePaymentInterest) || 0) - alreadyChargedLate);
            const installmentValue = Number(installment.getDataValue("installment")) || 0;
            const alreadyPaid = Number(installment.getDataValue("paidAmount")) || 0;
            const remaining = Math.max(0, Math.round((installmentValue - alreadyPaid) * 100) / 100);
            // Desconto de liquidação antecipada proporcional ao peso desta
            // prestação no total pendente (percentual) ou rateio do valor fixo.
            let discountAmount = 0;
            if (discountApplied) {
                if (String(discountType) === "fixed") {
                    const pendingTotal = installments.reduce((sum, i) => sum + Math.max(0, (Number(i.getDataValue("installment")) || 0) - (Number(i.getDataValue("paidAmount")) || 0)), 0);
                    const share = pendingTotal > 0 ? remaining / pendingTotal : 0;
                    discountAmount = Math.min(remaining, Math.round((Number(discountFixed) || 0) * share * 100) / 100);
                }
                else {
                    discountAmount = Math.min(remaining, Math.round(remaining * ((Number(discountPercentage) || 0) / 100) * 100) / 100);
                }
            }
            // amount = saldo da prestação menos o desconto (o cliente não paga a
            // parte descontada); totalAmount = amount + mora (recibo/legal).
            const amount = Math.max(0, Math.round((remaining - discountAmount) * 100) / 100);
            const totalAmount = Math.round((amount + effectiveLateInterest) * 100) / 100;
            planned.push({
                amortizationLoanId,
                amount,
                totalAmount,
                latePaymentInterest: effectiveLateInterest,
                discountAmount,
                rateAmount: Number(installment.getDataValue("rateAmount")) || 0,
                installmentOrder: String(installment.getDataValue("installmentOrder") || ""),
                dueDate: installment.getDataValue("dueDate"),
            });
        }
        // ── Transacção atómica: tudo ou nada ──
        const transaction = yield db_1.db.transaction();
        try {
            const createdTransactions = [];
            for (const item of planned) {
                const tranzaction = yield TranzactionModel_1.TranzactionModel.create({
                    companyId,
                    accountNumber,
                    customerId: loan.getDataValue("customerId"),
                    amortizationLoanId: item.amortizationLoanId,
                    amount: item.amount,
                    totalAmount: item.totalAmount,
                    latePaymentInterest: item.latePaymentInterest,
                    interestRateAmount: item.rateAmount,
                    // Normalizado como no pagamento individual (coluna NOT NULL)
                    phoneNumber: String(phoneNumber || ""),
                    tranzactionReference,
                    paymentMethod,
                    description: description ||
                        `Liquidação total - Prestação ${item.installmentOrder}${discountApplied ? " (com desconto)" : ""}`,
                    receiptUrl: "",
                    staffName,
                    loanId: Number(loanId),
                    paymentDate: payDate,
                    notes: notes || null,
                    discountApplied: !!discountApplied,
                    discountAmount: item.discountAmount,
                    walletId: loan.getDataValue("walletId") || null,
                    mora_amount: item.latePaymentInterest,
                    bank_account_id: requestedAccountId,
                }, { transaction });
                createdTransactions.push(tranzaction);
                yield AmortizationLoanModel_1.AmorizationLoanModel.update(Object.assign({ status: 1, paidAmount: Math.min(Number((_c = installments.find((i) => Number(i.getDataValue("id")) === item.amortizationLoanId)) === null || _c === void 0 ? void 0 : _c.getDataValue("installment")) || 0, Number(((_d = installments.find((i) => Number(i.getDataValue("id")) === item.amortizationLoanId)) === null || _d === void 0 ? void 0 : _d.getDataValue("paidAmount")) || 0) + item.amount), remainingBalance: 0 }, (item.latePaymentInterest > 0
                    ? {
                        mora_amount: Math.round(((Number((_e = installments.find((i) => Number(i.getDataValue("id")) === item.amortizationLoanId)) === null || _e === void 0 ? void 0 : _e.getDataValue("mora_amount")) || 0) +
                            item.latePaymentInterest) *
                            100) / 100,
                        mora_days: Math.max(0, (0, moment_1.default)(payDate).diff((0, moment_1.default)(item.dueDate), "days")),
                    }
                    : {})), { where: { id: item.amortizationLoanId }, transaction });
                // ── CRÉDITO DA CONTA DE DESTINO (por prestação, mesma transacção) ──
                // Saldo + extrato real (bank_transactions) no mesmo commit: rollback
                // desfaz prestações, recibos e dinheiro. O movimento de caixa
                // pós-commit usa skipAccountLedger → sem duplo crédito.
                yield creditAccountInTransaction({
                    companyId: Number(companyId),
                    accountId: requestedAccountId,
                    amount: item.totalAmount,
                    description: `Liquidação total - Prestação ${item.installmentOrder} — conta ${accountNumber}`,
                    userId: actorUserId,
                    cashRegisterId: Number((_f = req.cashRegister) === null || _f === void 0 ? void 0 : _f.id) || null,
                    referenceType: "tranzactions",
                    referenceId: Number(tranzaction.getDataValue("id")),
                    transaction,
                });
            }
            // ── AUDITORIA agregada do crédito à conta de destino ──
            const totalCredited = (0, money_1.round2)(planned.reduce((sum, p) => sum + p.totalAmount, 0));
            if (totalCredited > 0) {
                const { AuditLogModel } = yield Promise.resolve().then(() => __importStar(require("../database/models/paymentsV2Models")));
                yield AuditLogModel.create({
                    user_id: actorUserId,
                    company_id: Number(companyId),
                    ip: null,
                    action: "BANK_ACCOUNT_CREDIT",
                    entity: "accounts",
                    entity_id: requestedAccountId,
                    before_data: null,
                    after_data: {
                        amount: totalCredited,
                        loanId: Number(loanId),
                        transactions: createdTransactions.map((t) => Number(t.getDataValue("id"))),
                    },
                }, { transaction });
            }
            yield transaction.commit();
            // ── Pós-commit (best-effort, fora da transacção) ──
            try {
                const { recordPayment } = yield Promise.resolve().then(() => __importStar(require("../services/cashRegisterService")));
                const openRegister = req.cashRegister;
                if (openRegister) {
                    for (const item of planned) {
                        yield recordPayment({
                            companyId: Number(companyId),
                            userId: actorUserId || undefined,
                            loanId: Number(loanId),
                            amortizationLoanId: item.amortizationLoanId,
                            tranzactionId: Number((_g = createdTransactions.find((t) => Number(t.getDataValue("amortizationLoanId")) === item.amortizationLoanId)) === null || _g === void 0 ? void 0 : _g.getDataValue("id")),
                            customerId: Number(loan.getDataValue("customerId")),
                            // Movimento único REEMBOLSO com totalAmount (capital + mora) —
                            // a reconciliação compara tranzactions.totalAmount vs movimentos.
                            amount: item.totalAmount,
                            lateInterest: 0,
                            adminFee: 0,
                            accountNumber,
                            paymentMethod: (0, paymentMethodMap_1.methodToTreasury)(paymentMethod),
                            bankAccountId: requestedAccountId,
                            // Saldo já creditado dentro da transacção atómica acima.
                            skipAccountLedger: true,
                        });
                    }
                }
            }
            catch (cashError) {
                console.error("[CAIXA] Falha ao registar liquidação no caixa (pagamentos mantidos):", (cashError === null || cashError === void 0 ? void 0 : cashError.message) || cashError);
            }
            // Recibos individuais (numeração sequencial legal) — best-effort.
            const recibos = [];
            try {
                const { generateReciboForTranzaction } = yield Promise.resolve().then(() => __importStar(require("../services/reciboService")));
                for (const t of createdTransactions) {
                    try {
                        const recibo = yield generateReciboForTranzaction({
                            tranzactionId: Number(t.getDataValue("id")),
                            companyId: Number(companyId),
                            createdBy: null,
                        });
                        if (recibo) {
                            recibos.push({ id: recibo.id, numero: recibo.numero, pdf_url: recibo.pdf_url || null });
                        }
                    }
                    catch (reciboError) {
                        console.error("[Recibo] Falha ao emitir recibo da liquidação:", (reciboError === null || reciboError === void 0 ? void 0 : reciboError.message) || reciboError);
                    }
                }
            }
            catch (reciboServiceError) {
                console.error("[Recibo] Serviço indisponível:", (reciboServiceError === null || reciboServiceError === void 0 ? void 0 : reciboServiceError.message) || reciboServiceError);
            }
            // Liquidação do crédito + notificações (mesma lógica do pagamento único).
            try {
                const { checkAndLiquidateLoan } = yield Promise.resolve().then(() => __importStar(require("./TranzactionController")));
                yield checkAndLiquidateLoan(Number(loanId), Number(companyId), Number(accountNumber));
            }
            catch (liquidateError) {
                console.error("Erro ao verificar liquidação do crédito:", liquidateError);
            }
            try {
                const { enqueuePaymentSms } = yield Promise.resolve().then(() => __importStar(require("../services/SmsGatewayService")));
                yield enqueuePaymentSms({
                    companyId: Number(companyId),
                    transactionId: Number((_h = createdTransactions[0]) === null || _h === void 0 ? void 0 : _h.getDataValue("id")),
                    loanId: Number(loanId),
                    amortizationLoanId: Number((_j = planned[0]) === null || _j === void 0 ? void 0 : _j.amortizationLoanId),
                    accountNumber,
                    paidAmount: Number(planned.reduce((sum, p) => sum + p.amount, 0).toFixed(2)),
                    latePaymentInterest: Number(planned.reduce((sum, p) => sum + p.latePaymentInterest, 0).toFixed(2)),
                    paymentDate: payDate,
                    reference: tranzactionReference,
                });
            }
            catch (smsError) {
                console.error("Erro ao enfileirar SMS de liquidação:", smsError);
            }
            return res.status(201).send({
                success: true,
                message: `Liquidação de ${planned.length} prestação(ões) registada com sucesso.`,
                result: {
                    transactions: createdTransactions.map((t) => Number(t.getDataValue("id"))),
                    totalPaid: Number(planned.reduce((sum, p) => sum + p.amount, 0).toFixed(2)),
                    totalLateInterest: Number(planned.reduce((sum, p) => sum + p.latePaymentInterest, 0).toFixed(2)),
                    totalDiscount: Number(planned.reduce((sum, p) => sum + p.discountAmount, 0).toFixed(2)),
                    installmentsCleared: planned.length,
                    bankAccountId: requestedAccountId,
                    destination: (destAccount === null || destAccount === void 0 ? void 0 : destAccount.name) || null,
                },
                recibos,
            });
        }
        catch (txError) {
            yield transaction.rollback();
            console.error("[BULK] Rollback da liquidação total:", txError);
            return res.status(500).send({
                success: false,
                message: "Falha na liquidação total — todas as prestações foram revertidas. Tente novamente.",
                error: txError === null || txError === void 0 ? void 0 : txError.message,
            });
        }
    }
    catch (error) {
        console.error("Erro no bulk de transacções:", error);
        return res.status(500).send({
            success: false,
            message: (error === null || error === void 0 ? void 0 : error.message) || "Erro interno na liquidação total.",
        });
    }
});
exports.addTranzactionBulk = addTranzactionBulk;
