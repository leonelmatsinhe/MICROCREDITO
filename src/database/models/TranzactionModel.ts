import { DataTypes } from "sequelize";
import { db } from "../db";

export const TranzactionModel = db.define("tranzactions", {
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
  amortizationLoanId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  loanId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  accountNumber: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  amount: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  latePaymentInterest: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  interestRateAmount: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  phoneNumber: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  paymentDate: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  tranzactionReference: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  paymentMethod: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  description: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  receiptUrl: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  staffName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  discountApplied: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: false,
  },
  discountAmount: {
    type: DataTypes.FLOAT,
    allowNull: true,
    defaultValue: 0,
  },
});
