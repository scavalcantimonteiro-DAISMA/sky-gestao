import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatDateBR } from './outlookService';

export function generateAtaPDF(ata) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const redColor = [225, 29, 72]; // Rose-600 SKY Red
  const darkNavy = [15, 23, 42]; // Slate-900

  // 1. Cabeçalho Corporativo
  doc.setFillColor(...redColor);
  doc.rect(0, 0, 210, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('SKY BRASIL - GESTÃO DE CAMPO', 14, 12);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('ATA DE REUNIÃO & CHECKLIST DE VISITA', 14, 18);

  const dataFormatada = formatDateBR(ata.dataVisita);
  doc.text(`Data: ${dataFormatada}`, 196, 18, { align: 'right' });

  // 2. Dados Gerais da Visita
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(14, 28, 182, 22, 2, 2, 'F');

  doc.setTextColor(...darkNavy);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Credenciado:', 18, 35);
  doc.setFont('helvetica', 'normal');
  doc.text(ata.credenciado || 'Não informado', 42, 35);

  doc.setFont('helvetica', 'bold');
  doc.text('Cidade:', 18, 43);
  doc.setFont('helvetica', 'normal');
  doc.text(ata.cidade || 'Não informada', 33, 43);

  doc.setFont('helvetica', 'bold');
  doc.text('Supervisor:', 110, 35);
  doc.setFont('helvetica', 'normal');
  doc.text(ata.supervisor || 'Supervisor SKY', 132, 35);

  let currentY = 54;

  const tc = ata.torreControle || {};
  const est = ata.estoque || {};
  const ven = ata.vendas || {};
  const prop = ata.proprietario || {};

  // 3. Tabela: Torre de Controle
  autoTable(doc, {
    startY: currentY,
    head: [['1. TORRE DE CONTROLE', 'VALOR / RESPOSTA']],
    body: [
      ['O.S.s de Assistência Técnica (AT) em Caixa', String(tc.osAtCaixa ?? 0)],
      ['O.S.s de Pré-Pago (PP) em Caixa', String(tc.osPpCaixa ?? 0)],
      ['Possui O.S.s Vencidas?', tc.temOsVencidas ? `SIM (${tc.qtdVencidas || 0} - Tipo: ${tc.tipoVencidas || 'N/A'})` : 'NÃO'],
      ['Técnicos em Campo', String(tc.tecnicosCampo ?? 0)],
      ['Pendências da Torre', tc.pendencia || 'Nenhuma pendência']
    ],
    theme: 'grid',
    headStyles: { fillColor: redColor, textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 8.5, cellPadding: 2 },
    columnStyles: { 0: { cellWidth: 100 }, 1: { cellWidth: 82 } },
    margin: { left: 14, right: 14 }
  });

  currentY = doc.lastAutoTable.finalY + 6;

  // 4. Tabela: Estoque
  autoTable(doc, {
    startY: currentY,
    head: [['2. ESTOQUE', 'VALOR / RESPOSTA']],
    body: [
      ['Material suficiente para a semana?', est.materialSuficiente || 'Sim'],
      ['Estoque organizado?', est.organizado || 'Sim'],
      ['Resultado de retiradas do dia', est.retiradasDia || '0'],
      ['Pendências de Estoque', est.pendencia || 'Nenhuma pendência']
    ],
    theme: 'grid',
    headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 8.5, cellPadding: 2 },
    columnStyles: { 0: { cellWidth: 100 }, 1: { cellWidth: 82 } },
    margin: { left: 14, right: 14 }
  });

  currentY = doc.lastAutoTable.finalY + 6;

  // 5. Tabela: Vendas
  autoTable(doc, {
    startY: currentY,
    head: [['3. VENDAS', 'VALOR / QUANTIDADE']],
    body: [
      ['Vendas de Pós-Pago', String(ven.vendasPos ?? 0)],
      ['Vendas de Novos Produtos (NP)', String(ven.vendasNp ?? 0)],
      ['Vendas de Recarga', String(ven.vendasRecarga ?? 0)],
      ['Vendas de Chip', String(ven.vendasChip ?? 0)],
      ['Vendas de Seguro', String(ven.vendasSeguro ?? 0)],
      ['Permanência (%)', ven.permanencia || '0%'],
      ['Pendências de Vendas', ven.pendencia || 'Nenhuma pendência']
    ],
    theme: 'grid',
    headStyles: { fillColor: redColor, textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 8.5, cellPadding: 2 },
    columnStyles: { 0: { cellWidth: 100 }, 1: { cellWidth: 82 } },
    margin: { left: 14, right: 14 }
  });

  currentY = doc.lastAutoTable.finalY + 6;

  // Verifica se precisa quebrar página antes do Proprietário
  if (currentY > 210) {
    doc.addPage();
    currentY = 20;
  }

  // 6. Tabela: Proprietário & Serviços
  autoTable(doc, {
    startY: currentY,
    head: [['4. PROPRIETÁRIO & SERVIÇOS (ALINHAMENTO)', 'VALOR / INDICADOR']],
    body: [
      ['Indicador T.A de AT', prop.indicadorTaAt || 'N/A'],
      ['Indicador T.A de PP', prop.indicadorTaPp || 'N/A'],
      ['Indicador de Retiradas', prop.indicadorRetiradas || 'N/A'],
      ['Indicador de Reabertura (AT / PP)', `AT: ${prop.indicadorReaberturaAt || 'N/A'} | PP: ${prop.indicadorReaberturaPp || 'N/A'}`],
      ['Alinhamento de Vendas (Confirmado)', `Pós: ${prop.vendasPos ?? ven.vendasPos ?? 0} | NP: ${prop.vendasNp ?? ven.vendasNp ?? 0} | Rec: ${prop.vendasRecarga ?? ven.vendasRecarga ?? 0} | Chip: ${prop.vendasChip ?? ven.vendasChip ?? 0} | Perm: ${prop.permanencia || ven.permanencia || '0%'}`],
      ['Resumo da Conversa com Proprietário', prop.conversaAlinhamento || 'Alinhamento geral com o credenciado'],
      ['Pendências do Alinhamento', prop.pendencia || 'Nenhuma pendência']
    ],
    theme: 'grid',
    headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 8.5, cellPadding: 2 },
    columnStyles: { 0: { cellWidth: 100 }, 1: { cellWidth: 82 } },
    margin: { left: 14, right: 14 }
  });

  currentY = doc.lastAutoTable.finalY + 6;

  // 7. Lista Consolidada de Pendências
  if (currentY > 220) {
    doc.addPage();
    currentY = 20;
  }

  const pendenciasRows = (ata.todasPendencias && ata.todasPendencias.length > 0)
    ? ata.todasPendencias.map((p, idx) => [String(idx + 1), p.setor, p.descricao, 'Pendente'])
    : [['-', 'Geral', 'Nenhuma pendência crítica identificada nesta visita', 'OK']];

  autoTable(doc, {
    startY: currentY,
    head: [['#', 'SETOR', 'DESCRIÇÃO DA PENDÊNCIA / AÇÃO', 'STATUS']],
    body: pendenciasRows,
    theme: 'grid',
    headStyles: { fillColor: redColor, textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 8, cellPadding: 2 },
    columnStyles: { 0: { cellWidth: 10 }, 1: { cellWidth: 40 }, 2: { cellWidth: 105 }, 3: { cellWidth: 27 } },
    margin: { left: 14, right: 14 }
  });

  currentY = doc.lastAutoTable.finalY + 8;

  // 8. Bloco de Assinaturas Formais
  if (currentY > 230) {
    doc.addPage();
    currentY = 25;
  } else {
    currentY += 8;
  }

  const supervisorName = ata.supervisor || 'Supervisor de Campo SKY';
  const credenciadoName = ata.credenciado || 'Proprietário do Credenciado';

  // Assinatura do Supervisor (Lado Esquerdo)
  doc.setDrawColor(148, 163, 184);
  doc.line(18, currentY + 18, 95, currentY + 18);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...darkNavy);
  doc.text(supervisorName, 56, currentY + 22, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Supervisor de Campo SKY Brasil', 56, currentY + 26, { align: 'center' });

  // Assinatura do Proprietário com desenho na tela (Lado Direito)
  doc.setDrawColor(148, 163, 184);
  doc.line(115, currentY + 18, 192, currentY + 18);
  
  if (prop.assinatura) {
    try {
      doc.addImage(prop.assinatura, 'PNG', 125, currentY - 2, 55, 18);
    } catch (e) {
      console.warn('Erro ao inserir assinatura no PDF:', e);
    }
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...darkNavy);
  doc.text(credenciadoName, 153, currentY + 22, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Proprietário / Gestor do Credenciado', 153, currentY + 26, { align: 'center' });

  currentY += 34;

  // 9. Seção de Fotos Anexadas (se houver fotos nos setores)
  const photos = [
    { title: 'Torre de Controle', data: tc.foto },
    { title: 'Estoque', data: est.foto },
    { title: 'Vendas', data: ven.foto },
    { title: 'Proprietário', data: prop.foto }
  ].filter((item) => !!item.data);

  if (photos.length > 0) {
    doc.addPage();
    doc.setFillColor(...redColor);
    doc.rect(0, 0, 210, 16, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('REGISTRO FOTOGRÁFICO DA VISITA', 14, 11);

    let photoY = 24;
    for (let i = 0; i < photos.length; i++) {
      const p = photos[i];
      if (photoY + 70 > 280) {
        doc.addPage();
        photoY = 20;
      }
      doc.setTextColor(...darkNavy);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(`Foto: Setor ${p.title}`, 14, photoY);

      try {
        doc.addImage(p.data, 'JPEG', 14, photoY + 3, 85, 60);
      } catch (e) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        doc.text('(Foto anexada disponível no app)', 14, photoY + 8);
      }

      photoY += 70;
    }
  }

  // Rodapé em todas as páginas
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Página ${i} de ${pageCount} - Gerado automaticamente via SKY Gestão de Campo`,
      105,
      290,
      { align: 'center' }
    );
  }

  // Salva o PDF
  const nomeArquivo = `ATA_${(ata.credenciado || 'Credenciado').replace(/[^a-zA-Z0-9]/g, '_')}_${dataFormatada.replace(/\//g, '-')}.pdf`;
  doc.save(nomeArquivo);
}
