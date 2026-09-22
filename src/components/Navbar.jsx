import React, { useState, useEffect } from 'react';
import { ClipboardList, Clock, Bell, Home, CheckCircle2, Menu, X, Smartphone, Database } from 'lucide-react';
import { requestNotificationPermission, showNativeNotification } from '../services/notificationService';

export default function Navbar({ currentTab, setCurrentTab, onOpenBackup }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifState, setNotifState] = useState(
    'Notification' in window ? Notification.permission : 'unsupported'
  );

  const handleRequestNotif = async () => {
    const res = await requestNotificationPermission();
    setNotifState(res);
    if (res === 'granted') {
      showNativeNotification('✅ Notificações Ativadas!', {
        body: 'Você receberá avisos sonoros 20 minutos antes de cada rotina cadastrada.'
      });
    }
  };

  return (
    <header 
      className="sticky top-0 z-40 bg-slate-900 text-white shadow-md border-b border-rose-600/30 safe-top-nav"
      style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 0px)' }}
    >
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo / Brand */}
        <div 
          onClick={() => { setCurrentTab('home'); setMobileMenuOpen(false); }}
          className="flex items-center space-x-2.5 cursor-pointer select-none group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 to-red-500 flex items-center justify-center shadow-lg shadow-rose-600/30 group-hover:scale-105 transition-transform">
            <span className="text-white font-black text-xl tracking-tighter">SKY</span>
          </div>
          <div>
            <div className="font-bold text-base leading-tight tracking-tight flex items-center gap-1.5">
              <span>Supervisão de Campo</span>
              <span className="text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">Brasil</span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">Checklist, Atas & Gestão do Dia</p>
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-1.5">
          <button
            onClick={() => setCurrentTab('home')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
              currentTab === 'home'
                ? 'bg-rose-600 text-white shadow'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Home className="w-4 h-4" />
            Início
          </button>

          <button
            onClick={() => setCurrentTab('checklist')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
              currentTab === 'checklist' || currentTab === 'historico-atas'
                ? 'bg-rose-600 text-white shadow'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            Checklist & Ata
          </button>

          <button
            onClick={() => setCurrentTab('gestao')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
              currentTab === 'gestao' || currentTab === 'pendencias' || currentTab === 'rotinas'
                ? 'bg-rose-600 text-white shadow'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Clock className="w-4 h-4" />
            Gestão do Dia & Lembretes
          </button>

          {/* Botão de Backup / Exportar Excel */}
          <button
            onClick={onOpenBackup}
            title="Backup e Exportação para Excel"
            className="px-2.5 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition flex items-center gap-1.5"
          >
            <Database className="w-4 h-4 text-rose-400" />
            <span className="hidden lg:inline">Backup / Excel</span>
          </button>

          {/* Botão de Notificação */}
          <button
            onClick={handleRequestNotif}
            title={notifState === 'granted' ? 'Notificações ativadas' : 'Ativar notificações'}
            className={`ml-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all ${
              notifState === 'granted'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            {notifState === 'granted' ? 'Alertas Ativos' : 'Ativar Alertas'}
          </button>
        </nav>

        {/* Mobile Menu Button */}
        <div className="flex items-center gap-2 md:hidden">
          <button
            onClick={onOpenBackup}
            className="p-2 rounded-lg text-slate-300 hover:text-white bg-slate-800 border border-slate-700"
            title="Backup & Excel"
          >
            <Database className="w-4 h-4 text-rose-400" />
          </button>

          <button
            onClick={handleRequestNotif}
            className={`p-2 rounded-lg text-xs border ${
              notifState === 'granted'
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
            }`}
            title="Notificações"
          >
            <Bell className="w-4 h-4" />
          </button>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800"
            aria-label="Abrir Menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-950/95 border-b border-slate-800 px-4 pt-2 pb-4 space-y-1.5 shadow-xl animate-in fade-in slide-in-from-top-2">
          <button
            onClick={() => { setCurrentTab('home'); setMobileMenuOpen(false); }}
            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2.5 ${
              currentTab === 'home' ? 'bg-rose-600 text-white' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Home className="w-4 h-4" />
            Tela Inicial
          </button>

          <button
            onClick={() => { setCurrentTab('checklist'); setMobileMenuOpen(false); }}
            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2.5 ${
              currentTab === 'checklist' ? 'bg-rose-600 text-white' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            Novo Checklist de Visita & Ata
          </button>

          <button
            onClick={() => { setCurrentTab('historico-atas'); setMobileMenuOpen(false); }}
            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2.5 ${
              currentTab === 'historico-atas' ? 'bg-rose-600 text-white' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            Histórico de Atas
          </button>

          <button
            onClick={() => { setCurrentTab('gestao'); setMobileMenuOpen(false); }}
            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2.5 ${
              currentTab === 'gestao' ? 'bg-rose-600 text-white' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Clock className="w-4 h-4" />
            Gestão do Dia & Pendências
          </button>

          <button
            onClick={() => { onOpenBackup(); setMobileMenuOpen(false); }}
            className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2.5 text-rose-400 hover:bg-slate-800"
          >
            <Database className="w-4 h-4" />
            Fazer Backup / Exportar Excel
          </button>
        </div>
      )}
    </header>
  );
}
