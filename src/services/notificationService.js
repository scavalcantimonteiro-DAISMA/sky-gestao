import { db } from '../db';

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

// Verifica e solicita permissão de notificação
export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    return 'unsupported';
  }
  if (Notification.permission === 'granted') {
    return 'granted';
  }
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission;
  }
  return Notification.permission;
}

// Dispara uma notificação nativa com suporte a PWA / Service Worker
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

// Verifica se o dia de hoje corresponde aos dias selecionados (1=Segunda ... 7=Domingo)
function isTodayInRoutineDays(routineDays = []) {
  const day = new Date().getDay(); // 0=Dom, 1=Seg...
  const mappedDay = day === 0 ? 7 : day;
  return routineDays.includes(mappedDay);
}

// Checa rotinas e dispara alerta se estiver dentro da janela de 20 minutos de antecedência
export async function checkRoutineReminders() {
  const now = new Date();
  const currentMinutesFromMidnight = now.getHours() * 60 + now.getMinutes();

  // Data local brasileira (YYYY-MM-DD) sem distorção de UTC
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;

  try {
    // Busca todas as rotinas e filtra em memória (evita problema de tipo 1 vs true no IndexedDB/Dexie)
    const todasRotinas = await db.rotinas.toArray();
    
    for (const rotina of todasRotinas) {
      // Verifica se a rotina e notificações estão ativas
      if (rotina.ativo === false || rotina.notificacaoAtiva === false) continue;
      if (!isTodayInRoutineDays(rotina.dias)) continue;
      if (!rotina.horario || !rotina.horario.includes(':')) continue;

      // Parsing do horário "HH:MM"
      const [hStr, mStr] = rotina.horario.split(':');
      const routineHour = parseInt(hStr, 10);
      const routineMinute = parseInt(mStr, 10);
      const routineMinutesFromMidnight = routineHour * 60 + routineMinute;

      // Alerta deve tocar 20 minutos antes
      let targetAlertMinute = routineMinutesFromMidnight - 20;
      if (targetAlertMinute < 0) {
        targetAlertMinute += 1440; // 24 * 60 min
      }

      // Janela de tolerância: dispara se a hora atual estiver entre o horário de aviso (20 min antes)
      // e o horário da rotina, e ainda não tiver alertado hoje.
      // Isso é crucial no celular: se a tela estava bloqueada às 09:40 e o usuário acende a tela às 09:42,
      // ele ainda receberá o aviso em vez de perder para sempre por checar igualdade estrita (===).
      const isWithinAlertWindow =
        currentMinutesFromMidnight >= targetAlertMinute &&
        currentMinutesFromMidnight <= routineMinutesFromMidnight;

      if (isWithinAlertWindow && rotina.ultimoAlertaData !== todayStr) {
        const minutesLeft = routineMinutesFromMidnight - currentMinutesFromMidnight;
        const msgTempo = minutesLeft > 0 ? `em ${minutesLeft} min` : 'agora';

        await showNativeNotification(`⏰ Lembrete SKY: ${rotina.titulo} (${msgTempo})!`, {
          body: `Sua rotina está programada para às ${rotina.horario}. ${rotina.descricao || ''}`,
          tag: `rotina-${rotina.id}-${todayStr}`
        });

        // Marca como disparado hoje para não repetir no mesmo dia
        await db.rotinas.update(rotina.id, { ultimoAlertaData: todayStr });
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
        await showNativeNotification(`⏰ Lembrete de Pendência: ${p.credenciado || 'Geral'}`, {
          body: `[${p.setor}] ${p.descricao}`,
          tag: `pendencia-${p.id}`
        });

        // Marca como disparado para não repetir
        await db.pendencias.update(p.id, { lembreteDisparado: true });
      }
    }
  } catch (err) {
    console.error('Erro ao verificar lembretes de pendências:', err);
  }
}

let reminderInterval = null;

// Inicia o monitoramento contínuo em segundo plano
export function startReminderWatcher() {
  if (reminderInterval) return;
  // Checa imediatamente
  checkRoutineReminders();
  checkPendenciasReminders();
  // Checa a cada 30 segundos
  reminderInterval = setInterval(() => {
    checkRoutineReminders();
    checkPendenciasReminders();
  }, 30000);
}
