# Opportunity Map — TODO

## Schema & Backend
- [x] Schema MySQL: tabelas events, sources, opportunities, opportunity_events, alerts
- [x] Migração via Drizzle ORM e aplicação via webdev_execute_sql
- [x] Query helpers em server/db.ts
- [x] Router tRPC: dashboard (KPIs, breakdown, agenda, atividade recente)
- [x] Router tRPC: events (listar, buscar, filtrar, detalhe)
- [x] Router tRPC: opportunities (listar, filtrar, detalhe com eventos gatilho)
- [x] Router tRPC: sources (listar, criar, atualizar, toggle ativo)
- [x] Router tRPC: alerts (listar, criar, deletar)
- [x] Endpoint LLM: analisar histórico de órgão e gerar oportunidades previstas
- [x] Seed de dados de exemplo: 150 eventos reais do PNCP, 8 oportunidades previstas, 5 alertas, 5 fontes

## Frontend — Tema e Layout
- [x] Tema dark navy + cyan user-friendly (não terminal, acessível)
- [x] index.css com variáveis CSS e Google Fonts (JetBrains Mono + Inter)
- [x] BloombergLayout com sidebar persistente e navegação entre todas as páginas
- [x] App.tsx com todas as rotas registradas

## Frontend — Páginas
- [x] Painel de Controle (/) — KPIs, gráfico breakdown, agenda 180 dias, atividade recente
- [x] Radar de Eventos (/events) — listagem paginada, busca, filtros por tipo/status
- [x] Detalhe do Evento (/events/:id) — informações completas, link para portal original
- [x] Oportunidades Previstas (/opportunities) — barra confiança, contagem regressiva, filtros
- [x] Detalhe da Oportunidade (/opportunities/:id) — fundamentação, eventos gatilho
- [x] Fontes de Dados (/sources) — listagem e gerenciamento, adicionar portais customizados
- [x] Alertas (/alerts) — regras configuráveis com filtros
- [x] Estados de loading (skeletons) em todas as listagens
- [x] Empty states em todas as listagens

## Qualidade
- [x] TypeScript check sem erros
- [x] Build production sem erros
- [x] Testes vitest cobrindo routers principais (18 testes passando)
- [x] Checkpoint final
