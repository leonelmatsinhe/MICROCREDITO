import { DataTypes } from "sequelize";
import { db } from "../db";

export const SmsModel = db.define("sms", {
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
  receipient: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  accountNumber: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  smsBody: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});
