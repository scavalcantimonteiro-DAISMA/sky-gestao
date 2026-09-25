// Serviço de Notificações Push via ntfy.sh (100% Gratuito, sem necessidade de servidor ou cadastro)
// Permite notificações mesmo com o celular desligado, tela bloqueada e suporta agendamentos nativos na nuvem

const STORAGE_KEY = 'sky_gestao_ntfy_topic';
const DEFAULT_TOPIC = 'sky-gestao-alertas';
const SCHEDULED_KEYS_STORAGE = 'sky_ntfy_scheduled_keys_v2';

export function getNtfyTopic() {
  return localStorage.getItem(STORAGE_KEY) || DEFAULT_TOPIC;
}

export function setNtfyTopic(topic) {
  const cleanTopic = topic.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
  localStorage.setItem(STORAGE_KEY, cleanTopic);
  // Limpa agendamentos antigos ao trocar de tópico para reagendar no novo tópico
  localStorage.removeItem(SCHEDULED_KEYS_STORAGE);
  return cleanTopic;
}

export function isNtfyKeyScheduled(key) {
  try {
    const raw = localStorage.getItem(SCHEDULED_KEYS_STORAGE);
    if (!raw) return false;
    const map = JSON.parse(raw);
    return Boolean(map[key]);
  } catch (e) {
    return false;
  }
}

export function markNtfyKeyScheduled(key) {
  try {
    const raw = localStorage.getItem(SCHEDULED_KEYS_STORAGE);
    const map = raw ? JSON.parse(raw) : {};
    // Limpa chaves antigas se passar de 300 itens
    const keys = Object.keys(map);
    if (keys.length > 300) {
      keys.slice(0, 150).forEach((k) => delete map[k]);
    }
    map[key] = Date.now();
    localStorage.setItem(SCHEDULED_KEYS_STORAGE, JSON.stringify(map));
  } catch (e) {
    console.warn('Erro ao salvar controle de agendamento ntfy:', e);
  }
}

/**
 * Envia ou agenda notificação Push para o celular via ntfy.sh
 * @param {Object} params
 * @param {string} params.title Título da notificação
 * @param {string} params.message Mensagem / Corpo da notificação
 * @param {string} [params.priority] 'min' | 'low' | 'default' | 'high' | 'urgent'
 * @param {string[]} [params.tags] Emojis/Tags como ['alarm_clock', 'warning']
 * @param {string|number} [params.delay] Tempo de agendamento (ex: '4h', '30m', ou timestamp unix em segundos)
 * @param {string} [params.clickUrl] Link para abrir ao clicar
 */
export async function sendNtfyNotification({
  title = '⏰ SKY Gestão',
  message,
  priority = 'high',
  tags = ['alarm_clock', 'bell'],
  delay = null,
  clickUrl = null
}) {
  const topic = getNtfyTopic();
  if (!topic || !message) return false;

  const payload = {
    topic,
    title,
    message,
    priority: priority === 'urgent' ? 5 : priority === 'high' ? 4 : 3,
    tags
  };

  if (delay) {
    payload.delay = String(delay);
  }

  if (clickUrl) {
    payload.click = clickUrl;
  }

  try {
    const response = await fetch('https://ntfy.sh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    return response.ok;
  } catch (err) {
    console.warn('Erro ao disparar push via ntfy:', err);
    return false;
  }
}

/**
 * Agenda um lembrete para uma pendência no ntfy
 * @param {Object} pendencia 
 * @param {string} delayStr Ex: '4h', '2d', '1d', '30m' ou timestamp unix
 */
export async function schedulePendenciaReminderNtfy(pendencia, delayStr) {
  return await sendNtfyNotification({
    title: `⏰ Lembrete de Pendência: ${pendencia.credenciado || 'Geral'}`,
    message: `[${pendencia.setor || 'Geral'}] ${pendencia.descricao}`,
    priority: 'urgent',
    tags: ['bell', 'warning', 'memo'],
    delay: delayStr
  });
}

/**
 * Agenda no servidor ntfy.sh os alertas de uma rotina específica para hoje (20 min antes e no horário exato)
 */
export async function scheduleRoutineOnNtfyServer(rotina, dateObj = new Date()) {
  if (!rotina || rotina.ativo === false || rotina.notificacaoAtiva === false) return;
  if (!rotina.horario || !rotina.horario.includes(':')) return;

  const dayOfWeek = dateObj.getDay() === 0 ? 7 : dateObj.getDay();
  if (!rotina.dias?.includes(dayOfWeek)) return;

  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;

  const [h, m] = rotina.horario.split(':').map(Number);

  // 1. Horário exato da rotina
  const exactDate = new Date(year, dateObj.getMonth(), dateObj.getDate(), h, m, 0, 0);
  // 2. Horário 20 minutos antes
  const preDate = new Date(exactDate.getTime() - 20 * 60 * 1000);

  const nowMs = Date.now();

  // Agendar aviso de 20 minutos antes (se ainda estiver no futuro > 30 seg)
  const preKey = `rotina_pre20_${rotina.id}_${dateStr}_${rotina.horario}`;
  if (preDate.getTime() > nowMs + 30000 && !isNtfyKeyScheduled(preKey)) {
    const unixSec = Math.floor(preDate.getTime() / 1000);
    const ok = await sendNtfyNotification({
      title: `⏰ Em 20 min (${rotina.horario}): ${rotina.titulo}`,
      message: `Prepare-se! Sua rotina "${rotina.titulo}" começa às ${rotina.horario}.${rotina.descricao ? `\n📋 ${rotina.descricao}` : ''}`,
      priority: 'urgent',
      tags: ['alarm_clock', 'bell'],
      delay: unixSec
    });
    if (ok) markNtfyKeyScheduled(preKey);
  }

  // Agendar aviso na HORA EXATA da rotina (se ainda estiver no futuro > 30 seg)
  const exactKey = `rotina_exact_${rotina.id}_${dateStr}_${rotina.horario}`;
  if (exactDate.getTime() > nowMs + 30000 && !isNtfyKeyScheduled(exactKey)) {
    const unixSec = Math.floor(exactDate.getTime() / 1000);
    const ok = await sendNtfyNotification({
      title: `🔔 HORA DA ROTINA (${rotina.horario}): ${rotina.titulo}`,
      message: `Chegou o horário da sua rotina: ${rotina.titulo}.${rotina.descricao ? `\n📋 ${rotina.descricao}` : ''}`,
      priority: 'urgent',
      tags: ['rotating_light', 'alarm_clock', 'sky'],
      delay: unixSec
    });
    if (ok) markNtfyKeyScheduled(exactKey);
  }
}
