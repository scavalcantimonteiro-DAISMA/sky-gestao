import { SKY_PDVS_DATA, SKY_PDVS_METADATA } from '../data/skyPdvResultsData';

const CACHE_KEY = 'sky_pdv_results_cache_v1';
const CACHE_META_KEY = 'sky_pdv_results_meta_v1';

// Metas Oficiais SKY Brasil
export const TARGETS = {
  taAt: 0.80,       // Tempo de Atendimento AT Corretiva: >= 80%
  taPp: 0.90,       // Tempo de Atendimento PP: >= 90%
  retiradas: 0.70,  // Retiradas de Pós: >= 70%
  reabAt: 0.0349,   // Reabertura de AT: <= 3.49% (quanto menor melhor)
  reabPp: 0.025     // Reabertura de PP: <= 2.50% (quanto menor melhor)
};

/**
 * Normaliza texto para busca (sem acentos, maiúsculas, limpa espaços)
 */
export function normalizeSearchTerm(term) {
  if (!term) return '';
  return String(term)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();
}

/**
 * Formata um decimal em porcentagem legível (ex: 0.859 -> "85.9%")
 */
export function formatPercent(val) {
  if (val === null || val === undefined || isNaN(val)) return '-';
  const num = Number(val);
  // Se já estiver na escala 0-100 (ex: 85.9)
  const pct = num <= 1 && num > 0 ? num * 100 : num;
  return `${pct.toFixed(1).replace('.', ',')}%`;
}

/**
 * Avalia se o indicador está dentro da meta oficial da SKY
 */
export function evaluateTarget(type, value) {
  if (value === null || value === undefined || isNaN(value)) return { ok: true, text: 'Sem dado' };
  const num = Number(value) > 1 ? Number(value) / 100 : Number(value);

  switch (type) {
    case 'taAt':
      return {
        ok: num >= TARGETS.taAt,
        targetFormatted: '≥ 80%',
        label: 'T.A de AT'
      };
    case 'taPp':
      return {
        ok: num >= TARGETS.taPp,
        targetFormatted: '≥ 90%',
        label: 'T.A de PP'
      };
    case 'retiradas':
      return {
        ok: num >= TARGETS.retiradas,
        targetFormatted: '≥ 70%',
        label: 'Retiradas'
      };
    case 'reabAt':
      return {
        ok: num <= TARGETS.reabAt,
        targetFormatted: '≤ 3,5%',
        label: 'Reabertura AT'
      };
    case 'reabPp':
      return {
        ok: num <= TARGETS.reabPp,
        targetFormatted: '≤ 2,5%',
        label: 'Reabertura PP'
      };
    default:
      return { ok: true, targetFormatted: '', label: type };
  }
}

/**
 * Obtém todos os PDVs disponíveis (da memória em cache ou do dataset estático inicial)
 */
export function getAllPdvs() {
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Erro ao ler cache de PDVs:', e);
    }
  }
  return SKY_PDVS_DATA;
}

/**
 * Busca PDVs por código, nome de credenciado ou estado
 */
export function searchPdvs(query, limit = 12) {
  if (!query || !query.trim()) return getAllPdvs().slice(0, limit);

  const clean = normalizeSearchTerm(query);
  const cleanCode = clean.replace(/[^A-Z0-9]/g, '');
  const all = getAllPdvs();

  return all
    .filter((p) => {
      const pdvNorm = normalizeSearchTerm(p.pdv).replace(/[^A-Z0-9]/g, '');
      const credNorm = normalizeSearchTerm(p.credenciado);
      const estNorm = normalizeSearchTerm(p.estado);
      const cidNorm = normalizeSearchTerm(p.cidade);

      return (
        pdvNorm.includes(cleanCode) ||
        credNorm.includes(clean) ||
        estNorm === clean ||
        cidNorm.includes(clean)
      );
    })
    .slice(0, limit);
}

/**
 * Localiza um PDV específico pelo código exato
 */
export function getPdvByCode(code) {
  if (!code) return null;
  const clean = normalizeSearchTerm(code).replace(/[^A-Z0-9]/g, '');
  const all = getAllPdvs();
  return all.find((p) => normalizeSearchTerm(p.pdv).replace(/[^A-Z0-9]/g, '') === clean) || null;
}

/**
 * Aplica os resultados do PDV ao formulário da Ata de Reunião
 */
