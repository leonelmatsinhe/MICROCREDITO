import { Request, Response } from "express";
import bcryptjs from "bcryptjs";
import * as jwt from "jsonwebtoken";
import { CustomerModel } from "../database/models/CustomerModel";
import { Op } from "sequelize";
import { hashPasswordIfNeeded } from "../utils/password";

// Remove o hash da senha antes de devolver mutuários ao frontend — a BD é a
// única fonte de verdade para login e nenhum hash deve voltar a ser reenviado.
const stripPassword = (entity: any) => {
  const plain = entity?.toJSON ? entity.toJSON() : entity;
  if (!plain) return plain;
  delete plain.password;
  return plain;
};

const findAllCustomers = async (req: Request, res: Response) => {
  const { id } = req.params;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 15;
  const search = (req.query.search as string) || "";
  const bairro = (req.query.bairro as string) || "";
  const offset = (page - 1) * limit;

  try {
    // Condição base: filtrar por empresa
    const whereClause: any = { companyId: id };

    if (bairro.trim()) {
      whereClause.customerBairro = { [Op.like]: `%${bairro.trim()}%` };
    }

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
      result: rows.map(stripPassword),
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

  return res.status(200).json({ success: true, result: (customers || []).map(stripPassword) });
};


const findOneCustomer = async (req: Request, res: Response) => {
  const { id } = req.params;
  const customer = await CustomerModel.findOne({
    where: {
      accountNumber: id,
    },
  });
  return customer
    ? res.status(200).send({ success: true, result: stripPassword(customer) })
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
    customerBairro,
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
      customerBairro,
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
  try {
    const { phone, password } = req.body;
    const loginValue = (phone || '').trim();
    console.log('[CustomerLogin] login attempt:', loginValue);

    if (!loginValue || !password) {
      return res.status(400).json({ success: false, message: "Telefone/email e senha são obrigatórios." });
    }

    // Buscar por telefone OU email (Op.or)
    const { Op } = require('sequelize');
    const customer = await CustomerModel.findOne({
      where: {
        [Op.or]: [
          { customerPhone: loginValue },
          { customerEmail: loginValue },
        ],
      },
    });

    if (!customer) {
      console.log('[CustomerLogin] Customer not found for:', loginValue);
      return res.status(200).json({ success: false, message: "Cliente não encontrado." });
    }

    const storedPassword = customer.getDataValue('password');

    // Tentar bcrypt primeiro
    let passwordMatch = false;
    try {
      passwordMatch = await bcryptjs.compare(password, storedPassword);
    } catch (e) {
      // Se bcrypt falhar (password pode ser plain text), comparar directamente
      passwordMatch = (password === storedPassword);
    }

    // Se bcrypt falhou, tentar comparação plain text
    if (!passwordMatch && storedPassword === password) {
      passwordMatch = true;
      // Re-hash para bcrypt
      const newHash = await bcryptjs.hash(password, 10);
      await customer.update({ password: newHash });
    }

    if (!passwordMatch) {
      console.log('[CustomerLogin] Wrong password for:', loginValue);
      return res.status(200).json({ success: false, message: "Senha incorreta." });
    }

    const token = jwt.sign(
      { id: customer.getDataValue('id') },
      process.env.APP_SECRET + "",
      { expiresIn: "15d" }
    );

    const data = [{
      id: customer.getDataValue('id'),
      companyId: customer.getDataValue('companyId'),
      accountNumber: customer.getDataValue('accountNumber'),
      customerName: customer.getDataValue('customerName'),
      customerEmail: customer.getDataValue('customerEmail'),
      customerPhone: customer.getDataValue('customerPhone'),
      customerNuit: customer.getDataValue('customerNuit'),
      customerNationalId: customer.getDataValue('customerNationalId'),
      issuedAt: customer.getDataValue('issuedAt'),
      localOfIssue: customer.getDataValue('localOfIssue'),
      customerDateOfBirth: customer.getDataValue('customerDateOfBirth'),
      customerProfession: customer.getDataValue('customerProfession'),
      customerMonthlySalary: customer.getDataValue('customerMonthlySalary'),
      customerLocalOfWork: customer.getDataValue('customerLocalOfWork'),
      customerAddress: customer.getDataValue('customerAddress'),
      sex: customer.getDataValue('sex'),
      maritalStatus: customer.getDataValue('maritalStatus'),
      status: customer.getDataValue('status'),
      createdAt: customer.getDataValue('createdAt'),
      updatedAt: customer.getDataValue('updatedAt'),
    }];

    console.log('[CustomerLogin] Success for:', loginValue);
    return res.send(JSON.stringify({ success: true, result: data, token }));
  } catch (err: any) {
    console.error('[CustomerLogin] Error:', err.message);
    return res.status(500).json({ success: false, message: "Erro interno do servidor." });
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

    // Hash bcrypt — nunca voltar a encriptar um valor que já seja hash
    const hash = hashPasswordIfNeeded(newPassword + "");
    await CustomerModel.update({ password: hash }, { where: { id: customerId } });
    return res.status(200).json({
      success: true,
      message: "Senha alterada com sucesso.",
    });
  } catch (error) {
    console.error("Erro ao alterar senha do cliente:", error);
    return res.status(500).json({
      success: false,
      message: "Erro interno ao alterar a senha.",
    });
  }
};

const bulkCreateCustomers = async (req: Request, res: Response) => {
  try {
    const { companyId, customers } = req.body;

    if (!companyId || !Array.isArray(customers) || customers.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Dados inválidos. Forneça companyId e uma lista de mutuários.",
      });
    }

    const lastCustomer = await CustomerModel.findOne({
      where: { companyId },
      order: [["id", "DESC"]],
    });
    let nextAccount = lastCustomer === null ? 100 : parseInt(lastCustomer.getDataValue("accountNumber")) + 1;

    const defaultPassword = await new Promise<string>((resolve, reject) => {
      bcryptjs.hash("123456", 10, (err, hash) => {
        if (err) reject(err);
        else resolve(hash);
      });
    });

    const records = customers.map((c: any) => {
      const record = {
        companyId,
        accountNumber: nextAccount++,
        password: defaultPassword,
        customerName: c.customerName || "",
        sex: c.sex || "M",
        customerEmail: c.customerEmail || "",
        customerNuit: c.customerNuit || "",
        customerPhone: c.customerPhone || "",
        customerNationalId: c.customerNationalId || "",
        issuedAt: c.issuedAt || "",
        localOfIssue: c.localOfIssue || "",
        customerDateOfBirth: c.customerDateOfBirth || "",
        customerMonthlySalary: c.customerMonthlySalary || "0",
        customerAddress: c.customerAddress || "",
        customerBairro: c.customerBairro || "",
        customerProfession: c.customerProfession || "",
        customerLocalOfWork: c.customerLocalOfWork || "",
        maritalStatus: c.maritalStatus || "solteiro",
        customerSpouseName: c.customerSpouseName || "",
        customerSpouseContact: c.customerSpouseContact || "",
        customerEmergencyPerson: c.customerEmergencyPerson || "",
        customerEmergencyContact: c.customerEmergencyContact || "",
        customerStatus: 0,
      };
      return record;
    });

    const created = await CustomerModel.bulkCreate(records);

    return res.status(201).json({
      success: true,
      message: `${created.length} mutuário(s) cadastrado(s) com sucesso.`,
      count: created.length,
    });
  } catch (error: any) {
    console.error("Erro ao cadastrar mutuários em massa:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Erro interno ao cadastrar mutuários.",
    });
  }
};

