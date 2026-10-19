import { SKY_PDVS_DATA, SKY_PDVS_METADATA } from '../data/skyPdvResultsData.js';

const CACHE_KEY = 'sky_pdv_results_cache_v1';
const CACHE_META_KEY = 'sky_pdv_results_meta_v1';
const CACHE_BKL_META_KEY = 'sky_bkl_meta_v1';

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
 * Processa as linhas de um snapshot de BKL e mapeia por PDV e por credenciado
 */
export function parseBklRows(rows, snapshotDate) {
  const bklMap = new Map();

  rows.forEach((r) => {
    const f = r.mapValue?.fields || {};
    const pdv = (f.pdv?.stringValue || '').trim().toUpperCase();
    const cred = (f.credenciado?.stringValue || '').trim();
    const serv = (f.servico?.stringValue || '').trim().toUpperCase();
    const ct = Number(f.ct?.integerValue ?? 0);

    const primaryKey = pdv || normalizeSearchTerm(cred);
    if (!primaryKey) return;

    if (!bklMap.has(primaryKey)) {
      bklMap.set(primaryKey, {
        pdv,
        credenciado: cred,
        data: snapshotDate,
        ac: 0,
        pp: 0,
        outros: 0,
        total: 0,
        vencidas: 0,
        vencidasAc: 0,
        vencidasPp: 0,
        maxCt: 0
      });
    }

    const item = bklMap.get(primaryKey);
    item.total++;
    if (ct > item.maxCt) item.maxCt = ct;

    const isAc = serv === 'AC' || serv === 'AT';
    const isPp = serv === 'PP' || serv === 'PS';

    if (isAc) {
      item.ac++;
      if (ct > 0) item.vencidasAc++;
    } else if (isPp) {
      item.pp++;
      if (ct > 0) item.vencidasPp++;
    } else {
      item.outros++;
    }

    if (ct > 0) {
      item.vencidas++;
    }
  });

  // Calcula tipoVencidas e cria chaves secundárias para busca rápida
  bklMap.forEach((item) => {
    if (item.vencidasAc > 0 && item.vencidasPp > 0) {
      item.tipoVencidas = 'Ambos';
    } else if (item.vencidasAc > 0) {
      item.tipoVencidas = 'AT';
    } else if (item.vencidasPp > 0) {
      item.tipoVencidas = 'PP';
    } else {
      item.tipoVencidas = 'Nenhuma';
    }

    // Se tiver nome de credenciado, indexa também pelo nome normalizado
    if (item.credenciado) {
      const credKey = normalizeSearchTerm(item.credenciado);
      if (!bklMap.has(credKey)) {
        bklMap.set(credKey, item);
      }
    }
  });

  return bklMap;
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
 * Aplica os resultados do PDV (Resultados + BKL) ao formulário da Ata de Reunião
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

  // Extrai dados de BKL (Backlog O.S.s) se disponíveis
  const bkl = pdvItem.bkl || null;
  const temVencidas = bkl ? bkl.vencidas > 0 : prevFormData.torreControle.temOsVencidas;
  const qtdVenc = bkl ? (bkl.vencidas > 0 ? bkl.vencidas : 0) : prevFormData.torreControle.qtdVencidas;
  const tipoVenc = bkl && bkl.vencidas > 0
    ? (bkl.tipoVencidas === 'Nenhuma' ? 'PP' : bkl.tipoVencidas)
    : prevFormData.torreControle.tipoVencidas;

  return {
    ...prevFormData,
    pdv: pdvItem.pdv,
    credenciado: pdvItem.credenciado || pdvItem.pdv,
    cidade: pdvItem.cidade || (pdvItem.estado ? `${pdvItem.estado} - Regional` : prevFormData.cidade),
    torreControle: {
      ...prevFormData.torreControle,
      osAtCaixa: bkl ? Number(bkl.ac ?? 0) : prevFormData.torreControle.osAtCaixa,
      osPpCaixa: bkl ? Number(bkl.pp ?? 0) : prevFormData.torreControle.osPpCaixa,
      temOsVencidas: temVencidas,
      qtdVencidas: qtdVenc,
      tipoVencidas: tipoVenc
    },
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
 * Retorna os metadados da última atualização da planilha (data e nome do arquivo)
 */
export function getPdvMetadata() {
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem(CACHE_META_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch (e) {
      console.warn('Erro ao ler metadados de PDVs:', e);
    }
  }
  return SKY_PDVS_METADATA;
}

/**
 * Retorna os metadados do último snapshot de BKL
 */
export function getBklMetadata() {
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem(CACHE_BKL_META_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch (e) {
      console.warn('Erro ao ler metadados de BKL:', e);
    }
  }
  return null;
}

/**
 * Atualiza os resultados de PDVs e BKL em tempo real consultando:
 * 1. A planilha de resultados mais recente (dadosPlanilha/principal)
 * 2. O snapshot de BKL mais recente (bklSnapshots)
 * Totalmente resiliente offline: se falhar ou sem rede, mantém os dados salvos localmente.
 */
export async function refreshPdvsFromCloud() {
  try {
    const timestamp = Date.now();
    const urlPlanilha = `https://firestore.googleapis.com/v1/projects/resultado-credenciados/databases/(default)/documents/dadosPlanilha/principal?t=${timestamp}`;
    const urlBkl = `https://firestore.googleapis.com/v1/projects/resultado-credenciados/databases/(default)/documents:runQuery?t=${timestamp}`;

    // Dispara requisições simultâneas com tolerância a falhas
    const [resPlanilha, resBkl] = await Promise.all([
      fetch(urlPlanilha, { cache: 'no-store', headers: { 'Accept': 'application/json' } }).catch(() => null),
      fetch(urlBkl, {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          structuredQuery: {
            from: [{ collectionId: 'bklSnapshots' }],
            orderBy: [{ field: { fieldPath: 'data' }, direction: 'DESCENDING' }],
            limit: 1
          }
        })
      }).catch(() => null)
    ]);

    // 1. Processa BKL se disponível
    let bklMap = new Map();
    let bklMeta = null;
    if (resBkl && resBkl.ok) {
      try {
        const bklJson = await resBkl.json();
        if (Array.isArray(bklJson) && bklJson.length > 0 && bklJson[0]?.document) {
          const bDoc = bklJson[0].document;
          const bRows = bDoc.fields?.rows?.arrayValue?.values || [];
          const bData = bDoc.fields?.data?.stringValue || new Date().toISOString().split('T')[0];
          const bTotal = Number(bDoc.fields?.totalOS?.integerValue ?? bRows.length);
          bklMeta = {
            data: bData,
            totalOS: bTotal,
            syncedAt: new Date().toISOString()
          };
          bklMap = parseBklRows(bRows, bData);
          localStorage.setItem(CACHE_BKL_META_KEY, JSON.stringify(bklMeta));
        }
      } catch (errBkl) {
        console.warn('Aviso: Falha ao interpretar BKL da nuvem:', errBkl);
      }
    }

    // 2. Processa Planilha Principal de Resultados
    if (!resPlanilha || !resPlanilha.ok) {
      console.warn('Aviso: Planilha principal indisponível na nuvem.');
      return { success: false, reason: 'Planilha principal indisponível' };
    }

    const doc = await resPlanilha.json();
    const rows = doc.fields?.rows?.arrayValue?.values || [];
    if (!rows.length) {
      return { success: false, reason: 'Nenhuma linha encontrada na planilha da nuvem' };
    }

    const sourceName = doc.fields?.sourceName?.stringValue || 'Planilha Nuvem';
    const updatedAt = doc.fields?.updatedAt?.timestampValue || new Date().toISOString();

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
      
      // Vincula BKL correspondente por código de PDV ou credenciado
      const bklInfo = bklMap.get(pdv) || bklMap.get(normalizeSearchTerm(existing.credenciado)) || null;

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
        pctPos: getNum('%_POS') ?? existing.pctPos,
        bkl: bklInfo || existing.bkl || null
      });
    });

    const updated = Array.from(map.values()).sort((a, b) => a.pdv.localeCompare(b.pdv));
    const meta = {
      updatedAt,
      sourceName,
      totalPdvs: updated.length,
      bklData: bklMeta?.data || null,
      bklTotalOS: bklMeta?.totalOS || 0,
      syncedAt: new Date().toISOString()
    };

    localStorage.setItem(CACHE_KEY, JSON.stringify(updated));
    localStorage.setItem(CACHE_META_KEY, JSON.stringify(meta));

    // Notifica componentes da atualização em tempo real
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sky:pdvs-updated', { detail: meta }));
    }

    return { success: true, meta, count: updated.length };
  } catch (err) {
    console.warn('Erro ao atualizar dados da nuvem (usando dados locais):', err);
    return { success: false, reason: err.message };
  }
}