export function applyPdvToFormData(pdvItem, prevFormData) {
  if (!pdvItem) return prevFormData;

  const taAtFormatted = pdvItem.taAtVig !== null ? formatPercent(pdvItem.taAtVig) : '';
  const taPpFormatted = pdvItem.taPpVig !== null ? formatPercent(pdvItem.taPpVig) : '';
  const retFormatted = pdvItem.retiradasVig !== null ? formatPercent(pdvItem.retiradasVig) : '';
  const reabAtFormatted = pdvItem.reabAtVig !== null ? formatPercent(pdvItem.reabAtVig) : '';
  const reabPpFormatted = pdvItem.reabPpVig !== null ? formatPercent(pdvItem.reabPpVig) : '';
  const permFormatted = pdvItem.pctPos !== null ? formatPercent(pdvItem.pctPos) : (pdvItem.permanencia || '');

  const vPos = Number(pdvItem.vendasPos ?? 0);
  const vNp = Number(pdvItem.vendasNp ?? 0);
  const vRec = Number(pdvItem.vendasRecarga ?? 0);
  const vChip = Number(pdvItem.vendasChip ?? 0);
  const vSeg = Number(pdvItem.vendasSeguro ?? 0);
  const retiradasAbertas = pdvItem.abertasRetiradasVig ? String(pdvItem.abertasRetiradasVig) : '';

  return {
    ...prevFormData,
    pdv: pdvItem.pdv,
    credenciado: pdvItem.credenciado || pdvItem.pdv,
    cidade: pdvItem.cidade || (pdvItem.estado ? `${pdvItem.estado} - Regional` : prevFormData.cidade),
    estoque: {
      ...prevFormData.estoque,
      retiradasDia: retiradasAbertas || prevFormData.estoque.retiradasDia
    },
    vendas: {
      ...prevFormData.vendas,
      vendasPos: vPos || prevFormData.vendas.vendasPos,
      vendasNp: vNp || prevFormData.vendas.vendasNp,
      vendasRecarga: vRec || prevFormData.vendas.vendasRecarga,
      vendasChip: vChip || prevFormData.vendas.vendasChip,
      vendasSeguro: vSeg || prevFormData.vendas.vendasSeguro,
      permanencia: permFormatted || prevFormData.vendas.permanencia
    },
    proprietario: {
      ...prevFormData.proprietario,
      indicadorTaAt: taAtFormatted || prevFormData.proprietario.indicadorTaAt,
      indicadorTaPp: taPpFormatted || prevFormData.proprietario.indicadorTaPp,
      indicadorRetiradas: retFormatted || prevFormData.proprietario.indicadorRetiradas,
      indicadorReaberturaAt: reabAtFormatted || prevFormData.proprietario.indicadorReaberturaAt,
      indicadorReaberturaPp: reabPpFormatted || prevFormData.proprietario.indicadorReaberturaPp,
      vendasPos: vPos || prevFormData.proprietario.vendasPos,
      vendasNp: vNp || prevFormData.proprietario.vendasNp,
      vendasRecarga: vRec || prevFormData.proprietario.vendasRecarga,
      vendasChip: vChip || prevFormData.proprietario.vendasChip,
      vendasSeguro: vSeg || prevFormData.proprietario.vendasSeguro,
      permanencia: permFormatted || prevFormData.proprietario.permanencia
    }
  };
}

/**
 * Atualiza os resultados de PDVs em segundo plano caso haja internet,
 * consultando a planilha mais recente do projeto SKY Correto.
 */
export async function refreshPdvsFromCloud() {
  try {
    const res = await fetch(
      'https://firestore.googleapis.com/v1/projects/resultado-credenciados/databases/(default)/documents/dadosPlanilha/principal'
    );
    if (!res.ok) return false;
    const doc = await res.json();
    const rows = doc.fields?.rows?.arrayValue?.values || [];
    if (!rows.length) return false;

    // Converte os dados do Firestore
    const currentList = [...getAllPdvs()];
    const map = new Map(currentList.map((p) => [p.pdv, p]));

    rows.forEach((fr) => {
      const f = fr.mapValue?.fields || {};
      const pdv = (f.PDV?.stringValue || '').trim().toUpperCase();
      if (!pdv) return;

      const getNum = (key) => {
        const v = f[key];
        if (!v) return null;
        if ('doubleValue' in v) return Number(v.doubleValue);
        if ('integerValue' in v) return Number(v.integerValue);
        return null;
      };

      const existing = map.get(pdv) || { pdv, credenciado: pdv, estado: '', cidade: '' };
      map.set(pdv, {
        ...existing,
        taAtVig: getNum('TA.AT PÓS MÊS VIRGENTE') ?? existing.taAtVig,
        taPpVig: getNum('TA.PP PÓS MÊS VIRGENTE') ?? existing.taPpVig,
        retiradasVig: getNum('RETIRADAS DE PÓS MÊS VIRGENTE') ?? existing.retiradasVig,
        reabAtVig: getNum('REABERTURA DE AT PÓS MÊS VIRGENTE') ?? existing.reabAtVig,
        reabPpVig: getNum('REABERTURA DE PP PÓS MÊS VIRGENTE') ?? existing.reabPpVig,
        abertasRetiradasVig: getNum('ABERTAS DE RETIRADAS PÓS MÊS VIRGENTE') ?? existing.abertasRetiradasVig,
        vendasPos: getNum('VND_POS') ?? existing.vendasPos,
        vendasNp: getNum('EQUIP_APONTADOS') ?? existing.vendasNp,
        vendasChip: getNum('SKY_MOVEL') ?? existing.vendasChip,
        vendasSeguro: getNum('VND_SEGUROS') ?? existing.vendasSeguro,
        pctPos: getNum('%_POS') ?? existing.pctPos
      });
    });

    const updated = Array.from(map.values()).sort((a, b) => a.pdv.localeCompare(b.pdv));
    localStorage.setItem(CACHE_KEY, JSON.stringify(updated));
    localStorage.setItem(CACHE_META_KEY, JSON.stringify({
      updatedAt: doc.fields?.updatedAt?.timestampValue || new Date().toISOString(),
      sourceName: doc.fields?.sourceName?.stringValue || 'Planilha Nuvem'
    }));
    return true;
  } catch (err) {
    console.warn('Erro ao atualizar PDVs da nuvem (usando dados locais):', err);
    return false;
  }
}
