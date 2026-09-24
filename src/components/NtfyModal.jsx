import React, { useState, useEffect } from 'react';
import { 
  X, Smartphone, BellRing, Send, CheckCircle2, 
  ExternalLink, Copy, Check, Sparkles, ShieldCheck
} from 'lucide-react';
import { getNtfyTopic, setNtfyTopic, sendNtfyNotification } from '../services/ntfyService';

export default function NtfyModal({ isOpen, onClose }) {
  const [topic, setTopicState] = useState('');
  const [copied, setCopied] = useState(false);
  const [testStatus, setTestStatus] = useState(null); // null | 'sending' | 'success' | 'error'

  useEffect(() => {
    if (isOpen) {
      setTopicState(getNtfyTopic());
      setTestStatus(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveTopic = (e) => {
    e.preventDefault();
    if (!topic.trim()) return;
    const saved = setNtfyTopic(topic);
    setTopicState(saved);
    setTestStatus('saved');
    setTimeout(() => setTestStatus(null), 3000);
  };

  const handleTestPush = async () => {
    setTestStatus('sending');
    const ok = await sendNtfyNotification({
      title: '⏰ SKY Gestão - Teste de Push!',
      message: 'Notificação push funcionando com sucesso no seu celular, mesmo com a tela apagada!',
      priority: 'urgent',
      tags: ['rocket', 'bell', 'sky']
    });

    if (ok) {
      setTestStatus('success');
    } else {
      setTestStatus('error');
    }
  };

  const handleCopyTopic = () => {
    navigator.clipboard.writeText(topic);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm p-4 flex items-center justify-center animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden space-y-5 p-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-100 text-purple-700">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">Push Celular (ntfy.sh)</h3>
              <p className="text-xs text-slate-500">100% Gratuito • Funciona com a tela apagada</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Explicação simples */}
        <div className="bg-purple-50/70 border border-purple-200/80 rounded-2xl p-4 text-xs text-purple-950 space-y-2">
          <p className="font-bold flex items-center gap-1.5 text-purple-900">
            <Sparkles className="w-4 h-4 text-purple-600" />
            Você já usa o ntfy em outro app?
          </p>
          <p className="leading-relaxed">
            <strong>Sim, você pode usar o mesmo aplicativo ntfy do seu celular!</strong> Basta adicionar um <strong>novo tópico</strong> para este app da SKY. Assim você recebe alertas dos dois aplicativos sem misturar nada.
          </p>
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
            <p className="text-[11px] text-slate-500">
              Escolha um nome único (letras minúsculas e hífens). Exemplo: <code>sky-gestao-scavassin</code>
            </p>
          </div>

          {/* Feedback */}
          {testStatus === 'saved' && (
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Tópico salvo com sucesso!
            </div>
          )}
          {testStatus === 'success' && (
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold flex items-center gap-1.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Notificação enviada! Verifique seu celular agora.
            </div>
          )}
          {testStatus === 'error' && (
            <div className="p-2.5 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 text-xs font-semibold">
              Erro ao enviar teste. Verifique sua conexão.
            </div>
          )}

          {/* Passo a passo no app do celular */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs text-slate-700">
            <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
              Passo a passo no seu celular:
            </h4>
            <ol className="list-decimal list-inside space-y-1 leading-relaxed text-slate-600">
              <li>Abra o aplicativo <strong>ntfy</strong> no seu celular.</li>
              <li>Toque no botão <strong>+</strong> (Inscrever-se em tópico).</li>
              <li>Digite: <strong className="text-purple-700 font-mono">{topic || 'sky-gestao-seu-nome'}</strong></li>
              <li>Toque em <strong>Inscrever-se</strong>.</li>
            </ol>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={handleTestPush}
              disabled={testStatus === 'sending'}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow transition"
            >
              <Send className="w-3.5 h-3.5 text-purple-400" />
              {testStatus === 'sending' ? 'Enviando...' : 'Testar Push no Celular Agora'}
            </button>

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
