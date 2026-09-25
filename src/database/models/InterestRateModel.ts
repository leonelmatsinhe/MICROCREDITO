import { DataTypes } from "sequelize";
import { db } from "../db";

export const InterestRateModel = db.define("interest_rates", {
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
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  tax: {
    type: DataTypes.DECIMAL(8, 4),
    allowNull: false,
  },
  administrativeFee: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
  },
  walletId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: "Carteira de financiamento (FINANCIAMENTO) associada a esta taxa",
  },
  // Alternativa à carteira analítica: ligar a taxa a uma conta de desembolso
  // (dinheiro REAL). walletId e accountId são mutuamente exclusivos.
  accountId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: "Conta de desembolso (accounts.purpose DESEMBOLSO/MISTO) da taxa",
  },
});
