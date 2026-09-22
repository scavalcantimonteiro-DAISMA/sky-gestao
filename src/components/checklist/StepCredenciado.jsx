import React from 'react';
import { Building2, MapPin, Calendar, UserCheck } from 'lucide-react';

export default function StepCredenciado({ data, onChange }) {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="border-b border-slate-200 pb-4">
        <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Building2 className="w-6 h-6 text-rose-600" />
          Identificação da Visita
        </h3>
        <p className="text-sm text-slate-500 mt-1">
          Informe os dados básicos do credenciado para iniciar o checklist operacional.
        </p>
      </div>

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

        {/* Cidade */}
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
              placeholder="Ex: Campinas, Ribeirão Preto, Salvador..."
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
    </div>
  );
}
