import { Request, Response } from "express";
import { CompanyModel } from "../database/models/CompanyModel";
import { CustomerModel } from "../database/models/CustomerModel";
import { AmorizationLoanModel } from "../database/models/AmortizationLoanModel";
import { generateContrat } from "../utils/generatePDF";

const customerContract = async (req: Request, res: Response) => {
    const { companyId, accountNumber, loanId } = req.params;

    const company = await CompanyModel.findOne({ where: { id: companyId, }, });
    const customer = await CustomerModel.findOne({ where: { accountNumber } })
    const amortization = await AmorizationLoanModel.findAll({ where: { loanId } })

    if (company != null && customer != null && amortization != null) {
        const firm = {
            companyLogo: company.getDataValue("companyLogo"),
            companyName: company.getDataValue("companyName"),
            companyAddress: company.getDataValue("companyAddress"),
            companyPhone: company.getDataValue("companyPhone"),
            companyNuit: company.getDataValue("companyNuit"),
            companyEmail: company.getDataValue("companyEmail"),
            companyManager: company.getDataValue("companyManager"),
        }

        const cliente = {
            accountNumber: customer.getDataValue("accountNumber"),
            customerName: customer.getDataValue("customerName"),
            customerAddress: customer.getDataValue("customerAddress"),
            customerPhone: customer.getDataValue("customerPhone"),
            customerNuit: customer.getDataValue("customerNuit"),
            customerProfession: customer.getDataValue("customerProfession"),
            customerLocalOfWork: customer.getDataValue("customerLocalOfWork"),
            customerEmergencyPerson: customer.getDataValue("customerEmergencyPerson"),
            customerEmergencyContact: customer.getDataValue("customerEmergencyContact"),
            createdAt: customer.getDataValue("createdAt"),
        }

        new Promise(async (resolve, reject) => {
            try {
                const generating = await generateContrat(firm, cliente, amortization);
                console.log(generating);
                res.send(
                    JSON.stringify({
                        success: true,
                        message: "Contrato gerado com sucesso.",
                    })
                );
                resolve(generating);
            } catch (err) {
                console.log(err);
                res.send(
                    JSON.stringify({
                        success: false,
                        message: "Houve um erro na geração do contrato.",
                    })
                );
                reject(err);
            }
        });
    } else {
        res.status(204).send({
            success: false,
            message: "There was an error on the server",
        });
    }
};

export { customerContract };
