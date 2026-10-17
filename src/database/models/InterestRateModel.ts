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
    // Fracção da taxa administrativa com 6 decimais: 0.0001 = 0.01%.
    // DECIMAL(15,6) guarda percentagens pequenas sem perder precisão
    // (com (15,2) um 0,01% era arredondado a zero).
    type: DataTypes.DECIMAL(15, 6),
    allowNull: false,
    // Sem default, um create que omitisse o campo falhava (NOT NULL) ou, em
    // MySQL não-estrito, gravava lixo — isento é 0 explícito.
    defaultValue: 0,
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
