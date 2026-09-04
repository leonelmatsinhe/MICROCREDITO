import { DataTypes } from "sequelize";
import { db } from "../db";

export const CompanyModel = db.define("company", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
  },
  companyName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  companyEmail: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  companyWebsite: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  companyManager: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  smsSender: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  companyNuit: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  companyPhone: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  districtId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  provinceId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  companyAddress: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  companyLogo: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: '',
  },
  forfeit: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  companyStatus: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  paymentMethods: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: '1:Numerário,2:Cheque,3:Transferência Bancária,4:Depósito Bancário,7:M-Pesa',
    comment: 'Meios de pagamento separados por vírgula: id:nome,id:nome',
  },
  smsEnabled: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    comment: 'Autorização de envio de SMS (1 = activado, 0 = desactivado). Apenas o Admin altera.',
  },
  contractHideInsuranceClause: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Oculta a cláusula VIGÉSIMA PRIMEIRA (seguro/garantias) no contrato de concessão (1 = ocultar, 0 = mostrar).',
  },
});
