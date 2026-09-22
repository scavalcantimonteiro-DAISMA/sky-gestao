import React, { useState, useRef } from 'react';
import { 
  X, Database, Download, Upload, FileSpreadsheet, 
  CheckCircle, AlertCircle, ShieldCheck, RefreshCw 
} from 'lucide-react';
import { 
  exportBackupJSON, importBackupJSON, exportAtasToCSV, exportPendenciasToCSV 
} from '../services/backupService';

export default function BackupModal({ isOpen, onClose, onDataRestored }) {
  const fileInputRef = useRef(null);
  const [statusMessage, setStatusMessage] = useState(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleExportJSON = async () => {
    try {
      await exportBackupJSON();
      setStatusMessage({ type: 'success', text: 'Backup exportado com sucesso!' });
    } catch (err) {
      setStatusMessage({ type: 'error', text: 'Erro ao exportar backup: ' + err.message });
    }
  };

  const handleExportAtasExcel = async () => {
    try {
      await exportAtasToCSV();
      setStatusMessage({ type: 'success', text: 'Planilha de Atas exportada para Excel!' });
    } catch (err) {
      setStatusMessage({ type: 'error', text: 'Erro ao exportar Excel: ' + err.message });
    }
  };

  const handleExportPendenciasExcel = async () => {
    try {
      await exportPendenciasToCSV();
      setStatusMessage({ type: 'success', text: 'Planilha de Pendências exportada para Excel!' });
    } catch (err) {
      setStatusMessage({ type: 'error', text: 'Erro ao exportar Excel: ' + err.message });
    }
  };

  const handleImportFile = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    if (!window.confirm('Atenção: Ao restaurar este backup, os dados atuais serão substituídos pelos do arquivo. Deseja continuar?')) {
      return;
    }

    setLoading(true);
    setStatusMessage(null);
    try {
      const res = await importBackupJSON(file);
      setStatusMessage({
        type: 'success',
        text: `Backup restaurado com sucesso! (${res.atasCount} atas, ${res.pendenciasCount} pendências, ${res.rotinasCount} rotinas).`
      });
      if (onDataRestored) onDataRestored();
    } catch (err) {
      setStatusMessage({ type: 'error', text: 'Erro ao restaurar: ' + err.message });
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm p-4 flex items-center justify-center animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center">
              <Database className="w-5 h-5 text-rose-500" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">Backup & Exportação</h3>
              <p className="text-xs text-slate-500">Garantia e segurança dos seus dados</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mensagem de Feedback */}
        {statusMessage && (
          <div
            className={`p-3.5 rounded-2xl flex items-center gap-2.5 text-xs font-semibold ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Seção 1: Backup & Restauração JSON */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-rose-600" />
            Segurança & Backup Total (JSON)
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              onClick={handleExportJSON}
              className="p-3 rounded-2xl border border-slate-200 hover:border-rose-400 hover:bg-rose-50/40 text-left transition flex items-center gap-3 group"
            >
              <div className="p-2 rounded-xl bg-rose-100 text-rose-600 group-hover:scale-105 transition-transform">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <strong className="block text-xs text-slate-900 font-bold">Fazer Backup</strong>
                <span className="text-[11px] text-slate-500">Baixar arquivo .json</span>
              </div>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="p-3 rounded-2xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 text-left transition flex items-center gap-3 group"
            >
              <div className="p-2 rounded-xl bg-blue-100 text-blue-600 group-hover:scale-105 transition-transform">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <strong className="block text-xs text-slate-900 font-bold">Restaurar</strong>
                <span className="text-[11px] text-slate-500">Subir arquivo salvo</span>
              </div>
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImportFile}
            className="hidden"
          />
        </div>

        {/* Seção 2: Exportação para Excel */}
        <div className="space-y-3 pt-3 border-t border-slate-100">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            Exportar Relatórios para Excel (CSV)
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              onClick={handleExportAtasExcel}
              className="p-3 rounded-2xl border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/40 text-left transition flex items-center gap-3 group"
            >
              <div className="p-2 rounded-xl bg-emerald-100 text-emerald-600 group-hover:scale-105 transition-transform">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <strong className="block text-xs text-slate-900 font-bold">Atas de Visitas</strong>
                <span className="text-[11px] text-slate-500">Planilha formatada</span>
              </div>
            </button>

            <button
              onClick={handleExportPendenciasExcel}
              className="p-3 rounded-2xl border border-slate-200 hover:border-amber-400 hover:bg-amber-50/40 text-left transition flex items-center gap-3 group"
            >
              <div className="p-2 rounded-xl bg-amber-100 text-amber-600 group-hover:scale-105 transition-transform">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <strong className="block text-xs text-slate-900 font-bold">Pendências</strong>
                <span className="text-[11px] text-slate-500">Com dias na tela</span>
              </div>
            </button>
          </div>
        </div>

        {/* Rodapé */}
        <div className="pt-2 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
