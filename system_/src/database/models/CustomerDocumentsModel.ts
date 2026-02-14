import { DataTypes } from "sequelize";
import { db } from "../db";

export const CustomerDocumentsModel = db.define("customer_documents", {
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
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  documentName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  documentFileUrl: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  uploadedBy: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});
