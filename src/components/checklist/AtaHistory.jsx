import React, { useState, useEffect } from 'react';
import { 
  History, Search, FileText, Download, Mail, Trash2, Calendar, 
  MapPin, Building2, AlertCircle, Eye, PlusCircle, MessageSquare
} from 'lucide-react';
import { db } from '../../db';
import { generateAtaPDF } from '../../services/pdfGenerator';
import { openOutlookEmailForAta, openWhatsAppAta, formatDateBR } from '../../services/outlookService';
import AtaSummaryModal from './AtaSummaryModal';

export default function AtaHistory({ onNewChecklist }) {
  const [atas, setAtas] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAta, setSelectedAta] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadAtas = async () => {
    setLoading(true);
    try {
      const allAtas = await db.atas.toArray();
      // Ordena por data mais recente
      allAtas.sort((a, b) => new Date(b.dataVisita || b.createdAt) - new Date(a.dataVisita || a.createdAt));
      setAtas(allAtas);
    } catch (err) {
      console.error('Erro ao carregar histórico:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAtas();
  }, []);

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (window.confirm('Tem certeza que deseja remover esta Ata do histórico local?')) {
      await db.atas.delete(id);
      loadAtas();
    }
  };

  const filteredAtas = atas.filter((a) => {
    const term = searchTerm.toLowerCase();
    const cred = (a.credenciado || '').toLowerCase();
    const cid = (a.cidade || '').toLowerCase();
    return cred.includes(term) || cid.includes(term);
  });

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <History className="w-7 h-7 text-rose-600" />
            Histórico de Visitas & Atas
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Consulte todas as atas geradas, faça download de PDFs ou reenvie pelo Outlook a qualquer momento.
          </p>
        </div>

        <button
          onClick={onNewChecklist}
          className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-4 py-2.5 rounded-xl shadow transition flex items-center gap-2 self-start sm:self-auto"
        >
          <PlusCircle className="w-5 h-5" />
          Novo Checklist
        </button>
      </div>

      {/* Barra de Busca */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
          <Search className="w-5 h-5" />
        </div>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar por nome do credenciado ou cidade..."
          className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-300 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 text-slate-900 bg-white shadow-sm"
        />
      </div>

      {/* Lista de Atas */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">Carregando histórico...</div>
      ) : filteredAtas.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <FileText className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">
            {searchTerm ? 'Nenhuma ata encontrada com este termo' : 'Nenhuma visita cadastrada ainda'}
          </h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            {searchTerm 
              ? 'Tente buscar por outro credenciado ou limpe a busca.' 
              : 'Ao concluir o checklist de uma visita e gerar a Ata, ela ficará arquivada aqui para consultas futuras offline.'}
          </p>
          {!searchTerm && (
            <button
              onClick={onNewChecklist}
              className="mt-2 bg-rose-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-rose-700 transition"
            >
              Iniciar Primeiro Checklist
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredAtas.map((ata) => {
            const pendenciasCount = ata.todasPendencias ? ata.todasPendencias.length : 0;
            const tc = ata.torreControle || {};
            const ven = ata.vendas || {};

            return (
              <div
                key={ata.id}
                onClick={() => setSelectedAta(ata)}
                className="bg-white rounded-2xl border border-slate-200 hover:border-rose-300 p-5 shadow-sm hover:shadow-md transition-all cursor-pointer space-y-4 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-lg text-slate-900 flex items-center gap-1.5">
                        <Building2 className="w-5 h-5 text-rose-600 shrink-0" />
                        {ata.credenciado}
                      </h4>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {ata.cidade}
                      </p>
                    </div>

                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 flex items-center gap-1 shrink-0">
                      <Calendar className="w-3 h-3 text-slate-500" />
                      {formatDateBR(ata.dataVisita)}
                    </span>
                  </div>

                  {/* Badges de Destaque */}
                  <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-100 text-xs">
                    <div className="bg-slate-50 p-2 rounded-xl text-center">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">OSs em Caixa</span>
                      <span className="font-extrabold text-slate-800">
                        {(tc.osAtCaixa || 0) + (tc.osPpCaixa || 0)}
                      </span>
                    </div>

                    <div className="bg-slate-50 p-2 rounded-xl text-center">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Vendas Totais</span>
                      <span className="font-extrabold text-emerald-600">
                        {(ven.vendasPos || 0) + (ven.vendasNp || 0) + (ven.vendasRecarga || 0)}
                      </span>
                    </div>

                    <div className={`p-2 rounded-xl text-center ${pendenciasCount > 0 ? 'bg-amber-50 text-amber-900' : 'bg-slate-50 text-slate-600'}`}>
                      <span className="block text-[10px] uppercase font-bold">Pendências</span>
                      <span className="font-extrabold">{pendenciasCount}</span>
                    </div>
                  </div>
                </div>

                {/* Ações */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                  <span className="text-rose-600 font-semibold flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" /> Ver Detalhes
                  </span>

                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); generateAtaPDF(ata); }}
                      className="p-2 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-600 transition"
                      title="Baixar PDF"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); openWhatsAppAta(ata); }}
                      className="p-2 rounded-lg bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-600 transition"
                      title="Enviar Resumo no WhatsApp"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); openOutlookEmailForAta(ata); }}
                      className="p-2 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-600 transition"
                      title="Enviar por E-mail (Outlook)"
                    >
                      <Mail className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleDelete(ata.id, e)}
                      className="p-2 rounded-lg bg-slate-100 hover:bg-rose-100 text-slate-400 hover:text-rose-600 transition"
                      title="Excluir do Histórico"
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

      {/* Modal de visualização detalhada da ata */}
      {selectedAta && (
        <AtaSummaryModal
          ata={selectedAta}
          onClose={() => setSelectedAta(null)}
          onAtaSaved={loadAtas}
        />
      )}
    </div>
  );
}
