import { DataTypes } from "sequelize";
import { db } from "../db";

/**
 * ALÇADAS DE APROVAÇÃO (SPRINT 5)
 *
 * Tabela de regras de aprovação de créditos. Cada linha diz quem pode aprovar
 * quanto e quantas aprovações são necessárias nessa faixa de valor:
 *
 *   companyId NULL = regra GLOBAL (default do sistema); uma empresa pode criar
 *   as suas próprias linhas, que têm precedência sobre as globais.
 *
 * Regras semeadas por omissão:
 *   GESTOR  0 … 25.000            → 1 aprovação
 *   ADMIN   0 … 100.000           → 1 aprovação
 *   ADMIN   > 100.000             → 2 aprovações de Admins diferentes (Comitê de Crédito)
 */
export const ApprovalRuleModel = db.define(
  "approval_rules",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    companyId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "NULL = regra global (default); caso contrário, regra da empresa",
    },
    role: {
      type: DataTypes.STRING(20),
      allowNull: false,
      comment: "Família do papel com alçada nesta faixa: 'GESTOR' | 'ADMIN'",
    },
    minAmount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
      comment: "Início da faixa de valor (inclusive, MZN)",
    },
    maxAmount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
      comment: "Fim da faixa de valor (inclusive, MZN). NULL = sem limite",
    },
    requiredApprovals: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: "Nº de aprovações necessárias para o crédito ficar APROVADO",
    },
    distinctApprovers: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: "Exige aprovadores diferentes (Comitê de Crédito)",
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    tableName: "approval_rules",
    freezeTableName: true,
  }
);
