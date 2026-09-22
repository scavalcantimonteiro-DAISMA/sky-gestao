import React from 'react';
import { ShoppingCart, Award, RefreshCw, Cpu, ShieldCheck, Target, AlertCircle } from 'lucide-react';
import PhotoUploader from './PhotoUploader';

export default function StepVendas({ data, onChange }) {
  const ven = data.vendas || {
    vendasPos: 0,
    vendasNp: 0,
    vendasRecarga: 0,
    vendasChip: 0,
    vendasSeguro: 0,
    permanencia: '',
    pendencia: '',
    foto: ''
  };

  const updateVen = (field, value) => {
    const updatedVen = {
      ...ven,
      [field]: value
    };

    // Propaga também para o setor do proprietário como espelho inicial
    const prop = data.proprietario || {};
    const updatedProp = {
      ...prop,
      [field]: value
    };

    onChange('vendas', updatedVen);
    onChange('proprietario', updatedProp);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="border-b border-slate-200 pb-4">
        <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <ShoppingCart className="w-6 h-6 text-rose-600" />
          Setor: Vendas
        </h3>
        <p className="text-sm text-slate-500 mt-1">
          Acompanhamento da produção comercial por produto e qualidade da base (permanência).
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Quantas vendas de Pós? */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1.5">
          <label className="block text-sm font-semibold text-slate-800 flex items-center gap-1.5">
            <Award className="w-4 h-4 text-rose-600" />
            Vendas de Pós-Pago
          </label>
          <input
            type="number"
            min="0"
            value={ven.vendasPos ?? 0}
            onChange={(e) => updateVen('vendasPos', parseInt(e.target.value, 10) || 0)}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 text-slate-900 bg-white font-bold text-lg"
          />
          <span className="text-xs text-slate-400">Total de assinaturas Pós</span>
        </div>

        {/* Quantas vendas de NP? */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1.5">
          <label className="block text-sm font-semibold text-slate-800 flex items-center gap-1.5">
            <Target className="w-4 h-4 text-indigo-600" />
            Vendas de NP (Novos Produtos)
          </label>
          <input
            type="number"
            min="0"
            value={ven.vendasNp ?? 0}
            onChange={(e) => updateVen('vendasNp', parseInt(e.target.value, 10) || 0)}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 text-slate-900 bg-white font-bold text-lg"
          />
          <span className="text-xs text-slate-400">Novos produtos / SKY Fibra</span>
        </div>

        {/* Quantas vendas de Recarga? */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1.5">
          <label className="block text-sm font-semibold text-slate-800 flex items-center gap-1.5">
            <RefreshCw className="w-4 h-4 text-emerald-600" />
            Vendas de Recarga
          </label>
          <input
            type="number"
            min="0"
            value={ven.vendasRecarga ?? 0}
            onChange={(e) => updateVen('vendasRecarga', parseInt(e.target.value, 10) || 0)}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 text-slate-900 bg-white font-bold text-lg"
          />
          <span className="text-xs text-slate-400">Volume de recargas SKY Pré</span>
        </div>

        {/* Quantas vendas de Chip? */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1.5">
          <label className="block text-sm font-semibold text-slate-800 flex items-center gap-1.5">
            <Cpu className="w-4 h-4 text-amber-600" />
            Vendas de Chip
          </label>
          <input
            type="number"
            min="0"
            value={ven.vendasChip ?? 0}
            onChange={(e) => updateVen('vendasChip', parseInt(e.target.value, 10) || 0)}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 text-slate-900 bg-white font-bold text-lg"
          />
          <span className="text-xs text-slate-400">Ativações de Chip móvel</span>
        </div>

        {/* Quantas vendas de Seguro? */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1.5">
          <label className="block text-sm font-semibold text-slate-800 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-teal-600" />
            Vendas de Seguro
          </label>
          <input
            type="number"
            min="0"
            value={ven.vendasSeguro ?? 0}
            onChange={(e) => updateVen('vendasSeguro', parseInt(e.target.value, 10) || 0)}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 text-slate-900 bg-white font-bold text-lg"
          />
          <span className="text-xs text-slate-400">Seguros agregados à fatura</span>
        </div>

        {/* Qual a Permanencia ? */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1.5">
          <label className="block text-sm font-semibold text-slate-800 flex items-center gap-1.5">
            <Target className="w-4 h-4 text-purple-600" />
            Qual a Permanência (%)?
          </label>
          <input
            type="text"
            value={ven.permanencia || ''}
            onChange={(e) => updateVen('permanencia', e.target.value)}
            placeholder="Ex: 88.5%, 92%..."
            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 text-slate-900 bg-white font-bold text-lg"
          />
          <span className="text-xs text-slate-400">Índice de permanência da base</span>
        </div>
      </div>

      {/* Pendências de Vendas */}
      <div className="space-y-1.5">
        <label className="block text-sm font-semibold text-slate-800 flex items-center gap-1.5">
          <AlertCircle className="w-4 h-4 text-amber-500" />
          Pendências do Setor de Vendas
        </label>
        <textarea
          rows={3}
          value={ven.pendencia || ''}
          onChange={(e) => updateVen('pendencia', e.target.value)}
          placeholder="Ex: Treinamento de abordagem de novos produtos, vendedor sem acesso ao sistema..."
          className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 text-slate-900 bg-white shadow-sm text-sm"
        />
      </div>

      {/* Foto do Setor de Vendas */}
      <PhotoUploader
        label="Foto de Vendas / Mural de Metas"
        photo={ven.foto}
        onPhotoChange={(val) => updateVen('foto', val)}
      />
    </div>
  );
}
