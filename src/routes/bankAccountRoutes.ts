import { Router } from "express";
import { auth } from "../middlewares/auth";
import {
  index,
  walletTotals,
  balance,
  transactions,
  create,
  update,
  remove,
  transfer,
  deposit,
} from "../controllers/BankAccountController";

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
const bankAccountRoutes = Router();

// Rotas estáticas ANTES das dinâmicas (:id) para não colidirem.
bankAccountRoutes.get("/api/bank-accounts", auth, index);
bankAccountRoutes.get("/api/bank-accounts/wallet-totals", auth, walletTotals);
bankAccountRoutes.post("/api/bank-accounts/transfer", auth, transfer);
bankAccountRoutes.post("/api/bank-accounts/deposit", auth, deposit);

bankAccountRoutes.get("/api/bank-accounts/:id/balance", auth, balance);
bankAccountRoutes.get("/api/bank-accounts/:id/transactions", auth, transactions);
bankAccountRoutes.put("/api/bank-accounts/:id", auth, update);
bankAccountRoutes.delete("/api/bank-accounts/:id", auth, remove);
bankAccountRoutes.post("/api/bank-accounts", auth, create);

export { bankAccountRoutes };
