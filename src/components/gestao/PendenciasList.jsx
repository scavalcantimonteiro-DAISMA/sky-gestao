import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, Clock, AlertTriangle, Plus, Search, Filter, 
  Trash2, Check, Calendar, Building2, Tag, ArrowUpDown, CalendarPlus,
  Pencil, Bell, X, Sparkles, Send, BellRing
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { db } from '../../db';
import { formatDateBR, downloadIcsFile } from '../../services/outlookService';
import { schedulePendenciaReminderNtfy, sendNtfyNotification } from '../../services/ntfyService';
import { getLocalTodayStr } from '../../services/notificationService';
import { syncToCloudNow } from '../../services/cloudSyncService';

export default function PendenciasList() {
  const [pendencias, setPendencias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pendente'); // 'todas' | 'pendente' | 'executado'
  const [sectorFilter, setSectorFilter] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Formulário de nova pendência
  const [newDescricao, setNewDescricao] = useState('');
  const [newCredenciado, setNewCredenciado] = useState('');
  const [newSetor, setNewSetor] = useState('Geral');
  const [newPrioridade, setNewPrioridade] = useState('alta');
  const [newLembreteEm, setNewLembreteEm] = useState('');

  // Formulário de edição
  const [editDescricao, setEditDescricao] = useState('');
  const [editCredenciado, setEditCredenciado] = useState('');
  const [editSetor, setEditSetor] = useState('Geral');
  const [editPrioridade, setEditPrioridade] = useState('alta');
  const [editLembreteEm, setEditLembreteEm] = useState('');

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
    const handleRemoteSync = () => loadPendencias();
    window.addEventListener('sky-db-synced', handleRemoteSync);
    return () => window.removeEventListener('sky-db-synced', handleRemoteSync);
  }, []);

  // Helpers para cálculo de data/hora de lembrete
  const getDatetimeWithOffset = (dateObj) => {
    const offset = dateObj.getTimezoneOffset() * 60000;
    return new Date(dateObj.getTime() - offset).toISOString().slice(0, 16);
  };

  const getPlusHours = (hours) => {
    const d = new Date(Date.now() + hours * 60 * 60 * 1000);
    return getDatetimeWithOffset(d);
  };

  const getPlusDaysAtHour = (days, targetHour = 9) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    d.setHours(targetHour, 0, 0, 0);
    return getDatetimeWithOffset(d);
  };

  const formatDateTimeBR = (isoStr) => {
    if (!isoStr) return '';
    try {
      const [dPart, tPart] = isoStr.split('T');
      if (!dPart) return '';
      const [y, m, d] = dPart.split('-');
      const time = tPart ? tPart.slice(0, 5) : '09:00';
      return `${d}/${m} às ${time}`;
    } catch (e) {
      return isoStr;
    }
  };

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
    const todayStr = getLocalTodayStr();

    await db.pendencias.update(item.id, {
      status: nextStatus,
      dataExecucao: nextStatus === 'executado' ? todayStr : null
    });

    await syncToCloudNow(nextStatus === 'executado' ? 'Concluiu pendência' : 'Reabriu pendência');

    if (nextStatus === 'executado') {
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.8 }
        });
      } catch (e) {}

      sendNtfyNotification({
        title: `✅ Pendência Concluída: ${item.credenciado || 'Geral'}`,
        message: `[${item.setor || 'Geral'}] ${item.descricao}`,
        priority: 'default',
        tags: ['white_check_mark', 'sky']
      });
    }

    loadPendencias();
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (window.confirm('Excluir esta pendência?')) {
      await db.pendencias.delete(id);
      await syncToCloudNow('Excluiu pendência');
      loadPendencias();
    }
  };

  const handleOpenEdit = (item, e) => {
    e.stopPropagation();
    setEditingItem(item);
    setEditDescricao(item.descricao || '');
    setEditCredenciado(item.credenciado || '');
    setEditSetor(item.setor || 'Geral');
    setEditPrioridade(item.prioridade || 'alta');
    setEditLembreteEm(item.lembreteEm || '');
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editDescricao.trim() || !editingItem) return;

    await db.pendencias.update(editingItem.id, {
      descricao: editDescricao.trim(),
      credenciado: editCredenciado.trim() || 'Geral',
      setor: editSetor,
      prioridade: editPrioridade,
      lembreteEm: editLembreteEm || null,
      lembreteDisparado: false
    });

    await syncToCloudNow('Editou pendência');

    // Se adicionou lembrete futuro, agenda no ntfy
    if (editLembreteEm) {
      const targetTimeMs = new Date(editLembreteEm).getTime();
      if (targetTimeMs > Date.now() + 15000) {
        schedulePendenciaReminderNtfy(
          {
            credenciado: editCredenciado.trim() || 'Geral',
            setor: editSetor,
            descricao: editDescricao.trim()
          },
          String(Math.floor(targetTimeMs / 1000))
        );
      }
    }

    setEditingItem(null);
    loadPendencias();
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!newDescricao.trim()) return;

    const todayStr = getLocalTodayStr();
    const credName = newCredenciado.trim() || 'Geral';
    const descText = newDescricao.trim();

    await db.pendencias.add({
      origem: 'manual',
      credenciado: credName,
      setor: newSetor,
      descricao: descText,
      status: 'pendente',
      dataCriacao: todayStr,
      prioridade: newPrioridade,
      lembreteEm: newLembreteEm || null,
      lembreteDisparado: false,
      observacao: ''
    });

    await syncToCloudNow('Criou pendência');

    // Notifica imediatamente no ntfy sobre a nova pendência registrada
    sendNtfyNotification({
      title: `📌 Nova Pendência Registrada: ${credName}`,
      message: `[${newSetor}] ${descText}${newLembreteEm ? `\n⏰ Lembrete agendado para: ${formatDateTimeBR(newLembreteEm)}` : ''}`,
      priority: newPrioridade === 'alta' ? 'urgent' : 'high',
      tags: ['pushpin', 'memo']
    });

    // Se programou lembrete, agenda também na nuvem do ntfy para o horário escolhido
    if (newLembreteEm) {
      const targetTimeMs = new Date(newLembreteEm).getTime();
      if (targetTimeMs > Date.now() + 15000) {
        schedulePendenciaReminderNtfy(
          {
            credenciado: credName,
            setor: newSetor,
            descricao: descText
          },
          String(Math.floor(targetTimeMs / 1000))
        );
      }
    }

    setNewDescricao('');
    setNewCredenciado('');
    setNewSetor('Geral');
    setNewPrioridade('alta');
    setNewLembreteEm('');
    setIsAdding(false);
    loadPendencias();
  };

  const handleExportOutlook = (item) => {
    let start = new Date();
    if (item.lembreteEm) {
      start = new Date(item.lembreteEm);
    }
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    downloadIcsFile(
      `[PENDÊNCIA SKY] ${item.credenciado} - ${item.setor}`,
      `Pendência: ${item.descricao}\nPrioridade: ${item.prioridade.toUpperCase()}\nCriada em: ${formatDateBR(item.dataCriacao)}${item.lembreteEm ? `\nLembrete agendado para: ${formatDateTimeBR(item.lembreteEm)}` : ''}`,
      start,
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
            Minhas Pendências & Demandas
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Edite, gerencie prazos e programe lembretes para <strong>daqui a 4 horas, amanhã ou no calendário</strong>.
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
            <Plus className="w-4 h-4" /> Cadastrar Nova Pendência / Demanda
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
                <option value="alta">Alta (Crítica)</option>
                <option value="media">Média</option>
                <option value="baixa">Baixa</option>
              </select>
            </div>
          </div>

          {/* Seção de Lembrete Rápido & Calendário */}
          <div className="pt-2 border-t border-slate-800 space-y-2">
            <label className="block text-xs font-bold text-rose-300 flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5" />
              Programar Lembrete / Alarme para esta Demanda
            </label>

            {/* Botões de Acesso Rápido */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setNewLembreteEm(getPlusHours(4))}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition"
              >
                ⏱️ Daqui a 4 Horas
              </button>
              <button
                type="button"
                onClick={() => setNewLembreteEm(getPlusDaysAtHour(1, 9))}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition"
              >
                📅 Amanhã às 09:00
              </button>
              <button
                type="button"
                onClick={() => setNewLembreteEm(getPlusDaysAtHour(2, 9))}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition"
              >
                🗓️ Daqui a 2 Dias
              </button>
              {newLembreteEm && (
                <button
                  type="button"
                  onClick={() => setNewLembreteEm('')}
                  className="px-2 py-1 rounded-lg bg-rose-950/60 text-rose-300 text-xs font-semibold border border-rose-900 transition"
                >
                  ✕ Limpar
                </button>
              )}
            </div>

            {/* Input DateTime Personalizado */}
            <div className="flex items-center gap-2">
              <input
                type="datetime-local"
                value={newLembreteEm}
                onChange={(e) => setNewLembreteEm(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-medium focus:ring-2 focus:ring-rose-500"
              />
              {newLembreteEm && (
                <span className="text-xs text-rose-400 font-semibold">
                  Alarme tocará em: {formatDateTimeBR(newLembreteEm)}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
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

      {/* Modal de Edição de Pendência Existente */}
      {editingItem && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm p-4 flex items-center justify-center animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden space-y-5 p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">Editar Pendência</h3>
                  <p className="text-xs text-slate-500">Altere o texto, setor, prioridade ou lembrete</p>
                </div>
              </div>
              <button
                onClick={() => setEditingItem(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-slate-800 text-sm">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">
                  Descrição da Ação / Pendência <span className="text-rose-600">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={editDescricao}
                  onChange={(e) => setEditDescricao(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Credenciado
                  </label>
                  <input
                    type="text"
                    value={editCredenciado}
                    onChange={(e) => setEditCredenciado(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Setor
                  </label>
                  <select
                    value={editSetor}
                    onChange={(e) => setEditSetor(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-rose-500"
                  >
                    <option value="Geral">Geral / Supervisão</option>
                    <option value="Torre de Controle">Torre de Controle</option>
                    <option value="Estoque">Estoque</option>
                    <option value="Vendas">Vendas</option>
                    <option value="Proprietário">Proprietário</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Prioridade
                  </label>
                  <select
                    value={editPrioridade}
                    onChange={(e) => setEditPrioridade(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-rose-500"
                  >
                    <option value="alta">Alta (Crítica)</option>
                    <option value="media">Média</option>
                    <option value="baixa">Baixa</option>
                  </select>
                </div>
              </div>

              {/* Lembrete na Edição */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-rose-600" />
                  Data e Horário do Lembrete
                </label>

                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setEditLembreteEm(getPlusHours(4))}
                    className="px-2 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 transition"
                  >
                    ⏱️ +4 Horas
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditLembreteEm(getPlusDaysAtHour(1, 9))}
                    className="px-2 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 transition"
                  >
                    📅 Amanhã 09:00
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditLembreteEm(getPlusDaysAtHour(2, 9))}
                    className="px-2 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 transition"
                  >
                    🗓️ Daqui a 2 Dias
                  </button>
                  {editLembreteEm && (
                    <button
                      type="button"
                      onClick={() => setEditLembreteEm('')}
                      className="px-2 py-1 rounded-lg bg-rose-100 text-rose-700 text-xs font-semibold border border-rose-200 transition"
                    >
                      Remover Lembrete
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="datetime-local"
                    value={editLembreteEm}
                    onChange={(e) => setEditLembreteEm(e.target.value)}
                    className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs font-medium focus:ring-2 focus:ring-rose-500"
                  />
                  {editLembreteEm && (
                    <span className="text-xs text-rose-700 font-bold">
                      Programado: {formatDateTimeBR(editLembreteEm)}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-5 py-2 rounded-xl shadow text-xs transition"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
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
            placeholder="Buscar por nome, setor ou descrição..."
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
                      className={`text-sm sm:text-base font-semibold text-slate-900 leading-snug ${
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

                      {/* Prioridade */}
                      <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase ${
                        item.prioridade === 'alta'
                          ? 'bg-rose-100 text-rose-700 border border-rose-200'
                          : item.prioridade === 'media'
                          ? 'bg-amber-100 text-amber-700 border border-amber-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {item.prioridade || 'Média'}
                      </span>

                      {/* Data de Criação */}
                      <span className="flex items-center gap-1 text-slate-400">
                        <Calendar className="w-3 h-3" />
                        {formatDateBR(item.dataCriacao)}
                      </span>

                      {/* Lembrete Agendado Badge */}
                      {item.lembreteEm && isPendente && (
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1">
                          <BellRing className="w-3 h-3 text-purple-600 animate-pulse" />
                          Lembrar: {formatDateTimeBR(item.lembreteEm)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Lado Direito: Contador de Dias & Ações */}
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

                    {/* Botão de Editar */}
                    <button
                      type="button"
                      onClick={(e) => handleOpenEdit(item, e)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                      title="Editar pendência e lembrete"
                    >
                      <Pencil className="w-4 h-4" />
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
