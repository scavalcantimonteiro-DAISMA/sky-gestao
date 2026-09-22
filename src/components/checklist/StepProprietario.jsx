import React from 'react';
import { UserCheck, Activity, RotateCcw, TrendingUp, ShoppingBag, MessageSquare, AlertCircle } from 'lucide-react';
import PhotoUploader from './PhotoUploader';
import SignaturePad from './SignaturePad';

export default function StepProprietario({ data, onChange }) {
  const prop = data.proprietario || {
    indicadorTaAt: '',
    indicadorTaPp: '',
    indicadorRetiradas: '',
    indicadorReaberturaAt: '',
    indicadorReaberturaPp: '',
    // Vendas espelhadas
    vendasPos: data.vendas?.vendasPos ?? 0,
    vendasNp: data.vendas?.vendasNp ?? 0,
    vendasRecarga: data.vendas?.vendasRecarga ?? 0,
    vendasChip: data.vendas?.vendasChip ?? 0,
    vendasSeguro: data.vendas?.vendasSeguro ?? 0,
    permanencia: data.vendas?.permanencia || '',
    conversaAlinhamento: '',
    pendencia: '',
    foto: '',
    assinatura: ''
  };

  const updateProp = (field, value) => {
    onChange('proprietario', {
      ...prop,
      [field]: value
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="border-b border-slate-200 pb-4">
        <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <UserCheck className="w-6 h-6 text-rose-600" />
          Setor: Proprietário & Serviços (Alinhamento Gerencial)
        </h3>
        <p className="text-sm text-slate-500 mt-1">
          Alinhamento dos indicadores chave de serviços com o dono/gestor e validação da produção de vendas.
        </p>
      </div>

      {/* Indicadores de Serviços */}
      <div>
        <h4 className="text-sm font-bold uppercase tracking-wider text-rose-700 mb-3 flex items-center gap-1.5">
          <Activity className="w-4 h-4" />
          Indicadores de Serviços
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* T.A de AT */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1.5">
            <label className="block text-sm font-semibold text-slate-800">
              Indicador T.A de AT
            </label>
            <input
              type="text"
              value={prop.indicadorTaAt || ''}
              onChange={(e) => updateProp('indicadorTaAt', e.target.value)}
              placeholder="Ex: 94.2% ou 2.1 dias"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 text-slate-900 bg-white font-bold text-base"
            />
            <span className="text-xs text-slate-400">Tempo/Taxa de Atendimento AT</span>
          </div>

          {/* T.A de PP */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1.5">
            <label className="block text-sm font-semibold text-slate-800">
              Indicador T.A de PP
            </label>
            <input
              type="text"
              value={prop.indicadorTaPp || ''}
              onChange={(e) => updateProp('indicadorTaPp', e.target.value)}
              placeholder="Ex: 96% ou 1.8 dias"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 text-slate-900 bg-white font-bold text-base"
            />
            <span className="text-xs text-slate-400">Tempo/Taxa de Atendimento PP</span>
          </div>

          {/* Indicador de Retiradas */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1.5">
            <label className="block text-sm font-semibold text-slate-800">
              Indicador de Retiradas
            </label>
            <input
              type="text"
              value={prop.indicadorRetiradas || ''}
              onChange={(e) => updateProp('indicadorRetiradas', e.target.value)}
              placeholder="Ex: 87% da meta"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 text-slate-900 bg-white font-bold text-base"
            />
            <span className="text-xs text-slate-400">Eficiência de recolhimento</span>
          </div>

          {/* Reabertura de AT */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1.5">
            <label className="block text-sm font-semibold text-slate-800 flex items-center gap-1.5">
              <RotateCcw className="w-4 h-4 text-amber-600" />
              Reabertura de AT
            </label>
            <input
              type="text"
              value={prop.indicadorReaberturaAt || ''}
              onChange={(e) => updateProp('indicadorReaberturaAt', e.target.value)}
              placeholder="Ex: 4.5% (meta &lt; 5%)"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 text-slate-900 bg-white font-bold text-base"
            />
            <span className="text-xs text-slate-400">Índice de reincidência de reparo</span>
          </div>

          {/* Reabertura de PP */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1.5">
            <label className="block text-sm font-semibold text-slate-800 flex items-center gap-1.5">
              <RotateCcw className="w-4 h-4 text-amber-600" />
              Reabertura de PP
            </label>
            <input
              type="text"
              value={prop.indicadorReaberturaPp || ''}
              onChange={(e) => updateProp('indicadorReaberturaPp', e.target.value)}
              placeholder="Ex: 2.1%"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 text-slate-900 bg-white font-bold text-base"
            />
            <span className="text-xs text-slate-400">Reabertura de instalação</span>
          </div>
        </div>
      </div>

      {/* Alinhamento de Vendas (Já preenchido automaticamente) */}
      <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-sm border border-slate-800">
        <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
              <ShoppingBag className="w-4 h-4" />
              Alinhamento de Vendas com o Proprietário
            </h4>
            <p className="text-xs text-slate-400">
              Valores trazidos do setor de vendas para confirmação em reunião com a diretoria:
            </p>
          </div>
          <span className="text-xs bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded font-medium">
            Pré-preenchido
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Pós-Pago</label>
            <input
              type="number"
              min="0"
              value={prop.vendasPos ?? data.vendas?.vendasPos ?? 0}
              onChange={(e) => updateProp('vendasPos', parseInt(e.target.value, 10) || 0)}
              className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white font-bold text-center"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">NP</label>
            <input
              type="number"
              min="0"
              value={prop.vendasNp ?? data.vendas?.vendasNp ?? 0}
              onChange={(e) => updateProp('vendasNp', parseInt(e.target.value, 10) || 0)}
              className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white font-bold text-center"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Recarga</label>
            <input
              type="number"
              min="0"
              value={prop.vendasRecarga ?? data.vendas?.vendasRecarga ?? 0}
              onChange={(e) => updateProp('vendasRecarga', parseInt(e.target.value, 10) || 0)}
              className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white font-bold text-center"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Chip</label>
            <input
              type="number"
              min="0"
              value={prop.vendasChip ?? data.vendas?.vendasChip ?? 0}
              onChange={(e) => updateProp('vendasChip', parseInt(e.target.value, 10) || 0)}
              className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white font-bold text-center"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Seguro</label>
            <input
              type="number"
              min="0"
              value={prop.vendasSeguro ?? data.vendas?.vendasSeguro ?? 0}
              onChange={(e) => updateProp('vendasSeguro', parseInt(e.target.value, 10) || 0)}
              className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white font-bold text-center"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Permanência</label>
            <input
              type="text"
              value={prop.permanencia || data.vendas?.permanencia || ''}
              onChange={(e) => updateProp('permanencia', e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white font-bold text-center text-sm"
            />
          </div>
        </div>
      </div>

      {/* Conversa e Alinhamento Realizado */}
      <div className="space-y-1.5">
        <label className="block text-sm font-semibold text-slate-800 flex items-center gap-1.5">
          <MessageSquare className="w-4 h-4 text-blue-600" />
          Registro da Conversa e Alinhamento Feito com o Proprietário
        </label>
        <textarea
          rows={4}
          value={prop.conversaAlinhamento || ''}
          onChange={(e) => updateProp('conversaAlinhamento', e.target.value)}
          placeholder="Descreva os pontos alinhados na reunião com o proprietário: compromissos assumidos pelo credenciado, plano de ação para atingimento de metas, ajustes de rota e contratações..."
          className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 text-slate-900 bg-white shadow-sm text-sm"
        />
      </div>

      {/* Campo de Pendências do Proprietário */}
      <div className="space-y-1.5">
        <label className="block text-sm font-semibold text-slate-800 flex items-center gap-1.5">
          <AlertCircle className="w-4 h-4 text-amber-500" />
          Pendências Acordadas com o Proprietário
        </label>
        <textarea
          rows={3}
          value={prop.pendencia || ''}
          onChange={(e) => updateProp('pendencia', e.target.value)}
          placeholder="Ex: Proprietário se comprometeu a colocar mais 2 técnicos na próxima segunda-feira, acertar acerto de comissões da equipe..."
          className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 text-slate-900 bg-white shadow-sm text-sm"
        />
      </div>

      {/* Foto do Alinhamento */}
      <PhotoUploader
        label="Foto do Alinhamento / Reunião com Proprietário"
        photo={prop.foto}
        onPhotoChange={(val) => updateProp('foto', val)}
      />

      {/* Assinatura Digital do Proprietário */}
      <div className="pt-2 border-t border-slate-200">
        <SignaturePad
          value={prop.assinatura}
          onChange={(val) => updateProp('assinatura', val)}
        />
      </div>
    </div>
  );
}
