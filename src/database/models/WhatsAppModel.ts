import { DataTypes } from "sequelize";
import { db } from "../db";

export const WhatsAppModel = db.define("whatsapp_messages", {
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
  phone: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  accountNumber: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  customerName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  messageType: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  messageBody: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: "queued",
  },
  direction: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: "outbound",
  },
  payloadJson: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
});
