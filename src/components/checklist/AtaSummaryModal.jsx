import React, { useState } from 'react';
import { 
  FileText, Download, Mail, Copy, Check, X, Building2, MapPin, 
  Calendar, CheckCircle, Radio, Boxes, ShoppingCart, UserCheck, 
  AlertCircle, ArrowRight, MessageSquare, PenTool
} from 'lucide-react';
import { generateAtaPDF } from '../../services/pdfGenerator';
import { openOutlookEmailForAta, openWhatsAppAta, copyAtaToClipboard, formatDateBR } from '../../services/outlookService';
import { db } from '../../db';

export default function AtaSummaryModal({ ata, onClose, onAtaSaved }) {
  const [copied, setCopied] = useState(false);
  const [syncPendencias, setSyncPendencias] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const tc = ata.torreControle || {};
  const est = ata.estoque || {};
  const ven = ata.vendas || {};
  const prop = ata.proprietario || {};

  // Extrai todas as pendências não vazias dos setores
  const pendenciasConsolidadas = [];
  if (tc.pendencia?.trim()) {
    pendenciasConsolidadas.push({ setor: 'Torre de Controle', descricao: tc.pendencia.trim() });
  }
  if (est.pendencia?.trim()) {
    pendenciasConsolidadas.push({ setor: 'Estoque', descricao: est.pendencia.trim() });
  }
  if (ven.pendencia?.trim()) {
    pendenciasConsolidadas.push({ setor: 'Vendas', descricao: ven.pendencia.trim() });
  }
  if (prop.pendencia?.trim()) {
    pendenciasConsolidadas.push({ setor: 'Proprietário', descricao: prop.pendencia.trim() });
  }

  const handleCopy = async () => {
    await copyAtaToClipboard({ ...ata, todasPendencias: pendenciasConsolidadas });
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadPDF = () => {
    generateAtaPDF({ ...ata, todasPendencias: pendenciasConsolidadas });
  };

  const handleOpenOutlook = () => {
    openOutlookEmailForAta({ ...ata, todasPendencias: pendenciasConsolidadas });
  };

  const handleOpenWhatsApp = () => {
    openWhatsAppAta({ ...ata, todasPendencias: pendenciasConsolidadas });
  };

  const handleSaveAta = async () => {
    setIsSaving(true);
    try {
      const ataToSave = {
        ...ata,
        todasPendencias: pendenciasConsolidadas,
        createdAt: new Date().toISOString()
      };

      const ataId = await db.atas.add(ataToSave);

      // Se marcado para sincronizar pendências com a Gestão do Dia
      if (syncPendencias && pendenciasConsolidadas.length > 0) {
        const todayStr = new Date().toISOString().split('T')[0];
        const pendenciasToAdd = pendenciasConsolidadas.map((p) => ({
          origem: 'ata',
          ataId: ataId,
          credenciado: ata.credenciado,
          setor: p.setor,
          descricao: p.descricao,
          status: 'pendente',
          dataCriacao: todayStr,
          prioridade: p.setor === 'Torre de Controle' ? 'alta' : 'media',
          observacao: `Originado na visita de ${formatDateBR(ata.dataVisita)}`
        }));
        await db.pendencias.bulkAdd(pendenciasToAdd);
      }

      setSavedSuccess(true);
      if (onAtaSaved) {
        onAtaSaved(ataId);
      }
    } catch (err) {
      console.error('Erro ao salvar Ata no banco:', err);
      alert('Erro ao salvar no banco local: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm p-4 sm:p-6 flex items-center justify-center animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header do Modal */}
        <div className="bg-gradient-to-r from-rose-600 to-red-700 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight">ATA DE REUNIÃO CONCLUÍDA</h2>
              <p className="text-xs text-rose-100">
                Credenciado {ata.credenciado} • {formatDateBR(ata.dataVisita)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-2 rounded-xl hover:bg-white/10 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Corpo com resumo visual da Ata */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-700">
          {savedSuccess && (
            <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 p-4 rounded-2xl flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-emerald-600 shrink-0" />
              <div>
                <p className="font-bold">Ata Salva com Sucesso no Histórico!</p>
                {syncPendencias && (
                  <p className="text-xs text-emerald-700">
                    As pendências identificadas foram cadastradas no módulo Gestão do Dia.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Dados Gerais */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div>
              <span className="text-xs text-slate-400 block font-medium">Credenciado</span>
              <strong className="text-slate-900">{ata.credenciado}</strong>
            </div>
            <div>
              <span className="text-xs text-slate-400 block font-medium">Cidade</span>
              <strong className="text-slate-900">{ata.cidade}</strong>
            </div>
            <div>
              <span className="text-xs text-slate-400 block font-medium">Data Visita</span>
              <strong className="text-slate-900">{formatDateBR(ata.dataVisita)}</strong>
            </div>
            <div>
              <span className="text-xs text-slate-400 block font-medium">Supervisor</span>
              <strong className="text-slate-900">{ata.supervisor || 'Supervisor SKY'}</strong>
            </div>
          </div>

          {/* Resumos por Setor */}
          <div className="space-y-4">
            {/* Torre */}
            <div className="p-4 rounded-2xl border border-slate-200 bg-white">
              <h4 className="font-bold text-slate-900 flex items-center gap-2 mb-2">
                <Radio className="w-4 h-4 text-rose-600" />
                Torre de Controle
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div>OSs AT Caixa: <strong>{tc.osAtCaixa ?? 0}</strong></div>
                <div>OSs PP Caixa: <strong>{tc.osPpCaixa ?? 0}</strong></div>
                <div>Técnicos Campo: <strong>{tc.tecnicosCampo ?? 0}</strong></div>
                <div>
                  Vencidas: 
                  <strong className={tc.temOsVencidas ? 'text-rose-600 ml-1' : 'text-emerald-600 ml-1'}>
                    {tc.temOsVencidas ? `${tc.qtdVencidas} (${tc.tipoVencidas})` : 'Não'}
                  </strong>
                </div>
              </div>
              {tc.pendencia && (
                <div className="mt-2 text-xs text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200">
                  <strong>Pendência:</strong> {tc.pendencia}
                </div>
              )}
            </div>

            {/* Estoque */}
            <div className="p-4 rounded-2xl border border-slate-200 bg-white">
              <h4 className="font-bold text-slate-900 flex items-center gap-2 mb-2">
                <Boxes className="w-4 h-4 text-blue-600" />
                Estoque
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <div>Material p/ Semana: <strong>{est.materialSuficiente || 'Sim'}</strong></div>
                <div>Organizado: <strong>{est.organizado || 'Sim'}</strong></div>
                <div>Retiradas do Dia: <strong>{est.retiradasDia || '0'}</strong></div>
              </div>
              {est.pendencia && (
                <div className="mt-2 text-xs text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200">
                  <strong>Pendência:</strong> {est.pendencia}
                </div>
              )}
            </div>

            {/* Vendas */}
            <div className="p-4 rounded-2xl border border-slate-200 bg-white">
              <h4 className="font-bold text-slate-900 flex items-center gap-2 mb-2">
                <ShoppingCart className="w-4 h-4 text-emerald-600" />
                Vendas & Produção
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-xs">
                <div>Pós: <strong>{ven.vendasPos ?? 0}</strong></div>
                <div>NP: <strong>{ven.vendasNp ?? 0}</strong></div>
                <div>Recarga: <strong>{ven.vendasRecarga ?? 0}</strong></div>
                <div>Chip: <strong>{ven.vendasChip ?? 0}</strong></div>
                <div>Seguro: <strong>{ven.vendasSeguro ?? 0}</strong></div>
                <div>Perm.: <strong>{ven.permanencia || '0%'}</strong></div>
              </div>
              {ven.pendencia && (
                <div className="mt-2 text-xs text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200">
                  <strong>Pendência:</strong> {ven.pendencia}
                </div>
              )}
            </div>

            {/* Proprietário */}
            <div className="p-4 rounded-2xl border border-slate-200 bg-white">
              <h4 className="font-bold text-slate-900 flex items-center gap-2 mb-2">
                <UserCheck className="w-4 h-4 text-purple-600" />
                Proprietário & Serviços
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                <div>T.A AT: <strong>{prop.indicadorTaAt || 'N/A'}</strong></div>
                <div>T.A PP: <strong>{prop.indicadorTaPp || 'N/A'}</strong></div>
                <div>Retiradas: <strong>{prop.indicadorRetiradas || 'N/A'}</strong></div>
                <div>Reabertura AT: <strong>{prop.indicadorReaberturaAt || 'N/A'}</strong></div>
                <div>Reabertura PP: <strong>{prop.indicadorReaberturaPp || 'N/A'}</strong></div>
              </div>
              {prop.conversaAlinhamento && (
                <div className="mt-2 text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <strong>Alinhamento / Reunião:</strong> {prop.conversaAlinhamento}
                </div>
              )}
              {prop.pendencia && (
                <div className="mt-2 text-xs text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200">
                  <strong>Pendência:</strong> {prop.pendencia}
                </div>
              )}
            </div>
          </div>

          {/* Consolidação de Pendências */}
          <div className="bg-rose-50/70 p-4 rounded-2xl border border-rose-200">
            <h4 className="font-bold text-rose-900 flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              Pendências Consolidadas da Visita ({pendenciasConsolidadas.length})
            </h4>

            {pendenciasConsolidadas.length > 0 ? (
              <ul className="space-y-1.5 text-xs text-rose-950">
                {pendenciasConsolidadas.map((p, i) => (
                  <li key={i} className="flex items-start gap-2 bg-white p-2 rounded-lg border border-rose-100">
                    <span className="font-bold text-rose-600">[{p.setor}]</span>
                    <span>{p.descricao}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-500">Nenhuma pendência crítica anotada nesta visita.</p>
            )}

            {/* Checkbox sincronizar */}
            <label className="mt-3 flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-rose-900">
              <input
                type="checkbox"
                checked={syncPendencias}
                onChange={(e) => setSyncPendencias(e.target.checked)}
                className="w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500"
              />
              <span>Adicionar estas pendências automaticamente no módulo Gestão do Dia</span>
            </label>
          </div>
        </div>

        {/* Footer com Botões de Ação */}
        <div className="p-4 sm:p-5 bg-slate-100 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {!savedSuccess && (
              <button
                type="button"
                onClick={handleSaveAta}
                disabled={isSaving}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow transition flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4 text-emerald-400" />
                {isSaving ? 'Salvando...' : 'Salvar no Histórico'}
              </button>
            )}

            <button
              type="button"
              onClick={handleCopy}
              className="px-3 py-2.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition flex items-center justify-center gap-1.5"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copiado!' : 'Copiar Texto'}
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Botão Baixar PDF */}
            <button
              type="button"
              onClick={handleDownloadPDF}
              className="flex-1 sm:flex-none px-3.5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs sm:text-sm shadow-md transition flex items-center justify-center gap-1.5"
            >
              <Download className="w-4 h-4" />
              Baixar PDF
            </button>

            {/* Botão Enviar no WhatsApp */}
            <button
              type="button"
              onClick={handleOpenWhatsApp}
              className="flex-1 sm:flex-none px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md transition flex items-center justify-center gap-1.5"
              title="Compartilhar resumo da ata no WhatsApp"
            >
              <MessageSquare className="w-4 h-4" />
              WhatsApp
            </button>

            {/* Botão Enviar por E-mail (Abrir Outlook) */}
            <button
              type="button"
              onClick={handleOpenOutlook}
              className="flex-1 sm:flex-none px-3.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-md transition flex items-center justify-center gap-1.5"
              title="Abre o aplicativo do Outlook com assunto e ata preenchidos no corpo"
            >
              <Mail className="w-4 h-4" />
              Outlook
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
