import { db } from '../db';
import {
  sendNtfyNotification,
  scheduleRoutineOnNtfyServer,
  isNtfyKeyScheduled,
  markNtfyKeyScheduled
} from './ntfyService';

const BANNER_ACK_KEY = 'sky_gestao_notif_banner_ack';

export function isNotificationBannerAcknowledged() {
  return localStorage.getItem(BANNER_ACK_KEY) === 'true';
}

export function setNotificationBannerAcknowledged(val = true) {
  localStorage.setItem(BANNER_ACK_KEY, val ? 'true' : 'false');
}

// Data local brasileira (YYYY-MM-DD) sem distorção de UTC
export function getLocalTodayStr(dateObj = new Date()) {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Reproduz um som agradável de sino/alerta usando Web Audio API nativa
export function playNotificationSound() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    // Primeiro tom
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    gain1.gain.setValueAtTime(0.2, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start();
    osc1.stop(ctx.currentTime + 0.4);

    // Segundo tom mais alto
    setTimeout(() => {
      try {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(880, ctx.currentTime); // A5
        gain2.gain.setValueAtTime(0.3, ctx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start();
        osc2.stop(ctx.currentTime + 0.6);
      } catch (e) {
        console.warn('AudioContext second tone err', e);
      }
    }, 150);
  } catch (err) {
    console.warn('Não foi possível tocar áudio de notificação:', err);
  }
}

// Verifica e solicita permissão de notificação (compatível com Safari iOS, Android e Desktop)
export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    setNotificationBannerAcknowledged(true);
    return 'unsupported';
  }
  if (Notification.permission === 'granted') {
    setNotificationBannerAcknowledged(true);
    return 'granted';
  }
  try {
    // Suporta tanto retorno em Promise quanto callback antigo do Safari
    const permission = await new Promise((resolve) => {
      try {
        const maybePromise = Notification.requestPermission((res) => resolve(res));
        if (maybePromise && typeof maybePromise.then === 'function') {
          maybePromise.then(resolve).catch(() => resolve(Notification.permission));
        }
      } catch (e) {
        resolve(Notification.permission || 'denied');
      }
    });
    setNotificationBannerAcknowledged(true);
    return permission;
  } catch (err) {
    setNotificationBannerAcknowledged(true);
    return Notification.permission || 'denied';
  }
}

// Dispara uma notificação nativa + Push ntfy + Toast na tela
export async function showNativeNotification(title, options = {}) {
  playNotificationSound();

  const defaultOptions = {
    icon: '/icon.svg',
    badge: '/icon.svg',
    vibrate: [200, 100, 200, 100, 200],
    ...options
  };

  // Dispara evento interno para atualizar toasts na tela
  window.dispatchEvent(
    new CustomEvent('sky-app-alert', {
      detail: { title, body: options.body || '' }
    })
  );

  // Envia também para o ntfy por padrão, exceto quando explicitamente desativado (ex: já pré-agendado)
  if (options.sendNtfy !== false) {
    sendNtfyNotification({
      title,
      message: options.body || title,
      priority: options.priority || 'urgent',
      tags: options.tags || ['alarm_clock', 'bell', 'sky']
    });
  }

  if ('Notification' in window && Notification.permission === 'granted') {
    if ('serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.ready;
        if (reg && reg.showNotification) {
          return await reg.showNotification(title, defaultOptions);
        }
      } catch (e) {
        // Fallback para new Notification
      }
    }
    try {
      return new Notification(title, defaultOptions);
    } catch (e) {
      console.warn('Erro ao criar new Notification:', e);
    }
  }
}

// Verifica se o dia corresponde aos dias selecionados (1=Segunda ... 7=Domingo)
function isDateInRoutineDays(routineDays = [], dateObj = new Date()) {
  const day = dateObj.getDay(); // 0=Dom, 1=Seg...
  const mappedDay = day === 0 ? 7 : day;
  return routineDays.includes(mappedDay);
}

