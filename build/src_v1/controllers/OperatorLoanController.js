"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.companyLoansPaginated = exports.companyLoans = void 0;
const LoanModel_1 = require("../database/models/LoanModel");
const CustomerModel_1 = require("../database/models/CustomerModel");
const sequelize_1 = require("sequelize");
const companyLoans = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { companyId } = req.params;
    const { from, to, status, creditManager, search } = req.query;
    try {
        const whereClause = { companyId };
        if (status !== undefined && status !== "") {
            whereClause.status = parseInt(status);
        }
        if (creditManager !== undefined && creditManager !== "") {
            whereClause.creditManager = parseInt(creditManager);
        }
        // dateCreated é armazenado como string no formato YYYY-MM-DD.
        // Aplicar filtro no SQL reduz leitura em memória.
        if (from && to) {
            whereClause.dateCreated = {
                [sequelize_1.Op.between]: [String(from), String(to)],
            };
        }
        else if (from) {
            whereClause.dateCreated = {
                [sequelize_1.Op.gte]: String(from),
            };
        }
        else if (to) {
            whereClause.dateCreated = {
                [sequelize_1.Op.lte]: String(to),
            };
        }
        if ((search || "").trim()) {
            const searchText = search.trim();
            const matchingCustomers = yield CustomerModel_1.CustomerModel.findAll({
                attributes: ["accountNumber"],
                where: {
                    companyId,
                    [sequelize_1.Op.or]: [
                        { customerName: { [sequelize_1.Op.like]: `%${searchText}%` } },
                        { customerPhone: { [sequelize_1.Op.like]: `%${searchText}%` } },
                    ],
                },
            });
            const matchingAccountNumbers = matchingCustomers.map((c) => c.getDataValue("accountNumber"));
            const searchConditions = [];
            const numericSearch = parseInt(searchText);
            if (!isNaN(numericSearch)) {
                searchConditions.push({ accountNumber: numericSearch });
            }
            if (matchingAccountNumbers.length > 0) {
                searchConditions.push({
                    accountNumber: { [sequelize_1.Op.in]: matchingAccountNumbers },
                });
            }
            if (searchConditions.length > 0) {
                whereClause[sequelize_1.Op.or] = searchConditions;
            }
            else {
                return res.status(200).send({
                    success: true,
                    result: [],
                });
            }
        }
        const loans = yield LoanModel_1.LoanModel.findAll({
            where: whereClause,
            order: [["id", "DESC"]],
        });
        return res.status(200).send({
            success: true,
            result: loans,
        });
    }
    catch (error) {
        console.error("Erro ao buscar financiamentos:", error);
        return res.status(500).send({
            success: false,
            message: error.message || "There was an error on the server",
        });
    }
});
exports.companyLoans = companyLoans;
const companyLoansPaginated = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { companyId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;
    const status = req.query.status;
    const search = req.query.search || "";
    const creditManager = req.query.creditManager;
    const offset = (page - 1) * limit;
    try {
        // Condição base: filtrar por empresa
        const whereClause = { companyId };
        // Filtrar por status (0=pendente, 1=activo, -1=rejeitado, 3=terminado)
        if (status !== undefined && status !== "") {
            whereClause.status = parseInt(status);
        }
        // Filtrar por gestor de crédito (para perfil gestor)
        if (creditManager) {
            whereClause.creditManager = parseInt(creditManager);
        }
        // Se houver pesquisa, buscar por accountNumber ou por customers com nome correspondente
        if (search.trim()) {
            // Buscar accountNumbers de customers cujo nome corresponde à pesquisa
            const matchingCustomers = yield CustomerModel_1.CustomerModel.findAll({
                attributes: ["accountNumber"],
                where: {
                    companyId,
                    [sequelize_1.Op.or]: [
                        { customerName: { [sequelize_1.Op.like]: `%${search}%` } },
                        { customerPhone: { [sequelize_1.Op.like]: `%${search}%` } },
                    ],
                },
            });
            const matchingAccountNumbers = matchingCustomers.map((c) => c.getDataValue("accountNumber"));
            // Pesquisar por accountNumber directo OU por accountNumbers encontrados via nome
            const searchConditions = [];
            // Tentar pesquisa por accountNumber numérico
            const numericSearch = parseInt(search);
            if (!isNaN(numericSearch)) {
                searchConditions.push({ accountNumber: numericSearch });
            }
            // Adicionar accountNumbers encontrados via nome do customer
            if (matchingAccountNumbers.length > 0) {
                searchConditions.push({
                    accountNumber: { [sequelize_1.Op.in]: matchingAccountNumbers },
                });
            }
            if (searchConditions.length > 0) {
                whereClause[sequelize_1.Op.or] = searchConditions;
            }
            else {
                // Nenhuma correspondência - retornar vazio
                return res.status(200).json({
                    success: true,
                    result: [],
                    pagination: {
                        currentPage: page,
                        totalPages: 0,
                        totalItems: 0,
                        itemsPerPage: limit,
                        hasNextPage: false,
                        hasPrevPage: false,
                    },
                });
            }
        }
        const { count, rows } = yield LoanModel_1.LoanModel.findAndCountAll({
            where: whereClause,
            order: [["id", "DESC"]],
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
    }
    catch (error) {
        console.error("Erro ao buscar financiamentos paginados:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Erro interno ao buscar financiamentos.",
        });
    }
});
exports.companyLoansPaginated = companyLoansPaginated;
