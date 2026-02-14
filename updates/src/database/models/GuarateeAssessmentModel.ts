import { DataTypes } from "sequelize";
import { db } from "../db";

export const GuarateeAssessmentModel = db.define("loan_guarantees", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true,
    },
    loanId: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    guaranteeDescription: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    guaranteeFileUrl: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    purchaseAmount: {
        type: DataTypes.FLOAT,
        allowNull: true,
    },
    status: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
});
