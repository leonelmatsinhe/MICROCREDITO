import { DataTypes } from "sequelize";
import { db } from "../db";

export const UserModel = db.define("user", {
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
  email: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  updatedPassword: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  status: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  userRole: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: "0=Super Admin, 1=Admin, 2=Operador, 3=Gestor de Crédito, 4=Parceiro Financiador",
  },
  walletId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: "Carteira de financiamento do parceiro (obrigatório quando userRole = 4)",
  },
  is_parceiro: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: "Parceiro financiador externo com acesso ao portal do financiador",
  },
  credentialsSent: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  credentialsSentAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },

});
