import { DataTypes } from "sequelize";
import { db } from "../db";

export const LoanRenewalModel = db.define("loan_renewals", {
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
  customerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  accountNumber: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  fromInstallmentId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: "Prestação liquidada (apenas juros) que originou a renovação",
  },
  toInstallmentId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: "Nova prestação criada para o ciclo renovado",
  },
  tranzactionId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: "Transacção financeira associada ao pagamento dos juros da renovação",
  },
  renewalNumber: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    comment: "Número sequencial da renovação neste contrato (1ª, 2ª, ...)",
  },
  principalAmount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    comment: "Capital transitado para o novo período",
  },
  interestPaid: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    comment: "Valor de juros normais liquidados no fecho do período anterior",
  },
  moraCalculated: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0,
    comment: "Juros de mora calculados pelo motor à data da renovação",
  },
  moraCharged: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0,
    comment: "Juros de mora efectivamente cobrados na renovação",
  },
  moraWaived: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0,
    comment: "Juros de mora isentados/perdoados na renovação",
  },
  newInterestAmount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    comment: "Juros do novo período renovado",
  },
  newInstallmentAmount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    comment: "Valor total (capital + novos juros) a vencer na nova prestação",
  },
  previousDueDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    get() {
      const raw = this.getDataValue("previousDueDate");
      return raw ? String(raw).slice(0, 10) : raw;
    },
  },
  newDueDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    get() {
      const raw = this.getDataValue("newDueDate");
      return raw ? String(raw).slice(0, 10) : raw;
    },
  },
  renewalDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    get() {
      const raw = this.getDataValue("renewalDate");
      return raw ? String(raw).slice(0, 10) : raw;
    },
  },
  generatedDocFile: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: "Ficheiro PDF gerado pelo sistema (Termo de Renovação)",
  },
  signedDocFile: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: "Ficheiro assinado pelo mutuário (upload obrigatório)",
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  createdByName: {
    type: DataTypes.STRING(150),
    allowNull: true,
  },
});
