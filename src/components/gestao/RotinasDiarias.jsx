import React, { useState, useEffect } from 'react';
import { 
  Clock, Bell, Plus, Trash2, Calendar, Check, Volume2, 
  Sparkles, CalendarPlus, Power, AlertCircle, Pencil
} from 'lucide-react';
import { db } from '../../db';
import { showNativeNotification, syncAllRoutinesWithNtfy } from '../../services/notificationService';
import { scheduleRoutineOnNtfyServer, sendNtfyNotification } from '../../services/ntfyService';
import { downloadIcsFile } from '../../services/outlookService';
import { syncToCloudNow } from '../../services/cloudSyncService';

const DIAS_SEMANA = [
  { id: 1, label: 'Seg', full: 'Segunda-feira' },
  { id: 2, label: 'Ter', full: 'Terça-feira' },
  { id: 3, label: 'Qua', full: 'Quarta-feira' },
  { id: 4, label: 'Qui', full: 'Quinta-feira' },
  { id: 5, label: 'Sex', full: 'Sexta-feira' },
  { id: 6, label: 'Sáb', full: 'Sábado' },
  { id: 7, label: 'Dom', full: 'Domingo' }
];

export default function RotinasDiarias() {
  const [rotinas, setRotinas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingRotinaId, setEditingRotinaId] = useState(null);

  // Form states
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [horario, setHorario] = useState('09:00');
  const [selectedDias, setSelectedDias] = useState([1, 2, 3, 4, 5]); // Padrão: Seg a Sex

  const loadRotinas = async () => {
    setLoading(true);
    try {
      const items = await db.rotinas.toArray();
      setRotinas(items);
      if (items.length > 0) {
        syncAllRoutinesWithNtfy();
      }
    } catch (err) {
      console.error('Erro ao carregar rotinas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRotinas();
    const handleRemoteSync = () => loadRotinas();
    window.addEventListener('sky-db-synced', handleRemoteSync);
    return () => window.removeEventListener('sky-db-synced', handleRemoteSync);
  }, []);

  const resetForm = () => {
    setTitulo('');
    setDescricao('');
    setHorario('09:00');
    setSelectedDias([1, 2, 3, 4, 5]);
    setEditingRotinaId(null);
    setIsAdding(false);
  };

  const handleOpenEdit = (rotina) => {
    setEditingRotinaId(rotina.id);
    setTitulo(rotina.titulo || '');
    setDescricao(rotina.descricao || '');
    setHorario(rotina.horario || '09:00');
    setSelectedDias(Array.isArray(rotina.dias) && rotina.dias.length > 0 ? rotina.dias : [1, 2, 3, 4, 5]);
    setIsAdding(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleClearAll = async () => {
    if (window.confirm('Tem certeza que deseja apagar todas as rotinas para cadastrar as suas?')) {
      await db.rotinas.clear();
      await syncToCloudNow('Limpou todas as rotinas');
      setIsAdding(true);
      loadRotinas();
    }
  };

  // Calcula horário do alerta (20 minutos antes)
  const getAlertTime = (timeStr) => {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':').map(Number);
    let totalMinutes = h * 60 + m - 20;
    if (totalMinutes < 0) totalMinutes += 24 * 60;
    const alertH = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
    const alertM = String(totalMinutes % 60).padStart(2, '0');
    return `${alertH}:${alertM}`;
  };

  const handleToggleDia = (diaId) => {
    if (selectedDias.includes(diaId)) {
      if (selectedDias.length > 1) {
        setSelectedDias(selectedDias.filter((d) => d !== diaId));
      }
    } else {
      setSelectedDias([...selectedDias, diaId].sort());
    }
  };

  const handleSetSegASex = () => {
    setSelectedDias([1, 2, 3, 4, 5]);
  };

  const handleToggleActive = async (rotina) => {
    const nextAtivo = !rotina.ativo;
    await db.rotinas.update(rotina.id, {
      ativo: nextAtivo
    });
    await syncToCloudNow(nextAtivo ? 'Ativou rotina' : 'Desativou rotina');
    if (nextAtivo) {
      await scheduleRoutineOnNtfyServer({ ...rotina, ativo: true });
    }
    loadRotinas();
  };

  const handleDelete = async (id) => {
    if (window.confirm('Excluir esta rotina?')) {
      await db.rotinas.delete(id);
      await syncToCloudNow('Excluiu rotina');
      if (editingRotinaId === id) {
        resetForm();
      }
      loadRotinas();
    }
  };

  const handleTestRoutineAlarm = async (rotina) => {
    await showNativeNotification(`⏰ [ROTINA SKY] ${rotina.titulo} (${rotina.horario})`, {
      body: `Programada para às ${rotina.horario} (aviso às ${getAlertTime(rotina.horario)}). ${rotina.descricao || ''}`,
      sendNtfy: true
    });
  };

  const handleExportOutlook = (rotina) => {
    const [h, m] = rotina.horario.split(':').map(Number);
    const start = new Date();
    start.setHours(h, m, 0, 0);
    const end = new Date(start.getTime() + 30 * 60 * 1000);

    downloadIcsFile(
      `[ROTINA SKY] ${rotina.titulo}`,
      `Rotina Diária: ${rotina.descricao}\nHorário: ${rotina.horario} (Alerta celular 20 min antes às ${getAlertTime(rotina.horario)})`,
      start,
      end
    );
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!titulo.trim() || !horario) return;

    if (editingRotinaId !== null) {
      // Atualiza rotina existente
      const updatedFields = {
        titulo: titulo.trim(),
        descricao: descricao.trim(),
        horario,
        dias: selectedDias,
        ultimoAlertaData: '',
        ultimoAlertaExatoData: ''
      };

      await db.rotinas.update(editingRotinaId, updatedFields);
      await syncToCloudNow('Editou rotina');

      const updatedRotina = {
        id: editingRotinaId,
        ...updatedFields,
        ativo: true,
        notificacaoAtiva: true
      };

      await scheduleRoutineOnNtfyServer(updatedRotina, new Date());
      await syncAllRoutinesWithNtfy();

      sendNtfyNotification({
        title: `✏️ Rotina Atualizada: ${updatedRotina.titulo} (${updatedRotina.horario})`,
        message: `Novo horário configurado: aviso às ${getAlertTime(updatedRotina.horario)} (20 min antes) e às ${updatedRotina.horario} (hora exata).${updatedRotina.descricao ? `\n📋 ${updatedRotina.descricao}` : ''}`,
        priority: 'high',
        tags: ['calendar', 'pencil2']
      });

      resetForm();
      loadRotinas();
      return;
    }

    const newRotinaData = {
      titulo: titulo.trim(),
      descricao: descricao.trim(),
      horario,
      dias: selectedDias,
      ativo: true,
      notificacaoAtiva: true,
      ultimoAlertaData: '',
      ultimoAlertaExatoData: ''
    };

    const newId = await db.rotinas.add(newRotinaData);
    const savedRotina = { ...newRotinaData, id: newId };

    await syncToCloudNow('Criou rotina');

    // Agenda imediatamente no servidor ntfy para hoje e amanhã
    await scheduleRoutineOnNtfyServer(savedRotina, new Date());
    await syncAllRoutinesWithNtfy();

    // Envia confirmação imediata no ntfy informando que a rotina foi cadastrada e agendada
    sendNtfyNotification({
      title: `✅ Rotina Agendada: ${savedRotina.titulo} (${savedRotina.horario})`,
      message: `Você receberá o alerta no ntfy às ${getAlertTime(savedRotina.horario)} (20 min antes) e às ${savedRotina.horario} (hora exata)!${savedRotina.descricao ? `\n📋 ${savedRotina.descricao}` : ''}`,
      priority: 'high',
      tags: ['calendar', 'bell']
    });

    resetForm();
    loadRotinas();
  };

  return (
    <div className="space-y-6">
      {/* Header com Ações */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <Clock className="w-7 h-7 text-rose-600" />
            Rotinas Diárias & Lembretes
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Cadastre ou edite suas rotinas e receba alertas no celular <strong>20 minutos antes e na hora exata</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {rotinas.length > 0 && (
            <button
              onClick={handleClearAll}
              className="bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 font-semibold px-3 py-2.5 rounded-xl border border-slate-200 transition flex items-center gap-1.5 text-xs sm:text-sm"
              title="Apagar todas as rotinas para recadastrar"
            >
              <Trash2 className="w-4 h-4" />
              <span>Limpar Todas</span>
            </button>
          )}

          <button
            onClick={() => {
              if (isAdding) {
                resetForm();
              } else {
                setIsAdding(true);
              }
            }}
            className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-4 py-2.5 rounded-xl shadow transition flex items-center gap-2 text-sm"
          >
            <Plus className="w-5 h-5" />
            {isAdding ? 'Fechar Formulário' : 'Nova Rotina'}
          </button>
        </div>
      </div>

      {/* Formulário de Nova / Edição de Rotina */}
      {isAdding && (
        <form
          onSubmit={handleAddSubmit}
          className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl border border-slate-800 space-y-5 animate-in slide-in-from-top-3"
        >
          <h3 className="font-bold text-base text-rose-400 flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            {editingRotinaId !== null ? 'Editar Rotina de Supervisão' : 'Cadastrar Rotina de Supervisão'}
          </h3>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">
              Nome da Rotina <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: Cobrança da Fila de O.S.s Críticas, Alinhamento Matinal..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">
              Descrição e Instruções da Rotina
            </label>
            <textarea
              rows={2}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Detalhes do que deve ser feito (ex: ligar para credenciados com T.A acima de 95%...)"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Horário */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Horário da Rotina <span className="text-rose-400">*</span>
              </label>
              <input
                type="time"
                required
                value={horario}
                onChange={(e) => setHorario(e.target.value)}
                className="w-full px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-bold text-lg focus:ring-2 focus:ring-rose-500"
              />
              <p className="text-xs text-rose-400 mt-1.5 flex items-center gap-1 font-medium">
                <Bell className="w-3.5 h-3.5" />
                Alerta tocará às <strong>{getAlertTime(horario)}</strong> (20 min antes) e às <strong>{horario}</strong>
              </p>
            </div>

            {/* Dias da Semana */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-300">
                  Dias de Execução
                </label>
                <button
                  type="button"
                  onClick={handleSetSegASex}
                  className="text-xs text-rose-400 hover:text-rose-300 font-semibold underline"
                >
                  Segunda a Sexta
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1">
                {DIAS_SEMANA.map((dia) => {
                  const isSelected = selectedDias.includes(dia.id);
                  return (
                    <button
                      key={dia.id}
                      type="button"
                      onClick={() => handleToggleDia(dia.id)}
                      className={`py-2 rounded-lg text-xs font-bold transition ${
                        isSelected
                          ? 'bg-rose-600 text-white shadow'
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }`}
                      title={dia.full}
                    >
                      {dia.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-5 py-2 rounded-xl shadow text-sm"
            >
              {editingRotinaId !== null ? 'Salvar Alterações' : 'Salvar Rotina'}
            </button>
          </div>
        </form>
      )}

      {/* Lista de Rotinas Cadastradas */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">Carregando rotinas...</div>
      ) : rotinas.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-3xl border border-slate-200 p-8 space-y-3">
          <Clock className="w-12 h-12 text-slate-300 mx-auto" />
          <h4 className="font-bold text-slate-800 text-base">Nenhuma rotina cadastrada</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Cadastre suas tarefas diárias de supervisão para receber lembretes sonoros no celular 20 minutos antes.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rotinas.map((rotina) => {
            const alertTime = getAlertTime(rotina.horario);

            return (
              <div
                key={rotina.id}
                className={`bg-white rounded-3xl border p-5 shadow-sm transition-all flex flex-col justify-between space-y-4 ${
                  rotina.ativo
                    ? 'border-slate-200 hover:border-rose-300 hover:shadow-md'
                    : 'border-slate-200 bg-slate-50/70 opacity-60'
                }`}
              >
                <div>
                  {/* Topo do Card */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-black text-slate-900">{rotina.horario}</span>
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                          <Bell className="w-3 h-3 text-rose-600" />
                          Avisa às {alertTime}
                        </span>
                      </div>
                      <h4 className="font-bold text-base text-slate-800">{rotina.titulo}</h4>
                    </div>

                    {/* Botão Liga/Desliga */}
                    <button
                      type="button"
                      onClick={() => handleToggleActive(rotina)}
                      className={`p-2 rounded-xl transition ${
                        rotina.ativo
                          ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                          : 'bg-slate-200 text-slate-500 hover:bg-slate-300'
                      }`}
                      title={rotina.ativo ? 'Rotina Ativa' : 'Rotina Desativada'}
                    >
                      <Power className="w-4 h-4" />
                    </button>
                  </div>

                  {rotina.descricao && (
                    <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                      {rotina.descricao}
                    </p>
                  )}

                  {/* Dias da Semana */}
                  <div className="flex items-center gap-1 mt-3">
                    {DIAS_SEMANA.map((dia) => {
                      const isDayActive = rotina.dias?.includes(dia.id);
                      return (
                        <span
                          key={dia.id}
                          className={`w-6 h-6 rounded-lg text-[10px] font-bold flex items-center justify-center ${
                            isDayActive
                              ? 'bg-slate-900 text-white'
                              : 'bg-slate-100 text-slate-300'
                          }`}
                        >
                          {dia.label[0]}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Rodapé com Ações */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                  {/* Testar alarme */}
                  <button
                    type="button"
                    onClick={() => handleTestRoutineAlarm(rotina)}
                    className="text-slate-600 hover:text-rose-600 font-semibold flex items-center gap-1 bg-slate-50 hover:bg-rose-50 px-2.5 py-1.5 rounded-lg border border-slate-200 transition"
                    title="Faz o alarme sonoro tocar agora com a mensagem desta rotina"
                  >
                    <Volume2 className="w-3.5 h-3.5 text-rose-600" />
                    Testar Alarme
                  </button>

                  <div className="flex items-center gap-1.5">
                    {/* Editar Rotina */}
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(rotina)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition"
                      title="Editar rotina"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>

                    {/* Exportar Outlook */}
                    <button
                      type="button"
                      onClick={() => handleExportOutlook(rotina)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition"
                      title="Adicionar ao Calendário Outlook"
                    >
                      <CalendarPlus className="w-4 h-4" />
                    </button>

                    {/* Excluir */}
                    <button
                      type="button"
                      onClick={() => handleDelete(rotina.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                      title="Excluir rotina"
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
