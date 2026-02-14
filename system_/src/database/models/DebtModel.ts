import { DataTypes } from "sequelize";
import { db } from "../db";

export const DebtModel = db.define("debts", {
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
    allowNull: false,
  },
  loanId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  amortisationId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  debtAmount: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  updatedBy: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  dateInserted: {
    type: DataTypes.STRING,
    allowNull: true,
  },
});
