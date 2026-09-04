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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteQueuedSms = exports.requeueCredentialSms = exports.getPendingCredentialsSms = exports.processSmsQueueHandler = exports.syncSmsInbox = exports.getSmsQueueHistory = exports.enqueueLateInterestAlerts = exports.enqueueUpcomingAlerts = exports.enqueueSmsAnnouncement = exports.enqueueSmsManually = exports.updateGatewaySmsStatus = exports.getSmsQueueSummary = exports.getPendingSmsGateway = void 0;
const crypto_1 = __importDefault(require("crypto"));
const sequelize_1 = require("sequelize");
const SmsQueueModel_1 = require("../database/models/SmsQueueModel");
const SmsGatewayInboxModel_1 = require("../database/models/SmsGatewayInboxModel");
const CustomerModel_1 = require("../database/models/CustomerModel");
const SmsGatewayService_1 = require("../services/SmsGatewayService");
const allowedStatuses = new Set(["queued", "processing", "sent", "failed", "cancelled"]);
const getPendingSmsGateway = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const companyId = req.query.companyId ? Number(req.query.companyId) : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : 50;
    const rows = yield (0, SmsGatewayService_1.getPendingSmsQueue)({ companyId, limit });
    const data = rows.map((row) => {
        const item = (0, SmsGatewayService_1.hydrateSmsQueuePayload)(row);
        return {
            id: String(item.id),
            tenant_id: String(item.companyId),
            customer_id: item.accountNumber ? String(item.accountNumber) : null,
            invoice_id: item.amortizationLoanId ? String(item.amortizationLoanId) : null,
            payment_id: item.transactionId ? String(item.transactionId) : null,
            message_type: item.messageType,
            status: item.status,
            customer_name: item.customerName,
            phone: item.phone,
            message_body: item.messageBody,
            payload_json: item.payloadJson,
            gateway_message_id: item.gatewayMessageId,
            error_message: item.errorMessage,
            sent_at: item.sentAt,
            created_at: item.createdAt,
            updated_at: item.updatedAt,
        };
    });
    return res.status(200).json({
        count: data.length,
        data,
    });
});
exports.getPendingSmsGateway = getPendingSmsGateway;
const updateGatewaySmsStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const id = Number(req.params.id);
    const status = String(req.body.status || "").trim().toLowerCase();
    const hasGatewayMessageId = Object.prototype.hasOwnProperty.call(req.body, "gateway_message_id") ||
        Object.prototype.hasOwnProperty.call(req.body, "gatewayMessageId");
    const hasErrorMessage = Object.prototype.hasOwnProperty.call(req.body, "error_message") ||
        Object.prototype.hasOwnProperty.call(req.body, "errorMessage");
    const gatewayMessageId = hasGatewayMessageId
        ? req.body.gateway_message_id || req.body.gatewayMessageId || null
        : undefined;
    const errorMessage = hasErrorMessage
        ? req.body.error_message || req.body.errorMessage || null
        : undefined;
    if (!id || Number.isNaN(id)) {
        return res.status(400).json({ success: false, message: "Parâmetro id inválido." });
    }
    if (!allowedStatuses.has(status)) {
        return res.status(400).json({ success: false, message: "Status inválido." });
    }
    const row = yield SmsQueueModel_1.SmsQueueModel.findByPk(id);
    if (!row) {
        return res.status(404).json({ success: false, message: "SMS não encontrado." });
    }
    const patch = {
        status,
        lastAttemptAt: new Date(),
    };
    if (gatewayMessageId !== undefined)
        patch.gatewayMessageId = gatewayMessageId;
    if (errorMessage !== undefined)
        patch.errorMessage = errorMessage;
    if (status === "sent") {
        patch.sentAt = new Date();
        patch.errorMessage = null;
    }
    if (status === "failed") {
        patch.retries = Number(row.retries || 0) + 1;
    }
    yield SmsQueueModel_1.SmsQueueModel.update(patch, { where: { id } });
    return res.status(200).json({ success: true, message: "Estado actualizado com sucesso." });
});
exports.updateGatewaySmsStatus = updateGatewaySmsStatus;
const enqueueSmsManually = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { companyId, accountNumber, loanId, amortizationLoanId, transactionId, debtId, customerName, phone, messageType, messageBody, payloadJson, } = req.body;
    if (!companyId || !messageType || !messageBody || !phone) {
        return res.status(400).json({
            success: false,
            message: "Campos obrigatórios: companyId, phone, messageType, messageBody.",
        });
    }
    // Empresa com SMS desactivado: nenhuma operação de SMS ocorre
    if (!(yield (0, SmsGatewayService_1.isCompanySmsEnabled)(Number(companyId)))) {
        return res.status(403).json({
            success: false,
            message: "O envio de SMS está desactivado nas configurações da empresa. Contacte o Administrador.",
        });
    }
    const result = yield (0, SmsGatewayService_1.enqueueSms)({
        companyId: Number(companyId),
        accountNumber,
        loanId: loanId ? Number(loanId) : null,
        amortizationLoanId: amortizationLoanId ? Number(amortizationLoanId) : null,
        transactionId: transactionId ? Number(transactionId) : null,
        debtId: debtId ? Number(debtId) : null,
        customerName,
        phone,
        messageType: String(messageType),
        messageBody: String(messageBody),
        payloadJson: payloadJson || null,
    });
    if (!result.created) {
        return res.status(422).json({
            success: false,
            message: "Não foi possível enfileirar o SMS.",
            reason: result.reason || "unknown",
        });
    }
    // Enviar imediatamente via Tsemba (sem bloquear a resposta)
    (0, SmsGatewayService_1.flushSmsQueue)();
    return res.status(201).json({
        success: true,
        message: "SMS enfileirado com sucesso.",
    });
});
exports.enqueueSmsManually = enqueueSmsManually;
const enqueueSmsAnnouncement = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const companyId = Number(req.body.companyId);
    const messageBody = String(req.body.messageBody || "").trim();
    const sendToAllCustomers = !!req.body.sendToAllCustomers;
    const contacts = Array.isArray(req.body.contacts) ? req.body.contacts : [];
    if (!companyId || Number.isNaN(companyId)) {
        return res.status(400).json({
            success: false,
            message: "companyId é obrigatório.",
        });
    }
    if (!messageBody) {
        return res.status(400).json({
            success: false,
            message: "messageBody é obrigatório.",
        });
    }
    // Empresa com SMS desactivado: nenhuma operação de SMS ocorre
    if (!(yield (0, SmsGatewayService_1.isCompanySmsEnabled)(companyId))) {
        return res.status(403).json({
            success: false,
            message: "O envio de SMS está desactivado nas configurações da empresa. Contacte o Administrador.",
        });
    }
    let finalContacts = [];
    if (sendToAllCustomers) {
        const customers = (yield CustomerModel_1.CustomerModel.findAll({
            where: { companyId },
            attributes: ["accountNumber", "customerName", "customerPhone"],
        }));
        finalContacts = customers.map((customer) => ({
            accountNumber: customer.accountNumber,
            customerName: customer.customerName,
            phone: customer.customerPhone,
        }));
    }
    else {
        finalContacts = contacts;
    }
    const uniqueMap = new Map();
    for (const contact of finalContacts) {
        const phone = String((contact === null || contact === void 0 ? void 0 : contact.phone) || "").trim();
        const accountNumber = (contact === null || contact === void 0 ? void 0 : contact.accountNumber) != null ? String(contact.accountNumber) : "";
        const dedupeKey = `${phone}|${accountNumber}`;
        if (!phone)
            continue;
        if (!uniqueMap.has(dedupeKey)) {
            uniqueMap.set(dedupeKey, {
                accountNumber: (_a = contact === null || contact === void 0 ? void 0 : contact.accountNumber) !== null && _a !== void 0 ? _a : null,
                customerName: (_b = contact === null || contact === void 0 ? void 0 : contact.customerName) !== null && _b !== void 0 ? _b : null,
                phone,
            });
        }
    }
    let queued = 0;
    let skipped = 0;
    for (const contact of uniqueMap.values()) {
        const result = yield (0, SmsGatewayService_1.enqueueSms)({
            companyId,
            accountNumber: contact.accountNumber,
            customerName: contact.customerName,
            phone: contact.phone,
            messageType: "admin_announcement",
            messageBody,
            payloadJson: {
                source: "admin_panel",
                scope: sendToAllCustomers ? "all_customers" : "selected_contacts",
            },
        });
        if (result.created)
            queued += 1;
        else
            skipped += 1;
    }
    // Enviar o lote imediatamente via Tsemba (sem bloquear a resposta)
    (0, SmsGatewayService_1.flushSmsQueue)(200);
    return res.status(200).json({
        success: true,
        message: "Anúncio SMS processado.",
        result: {
            queued,
            skipped,
            totalContacts: uniqueMap.size,
        },
    });
});
exports.enqueueSmsAnnouncement = enqueueSmsAnnouncement;
const enqueueUpcomingAlerts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const companyId = Number(req.body.companyId || req.query.companyId);
    const daysAhead = Number(req.body.daysAhead || req.query.daysAhead || 3);
    if (!companyId || Number.isNaN(companyId)) {
        return res.status(400).json({ success: false, message: "companyId é obrigatório." });
    }
    // Empresa com SMS desactivado: nenhuma operação de SMS ocorre
    if (!(yield (0, SmsGatewayService_1.isCompanySmsEnabled)(companyId))) {
        return res.status(403).json({
            success: false,
            message: "O envio de SMS está desactivado nas configurações da empresa. Contacte o Administrador.",
        });
    }
    const result = yield (0, SmsGatewayService_1.enqueueUpcomingInstallmentAlerts)({
        companyId,
        daysAhead,
    });
    return res.status(200).json({
        success: true,
        message: "Alertas de prestações próximas processados.",
        result,
    });
});
exports.enqueueUpcomingAlerts = enqueueUpcomingAlerts;
const enqueueLateInterestAlerts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const companyId = Number(req.body.companyId || req.query.companyId);
    const limit = Number(req.body.limit || req.query.limit || 100);
    if (!companyId || Number.isNaN(companyId)) {
        return res.status(400).json({ success: false, message: "companyId é obrigatório." });
    }
    // Empresa com SMS desactivado: nenhuma operação de SMS ocorre
    if (!(yield (0, SmsGatewayService_1.isCompanySmsEnabled)(companyId))) {
        return res.status(403).json({
            success: false,
            message: "O envio de SMS está desactivado nas configurações da empresa. Contacte o Administrador.",
        });
    }
    const result = yield (0, SmsGatewayService_1.enqueueOutstandingLateInterestAlerts)({
        companyId,
        limit,
    });
    return res.status(200).json({
        success: true,
        message: "Avisos de juros de mora processados.",
        result,
    });
});
exports.enqueueLateInterestAlerts = enqueueLateInterestAlerts;
const processSmsQueueHandler = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _c;
    const limit = ((_c = req.body) === null || _c === void 0 ? void 0 : _c.limit) ? Number(req.body.limit) : 100;
    const results = yield (0, SmsGatewayService_1.processSmsQueue)({ limit });
    if (!results.configured) {
        return res.status(503).json({
            success: false,
            message: "TSEMBA_API_KEY não configurada no .env — a fila foi mantida intacta.",
            result: results,
        });
    }
    return res.status(200).json({
        success: true,
        message: `Fila processada: ${results.sent} enviados, ${results.failed} com erro, ${results.deferred} adiados${results.recovered ? `, ${results.recovered} recuperados` : ""}.`,
        result: results,
    });
});
exports.processSmsQueueHandler = processSmsQueueHandler;
const getSmsQueueHistory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const companyId = req.query.companyId ? Number(req.query.companyId) : undefined;
    const from = req.query.from ? String(req.query.from) : undefined;
    const to = req.query.to ? String(req.query.to) : undefined;
    const status = req.query.status ? String(req.query.status).toLowerCase() : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : 200;
    const rows = yield (0, SmsGatewayService_1.listSmsQueueHistory)({
        companyId,
        from,
        to,
        status: status,
        limit,
    });
    return res.status(200).json({
        success: true,
        count: rows.length,
        result: rows,
    });
});
exports.getSmsQueueHistory = getSmsQueueHistory;
const syncSmsInbox = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const deviceId = String(req.body.device_id || req.body.deviceId || "").trim();
    const messages = Array.isArray(req.body.messages) ? req.body.messages : [];
    if (!deviceId) {
        return res.status(400).json({
            success: false,
            message: "device_id é obrigatório.",
        });
    }
    let inserted = 0;
    let duplicated = 0;
    for (const message of messages) {
        const senderPhone = (message === null || message === void 0 ? void 0 : message.sender_phone) ? String(message.sender_phone) : null;
        const receiverPhone = (message === null || message === void 0 ? void 0 : message.receiver_phone) ? String(message.receiver_phone) : null;
        const messageBody = String((message === null || message === void 0 ? void 0 : message.message_body) || "").trim();
        const receivedAtRaw = String((message === null || message === void 0 ? void 0 : message.received_at) || "").trim();
        if (!messageBody || !receivedAtRaw) {
            duplicated += 1;
            continue;
        }
        const receivedDate = new Date(receivedAtRaw);
        if (Number.isNaN(receivedDate.getTime())) {
            duplicated += 1;
            continue;
        }
        const hashInput = `${deviceId}|${senderPhone || ""}|${receiverPhone || ""}|${messageBody}|${receivedAtRaw}`;
        const contentHash = crypto_1.default.createHash("sha256").update(hashInput).digest("hex");
        const exists = yield SmsGatewayInboxModel_1.SmsGatewayInboxModel.findOne({
            where: { contentHash },
            attributes: ["id"],
        });
        if (exists) {
            duplicated += 1;
            continue;
        }
        yield SmsGatewayInboxModel_1.SmsGatewayInboxModel.create({
            deviceId,
            senderPhone,
            receiverPhone,
            messageBody,
            receivedAt: receivedDate,
            contentHash,
        });
        inserted += 1;
    }
    return res.status(200).json({
        received_count: messages.length,
        inserted_count: inserted,
        duplicated_count: duplicated,
    });
});
exports.syncSmsInbox = syncSmsInbox;
// Resumo da fila de SMS para indicadores no painel (Admin/Gestor).
const getSmsQueueSummary = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const companyId = req.query.companyId ? Number(req.query.companyId) : undefined;
        const companyWhere = {};
        if (companyId)
            companyWhere.companyId = companyId;
        const countByStatus = (status) => __awaiter(void 0, void 0, void 0, function* () { return SmsQueueModel_1.SmsQueueModel.count({ where: Object.assign(Object.assign({}, companyWhere), { status }) }); });
        const [queued, processing, failed, sent] = yield Promise.all([
            countByStatus("queued"),
            countByStatus("processing"),
            countByStatus("failed"),
            countByStatus("sent"),
        ]);
        // Pendentes por tipo de mensagem (os mais relevantes para o painel)
        const pendingRows = yield SmsQueueModel_1.SmsQueueModel.findAll({
            where: Object.assign(Object.assign({}, companyWhere), { status: { [sequelize_1.Op.in]: ["queued", "processing", "failed"] } }),
            attributes: ["messageType", "status"],
            raw: true,
        });
        const pendingByType = {};
        for (const row of pendingRows) {
            const key = row.messageType || "outro";
            pendingByType[key] = (pendingByType[key] || 0) + 1;
        }
        const smsEnabled = companyId ? yield (0, SmsGatewayService_1.isCompanySmsEnabled)(companyId) : true;
        return res.status(200).json({
            success: true,
            result: {
                smsEnabled,
                queued,
                processing,
                failed,
                sent,
                pending: queued + processing + failed,
                pendingByType,
            },
        });
    }
    catch (err) {
        console.error("getSmsQueueSummary:", (err === null || err === void 0 ? void 0 : err.message) || err);
        return res.status(500).json({ success: false, message: "Erro ao obter resumo da fila SMS." });
    }
});
exports.getSmsQueueSummary = getSmsQueueSummary;
// Todas as mensagens (todos os tipos e estados: na fila, a enviar, falhadas e
// enviadas) — com dados do mutuário. Toda a mensagem enfileirada é persistida
// em sms_queue e mantida na BD após o envio (status "sent" + sentAt), para o
// Centro de Mensagens mostrar o histórico completo e permitir reenviar,
// eliminar ou consultar qualquer mensagem.
const getPendingCredentialsSms = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const companyId = req.query.companyId ? Number(req.query.companyId) : undefined;
        const whereClause = {
            status: { [sequelize_1.Op.in]: ["queued", "processing", "failed", "sent"] },
        };
        if (companyId)
            whereClause.companyId = companyId;
        const rows = yield SmsQueueModel_1.SmsQueueModel.findAll({
            where: whereClause,
            order: [["createdAt", "DESC"]],
        });
        const result = [];
        for (const row of rows) {
            const plain = (0, SmsGatewayService_1.hydrateSmsQueuePayload)(row);
            let customer = null;
            if (plain.accountNumber && plain.companyId) {
                customer = yield CustomerModel_1.CustomerModel.findOne({
                    where: { companyId: plain.companyId, accountNumber: plain.accountNumber },
                    attributes: [
                        "id",
                        "customerName",
                        "customerPhone",
                        "accountNumber",
                        "credentialsSent",
                        "credentialsSentAt",
                        "customerStatus",
                    ],
                });
            }
            result.push(Object.assign(Object.assign({}, plain), { customer: customer ? customer.toJSON() : null }));
        }
        return res.status(200).json({ success: true, result });
    }
    catch (err) {
        console.error("getPendingCredentialsSms:", (err === null || err === void 0 ? void 0 : err.message) || err);
        return res.status(500).json({ success: false, message: "Erro ao listar credenciais pendentes." });
    }
});
exports.getPendingCredentialsSms = getPendingCredentialsSms;
// Elimina uma mensagem da fila (qualquer tipo/estado).
const deleteQueuedSms = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = Number(req.params.id);
        if (!id) {
            return res.status(400).json({ success: false, message: "ID inválido." });
        }
        const row = yield SmsQueueModel_1.SmsQueueModel.findByPk(id);
        if (!row) {
            return res.status(404).json({ success: false, message: "Mensagem não encontrada." });
        }
        yield row.destroy();
        return res.status(200).json({ success: true, message: "Mensagem eliminada da fila." });
    }
    catch (err) {
        console.error("deleteQueuedSms:", (err === null || err === void 0 ? void 0 : err.message) || err);
        return res.status(500).json({ success: false, message: "Erro ao eliminar a mensagem." });
    }
});
exports.deleteQueuedSms = deleteQueuedSms;
// Repõe na fila (queued) uma mensagem de credenciais pendente/falhada.
const requeueCredentialSms = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _d;
    try {
        const id = Number(req.params.id);
        if (!id) {
            return res.status(400).json({ success: false, message: "ID inválido." });
        }
        const row = yield SmsQueueModel_1.SmsQueueModel.findByPk(id);
        if (!row) {
            return res.status(404).json({ success: false, message: "Mensagem não encontrada." });
        }
        const companyId = Number((_d = row.getDataValue) === null || _d === void 0 ? void 0 : _d.call(row, "companyId"));
        if (!(yield (0, SmsGatewayService_1.isCompanySmsEnabled)(companyId))) {
            return res.status(403).json({
                success: false,
                message: "O envio de SMS está desactivado nas configurações da empresa.",
            });
        }
        yield row.update({ status: "queued", retries: 0, errorMessage: null, lastAttemptAt: null });
        return res.status(200).json({ success: true, message: "SMS de credenciais reposto na fila." });
    }
    catch (err) {
        console.error("requeueCredentialSms:", (err === null || err === void 0 ? void 0 : err.message) || err);
        return res.status(500).json({ success: false, message: "Erro ao repor SMS na fila." });
    }
});
exports.requeueCredentialSms = requeueCredentialSms;
