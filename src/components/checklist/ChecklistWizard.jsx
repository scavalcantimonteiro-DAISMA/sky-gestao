import React, { useState } from 'react';
import { 
  Building2, Radio, Boxes, ShoppingCart, UserCheck, 
  ArrowLeft, ArrowRight, FileCheck, CheckCircle2, RotateCcw
} from 'lucide-react';
import StepCredenciado from './StepCredenciado';
import StepTorreControle from './StepTorreControle';
import StepEstoque from './StepEstoque';
import StepVendas from './StepVendas';
import StepProprietario from './StepProprietario';
import AtaSummaryModal from './AtaSummaryModal';

const STEPS = [
  { id: 1, title: 'Credenciado', icon: Building2 },
  { id: 2, title: 'Torre', icon: Radio },
  { id: 3, title: 'Estoque', icon: Boxes },
  { id: 4, title: 'Vendas', icon: ShoppingCart },
  { id: 5, title: 'Proprietário', icon: UserCheck }
];

export default function ChecklistWizard({ onCompleteChecklist }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [showSummaryModal, setShowSummaryModal] = useState(false);

  const [formData, setFormData] = useState({
    credenciado: '',
    cidade: '',
    dataVisita: new Date().toISOString().split('T')[0],
    supervisor: '',
    tipoVisita: 'setores', // 'setores' | 'proprietario_unico'
    torreControle: {
      osAtCaixa: 0,
      osPpCaixa: 0,
      temOsVencidas: false,
      qtdVencidas: 0,
      tipoVencidas: 'PP',
      tecnicosCampo: 0,
      pendencia: '',
      foto: ''
    },
    estoque: {
      materialSuficiente: 'Sim',
      organizado: 'Sim',
      retiradasDia: '',
      pendencia: '',
      foto: ''
    },
    vendas: {
      vendasPos: 0,
      vendasNp: 0,
      vendasRecarga: 0,
      vendasChip: 0,
      vendasSeguro: 0,
      permanencia: '',
      pendencia: '',
      foto: ''
    },
    proprietario: {
      indicadorTaAt: '',
      indicadorTaPp: '',
      indicadorRetiradas: '',
      indicadorReaberturaAt: '',
      indicadorReaberturaPp: '',
      vendasPos: 0,
      vendasNp: 0,
      vendasRecarga: 0,
      vendasChip: 0,
      vendasSeguro: 0,
      permanencia: '',
      conversaAlinhamento: '',
      pendencia: '',
      foto: ''
    }
  });

  const handleFieldChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (!formData.credenciado.trim()) {
        alert('Por favor, informe o Nome do Credenciado para prosseguir.');
        return;
      }
      if (!formData.cidade.trim()) {
        alert('Por favor, informe a Cidade do Credenciado para prosseguir.');
        return;
      }
    }

    if (currentStep < 5) {
      setCurrentStep((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      // Passo 5 finalizado: abrir Resumo da ATA
      setShowSummaryModal(true);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleReset = () => {
    if (window.confirm('Deseja limpar todos os campos e iniciar um novo checklist em branco?')) {
      setFormData({
        credenciado: '',
        cidade: '',
        dataVisita: new Date().toISOString().split('T')[0],
        supervisor: '',
        torreControle: {
          osAtCaixa: 0,
          osPpCaixa: 0,
          temOsVencidas: false,
          qtdVencidas: 0,
          tipoVencidas: 'PP',
          tecnicosCampo: 0,
          pendencia: '',
          foto: ''
        },
        estoque: {
          materialSuficiente: 'Sim',
          organizado: 'Sim',
          retiradasDia: '',
          pendencia: '',
          foto: ''
        },
        vendas: {
          vendasPos: 0,
          vendasNp: 0,
          vendasRecarga: 0,
          vendasChip: 0,
          vendasSeguro: 0,
          permanencia: '',
          pendencia: '',
          foto: ''
        },
        proprietario: {
          indicadorTaAt: '',
          indicadorTaPp: '',
          indicadorRetiradas: '',
          indicadorReaberturaAt: '',
          indicadorReaberturaPp: '',
          vendasPos: 0,
          vendasNp: 0,
          vendasRecarga: 0,
          vendasChip: 0,
          vendasSeguro: 0,
          permanencia: '',
          conversaAlinhamento: '',
          pendencia: '',
          foto: ''
        }
      });
      setCurrentStep(1);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Stepper Progressivo */}
      <div className="bg-white p-3 sm:p-4 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between">
          {STEPS.map((s, idx) => {
            const Icon = s.icon;
            const isCompleted = currentStep > s.id;
            const isCurrent = currentStep === s.id;

            return (
              <React.Fragment key={s.id}>
                <button
                  type="button"
                  onClick={() => {
                    // Permitir navegar para passos anteriores diretamente
                    if (s.id < currentStep) setCurrentStep(s.id);
                  }}
                  className={`flex flex-col sm:flex-row items-center gap-1.5 p-2 rounded-xl transition-all ${
                    isCurrent
                      ? 'text-rose-600 font-bold bg-rose-50'
                      : isCompleted
                      ? 'text-slate-700 font-medium hover:text-rose-600'
                      : 'text-slate-400'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-all ${
                      isCurrent
                        ? 'bg-rose-600 text-white shadow-md shadow-rose-500/30'
                        : isCompleted
                        ? 'bg-emerald-500 text-white'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <span className="text-[11px] sm:text-xs tracking-tight hidden md:inline">
                    {s.title}
                  </span>
                </button>

                {idx < STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-1 transition-colors ${
                      currentStep > s.id ? 'bg-emerald-500' : 'bg-slate-200'
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Container Principal do Passo Atual */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm">
        {formData.tipoVisita === 'proprietario_unico' && currentStep > 1 && (
          <div className="mb-6 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between text-xs text-amber-900 shadow-sm animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-amber-500/20 text-amber-800 rounded-lg">
                <UserCheck className="w-4 h-4" />
              </div>
              <div>
                <strong className="block text-amber-900 font-bold">Modo Proprietário Centralizado</strong>
                <span className="text-amber-700">Avaliando este setor diretamente com o proprietário responsável por toda a empresa.</span>
              </div>
            </div>
            <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-900 uppercase">
              Gestão Única
            </span>
          </div>
        )}

        {currentStep === 1 && (
          <StepCredenciado data={formData} onChange={handleFieldChange} />
        )}
        {currentStep === 2 && (
          <StepTorreControle data={formData} onChange={handleFieldChange} />
        )}
        {currentStep === 3 && (
          <StepEstoque data={formData} onChange={handleFieldChange} />
        )}
        {currentStep === 4 && (
          <StepVendas data={formData} onChange={handleFieldChange} />
        )}
        {currentStep === 5 && (
          <StepProprietario data={formData} onChange={handleFieldChange} />
        )}

        {/* Rodapé de Navegação */}
        <div className="mt-8 pt-6 border-t border-slate-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={handlePrev}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-100 transition flex items-center gap-2 text-sm"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </button>
            )}

            <button
              type="button"
              onClick={handleReset}
              className="p-2.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition text-xs flex items-center gap-1"
              title="Limpar formulário"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline">Limpar</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleNext}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-bold shadow-lg shadow-rose-600/30 transition-all flex items-center gap-2 text-sm sm:text-base group"
          >
            {currentStep === 5 ? (
              <>
                <FileCheck className="w-5 h-5" />
                <span>Gerar ATA de Reunião</span>
              </>
            ) : (
              <>
                <span>Avançar Setor</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Modal Resumo / Gerador de Ata */}
      {showSummaryModal && (
        <AtaSummaryModal
          ata={formData}
          onClose={() => setShowSummaryModal(false)}
          onAtaSaved={(id) => {
            if (onCompleteChecklist) onCompleteChecklist(id);
          }}
        />
      )}
    </div>
  );
}
