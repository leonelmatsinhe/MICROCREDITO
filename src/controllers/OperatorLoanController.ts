import { Request, Response } from "express";
import { LoanModel } from "../database/models/LoanModel";
import { CustomerModel } from "../database/models/CustomerModel";
import { Op } from "sequelize";

const companyLoans = async (req: Request, res: Response) => {
    const { companyId } = req.params;
    const { from, to, status, creditManager, search } = req.query;

    try {
        const whereClause: any = { companyId };

        if (status !== undefined && status !== "") {
            whereClause.status = parseInt(status as string);
        }

        if (creditManager !== undefined && creditManager !== "") {
            whereClause.creditManager = parseInt(creditManager as string);
        }

        // dateCreated é armazenado como string no formato YYYY-MM-DD.
        // Aplicar filtro no SQL reduz leitura em memória.
        if (from && to) {
            whereClause.dateCreated = {
                [Op.between]: [String(from), String(to)],
            };
        } else if (from) {
            whereClause.dateCreated = {
                [Op.gte]: String(from),
            };
        } else if (to) {
            whereClause.dateCreated = {
                [Op.lte]: String(to),
            };
        }

        if ((search as string || "").trim()) {
            const searchText = (search as string).trim();
            const matchingCustomers = await CustomerModel.findAll({
                attributes: ["accountNumber"],
                where: {
                    companyId,
                    [Op.or]: [
                        { customerName: { [Op.like]: `%${searchText}%` } },
                        { customerPhone: { [Op.like]: `%${searchText}%` } },
                    ],
                },
            });

            const matchingAccountNumbers = matchingCustomers.map(
                (c: any) => c.getDataValue("accountNumber")
            );
            const searchConditions: any[] = [];
            const numericSearch = parseInt(searchText);
            if (!isNaN(numericSearch)) {
                searchConditions.push({ accountNumber: numericSearch });
            }
            if (matchingAccountNumbers.length > 0) {
                searchConditions.push({
                    accountNumber: { [Op.in]: matchingAccountNumbers },
                });
            }
            if (searchConditions.length > 0) {
                whereClause[Op.or] = searchConditions;
            } else {
                return res.status(200).send({
                    success: true,
                    result: [],
                });
            }
        }

        const loans: any[] = await LoanModel.findAll({
            where: whereClause,
            order: [["id", "DESC"]],
        });

        return res.status(200).send({
            success: true,
            result: loans,
        });
    } catch (error: any) {
        console.error("Erro ao buscar financiamentos:", error);
        return res.status(500).send({
            success: false,
            message: error.message || "There was an error on the server",
        });
    }
};

const companyLoansPaginated = async (req: Request, res: Response) => {
    const { companyId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 15;
    const status = req.query.status as string;
    const search = (req.query.search as string) || "";
    const creditManager = req.query.creditManager as string;
    const offset = (page - 1) * limit;

    try {
        // Condição base: filtrar por empresa
        const whereClause: any = { companyId };

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
            const matchingCustomers = await CustomerModel.findAll({
                attributes: ["accountNumber"],
                where: {
                    companyId,
                    [Op.or]: [
                        { customerName: { [Op.like]: `%${search}%` } },
                        { customerPhone: { [Op.like]: `%${search}%` } },
                    ],
                },
            });

            const matchingAccountNumbers = matchingCustomers.map(
                (c: any) => c.getDataValue("accountNumber")
            );

            // Pesquisar por accountNumber directo OU por accountNumbers encontrados via nome
            const searchConditions: any[] = [];

            // Tentar pesquisa por accountNumber numérico
            const numericSearch = parseInt(search);
            if (!isNaN(numericSearch)) {
                searchConditions.push({ accountNumber: numericSearch });
            }

            // Adicionar accountNumbers encontrados via nome do customer
            if (matchingAccountNumbers.length > 0) {
                searchConditions.push({
                    accountNumber: { [Op.in]: matchingAccountNumbers },
                });
            }

            if (searchConditions.length > 0) {
                whereClause[Op.or] = searchConditions;
            } else {
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

        const { count, rows } = await LoanModel.findAndCountAll({
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
    } catch (error: any) {
        console.error("Erro ao buscar financiamentos paginados:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Erro interno ao buscar financiamentos.",
        });
    }
};

export { companyLoans, companyLoansPaginated };
