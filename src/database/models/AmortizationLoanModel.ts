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
  customerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  amortization: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
  },
  rateAmount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
  },
  installment: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
  },
  remainingBalance: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
    comment: "Saldo devedor após o pagamento desta prestação (Sistema Francês)",
  },
  dueDate: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  status: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  paidAmount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
    defaultValue: 0,
    comment: "Valor total pago nesta prestação (para pagamentos parciais)",
  },
});