// Sincroniza todas as rotinas ativas de hoje e de amanhã no servidor ntfy.sh
export async function syncAllRoutinesWithNtfy() {
  try {
    const todasRotinas = await db.rotinas.toArray();
    const today = new Date();
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);

    for (const rotina of todasRotinas) {
      if (rotina.ativo === false || rotina.notificacaoAtiva === false) continue;
      await scheduleRoutineOnNtfyServer(rotina, today);
      await scheduleRoutineOnNtfyServer(rotina, tomorrow);
    }
  } catch (err) {
    console.warn('Erro ao sincronizar rotinas com ntfy:', err);
  }
}

// Checa rotinas (20 min antes E na hora exata) e dispara alerta Local + Push ntfy
export async function checkRoutineReminders() {
  const now = new Date();
  const currentMinutesFromMidnight = now.getHours() * 60 + now.getMinutes();
  const todayStr = getLocalTodayStr(now);

  try {
    const todasRotinas = await db.rotinas.toArray();

    for (const rotina of todasRotinas) {
      if (rotina.ativo === false || rotina.notificacaoAtiva === false) continue;

      // Garante que agendamentos futuros de hoje estejam registrados na nuvem ntfy
      await scheduleRoutineOnNtfyServer(rotina, now);

      if (!isDateInRoutineDays(rotina.dias, now)) continue;
      if (!rotina.horario || !rotina.horario.includes(':')) continue;

      const [hStr, mStr] = rotina.horario.split(':');
      const routineHour = parseInt(hStr, 10);
      const routineMinute = parseInt(mStr, 10);
      const routineMinutesFromMidnight = routineHour * 60 + routineMinute;

      // 1) Alerta de 20 minutos antes
      let targetAlertMinute = routineMinutesFromMidnight - 20;
      if (targetAlertMinute < 0) {
        targetAlertMinute += 1440;
      }

      const isWithinPreWindow =
        currentMinutesFromMidnight >= targetAlertMinute &&
        currentMinutesFromMidnight < routineMinutesFromMidnight;

      if (isWithinPreWindow && rotina.ultimoAlertaData !== todayStr) {
        const minutesLeft = routineMinutesFromMidnight - currentMinutesFromMidnight;
        const msgTempo = minutesLeft > 0 ? `em ${minutesLeft} min` : 'agora';
        const preKey = `rotina_pre20_${rotina.id}_${todayStr}_${rotina.horario}`;
        const alreadyOnNtfy = isNtfyKeyScheduled(preKey);

        await showNativeNotification(`⏰ Rotina SKY: ${rotina.titulo} (${msgTempo})!`, {
          body: `Sua rotina "${rotina.titulo}" começa às ${rotina.horario}. ${rotina.descricao || ''}`,
          tag: `rotina-pre-${rotina.id}-${todayStr}`,
          sendNtfy: !alreadyOnNtfy
        });

        if (!alreadyOnNtfy) markNtfyKeyScheduled(preKey);
        await db.rotinas.update(rotina.id, { ultimoAlertaData: todayStr });
      }

      // 2) Alerta na HORA EXATA da rotina (janela de até 15 min após o horário caso o app seja aberto em seguida)
      const isWithinExactWindow =
        currentMinutesFromMidnight >= routineMinutesFromMidnight &&
        currentMinutesFromMidnight <= routineMinutesFromMidnight + 15;

      if (isWithinExactWindow && rotina.ultimoAlertaExatoData !== todayStr) {
        const exactKey = `rotina_exact_${rotina.id}_${todayStr}_${rotina.horario}`;
        const alreadyOnNtfy = isNtfyKeyScheduled(exactKey);

        await showNativeNotification(`🔔 HORA DA ROTINA (${rotina.horario}): ${rotina.titulo}`, {
          body: `Está na hora de executar: ${rotina.titulo}. ${rotina.descricao || ''}`,
          tag: `rotina-exact-${rotina.id}-${todayStr}`,
          sendNtfy: !alreadyOnNtfy
        });

        if (!alreadyOnNtfy) markNtfyKeyScheduled(exactKey);
        await db.rotinas.update(rotina.id, { ultimoAlertaExatoData: todayStr });
      }
    }
  } catch (err) {
    console.error('Erro ao verificar lembretes de rotinas:', err);
  }
}

