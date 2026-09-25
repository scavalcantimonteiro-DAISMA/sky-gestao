import React, { useState, useEffect } from 'react';
import { Bell, BellRing, Volume2, X, CheckCircle2 } from 'lucide-react';
import {
  requestNotificationPermission,
  showNativeNotification,
  isNotificationBannerAcknowledged,
  setNotificationBannerAcknowledged,
  syncAllRoutinesWithNtfy
} from '../services/notificationService';

export default function NotificationBanner() {
  const [permission, setPermission] = useState('default');
  const [acknowledged, setAcknowledged] = useState(false);
  const [activeToast, setActiveToast] = useState(null);

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
    setAcknowledged(isNotificationBannerAcknowledged());

    const handleCustomAlert = (e) => {
      setActiveToast(e.detail);
      setTimeout(() => {
        setActiveToast(null);
      }, 8000);
    };

    const handleStatusChange = () => {
      if ('Notification' in window) {
        setPermission(Notification.permission);
      }
      setAcknowledged(isNotificationBannerAcknowledged());
    };

    window.addEventListener('sky-app-alert', handleCustomAlert);
    window.addEventListener('sky-notif-status-changed', handleStatusChange);
    return () => {
      window.removeEventListener('sky-app-alert', handleCustomAlert);
      window.removeEventListener('sky-notif-status-changed', handleStatusChange);
    };
  }, []);

  const handleEnable = async () => {
    const res = await requestNotificationPermission();
    setPermission(res);
    setNotificationBannerAcknowledged(true);
    setAcknowledged(true);
    window.dispatchEvent(new Event('sky-notif-status-changed'));

    // Sincroniza todas as rotinas na nuvem do ntfy
    await syncAllRoutinesWithNtfy();

    // Dispara confirmação sonora + toast + push no ntfy
    await showNativeNotification('🔔 Alertas SKY & Push ntfy Ativados!', {
      body: 'Tudo pronto! Você receberá os alertas de todas as rotinas, além do resumo às 08h e balanço às 18h no seu ntfy.'
    });
  };

  const handleTestAlert = async () => {
    await showNativeNotification('⏰ Teste de Alerta SKY + Push ntfy', {
      body: 'O alarme sonoro e o envio automático para o aplicativo ntfy estão funcionando perfeitamente!'
    });
  };

  const handleDismiss = () => {
    setNotificationBannerAcknowledged(true);
    setAcknowledged(true);
    window.dispatchEvent(new Event('sky-notif-status-changed'));
  };

  const isBannerVisible = permission !== 'granted' && !acknowledged;

  return (
    <>
      {/* Toast flutuante de alerta em tempo real */}
      {activeToast && (
        <div className="fixed bottom-5 right-5 z-50 max-w-md w-[calc(100%-2.5rem)] bg-slate-900 border-2 border-rose-500 text-white rounded-2xl shadow-2xl p-4 flex items-start gap-3 animate-in fade-in slide-in-from-bottom-4">
          <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 mt-0.5 shrink-0">
            <BellRing className="w-6 h-6 animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-sm text-rose-300">{activeToast.title}</h4>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed whitespace-pre-line break-words">
              {activeToast.body}
            </p>
          </div>
          <button
            onClick={() => setActiveToast(null)}
            className="text-slate-400 hover:text-white p-1 shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Banner de ativação se ainda não concedido/confirmado */}
      {isBannerVisible && (
        <div className="bg-gradient-to-r from-amber-500 to-rose-600 text-white px-4 py-2.5 shadow-sm">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs sm:text-sm">
            <div className="flex items-center gap-2 text-center sm:text-left">
              <Bell className="w-4 h-4 shrink-0 animate-pulse" />
              <span>
                <strong>Ative os alertas automáticos (08h, Rotinas e 18h):</strong> Receba todos os avisos com som e Push no seu celular via ntfy.
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleEnable}
                className="bg-white text-slate-900 px-3 py-1.5 rounded-lg font-bold hover:bg-slate-100 transition shadow-sm flex items-center gap-1 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Permitir Notificações
              </button>
              <button
                type="button"
                onClick={handleTestAlert}
                className="bg-black/25 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-black/40 transition flex items-center gap-1 cursor-pointer"
              >
                <Volume2 className="w-3.5 h-3.5" />
                Testar Som & Push
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                className="p-1 rounded-lg hover:bg-black/20 text-white/80 hover:text-white transition"
                title="Fechar aviso"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
