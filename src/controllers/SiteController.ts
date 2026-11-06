import { Request, Response } from "express";
import {
  SiteConfigModel,
  SiteProductModel,
  SiteTestimonialModel,
  SiteFaqModel,
  SiteLeadModel,
} from "../database/models/SiteModels";
import { NotificationModel } from "../database/models/NotificationModel";
import { UserModel } from "../database/models/UserModel";

// Fallback defaults in case DB is not yet populated
const DEFAULT_CONFIG = {
  companyName: "Clack Microcrédito, EI",
  tagline: "Crédito ágil, transparente e seguro em Moçambique",
  heroTitle: "Crédito Rápido, Justo e Sem Burocracia em Moçambique",
  heroSubtitle:
    "Impulsione o seu negócio ou resolva imprevistos familiares com aprovação em até 24 horas. Desembolso imediato na sua conta bancária ou via M-Pesa com as melhores taxas do mercado.",
  heroBadge: "Instituição de Microcrédito Autorizada",
  heroPrimaryCtaText: "Simular Crédito",
  heroPrimaryCtaLink: "#simulador",
  heroSecondaryCtaText: "Falar no WhatsApp",
  heroSecondaryCtaLink:
    "https://wa.me/258848353816?text=Ol%C3%A1!%20Gostaria%20de%20informa%C3%A7%C3%B5es%20sobre%20cr%C3%A9ditos%20na%20Clack%20Microcr%C3%A9dito.",
  heroImageUrl: "",
  statClients: "+2.500",
  statClientsLabel: "Clientes Satisfeitos",
  statDisbursed: "+45M MZN",
  statDisbursedLabel: "Crédito Concedido",
  statApproval: "24 Horas",
  statApprovalLabel: "Aprovação Rápida",
  statSatisfaction: "98%",
  statSatisfactionLabel: "Taxa de Satisfação",
  phone: "+258 84 835 3816",
  phoneSecondary: "+258 87 074 0202",
  whatsapp: "258848353816",
  email: "contacto@clackmicrocredito.com",
  address: "Av. 25 de Setembro, Prédio Maryah, Maputo, Moçambique",
  workingHours: "Segunda a Sexta: 08:00 - 17:00 | Sábado: 08:00 - 12:30",
  mapUrl: "",
  facebookUrl: "https://facebook.com/clackmicrocredito",
  instagramUrl: "https://instagram.com/clackmicrocredito",
  linkedinUrl: "",
  aboutHistory:
    "A Clack Microcrédito, EI é uma instituição moçambicana dedicada a fornecer soluções de crédito céleres, transparentes e acessíveis para micro, pequenas empresas e particulares em Moçambique.",
  aboutMission:
    "Democratizar o acesso a financiamento confiável e apoiar o desenvolvimento económico sustentável dos nossos clientes.",
  aboutVision:
    "Ser a instituição de microfinanças de referência em Moçambique pela confiança, agilidade tecnológica e compromisso ético.",
  aboutValues:
    "Transparência inegociável, Rigor financeiro, Rapidez de resposta e Respeito ao cliente.",
  defaultInterestRate: 15.0,
  minAmount: 1000.0,
  maxAmount: 300000.0,
  minTerm: 1,
  maxTerm: 12,
  sectionsEnabled: JSON.stringify({
    hero: true,
    stats: true,
    about: true,
    products: true,
    simulator: true,
    steps: true,
    requirements: true,
    testimonials: true,
    faq: true,
    contact: true,
  }),
  metaTitle: "Clack Microcrédito, EI | Crédito Rápido e Seguro em Moçambique",
  metaDescription:
    "Soluções de microcrédito pessoal, comercial e empresarial com aprovação em 24h e desembolso via M-Pesa ou banco em Maputo e Moçambique.",
  metaKeywords:
    "microcredito moçambique, emprestimo rapido maputo, credito mpesa, financiamento pme",
};

