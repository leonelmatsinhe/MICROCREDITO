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
  administrativeFee: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0,
    comment: "Taxa de preparos administrativos (fracção, ex.: 0.01 = 1%) aplicada na concessão; 0 = isento.",
  },
  loanDescription: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  capacityExcessObservation: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  dateCreated: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  status: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  borrowerInfo: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
});
