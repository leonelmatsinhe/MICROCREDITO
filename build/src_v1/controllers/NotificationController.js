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
exports.deleteNotification = exports.markAllAsRead = exports.markAsRead = exports.createBulkNotifications = exports.createNotification = exports.getCustomerUnreadCount = exports.getCustomerNotifications = exports.getUnreadCount = exports.getNotifications = void 0;
const NotificationModel_1 = require("../database/models/NotificationModel");
// ── Buscar notificações por destinatário (admin/gestor) ──
const getNotifications = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { companyId } = req.params;
    const { recipientType, recipientId, unreadOnly, limit } = req.query;
    try {
        const where = { companyId };
        if (recipientType) {
            where.recipientType = recipientType;
        }
        if (recipientId) {
            where.recipientId = recipientId;
        }
        if (unreadOnly === "true") {
            where.isRead = false;
        }
        const queryOptions = {
            where,
            order: [["createdAt", "DESC"]],
        };
        if (limit) {
            queryOptions.limit = parseInt(limit, 10);
        }
        const notifications = yield NotificationModel_1.NotificationModel.findAll(queryOptions);
        return res.status(200).json({ success: true, result: notifications });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});
exports.getNotifications = getNotifications;
// ── Contar notificações não lidas ──
const getUnreadCount = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { companyId } = req.params;
    const { recipientType, recipientId } = req.query;
    try {
        const where = { companyId, isRead: false };
        if (recipientType) {
            where.recipientType = recipientType;
        }
        if (recipientId) {
            where.recipientId = recipientId;
        }
        const count = yield NotificationModel_1.NotificationModel.count({ where });
        return res.status(200).json({ success: true, result: count });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});
exports.getUnreadCount = getUnreadCount;
// ── Buscar notificações do cliente ──
const getCustomerNotifications = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { companyId, customerId } = req.params;
    try {
        const notifications = yield NotificationModel_1.NotificationModel.findAll({
            where: {
                companyId,
                recipientType: "customer",
                recipientId: customerId,
            },
            order: [["createdAt", "DESC"]],
        });
        return res.status(200).json({ success: true, result: notifications });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});
exports.getCustomerNotifications = getCustomerNotifications;
// ── Contar notificações não lidas do cliente ──
const getCustomerUnreadCount = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { companyId, customerId } = req.params;
    try {
        const count = yield NotificationModel_1.NotificationModel.count({
            where: {
                companyId,
                recipientType: "customer",
                recipientId: customerId,
                isRead: false,
            },
        });
        return res.status(200).json({ success: true, result: count });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});
exports.getCustomerUnreadCount = getCustomerUnreadCount;
// ── Criar notificação ──
const createNotification = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { companyId, recipientType, recipientId, title, message, type, referenceId } = req.body;
    try {
        const notification = yield NotificationModel_1.NotificationModel.create({
            companyId,
            recipientType,
            recipientId,
            title,
            message,
            type: type || "general",
            referenceId: referenceId || null,
            isRead: false,
        });
        return res.status(201).json({ success: true, result: notification });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});
exports.createNotification = createNotification;
// ── Criar notificações em massa (para vários destinatários) ──
const createBulkNotifications = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { notifications } = req.body;
    try {
        if (!Array.isArray(notifications) || notifications.length === 0) {
            return res.status(400).json({ success: false, message: "Nenhuma notificação fornecida." });
        }
        const created = yield NotificationModel_1.NotificationModel.bulkCreate(notifications.map((n) => ({
            companyId: n.companyId,
            recipientType: n.recipientType,
            recipientId: n.recipientId,
            title: n.title,
            message: n.message,
            type: n.type || "general",
            referenceId: n.referenceId || null,
            isRead: false,
        })));
        return res.status(201).json({ success: true, result: created.length });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});
exports.createBulkNotifications = createBulkNotifications;
// ── Marcar notificação como lida ──
const markAsRead = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        yield NotificationModel_1.NotificationModel.update({ isRead: true }, { where: { id } });
        return res.status(200).json({ success: true, result: "Notificação marcada como lida." });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});
exports.markAsRead = markAsRead;
// ── Marcar todas como lidas ──
const markAllAsRead = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { companyId, customerId } = req.params;
    const { recipientType, recipientId } = req.body;
    try {
        const where = { companyId, isRead: false };
        // Se customerId vem dos params (rota pública do cliente)
        if (customerId) {
            where.recipientType = "customer";
            where.recipientId = customerId;
        }
        else {
            if (recipientType) {
                where.recipientType = recipientType;
            }
            if (recipientId) {
                where.recipientId = recipientId;
            }
        }
        yield NotificationModel_1.NotificationModel.update({ isRead: true }, { where });
        return res.status(200).json({ success: true, result: "Todas as notificações marcadas como lidas." });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});
exports.markAllAsRead = markAllAsRead;
// ── Eliminar notificação ──
const deleteNotification = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        yield NotificationModel_1.NotificationModel.destroy({ where: { id } });
        return res.status(200).json({ success: true, result: "Notificação eliminada." });
    }
    catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});
exports.deleteNotification = deleteNotification;
