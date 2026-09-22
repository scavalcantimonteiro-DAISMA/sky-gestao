import React from 'react';
import { Radio, AlertTriangle, Users, AlertCircle, Wrench, FileWarning } from 'lucide-react';
import PhotoUploader from './PhotoUploader';

export default function StepTorreControle({ data, onChange }) {
  const tc = data.torreControle || {
    osAtCaixa: 0,
    osPpCaixa: 0,
    temOsVencidas: false,
    qtdVencidas: 0,
    tipoVencidas: 'PP',
    tecnicosCampo: 0,
    pendencia: '',
    foto: ''
  };

  const updateTc = (field, value) => {
    onChange('torreControle', {
      ...tc,
      [field]: value
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="border-b border-slate-200 pb-4">
        <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Radio className="w-6 h-6 text-rose-600" />
          Setor: Torre de Controle
        </h3>
        <p className="text-sm text-slate-500 mt-1">
          Acompanhamento operacional das ordens de serviço (O.S.s) e equipes em campo.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Quantas O.S.s de AT em Caixa */}
        <div className="space-y-1.5 bg-slate-50 p-4 rounded-2xl border border-slate-200">
          <label className="block text-sm font-semibold text-slate-800 flex items-center gap-1.5">
            <Wrench className="w-4 h-4 text-rose-600" />
            Quantas O.S.s de AT em Caixa?
          </label>
          <input
            type="number"
            min="0"
            value={tc.osAtCaixa ?? 0}
            onChange={(e) => updateTc('osAtCaixa', parseInt(e.target.value, 10) || 0)}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 text-slate-900 bg-white font-bold text-lg"
          />
          <span className="text-xs text-slate-500">Assistência Técnica aguardando atendimento</span>
        </div>

        {/* Quantas O.S.s de PP em Caixa */}
        <div className="space-y-1.5 bg-slate-50 p-4 rounded-2xl border border-slate-200">
          <label className="block text-sm font-semibold text-slate-800 flex items-center gap-1.5">
            <Radio className="w-4 h-4 text-blue-600" />
            Quantas O.S.s de PP em Caixa?
          </label>
          <input
            type="number"
            min="0"
            value={tc.osPpCaixa ?? 0}
            onChange={(e) => updateTc('osPpCaixa', parseInt(e.target.value, 10) || 0)}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 text-slate-900 bg-white font-bold text-lg"
          />
          <span className="text-xs text-slate-500">Ordens de Pré-Pago / Instalações</span>
        </div>

        {/* Quantos técnicos em Campo */}
        <div className="space-y-1.5 bg-slate-50 p-4 rounded-2xl border border-slate-200 md:col-span-2">
          <label className="block text-sm font-semibold text-slate-800 flex items-center gap-1.5">
            <Users className="w-4 h-4 text-emerald-600" />
            Quantos técnicos em Campo?
          </label>
          <input
            type="number"
            min="0"
            value={tc.tecnicosCampo ?? 0}
            onChange={(e) => updateTc('tecnicosCampo', parseInt(e.target.value, 10) || 0)}
            placeholder="Ex: 5"
            className="w-full max-w-xs px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 text-slate-900 bg-white font-bold text-lg"
          />
          <span className="text-xs text-slate-500 block">Total de instaladores e reparadores em rota hoje</span>
        </div>
      </div>

      {/* Tem O.S.s vencidas? */}
      <div className={`p-4 rounded-2xl border transition-all ${tc.temOsVencidas ? 'bg-rose-50/60 border-rose-300' : 'bg-slate-50 border-slate-200'}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <label className="block text-base font-bold text-slate-900 flex items-center gap-2">
              <FileWarning className={`w-5 h-5 ${tc.temOsVencidas ? 'text-rose-600' : 'text-slate-500'}`} />
              Tem O.S.s vencidas?
            </label>
            <p className="text-xs text-slate-500">Há ordens de serviço fora do SLA ou estouradas?</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => updateTc('temOsVencidas', false)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                !tc.temOsVencidas
                  ? 'bg-emerald-600 text-white shadow'
                  : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
              }`}
            >
              Não
            </button>
            <button
              type="button"
              onClick={() => updateTc('temOsVencidas', true)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                tc.temOsVencidas
                  ? 'bg-rose-600 text-white shadow ring-2 ring-rose-400'
                  : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
              }`}
            >
              Sim, possui
            </button>
          </div>
        </div>

        {/* Se Sim: abre campos para dizer quantas e se são PPS ou ATS */}
        {tc.temOsVencidas && (
          <div className="mt-4 pt-4 border-t border-rose-200 grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in slide-in-from-top-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-rose-800 mb-1">
                Quantas O.S.s Vencidas?
              </label>
              <input
                type="number"
                min="1"
                value={tc.qtdVencidas || ''}
                onChange={(e) => updateTc('qtdVencidas', parseInt(e.target.value, 10) || 0)}
                placeholder="Ex: 3"
                className="w-full px-4 py-2.5 rounded-xl border border-rose-300 focus:ring-2 focus:ring-rose-500 text-slate-900 bg-white font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-rose-800 mb-1">
                Tipo das O.S.s Vencidas
              </label>
              <select
                value={tc.tipoVencidas || 'PP'}
                onChange={(e) => updateTc('tipoVencidas', e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-rose-300 focus:ring-2 focus:ring-rose-500 text-slate-900 bg-white font-semibold"
              >
                <option value="PP">Apenas PP (Pré-Pago)</option>
                <option value="AT">Apenas AT (Assistência Técnica)</option>
                <option value="Ambos">Ambos (PP e AT)</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Campo de Pendência no Setor */}
      <div className="space-y-1.5">
        <label className="block text-sm font-semibold text-slate-800 flex items-center gap-1.5">
          <AlertCircle className="w-4 h-4 text-amber-500" />
          Pendências do Setor de Torre de Controle
        </label>
        <textarea
          rows={3}
          value={tc.pendencia || ''}
          onChange={(e) => updateTc('pendencia', e.target.value)}
          placeholder="Escreva se houver alguma pendência, técnico faltante, trava de sistema ou ação necessária..."
          className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 text-slate-900 bg-white shadow-sm text-sm"
        />
        <span className="text-xs text-slate-400">
          Esta pendência será consolidada na Ata e poderá ser enviada para a Gestão do Dia.
        </span>
      </div>

      {/* Foto do Setor */}
      <PhotoUploader
        label="Foto da Torre de Controle / Painel"
        photo={tc.foto}
        onPhotoChange={(val) => updateTc('foto', val)}
      />
    </div>
  );
}
