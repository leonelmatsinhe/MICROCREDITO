import { Request, Response } from "express";
import bcryptjs from "bcryptjs";
import * as jwt from "jsonwebtoken";
import { CustomerModel } from "../database/models/CustomerModel";
import { Op } from "sequelize";
import { AccountModel } from "../database/models/AccountModel";

const findAllCustomers = async (req: Request, res: Response) => {
  const { id } = req.params;
  const customers = await CustomerModel.findAll(
    {
      where: {
        companyId: id
      },
      order: [["customerName", "ASC"]],
    }
  );
  return customers.length > 0
    ? res.status(200).send({ success: true, result: customers })
    : res
      .status(204)
      .send({ success: false, message: "No customers registered so far." });
};

const searchCustomers = async (req: Request, res: Response) => {
  const { search } = req.params;

  const customers = await CustomerModel.findAll({
    order: ["customerName"],
    where: {
      [Op.or]: [
        {
          customerName: {
            [Op.like]: "%" + search + "%",
          },
        },
      ],
    },
  })

  return customers.length > 0
    ? res.status(200).send({ success: true, result: customers })
    : res
      .status(204)
      .send({ success: false, message: "No customers registered so far." });
};


const findOneCustomer = async (req: Request, res: Response) => {
  const { id } = req.params;
  const customer = await CustomerModel.findOne({
    where: {
      accountNumber: id,
    },
  });
  return customer
    ? res.status(200).send({ success: true, result: customer })
    : res.status(204).send({
      success: false,
      result: "No customer found with the ID provided",
    });
};

const createCustomer = async (req: Request, res: Response) => {
  let {
    customerName,
    sex,
    companyId,
    customerEmail,
    customerNuit,
    customerPhone,
    customerNationalId,
    issuedAt,
    localOfIssue,
    customerDateOfBirth,
    customerLocalOfBirth,
    customerProfession,
    customerMonthlySalary,
    customerLocalOfWork,
    customerAddress,
    maritalStatus,
    customerSpouseName,
    customerSpouseContact,
    customerEmergencyPerson,
    customerEmergencyContact,
    customerStatus,
    interestRateId,
  } = req.body;

  const accNumber = await CustomerModel.findOne({
    where: {
      companyId
    },
    order: [["id", "DESC"]],
  })
  const accountNumber = accNumber === null ? 100 : parseInt(accNumber?.getDataValue("accountNumber")) + 1

  bcryptjs.hash("123456" + "", 10, async (hashError, hash) => {
    if (hashError) {
      return res.status(500).json({
        success: false,
        message: hashError,
      });

    }
    const customer = await CustomerModel.create({
      customerName,
      sex,
      companyId,
      customerEmail,
      accountNumber,
      password: hash,
      customerNuit,
      customerPhone,
      customerNationalId,
      issuedAt,
      localOfIssue,
      customerDateOfBirth,
      customerLocalOfBirth,
      customerProfession,
      customerMonthlySalary,
      customerLocalOfWork,
      customerAddress,
      maritalStatus,
      customerSpouseName,
      customerSpouseContact,
      customerEmergencyPerson,
      customerEmergencyContact,
      customerStatus,
      interestRateId,
    });

    return customer != null
      ? res
        .status(201)
        .send({ success: true, message: "Customer created successfully." })
      : res.status(200).send({
        success: false,
        message: "There was an error registering the customer.",
      });
  })
};

const updateCustomer = async (req: Request, res: Response) => {
  const { id } = req.params;
  await CustomerModel.update(req.body, {
    where: {
      id,
    },
  });
  return res
    .status(200)
    .json({ success: true, message: "Customer updated successfully" });
};

const deleteCustomer = async (req: Request, res: Response) => {
  const { id } = req.params;
  const deleteCustomer = await CustomerModel.destroy({ where: { id: id } });
  return deleteCustomer != null
    ? res.status(201).send(
      JSON.stringify({
        success: true,
        message: "Customer deleted successfully.",
      })
    )
    : res.status(204).send(
      JSON.stringify({
        success: false,
        message: "There was an error deleting this customer.",
      })
    );
};

const loginCustomer = async (req: Request, res: Response) => {
  const { phone, password } = req.body;
  console.log(phone, password)

  const customer = await CustomerModel.findOne({
    where: {
      customerPhone: phone,
    },
  });
  if (customer?.getDataValue("id") > 0) {
    if (
      await bcryptjs.compare(password + "", customer?.getDataValue("password"))
    ) {
      const token = jwt.sign(
        { id: customer?.getDataValue("id") },
        process.env.APP_SECRET + "",
        {
          expiresIn: "15d",
        }
      );

      const data = [
        {
          id: customer?.getDataValue("id"),
          accountNumber: customer?.getDataValue("accountNumber"),
          customerName: customer?.getDataValue("customerName"),
          customerEmail: customer?.getDataValue("customerEmail"),
          customerPhone: customer?.getDataValue("customerPhone"),
          customerNuit: customer?.getDataValue("customerNuit"),
          customerNationalId: customer?.getDataValue("customerNationalId"),
          issuedAt: customer?.getDataValue("issuedAt"),
          localOfIssue: customer?.getDataValue("localOfIssue"),
          customerAddress: customer?.getDataValue("customerAddress"),
          status: customer?.getDataValue("status"),
          createdAt: customer?.getDataValue("createdAt"),
          updatedAt: customer?.getDataValue("updatedAt"),
        },
      ];

      return res.send(JSON.stringify({ success: true, result: data, token }));
    } else {
      return res
        .status(204)
        .send(JSON.stringify({ success: false, message: "Wrong password" }));
    }
  } else {
    return res
      .status(204)
      .json({ success: false, message: "Customer not found" });
  }
};

export {
  findAllCustomers,
  searchCustomers,
  findOneCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  loginCustomer,
};