// Checa pendências com lembrete agendado (calendário ou prazo em horas)
export async function checkPendenciasReminders() {
  const now = new Date();
  const currentTimestamp = now.getTime();

  try {
    const pendencias = await db.pendencias.toArray();
    for (const p of pendencias) {
      if (p.status !== 'pendente' || !p.lembreteEm) continue;
      const lembreteTime = new Date(p.lembreteEm).getTime();

      // Dispara se o horário do lembrete já chegou e ainda não foi alertado
      if (currentTimestamp >= lembreteTime && !p.lembreteDisparado) {
        const pKey = `pendencia_rem_${p.id}_${p.lembreteEm}`;
        const alreadySent = isNtfyKeyScheduled(pKey);

        await showNativeNotification(`⏰ Lembrete de Pendência: ${p.credenciado || 'Geral'}`, {
          body: `[${p.setor || 'Geral'}] ${p.descricao}`,
          tag: `pendencia-${p.id}`,
          sendNtfy: !alreadySent
        });

        markNtfyKeyScheduled(pKey);
        await db.pendencias.update(p.id, { lembreteDisparado: true });
      }
    }
  } catch (err) {
    console.error('Erro ao verificar lembretes de pendências:', err);
  }
}

/**
 * Constrói o texto do Resumo Matinal das 08:00h (Todas as Pendências em Aberto + Rotinas do Dia)
 */
export async function buildMorningSummaryPayload() {
  const [pendencias, rotinas] = await Promise.all([
    db.pendencias.toArray(),
    db.rotinas.toArray()
  ]);

  const now = new Date();
  const abertas = pendencias.filter((p) => p.status === 'pendente');
  const rotinasHoje = rotinas
    .filter((r) => r.ativo !== false && isDateInRoutineDays(r.dias, now))
    .sort((a, b) => (a.horario || '').localeCompare(b.horario || ''));

  let lines = [];

  if (abertas.length === 0) {
    lines.push('✅ Nenhuma pendência em aberto no momento!');
  } else {
    lines.push(`📌 ${abertas.length} PENDÊNCIA(S) EM ABERTO:`);
    abertas.slice(0, 12).forEach((p, idx) => {
      lines.push(`${idx + 1}. [${p.credenciado || 'Geral'} - ${p.setor || 'Geral'}] ${p.descricao}`);
    });
    if (abertas.length > 12) {
      lines.push(`...e mais ${abertas.length - 12} pendência(s) no painel.`);
    }
  }

  if (rotinasHoje.length > 0) {
    lines.push('');
    lines.push(`⏰ ROTINAS DE HOJE (${rotinasHoje.length}):`);
    rotinasHoje.forEach((r) => {
      lines.push(`• ${r.horario} - ${r.titulo}`);
    });
  }

  return {
    title: `☀️ Bom Dia SKY (08:00) • ${abertas.length} Pendência(s) para Hoje`,
    message: lines.join('\n'),
    abertasCount: abertas.length,
    rotinasCount: rotinasHoje.length
  };
}

/**
 * Constrói o texto do Balanço das 18:00h (Concluídas no dia vs Não Concluídas em Aberto)
 */
export async function buildEveningSummaryPayload() {
  const pendencias = await db.pendencias.toArray();
  const todayStr = getLocalTodayStr();

  const concluidasHoje = pendencias.filter(
    (p) => p.status === 'executado' && p.dataExecucao === todayStr
  );
  const todasConcluidas = pendencias.filter((p) => p.status === 'executado');
  const emAberto = pendencias.filter((p) => p.status === 'pendente');

  let lines = [];

  // Bloco 1: Concluídas Hoje
  lines.push(`✅ CONCLUÍDAS HOJE: ${concluidasHoje.length} (Total concluídas: ${todasConcluidas.length})`);
  if (concluidasHoje.length > 0) {
    concluidasHoje.slice(0, 8).forEach((p) => {
      lines.push(`  ✔ [${p.credenciado || 'Geral'}] ${p.descricao}`);
    });
    if (concluidasHoje.length > 8) {
      lines.push(`  ...e mais ${concluidasHoje.length - 8} concluída(s) hoje.`);
    }
  } else {
    lines.push('  • Nenhuma pendência marcada como concluída hoje.');
  }

  lines.push('');

  // Bloco 2: Não Concluídas / Em Aberto
  lines.push(`⚠️ NÃO CONCLUÍDAS (EM ABERTO): ${emAberto.length}`);
  if (emAberto.length > 0) {
    emAberto.slice(0, 10).forEach((p, idx) => {
      lines.push(`  ${idx + 1}. [${p.credenciado || 'Geral'} - ${p.setor || 'Geral'}] ${p.descricao}`);
    });
    if (emAberto.length > 10) {
      lines.push(`  ...e mais ${emAberto.length - 10} em aberto para amanhã.`);
    }
  } else {
    lines.push('  🎉 Parabéns! Todas as pendências foram concluídas!');
  }

  return {
    title: `🌙 Balanço do Dia SKY (18:00) • ✅ ${concluidasHoje.length} Feita(s) | ⚠️ ${emAberto.length} Pendente(s)`,
    message: lines.join('\n'),
    concluidasHojeCount: concluidasHoje.length,
    emAbertoCount: emAberto.length
  };
}

