// Serviço de Notificações Push via ntfy.sh (100% Gratuito, sem necessidade de servidor ou cadastro)
// Permite notificações mesmo com o celular desligado, tela bloqueada e suporta agendamentos nativos

const STORAGE_KEY = 'sky_gestao_ntfy_topic';
const DEFAULT_TOPIC = 'sky-gestao-alertas';

export function getNtfyTopic() {
  return localStorage.getItem(STORAGE_KEY) || DEFAULT_TOPIC;
}

export function setNtfyTopic(topic) {
  const cleanTopic = topic.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
  localStorage.setItem(STORAGE_KEY, cleanTopic);
  return cleanTopic;
}

/**
 * Envia ou agenda notificação Push para o celular via ntfy.sh
 * @param {Object} params
 * @param {string} params.title Título da notificação
 * @param {string} params.message Mensagem / Corpo da notificação
 * @param {string} [params.priority] 'min' | 'low' | 'default' | 'high' | 'urgent'
 * @param {string[]} [params.tags] Emojis/Tags como ['alarm_clock', 'warning']
 * @param {string} [params.delay] Tempo de agendamento (ex: '4h', '2d', '30m', ou timestamp unix)
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
  if (!topic) return false;

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
 * @param {string} delayStr Ex: '4h', '2d', '1d', '30m'
 */
export async function schedulePendenciaReminderNtfy(pendencia, delayStr) {
  return await sendNtfyNotification({
    title: `⏰ Lembrete de Pendência: ${pendencia.credenciado || 'Geral'}`,
    message: `[${pendencia.setor}] ${pendencia.descricao}`,
    priority: 'urgent',
    tags: ['bell', 'warning', 'memo'],
    delay: delayStr
  });
}
