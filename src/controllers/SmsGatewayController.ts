import { Request, Response } from "express";
import crypto from "crypto";
import { SmsQueueModel } from "../database/models/SmsQueueModel";
import { SmsGatewayInboxModel } from "../database/models/SmsGatewayInboxModel";
import { CustomerModel } from "../database/models/CustomerModel";
import {
  enqueueSms,
  enqueueUpcomingInstallmentAlerts,
  enqueueOutstandingLateInterestAlerts,
  getPendingSmsQueue,
  hydrateSmsQueuePayload,
  listSmsQueueHistory,
} from "../services/SmsGatewayService";

const allowedStatuses = new Set(["queued", "processing", "sent", "failed", "cancelled"]);

const getPendingSmsGateway = async (req: Request, res: Response) => {
  const companyId = req.query.companyId ? Number(req.query.companyId) : undefined;
  const limit = req.query.limit ? Number(req.query.limit) : 50;

  const rows = await getPendingSmsQueue({ companyId, limit });
  const data = rows.map((row: any) => {
    const item = hydrateSmsQueuePayload(row);
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
};

const updateGatewaySmsStatus = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const status = String(req.body.status || "").trim().toLowerCase();
  const hasGatewayMessageId =
    Object.prototype.hasOwnProperty.call(req.body, "gateway_message_id") ||
    Object.prototype.hasOwnProperty.call(req.body, "gatewayMessageId");
  const hasErrorMessage =
    Object.prototype.hasOwnProperty.call(req.body, "error_message") ||
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

  const row: any = await SmsQueueModel.findByPk(id);
  if (!row) {
    return res.status(404).json({ success: false, message: "SMS não encontrado." });
  }

  const patch: any = {
    status,
    lastAttemptAt: new Date(),
  };
  if (gatewayMessageId !== undefined) patch.gatewayMessageId = gatewayMessageId;
  if (errorMessage !== undefined) patch.errorMessage = errorMessage;
  if (status === "sent") {
    patch.sentAt = new Date();
    patch.errorMessage = null;
  }
  if (status === "failed") {
    patch.retries = Number(row.retries || 0) + 1;
  }

  await SmsQueueModel.update(patch, { where: { id } });
  return res.status(200).json({ success: true, message: "Estado actualizado com sucesso." });
};

const enqueueSmsManually = async (req: Request, res: Response) => {
  const {
    companyId,
    accountNumber,
    loanId,
    amortizationLoanId,
    transactionId,
    debtId,
    customerName,
    phone,
    messageType,
    messageBody,
    payloadJson,
  } = req.body;

  if (!companyId || !messageType || !messageBody || !phone) {
    return res.status(400).json({
      success: false,
      message: "Campos obrigatórios: companyId, phone, messageType, messageBody.",
    });
  }

  const result = await enqueueSms({
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
      reason: (result as any).reason || "unknown",
    });
  }

  return res.status(201).json({
    success: true,
    message: "SMS enfileirado com sucesso.",
  });
};

const enqueueSmsAnnouncement = async (req: Request, res: Response) => {
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

  let finalContacts: Array<{ accountNumber?: any; customerName?: any; phone?: any }> = [];

  if (sendToAllCustomers) {
    const customers: any[] = (await CustomerModel.findAll({
      where: { companyId },
      attributes: ["accountNumber", "customerName", "customerPhone"],
    })) as any[];
    finalContacts = customers.map((customer) => ({
      accountNumber: customer.accountNumber,
      customerName: customer.customerName,
      phone: customer.customerPhone,
    }));
  } else {
    finalContacts = contacts;
  }

  const uniqueMap = new Map<string, { accountNumber?: any; customerName?: any; phone?: any }>();
  for (const contact of finalContacts) {
    const phone = String(contact?.phone || "").trim();
    const accountNumber = contact?.accountNumber != null ? String(contact.accountNumber) : "";
    const dedupeKey = `${phone}|${accountNumber}`;
    if (!phone) continue;
    if (!uniqueMap.has(dedupeKey)) {
      uniqueMap.set(dedupeKey, {
        accountNumber: contact?.accountNumber ?? null,
        customerName: contact?.customerName ?? null,
        phone,
      });
    }
  }

  let queued = 0;
  let skipped = 0;

  for (const contact of uniqueMap.values()) {
    const result = await enqueueSms({
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
    if ((result as any).created) queued += 1;
    else skipped += 1;
  }

  return res.status(200).json({
    success: true,
    message: "Anúncio SMS processado.",
    result: {
      queued,
      skipped,
      totalContacts: uniqueMap.size,
    },
  });
};

const enqueueUpcomingAlerts = async (req: Request, res: Response) => {
  const companyId = Number(req.body.companyId || req.query.companyId);
  const daysAhead = Number(req.body.daysAhead || req.query.daysAhead || 3);
  if (!companyId || Number.isNaN(companyId)) {
    return res.status(400).json({ success: false, message: "companyId é obrigatório." });
  }

  const result = await enqueueUpcomingInstallmentAlerts({
    companyId,
    daysAhead,
  });

  return res.status(200).json({
    success: true,
    message: "Alertas de prestações próximas processados.",
    result,
  });
};

const enqueueLateInterestAlerts = async (req: Request, res: Response) => {
  const companyId = Number(req.body.companyId || req.query.companyId);
  const limit = Number(req.body.limit || req.query.limit || 100);
  if (!companyId || Number.isNaN(companyId)) {
    return res.status(400).json({ success: false, message: "companyId é obrigatório." });
  }

  const result = await enqueueOutstandingLateInterestAlerts({
    companyId,
    limit,
  });

  return res.status(200).json({
    success: true,
    message: "Avisos de juros de mora processados.",
    result,
  });
};

const getSmsQueueHistory = async (req: Request, res: Response) => {
  const companyId = req.query.companyId ? Number(req.query.companyId) : undefined;
  const from = req.query.from ? String(req.query.from) : undefined;
  const to = req.query.to ? String(req.query.to) : undefined;
  const status = req.query.status ? String(req.query.status).toLowerCase() : undefined;
  const limit = req.query.limit ? Number(req.query.limit) : 200;

  const rows = await listSmsQueueHistory({
    companyId,
    from,
    to,
    status: status as any,
    limit,
  });

  return res.status(200).json({
    success: true,
    count: rows.length,
    result: rows,
  });
};

const syncSmsInbox = async (req: Request, res: Response) => {
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
    const senderPhone = message?.sender_phone ? String(message.sender_phone) : null;
    const receiverPhone = message?.receiver_phone ? String(message.receiver_phone) : null;
    const messageBody = String(message?.message_body || "").trim();
    const receivedAtRaw = String(message?.received_at || "").trim();
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
    const contentHash = crypto.createHash("sha256").update(hashInput).digest("hex");

    const exists = await SmsGatewayInboxModel.findOne({
      where: { contentHash },
      attributes: ["id"],
    });
    if (exists) {
      duplicated += 1;
      continue;
    }

    await SmsGatewayInboxModel.create({
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
};

export {
  getPendingSmsGateway,
  updateGatewaySmsStatus,
  enqueueSmsManually,
  enqueueSmsAnnouncement,
  enqueueUpcomingAlerts,
  enqueueLateInterestAlerts,
  getSmsQueueHistory,
  syncSmsInbox,
};
