import React from 'react';
import { Package, Boxes, CheckSquare, AlertCircle, TrendingDown } from 'lucide-react';
import PhotoUploader from './PhotoUploader';

export default function StepEstoque({ data, onChange }) {
  const est = data.estoque || {
    materialSuficiente: 'Sim',
    organizado: 'Sim',
    retiradasDia: '',
    pendencia: '',
    foto: ''
  };

  const updateEst = (field, value) => {
    onChange('estoque', {
      ...est,
      [field]: value
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="border-b border-slate-200 pb-4">
        <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Boxes className="w-6 h-6 text-rose-600" />
          Setor: Estoque
        </h3>
        <p className="text-sm text-slate-500 mt-1">
          Verificação física de materiais, organização e recolhimento de equipamentos de retirada.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Tem material suficiente para a semana? */}
        <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-200">
          <label className="block text-sm font-semibold text-slate-800 flex items-center gap-1.5">
            <Package className="w-4 h-4 text-rose-600" />
            Tem material suficiente para a semana?
          </label>
          <div className="grid grid-cols-3 gap-2">
            {['Sim', 'Não', 'Parcial'].map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => updateEst('materialSuficiente', opt)}
                className={`py-2 px-3 rounded-xl text-sm font-bold border transition-all ${
                  est.materialSuficiente === opt
                    ? opt === 'Sim'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow'
                      : opt === 'Não'
                      ? 'bg-rose-600 text-white border-rose-600 shadow'
                      : 'bg-amber-500 text-white border-amber-500 shadow'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
          <span className="text-xs text-slate-500">Cabos, conectores, antenas, LNBFs e receptores</span>
        </div>

        {/* Estoque organizado? */}
        <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-200">
          <label className="block text-sm font-semibold text-slate-800 flex items-center gap-1.5">
            <CheckSquare className="w-4 h-4 text-blue-600" />
            Estoque organizado?
          </label>
          <div className="grid grid-cols-3 gap-2">
            {['Sim', 'Não', 'Regular'].map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => updateEst('organizado', opt)}
                className={`py-2 px-3 rounded-xl text-sm font-bold border transition-all ${
                  est.organizado === opt
                    ? opt === 'Sim'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow'
                      : opt === 'Não'
                      ? 'bg-rose-600 text-white border-rose-600 shadow'
                      : 'bg-amber-500 text-white border-amber-500 shadow'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
          <span className="text-xs text-slate-500">Etiquetagem, separação de novos e avariados</span>
        </div>

        {/* Qual o resultado de retiradas do dia ? */}
        <div className="space-y-1.5 bg-slate-50 p-4 rounded-2xl border border-slate-200 md:col-span-2">
          <label className="block text-sm font-semibold text-slate-800 flex items-center gap-1.5">
            <TrendingDown className="w-4 h-4 text-indigo-600" />
            Qual o resultado de retiradas do dia?
          </label>
          <input
            type="text"
            value={est.retiradasDia || ''}
            onChange={(e) => updateEst('retiradasDia', e.target.value)}
            placeholder="Ex: 8 decodificadores recolhidos / meta do dia: 10"
            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 text-slate-900 bg-white font-medium text-base"
          />
          <span className="text-xs text-slate-500">
            Volume de aparelhos e itens recuperados trazidos pelos técnicos hoje
          </span>
        </div>
      </div>

      {/* Campo de Pendências do Estoque */}
      <div className="space-y-1.5">
        <label className="block text-sm font-semibold text-slate-800 flex items-center gap-1.5">
          <AlertCircle className="w-4 h-4 text-amber-500" />
          Pendências do Setor de Estoque
        </label>
        <textarea
          rows={3}
          value={est.pendencia || ''}
          onChange={(e) => updateEst('pendencia', e.target.value)}
          placeholder="Ex: Falta LNBF duplo, aguardando envio do hub regional, sucata sem descarte..."
          className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 text-slate-900 bg-white shadow-sm text-sm"
        />
      </div>

      {/* Foto do Estoque */}
      <PhotoUploader
        label="Foto do Estoque / Armazenamento"
        photo={est.foto}
        onPhotoChange={(val) => updateEst('foto', val)}
      />
    </div>
  );
}