/**
 * Dispara imediatamente o Resumo Matinal das 08:00h (no celular via ntfy e na tela)
 */
export async function triggerMorningSummaryNow() {
  const summary = await buildMorningSummaryPayload();
  await showNativeNotification(summary.title, {
    body: summary.message,
    tag: `resumo-matinal-${getLocalTodayStr()}`,
    priority: 'urgent',
    tags: ['sunny', 'clipboard', 'bell'],
    sendNtfy: true
  });
  return summary;
}

/**
 * Dispara imediatamente o Balanço das 18:00h (no celular via ntfy e na tela)
 */
export async function triggerEveningSummaryNow() {
  const summary = await buildEveningSummaryPayload();
  await showNativeNotification(summary.title, {
    body: summary.message,
    tag: `resumo-noite-${getLocalTodayStr()}`,
    priority: 'urgent',
    tags: ['First_quarter_moon_with_face', 'bar_chart', 'bell'],
    sendNtfy: true
  });
  return summary;
}

/**
 * Verifica e dispara automaticamente os relatórios das 08:00h e das 18:00h,
 * além de pré-agendar no servidor ntfy.sh para garantir entrega mesmo com tela bloqueada
 */
export async function checkDailySummaries() {
  const now = new Date();
  const todayStr = getLocalTodayStr(now);
  const hour = now.getHours();
  const nowMs = now.getTime();

  try {
    // =========================================================================
    // 1. RESUMO MATINAL ÀS 08:00h
    // =========================================================================
    const morningKey = `daily_morning_08h_${todayStr}`;
    const morningPreKey = `daily_morning_pre_08h_${todayStr}`;

    // Se ainda é antes das 08:00h de hoje, pré-agenda no ntfy para tocar às 08:00:00 em ponto
    const today8am = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 0, 0, 0);
    if (today8am.getTime() > nowMs + 60000 && !isNtfyKeyScheduled(morningPreKey)) {
      const summary = await buildMorningSummaryPayload();
      const ok = await sendNtfyNotification({
        title: summary.title,
        message: summary.message,
        priority: 'urgent',
        tags: ['sunny', 'clipboard', 'bell'],
        delay: Math.floor(today8am.getTime() / 1000)
      });
      if (ok) {
        markNtfyKeyScheduled(morningPreKey);
        markNtfyKeyScheduled(morningKey);
      }
    }

    // Se já deu 08:00h (entre 08:00 e 12:59) e ainda não enviou hoje, dispara agora!
    if (hour >= 8 && hour < 13 && !isNtfyKeyScheduled(morningKey)) {
      markNtfyKeyScheduled(morningKey);
      await triggerMorningSummaryNow();
    }

    // =========================================================================
    // 2. BALANÇO DO FIM DO DIA ÀS 18:00h (Concluídas vs Não Concluídas)
    // =========================================================================
    const eveningKey = `daily_evening_18h_${todayStr}`;

    // Quando dá 18:00h (ou entre 18:00 e 23:59) e ainda não enviou hoje, dispara em tempo real
    if (hour >= 18 && !isNtfyKeyScheduled(eveningKey)) {
      markNtfyKeyScheduled(eveningKey);
      await triggerEveningSummaryNow();

      // E já pré-agenda o resumo de amanhã às 08:00h no servidor ntfy!
      const tomorrow = new Date(nowMs + 24 * 60 * 60 * 1000);
      const tomorrowStr = getLocalTodayStr(tomorrow);
      const tomorrow8am = new Date(
        tomorrow.getFullYear(),
        tomorrow.getMonth(),
        tomorrow.getDate(),
        8,
        0,
        0,
        0
      );
      const tomorrowPreKey = `daily_morning_pre_08h_${tomorrowStr}`;
      const tomorrowMorningKey = `daily_morning_08h_${tomorrowStr}`;

      if (!isNtfyKeyScheduled(tomorrowPreKey)) {
        const morningSummary = await buildMorningSummaryPayload();
        const ok = await sendNtfyNotification({
          title: morningSummary.title,
          message: morningSummary.message,
          priority: 'urgent',
          tags: ['sunny', 'clipboard', 'bell'],
          delay: Math.floor(tomorrow8am.getTime() / 1000)
        });
        if (ok) {
          markNtfyKeyScheduled(tomorrowPreKey);
          markNtfyKeyScheduled(tomorrowMorningKey);
        }
      }
    }
  } catch (err) {
    console.warn('Erro ao verificar resumos diários (08h/18h):', err);
  }
}

