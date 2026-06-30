/**
 * Seed: importa dados reais do PNCP e cria fontes, alertas e oportunidades iniciais.
 * Execute via: tsx server/seed.ts
 */
import "dotenv/config";
import { drizzle } from "drizzle-orm/mysql2";
import { eq, count } from "drizzle-orm";
import {
  sources,
  events,
  opportunities,
  opportunityEvents,
  alerts,
} from "../drizzle/schema";
import {
  fetchContratacoes,
  fetchContratos,
  normalizeContratacao,
  normalizeContrato,
  toApiDate,
} from "./pncp";

const db = drizzle(process.env.DATABASE_URL!);

async function seedSources() {
  console.log("[seed] Inserindo fontes de dados...");
  const sourcesData = [
    {
      name: "PNCP — Portal Nacional de Contratações Públicas",
      url: "https://pncp.gov.br",
      type: "pncp" as const,
      active: true,
    },
    {
      name: "Compras.gov.br — Dados Abertos",
      url: "https://dadosabertos.compras.gov.br",
      type: "compras_gov" as const,
      active: true,
    },
    {
      name: "Portal da Transparência — Governo Federal",
      url: "https://portaldatransparencia.gov.br",
      type: "portal_transparencia" as const,
      active: true,
    },
    {
      name: "Diário Oficial da União",
      url: "https://www.in.gov.br",
      type: "diario_oficial" as const,
      active: true,
    },
    {
      name: "TCU — Tribunal de Contas da União",
      url: "https://portal.tcu.gov.br",
      type: "tribunal" as const,
      active: false,
    },
  ];

  for (const src of sourcesData) {
    await db.insert(sources).values(src).onDuplicateKeyUpdate({ set: { name: src.name } });
  }
  console.log(`[seed] ${sourcesData.length} fontes inseridas.`);
}

async function seedEventsFromPncp() {
  console.log("[seed] Buscando eventos reais do PNCP...");

  const [sourceResult] = await db.select().from(sources).where(eq(sources.type, "pncp")).limit(1);
  const sourceId = sourceResult?.id ?? 1;

  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 60); // últimos 60 dias
  const dataInicial = toApiDate(start);
  const dataFinal = toApiDate(end);

  let total = 0;

  // Pregões eletrônicos
  try {
    console.log("[seed] Buscando pregões eletrônicos...");
    const result = await fetchContratacoes({
      dataInicial,
      dataFinal,
      tamanhoPagina: 50,
      codigoModalidadeContratacao: 6,
    });
    const normalized = (result.data ?? []).map((c) => normalizeContratacao(c, sourceId));
    if (normalized.length > 0) {
      await db.insert(events).values(normalized as any).onDuplicateKeyUpdate({ set: { updatedAt: new Date() } });
      total += normalized.length;
      console.log(`[seed] ${normalized.length} pregões importados.`);
    }
  } catch (e: any) {
    console.error("[seed] Erro ao buscar pregões:", e.message);
  }

  // Concorrências
  try {
    console.log("[seed] Buscando concorrências...");
    const result = await fetchContratacoes({
      dataInicial,
      dataFinal,
      tamanhoPagina: 50,
      codigoModalidadeContratacao: 8,
    });
    const normalized = (result.data ?? []).map((c) => normalizeContratacao(c, sourceId));
    if (normalized.length > 0) {
      await db.insert(events).values(normalized as any).onDuplicateKeyUpdate({ set: { updatedAt: new Date() } });
      total += normalized.length;
      console.log(`[seed] ${normalized.length} concorrências importadas.`);
    }
  } catch (e: any) {
    console.error("[seed] Erro ao buscar concorrências:", e.message);
  }

  // Contratos
  try {
    console.log("[seed] Buscando contratos...");
    const result = await fetchContratos({ dataInicial, dataFinal, tamanhoPagina: 50 });
    const normalized = (result.data ?? []).map((c) => normalizeContrato(c, sourceId));
    if (normalized.length > 0) {
      await db.insert(events).values(normalized as any).onDuplicateKeyUpdate({ set: { updatedAt: new Date() } });
      total += normalized.length;
      console.log(`[seed] ${normalized.length} contratos importados.`);
    }
  } catch (e: any) {
    console.error("[seed] Erro ao buscar contratos:", e.message);
  }

  console.log(`[seed] Total de eventos importados do PNCP: ${total}`);
  return total;
}

