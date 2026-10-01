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
    // V2: DATE real na BD (migração convertida de VARCHAR) — leitura normalizada
    // como 'YYYY-MM-DD', sem hora nem bug de fuso GMT+2 (Maputo).
    type: DataTypes.DATEONLY,
    allowNull: false,
    get() {
      const raw = this.getDataValue("dueDate");
      return raw ? String(raw).slice(0, 10) : raw;
    },
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
  walletId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: "Carteira de financiamento do crédito (analítica)",
  },
  mora_amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0,
    comment: "Juros de mora acumulados/gerados nesta prestação",
  },
  mora_days: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: "Dias de atraso considerados no cálculo da mora desta prestação",
  },
});
