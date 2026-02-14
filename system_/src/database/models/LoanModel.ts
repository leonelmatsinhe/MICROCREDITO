import { DataTypes } from "sequelize";
import { db } from "../db";

export const LoanModel = db.define("customer_loans", {
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
  creditManager: {
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
  numberOfInstallments: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  interestRate: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  loanDescription: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  dateCreated: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  status: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
});