const DEFAULT_PRODUCTS = [
  {
    slug: "credito-negocio",
    title: "Crédito Negócio & PME",
    badge: "Mais Procurado",
    summary:
      "Capital de giro para reforço de estoque, mercadorias, insumos ou expansão do comércio.",
    description:
      "Ideal para comerciantes formais e informais, mukheristas, lojas e pequenos empreendedores com necessidade imediata de rotação de estoque.",
    minAmount: 5000,
    maxAmount: 300000,
    minTerm: 1,
    maxTerm: 6,
    termType: "MESES",
    interestRate: 15.0,
    requirements:
      "BI ou DIRE válido\nComprovativo de atividade comercial (Alvará, Licença ou fotos da banca/loja)\nExtrato bancário ou extrato M-Pesa dos últimos 3 meses",
    benefits:
      "Aprovação célere em até 24h\nSem hipotecas de imóveis\nDesembolso direto por M-Pesa ou Conta Bancária\nPossibilidade de renovação com base no histórico",
    icon: "storefront",
    featured: true,
    isActive: true,
    sortOrder: 1,
  },
  {
    slug: "credito-pessoal",
    title: "Crédito Pessoal & Família",
    badge: "Rápido & Prático",
    summary:
      "Financiamento direto para despesas familiares, propinas escolares, pequenas reformas ou emergências.",
    description:
      "Acesso imediato a fundos para quem tem rendimento mensal regular ou atividade produtiva comprovada.",
    minAmount: 2000,
    maxAmount: 100000,
    minTerm: 1,
    maxTerm: 4,
    termType: "MESES",
    interestRate: 15.0,
    requirements:
      "BI ou DIRE válido\nNUIT pessoal\nComprovativo de residência atualizado\nContacto telefónico ativo",
    benefits:
      "Decisão rápida sem burocracia\nPlanos de reembolso adaptados ao seu orçamento\nAtendimento personalizado via balcão ou WhatsApp",
    icon: "account_balance_wallet",
    featured: true,
    isActive: true,
    sortOrder: 2,
  },
  {
    slug: "credito-funcionario",
    title: "Crédito Funcionário / Salário",
    badge: "Taxa Preferencial",
    summary:
      "Crédito com taxas reduzidas para funcionários públicos e do setor privado.",
    description:
      "Destinado a trabalhadores assalariados com prazos confortáveis e reembolso alinhado à data do vencimento salarial.",
    minAmount: 3000,
    maxAmount: 150000,
    minTerm: 1,
    maxTerm: 6,
    termType: "MESES",
    interestRate: 12.0,
    requirements:
      "BI e NUIT\nDeclaração de serviço / Vínculo laboral recente\nÚltimos 3 recibos de vencimento\nExtrato bancário dos últimos 3 meses",
    benefits:
      "Taxa reduzida a partir de 12% a.m.\nPrazos flexíveis até 6 meses\nRenovação facilitada\nProcesso 100% digital",
    icon: "badge",
    featured: true,
    isActive: true,
    sortOrder: 3,
  },
  {
    slug: "credito-emergencia",
    title: "Crédito Emergência 24H",
    badge: "Aprovação Flash",
    summary:
      "Solução expressa para imprevistos urgentes de saúde, reparações críticas ou emergências.",
    description:
      "Linha de crédito acelerada com verificação documental prioritária e desembolso imediato.",
    minAmount: 1000,
    maxAmount: 50000,
    minTerm: 1,
    maxTerm: 2,
    termType: "MESES",
    interestRate: 18.0,
    requirements:
      "BI válido\nComprovativo simples de rendimento\nNúmero de telemóvel ativo (Vodacom / M-Pesa)",
    benefits:
      "Análise em até 4 horas\nDesembolso instantâneo na carteira M-Pesa\nDisponível 7 dias por semana",
    icon: "bolt",
    featured: false,
    isActive: true,
    sortOrder: 4,
  },
];

