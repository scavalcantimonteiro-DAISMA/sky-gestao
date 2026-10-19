import React, { useState, useEffect, useRef } from 'react';
import { 
  Building2, MapPin, Calendar, UserCheck, Users, Search, 
  Sparkles, CheckCircle2, AlertTriangle, X, ChevronRight, Activity, 
  RotateCcw, TrendingUp, Smartphone, Award
} from 'lucide-react';
import { 
  searchPdvs, 
  getPdvByCode, 
  formatPercent, 
  evaluateTarget, 
  TARGETS,
  getPdvMetadata,
  refreshPdvsFromCloud
} from '../../services/pdvResultsService';

export default function StepCredenciado({ data, onChange, onAutoFillPdv }) {
  const tipoVisita = data.tipoVisita || 'setores';
  
  const [searchQuery, setSearchQuery] = useState(data.pdv || '');
  const [searchResults, setSearchResults] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedPdvData, setSelectedPdvData] = useState(() => {
    return data.pdv ? getPdvByCode(data.pdv) : null;
  });
  const [meta, setMeta] = useState(() => getPdvMetadata());
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState(null);

  const searchBoxRef = useRef(null);

  // Escuta atualizações automáticas da nuvem do Projeto SKY Correto
  useEffect(() => {
    const handlePdvUpdate = () => {
      setMeta(getPdvMetadata());
      if (data.pdv) {
        const refreshed = getPdvByCode(data.pdv);
        if (refreshed) setSelectedPdvData(refreshed);
      }
    };
    window.addEventListener('sky:pdvs-updated', handlePdvUpdate);
    return () => window.removeEventListener('sky:pdvs-updated', handlePdvUpdate);
  }, [data.pdv]);

  useEffect(() => {
    if (data.pdv && !selectedPdvData) {
      const found = getPdvByCode(data.pdv);
      if (found) setSelectedPdvData(found);
    }
  }, [data.pdv]);

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(e) {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchChange = (val) => {
    setSearchQuery(val);
    if (val.trim().length >= 1) {
      const results = searchPdvs(val, 15);
      setSearchResults(results);
      setIsDropdownOpen(true);
    } else {
      setSearchResults([]);
      setIsDropdownOpen(false);
    }
  };

  const handleSelectPdv = (pdvItem) => {
    setSelectedPdvData(pdvItem);
    setSearchQuery(`${pdvItem.pdv} - ${pdvItem.credenciado}`);
    setIsDropdownOpen(false);

    if (onAutoFillPdv) {
      onAutoFillPdv(pdvItem);
    } else {
      onChange('pdv', pdvItem.pdv);
      onChange('credenciado', pdvItem.credenciado || pdvItem.pdv);
      if (pdvItem.cidade) onChange('cidade', pdvItem.cidade);
    }
  };

  const handleClearSelectedPdv = () => {
    setSelectedPdvData(null);
    setSearchQuery('');
    onChange('pdv', '');
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    const res = await refreshPdvsFromCloud();
    setIsSyncing(false);
    if (res.success) {
      setMeta(res.meta);
      setSyncFeedback('✅ Planilha sincronizada!');
      if (data.pdv) {
        const refreshed = getPdvByCode(data.pdv);
        if (refreshed) {
          setSelectedPdvData(refreshed);
          if (onAutoFillPdv) onAutoFillPdv(refreshed);
        }
      }
    } else {
      setSyncFeedback('Modo Offline (usando dados salvos)');
    }
    setTimeout(() => setSyncFeedback(null), 4000);
  };

  const formatUpdateDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Cabeçalho */}
      <div className="border-b border-slate-200 pb-4">
        <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Building2 className="w-6 h-6 text-rose-600" />
          Identificação da Visita & Seleção de PDV
        </h3>
        <p className="text-sm text-slate-500 mt-1">
          Informe o código do <strong>PDV</strong> ou nome do credenciado para <strong>puxar automaticamente</strong> os resultados e preencher toda a Ata.
        </p>
      </div>

      {/* Caixa de Busca Inteligente de PDV */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 p-5 sm:p-6 rounded-3xl text-white shadow-lg border border-slate-700/60 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-800 pb-3">
          <div>
            <label className="text-sm font-bold text-rose-400 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Buscar PDV / Credenciado (Base Projeto SKY)
            </label>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[11px] text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
                Planilha: <strong className="text-white">{meta?.sourceName || 'Resultados atualizados.xlsx'}</strong>
                {meta?.updatedAt && ` (${formatUpdateDate(meta.updatedAt)})`}
              </span>
              {meta?.bklData && (
                <span className="flex items-center gap-1 text-rose-300">
                  <span>•</span>
                  <span>BKL Nuvem: <strong className="text-white">{meta.bklData}</strong> ({meta.bklTotalOS || 0} O.S.s)</span>
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {syncFeedback && (
              <span className="text-[11px] font-bold text-emerald-300 animate-in fade-in">
                {syncFeedback}
              </span>
            )}
            <button
              type="button"
              onClick={handleManualSync}
              disabled={isSyncing}
              className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 transition flex items-center gap-1.5 disabled:opacity-60 shadow-sm"
              title="Buscar imediatamente os dados mais recentes salvos no Projeto SKY Correto"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-rose-400' : 'text-slate-400'}`} />
              <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar Planilha'}</span>
            </button>
          </div>
        </div>

        <div className="relative" ref={searchBoxRef}>
          <div className="relative flex items-center">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-5 h-5" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() => {
                const results = searchPdvs(searchQuery || '', 15);
                setSearchResults(results);
                setIsDropdownOpen(true);
              }}
              placeholder="Digite o código (ex: V904980, D401015) ou nome do credenciado..."
              className="w-full pl-11 pr-10 py-3 rounded-2xl bg-slate-800/90 border border-slate-700 text-white placeholder-slate-400 font-semibold text-base focus:ring-2 focus:ring-rose-500 focus:border-rose-500 shadow-inner"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={handleClearSelectedPdv}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white"
                title="Limpar busca"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Dropdown com os Resultados da Busca */}
          {isDropdownOpen && searchResults.length > 0 && (
            <div className="absolute z-50 left-0 right-0 mt-2 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-h-72 overflow-y-auto divide-y divide-slate-800">
              {searchResults.map((p) => {
                const taAt = p.taAtVig !== null ? formatPercent(p.taAtVig) : '-';
                const taPp = p.taPpVig !== null ? formatPercent(p.taPpVig) : '-';
                const ret = p.retiradasVig !== null ? formatPercent(p.retiradasVig) : '-';

                return (
                  <div
                    key={p.pdv}
                    onClick={() => handleSelectPdv(p)}
                    className="p-3 sm:p-3.5 hover:bg-slate-800/90 cursor-pointer transition flex items-center justify-between gap-3 text-left"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-lg bg-rose-600 text-white font-black text-xs tracking-wider">
                          {p.pdv}
                        </span>
                        <strong className="text-sm font-bold text-white truncate">
                          {p.credenciado || 'Credenciado SKY'}
                        </strong>
                        {p.estado && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                            {p.estado}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
                        <span>TA.AT: <strong className="text-slate-200">{taAt}</strong></span>
                        <span>TA.PP: <strong className="text-slate-200">{taPp}</strong></span>
                        <span>Retiradas: <strong className="text-slate-200">{ret}</strong></span>
                        {p.bkl && (p.bkl.ac > 0 || p.bkl.pp > 0 || p.bkl.vencidas > 0) && (
                          <span className="text-blue-300 font-semibold">
                            BKL: {p.bkl.ac} AT • {p.bkl.pp} PP {p.bkl.vencidas > 0 ? `• ⚠️ ${p.bkl.vencidas} venc.` : ''}
                          </span>
                        )}
                        {p.vendasPos > 0 && (
                          <span>Vendas Pós: <strong className="text-emerald-400">{p.vendasPos}</strong></span>
                        )}
                      </div>
                    </div>

                    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Card Executivo com os Resultados do PDV Selecionado */}
        {selectedPdvData && (
          <div className="bg-slate-800/80 rounded-2xl p-4 border border-rose-500/40 space-y-3 animate-in fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-700/60 pb-2.5">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <span className="text-xs uppercase font-extrabold tracking-wider text-emerald-400 block">
                    PDV Vinculado • Resultados Carregados na Ata
                  </span>
                  <h4 className="text-base font-bold text-white">
                    {selectedPdvData.pdv} — {selectedPdvData.credenciado} {selectedPdvData.estado ? `(${selectedPdvData.estado})` : ''}
                  </h4>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleSelectPdv(selectedPdvData)}
                className="text-xs font-semibold px-3 py-1 rounded-xl bg-rose-600/30 hover:bg-rose-600 text-rose-200 hover:text-white border border-rose-500/40 transition flex items-center gap-1 self-start sm:self-auto"
                title="Reaplicar números na Ata"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Reaplicar na Ata
              </button>
            </div>

            {/* Grid com os 5 Indicadores Oficiais + Vendas */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-1">
              {/* TA.AT */}
              {(() => {
                const evalTaAt = evaluateTarget('taAt', selectedPdvData.taAtVig);
                return (
                  <div className={`p-2.5 rounded-xl border text-center ${
                    evalTaAt.ok ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                  }`}>
                    <span className="text-[10px] font-bold block uppercase text-slate-400">T.A de AT</span>
                    <strong className="text-base font-black">{formatPercent(selectedPdvData.taAtVig)}</strong>
                    <span className="text-[9px] block font-semibold mt-0.5">
                      Meta: ≥ 80% {evalTaAt.ok ? '✅' : '⚠️'}
                    </span>
                  </div>
                );
              })()}

              {/* TA.PP */}
              {(() => {
                const evalTaPp = evaluateTarget('taPp', selectedPdvData.taPpVig);
                return (
                  <div className={`p-2.5 rounded-xl border text-center ${
                    evalTaPp.ok ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                  }`}>
                    <span className="text-[10px] font-bold block uppercase text-slate-400">T.A de PP</span>
                    <strong className="text-base font-black">{formatPercent(selectedPdvData.taPpVig)}</strong>
                    <span className="text-[9px] block font-semibold mt-0.5">
                      Meta: ≥ 90% {evalTaPp.ok ? '✅' : '⚠️'}
                    </span>
                  </div>
                );
              })()}

              {/* Retiradas */}
              {(() => {
                const evalRet = evaluateTarget('retiradas', selectedPdvData.retiradasVig);
                return (
                  <div className={`p-2.5 rounded-xl border text-center ${
                    evalRet.ok ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                  }`}>
                    <span className="text-[10px] font-bold block uppercase text-slate-400">Retiradas</span>
                    <strong className="text-base font-black">{formatPercent(selectedPdvData.retiradasVig)}</strong>
                    <span className="text-[9px] block font-semibold mt-0.5">
                      Meta: ≥ 70% {evalRet.ok ? '✅' : '⚠️'}
                    </span>
                  </div>
                );
              })()}

              {/* Reabertura AT */}
              {(() => {
                const evalReabAt = evaluateTarget('reabAt', selectedPdvData.reabAtVig);
                return (
                  <div className={`p-2.5 rounded-xl border text-center ${
                    evalReabAt.ok ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                  }`}>
                    <span className="text-[10px] font-bold block uppercase text-slate-400">Reabert. AT</span>
                    <strong className="text-base font-black">{formatPercent(selectedPdvData.reabAtVig)}</strong>
                    <span className="text-[9px] block font-semibold mt-0.5">
                      Meta: ≤ 3,5% {evalReabAt.ok ? '✅' : '⚠️'}
                    </span>
                  </div>
                );
              })()}

              {/* Reabertura PP */}
              {(() => {
                const evalReabPp = evaluateTarget('reabPp', selectedPdvData.reabPpVig);
                return (
                  <div className={`p-2.5 rounded-xl border text-center ${
                    evalReabPp.ok ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                  }`}>
                    <span className="text-[10px] font-bold block uppercase text-slate-400">Reabert. PP</span>
                    <strong className="text-base font-black">{formatPercent(selectedPdvData.reabPpVig)}</strong>
                    <span className="text-[9px] block font-semibold mt-0.5">
                      Meta: ≤ 2,5% {evalReabPp.ok ? '✅' : '⚠️'}
                    </span>
                  </div>
                );
              })()}

              {/* Vendas Pós & Móvel */}
              <div className="p-2.5 rounded-xl border bg-slate-900 border-slate-700 text-center text-slate-200">
                <span className="text-[10px] font-bold block uppercase text-slate-400">Vendas / Produção</span>
                <strong className="text-sm font-black text-white block">
                  Pós: {selectedPdvData.vendasPos ?? 0}
                </strong>
                <span className="text-[10px] block text-slate-400">
                  Móvel: {selectedPdvData.vendasChip ?? 0} • Ret: {selectedPdvData.abertasRetiradasVig ?? 0}
                </span>
              </div>
            </div>

            {/* Resumo de BKL Integrado */}
            <div className="bg-slate-900/90 rounded-2xl p-3 border border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
              <div className="flex items-center gap-2.5">
                <span className="px-2 py-0.5 rounded-lg bg-blue-600/30 text-blue-300 font-black border border-blue-500/40 text-[11px]">
                  BKL
                </span>
                <div>
                  <strong className="text-white block font-semibold">
                    Setor Torre de Controle (Backlog de O.S.):
                  </strong>
                  <span className="text-slate-300">
                    {selectedPdvData.bkl ? (
                      <>
                        <strong className="text-white font-bold">{selectedPdvData.bkl.ac}</strong> AT em Caixa • <strong className="text-white font-bold">{selectedPdvData.bkl.pp}</strong> PP em Caixa • <strong className={selectedPdvData.bkl.vencidas > 0 ? "text-rose-400 font-bold" : "text-emerald-400 font-bold"}>{selectedPdvData.bkl.vencidas} Vencidas ({selectedPdvData.bkl.tipoVencidas})</strong>
                      </>
                    ) : (
                      <span className="text-emerald-400 font-medium">0 O.S.s em aberto no BKL</span>
                    )}
                  </span>
                </div>
              </div>
              <span className="text-[11px] text-emerald-400 font-bold px-2 py-0.5 rounded-lg bg-emerald-950/60 border border-emerald-500/30 self-start sm:self-auto shrink-0">
                ✅ Preenchido no Passo Torre
              </span>
            </div>

            <p className="text-[11px] text-slate-400 italic">
              ⚡ Os campos dos setores <strong>Torre de Controle</strong> (O.S. AT, PP e Vencidas), <strong>Proprietário</strong> (T.A, Retiradas, Reaberturas), <strong>Vendas</strong> (Pós, Chip) e <strong>Estoque</strong> foram preenchidos automaticamente. Você pode ajustar qualquer número nos passos seguintes se desejar.
            </p>
          </div>
        )}
      </div>

      {/* Formulário Manual / Editável de Identificação */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Nome do Credenciado */}
        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-slate-800">
            Nome do Credenciado <span className="text-rose-600">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Building2 className="w-5 h-5" />
            </div>
            <input
              type="text"
              required
              value={data.credenciado || ''}
              onChange={(e) => onChange('credenciado', e.target.value)}
              placeholder="Ex: ABC Telecomunicações, Credenciado Sul..."
              className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 text-slate-900 bg-white shadow-sm font-medium text-base"
            />
          </div>
        </div>

        {/* Cidade / Praça */}
        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-slate-800">
            Cidade / Praça <span className="text-rose-600">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <MapPin className="w-5 h-5" />
            </div>
            <input
              type="text"
              required
              value={data.cidade || ''}
              onChange={(e) => onChange('cidade', e.target.value)}
              placeholder="Ex: Campinas, Salvador, São Luís..."
              className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 text-slate-900 bg-white shadow-sm font-medium text-base"
            />
          </div>
        </div>

        {/* Data da Visita */}
        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-slate-800">
            Data da Visita <span className="text-rose-600">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Calendar className="w-5 h-5" />
            </div>
            <input
              type="date"
              value={data.dataVisita ? data.dataVisita.split('T')[0] : new Date().toISOString().split('T')[0]}
              onChange={(e) => onChange('dataVisita', e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 text-slate-900 bg-white shadow-sm font-medium text-base"
            />
          </div>
        </div>

        {/* Supervisor Responsável */}
        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-slate-800">
            Supervisor de Campo Responsável
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <UserCheck className="w-5 h-5" />
            </div>
            <input
              type="text"
              value={data.supervisor || ''}
              onChange={(e) => onChange('supervisor', e.target.value)}
              placeholder="Seu nome (Supervisor SKY)"
              className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 text-slate-900 bg-white shadow-sm font-medium text-base"
            />
          </div>
        </div>
      </div>

      {/* Seletor de Formato de Execução */}
      <div className="pt-4 border-t border-slate-200 space-y-2.5">
        <label className="block text-sm font-bold text-slate-800">
          Formato de Execução do Checklist
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Opção Tradicional */}
          <div
            onClick={() => onChange('tipoVisita', 'setores')}
            className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3 ${
              tipoVisita === 'setores'
                ? 'border-rose-600 bg-rose-50/50 shadow-sm'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${
              tipoVisita === 'setores' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-500'
            }`}>
              <Users className="w-5 h-5" />
            </div>
            <div>
              <strong className="block text-sm font-bold text-slate-900">
                Por Setores & Líderes
              </strong>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Reunião com encarregados de Torre, Estoque e Vendas separadamente, finalizando com o Proprietário.
              </p>
            </div>
          </div>

          {/* Opção Proprietário Único */}
          <div
            onClick={() => onChange('tipoVisita', 'proprietario_unico')}
            className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3 ${
              tipoVisita === 'proprietario_unico'
                ? 'border-rose-600 bg-rose-50/50 shadow-sm'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${
              tipoVisita === 'proprietario_unico' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-500'
            }`}>
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <strong className="block text-sm font-bold text-slate-900">
                  Proprietário Centralizado
                </strong>
                <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-rose-100 text-rose-700">
                  RECOMENDADO
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Para credenciados onde o proprietário coordena e responde por todas as áreas sozinho. Passa por todos os setores direto com ele.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
