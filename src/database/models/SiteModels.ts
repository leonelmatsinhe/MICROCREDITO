import { DataTypes, Model } from "sequelize";
import { db } from "../db";

/**
 * Configuração Geral do Website Institucional
 */
export class SiteConfigModel extends Model {
  public id!: number;
  public companyId!: number;
  public companyName!: string;
  public tagline!: string;
  public heroTitle!: string;
  public heroSubtitle!: string;
  public heroBadge!: string;
  public heroPrimaryCtaText!: string;
  public heroPrimaryCtaLink!: string;
  public heroSecondaryCtaText!: string;
  public heroSecondaryCtaLink!: string;
  public heroImageUrl!: string;
  public statClients!: string;
  public statClientsLabel!: string;
  public statDisbursed!: string;
  public statDisbursedLabel!: string;
  public statApproval!: string;
  public statApprovalLabel!: string;
  public statSatisfaction!: string;
  public statSatisfactionLabel!: string;
  public phone!: string;
  public phoneSecondary!: string;
  public whatsapp!: string;
  public email!: string;
  public address!: string;
  public workingHours!: string;
  public mapUrl!: string;
  public facebookUrl!: string;
  public instagramUrl!: string;
  public linkedinUrl!: string;
  public aboutHistory!: string;
  public aboutMission!: string;
  public aboutVision!: string;
  public aboutValues!: string;
  public defaultInterestRate!: number;
  public minAmount!: number;
  public maxAmount!: number;
  public minTerm!: number;
  public maxTerm!: number;
  public sectionsEnabled!: string;
  public metaTitle!: string;
  public metaDescription!: string;
  public metaKeywords!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

SiteConfigModel.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    companyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    companyName: {
      type: DataTypes.STRING(150),
      allowNull: false,
      defaultValue: "Clack Microcrédito, EI",
    },
    tagline: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: "Soluções Financeiras Rápidas, Transparentes e Acessíveis em Moçambique",
    },
    heroTitle: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: "Crédito Rápido e Seguro para Realizar os Seus Planos",
    },
    heroSubtitle: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue:
        "Financiamento flexível para comerciantes, empreendedores e famílias em Moçambique. Simule agora e receba os fundos em menos de 24 horas via M-Pesa, e-Mola ou transferência bancária.",
    },
    heroBadge: {
      type: DataTypes.STRING(150),
      allowNull: true,
      defaultValue: "Instituição Licenciada e Confiável em Moçambique",
    },
    heroPrimaryCtaText: {
      type: DataTypes.STRING(100),
      allowNull: true,
      defaultValue: "Simular Crédito",
    },
    heroPrimaryCtaLink: {
      type: DataTypes.STRING(100),
      allowNull: true,
      defaultValue: "#simulador",
    },
    heroSecondaryCtaText: {
      type: DataTypes.STRING(100),
      allowNull: true,
      defaultValue: "Falar no WhatsApp",
    },
    heroSecondaryCtaLink: {
      type: DataTypes.STRING(100),
      allowNull: true,
      defaultValue: "https://wa.me/258848353816",
    },
    heroImageUrl: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    statClients: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: "+2.500",
    },
    statClientsLabel: {
      type: DataTypes.STRING(100),
      allowNull: true,
      defaultValue: "Clientes Satisfeitos",
    },
    statDisbursed: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: "+45M MZN",
    },
    statDisbursedLabel: {
      type: DataTypes.STRING(100),
      allowNull: true,
      defaultValue: "Crédito Concedido",
    },
    statApproval: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: "24 Horas",
    },
    statApprovalLabel: {
      type: DataTypes.STRING(100),
      allowNull: true,
      defaultValue: "Aprovação Rápida",
    },
    statSatisfaction: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: "98%",
    },
    statSatisfactionLabel: {
      type: DataTypes.STRING(100),
      allowNull: true,
      defaultValue: "Taxa de Satisfação",
    },
    phone: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: "+258 84 835 3816",
    },
    phoneSecondary: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: "+258 87 074 0202",
    },
    whatsapp: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: "258848353816",
    },
    email: {
      type: DataTypes.STRING(150),
      allowNull: true,
      defaultValue: "contacto@clackmicrocredito.com",
    },
    address: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: "Av. 25 de Setembro, Maputo, Moçambique",
    },
    workingHours: {
      type: DataTypes.STRING(150),
      allowNull: true,
      defaultValue: "Segunda a Sexta: 08:00 - 17:00 | Sábado: 08:00 - 12:30",
    },
    mapUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    facebookUrl: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: "https://facebook.com/clackmicrocredito",
    },
    instagramUrl: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: "https://instagram.com/clackmicrocredito",
    },
    linkedinUrl: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    aboutHistory: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    aboutMission: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    aboutVision: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    aboutValues: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    defaultInterestRate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 15.0,
    },
    minAmount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 1000.0,
    },
    maxAmount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 300000.0,
    },
    minTerm: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    maxTerm: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 12,
    },
    sectionsEnabled: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: JSON.stringify({
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
    },
    metaTitle: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: "Clack Microcrédito, EI | Crédito Rápido e Seguro em Moçambique",
    },
    metaDescription: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue:
        "Microcrédito acessível em Moçambique. Empréstimos para negócios, emergências e consumo pessoal com aprovação em 24h e desembolso via M-Pesa ou banco.",
    },
    metaKeywords: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: "microcrédito moçambique, empréstimo rápido maputo, crédito pessoal mpesa, financiamento pme",
    },
  },
  {
    sequelize: db,
    tableName: "site_configs",
    timestamps: true,
  }
);

