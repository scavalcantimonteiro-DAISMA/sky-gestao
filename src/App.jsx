import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import NotificationBanner from './components/NotificationBanner';
import HomeDashboard from './components/HomeDashboard';
import ChecklistWizard from './components/checklist/ChecklistWizard';
import AtaHistory from './components/checklist/AtaHistory';
import GestaoDashboard from './components/gestao/GestaoDashboard';
import BackupModal from './components/BackupModal';
import NtfyModal from './components/NtfyModal';
import { seedInitialDataIfNeeded } from './db';
import { startReminderWatcher } from './services/notificationService';
import { Shield, Smartphone } from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState('home');
  const [isBackupOpen, setIsBackupOpen] = useState(false);
  const [isNtfyOpen, setIsNtfyOpen] = useState(false);

  useEffect(() => {
    // 1. Carrega dados iniciais do banco
    seedInitialDataIfNeeded();

    // 2. Inicia o monitor de lembretes (20 min antes)
    startReminderWatcher();

    // 3. Registra o Service Worker para PWA e notificações móveis
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('Service Worker SKY registrado:', reg.scope);
        })
        .catch((err) => {
          console.warn('Erro ao registrar Service Worker:', err);
        });
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-800 flex flex-col font-sans">
      {/* Top Navbar */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        onOpenBackup={() => setIsBackupOpen(true)}
        onOpenNtfy={() => setIsNtfyOpen(true)}
      />

      {/* Banner de Notificação & Teste Sonoro */}
      <NotificationBanner />

      {/* Conteúdo Principal */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 sm:py-8">
        {currentTab === 'home' && (
          <HomeDashboard
            onSelectTab={(tab) => {
              setCurrentTab(tab);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {currentTab === 'checklist' && (
          <ChecklistWizard
            onCompleteChecklist={() => {
              setCurrentTab('historico-atas');
            }}
          />
        )}

        {currentTab === 'historico-atas' && (
          <AtaHistory
            onNewChecklist={() => {
              setCurrentTab('checklist');
            }}
          />
        )}

        {currentTab === 'gestao' && (
          <GestaoDashboard initialSubTab="dashboard" />
        )}

        {currentTab === 'pendencias' && (
          <GestaoDashboard initialSubTab="pendencias" />
        )}

        {currentTab === 'rotinas' && (
          <GestaoDashboard initialSubTab="rotinas" />
        )}
      </main>

      {/* Rodapé Corporativo SKY */}
      <footer className="bg-slate-900 text-slate-400 text-xs py-6 border-t border-slate-800 mt-12">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-white tracking-wider">SKY BRASIL</span>
            <span className="text-slate-600">•</span>
            <span>Supervisão de Campo da Rede Credenciada</span>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-rose-500" /> 100% Offline & Seguro
            </span>
            <span className="flex items-center gap-1">
              <Smartphone className="w-3.5 h-3.5 text-blue-400" /> Compatível com Celular & PC
            </span>
          </div>
        </div>
      </footer>
      {/* Modal de Backup e Exportação para Excel */}
      <BackupModal
        isOpen={isBackupOpen}
        onClose={() => setIsBackupOpen(false)}
        onDataRestored={() => window.location.reload()}
      />
      {/* Modal de Configuração Push Celular ntfy */}
      <NtfyModal
        isOpen={isNtfyOpen}
        onClose={() => setIsNtfyOpen(false)}
      />
    </div>
  );
}