const DEFAULT_TESTIMONIALS = [
  {
    clientName: "Amélia Cossa",
    clientRole: "Proprietária de Mercearia",
    clientLocation: "Maputo",
    avatarUrl: "",
    rating: 5,
    comment:
      "O crédito da Clack salvou o meu negócio no final do ano. Consegui comprar mercadoria em quantidade e dobrar as vendas. O valor entrou no M-Pesa em poucas horas!",
    productType: "Crédito Negócio",
    isActive: true,
    sortOrder: 1,
  },
  {
    clientName: "Carlos Mondlane",
    clientRole: "Funcionário do Estado",
    clientLocation: "Matola",
    avatarUrl: "",
    rating: 5,
    comment:
      "A clareza no cálculo das prestações foi o que mais me impressionou. Nada de taxas surpresa. Muito profissionais e o processo pelo WhatsApp foi super rápido.",
    productType: "Crédito Funcionário",
    isActive: true,
    sortOrder: 2,
  },
  {
    clientName: "Helena Macuácua",
    clientRole: "Comerciante Informal",
    clientLocation: "Zimpeto",
    avatarUrl: "",
    rating: 5,
    comment:
      "Já renovei 3 vezes com a Clack Microcrédito. É muito bom ter uma instituição que realmente apoia quem trabalha por conta própria em Moçambique.",
    productType: "Crédito Negócio",
    isActive: true,
    sortOrder: 3,
  },
];

const DEFAULT_FAQS = [
  {
    category: "Geral",
    question: "Quem pode solicitar crédito na Clack Microcrédito?",
    answer:
      "Qualquer cidadão moçambicano ou residente legal a partir de 21 anos, com documento válido (BI ou DIRE) e que possua uma atividade geradora de rendimento (comércio, negócio próprio, prestação de serviços ou emprego formal/informal).",
    isActive: true,
    sortOrder: 1,
  },
  {
    category: "Prazos",
    question: "Quanto tempo demora a aprovação e o desembolso?",
    answer:
      "Após o envio de todos os documentos solicitados, a nossa equipa analisa a proposta no mesmo dia. A aprovação ocorre em até 24 horas úteis e o desembolso é feito de imediato na sua conta bancária ou via M-Pesa.",
    isActive: true,
    sortOrder: 2,
  },
  {
    category: "Pagamentos",
    question: "Como faço para pagar as prestações mensais?",
    answer:
      "Os reembolsos podem ser feitos de forma cómoda por M-Pesa, e-Mola ou transferência bancária (BCI, Millennium BIM, Standard Bank, Moza Banco). Enviamos lembretes antes da data de vencimento.",
    isActive: true,
    sortOrder: 3,
  },
  {
    category: "Taxas",
    question: "Qual é a taxa de juro aplicada?",
    answer:
      "As taxas são competitivas e variam entre 12% e 18% ao mês dependendo da modalidade, prazo e perfil de risco. Não cobramos taxas ocultas nem comissões imprevistas.",
    isActive: true,
    sortOrder: 4,
  },
  {
    category: "Garantias",
    question: "É necessária alguma garantia para pedir empréstimo?",
    answer:
      "Para a grande maioria dos valores de microcrédito não exigimos bens imóveis nem hipotecas. Podemos aceitar garantias móveis (equipamentos, veículos), avalistas idóneos ou histórico comprovado de movimentação financeira.",
    isActive: true,
    sortOrder: 5,
  },
  {
    category: "Canais",
    question: "Posso fazer o pedido totalmente à distância?",
    answer:
      "Sim! Pode simular diretamente aqui no site e submeter a sua proposta ou enviar a documentação via WhatsApp para o nosso número oficial (+258 84 835 3816).",
    isActive: true,
    sortOrder: 6,
  },
];

/**
 * ─────────────────────────────────────────────────────────────
 * ROTAS PÚBLICAS DO WEBSITE
 * ─────────────────────────────────────────────────────────────
 */

export const getPublicSiteContent = async (req: Request, res: Response) => {
  try {
    let config = await SiteConfigModel.findOne({ where: { companyId: 1 } });
    let products = await SiteProductModel.findAll({
      where: { companyId: 1, isActive: true },
      order: [["sortOrder", "ASC"]],
    });
    let testimonials = await SiteTestimonialModel.findAll({
      where: { companyId: 1, isActive: true },
      order: [["sortOrder", "ASC"]],
    });
    let faqs = await SiteFaqModel.findAll({
      where: { companyId: 1, isActive: true },
      order: [["sortOrder", "ASC"]],
    });

    const parsedConfig = config ? config.toJSON() : DEFAULT_CONFIG;
    if (typeof parsedConfig.sectionsEnabled === "string") {
      try {
        parsedConfig.sections = JSON.parse(parsedConfig.sectionsEnabled);
      } catch {
        parsedConfig.sections = {};
      }
    }

    return res.status(200).json({
      success: true,
      config: parsedConfig,
      products: products && products.length > 0 ? products : DEFAULT_PRODUCTS,
      testimonials:
        testimonials && testimonials.length > 0
          ? testimonials
          : DEFAULT_TESTIMONIALS,
      faqs: faqs && faqs.length > 0 ? faqs : DEFAULT_FAQS,
    });
  } catch (err: any) {
    console.error("[SiteController] getPublicSiteContent erro:", err);
    return res.status(200).json({
      success: true,
      config: DEFAULT_CONFIG,
      products: DEFAULT_PRODUCTS,
      testimonials: DEFAULT_TESTIMONIALS,
      faqs: DEFAULT_FAQS,
    });
  }
};

