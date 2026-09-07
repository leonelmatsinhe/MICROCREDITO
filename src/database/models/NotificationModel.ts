import { DataTypes } from "sequelize";
import { db } from "../db";

export const NotificationModel = db.define("notifications", {
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
  recipientType: {
    type: DataTypes.STRING,
    allowNull: false,
    // "admin" | "gestor" | "customer"
  },
  recipientId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  customerId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false,
    // "loan_request" | "loan_approved" | "loan_rejected" | "payment_received" |
    // "installment_due" | "installment_overdue" | "loan_disbursed" | "general"
  },
  referenceId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  isRead: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
});
