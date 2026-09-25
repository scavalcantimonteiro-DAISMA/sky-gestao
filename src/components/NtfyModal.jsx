import React, { useState, useEffect } from 'react';
import { 
  X, Smartphone, Send, CheckCircle2, 
  Copy, Check, Sparkles, Sun, Moon, RefreshCw
} from 'lucide-react';
import { getNtfyTopic, setNtfyTopic, sendNtfyNotification } from '../services/ntfyService';
import {
  syncAllRoutinesWithNtfy,
  triggerMorningSummaryNow,
  triggerEveningSummaryNow
} from '../services/notificationService';

export default function NtfyModal({ isOpen, onClose }) {
  const [topic, setTopicState] = useState('');
  const [copied, setCopied] = useState(false);
  const [testStatus, setTestStatus] = useState(null); // null | 'sending' | 'success' | 'error' | 'saved' | 'synced'

  useEffect(() => {
    if (isOpen) {
      setTopicState(getNtfyTopic());
      setTestStatus(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveTopic = async (e) => {
    e.preventDefault();
    if (!topic.trim()) return;
    const saved = setNtfyTopic(topic);
    setTopicState(saved);
    setTestStatus('saved');
    await syncAllRoutinesWithNtfy();
    setTimeout(() => setTestStatus(null), 3500);
  };

  const handleTestPush = async () => {
    setTestStatus('sending');
    const ok = await sendNtfyNotification({
      title: '⏰ SKY Gestão - Teste de Push!',
      message: 'Notificação push funcionando com sucesso! Você receberá: Resumo às 08h, Rotinas ao longo do dia e Balanço às 18h.',
      priority: 'urgent',
      tags: ['rocket', 'bell', 'sky']
    });

    await syncAllRoutinesWithNtfy();
    setTestStatus(ok ? 'success' : 'error');
  };

  const handleTestMorning = async () => {
    setTestStatus('sending');
    await triggerMorningSummaryNow();
    setTestStatus('success');
  };

  const handleTestEvening = async () => {
    setTestStatus('sending');
    await triggerEveningSummaryNow();
    setTestStatus('success');
  };

  const handleSyncAll = async () => {
    setTestStatus('sending');
    await syncAllRoutinesWithNtfy();
    await sendNtfyNotification({
      title: '🔄 Rotinas & Alertas Sincronizados!',
      message: 'Todas as suas rotinas do dia (20 min antes e na hora exata), além dos relatórios das 08h e 18h estão ativos no ntfy!',
      priority: 'high',
      tags: ['white_check_mark', 'alarm_clock']
    });
    setTestStatus('synced');
  };

  const handleCopyTopic = () => {
    navigator.clipboard.writeText(topic);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm p-4 flex items-center justify-center animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden space-y-4 p-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-100 text-purple-700">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">Push Celular (ntfy.sh)</h3>
              <p className="text-xs text-slate-500">Alertas às 08h • Rotinas do Dia • Balanço às 18h</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Programação Automática Ativa */}
        <div className="bg-purple-50/80 border border-purple-200 rounded-2xl p-3.5 text-xs text-purple-950 space-y-1.5">
          <p className="font-bold flex items-center gap-1.5 text-purple-900">
            <Sparkles className="w-4 h-4 text-purple-600" />
            Notificações Automáticas Programadas:
          </p>
          <ul className="space-y-1 text-[11px] text-purple-900/90 pl-1">
            <li>☀️ <strong>08:00h (Manhã):</strong> Lista todas as pendências em aberto e rotinas do dia.</li>
            <li>⏰ <strong>Ao longo do dia:</strong> Avisa 20 min antes e na hora exata de cada rotina.</li>
            <li>🌙 <strong>18:00h (Fim do dia):</strong> Balanço das concluídas hoje vs pendentes em aberto.</li>
          </ul>
        </div>

        {/* Formulário de Tópico */}
        <form onSubmit={handleSaveTopic} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              Nome do seu Tópico / Canal no ntfy:
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-xs">
                  ntfy.sh/
                </span>
                <input
                  type="text"
                  required
                  value={topic}
                  onChange={(e) => setTopicState(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '-'))}
                  placeholder="ex: sky-gestao-seu-nome"
                  className="w-full pl-16 pr-3 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-900 text-sm focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <button
                type="button"
                onClick={handleCopyTopic}
                className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 transition"
                title="Copiar nome do tópico"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>

              <button
                type="submit"
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow transition"
              >
                Salvar
              </button>
            </div>
          </div>

          {/* Feedback */}
          {testStatus === 'saved' && (
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Tópico salvo e rotinas sincronizadas!
            </div>
          )}
          {testStatus === 'synced' && (
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Todas as rotinas foram agendadas no servidor ntfy!
            </div>
          )}
          {testStatus === 'success' && (
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold flex items-center gap-1.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Enviado com sucesso! Confira no seu aplicativo ntfy agora.
            </div>
          )}
          {testStatus === 'error' && (
            <div className="p-2.5 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 text-xs font-semibold">
              Erro ao enviar. Verifique sua conexão com a internet.
            </div>
          )}

          {/* Botões de Disparo Imediato dos Relatórios */}
          <div className="space-y-2 pt-1">
            <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Testar e Disparar Relatórios no Celular Agora:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleTestMorning}
                disabled={testStatus === 'sending'}
                className="p-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold flex items-center justify-center gap-1.5 transition"
              >
                <Sun className="w-4 h-4 text-amber-600" />
                Enviar Resumo 08:00h
              </button>

              <button
                type="button"
                onClick={handleTestEvening}
                disabled={testStatus === 'sending'}
                className="p-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 text-xs font-bold flex items-center justify-center gap-1.5 transition"
              >
                <Moon className="w-4 h-4 text-indigo-600" />
                Enviar Balanço 18:00h
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTestPush}
                disabled={testStatus === 'sending'}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow transition"
              >
                <Send className="w-3.5 h-3.5 text-purple-400" />
                {testStatus === 'sending' ? 'Enviando...' : 'Testar Push'}
              </button>

              <button
                type="button"
                onClick={handleSyncAll}
                disabled={testStatus === 'sending'}
                className="bg-purple-100 hover:bg-purple-200 text-purple-900 font-bold px-3 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition"
                title="Sincronizar todas as rotinas na nuvem ntfy"
              >
                <RefreshCw className="w-3.5 h-3.5 text-purple-700" />
                Sincronizar Rotinas
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold transition"
            >
              Fechar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
