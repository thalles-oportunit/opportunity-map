/**
 * Integração com a API pública do PNCP (Portal Nacional de Contratações Públicas)
 * Documentação: https://pncp.gov.br/api/consulta/swagger-ui/index.html
 */

const PNCP_BASE = "https://pncp.gov.br/api/consulta";

export interface PncpContratacao {
  numeroControlePNCP: string;
  objetoCompra: string;
  valorTotalEstimado: number | null;
  valorTotalHomologado: number | null;
  dataAberturaProposta: string | null;
  dataEncerramentoProposta: string | null;
  dataPublicacaoPncp: string;
  dataInclusao: string;
  modalidadeNome: string;
  modalidadeId: number;
  situacaoCompraNome: string;
  situacaoCompraId: number;
  orgaoEntidade: { cnpj: string; razaoSocial: string; poderId: string; esferaId: string };
  unidadeOrgao: {
    ufNome: string;
    ufSigla: string;
    municipioNome: string;
    nomeUnidade: string;
    codigoIbge: string;
  };
  processo: string;
  amparoLegal: { nome: string; descricao: string; codigo: number } | null;
  linkSistemaOrigem: string | null;
  srp: boolean;
}

export interface PncpContrato {
  numeroControlePNCP: string;
  objetoContrato: string;
  valorInicial: number;
  valorGlobal: number;
  dataAssinatura: string;
  dataVigenciaInicio: string;
  dataVigenciaFim: string;
  dataPublicacaoPncp: string;
  tipoContrato: { id: number; nome: string };
  orgaoEntidade: { cnpj: string; razaoSocial: string };
  unidadeOrgao: { ufNome: string; ufSigla: string; municipioNome: string; nomeUnidade: string };
  nomeRazaoSocialFornecedor: string;
  categoriaProcesso: { id: number; nome: string } | null;
  processo: string;
}

interface PncpPage<T> {
  data: T[];
  totalRegistros?: number;
  totalPaginas?: number;
}

