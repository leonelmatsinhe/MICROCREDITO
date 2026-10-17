import { DataTypes } from "sequelize";
import { db } from "../db";

/**
 * DIFERENÇAS DE CAIXA (QUEBRAS E SOBRAS) — AUTO DE OCORRÊNCIA
 * ----------------------------------------------------------
 * Quando o operador fecha o caixa contando o numerário por denominação e o
 * valor contado não bate com o saldo apurado pelo sistema, o backend cria
 * automaticamente uma linha PENDENTE aqui. O Admin é quem:
 *   1. justifica a ocorrência (o que aconteceu, quem estava ao balcão, ...);
 *   2. lança o valor no Livro Caixa na conta 58x — QUEBRAS DE CAIXA
 *      (conta_contabilistica), ficando o registo com quem justificou e quando.
 *
 * O movimento de caixa correspondente (categoria DIFERENCA_CAIXA) é criado no
 * fecho — quebra sai da gaveta, sobra entra — e fica ligado por cash_movement_id
 * para auditoria (o caixa fica regularizado com o valor efectivamente contado).
 *
 *  - tipo Sobra  (diferença > 0): entrou mais dinheiro do que o apurado;
 *  - tipo Quebra (diferença < 0): falta dinheiro na gaveta.
 */

/** Tipos de ocorrência (PT-MZ: quebra = falta de dinheiro, sobra = excesso). */
export const CASH_DIFFERENCE_KINDS = ["QUEBRA", "SOBRA"] as const;
export type CashDifferenceKind = typeof CASH_DIFFERENCE_KINDS[number];

/** Conta contabilística por omissão — Quebras de Caixa (classe 58). */
export const CASH_DIFFERENCE_ACCOUNT_DEFAULT = "58";

export const CashDifferenceModel = db.define("cash_differences", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
  },
  companyId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  cashRegisterId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: "Caixa (fecho) que originou a diferença",
  },
  cashMovementId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: "Movimento DIFERENCA_CAIXA criado automaticamente no fecho",
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: "Operador responsável pelo caixa onde a diferença foi apurada",
  },
  data_caixa: {
    type: DataTypes.STRING(10),
    allowNull: true,
    comment: "Dia do caixa (YYYY-MM-DD)",
  },
  tipo: {
    type: DataTypes.ENUM(...CASH_DIFFERENCE_KINDS),
    allowNull: false,
    comment: "QUEBRA (falta de dinheiro) ou SOBRA (excesso)",
  },
  valor: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    comment: "Valor absoluto da diferença apurada no fecho",
  },
  valor_contado: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
    comment: "Total contado pelo operador (por denominação)",
  },
  valor_apurado: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
    comment: "Saldo apurado pelo sistema (dinheiro físico) — só para o Admin",
  },
  conta_contabilistica: {
    type: DataTypes.STRING(10),
    allowNull: false,
    defaultValue: CASH_DIFFERENCE_ACCOUNT_DEFAULT,
    comment: "Conta do Livro Caixa: 58x — Quebras de Caixa",
  },
  status: {
    type: DataTypes.ENUM("PENDENTE", "JUSTIFICADA"),
    allowNull: false,
    defaultValue: "PENDENTE",
    comment: "PENDENTE = por justificar/lançar pelo Admin; JUSTIFICADA = lançada no Livro Caixa",
  },
  observacao_operador: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: "Observação/justificação do OPERADOR no auto de ocorrência (obrigatória no fecho)",
  },
  justificacao: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: "Justificação escrita pelo Admin (auto de ocorrência)",
  },
  justifiedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  justifiedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: "cash_differences",
  freezeTableName: true,
});
