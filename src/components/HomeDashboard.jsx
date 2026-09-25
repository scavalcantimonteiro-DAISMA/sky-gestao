import React, { useState, useEffect } from 'react';
import { 
  ClipboardList, Clock, FileCheck, CheckCircle2, History, 
  ArrowRight, ShieldAlert, Sparkles, Building2, BellRing, Smartphone, Plus
} from 'lucide-react';
import { db } from '../db';
import { formatDateBR } from '../services/outlookService';

export default function HomeDashboard({ onSelectTab }) {
  const [stats, setStats] = useState({
    atasCount: 0,
    lastAta: null,
    pendentesCount: 0,
    criticasCount: 0,
    rotinasCount: 0
  });

  useEffect(() => {
    async function loadStats() {
      try {
        const [atas, pendencias, rotinas] = await Promise.all([
          db.atas.toArray(),
          db.pendencias.toArray(),
          db.rotinas.toArray()
        ]);

        const pendentes = pendencias.filter((p) => p.status === 'pendente');
        
        // Críticas (6+ dias)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const criticas = pendentes.filter((p) => {
          if (!p.dataCriacao) return false;
          const [y, m, d] = p.dataCriacao.split('T')[0].split('-').map(Number);
          const cDate = new Date(y, m - 1, d);
          const diff = Math.floor((today - cDate) / (1000 * 60 * 60 * 24));
          return diff >= 6;
        });

        // Ordena atas para pegar a última
        atas.sort((a, b) => new Date(b.dataVisita || b.createdAt) - new Date(a.dataVisita || a.createdAt));

        setStats({
          atasCount: atas.length,
          lastAta: atas.length > 0 ? atas[0] : null,
          pendentesCount: pendentes.length,
          criticasCount: criticas.length,
          rotinasCount: rotinas.filter((r) => r.ativo).length
        });
      } catch (e) {
        console.error('Erro ao carregar estatísticas:', e);
      }
    }

    loadStats();
    const handleRemoteSync = () => loadStats();
    window.addEventListener('sky-db-synced', handleRemoteSync);
    return () => window.removeEventListener('sky-db-synced', handleRemoteSync);
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Hero Banner de Boas-Vindas */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-700/50 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-rose-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" /> Supervisão de Campo SKY
          </div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
            Painel de Operações & Atas
          </h1>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Aplicativo unificado para visitas a credenciados, geração instantânea de Atas em PDF e e-mail via Outlook, além de gestão das suas pendências e rotinas diárias com lembrete sonoro.
          </p>
        </div>
      </div>

      {/* Grid com os 2 Grandes Sistemas Solicitados */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ======================================================== */}
        {/* CARD 1: SISTEMA DE CHECK LIST E ATA DE REUNIÃO */}
        {/* ======================================================== */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border-2 border-slate-200 hover:border-rose-400 shadow-sm hover:shadow-xl transition-all flex flex-col justify-between space-y-6 group">
          <div className="space-y-4">
            {/* Topo do Card */}
            <div className="flex items-start justify-between gap-3">
              <div className="w-14 h-14 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-lg shadow-rose-600/30 group-hover:scale-105 transition-transform">
                <ClipboardList className="w-7 h-7" />
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
                Módulo 1
              </span>
            </div>

            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 group-hover:text-rose-600 transition-colors">
                SISTEMA DE CHECK LIST E ATA DE REUNIÃO
              </h2>
              <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
                Checklist completo dos 5 setores (Credenciado, Torre de Controle, Estoque, Vendas e Proprietário). Gera a Ata em PDF formatado e envia por e-mail com 1 toque no Outlook.
              </p>
            </div>

            {/* Resumo de Atas Realizadas */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block font-semibold text-[11px] uppercase">Atas no Histórico</span>
                <span className="text-xl font-black text-slate-900">{stats.atasCount}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold text-[11px] uppercase">Última Visita</span>
                <span className="text-xs font-bold text-slate-800 line-clamp-1">
                  {stats.lastAta ? `${stats.lastAta.credenciado} (${formatDateBR(stats.lastAta.dataVisita)})` : 'Nenhuma ainda'}
                </span>
              </div>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <button
              onClick={() => onSelectTab('checklist')}
              className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-3.5 px-4 rounded-2xl shadow-md shadow-rose-600/20 transition flex items-center justify-center gap-2 text-sm sm:text-base group/btn"
            >
              <Plus className="w-5 h-5" />
              <span>Novo Checklist de Visita</span>
              <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform ml-auto" />
            </button>

            <button
              onClick={() => onSelectTab('historico-atas')}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-2 text-xs sm:text-sm"
            >
              <History className="w-4 h-4 text-slate-500" />
              <span>Ver Histórico de Atas Anteriores ({stats.atasCount})</span>
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* CARD 2: SISTEMA DE LEMBRETE E GESTÃO DO DIA */}
        {/* ======================================================== */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border-2 border-slate-200 hover:border-blue-400 shadow-sm hover:shadow-xl transition-all flex flex-col justify-between space-y-6 group">
          <div className="space-y-4">
            {/* Topo do Card */}
            <div className="flex items-start justify-between gap-3">
              <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg shadow-slate-900/30 group-hover:scale-105 transition-transform">
                <Clock className="w-7 h-7 text-rose-400" />
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
                Módulo 2
              </span>
            </div>

            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 group-hover:text-blue-600 transition-colors">
                SISTEMA DE LEMBRETE E GESTÃO DO DIA
              </h2>
              <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
                Gestão centralizada de pendências com contador de dias em aberto, rotinas diárias e notificações sonoras no celular com 20 minutos de antecedência.
              </p>
            </div>

            {/* Resumo de Pendências e Rotinas */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block font-semibold text-[11px] uppercase">Pendências Abertas</span>
                <span className="text-xl font-black text-slate-900 flex items-center gap-1.5">
                  {stats.pendentesCount}
                  {stats.criticasCount > 0 && (
                    <span className="text-[10px] font-bold text-rose-600 bg-rose-100 px-1.5 py-0.5 rounded-full">
                      {stats.criticasCount} críticas
                    </span>
                  )}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold text-[11px] uppercase">Rotinas Ativas</span>
                <span className="text-xl font-black text-blue-600">{stats.rotinasCount}</span>
              </div>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <button
              onClick={() => onSelectTab('gestao')}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 px-4 rounded-2xl shadow-md shadow-slate-900/20 transition flex items-center justify-center gap-2 text-sm sm:text-base group/btn"
            >
              <CheckCircle2 className="w-5 h-5 text-rose-400" />
              <span>Acessar Painel de Gestão do Dia</span>
              <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform ml-auto" />
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onSelectTab('pendencias')}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold py-2.5 px-3 rounded-xl transition text-xs flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
                <span>Pendências ({stats.pendentesCount})</span>
              </button>

              <button
                onClick={() => onSelectTab('rotinas')}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold py-2.5 px-3 rounded-xl transition text-xs flex items-center justify-center gap-1.5"
              >
                <BellRing className="w-3.5 h-3.5 text-blue-600" />
                <span>Rotinas & Alertas</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