async function pncpFetch<T>(path: string, params: Record<string, string | number>): Promise<T> {
  const url = new URL(`${PNCP_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v));
  }
  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`PNCP ${path} → HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json() as T;
}

/**
 * Busca licitações/contratações por período de publicação.
 * modalidadeId: 6 = Pregão Eletrônico, 8 = Concorrência, 1 = Leilão, 4 = Concurso
 */
export async function fetchContratacoes(opts: {
  dataInicial: string; // YYYYMMDD
  dataFinal: string;
  pagina?: number;
  tamanhoPagina?: number;
  codigoModalidadeContratacao?: number;
}): Promise<PncpPage<PncpContratacao>> {
  const {
    dataInicial,
    dataFinal,
    pagina = 1,
    tamanhoPagina = 50,
    codigoModalidadeContratacao = 6,
  } = opts;
  return pncpFetch<PncpPage<PncpContratacao>>("/v1/contratacoes/publicacao", {
    dataInicial,
    dataFinal,
    pagina,
    tamanhoPagina,
    codigoModalidadeContratacao,
  });
}

/**
 * Busca contratações com proposta aberta (oportunidades ativas agora).
 */
export async function fetchContratacoesProposta(opts: {
  dataInicial: string;
  dataFinal: string;
  pagina?: number;
  tamanhoPagina?: number;
}): Promise<PncpPage<PncpContratacao>> {
  const { dataInicial, dataFinal, pagina = 1, tamanhoPagina = 50 } = opts;
  return pncpFetch<PncpPage<PncpContratacao>>("/v1/contratacoes/proposta", {
    dataInicial,
    dataFinal,
    pagina,
    tamanhoPagina,
  });
}

/**
 * Busca contratos assinados por período.
 */
export async function fetchContratos(opts: {
  dataInicial: string;
  dataFinal: string;
  pagina?: number;
  tamanhoPagina?: number;
}): Promise<PncpPage<PncpContrato>> {
  const { dataInicial, dataFinal, pagina = 1, tamanhoPagina = 50 } = opts;
  return pncpFetch<PncpPage<PncpContrato>>("/v1/contratos", {
    dataInicial,
    dataFinal,
    pagina,
    tamanhoPagina,
  });
}

/**
 * Normaliza uma contratação PNCP para o formato InsertEvent interno.
 */
export function normalizeContratacao(c: PncpContratacao, sourceId: number) {
  const modalidadeNome = c.modalidadeNome?.toLowerCase() ?? "";
  let type: "licitacao" | "dispensa" | "contrato" = "licitacao";
  if (modalidadeNome.includes("dispensa")) type = "dispensa";

  const openDate = c.dataAberturaProposta
    ? c.dataAberturaProposta.split("T")[0]
    : c.dataPublicacaoPncp.split("T")[0];
  const closeDate = c.dataEncerramentoProposta
    ? c.dataEncerramentoProposta.split("T")[0]
    : undefined;

  const status =
    c.situacaoCompraId === 1
      ? "active"
      : c.situacaoCompraId === 4
        ? "closed"
        : c.situacaoCompraId === 3
          ? "cancelled"
          : "active";

  return {
    externalId: c.numeroControlePNCP,
    type,
    title: c.objetoCompra?.slice(0, 500) ?? "Sem descrição",
    description: c.amparoLegal?.descricao ?? null,
    entity: c.orgaoEntidade?.razaoSocial?.slice(0, 255) ?? null,
    entityCnpj: c.orgaoEntidade?.cnpj ?? null,
    municipality: c.unidadeOrgao?.municipioNome ?? null,
    state: c.unidadeOrgao?.ufSigla ?? null,
    category: inferCategory(c.objetoCompra),
    valueBrl: c.valorTotalEstimado?.toString() ?? c.valorTotalHomologado?.toString() ?? null,
    eventDate: openDate,
    openDate,
    closeDate: closeDate ?? null,
    status: status as any,
    sourceId,
    sourceUrl: c.linkSistemaOrigem ?? null,
    processNumber: c.processo ?? null,
    modalidade: c.modalidadeNome ?? null,
    rawData: JSON.stringify({ pncp: c.numeroControlePNCP }),
  };
}

/**
 * Normaliza um contrato PNCP para o formato InsertEvent interno.
 */
export function normalizeContrato(c: PncpContrato, sourceId: number) {
  return {
    externalId: c.numeroControlePNCP,
    type: "contrato" as const,
    title: c.objetoContrato?.slice(0, 500) ?? "Contrato sem descrição",
    description: `Fornecedor: ${c.nomeRazaoSocialFornecedor}`,
    entity: c.orgaoEntidade?.razaoSocial?.slice(0, 255) ?? null,
    entityCnpj: c.orgaoEntidade?.cnpj ?? null,
    municipality: c.unidadeOrgao?.municipioNome ?? null,
    state: c.unidadeOrgao?.ufSigla ?? null,
    category: c.categoriaProcesso?.nome ?? inferCategory(c.objetoContrato),
    valueBrl: c.valorGlobal?.toString() ?? null,
    eventDate: c.dataAssinatura ?? null,
    openDate: c.dataVigenciaInicio ?? null,
    closeDate: c.dataVigenciaFim ?? null,
    status: "active" as const,
    sourceId,
    sourceUrl: null,
    processNumber: c.processo ?? null,
    modalidade: c.tipoContrato?.nome ?? null,
    rawData: JSON.stringify({ pncp: c.numeroControlePNCP }),
  };
}

/**
 * Infere categoria a partir do objeto da compra.
 */
function inferCategory(texto: string): string {
  const t = texto?.toLowerCase() ?? "";
  if (t.includes("limpeza") || t.includes("higiene") || t.includes("asseio")) return "Limpeza e Conservação";
  if (t.includes("informática") || t.includes("computador") || t.includes("software") || t.includes("ti ") || t.includes("tecnologia")) return "Tecnologia da Informação";
  if (t.includes("obra") || t.includes("construção") || t.includes("reforma") || t.includes("pavimentação")) return "Obras e Infraestrutura";
  if (t.includes("saúde") || t.includes("médico") || t.includes("hospital") || t.includes("medicamento") || t.includes("farmácia")) return "Saúde";
  if (t.includes("educação") || t.includes("escola") || t.includes("ensino") || t.includes("didático")) return "Educação";
  if (t.includes("alimento") || t.includes("merenda") || t.includes("gênero alimentício") || t.includes("refeição")) return "Alimentação";
  if (t.includes("transporte") || t.includes("veículo") || t.includes("ônibus") || t.includes("combustível")) return "Transporte";
  if (t.includes("segurança") || t.includes("vigilância") || t.includes("monitoramento")) return "Segurança";
  if (t.includes("mobiliário") || t.includes("móvel") || t.includes("cadeira") || t.includes("mesa")) return "Mobiliário";
  if (t.includes("material de escritório") || t.includes("papelaria") || t.includes("expediente")) return "Material de Escritório";
  if (t.includes("energia") || t.includes("elétrico") || t.includes("iluminação")) return "Energia e Elétrica";
  if (t.includes("água") || t.includes("saneamento") || t.includes("esgoto")) return "Saneamento";
  if (t.includes("consultoria") || t.includes("assessoria") || t.includes("auditoria")) return "Consultoria e Assessoria";
  if (t.includes("comunicação") || t.includes("publicidade") || t.includes("propaganda")) return "Comunicação";
  return "Outros";
}

/**
 * Formata data para o padrão YYYYMMDD esperado pela API.
 */
export function toApiDate(d: Date): string {
  return d.toISOString().split("T")[0].replace(/-/g, "");
}
