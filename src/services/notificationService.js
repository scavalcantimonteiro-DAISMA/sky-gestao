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
  const todayStr = now.toISOString().split('T')[0];

  try {
    const rotinas = await db.rotinas.where('ativo').equals(1).toArray();
    
    for (const rotina of rotinas) {
      if (!rotina.notificacaoAtiva) continue;
      if (!isTodayInRoutineDays(rotina.dias)) continue;

      // Parsing do horário "HH:MM"
      const [hStr, mStr] = rotina.horario.split(':');
      const routineHour = parseInt(hStr, 10);
      const routineMinute = parseInt(mStr, 10);
      const routineMinutesFromMidnight = routineHour * 60 + routineMinute;

      // Alerta deve tocar 20 minutos antes
      const targetAlertMinute = routineMinutesFromMidnight - 20;

      // Se a hora atual está no minuto exato do alerta e ainda não alertou hoje
      if (
        currentMinutesFromMidnight === targetAlertMinute &&
        rotina.ultimoAlertaData !== todayStr
      ) {
        await showNativeNotification(`⏰ Lembrete SKY: ${rotina.titulo} em 20 min!`, {
          body: `Sua rotina está programada para às ${rotina.horario}. ${rotina.descricao}`,
          tag: `rotina-${rotina.id}-${todayStr}`
        });

        // Marca como disparado hoje para não repetir no mesmo minuto
        await db.rotinas.update(rotina.id, { ultimoAlertaData: todayStr });
      }
    }
  } catch (err) {
    console.error('Erro ao verificar lembretes de rotinas:', err);
  }
}

let reminderInterval = null;

// Inicia o monitoramento contínuo em segundo plano
export function startReminderWatcher() {
  if (reminderInterval) return;
  // Checa imediatamente
  checkRoutineReminders();
  // Checa a cada 30 segundos
  reminderInterval = setInterval(checkRoutineReminders, 30000);
}
