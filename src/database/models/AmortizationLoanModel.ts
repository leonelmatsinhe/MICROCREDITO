import { DataTypes } from "sequelize";
import { db } from "../db";

export const AmorizationLoanModel = db.define("amortization_loan", {
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
  loanId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  installmentOrder: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  accountNumber: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  amortization: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  rateAmount: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  installment: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  dueDate: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  status: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
});