/**
 * Produtos de Crédito do Website
 */
export class SiteProductModel extends Model {
  public id!: number;
  public companyId!: number;
  public slug!: string;
  public title!: string;
  public badge!: string;
  public summary!: string;
  public description!: string;
  public minAmount!: number;
  public maxAmount!: number;
  public minTerm!: number;
  public maxTerm!: number;
  public termType!: string;
  public interestRate!: number;
  public requirements!: string;
  public benefits!: string;
  public icon!: string;
  public imageUrl!: string;
  public featured!: boolean;
  public isActive!: boolean;
  public sortOrder!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

SiteProductModel.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    companyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    slug: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    badge: {
      type: DataTypes.STRING(80),
      allowNull: true,
    },
    summary: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    minAmount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 1000,
    },
    maxAmount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 100000,
    },
    minTerm: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    maxTerm: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 12,
    },
    termType: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "MESES",
    },
    interestRate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 15.0,
    },
    requirements: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    benefits: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    icon: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: "payments",
    },
    imageUrl: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    featured: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    sequelize: db,
    tableName: "site_produtos",
    timestamps: true,
  }
);

/**
 * Depoimentos de Clientes
 */
export class SiteTestimonialModel extends Model {
  public id!: number;
  public companyId!: number;
  public clientName!: string;
  public clientRole!: string;
  public clientLocation!: string;
  public avatarUrl!: string;
  public rating!: number;
  public comment!: string;
  public productType!: string;
  public isActive!: boolean;
  public sortOrder!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

SiteTestimonialModel.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    companyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    clientName: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    clientRole: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    clientLocation: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    avatarUrl: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    rating: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 5,
    },
    comment: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    productType: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    sequelize: db,
    tableName: "site_depoimentos",
    timestamps: true,
  }
);

/**
 * Perguntas Frequentes (FAQ)
 */
export class SiteFaqModel extends Model {
  public id!: number;
  public companyId!: number;
  public category!: string;
  public question!: string;
  public answer!: string;
  public isActive!: boolean;
  public sortOrder!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

SiteFaqModel.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    companyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    category: {
      type: DataTypes.STRING(80),
      allowNull: false,
      defaultValue: "Geral",
    },
    question: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    answer: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    sequelize: db,
    tableName: "site_faqs",
    timestamps: true,
  }
);

/**
 * Pedidos e Leads Recebidos pelo Website
 */
export class SiteLeadModel extends Model {
  public id!: number;
  public companyId!: number;
  public name!: string;
  public phone!: string;
  public email!: string;
  public city!: string;
  public amount!: number;
  public term!: number;
  public productSlug!: string;
  public message!: string;
  public source!: string;
  public status!: "NOVO" | "EM_CONTACTO" | "CONVERTIDO" | "ARQUIVADO";
  public notes!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

SiteLeadModel.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    companyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    phone: {
      type: DataTypes.STRING(30),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },
    city: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
    },
    term: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    productSlug: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    source: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: "WEBSITE",
    },
    status: {
      type: DataTypes.ENUM("NOVO", "EM_CONTACTO", "CONVERTIDO", "ARQUIVADO"),
      allowNull: false,
      defaultValue: "NOVO",
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize: db,
    tableName: "site_leads",
    timestamps: true,
  }
);
