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
});
