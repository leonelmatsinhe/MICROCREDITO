"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bankAccountRoutes = void 0;
const express_1 = require("express");
const auth_1 = require("../middlewares/auth");
const BankAccountController_1 = require("../controllers/BankAccountController");
/**
 * ROTAS DA CARTEIRA REAL (contas bancárias com saldo).
 *
 *  GET    /api/bank-accounts?purpose=REEMBOLSO&is_active=1  → listar (forms + gestão)
 *  GET    /api/bank-accounts/wallet-totals                  → saldos por tipo (dashboard)
 *  POST   /api/bank-accounts                                → criar conta
 *  PUT    /api/bank-accounts/:id                            → actualizar
 *  DELETE /api/bank-accounts/:id                            → desactivar
 *  GET    /api/bank-accounts/:id/balance                    → saldo actual
 *  GET    /api/bank-accounts/:id/transactions               → extrato
 *  POST   /api/bank-accounts/transfer                       → conta→conta ou conta→caixa
 *  POST   /api/bank-accounts/deposit                        → caixa→banco (depósito)
 */
const bankAccountRoutes = (0, express_1.Router)();
exports.bankAccountRoutes = bankAccountRoutes;
// Rotas estáticas ANTES das dinâmicas (:id) para não colidirem.
bankAccountRoutes.get("/api/bank-accounts", auth_1.auth, BankAccountController_1.index);
// Contas de DESTINO de pagamento (REEMBOLSO/MISTO/caixa) priorizadas por método
bankAccountRoutes.get("/api/bank-accounts/reembolso", auth_1.auth, BankAccountController_1.reembolsoAccounts);
bankAccountRoutes.get("/api/bank-accounts/wallet-totals", auth_1.auth, BankAccountController_1.walletTotals);
bankAccountRoutes.post("/api/bank-accounts/transfer", auth_1.auth, BankAccountController_1.transfer);
bankAccountRoutes.post("/api/bank-accounts/deposit", auth_1.auth, BankAccountController_1.deposit);
// Ajuste manual de saldo (introduzir saldo real da conta) — admin/tesouraria.
bankAccountRoutes.post("/api/bank-accounts/:id/adjust-balance", auth_1.auth, BankAccountController_1.adjustBalanceEndpoint);
bankAccountRoutes.get("/api/bank-accounts/:id/balance", auth_1.auth, BankAccountController_1.balance);
bankAccountRoutes.get("/api/bank-accounts/:id/transactions", auth_1.auth, BankAccountController_1.transactions);
bankAccountRoutes.put("/api/bank-accounts/:id", auth_1.auth, BankAccountController_1.update);
bankAccountRoutes.delete("/api/bank-accounts/:id", auth_1.auth, BankAccountController_1.remove);
bankAccountRoutes.post("/api/bank-accounts", auth_1.auth, BankAccountController_1.create);
