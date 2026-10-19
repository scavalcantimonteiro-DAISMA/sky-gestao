import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import NotificationBanner from './components/NotificationBanner';
import HomeDashboard from './components/HomeDashboard';
import ChecklistWizard from './components/checklist/ChecklistWizard';
import AtaHistory from './components/checklist/AtaHistory';
import GestaoDashboard from './components/gestao/GestaoDashboard';
import BackupModal from './components/BackupModal';
import NtfyModal from './components/NtfyModal';
import InstallAppModal from './components/InstallAppModal';
import LoginScreen from './components/LoginScreen';
import ForcePasswordModal from './components/ForcePasswordModal';
import GestaoEquipe from './components/admin/GestaoEquipe';
import ErrorBoundary from './components/ErrorBoundary';
import { seedInitialDataIfNeeded } from './db';
import { startReminderWatcher } from './services/notificationService';
import { startRealtimeCloudSync } from './services/cloudSyncService';
import { refreshPdvsFromCloud } from './services/pdvResultsService';
import { getCurrentUser, initAuth, logout } from './services/authService';
import { Shield, Smartphone } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => getCurrentUser());
  const [authLoading, setAuthLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState('home');
  const [isBackupOpen, setIsBackupOpen] = useState(false);
  const [isNtfyOpen, setIsNtfyOpen] = useState(false);
  const [isInstallAppOpen, setIsInstallAppOpen] = useState(false);

  useEffect(() => {
    // Captura evento nativo do PWA para o botão "Baixar no Celular"
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      window.deferredPwaPrompt = e;
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // 0. Inicializa Auth e sincroniza usuários
    initAuth()
      .then((user) => {
        if (user) setCurrentUser(user);
      })
      .catch((e) => console.warn('Erro ao inicializar auth:', e))
      .finally(() => setAuthLoading(false));

    const handleAuthChange = (e) => {
      setCurrentUser(e.detail?.user || null);
    };
    window.addEventListener('sky-auth-changed', handleAuthChange);

    // 1. Carrega dados iniciais do banco Dexie
    seedInitialDataIfNeeded();

    // 2. Inicia sincronização em tempo real entre Site (PC) e App (Celular)
    startRealtimeCloudSync();

    // 3. Atualiza dados dos PDVs do Projeto SKY Correto automaticamente da nuvem
    refreshPdvsFromCloud().catch(() => {});

    // 4. Inicia o monitor de lembretes (20 min antes + 08h + 18h)
    startReminderWatcher();

    // 5. Registra e atualiza o Service Worker para PWA e notificações móveis
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          reg.update().catch(() => {});
          document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
              reg.update().catch(() => {});
              refreshPdvsFromCloud().catch(() => {});
            }
          });
        })
        .catch((err) => {
          console.warn('Erro ao registrar Service Worker:', err);
        });
    }

    const handleFocus = () => {
      refreshPdvsFromCloud().catch(() => {});
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('sky-auth-changed', handleAuthChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const handleLogout = () => {
    logout();
    setCurrentUser(null);
    setCurrentTab('home');
  };

  // Tela de Carregamento inicial
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4 select-none">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-rose-600 to-red-500 flex items-center justify-center shadow-2xl shadow-rose-600/40 animate-pulse">
          <span className="text-white font-black text-2xl tracking-tighter">SKY</span>
        </div>
        <p className="mt-4 text-xs font-semibold text-slate-400 tracking-wider uppercase animate-pulse">
          Iniciando Supervisão de Campo...
        </p>
      </div>
    );
  }

  // Se não estiver logado, exibe tela de login
  if (!currentUser) {
    return (
      <ErrorBoundary>
        <LoginScreen onLoginSuccess={(user) => setCurrentUser(user)} />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-slate-100/70 text-slate-800 flex flex-col font-sans">
        {/* Modal obrigatório de troca de senha no 1º acesso */}
        {currentUser?.precisaTrocarSenha && (
          <ForcePasswordModal
            user={currentUser}
            onSuccess={(updatedUser) => setCurrentUser(updatedUser)}
          />
        )}

        {/* Top Navbar com Baixar no Celular */}
        <Navbar
          currentTab={currentTab}
          setCurrentTab={setCurrentTab}
          currentUser={currentUser}
          onLogout={handleLogout}
          onOpenBackup={() => setIsBackupOpen(true)}
          onOpenNtfy={() => setIsNtfyOpen(true)}
          onOpenInstallApp={() => setIsInstallAppOpen(true)}
        />

        {/* Banner de Notificação & Teste Sonoro */}
        <NotificationBanner />

        {/* Conteúdo Principal */}
        <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 sm:py-8">
          {currentTab === 'home' && (
            <HomeDashboard
              currentUser={currentUser}
              onSelectTab={(tab) => {
                setCurrentTab(tab);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          )}

          {currentTab === 'checklist' && (
            <ChecklistWizard
              currentUser={currentUser}
              onCompleteChecklist={() => {
                setCurrentTab('historico-atas');
              }}
            />
          )}

          {currentTab === 'historico-atas' && (
            <AtaHistory
              currentUser={currentUser}
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

          {currentTab === 'equipe' && currentUser?.role === 'ADMIN' && (
            <GestaoEquipe currentUser={currentUser} />
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

        {/* Modal de Instalação e Download no Celular */}
        <InstallAppModal
          isOpen={isInstallAppOpen}
          onClose={() => setIsInstallAppOpen(false)}
        />
      </div>
    </ErrorBoundary>
  );
}
