import { DataTypes } from "sequelize";
import { db } from "../db";

/**
 * ONBOARDING — PROGRESSO DO CHECKLIST DO PRIMEIRO DIA
 *
 * Uma linha por (utilizador, tarefa) concluída. O catálogo das tarefas vive no
 * frontend (cada tarefa aponta para passos reais do tour guiado); aqui guarda-se
 * apenas o FACT O auditável: quem concluiu o quê e quando.
 *
 * Consequências de desenho:
 *   - o progresso segue o utilizador entre dispositivos (o localStorage passa a
 *     ser apenas cache/fallback offline);
 *   - o Admin da empresa consegue ver, por colega, o que falta
 *     (GET /api/onboarding/team);
 *   - a chave única (userId, taskId) torna o guardar idempotente — o cliente
 *     envia sempre o conjunto completo de tarefas concluídas.
 */
export const OnboardingProgressModel = db.define(
  "onboarding_progress",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    companyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    taskId: {
      type: DataTypes.STRING(60),
      allowNull: false,
      comment: "Identificador da tarefa do checklist (ex.: abrir-caixa)",
    },
    roleId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "Perfil do utilizador no momento da conclusão (auditoria)",
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "onboarding_progress",
    freezeTableName: true,
  }
);