export const submitPublicLead = async (req: Request, res: Response) => {
  try {
    const {
      name,
      phone,
      email,
      city,
      amount,
      term,
      productSlug,
      message,
      source,
    } = req.body;

    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        message: "Por favor informe o seu nome e número de telefone.",
      });
    }

    const lead = await SiteLeadModel.create({
      companyId: 1,
      name,
      phone,
      email: email || null,
      city: city || "Maputo",
      amount: amount ? Number(amount) : null,
      term: term ? Number(term) : null,
      productSlug: productSlug || "geral",
      message: message || "Pedido de simulação/contacto enviado pelo website.",
      source: source || "WEBSITE",
      status: "NOVO",
    });

    // Enviar notificação interna no sistema para Administradores
    try {
      const admins = await UserModel.findAll({
        where: { companyId: 1, userRole: 1 },
      });
      if (admins && admins.length > 0) {
        const notifPayload = admins.map((adm: any) => ({
          companyId: 1,
          recipientType: "admin",
          recipientId: adm.id,
          userId: adm.id,
          title: "Novo Pedido de Crédito / Lead do Website",
          message: `${name} (${phone}) solicitou ${amount ? Number(amount).toLocaleString('pt-MZ') + ' MZN' : 'informações'} via Website.`,
          type: "loan_request",
          referenceId: lead.id,
          isRead: false,
        }));
        await NotificationModel.bulkCreate(notifPayload);
      }
    } catch (notifErr) {
      console.warn("[SiteController] Erro ao criar notificação de lead:", notifErr);
    }

    return res.status(201).json({
      success: true,
      message:
        "O seu pedido foi recebido com sucesso! A nossa equipa entrará em contacto muito em breve.",
      leadId: lead.id,
    });
  } catch (err: any) {
    console.error("[SiteController] submitPublicLead erro:", err);
    return res.status(500).json({
      success: false,
      message: "Erro ao registar o seu pedido. Por favor tente novamente ou contacte via WhatsApp.",
      error: err?.message || err,
    });
  }
};

/**
 * ─────────────────────────────────────────────────────────────
 * ROTAS ADMINISTRATIVAS DO WEBSITE
 * ─────────────────────────────────────────────────────────────
 */

export const getAdminSiteContent = async (req: Request, res: Response) => {
  try {
    let config = await SiteConfigModel.findOne({ where: { companyId: 1 } });
    if (!config) {
      config = await SiteConfigModel.create({ ...DEFAULT_CONFIG, companyId: 1 });
    }

    const products = await SiteProductModel.findAll({
      where: { companyId: 1 },
      order: [["sortOrder", "ASC"], ["id", "ASC"]],
    });

    const testimonials = await SiteTestimonialModel.findAll({
      where: { companyId: 1 },
      order: [["sortOrder", "ASC"], ["id", "ASC"]],
    });

    const faqs = await SiteFaqModel.findAll({
      where: { companyId: 1 },
      order: [["sortOrder", "ASC"], ["id", "ASC"]],
    });

    const leadsCount = await SiteLeadModel.count({ where: { companyId: 1 } });
    const newLeadsCount = await SiteLeadModel.count({
      where: { companyId: 1, status: "NOVO" },
    });

    return res.status(200).json({
      success: true,
      config,
      products,
      testimonials,
      faqs,
      stats: {
        totalLeads: leadsCount,
        newLeads: newLeadsCount,
      },
    });
  } catch (err: any) {
    console.error("[SiteController] getAdminSiteContent erro:", err);
    return res.status(500).json({
      success: false,
      message: "Erro ao carregar configurações do website.",
      error: err?.message || err,
    });
  }
};

