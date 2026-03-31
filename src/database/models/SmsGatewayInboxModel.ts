import { DataTypes } from "sequelize";
import { db } from "../db";

export const SmsGatewayInboxModel = db.define(
  "sms_gateway_inbox",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    deviceId: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },
    senderPhone: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },
    receiverPhone: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },
    messageBody: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    receivedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    contentHash: {
      type: DataTypes.STRING(64),
      allowNull: false,
      unique: true,
    },
  },
  {
    tableName: "sms_gateway_inbox",
    freezeTableName: true,
  }
);