async function seedOpportunities() {
  console.log("[seed] Criando oportunidades previstas de exemplo...");

  const today = new Date();
  const addDays = (d: Date, n: number) => {
    const r = new Date(d);
    r.setDate(r.getDate() + n);
    return r;
  };

  const opps = [
    {
      title: "Pregão para aquisição de material de limpeza e higiene — Prefeitura de Cabo Frio/RJ",
      category: "Limpeza e Conservação",
      description: "Registro de preços para materiais de limpeza destinados a todas as secretarias municipais.",
      rationale: "Baseado no histórico de 3 pregões anuais consecutivos (2022, 2023, 2024) com valores entre R$ 280 mil e R$ 420 mil. O contrato vigente vence em agosto/2025, indicando abertura do novo processo em julho.",
      confidenceScore: 0.91,
      predictedOpenDate: addDays(today, 32),
      predictedValueBrl: "380000.00",
      entity: "PREFEITURA MUNICIPAL DE CABO FRIO",
      municipality: "Cabo Frio",
      state: "RJ",
      status: "predicted" as const,
      triggerCount: 3,
      recurrencePattern: "Anual — renovação de registro de preços",
      generatedByLlm: false,
    },
    {
      title: "Contratação de serviços de TI e suporte técnico — Secretaria de Saúde do RJ",
      category: "Tecnologia da Informação",
      description: "Contratação de empresa especializada em suporte a sistemas de informação em saúde.",
      rationale: "Contrato atual (nº 2023/0847) com vigência até setembro/2025. Padrão histórico indica licitação 60 dias antes do vencimento. Valor médio dos últimos 2 contratos: R$ 1,2 milhão.",
      confidenceScore: 0.85,
      predictedOpenDate: addDays(today, 58),
      predictedValueBrl: "1250000.00",
      entity: "SECRETARIA DE ESTADO DE SAÚDE DO RIO DE JANEIRO",
      municipality: "Rio de Janeiro",
      state: "RJ",
      status: "predicted" as const,
      triggerCount: 2,
      recurrencePattern: "Bienal — renovação de contrato de TI",
      generatedByLlm: false,
    },
    {
      title: "Obra de pavimentação e drenagem — Município de Araruama/RJ",
      category: "Obras e Infraestrutura",
      description: "Execução de obras de pavimentação asfáltica e drenagem pluvial em vias urbanas.",
      rationale: "Município recebeu emenda parlamentar de R$ 2,8 milhões em março/2025 para infraestrutura urbana. Histórico indica abertura de licitação 90 dias após liberação de recursos federais.",
      confidenceScore: 0.78,
      predictedOpenDate: addDays(today, 75),
      predictedValueBrl: "2800000.00",
      entity: "PREFEITURA MUNICIPAL DE ARARUAMA",
      municipality: "Araruama",
      state: "RJ",
      status: "predicted" as const,
      triggerCount: 1,
      recurrencePattern: "Pontual — emenda parlamentar 2025",
      generatedByLlm: false,
    },
    {
      title: "Aquisição de medicamentos e insumos hospitalares — Hospital Estadual Rocha Faria",
      category: "Saúde",
      description: "Pregão eletrônico para aquisição de medicamentos essenciais e insumos hospitalares.",
      rationale: "Histórico de 4 pregões semestrais consecutivos. Último processo (jan/2025) no valor de R$ 890 mil. Próximo ciclo previsto para julho/2025.",
      confidenceScore: 0.93,
      predictedOpenDate: addDays(today, 18),
      predictedValueBrl: "920000.00",
      entity: "HOSPITAL ESTADUAL ROCHA FARIA",
      municipality: "Rio de Janeiro",
      state: "RJ",
      status: "predicted" as const,
      triggerCount: 4,
      recurrencePattern: "Semestral — reposição de estoque hospitalar",
      generatedByLlm: false,
    },
    {
      title: "Fornecimento de merenda escolar — Secretaria Municipal de Educação de Niterói",
      category: "Alimentação",
      description: "Registro de preços para fornecimento de gêneros alimentícios para a rede municipal de ensino.",
      rationale: "Contrato anual renovado todo início de ano letivo. Processo 2024 aberto em novembro/2024. Padrão indica abertura do processo 2026 em outubro/2025.",
      confidenceScore: 0.88,
      predictedOpenDate: addDays(today, 110),
      predictedValueBrl: "3200000.00",
      entity: "SECRETARIA MUNICIPAL DE EDUCAÇÃO DE NITERÓI",
      municipality: "Niterói",
      state: "RJ",
      status: "predicted" as const,
      triggerCount: 3,
      recurrencePattern: "Anual — início do ano letivo",
      generatedByLlm: false,
    },
    {
      title: "Serviços de vigilância e segurança patrimonial — UFRJ",
      category: "Segurança",
      description: "Contratação de empresa especializada em vigilância armada e desarmada para os campi da universidade.",
      rationale: "Contrato vigente vence em dezembro/2025. Universidade federal com histórico regular de renovação. Valor estimado baseado nos últimos 3 contratos: média de R$ 4,1 milhões.",
      confidenceScore: 0.82,
      predictedOpenDate: addDays(today, 145),
      predictedValueBrl: "4100000.00",
      entity: "UNIVERSIDADE FEDERAL DO RIO DE JANEIRO",
      municipality: "Rio de Janeiro",
      state: "RJ",
      status: "predicted" as const,
      triggerCount: 3,
      recurrencePattern: "Anual — renovação de contrato de segurança",
      generatedByLlm: false,
    },
    {
      title: "Aquisição de veículos utilitários — Prefeitura de Petrópolis/RJ",
      category: "Transporte",
      description: "Compra de veículos utilitários para atender as secretarias municipais de obras e saúde.",
      rationale: "Plano de renovação da frota municipal aprovado em fevereiro/2025. Dotação orçamentária de R$ 1,5 milhão prevista para o 3º trimestre de 2025.",
      confidenceScore: 0.72,
      predictedOpenDate: addDays(today, 88),
      predictedValueBrl: "1500000.00",
      entity: "PREFEITURA MUNICIPAL DE PETRÓPOLIS",
      municipality: "Petrópolis",
      state: "RJ",
      status: "predicted" as const,
      triggerCount: 1,
      recurrencePattern: "Pontual — renovação de frota 2025",
      generatedByLlm: false,
    },
    {
      title: "Contratação de serviços de limpeza urbana — Prefeitura de Búzios/RJ",
      category: "Limpeza e Conservação",
      description: "Contratação de empresa para coleta de resíduos sólidos e limpeza de logradouros públicos.",
      rationale: "Contrato atual vence em agosto/2025. Município turístico com alta demanda sazonal. Histórico de 2 contratos anteriores com valores crescentes.",
      confidenceScore: 0.87,
      predictedOpenDate: addDays(today, 42),
      predictedValueBrl: "2600000.00",
      entity: "PREFEITURA MUNICIPAL DE ARMAÇÃO DOS BÚZIOS",
      municipality: "Armação dos Búzios",
      state: "RJ",
      status: "predicted" as const,
      triggerCount: 2,
      recurrencePattern: "Anual — renovação de contrato de limpeza urbana",
      generatedByLlm: false,
    },
  ];

  for (const opp of opps) {
    await db.insert(opportunities).values(opp as any).onDuplicateKeyUpdate({ set: { updatedAt: new Date() } });
  }
  console.log(`[seed] ${opps.length} oportunidades inseridas.`);
}