const getAllCustomerNames = async (req: Request, res: Response) => {
  const { id: companyId } = req.params;
  try {
    const customers = await CustomerModel.findAll({
      attributes: ["accountNumber", "customerName"],
      where: { companyId },
      order: [["customerName", "ASC"]],
    });
    const nameMap: Record<string, string> = {};
    customers.forEach((c: any) => {
      nameMap[c.getDataValue("accountNumber")] = c.getDataValue("customerName");
    });
    return res.status(200).json({ success: true, result: nameMap });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Admin/Gestor define senha do cliente directamente (para teste)
const setCustomerPassword = async (req: Request, res: Response) => {
  try {
    const { customerId, newPassword } = req.body;
    if (!customerId || !newPassword) {
      return res.status(400).json({ success: false, message: "customerId e newPassword sao obrigatorios." });
    }
    if (newPassword.length < 4) {
      return res.status(400).json({ success: false, message: "A senha deve ter pelo menos 4 caracteres." });
    }
    const customer = await CustomerModel.findByPk(customerId);
    if (!customer) {
      return res.status(404).json({ success: false, message: "Cliente nao encontrado." });
    }
    // Hash bcrypt — nunca voltar a encriptar um valor que já seja hash
    const hash = hashPasswordIfNeeded(newPassword);
    await customer.update({ password: hash });
    return res.status(200).json({ success: true, message: "Senha do cliente actualizada com sucesso.", customerId });
  } catch (err: any) {
    console.error("Erro ao definir senha do cliente:", err.message);
    return res.status(500).json({ success: false, message: "Erro interno do servidor." });
  }
};

export {
  findAllCustomers,
  searchCustomers,
  findOneCustomer,
  createCustomer,
  bulkCreateCustomers,
  updateCustomer,
  deleteCustomer,
  loginCustomer,
  changeCustomerPassword,
  getAllCustomerNames,
  setCustomerPassword,
};
