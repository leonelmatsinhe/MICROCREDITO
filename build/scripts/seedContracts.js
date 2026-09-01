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
require("../config/env");
const db_1 = require("../database/db");
const ContractTemplateController_1 = require("../controllers/ContractTemplateController");
const CompanyModel_1 = require("../database/models/CompanyModel");
function seed() {
    return __awaiter(this, void 0, void 0, function* () {
        const qi = db_1.db.getQueryInterface();
        console.log("🔍 Verificando se tabela contract_templates existe...");
        try {
            // Criar tabela se não existir
            yield qi.createTable("contract_templates", {
                id: {
                    type: "INT",
                    allowNull: false,
                    autoIncrement: true,
                    primaryKey: true,
                },
                companyId: {
                    type: "INT",
                    allowNull: false,
                },
                name: {
                    type: "VARCHAR(255)",
                    allowNull: false,
                },
                type: {
                    type: "VARCHAR(50)",
                    allowNull: false,
                },
                subject: {
                    type: "VARCHAR(255)",
                    allowNull: true,
                },
                content: {
                    type: "LONGTEXT",
                    allowNull: false,
                },
                variables: {
                    type: "TEXT",
                    allowNull: true,
                },
                isDefault: {
                    type: "INT",
                    allowNull: false,
                    defaultValue: 0,
                },
                status: {
                    type: "INT",
                    allowNull: false,
                    defaultValue: 1,
                },
                createdAt: {
                    type: "DATETIME",
                    allowNull: true,
                },
                updatedAt: {
                    type: "DATETIME",
                    allowNull: true,
                },
            });
            console.log("✅ Tabela contract_templates criada com sucesso!");
        }
        catch (error) {
            if (error.message && error.message.includes("already exists")) {
                console.log("ℹ️  Tabela contract_templates já existe.");
            }
            else {
                console.error("❌ Erro ao criar tabela:", error.message);
            }
        }
        console.log("\n🔍 Buscando empresas...");
        const companies = yield CompanyModel_1.CompanyModel.findAll();
        console.log(`📋 Encontradas ${companies.length} empresas.`);
        for (const company of companies) {
            const companyId = company.get("id");
            const companyName = company.get("companyName");
            console.log(`\n📝 Criando templates para: ${companyName} (ID: ${companyId})`);
            try {
                yield (0, ContractTemplateController_1.createDefaultTemplates)(companyId);
                console.log(`✅ Templates criados para ${companyName}`);
            }
            catch (error) {
                console.error(`❌ Erro ao criar templates para ${companyName}:`, error.message);
            }
        }
        console.log("\n🎉 Seed concluído!");
        process.exit(0);
    });
}
seed().catch((error) => {
    console.error("Erro fatal:", error);
    process.exit(1);
});
