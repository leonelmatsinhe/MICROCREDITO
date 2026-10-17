import { DataTypes } from "sequelize";
import { db } from "../db";

/**
 * LINHA DO TEMPO DE APROVAÇÃO (SPRINT 5)
 *
 * Um evento por acção sobre o ciclo de aprovação/desembolso do crédito —
 * quem fez o quê, quando e com que parecer. Nunca se apaga nem edita
 * (audit trail); `actorName`/`actorRole` são congelados no momento do evento
 * para sobreviver a renomeações/eliminações de utilizadores.
 *
 * event: CRIACAO | SUBMISSAO | APROVACAO | REPROVACAO | REABERTURA |
 *        PREPARACAO_DESEMBOLSO | DESEMBOLSO | INVALIDACAO_DESEMBOLSO
 */
export const LoanApprovalModel = db.define(
  "loan_approvals",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    loanId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    companyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    event: {
      type: DataTypes.STRING(30),
      allowNull: false,
    },
    actorId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "Utilizador que executou a acção (NULL = sistema/origem externa)",
    },
    actorName: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    actorRole: {
      type: DataTypes.STRING(60),
      allowNull: true,
      comment: "Papel do actor no momento do evento (rótulo legível)",
    },
    amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
      comment: "Montante do crédito no momento do evento (MZN)",
    },
    approvalsCount: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "Nº de aprovações válidas após o evento (para eventos APROVACAO)",
    },
    requiredApprovals: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Parecer/observação registada com o evento",
    },
  },
  {
    tableName: "loan_approvals",
    freezeTableName: true,
  }
);
