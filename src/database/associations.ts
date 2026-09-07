import { CompanyModel } from "./models/CompanyModel";
import { AccountModel } from "./models/AccountModel";
import { CustomerModel } from "./models/CustomerModel";
import { InterestRateModel } from "./models/InterestRateModel";
import { UserModel } from "./models/UserModel";
import { LoanModel } from "./models/LoanModel";
import { AmorizationLoanModel } from "./models/AmortizationLoanModel";
import { TranzactionModel } from "./models/TranzactionModel";
import { GuarateeAssessmentModel } from "./models/GuarateeAssessmentModel";
import { DebtModel } from "./models/DebtModel";

CompanyModel.hasMany(AccountModel, { foreignKey: "companyId", as: "accounts" });
CompanyModel.hasMany(CustomerModel, { foreignKey: "companyId", as: "customers" });
CompanyModel.hasMany(InterestRateModel, { foreignKey: "companyId", as: "interestRates" });
CompanyModel.hasMany(UserModel, { foreignKey: "companyId", as: "users" });
CompanyModel.hasMany(LoanModel, { foreignKey: "companyId", as: "loans" });

AccountModel.belongsTo(CompanyModel, { foreignKey: "companyId", as: "company" });

CustomerModel.belongsTo(CompanyModel, { foreignKey: "companyId", as: "company" });
CustomerModel.belongsTo(InterestRateModel, { foreignKey: "interestRateId", as: "interestRate" });
CustomerModel.hasMany(LoanModel, { foreignKey: "customerId", as: "loans" });

InterestRateModel.belongsTo(CompanyModel, { foreignKey: "companyId", as: "company" });
UserModel.belongsTo(CompanyModel, { foreignKey: "companyId", as: "company" });

LoanModel.belongsTo(CompanyModel, { foreignKey: "companyId", as: "company" });
LoanModel.belongsTo(CustomerModel, { foreignKey: "customerId", as: "customer" });
LoanModel.hasMany(AmorizationLoanModel, { foreignKey: "loanId", as: "installments" });
LoanModel.hasMany(TranzactionModel, { foreignKey: "loanId", as: "transactions" });

AmorizationLoanModel.belongsTo(LoanModel, { foreignKey: "loanId", as: "loan" });
AmorizationLoanModel.belongsTo(CustomerModel, { foreignKey: "customerId", as: "customer" });
AmorizationLoanModel.hasMany(TranzactionModel, { foreignKey: "amortizationLoanId", as: "transactions" });

TranzactionModel.belongsTo(LoanModel, { foreignKey: "loanId", as: "loan" });
TranzactionModel.belongsTo(CustomerModel, { foreignKey: "customerId", as: "customer" });
TranzactionModel.belongsTo(AmorizationLoanModel, {
  foreignKey: "amortizationLoanId",
  as: "installment",
});

GuarateeAssessmentModel.belongsTo(LoanModel, { foreignKey: "loanId", as: "loan" });
LoanModel.hasMany(GuarateeAssessmentModel, { foreignKey: "loanId", as: "guarantees" });
DebtModel.belongsTo(LoanModel, { foreignKey: "loanId", as: "loan" });
DebtModel.belongsTo(AmorizationLoanModel, { foreignKey: "amortisationId", as: "installment" });
DebtModel.belongsTo(CustomerModel, { foreignKey: "customerId", as: "customer" });
LoanModel.hasMany(DebtModel, { foreignKey: "loanId", as: "debts" });
