"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerCustomer = exports.setCustomerPassword = exports.getAllCustomerNames = exports.changeCustomerPassword = exports.loginCustomer = exports.deleteCustomer = exports.updateCustomer = exports.bulkCreateCustomers = exports.createCustomer = exports.findOneCustomer = exports.searchCustomers = exports.findAllCustomers = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jwt = __importStar(require("jsonwebtoken"));
const CustomerModel_1 = require("../database/models/CustomerModel");
const CustomerDocumentsModel_1 = require("../database/models/CustomerDocumentsModel");
const CompanyModel_1 = require("../database/models/CompanyModel");
const UserModel_1 = require("../database/models/UserModel");
const NotificationModel_1 = require("../database/models/NotificationModel");
const sequelize_1 = require("sequelize");
const password_1 = require("../utils/password");
// Remove o hash da senha antes de devolver mutuários ao frontend — a BD é a
// única fonte de verdade para login e nenhum hash deve voltar a ser reenviado.
const stripPassword = (entity) => {
    const plain = (entity === null || entity === void 0 ? void 0 : entity.toJSON) ? entity.toJSON() : entity;
    if (!plain)
        return plain;
    delete plain.password;
    return plain;
};
const findAllCustomers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;
    const search = req.query.search || "";
    const bairro = req.query.bairro || "";
    const offset = (page - 1) * limit;
    try {
        // Condição base: filtrar por empresa
        const whereClause = { companyId: id };
        if (bairro.trim()) {
            whereClause.customerBairro = { [sequelize_1.Op.like]: `%${bairro.trim()}%` };
        }
        // Se houver pesquisa, adicionar filtro por nome, telefone ou conta
        if (search.trim()) {
            whereClause[sequelize_1.Op.or] = [
                { customerName: { [sequelize_1.Op.like]: `%${search}%` } },
                { customerPhone: { [sequelize_1.Op.like]: `%${search}%` } },
                { accountNumber: { [sequelize_1.Op.like]: `%${search}%` } },
                { customerNuit: { [sequelize_1.Op.like]: `%${search}%` } },
            ];
        }
        const { count, rows } = yield CustomerModel_1.CustomerModel.findAndCountAll({
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
    }
    catch (error) {
        console.error("Erro ao buscar mutuários:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Erro interno ao buscar mutuários.",
        });
    }
});
exports.findAllCustomers = findAllCustomers;
// Mantém endpoint legado para compatibilidade com outros componentes
const searchCustomers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { search } = req.params;
    const customers = yield CustomerModel_1.CustomerModel.findAll({
        order: [["customerName", "ASC"]],
        where: {
            [sequelize_1.Op.or]: [
                { customerName: { [sequelize_1.Op.like]: "%" + search + "%" } },
                { customerPhone: { [sequelize_1.Op.like]: "%" + search + "%" } },
                { accountNumber: { [sequelize_1.Op.like]: "%" + search + "%" } },
            ],
        },
    });
    return res.status(200).json({ success: true, result: (customers || []).map(stripPassword) });
});
exports.searchCustomers = searchCustomers;
const findOneCustomer = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const customer = yield CustomerModel_1.CustomerModel.findOne({
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
});
exports.findOneCustomer = findOneCustomer;
const createCustomer = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    let { customerName, sex, companyId, customerEmail, customerNuit, customerPhone, customerNationalId, issuedAt, localOfIssue, customerDateOfBirth, customerLocalOfBirth, customerProfession, customerMonthlySalary, customerLocalOfWork, customerAddress, customerBairro, maritalStatus, customerSpouseName, customerSpouseContact, customerEmergencyPerson, customerEmergencyContact, customerStatus, interestRateId, } = req.body;
    const accNumber = yield CustomerModel_1.CustomerModel.findOne({
        where: {
            companyId
        },
        order: [["id", "DESC"]],
    });
    const accountNumber = accNumber === null ? 100 : parseInt(accNumber === null || accNumber === void 0 ? void 0 : accNumber.getDataValue("accountNumber")) + 1;
    bcryptjs_1.default.hash("123456" + "", 10, (hashError, hash) => __awaiter(void 0, void 0, void 0, function* () {
        if (hashError) {
            return res.status(500).json({
                success: false,
                message: hashError,
            });
        }
        const customer = yield CustomerModel_1.CustomerModel.create({
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
    }));
});
exports.createCustomer = createCustomer;
// ============================================================
// AUTO-CADASTRO público (Login → "Criar conta de mutuário")
// Permite a um novo cliente criar a própria conta (com documentos:
// BI/passaporte, NUIT, declaração de bairro e foto tipo passe) sem
// depender da submissão presencial de documentos à instituição.
// Depois de registado, o mutuário entra no portal e solicita o
// primeiro empréstimo (fluxo normal de aprovação).
// ============================================================
const registerCustomer = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { customerName, sex, maritalStatus, customerNuit, customerNationalId, issuedAt, localOfIssue, customerDateOfBirth, customerPhone, customerEmail, customerProfession, customerMonthlySalary, customerLocalOfWork, customerAddress, customerBairro, customerPassword, passportPhotoUrl, 
        // Documentos enviados: [{ documentName, documentFileUrl }]
        documents, companyId, } = req.body;
        // --- Validações mínimas ---
        if (!customerName || !String(customerName).trim()) {
            return res.status(400).json({ success: false, message: "O nome completo é obrigatório." });
        }
        if (!sex || (String(sex) !== "M" && String(sex) !== "F")) {
            return res.status(400).json({ success: false, message: "Indique o género (M ou F)." });
        }
        const phone = String(customerPhone || "").trim();
        if (!phone) {
            return res.status(400).json({ success: false, message: "O telefone é obrigatório para o login no portal." });
        }
        const password = String(customerPassword || "");
        if (password.length < 4) {
            return res.status(400).json({ success: false, message: "A senha deve ter pelo menos 4 caracteres." });
        }
        // --- Empresa destino ---
        // O auto-cadastro é público e não conhece a empresa: usa a fornecida no
        // corpo ou a empresa padrão dos auto-cadastros (COMPANY_DEFAULT_ID, por
        // defeito 36). Se essa empresa não existir, cai para a primeira registada.
        let companyIdNum = parseInt(String(companyId !== null && companyId !== void 0 ? companyId : ""), 10);
        if (Number.isNaN(companyIdNum) || companyIdNum < 1) {
            companyIdNum = parseInt(process.env.COMPANY_DEFAULT_ID || "36", 10);
        }
        const companyExists = yield CompanyModel_1.CompanyModel.findByPk(companyIdNum);
        if (!companyExists) {
            const firstCompany = yield CompanyModel_1.CompanyModel.findOne({ order: [["id", "ASC"]] });
            if (!firstCompany) {
                return res.status(503).json({
                    success: false,
                    message: "Ainda não existe uma instituição configurada na plataforma.",
                });
            }
            companyIdNum = parseInt(String(firstCompany.getDataValue("id")), 10);
        }
        // --- Duplicados (telefone, email, NUIT ou BI) ---
        const duplicateWhere = [{ customerPhone: phone }];
        const email = String(customerEmail || "").trim();
        if (email)
            duplicateWhere.push({ customerEmail: email });
        const nuit = String(customerNuit || "").trim();
        if (nuit)
            duplicateWhere.push({ customerNuit: nuit });
        const nationalId = String(customerNationalId || "").trim();
        if (nationalId)
            duplicateWhere.push({ customerNationalId: nationalId });
        const existing = yield CustomerModel_1.CustomerModel.findOne({ where: { [sequelize_1.Op.or]: duplicateWhere } });
        if (existing) {
            return res.status(409).json({
                success: false,
                message: "Já existe uma conta com este telefone, email, NUIT ou BI. Utilize o login do mutuário.",
            });
        }
        // --- Nº de conta sequencial por empresa (100, 101, ...) ---
        const lastCustomer = yield CustomerModel_1.CustomerModel.findOne({
            where: { companyId: companyIdNum },
            order: [["id", "DESC"]],
        });
        const accountNumber = lastCustomer === null
            ? 100
            : parseInt(String(lastCustomer.getDataValue("accountNumber"))) + 1;
        // --- Criar o mutuário (activo logo no registo para poder entrar no portal) ---
        const customer = yield CustomerModel_1.CustomerModel.create({
            customerName: String(customerName).trim(),
            sex: String(sex),
            companyId: companyIdNum,
            accountNumber,
            password: (0, password_1.hashPasswordIfNeeded)(password),
            customerEmail: email || null,
            customerNuit: nuit || null,
            customerPhone: phone,
            customerNationalId: nationalId || null,
            issuedAt: issuedAt ? String(issuedAt) : null,
            localOfIssue: localOfIssue ? String(localOfIssue) : null,
            customerDateOfBirth: customerDateOfBirth ? String(customerDateOfBirth) : null,
            customerProfession: customerProfession ? String(customerProfession) : null,
            customerMonthlySalary: customerMonthlySalary ? String(customerMonthlySalary) : null,
            customerLocalOfWork: customerLocalOfWork ? String(customerLocalOfWork) : null,
            customerAddress: customerAddress ? String(customerAddress) : null,
            customerBairro: customerBairro ? String(customerBairro) : null,
            maritalStatus: maritalStatus || "solteiro",
            passportPhotoUrl: passportPhotoUrl ? String(passportPhotoUrl) : null,
            customerStatus: 1,
            isSelfRegistered: 1,
        });
        // --- Documentos enviados (BI/passaporte, NUIT, declaração de bairro) ---
        // Gravados na tabela customer_documents — aparecem no painel do mutuário
        // (DocumentsModal) tal como os documentos submetidos pela instituição.
        if (Array.isArray(documents) && documents.length > 0) {
            const docs = documents
                .filter((d) => d && d.documentName && d.documentFileUrl)
                .map((d) => ({
                companyId: companyIdNum,
                accountNumber,
                documentName: String(d.documentName),
                documentFileUrl: String(d.documentFileUrl),
                uploadedBy: "Auto-cadastro (Portal)",
            }));
            if (docs.length > 0) {
                try {
                    yield CustomerDocumentsModel_1.CustomerDocumentsModel.bulkCreate(docs);
                }
                catch (docErr) {
                    console.error("Erro ao gravar documentos do auto-cadastro:", docErr);
                }
            }
        }
        // --- Notificar administradores e gestores de crédito da empresa ---
        // Mesmo padrão da solicitação de crédito no portal: uma notificação por
        // utilizador (roles 0/1 = admins, 3 = gestor de crédito).
        try {
            const staff = yield UserModel_1.UserModel.findAll({
                where: {
                    companyId: companyIdNum,
                    userRole: { [sequelize_1.Op.in]: [0, 1, 3] },
                },
            });
            const recipients = [];
            const seen = new Set();
            for (const user of staff) {
                const userId = parseInt(String(user.getDataValue("id")), 10);
                if (!userId || seen.has(userId))
                    continue;
                seen.add(userId);
                recipients.push({
                    companyId: companyIdNum,
                    recipientType: "admin",
                    recipientId: userId,
                    title: "Novo mutuário auto-registado",
                    message: `O mutuário ${String(customerName).trim()} (conta ${accountNumber}) criou a conta no portal e aguarda revisão dos documentos.`,
                    type: "customer_registered",
                    referenceId: parseInt(String(customer.getDataValue("id")), 10),
                    isRead: false,
                });
            }
            if (recipients.length > 0) {
                yield NotificationModel_1.NotificationModel.bulkCreate(recipients);
            }
        }
        catch (notifErr) {
            console.error("Erro ao notificar novo auto-cadastro:", notifErr);
        }
        return res.status(201).json({
            success: true,
            message: "Conta criada com sucesso. Bem-vindo ao Portal do Mutuário!",
            result: stripPassword(customer),
            accountNumber,
        });
    }
    catch (error) {
        console.error("Erro no auto-cadastro do mutuário:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Erro interno ao criar a conta.",
        });
    }
});
exports.registerCustomer = registerCustomer;
const updateCustomer = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    yield CustomerModel_1.CustomerModel.update(req.body, {
        where: {
            id,
        },
    });
    return res
        .status(200)
        .json({ success: true, message: "Customer updated successfully" });
});
exports.updateCustomer = updateCustomer;
const deleteCustomer = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const deleteCustomer = yield CustomerModel_1.CustomerModel.destroy({ where: { id: id } });
    return deleteCustomer != null
        ? res.status(201).send(JSON.stringify({
            success: true,
            message: "Customer deleted successfully.",
        }))
        : res.status(204).send(JSON.stringify({
            success: false,
            message: "There was an error deleting this customer.",
        }));
});
exports.deleteCustomer = deleteCustomer;
const loginCustomer = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { phone, password } = req.body;
        const loginValue = (phone || '').trim();
        console.log('[CustomerLogin] login attempt:', loginValue);
        if (!loginValue || !password) {
            return res.status(400).json({ success: false, message: "Telefone/email e senha são obrigatórios." });
        }
        // Buscar por telefone OU email (Op.or)
        const { Op } = require('sequelize');
        const customer = yield CustomerModel_1.CustomerModel.findOne({
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
            passwordMatch = yield bcryptjs_1.default.compare(password, storedPassword);
        }
        catch (e) {
            // Se bcrypt falhar (password pode ser plain text), comparar directamente
            passwordMatch = (password === storedPassword);
        }
        // Se bcrypt falhou, tentar comparação plain text
        if (!passwordMatch && storedPassword === password) {
            passwordMatch = true;
            // Re-hash para bcrypt
            const newHash = yield bcryptjs_1.default.hash(password, 10);
            yield customer.update({ password: newHash });
        }
        if (!passwordMatch) {
            console.log('[CustomerLogin] Wrong password for:', loginValue);
            return res.status(200).json({ success: false, message: "Senha incorreta." });
        }
        const token = jwt.sign({ id: customer.getDataValue('id') }, process.env.APP_SECRET + "", { expiresIn: "15d" });
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
    }
    catch (err) {
        console.error('[CustomerLogin] Error:', err.message);
        return res.status(500).json({ success: false, message: "Erro interno do servidor." });
    }
});
exports.loginCustomer = loginCustomer;
const changeCustomerPassword = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        const customer = yield CustomerModel_1.CustomerModel.findOne({
            where: { id: customerId },
        });
        if (!customer) {
            return res.status(200).json({
                success: false,
                message: "Cliente não encontrado.",
            });
        }
        const isMatch = yield bcryptjs_1.default.compare(currentPassword + "", customer.getDataValue("password"));
        if (!isMatch) {
            return res.status(200).json({
                success: false,
                message: "A senha actual está incorrecta.",
            });
        }
        // Hash bcrypt — nunca voltar a encriptar um valor que já seja hash
        const hash = (0, password_1.hashPasswordIfNeeded)(newPassword + "");
        yield CustomerModel_1.CustomerModel.update({ password: hash }, { where: { id: customerId } });
        return res.status(200).json({
            success: true,
            message: "Senha alterada com sucesso.",
        });
    }
    catch (error) {
        console.error("Erro ao alterar senha do cliente:", error);
        return res.status(500).json({
            success: false,
            message: "Erro interno ao alterar a senha.",
        });
    }
});
exports.changeCustomerPassword = changeCustomerPassword;
const bulkCreateCustomers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { companyId, customers } = req.body;
        if (!companyId || !Array.isArray(customers) || customers.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Dados inválidos. Forneça companyId e uma lista de mutuários.",
            });
        }
        const lastCustomer = yield CustomerModel_1.CustomerModel.findOne({
            where: { companyId },
            order: [["id", "DESC"]],
        });
        let nextAccount = lastCustomer === null ? 100 : parseInt(lastCustomer.getDataValue("accountNumber")) + 1;
        const defaultPassword = yield new Promise((resolve, reject) => {
            bcryptjs_1.default.hash("123456", 10, (err, hash) => {
                if (err)
                    reject(err);
                else
                    resolve(hash);
            });
        });
        const records = customers.map((c) => {
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
        const created = yield CustomerModel_1.CustomerModel.bulkCreate(records);
        return res.status(201).json({
            success: true,
            message: `${created.length} mutuário(s) cadastrado(s) com sucesso.`,
            count: created.length,
        });
    }
    catch (error) {
        console.error("Erro ao cadastrar mutuários em massa:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Erro interno ao cadastrar mutuários.",
        });
    }
});
exports.bulkCreateCustomers = bulkCreateCustomers;
const getAllCustomerNames = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id: companyId } = req.params;
    try {
        const customers = yield CustomerModel_1.CustomerModel.findAll({
            attributes: ["accountNumber", "customerName"],
            where: { companyId },
            order: [["customerName", "ASC"]],
        });
        const nameMap = {};
        customers.forEach((c) => {
            nameMap[c.getDataValue("accountNumber")] = c.getDataValue("customerName");
        });
        return res.status(200).json({ success: true, result: nameMap });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
});
exports.getAllCustomerNames = getAllCustomerNames;
// Admin/Gestor define senha do cliente directamente (para teste)
const setCustomerPassword = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { customerId, newPassword } = req.body;
        if (!customerId || !newPassword) {
            return res.status(400).json({ success: false, message: "customerId e newPassword sao obrigatorios." });
        }
        if (newPassword.length < 4) {
            return res.status(400).json({ success: false, message: "A senha deve ter pelo menos 4 caracteres." });
        }
        const customer = yield CustomerModel_1.CustomerModel.findByPk(customerId);
        if (!customer) {
            return res.status(404).json({ success: false, message: "Cliente nao encontrado." });
        }
        // Hash bcrypt — nunca voltar a encriptar um valor que já seja hash
        const hash = (0, password_1.hashPasswordIfNeeded)(newPassword);
        yield customer.update({ password: hash });
        return res.status(200).json({ success: true, message: "Senha do cliente actualizada com sucesso.", customerId });
    }
    catch (err) {
        console.error("Erro ao definir senha do cliente:", err.message);
        return res.status(500).json({ success: false, message: "Erro interno do servidor." });
    }
});
exports.setCustomerPassword = setCustomerPassword;
