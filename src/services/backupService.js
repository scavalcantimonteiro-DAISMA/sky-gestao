import { db } from '../db';
import { formatDateBR } from './outlookService';
import { syncToCloudNow } from './cloudSyncService';

// Função auxiliar para download de arquivo no navegador
function downloadBlob(content, filename, contentType) {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// 1. Exporta backup completo de todos os dados em arquivo JSON
export async function exportBackupJSON() {
  const [atas, pendencias, rotinas] = await Promise.all([
    db.atas.toArray(),
    db.pendencias.toArray(),
    db.rotinas.toArray()
  ]);

  const backupData = {
    sistema: 'SKY Brasil - Gestão de Campo',
    version: 1,
    exportadoEm: new Date().toISOString(),
    dados: {
      atas,
      pendencias,
      rotinas
    }
  };

  const jsonStr = JSON.stringify(backupData, null, 2);
  const dataHoje = new Date().toISOString().split('T')[0];
  downloadBlob(jsonStr, `backup_sky_gestao_${dataHoje}.json`, 'application/json;charset=utf-8');
}

// 2. Restaura backup completo a partir de arquivo JSON
export async function importBackupJSON(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        if (!parsed.dados) {
          throw new Error('Arquivo de backup inválido.');
        }

        const { atas = [], pendencias = [], rotinas = [] } = parsed.dados;

        // Limpa e restaura
        await Promise.all([
          db.atas.clear(),
          db.pendencias.clear(),
          db.rotinas.clear()
        ]);

        if (atas.length > 0) await db.atas.bulkAdd(atas);
        if (pendencias.length > 0) await db.pendencias.bulkAdd(pendencias);
        if (rotinas.length > 0) await db.rotinas.bulkAdd(rotinas);

        await syncToCloudNow('Restaurou Backup', true);

        resolve({
          atasCount: atas.length,
          pendenciasCount: pendencias.length,
          rotinasCount: rotinas.length
        });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Erro ao ler o arquivo de backup.'));
    reader.readAsText(file);
  });
}

// 3. Exporta relatório de Atas de Visitas para Excel (CSV UTF-8 com ponto-e-vírgula)
export async function exportAtasToCSV() {
  const atas = await db.atas.toArray();
  atas.sort((a, b) => new Date(b.dataVisita) - new Date(a.dataVisita));

  const headers = [
    'Credenciado',
    'Cidade',
    'Data da Visita',
    'Supervisor',
    'OSs AT Caixa',
    'OSs PP Caixa',
    'OSs Vencidas',
    'Qtd Vencidas',
    'Tipo Vencidas',
    'Técnicos Campo',
    'Material Estoque',
    'Estoque Organizado',
    'Retiradas Dia',
    'Vendas Pós',
    'Vendas NP',
    'Vendas Recarga',
    'Vendas Chip',
    'Vendas Seguro',
    'Permanência (%)',
    'T.A de AT',
    'T.A de PP',
    'Retiradas (%)',
    'Reabertura AT',
    'Reabertura PP',
    'Total Pendências',
    'Assinado Proprietário'
  ];

  const escapeCSV = (val) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = atas.map((a) => {
    const tc = a.torreControle || {};
    const est = a.estoque || {};
    const ven = a.vendas || {};
    const prop = a.proprietario || {};
    const pCount = a.todasPendencias ? a.todasPendencias.length : 0;
    const assinado = prop.assinatura ? 'Sim' : 'Não';

    return [
      escapeCSV(a.credenciado),
      escapeCSV(a.cidade),
      escapeCSV(formatDateBR(a.dataVisita)),
      escapeCSV(a.supervisor || 'Supervisor SKY'),
      escapeCSV(tc.osAtCaixa ?? 0),
      escapeCSV(tc.osPpCaixa ?? 0),
      escapeCSV(tc.temOsVencidas ? 'Sim' : 'Não'),
      escapeCSV(tc.qtdVencidas ?? 0),
      escapeCSV(tc.tipoVencidas || '-'),
      escapeCSV(tc.tecnicosCampo ?? 0),
      escapeCSV(est.materialSuficiente || 'Sim'),
      escapeCSV(est.organizado || 'Sim'),
      escapeCSV(est.retiradasDia || '0'),
      escapeCSV(ven.vendasPos ?? 0),
      escapeCSV(ven.vendasNp ?? 0),
      escapeCSV(ven.vendasRecarga ?? 0),
      escapeCSV(ven.vendasChip ?? 0),
      escapeCSV(ven.vendasSeguro ?? 0),
      escapeCSV(ven.permanencia || '0%'),
      escapeCSV(prop.indicadorTaAt || '-'),
      escapeCSV(prop.indicadorTaPp || '-'),
      escapeCSV(prop.indicadorRetiradas || '-'),
      escapeCSV(prop.indicadorReaberturaAt || '-'),
      escapeCSV(prop.indicadorReaberturaPp || '-'),
      escapeCSV(pCount),
      escapeCSV(assinado)
    ].join(';');
  });

  // \uFEFF adiciona o BOM UTF-8 para o Microsoft Excel abrir com acentuação correta
  const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
  const dataHoje = new Date().toISOString().split('T')[0];
  downloadBlob(csvContent, `relatorio_visitas_sky_${dataHoje}.csv`, 'text/csv;charset=utf-8');
}

// 4. Exporta quadro de pendências para Excel (CSV UTF-8)
export async function exportPendenciasToCSV() {
  const pendencias = await db.pendencias.toArray();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const headers = [
    'Credenciado',
    'Setor',
    'Descrição da Pendência',
    'Prioridade',
    'Status',
    'Data de Criação',
    'Dias na Tela',
    'Data de Execução'
  ];

  const escapeCSV = (val) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = pendencias.map((p) => {
    let daysOnScreen = 0;
    if (p.dataCriacao) {
      const [y, m, d] = p.dataCriacao.split('T')[0].split('-').map(Number);
      const cDate = new Date(y, m - 1, d);
      daysOnScreen = Math.max(0, Math.floor((today - cDate) / (1000 * 60 * 60 * 24)));
    }

    return [
      escapeCSV(p.credenciado),
      escapeCSV(p.setor),
      escapeCSV(p.descricao),
      escapeCSV(p.prioridade ? p.prioridade.toUpperCase() : 'MÉDIA'),
      escapeCSV(p.status === 'executado' ? 'Executado' : 'Pendente'),
      escapeCSV(formatDateBR(p.dataCriacao)),
      escapeCSV(daysOnScreen),
      escapeCSV(p.dataExecucao ? formatDateBR(p.dataExecucao) : '-')
    ].join(';');
  });

  const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
  const dataHoje = new Date().toISOString().split('T')[0];
  downloadBlob(csvContent, `pendencias_sky_${dataHoje}.csv`, 'text/csv;charset=utf-8');
}
