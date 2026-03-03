import { DataTypes } from "sequelize";
import { db } from "../db";

export const CustomerModel = db.define("customers", {
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
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  customerName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  sex: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  customerEmail: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  customerNuit: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  customerPhone: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  customerNationalId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  issuedAt: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  localOfIssue: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  customerDateOfBirth: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  customerMonthlySalary: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  customerAddress: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  customerProfession: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  customerLocalOfWork: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  maritalStatus: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  customerSpouseName: {
    type: DataTypes.STRING,
  },
  customerSpouseContact: {
    type: DataTypes.STRING,
  },
  customerEmergencyPerson: {
    type: DataTypes.STRING,
  },
  customerEmergencyContact: {
    type: DataTypes.STRING,
  },
  passportPhotoUrl: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  customerStatus: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
});