/**
 * Agenda preventivamente no servidor ntfy os próximos resumos de 08:00h e 18:00h
 * caso o usuário feche o app ou bloqueie o celular antes das 18:00h
 */
export async function scheduleUpcomingDailySummariesOnNtfy() {
  const now = new Date();
  const nowMs = now.getTime();
  const todayStr = getLocalTodayStr(now);

  try {
    // Se for entre 16:30 e 17:59 e o relatório das 18h ainda não foi agendado na nuvem,
    // agenda no ntfy para garantir que chegue às 18:00h mesmo com a tela apagada
    const today18h = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 18, 0, 0, 0);
    const eveningKey = `daily_evening_18h_${todayStr}`;
    const minutesUntil18h = (today18h.getTime() - nowMs) / 60000;

    if (minutesUntil18h > 1 && minutesUntil18h <= 90 && !isNtfyKeyScheduled(eveningKey)) {
      const summary = await buildEveningSummaryPayload();
      const ok = await sendNtfyNotification({
        title: summary.title,
        message: summary.message,
        priority: 'urgent',
        tags: ['bar_chart', 'bell', 'sky'],
        delay: Math.floor(today18h.getTime() / 1000)
      });
      if (ok) {
        markNtfyKeyScheduled(eveningKey);
      }
    }
  } catch (e) {
    console.warn('Erro ao pré-agendar resumo das 18h:', e);
  }
}

let reminderInterval = null;
let workerInstance = null;

function runAllChecks() {
  checkRoutineReminders();
  checkPendenciasReminders();
  checkDailySummaries();
  scheduleUpcomingDailySummariesOnNtfy();
}

// Inicia o monitoramento contínuo em segundo plano com Web Worker (não congela em aba minimizada)
export function startReminderWatcher() {
  if (reminderInterval || workerInstance) return;

  // 1. Executa verificação e sincronização imediata ao abrir
  runAllChecks();
  syncAllRoutinesWithNtfy();

  // 2. Cria Web Worker para manter o relógio rodando mesmo em segundo plano
  try {
    const workerCode = `
      setInterval(() => {
        postMessage('tick');
      }, 20000);
    `;
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    workerInstance = new Worker(URL.createObjectURL(blob));
    workerInstance.onmessage = () => {
      runAllChecks();
    };
  } catch (e) {
    // Fallback para setInterval padrão
    reminderInterval = setInterval(runAllChecks, 20000);
  }

  // 3. Sempre que o usuário destravar a tela ou voltar para a aba/app, checa imediatamente
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        runAllChecks();
      } else {
        // Quando o usuário minimiza/fecha o app à tarde, garante o agendamento na nuvem
        scheduleUpcomingDailySummariesOnNtfy();
        syncAllRoutinesWithNtfy();
      }
    });
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('focus', runAllChecks);
    window.addEventListener('online', () => {
      runAllChecks();
      syncAllRoutinesWithNtfy();
    });
  }
}