async function seedAlerts() {
  console.log("[seed] Criando alertas de exemplo...");

  const alertsData = [
    {
      name: "Licitações de TI acima de R$ 500 mil",
      eventType: "licitacao" as const,
      category: "Tecnologia da Informação",
      minConfidenceScore: 0.6,
      minValueBrl: "500000.00",
      active: true,
    },
    {
      name: "Contratos de obras no RJ",
      eventType: "contrato" as const,
      category: "Obras e Infraestrutura",
      municipality: null,
      minConfidenceScore: 0.5,
      active: true,
    },
    {
      name: "Oportunidades de alta confiança (>85%)",
      eventType: "all" as const,
      minConfidenceScore: 0.85,
      active: true,
    },
    {
      name: "Dispensas de emergência em saúde",
      eventType: "dispensa" as const,
      category: "Saúde",
      minConfidenceScore: 0.0,
      active: true,
    },
    {
      name: "Pregões de limpeza e conservação",
      eventType: "licitacao" as const,
      category: "Limpeza e Conservação",
      minConfidenceScore: 0.5,
      active: false,
    },
  ];

  for (const alert of alertsData) {
    await db.insert(alerts).values(alert as any).onDuplicateKeyUpdate({ set: { name: alert.name } });
  }
  console.log(`[seed] ${alertsData.length} alertas inseridos.`);
}

async function main() {
  console.log("=== SEED OPPORTUNITY MAP ===");
  try {
    await seedSources();
    const eventsImported = await seedEventsFromPncp();
    await seedOpportunities();
    await seedAlerts();

    // Contagem final
    const [eventsCount] = await db.select({ count: count() }).from(events);
    const [oppsCount] = await db.select({ count: count() }).from(opportunities);
    const [alertsCount] = await db.select({ count: count() }).from(alerts);
    const [sourcesCount] = await db.select({ count: count() }).from(sources);

    console.log("\n=== RESUMO DO SEED ===");
    console.log(`Fontes:       ${sourcesCount?.count ?? 0}`);
    console.log(`Eventos:      ${eventsCount?.count ?? 0} (${eventsImported} importados do PNCP)`);
    console.log(`Oportunidades:${oppsCount?.count ?? 0}`);
    console.log(`Alertas:      ${alertsCount?.count ?? 0}`);
    console.log("=== SEED CONCLUÍDO ===");
  } catch (e) {
    console.error("[seed] Erro fatal:", e);
    process.exit(1);
  }
  process.exit(0);
}

main();
