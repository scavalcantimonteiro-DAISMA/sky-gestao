import React, { useState, useEffect } from 'react';
import { Bell, BellRing, Check, Volume2, X } from 'lucide-react';
import { requestNotificationPermission, showNativeNotification } from '../services/notificationService';

export default function NotificationBanner() {
  const [permission, setPermission] = useState('default');
  const [activeToast, setActiveToast] = useState(null);

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }

    const handleCustomAlert = (e) => {
      setActiveToast(e.detail);
      setTimeout(() => {
        setActiveToast(null);
      }, 7000);
    };

    window.addEventListener('sky-app-alert', handleCustomAlert);
    return () => window.removeEventListener('sky-app-alert', handleCustomAlert);
  }, []);

  const handleEnable = async () => {
    const res = await requestNotificationPermission();
    setPermission(res);
    if (res === 'granted') {
      showNativeNotification('🔔 Alertas SKY Ativados!', {
        body: 'Você será avisado 20 minutos antes de cada rotina do seu dia.'
      });
    }
  };

  const handleTestAlert = () => {
    showNativeNotification('⏰ Teste de Alerta SKY (20 min antes)', {
      body: 'O alarme sonoro e as notificações estão funcionando com sucesso no seu dispositivo!'
    });
  };

  return (
    <>
      {/* Toast flutuante de alerta em tempo real */}
      {activeToast && (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm w-full bg-slate-900 border-2 border-rose-500 text-white rounded-2xl shadow-2xl p-4 flex items-start gap-3 animate-bounce">
          <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 mt-0.5">
            <BellRing className="w-6 h-6 animate-pulse" />
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-sm text-rose-300">{activeToast.title}</h4>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">{activeToast.body}</p>
          </div>
          <button
            onClick={() => setActiveToast(null)}
            className="text-slate-400 hover:text-white p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Banner de ativação se ainda não concedido */}
      {permission !== 'granted' && (
        <div className="bg-gradient-to-r from-amber-500 to-rose-600 text-white px-4 py-2.5 shadow-sm">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs sm:text-sm">
            <div className="flex items-center gap-2 text-center sm:text-left">
              <Bell className="w-4 h-4 shrink-0 animate-pulse" />
              <span>
                <strong>Ative os alertas no celular:</strong> Receba lembretes sonoros com 20 minutos de antecedência para suas rotinas e pendências.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleEnable}
                className="bg-white text-slate-900 px-3 py-1 rounded-lg font-semibold hover:bg-slate-100 transition shadow-sm"
              >
                Permitir Notificações
              </button>
              <button
                onClick={handleTestAlert}
                className="bg-black/25 text-white px-3 py-1 rounded-lg font-medium hover:bg-black/40 transition flex items-center gap-1"
              >
                <Volume2 className="w-3.5 h-3.5" />
                Testar Som
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
