import { Request, Response } from "express";
import bcryptjs from "bcryptjs";
import * as jwt from "jsonwebtoken";
import { CustomerModel } from "../database/models/CustomerModel";
import { Op } from "sequelize";

const findAllCustomers = async (req: Request, res: Response) => {
  const { id } = req.params;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 15;
  const search = (req.query.search as string) || "";
  const offset = (page - 1) * limit;

  try {
    // Condição base: filtrar por empresa
    const whereClause: any = { companyId: id };

    // Se houver pesquisa, adicionar filtro por nome, telefone ou conta
    if (search.trim()) {
      whereClause[Op.or] = [
        { customerName: { [Op.like]: `%${search}%` } },
        { customerPhone: { [Op.like]: `%${search}%` } },
        { accountNumber: { [Op.like]: `%${search}%` } },
        { customerNuit: { [Op.like]: `%${search}%` } },
      ];
    }

    const { count, rows } = await CustomerModel.findAndCountAll({
      where: whereClause,
      order: [["customerName", "ASC"]],
      limit,
      offset,
    });

    const totalPages = Math.ceil(count / limit);

    return res.status(200).json({
      success: true,
      result: rows,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: count,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error: any) {
    console.error("Erro ao buscar mutuários:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Erro interno ao buscar mutuários.",
    });
  }
};

// Mantém endpoint legado para compatibilidade com outros componentes
const searchCustomers = async (req: Request, res: Response) => {
  const { search } = req.params;

  const customers = await CustomerModel.findAll({
    order: [["customerName", "ASC"]],
    where: {
      [Op.or]: [
        { customerName: { [Op.like]: "%" + search + "%" } },
        { customerPhone: { [Op.like]: "%" + search + "%" } },
        { accountNumber: { [Op.like]: "%" + search + "%" } },
      ],
    },
  });

  return res.status(200).json({ success: true, result: customers || [] });
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
  if (customer?.getDataValue.length == 1) {
    if (
      await bcryptjs.compare(password, customer?.getDataValue("password"))
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
          companyId: customer?.getDataValue("companyId"),
          accountNumber: customer?.getDataValue("accountNumber"),
          customerName: customer?.getDataValue("customerName"),
          customerEmail: customer?.getDataValue("customerEmail"),
          customerPhone: customer?.getDataValue("customerPhone"),
          customerNuit: customer?.getDataValue("customerNuit"),
          customerNationalId: customer?.getDataValue("customerNationalId"),
          issuedAt: customer?.getDataValue("issuedAt"),
          localOfIssue: customer?.getDataValue("localOfIssue"),
          customerDateOfBirth: customer?.getDataValue("customerDateOfBirth"),
          customerProfession: customer?.getDataValue("customerProfession"),
          customerMonthlySalary: customer?.getDataValue("customerMonthlySalary"),
          customerLocalOfWork: customer?.getDataValue("customerLocalOfWork"),
          customerAddress: customer?.getDataValue("customerAddress"),
          sex: customer?.getDataValue("sex"),
          maritalStatus: customer?.getDataValue("maritalStatus"),
          status: customer?.getDataValue("status"),
          createdAt: customer?.getDataValue("createdAt"),
          updatedAt: customer?.getDataValue("updatedAt"),
        },
      ];
      return res.send(JSON.stringify({ success: true, result: data, token }));
    } else {
      return res
        .status(200)
        .send(JSON.stringify({ success: false, message: "Wrong password" }));
    }
  } else {
    return res
      .status(200)
      .json({ success: false, message: "Customer not found" });
  }
};

const changeCustomerPassword = async (req: Request, res: Response) => {
  const { customerId, currentPassword, newPassword } = req.body;

  if (!customerId || !currentPassword || !newPassword) {
    return res.status(400).json({
      success: false,
      message: "Todos os campos são obrigatórios.",
    });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({
      success: false,
      message: "A nova senha deve ter pelo menos 6 caracteres.",
    });
  }

  try {
    const customer = await CustomerModel.findOne({
      where: { id: customerId },
    });

    if (!customer) {
      return res.status(200).json({
        success: false,
        message: "Cliente não encontrado.",
      });
    }

    const isMatch = await bcryptjs.compare(
      currentPassword + "",
      customer.getDataValue("password")
    );

    if (!isMatch) {
      return res.status(200).json({
        success: false,
        message: "A senha actual está incorrecta.",
      });
    }

    bcryptjs.hash(newPassword + "", 10, async (hashError, hash) => {
      if (hashError) {
        return res.status(500).json({
          success: false,
          message: "Erro ao processar a nova senha.",
        });
      }

      await CustomerModel.update(
        { password: hash },
        { where: { id: customerId } }
      );

      return res.status(200).json({
        success: true,
        message: "Senha alterada com sucesso.",
      });
    });
  } catch (error) {
    console.error("Erro ao alterar senha do cliente:", error);
    return res.status(500).json({
      success: false,
      message: "Erro interno ao alterar a senha.",
    });
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
  changeCustomerPassword,
};