export const updateAdminSiteConfig = async (req: Request, res: Response) => {
  try {
    let config = await SiteConfigModel.findOne({ where: { companyId: 1 } });
    if (!config) {
      config = await SiteConfigModel.create({ ...req.body, companyId: 1 });
    } else {
      await config.update(req.body);
    }

    return res.status(200).json({
      success: true,
      message: "Configurações do website atualizadas com sucesso!",
      config,
    });
  } catch (err: any) {
    console.error("[SiteController] updateAdminSiteConfig erro:", err);
    return res.status(500).json({
      success: false,
      message: "Erro ao atualizar configurações do website.",
      error: err?.message || err,
    });
  }
};

// ── CRUD PRODUTOS ──
export const createAdminProduct = async (req: Request, res: Response) => {
  try {
    const product = await SiteProductModel.create({
      ...req.body,
      companyId: 1,
    });
    return res.status(201).json({ success: true, product });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || err });
  }
};

export const updateAdminProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const product = await SiteProductModel.findByPk(id);
    if (!product) {
      return res.status(404).json({ success: false, message: "Produto não encontrado." });
    }
    await product.update(req.body);
    return res.status(200).json({ success: true, product });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || err });
  }
};

export const deleteAdminProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await SiteProductModel.destroy({ where: { id, companyId: 1 } });
    return res.status(200).json({ success: true, message: "Produto eliminado com sucesso." });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || err });
  }
};

// ── CRUD DEPOIMENTOS ──
export const createAdminTestimonial = async (req: Request, res: Response) => {
  try {
    const testimonial = await SiteTestimonialModel.create({
      ...req.body,
      companyId: 1,
    });
    return res.status(201).json({ success: true, testimonial });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || err });
  }
};

export const updateAdminTestimonial = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const testimonial = await SiteTestimonialModel.findByPk(id);
    if (!testimonial) {
      return res.status(404).json({ success: false, message: "Depoimento não encontrado." });
    }
    await testimonial.update(req.body);
    return res.status(200).json({ success: true, testimonial });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || err });
  }
};

export const deleteAdminTestimonial = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await SiteTestimonialModel.destroy({ where: { id, companyId: 1 } });
    return res.status(200).json({ success: true, message: "Depoimento eliminado com sucesso." });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || err });
  }
};

// ── CRUD FAQS ──
export const createAdminFaq = async (req: Request, res: Response) => {
  try {
    const faq = await SiteFaqModel.create({
      ...req.body,
      companyId: 1,
    });
    return res.status(201).json({ success: true, faq });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || err });
  }
};

export const updateAdminFaq = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const faq = await SiteFaqModel.findByPk(id);
    if (!faq) {
      return res.status(404).json({ success: false, message: "Pergunta não encontrada." });
    }
    await faq.update(req.body);
    return res.status(200).json({ success: true, faq });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || err });
  }
};

export const deleteAdminFaq = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await SiteFaqModel.destroy({ where: { id, companyId: 1 } });
    return res.status(200).json({ success: true, message: "Pergunta eliminada com sucesso." });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || err });
  }
};

// ── GESTÃO DE LEADS ──
export const getAdminLeads = async (req: Request, res: Response) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;
    const where: any = { companyId: 1 };
    if (status && status !== "TODOS") {
      where.status = status;
    }

    const leads = await SiteLeadModel.findAll({
      where,
      order: [["createdAt", "DESC"]],
      limit: Number(limit),
      offset: Number(offset),
    });

    const total = await SiteLeadModel.count({ where });

    return res.status(200).json({
      success: true,
      leads,
      total,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || err });
  }
};

export const updateAdminLead = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const lead = await SiteLeadModel.findByPk(id);
    if (!lead) {
      return res.status(404).json({ success: false, message: "Lead não encontrado." });
    }
    await lead.update(req.body);
    return res.status(200).json({ success: true, lead });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || err });
  }
};

export const deleteAdminLead = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await SiteLeadModel.destroy({ where: { id, companyId: 1 } });
    return res.status(200).json({ success: true, message: "Lead eliminado com sucesso." });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || err });
  }
};
