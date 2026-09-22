// Formata data brasileira DD/MM/AAAA
export function formatDateBR(dateString) {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('T')[0].split('-');
  return `${day}/${month}/${year}`;
}

// Constrói o texto completo e organizado da ATA para o corpo do e-mail
export function formatAtaEmailBody(ata) {
  const dataFormatada = formatDateBR(ata.dataVisita);
  
  let pendenciasTexto = '';
  if (ata.todasPendencias && ata.todasPendencias.length > 0) {
    pendenciasTexto = ata.todasPendencias
      .map((p, idx) => `  ${idx + 1}. [${p.setor}] ${p.descricao}`)
      .join('\n');
  } else {
    pendenciasTexto = '  Nenhuma pendência registrada nesta visita.';
  }

  const tc = ata.torreControle || {};
  const est = ata.estoque || {};
  const ven = ata.vendas || {};
  const prop = ata.proprietario || {};

  return `ATA DE REUNIÃO E CHECKLIST DE VISITA - SKY BRASIL
=============================================================
Credenciado: ${ata.credenciado}
Cidade: ${ata.cidade}
Data da Visita: ${dataFormatada}
Supervisor de Campo: ${ata.supervisor || 'Supervisor SKY'}
=============================================================

1. TORRE DE CONTROLE
-------------------------------------------------------------
- O.S.s de Assistência Técnica (AT) em Caixa: ${tc.osAtCaixa ?? 0}
- O.S.s de Pré-Pago (PP) em Caixa: ${tc.osPpCaixa ?? 0}
- O.S.s Vencidas: ${tc.temOsVencidas ? `SIM (${tc.qtdVencidas || 0} O.S.s - Tipo: ${tc.tipoVencidas || 'N/A'})` : 'NÃO'}
- Técnicos em Campo: ${tc.tecnicosCampo ?? 0}
- Pendências da Torre: ${tc.pendencia ? tc.pendencia : 'Sem pendências'}

2. ESTOQUE
-------------------------------------------------------------
- Material suficiente para a semana: ${est.materialSuficiente || 'Sim'}
- Estoque organizado: ${est.organizado || 'Sim'}
- Resultado de retiradas do dia: ${est.retiradasDia || '0'}
- Pendências do Estoque: ${est.pendencia ? est.pendencia : 'Sem pendências'}

3. VENDAS
-------------------------------------------------------------
- Vendas de Pós: ${ven.vendasPos ?? 0}
- Vendas de Novos Produtos (NP): ${ven.vendasNp ?? 0}
- Vendas de Recarga: ${ven.vendasRecarga ?? 0}
- Vendas de Chip: ${ven.vendasChip ?? 0}
- Vendas de Seguro: ${ven.vendasSeguro ?? 0}
- Permanência: ${ven.permanencia || '0%'}
- Pendências de Vendas: ${ven.pendencia ? ven.pendencia : 'Sem pendências'}

4. PROPRIETÁRIO & SERVIÇOS (ALINHAMENTO)
-------------------------------------------------------------
- Indicador T.A de AT: ${prop.indicadorTaAt || 'N/A'}
- Indicador T.A de PP: ${prop.indicadorTaPp || 'N/A'}
- Indicador de Retiradas: ${prop.indicadorRetiradas || 'N/A'}
- Indicador de Reabertura de AT: ${prop.indicadorReaberturaAt || 'N/A'}
- Indicador de Reabertura de PP: ${prop.indicadorReaberturaPp || 'N/A'}
- Alinhamento de Vendas:
  * Pós: ${prop.vendasPos ?? ven.vendasPos ?? 0} | NP: ${prop.vendasNp ?? ven.vendasNp ?? 0} | Recarga: ${prop.vendasRecarga ?? ven.vendasRecarga ?? 0}
  * Chip: ${prop.vendasChip ?? ven.vendasChip ?? 0} | Seguro: ${prop.vendasSeguro ?? ven.vendasSeguro ?? 0} | Permanência: ${prop.permanencia || ven.permanencia || '0%'}
- Resumo da Conversa e Alinhamento:
  ${prop.conversaAlinhamento ? prop.conversaAlinhamento : 'Alinhamento geral com a gestão do credenciado.'}
- Pendências com o Proprietário: ${prop.pendencia ? prop.pendencia : 'Sem pendências'}

=============================================================
CONSOLIDAÇÃO DE PENDÊNCIAS DA VISITA
=============================================================
${pendenciasTexto}

-------------------------------------------------------------
Ata gerada via App SKY Gestão de Campo.
`;
}

// Abre o aplicativo do Outlook no celular ou computador com o assunto e corpo prontos
export function openOutlookEmailForAta(ata) {
  const dataFormatada = formatDateBR(ata.dataVisita);
  const subject = `ATA de Reunião Credenciado ${ata.credenciado} data ${dataFormatada}`;
  const body = formatAtaEmailBody(ata);

  // Utiliza mailto com encoding apropriado
  const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  
  // Tenta abrir o cliente de email / Outlook
  window.location.href = mailtoUrl;
}

// Copia o corpo da Ata para a área de transferência
export async function copyAtaToClipboard(ata) {
  const body = formatAtaEmailBody(ata);
  await navigator.clipboard.writeText(body);
  return true;
}

// Cria e baixa arquivo .ics para adicionar eventos e rotinas ao Calendário do Outlook
export function downloadIcsFile(title, description, startDate, endDate) {
  const formatDateToICS = (date) => {
    return date.toISOString().replace(/-|:|\.\d+/g, '');
  };

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SKY Brasil//Gestão de Campo//PT',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `SUMMARY:${title}`,
    `DESCRIPTION:${description.replace(/\n/g, '\\n')}`,
    `DTSTART:${formatDateToICS(new Date(startDate))}`,
    `DTEND:${formatDateToICS(new Date(endDate))}`,
    `STATUS:CONFIRMED`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${title.replace(/[^a-zA-Z0-9]/g, '_')}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Cria link direto para abrir no Outlook Web Calendar
export function openOutlookWebCalendar(title, description, startDateTime, endDateTime) {
  const startISO = new Date(startDateTime).toISOString();
  const endISO = new Date(endDateTime).toISOString();
  const url = `https://outlook.live.com/calendar/0/deeplink/compose?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(description)}&startdt=${encodeURIComponent(startISO)}&enddt=${encodeURIComponent(endISO)}`;
  window.open(url, '_blank');
}
