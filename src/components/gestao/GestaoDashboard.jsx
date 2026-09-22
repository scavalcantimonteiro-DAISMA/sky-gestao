import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, CheckCircle2, Clock, Bell, AlertTriangle, 
  ArrowRight, Sparkles, Building2, Calendar, Check, Volume2, Plus
} from 'lucide-react';
import { db } from '../../db';
import PendenciasList from './PendenciasList';
import RotinasDiarias from './RotinasDiarias';
import { formatDateBR } from '../../services/outlookService';
import { showNativeNotification } from '../../services/notificationService';

export default function GestaoDashboard({ initialSubTab = 'dashboard' }) {
  const [activeSubTab, setActiveSubTab] = useState(initialSubTab);
  const [pendencias, setPendencias] = useState([]);
  const [rotinas, setRotinas] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allPendencias, allRotinas] = await Promise.all([
        db.pendencias.toArray(),
        db.rotinas.toArray()
      ]);
      setPendencias(allPendencias);
      setRotinas(allRotinas);
    } catch (err) {
      console.error('Erro ao carregar dashboard de gestão:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeSubTab]);

  const getDaysOnScreen = (dataCriacao) => {
    if (!dataCriacao) return 0;
    const [year, month, day] = dataCriacao.split('T')[0].split('-').map(Number);
    const createdDate = new Date(year, month - 1, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffTime = today - createdDate;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays < 0 ? 0 : diffDays;
  };

  // Dia da semana de hoje (1=Seg ... 7=Dom)
  const currentDayOfWeek = () => {
    const d = new Date().getDay();
    return d === 0 ? 7 : d;
  };

  const todayRotinas = rotinas.filter((r) => r.ativo && r.dias?.includes(currentDayOfWeek()));

  const pendentes = pendencias.filter((p) => p.status === 'pendente');
  const executadas = pendencias.filter((p) => p.status === 'executado');
  const criticas = pendentes.filter((p) => getDaysOnScreen(p.dataCriacao) >= 6);
  const emAtencao = pendentes.filter((p) => {
    const days = getDaysOnScreen(p.dataCriacao);
    return days >= 3 && days < 6;
  });

  const handleQuickExecute = async (pId) => {
    const todayStr = new Date().toISOString().split('T')[0];
    await db.pendencias.update(pId, {
      status: 'executado',
      dataExecucao: todayStr
    });
    loadData();
  };

  return (
    <div className="space-y-6">
      {/* Subnavegação do Módulo 2 */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('dashboard')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2 shrink-0 ${
            activeSubTab === 'dashboard'
              ? 'bg-rose-600 text-white shadow'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          Dashboard do Dia
        </button>

        <button
          onClick={() => setActiveSubTab('pendencias')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2 shrink-0 ${
            activeSubTab === 'pendencias'
              ? 'bg-rose-600 text-white shadow'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          Minhas Pendências ({pendentes.length})
        </button>

        <button
          onClick={() => setActiveSubTab('rotinas')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2 shrink-0 ${
            activeSubTab === 'rotinas'
              ? 'bg-rose-600 text-white shadow'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          Rotinas & Lembretes ({rotinas.length})
        </button>
      </div>

      {/* Conteúdo Dinâmico por SubAba */}
      {activeSubTab === 'pendencias' && <PendenciasList />}
      {activeSubTab === 'rotinas' && <RotinasDiarias />}

      {activeSubTab === 'dashboard' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Métricas Executivas do Dia */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Pendências Abertas */}
            <div 
              onClick={() => setActiveSubTab('pendencias')}
              className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm hover:border-amber-400 transition cursor-pointer space-y-1"
            >
              <div className="flex items-center justify-between text-amber-600">
                <span className="text-xs font-bold uppercase tracking-wider">Pendências Abertas</span>
                <Clock className="w-5 h-5" />
              </div>
              <div className="text-3xl font-black text-slate-900">{pendentes.length}</div>
              <p className="text-xs text-slate-500">Para você resolver</p>
            </div>

            {/* Críticas (+6 dias na tela) */}
            <div 
              onClick={() => setActiveSubTab('pendencias')}
              className={`p-5 rounded-3xl border shadow-sm transition cursor-pointer space-y-1 ${
                criticas.length > 0 
                  ? 'bg-rose-50 border-rose-300 text-rose-900 hover:border-rose-500' 
                  : 'bg-white border-slate-200 text-slate-900 hover:border-rose-300'
              }`}
            >
              <div className="flex items-center justify-between text-rose-600">
                <span className="text-xs font-bold uppercase tracking-wider">6+ Dias na Tela</span>
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="text-3xl font-black text-rose-600">{criticas.length}</div>
              <p className="text-xs text-slate-500">Ações críticas urgentes</p>
            </div>

            {/* Rotinas Hoje */}
            <div 
              onClick={() => setActiveSubTab('rotinas')}
              className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm hover:border-blue-400 transition cursor-pointer space-y-1"
            >
              <div className="flex items-center justify-between text-blue-600">
                <span className="text-xs font-bold uppercase tracking-wider">Rotinas de Hoje</span>
                <Bell className="w-5 h-5" />
              </div>
              <div className="text-3xl font-black text-slate-900">{todayRotinas.length}</div>
              <p className="text-xs text-slate-500">Com aviso 20 min antes</p>
            </div>

            {/* Executadas */}
            <div 
              onClick={() => setActiveSubTab('pendencias')}
              className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm hover:border-emerald-400 transition cursor-pointer space-y-1"
            >
              <div className="flex items-center justify-between text-emerald-600">
                <span className="text-xs font-bold uppercase tracking-wider">Concluídas</span>
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="text-3xl font-black text-emerald-600">{executadas.length}</div>
              <p className="text-xs text-slate-500">Histórico de ações</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bloco 1: Pendências Críticas com mais dias na tela */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-rose-600" />
                  Pendências com Mais Dias na Tela
                </h3>
                <button
                  onClick={() => setActiveSubTab('pendencias')}
                  className="text-xs text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1"
                >
                  Ver Todas ({pendentes.length}) <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {pendentes.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">
                  Parabéns! Não há nenhuma pendência aberta.
                </div>
              ) : (
                <div className="space-y-3">
                  {pendentes.slice(0, 4).map((p) => {
                    const days = getDaysOnScreen(p.dataCriacao);
                    return (
                      <div
                        key={p.id}
                        className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3"
                      >
                        <div className="space-y-1 flex-1">
                          <p className="text-sm font-semibold text-slate-800 line-clamp-1">
                            {p.descricao}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <span className="bg-slate-200 px-2 py-0.5 rounded text-[11px] font-medium text-slate-700">
                              {p.credenciado}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                              days >= 6 
                                ? 'bg-rose-100 text-rose-900 border border-rose-300' 
                                : days >= 3 
                                ? 'bg-amber-100 text-amber-900 border border-amber-300' 
                                : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {days} dia(s) na tela
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleQuickExecute(p.id)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold p-2 rounded-xl text-xs shadow transition shrink-0"
                          title="Marcar como Executado"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Bloco 2: Linha do Tempo de Rotinas de Hoje */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  Rotinas Programadas para Hoje
                </h3>
                <button
                  onClick={() => setActiveSubTab('rotinas')}
                  className="text-xs text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1"
                >
                  Gerenciar Rotinas <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {todayRotinas.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">
                  Nenhuma rotina configurada para o dia de hoje.
                </div>
              ) : (
                <div className="space-y-3">
                  {todayRotinas.map((r) => {
                    const [h, m] = r.horario.split(':').map(Number);
                    let alertMin = h * 60 + m - 20;
                    if (alertMin < 0) alertMin += 24 * 60;
                    const alertTime = `${String(Math.floor(alertMin / 60)).padStart(2, '0')}:${String(alertMin % 60).padStart(2, '0')}`;

                    return (
                      <div
                        key={r.id}
                        className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-slate-900 text-sm">{r.horario}</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                              <Bell className="w-3 h-3 text-rose-600" />
                              Alerta às {alertTime}
                            </span>
                          </div>
                          <p className="text-sm font-semibold text-slate-800">{r.titulo}</p>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            showNativeNotification(`⏰ [TESTE] ${r.titulo}`, {
                              body: `Horário: ${r.horario}. ${r.descricao}`
                            });
                          }}
                          className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition"
                          title="Testar Alarme"
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
