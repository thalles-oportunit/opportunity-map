import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import {
  createOpportunity,
  getOpportunities,
  getOpportunityById,
  getOpportunityTriggerEvents,
  getUpcomingOpportunities,
  linkOpportunityEvent,
  getEventsByEntity,
} from "../db";
import { invokeLLM } from "../_core/llm";

export const opportunitiesRouter = router({
  list: publicProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(20),
        category: z.string().optional(),
        status: z.enum(["predicted", "confirmed", "cancelled", "expired"]).optional(),
        minScore: z.number().min(0).max(1).optional(),
        daysAhead: z.number().int().min(1).max(365).optional(),
      })
    )
    .query(async ({ input }) => {
      return getOpportunities(input);
    }),

  byId: publicProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ input }) => {
      const opp = await getOpportunityById(input.id);
      if (!opp) throw new Error("Oportunidade não encontrada");
      const triggerEvents = await getOpportunityTriggerEvents(input.id);
      return { ...opp, triggerEvents };
    }),

  upcoming: publicProcedure
    .input(
      z.object({
        daysAhead: z.number().int().min(1).max(365).default(180),
        limit: z.number().int().min(1).max(50).default(10),
      })
    )
    .query(async ({ input }) => {
      return getUpcomingOpportunities(input.daysAhead, input.limit);
    }),

  create: publicProcedure
    .input(
      z.object({
        title: z.string().min(1),
        category: z.string().min(1),
        description: z.string().optional(),
        rationale: z.string().optional(),
        confidenceScore: z.number().min(0).max(1).default(0.5),
        predictedOpenDate: z.string(),
        predictedValueBrl: z.string().optional(),
        entity: z.string().optional(),
        municipality: z.string().optional(),
        state: z.string().optional(),
        triggerEventIds: z.array(z.number().int()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { triggerEventIds, ...data } = input;
      const opp = await createOpportunity(data as any);
      if (triggerEventIds && opp) {
        for (const eventId of triggerEventIds) {
          await linkOpportunityEvent({ opportunityId: opp.id, eventId, relationType: "trigger" });
        }
      }
      return opp;
    }),

  /**
   * Agente LLM: analisa histórico de eventos de um órgão público e gera
   * automaticamente novas oportunidades previstas com score de confiança,
   * fundamentação e data estimada de abertura.
   */
  generateFromLlm: publicProcedure
    .input(
      z.object({
        entity: z.string().min(1).describe("Nome ou parte do nome do órgão público"),
        municipality: z.string().optional(),
        saveToDb: z.boolean().default(true),
      })
    )
    .mutation(async ({ input }) => {
      const { entity, municipality, saveToDb } = input;

      // 1. Busca histórico de eventos do órgão
      const historicalEvents = await getEventsByEntity(entity, 40);

      if (historicalEvents.length === 0) {
        return {
          opportunities: [],
          message: `Nenhum evento histórico encontrado para "${entity}". Sincronize dados do PNCP primeiro.`,
        };
      }

      // 2. Prepara contexto para o LLM
      const eventSummary = historicalEvents
        .slice(0, 30)
        .map((e, i) => {
          const valor = e.valueBrl ? `R$ ${Number(e.valueBrl).toLocaleString("pt-BR")}` : "valor não informado";
          return `${i + 1}. [${e.type.toUpperCase()}] ${e.title?.slice(0, 120)} | ${e.entity} | ${e.municipality ?? ""}/${e.state ?? ""} | ${valor} | Data: ${e.eventDate ?? e.openDate ?? "N/A"} | Status: ${e.status}`;
        })
        .join("\n");

      const today = new Date().toISOString().split("T")[0];
      const municipioCtx = municipality ? ` no município de ${municipality}` : "";

      const systemPrompt = `Você é um analista de inteligência de mercado especializado em contratações públicas brasileiras.
Sua função é analisar o histórico de licitações, contratos e eventos de um órgão público e identificar padrões para prever oportunidades futuras.

Regras obrigatórias:
- Responda SEMPRE em JSON válido, sem texto fora do JSON.
- Gere entre 3 e 6 oportunidades previstas.
- O campo "confidenceScore" deve ser um número entre 0.0 e 1.0.
- O campo "predictedOpenDate" deve ser uma data futura no formato YYYY-MM-DD (após ${today}).
- O campo "predictedValueBrl" deve ser um número (sem formatação), ou null.
- Baseie as previsões em padrões reais: recorrência anual, sazonalidade, ciclos orçamentários, contratos próximos do vencimento.
- Seja específico e técnico na fundamentação (rationale).`;

      const userPrompt = `Analise o histórico de eventos do órgão "${entity}"${municipioCtx} e gere oportunidades previstas.

HISTÓRICO DE EVENTOS (${historicalEvents.length} registros):
${eventSummary}

Retorne um JSON com o seguinte formato:
{
  "opportunities": [
    {
      "title": "Título descritivo da oportunidade",
      "category": "Categoria (ex: Limpeza e Conservação, TI, Obras, Saúde, etc.)",
      "description": "Descrição breve da oportunidade",
      "rationale": "Fundamentação detalhada baseada no histórico: padrões observados, recorrência, sazonalidade, contratos vencendo",
      "confidenceScore": 0.85,
      "predictedOpenDate": "2025-09-15",
      "predictedValueBrl": 250000,
      "recurrencePattern": "Anual (baseado em contratos dos últimos 3 anos)"
    }
  ]
}`;

      // 3. Chama o LLM
      let llmModel = "gpt-4o-mini";
      let rawContent = "";

      try {
        const response = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          response_format: { type: "json_object" } as any,
        });

        const msgContent = response.choices?.[0]?.message?.content;
        rawContent = typeof msgContent === "string" ? msgContent : JSON.stringify(msgContent ?? {});
        llmModel = response.model ?? llmModel;
      } catch (e: any) {
        throw new Error(`Falha ao chamar LLM: ${e.message}`);
      }

      // 4. Parseia resposta
      let parsed: { opportunities: any[] };
      try {
        parsed = JSON.parse(rawContent);
        if (!Array.isArray(parsed.opportunities)) {
          parsed = { opportunities: [] };
        }
      } catch {
        throw new Error("LLM retornou JSON inválido");
      }

      const results = [];

      // 5. Salva no banco se solicitado
      for (const opp of parsed.opportunities) {
        const data = {
          title: String(opp.title ?? "Oportunidade prevista").slice(0, 500),
          category: String(opp.category ?? "Outros").slice(0, 128),
          description: opp.description ? String(opp.description) : null,
          rationale: opp.rationale ? String(opp.rationale) : null,
          confidenceScore: Math.min(1, Math.max(0, Number(opp.confidenceScore ?? 0.5))),
          predictedOpenDate: new Date(String(opp.predictedOpenDate ?? today)),
          predictedValueBrl: opp.predictedValueBrl ? String(opp.predictedValueBrl) : null,
          entity: entity.slice(0, 255),
          municipality: municipality ?? (historicalEvents[0]?.municipality ?? null),
          state: historicalEvents[0]?.state ?? null,
          status: "predicted" as const,
          triggerCount: historicalEvents.length,
          recurrencePattern: opp.recurrencePattern ? String(opp.recurrencePattern).slice(0, 128) : null,
          generatedByLlm: true,
          llmModel: llmModel.slice(0, 64),
        };

        if (saveToDb) {
          const saved = await createOpportunity(data);
          // Vincula os eventos históricos como gatilho
          for (const ev of historicalEvents.slice(0, 5)) {
            await linkOpportunityEvent({
              opportunityId: saved.id,
              eventId: ev.id,
              relationType: "historical",
            });
          }
          results.push(saved);
        } else {
          results.push(data);
        }
      }

      return {
        opportunities: results,
        eventsAnalyzed: historicalEvents.length,
        model: llmModel,
        message: `${results.length} oportunidade(s) gerada(s) com base em ${historicalEvents.length} evento(s) histórico(s).`,
      };
    }),
});
