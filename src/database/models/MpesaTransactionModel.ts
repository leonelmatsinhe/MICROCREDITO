import { DataTypes } from "sequelize";
import { db } from "../db";

export const MpesaTransactionModel = db.define(
  "mpesa_transactions",
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
      allowNull: false,
    },
    loanId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    amortizationLoanId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    accountNumber: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    transactionReference: {
      type: DataTypes.STRING(64),
      allowNull: false,
    },
    thirdPartyReference: {
      type: DataTypes.STRING(64),
      allowNull: false,
    },
    conversationId: {
      type: DataTypes.STRING(128),
      allowNull: true,
    },
    originatorConversationId: {
      type: DataTypes.STRING(128),
      allowNull: true,
    },
    msisdn: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
    },
    excessAmount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
    },
    lateInterest: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
    },
    status: {
      type: DataTypes.ENUM("INITIATED", "PENDING_PIN", "SUCCESS", "FAILED", "TIMEOUT", "CANCELLED"),
      allowNull: false,
      defaultValue: "INITIATED",
    },
    responseCode: {
      type: DataTypes.STRING(32),
      allowNull: true,
    },
    responseDescription: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    mpesaReceipt: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    tranzactionId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    reciboId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    rawInitiateResponse: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    rawCallbackPayload: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    queryCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    lastQueriedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "mpesa_transactions",
    freezeTableName: true,
    timestamps: true,
  }
);
