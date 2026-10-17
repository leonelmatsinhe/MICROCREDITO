import { DataTypes } from "sequelize";
import { db } from "../db";

/**
 * COBRANÇA DE CAMPO (SPRINT 6)
 *
 * Registo de atividades de cobrança feitas pelo Gestor de Crédito — prova
 * auditável de quem fez o quê, quando e onde:
 *   VISITA_DOMICILIAR | LIGACAO_TELEFONICA | PROMESSA_PAGAMENTO | RECUSA
 *
 * A PROMESSA_PAGAMENTO guarda data prometida, valor prometido, observação e
 * (quando o dispositivo a disponibiliza) a localização GPS da visita/ligação.
 */
export const CollectionActivityModel = db.define(
  "collection_activities",
  {
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
    customerId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    accountNumber: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    loanId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    activityType: {
      type: DataTypes.STRING(30),
      allowNull: false,
      comment: "VISITA_DOMICILIAR | LIGACAO_TELEFONICA | PROMESSA_PAGAMENTO | RECUSA",
    },
    activityDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    promisedDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: "Promessa de pagamento: data prometida pelo mutuário",
    },
    promisedAmount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
      comment: "Promessa de pagamento: valor prometido (MZN)",
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Observação / detalhe da atividade",
    },
    latitude: {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: true,
    },
    longitude: {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: true,
    },
    gpsAccuracy: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: "Precisão do GPS em metros (quando disponível)",
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "REGISTADO",
      comment: "REGISTADO | PENDENTE (promessa) | CUMPRIDA | QUEBRADA",
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "Gestor que registou a atividade",
    },
    createdByName: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: "Nome do gestor congelado no momento do registo (auditoria)",
    },
  },
  {
    tableName: "collection_activities",
    freezeTableName: true,
  }
);
