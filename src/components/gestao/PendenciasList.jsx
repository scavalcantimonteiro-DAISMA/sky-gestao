import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, Clock, AlertTriangle, Plus, Search, Filter, 
  Trash2, Check, Calendar, Building2, Tag, ArrowUpDown, CalendarPlus
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { db } from '../../db';
import { formatDateBR, downloadIcsFile } from '../../services/outlookService';

export default function PendenciasList() {
  const [pendencias, setPendencias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pendente'); // 'todas' | 'pendente' | 'executado'
  const [sectorFilter, setSectorFilter] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // Formulário de nova pendência
  const [newDescricao, setNewDescricao] = useState('');
  const [newCredenciado, setNewCredenciado] = useState('');
  const [newSetor, setNewSetor] = useState('Geral');
  const [newPrioridade, setNewPrioridade] = useState('alta');

  const loadPendencias = async () => {
    setLoading(true);
    try {
      const items = await db.pendencias.toArray();
      setPendencias(items);
    } catch (err) {
      console.error('Erro ao carregar pendências:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPendencias();
  }, []);

  // Calcula quantos dias a pendência está na tela
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

  // Alterna status entre Pendente e Executado
  const handleToggleStatus = async (item) => {
    const nextStatus = item.status === 'pendente' ? 'executado' : 'pendente';
    const todayStr = new Date().toISOString().split('T')[0];

    await db.pendencias.update(item.id, {
      status: nextStatus,
      dataExecucao: nextStatus === 'executado' ? todayStr : null
    });

    if (nextStatus === 'executado') {
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.8 }
        });
      } catch (e) {
        // Confetti fallback
      }
    }

    loadPendencias();
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (window.confirm('Excluir esta pendência?')) {
      await db.pendencias.delete(id);
      loadPendencias();
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!newDescricao.trim()) return;

    const todayStr = new Date().toISOString().split('T')[0];
    await db.pendencias.add({
      origem: 'manual',
      credenciado: newCredenciado.trim() || 'Geral',
      setor: newSetor,
      descricao: newDescricao.trim(),
      status: 'pendente',
      dataCriacao: todayStr,
      prioridade: newPrioridade,
      observacao: ''
    });

    setNewDescricao('');
    setNewCredenciado('');
    setNewSetor('Geral');
    setNewPrioridade('alta');
    setIsAdding(false);
    loadPendencias();
  };

  const handleExportOutlook = (item) => {
    const now = new Date();
    const end = new Date(now.getTime() + 60 * 60 * 1000);
    downloadIcsFile(
      `[PENDÊNCIA SKY] ${item.credenciado} - ${item.setor}`,
      `Pendência: ${item.descricao}\nPrioridade: ${item.prioridade.toUpperCase()}\nCriada em: ${formatDateBR(item.dataCriacao)}`,
      now,
      end
    );
  };

  // Filtragem
  const filteredItems = pendencias.filter((item) => {
    if (statusFilter !== 'todas' && item.status !== statusFilter) return false;
    if (sectorFilter !== 'todos' && item.setor !== sectorFilter) return false;

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const desc = (item.descricao || '').toLowerCase();
      const cred = (item.credenciado || '').toLowerCase();
      const set = (item.setor || '').toLowerCase();
      return desc.includes(term) || cred.includes(term) || set.includes(term);
    }

    return true;
  });

  // Ordena pendentes por mais dias na tela (mais urgentes primeiro)
  filteredItems.sort((a, b) => {
    if (a.status !== b.status) {
      return a.status === 'pendente' ? -1 : 1;
    }
    const daysA = getDaysOnScreen(a.dataCriacao);
    const daysB = getDaysOnScreen(b.dataCriacao);
    return daysB - daysA;
  });

  return (
    <div className="space-y-6">
      {/* Header com Ações */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <CheckCircle2 className="w-7 h-7 text-rose-600" />
            Minhas Pendências
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Controle de ações, prazos e tempo que cada pendência está em aberto na sua tela.
          </p>
        </div>

        <button
          onClick={() => setIsAdding(!isAdding)}
          className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-4 py-2.5 rounded-xl shadow transition flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-5 h-5" />
          {isAdding ? 'Fechar Formulário' : 'Nova Pendência'}
        </button>
      </div>

      {/* Formulário de Adicionar Nova Pendência */}
      {isAdding && (
        <form
          onSubmit={handleAddSubmit}
          className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl border border-slate-800 space-y-4 animate-in slide-in-from-top-3"
        >
          <h3 className="font-bold text-base text-rose-400 flex items-center gap-2">
            <Plus className="w-4 h-4" /> Cadastrar Nova Pendência
          </h3>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">
              Descrição da Pendência / Ação Necessária <span className="text-rose-400">*</span>
            </label>
            <textarea
              required
              rows={2}
              value={newDescricao}
              onChange={(e) => setNewDescricao(e.target.value)}
              placeholder="Ex: Cobrar envio de relatórios de retiradas atrasados pelo credenciado..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Credenciado Vinculado
              </label>
              <input
                type="text"
                value={newCredenciado}
                onChange={(e) => setNewCredenciado(e.target.value)}
                placeholder="Ex: Credenciado Norte, Geral..."
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Setor
              </label>
              <select
                value={newSetor}
                onChange={(e) => setNewSetor(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:ring-2 focus:ring-rose-500"
              >
                <option value="Geral">Geral / Supervisão</option>
                <option value="Torre de Controle">Torre de Controle</option>
                <option value="Estoque">Estoque</option>
                <option value="Vendas">Vendas</option>
                <option value="Proprietário">Proprietário</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Prioridade
              </label>
              <select
                value={newPrioridade}
                onChange={(e) => setNewPrioridade(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:ring-2 focus:ring-rose-500"
              >
                <option value="alta">Alta (Urgente)</option>
                <option value="media">Média</option>
                <option value="baixa">Baixa</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-5 py-2 rounded-xl shadow text-sm"
            >
              Salvar Pendência
            </button>
          </div>
        </form>
      )}

      {/* Barra de Filtros e Busca */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Campo de Busca */}
        <div className="relative w-full md:w-72">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar pendência..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:ring-2 focus:ring-rose-500"
          />
        </div>

        {/* Botões de Filtro de Status */}
        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setStatusFilter('pendente')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              statusFilter === 'pendente'
                ? 'bg-amber-500 text-white shadow'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Pendentes ({pendencias.filter((p) => p.status === 'pendente').length})
          </button>
          <button
            onClick={() => setStatusFilter('executado')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              statusFilter === 'executado'
                ? 'bg-emerald-600 text-white shadow'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Executadas ({pendencias.filter((p) => p.status === 'executado').length})
          </button>
          <button
            onClick={() => setStatusFilter('todas')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              statusFilter === 'todas'
                ? 'bg-slate-900 text-white shadow'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todas ({pendencias.length})
          </button>
        </div>
      </div>

      {/* Lista de Cards de Pendências */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">Carregando pendências...</div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-3xl border border-slate-200 p-8 space-y-3">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
          <h4 className="font-bold text-slate-800 text-base">Tudo em dia!</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Nenhuma pendência encontrada com os filtros selecionados.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item) => {
            const isPendente = item.status === 'pendente';
            const daysOnScreen = getDaysOnScreen(item.dataCriacao);

            // Cores do indicador de dias na tela
            let daysBadgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-300';
            let daysLabel = `${daysOnScreen} dia(s) na tela`;

            if (daysOnScreen >= 6) {
              daysBadgeColor = 'bg-rose-100 text-rose-900 border-rose-400 font-extrabold animate-pulse';
              daysLabel = `⚠️ ${daysOnScreen} dias na tela (Crítico)`;
            } else if (daysOnScreen >= 3) {
              daysBadgeColor = 'bg-amber-100 text-amber-900 border-amber-300 font-bold';
              daysLabel = `${daysOnScreen} dias na tela`;
            }

            return (
              <div
                key={item.id}
                className={`bg-white rounded-2xl border p-4 sm:p-5 shadow-sm transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  isPendente
                    ? 'border-slate-200 hover:border-rose-300 hover:shadow-md'
                    : 'border-emerald-200 bg-emerald-50/20 opacity-75'
                }`}
              >
                {/* Lado Esquerdo: Checkbox & Conteúdo */}
                <div className="flex items-start gap-3.5 flex-1">
                  {/* Botão de Toggle Executado / Pendente */}
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(item)}
                    className={`mt-0.5 w-7 h-7 rounded-xl flex items-center justify-center shrink-0 border-2 transition-all ${
                      !isPendente
                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                        : 'border-slate-300 hover:border-rose-500 bg-white'
                    }`}
                    title={isPendente ? 'Marcar como Executado' : 'Reabrir Pendência'}
                  >
                    {!isPendente && <Check className="w-4 h-4 stroke-[3]" />}
                  </button>

                  <div className="space-y-1.5 flex-1">
                    <p
                      className={`text-sm sm:text-base font-semibold text-slate-900 ${
                        !isPendente ? 'line-through text-slate-400' : ''
                      }`}
                    >
                      {item.descricao}
                    </p>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      {/* Credenciado */}
                      <span className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-md font-medium text-slate-700">
                        <Building2 className="w-3 h-3 text-slate-500" />
                        {item.credenciado}
                      </span>

                      {/* Setor */}
                      <span className="bg-slate-100 px-2 py-0.5 rounded-md font-medium text-slate-700">
                        {item.setor}
                      </span>

                      {/* Data de Criação */}
                      <span className="flex items-center gap-1 text-slate-400">
                        <Calendar className="w-3 h-3" />
                        {formatDateBR(item.dataCriacao)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Lado Direito: Contador de Dias & Botão de Status */}
                <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  {/* Badge: Há quantos dias está na tela */}
                  {isPendente ? (
                    <span
                      className={`px-2.5 py-1 rounded-full text-[11px] border flex items-center gap-1 ${daysBadgeColor}`}
                    >
                      <Clock className="w-3 h-3" />
                      {daysLabel}
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-[11px] border bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Executado
                    </span>
                  )}

                  {/* Ações */}
                  <div className="flex items-center gap-1">
                    {/* Botão Executado / Pendente com 1 clique */}
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(item)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-sm ${
                        isPendente
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                      }`}
                    >
                      {isPendente ? 'Concluir' : 'Reabrir'}
                    </button>

                    {/* Adicionar ao Outlook Calendar */}
                    <button
                      type="button"
                      onClick={() => handleExportOutlook(item)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition"
                      title="Adicionar ao Calendário Outlook"
                    >
                      <CalendarPlus className="w-4 h-4" />
                    </button>

                    {/* Excluir */}
                    <button
                      type="button"
                      onClick={(e) => handleDelete(item.id, e)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                      title="Excluir pendência"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
