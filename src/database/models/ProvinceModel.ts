import { DataTypes } from "sequelize";
import { db } from "../db";

export const ProvinceModel = db.define("provinces", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});
