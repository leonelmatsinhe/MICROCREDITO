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
    type: DataTypes.BLOB,
    allowNull: false,
  },
  forfeit: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  companyStatus: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
});
