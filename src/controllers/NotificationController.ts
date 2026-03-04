import { Request, Response } from "express";
import { Op } from "sequelize";
import { NotificationModel } from "../database/models/NotificationModel";

// ── Buscar notificações por destinatário (admin/gestor) ──
const getNotifications = async (req: Request, res: Response) => {
  const { companyId } = req.params;
  const { recipientType, recipientId, unreadOnly, limit } = req.query;

  try {
    const where: any = { companyId };

    if (recipientType) {
      where.recipientType = recipientType;
    }

    if (recipientId) {
      where.recipientId = recipientId;
    }

    if (unreadOnly === "true") {
      where.isRead = false;
    }

    const queryOptions: any = {
      where,
      order: [["createdAt", "DESC"]],
    };

    if (limit) {
      queryOptions.limit = parseInt(limit as string, 10);
    }

    const notifications = await NotificationModel.findAll(queryOptions);

    return res.status(200).json({ success: true, result: notifications });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── Contar notificações não lidas ──
const getUnreadCount = async (req: Request, res: Response) => {
  const { companyId } = req.params;
  const { recipientType, recipientId } = req.query;

  try {
    const where: any = { companyId, isRead: false };

    if (recipientType) {
      where.recipientType = recipientType;
    }

    if (recipientId) {
      where.recipientId = recipientId;
    }

    const count = await NotificationModel.count({ where });

    return res.status(200).json({ success: true, result: count });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── Buscar notificações do cliente ──
const getCustomerNotifications = async (req: Request, res: Response) => {
  const { companyId, customerId } = req.params;

  try {
    const notifications = await NotificationModel.findAll({
      where: {
        companyId,
        recipientType: "customer",
        recipientId: customerId,
      },
      order: [["createdAt", "DESC"]],
    });

    return res.status(200).json({ success: true, result: notifications });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── Contar notificações não lidas do cliente ──
const getCustomerUnreadCount = async (req: Request, res: Response) => {
  const { companyId, customerId } = req.params;

  try {
    const count = await NotificationModel.count({
      where: {
        companyId,
        recipientType: "customer",
        recipientId: customerId,
        isRead: false,
      },
    });

    return res.status(200).json({ success: true, result: count });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── Criar notificação ──
const createNotification = async (req: Request, res: Response) => {
  const { companyId, recipientType, recipientId, title, message, type, referenceId } = req.body;

  try {
    const notification = await NotificationModel.create({
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
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── Criar notificações em massa (para vários destinatários) ──
const createBulkNotifications = async (req: Request, res: Response) => {
  const { notifications } = req.body;

  try {
    if (!Array.isArray(notifications) || notifications.length === 0) {
      return res.status(400).json({ success: false, message: "Nenhuma notificação fornecida." });
    }

    const created = await NotificationModel.bulkCreate(
      notifications.map((n: any) => ({
        companyId: n.companyId,
        recipientType: n.recipientType,
        recipientId: n.recipientId,
        title: n.title,
        message: n.message,
        type: n.type || "general",
        referenceId: n.referenceId || null,
        isRead: false,
      }))
    );

    return res.status(201).json({ success: true, result: created.length });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── Marcar notificação como lida ──
const markAsRead = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    await NotificationModel.update({ isRead: true }, { where: { id } });
    return res.status(200).json({ success: true, result: "Notificação marcada como lida." });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── Marcar todas como lidas ──
const markAllAsRead = async (req: Request, res: Response) => {
  const { companyId, customerId } = req.params;
  const { recipientType, recipientId } = req.body;

  try {
    const where: any = { companyId, isRead: false };

    // Se customerId vem dos params (rota pública do cliente)
    if (customerId) {
      where.recipientType = "customer";
      where.recipientId = customerId;
    } else {
      if (recipientType) {
        where.recipientType = recipientType;
      }
      if (recipientId) {
        where.recipientId = recipientId;
      }
    }

    await NotificationModel.update({ isRead: true }, { where });
    return res.status(200).json({ success: true, result: "Todas as notificações marcadas como lidas." });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── Eliminar notificação ──
const deleteNotification = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    await NotificationModel.destroy({ where: { id } });
    return res.status(200).json({ success: true, result: "Notificação eliminada." });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export {
  getNotifications,
  getUnreadCount,
  getCustomerNotifications,
  getCustomerUnreadCount,
  createNotification,
  createBulkNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};
