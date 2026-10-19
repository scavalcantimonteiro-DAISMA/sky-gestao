import React, { useState, useEffect } from 'react';
import { 
  X, Smartphone, Download, Share2, Copy, Check, 
  ExternalLink, QrCode, CheckCircle2, ArrowRight
} from 'lucide-react';

export default function InstallAppModal({ isOpen, onClose }) {
  const [copied, setCopied] = useState(false);
  const [canPrompt, setCanPrompt] = useState(false);
  const [platformTab, setPlatformTab] = useState('android'); // 'android' | 'iphone' | 'qr'
  const [currentUrl, setCurrentUrl] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentUrl(window.location.origin || window.location.href);
      if (window.deferredPwaPrompt) {
        setCanPrompt(true);
      }
    }

    const handleBeforeInstall = () => {
      setCanPrompt(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  if (!isOpen) return null;

  const handleNativeInstall = async () => {
    if (window.deferredPwaPrompt) {
      try {
        await window.deferredPwaPrompt.prompt();
        const choice = await window.deferredPwaPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          window.deferredPwaPrompt = null;
          setCanPrompt(false);
          if (onClose) onClose();
        }
      } catch (err) {
        console.warn('Erro ao disparar prompt de instalação:', err);
      }
    }
  };

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleShareWhatsApp = () => {
    const text = `Acesse o Sistema de Gestão SKY: ${currentUrl}`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(currentUrl)}`;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm p-4 flex items-center justify-center animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Cabeçalho */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center shadow-inner">
              <Download className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight">Baixar App no Celular</h3>
              <p className="text-xs text-emerald-100">Instalação rápida e direta sem precisar de Play Store</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto">
          {/* Botão de Instalação Nativa direta se disponível no navegador */}
          {canPrompt && (
            <div className="p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-300 text-emerald-900 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm text-emerald-800">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Instalação Automática Disponível!</span>
              </div>
              <p className="text-xs text-emerald-700">
                Seu navegador detectou o app. Clique abaixo para instalar o ícone da SKY direto na tela inicial.
              </p>
              <button
                onClick={handleNativeInstall}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Instalar Aplicativo Agora</span>
              </button>
            </div>
          )}

          {/* Seletor de Plataforma */}
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl text-xs font-bold">
            <button
              onClick={() => setPlatformTab('android')}
              className={`flex-1 py-2 rounded-xl transition flex items-center justify-center gap-1.5 ${
                platformTab === 'android'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Android (Samsung/Motorola)</span>
            </button>

            <button
              onClick={() => setPlatformTab('iphone')}
              className={`flex-1 py-2 rounded-xl transition flex items-center justify-center gap-1.5 ${
                platformTab === 'iphone'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>iPhone (iOS Safari)</span>
            </button>

            <button
              onClick={() => setPlatformTab('qr')}
              className={`flex-1 py-2 rounded-xl transition flex items-center justify-center gap-1.5 ${
                platformTab === 'qr'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>QR Code</span>
            </button>
          </div>

          {/* Passo a Passo Android */}
          {platformTab === 'android' && (
            <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <span>Passo a Passo no Celular Android:</span>
              </h4>
              <ol className="space-y-2.5 text-xs text-slate-700">
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">1</span>
                  <span>Abra o link do sistema no navegador <strong>Google Chrome</strong> do celular.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">2</span>
                  <span>Toque nos <strong>três pontinhos (⋮)</strong> no canto superior direito do Chrome.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">3</span>
                  <span>Toque em <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">4</span>
                  <span>Pronto! O ícone <strong>SKY Gestão</strong> ficará na tela inicial como um app normal.</span>
                </li>
              </ol>
            </div>
          )}

          {/* Passo a Passo iPhone */}
          {platformTab === 'iphone' && (
            <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <span>Passo a Passo no iPhone (iOS):</span>
              </h4>
              <ol className="space-y-2.5 text-xs text-slate-700">
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">1</span>
                  <span>Abra o link obrigatoriamente no navegador <strong>Safari</strong> do iPhone.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">2</span>
                  <span>Toque no botão <strong>Compartilhar 📤</strong> (ícone com seta para cima no rodapé).</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">3</span>
                  <span>Role a tela para baixo e selecione <strong>"Adicionar à Tela de Início" ➕</strong>.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">4</span>
                  <span>Toque em <strong>"Adicionar"</strong> no canto superior direito. Pronto!</span>
                </li>
              </ol>
            </div>
          )}

          {/* QR Code */}
          {platformTab === 'qr' && (
            <div className="flex flex-col items-center justify-center space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center">
              <p className="text-xs text-slate-600">
                Aponte a câmera do seu celular para o QR Code abaixo para abrir o sistema diretamente no smartphone:
              </p>
              <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-md">
                <img
                  src={qrCodeUrl}
                  alt="QR Code do App SKY Gestão"
                  className="w-48 h-48 object-contain rounded-xl"
                />
              </div>
              <span className="text-[11px] text-slate-500 font-mono break-all">{currentUrl}</span>
            </div>
          )}

          {/* Ações de Compartilhamento e Link */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={currentUrl}
                className="flex-1 px-3 py-2 text-xs font-mono bg-slate-100 rounded-xl border border-slate-200 text-slate-700"
              />
              <button
                onClick={handleCopyLink}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shrink-0"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copiado!' : 'Copiar Link'}</span>
              </button>
            </div>

            <button
              onClick={handleShareWhatsApp}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Enviar Link para a Equipe via WhatsApp</span>
            </button>
          </div>
        </div>

        {/* Rodapé */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs transition cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
