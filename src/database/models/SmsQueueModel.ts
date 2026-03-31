import { DataTypes } from "sequelize";
import { db } from "../db";

export const SmsQueueModel = db.define(
  "sms_queue",
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
    accountNumber: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    loanId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    amortizationLoanId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    transactionId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    debtId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    customerName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    messageType: {
      type: DataTypes.STRING(60),
      allowNull: false,
    },
    messageBody: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    payloadJson: {
      type: DataTypes.TEXT("long"),
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "queued",
    },
    retries: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    gatewayMessageId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    errorMessage: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    sentAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    lastAttemptAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "sms_queue",
    freezeTableName: true,
  }
);
