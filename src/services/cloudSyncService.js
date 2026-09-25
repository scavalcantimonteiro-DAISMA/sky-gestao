import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  setDoc,
  getDocFromServer,
  getDoc,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../db';

const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyCQfSfl8kGj5lfCMjz6FudCsfH9aKU6CHo',
  authDomain: 'hub-social-media.firebaseapp.com',
  projectId: 'hub-social-media',
  storageBucket: 'hub-social-media.firebasestorage.app',
  messagingSenderId: '447937845739',
  appId: '1:447937845739:web:ac94a2d54811e73bc161ae',
  measurementId: 'G-BQFRLFY0FS'
};

const SYNC_COLLECTION = 'sky_gestao_sync';
const CORE_DOC_ID = 'core_state';
const ATAS_DOC_ID = 'atas_state';

const LOCAL_REV_KEY = 'sky_gestao_last_sync_rev';
const LOCAL_ATAS_REV_KEY = 'sky_gestao_last_atas_rev';
const DEVICE_ID_KEY = 'sky_gestao_device_id';

let firestoreInstance = null;
let unsubscribeCore = null;
let isApplyingRemote = false;
let syncIntervalId = null;

export function getDeviceId() {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = 'dev_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

export function isDesktopDevice() {
  if (typeof navigator === 'undefined') return true;
  return !/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

export function getDeviceLabel() {
  return isDesktopDevice() ? 'Computador (Site)' : 'Celular (App)';
}

function getDbInstance() {
  if (firestoreInstance) return firestoreInstance;
  try {
    const app = getApps().length === 0 ? initializeApp(FIREBASE_CONFIG) : getApp();
    firestoreInstance = getFirestore(app);
    return firestoreInstance;
  } catch (err) {
    console.error('Erro ao inicializar Firebase Sync:', err);
    return null;
  }
}

function emitSyncStatus(status, detail = {}) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('sky-sync-status', {
        detail: { status, timestamp: new Date().toISOString(), ...detail }
      })
    );
  }
}

function emitDbSynced(detail = {}) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('sky-db-synced', {
        detail: { timestamp: new Date().toISOString(), ...detail }
      })
    );
  }
}

/**
 * Envia imediatamente o estado atual deste dispositivo (pendências, rotinas e atas)
 * para a nuvem (Firestore), fazendo com que todos os outros aparelhos atualizem na hora.
 */
export async function syncToCloudNow(actionLabel = 'Atualização', includeAtas = false) {
  if (isApplyingRemote) return false;

  const fs = getDbInstance();
  if (!fs) return false;

  try {
    emitSyncStatus('syncing', { actionLabel });

    const [pendencias, rotinas, atas] = await Promise.all([
      db.pendencias.toArray(),
      db.rotinas.toArray(),
      db.atas.toArray()
    ]);

    const syncRevisionId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const nowIso = new Date().toISOString();
    const deviceId = getDeviceId();
    const deviceType = getDeviceLabel();

    // Marca localmente esta revisão antes de enviar para evitar loop no onSnapshot
    localStorage.setItem(LOCAL_REV_KEY, syncRevisionId);

    let atasRevisionId = localStorage.getItem(LOCAL_ATAS_REV_KEY) || syncRevisionId;
    if (includeAtas) {
      atasRevisionId = syncRevisionId;
      localStorage.setItem(LOCAL_ATAS_REV_KEY, atasRevisionId);
      try {
        const atasRef = doc(fs, SYNC_COLLECTION, ATAS_DOC_ID);
        await setDoc(atasRef, {
          atasRevisionId,
          updatedAt: nowIso,
          deviceId,
          deviceType,
          atasJson: JSON.stringify(atas)
        });
      } catch (ataErr) {
        console.warn('Aviso ao sincronizar fotos pesadas de atas, sincronizando versão compacta:', ataErr);
        const compactAtas = atas.map((a) => ({
          ...a,
          torreControle: a.torreControle ? { ...a.torreControle, fotos: [] } : {},
          estoque: a.estoque ? { ...a.estoque, fotos: [] } : {},
          vendas: a.vendas ? { ...a.vendas, fotos: [] } : {}
        }));
        const atasRef = doc(fs, SYNC_COLLECTION, ATAS_DOC_ID);
        await setDoc(atasRef, {
          atasRevisionId,
          updatedAt: nowIso,
          deviceId,
          deviceType,
          atasJson: JSON.stringify(compactAtas)
        });
      }
    }

    const coreRef = doc(fs, SYNC_COLLECTION, CORE_DOC_ID);
    await setDoc(coreRef, {
      syncRevisionId,
      atasRevisionId,
      updatedAt: nowIso,
      deviceId,
      deviceType,
      actionLabel,
      pendenciasCount: pendencias.length,
      rotinasCount: rotinas.length,
      atasCount: atas.length,
      pendenciasJson: JSON.stringify(pendencias),
      rotinasJson: JSON.stringify(rotinas)
    });

    emitSyncStatus('synced', {
      updatedAt: nowIso,
      deviceType,
      actionLabel
    });

    // Notifica também componentes na mesma aba
    emitDbSynced({ source: 'local', actionLabel });
    return true;
  } catch (err) {
    console.error('Erro ao enviar dados para nuvem:', err);
    emitSyncStatus('error', { error: err.message });
    return false;
  }
}

/**
 * Aplica os dados recebidos da nuvem no banco IndexedDB local deste aparelho.
 * Garante que itens excluídos no site sejam excluídos no app do celular e vice-versa.
 */
async function applyCloudSnapshotToLocal(cloudData, forceApply = false) {
  if (!cloudData || !cloudData.syncRevisionId) return false;

  const localRev = localStorage.getItem(LOCAL_REV_KEY);
  const [localPendencias, localRotinas] = await Promise.all([
    db.pendencias.toArray(),
    db.rotinas.toArray()
  ]);

  let remotePendencias = [];
  let remoteRotinas = [];

  try {
    remotePendencias = JSON.parse(cloudData.pendenciasJson || '[]');
    remoteRotinas = JSON.parse(cloudData.rotinasJson || '[]');
  } catch (e) {
    console.error('Erro ao decodificar JSON da nuvem:', e);
    return false;
  }

  // Verifica se já está exatamente na mesma revisão E com a mesma quantidade de itens
  const sameCounts =
    localPendencias.length === remotePendencias.length &&
    localRotinas.length === remoteRotinas.length;

  if (!forceApply && localRev === cloudData.syncRevisionId && sameCounts) {
    emitSyncStatus('synced', {
      updatedAt: cloudData.updatedAt,
      deviceType: cloudData.deviceType,
      actionLabel: cloudData.actionLabel
    });
    return false;
  }

  isApplyingRemote = true;
  try {
    emitSyncStatus('syncing', { actionLabel: 'Recebendo atualização...' });

    // Preserva flags de alerta diário já tocados hoje neste aparelho para não repetir alarme já disparado
    const localRotinaMap = new Map(localRotinas.map((r) => [r.id, r]));
    const mergedRotinas = remoteRotinas.map((rem) => {
      const loc = localRotinaMap.get(rem.id);
      if (!loc) return rem;
      return {
        ...rem,
        ultimoAlertaData: loc.ultimoAlertaData || rem.ultimoAlertaData || '',
        ultimoAlertaExatoData: loc.ultimoAlertaExatoData || rem.ultimoAlertaExatoData || ''
      };
    });

    await db.transaction('rw', db.pendencias, db.rotinas, async () => {
      await db.pendencias.clear();
      if (remotePendencias.length > 0) {
        await db.pendencias.bulkPut(remotePendencias);
      }

      await db.rotinas.clear();
      if (mergedRotinas.length > 0) {
        await db.rotinas.bulkPut(mergedRotinas);
      }
    });

    localStorage.setItem(LOCAL_REV_KEY, cloudData.syncRevisionId);

    // Verifica se as Atas também mudaram
    const localAtasRev = localStorage.getItem(LOCAL_ATAS_REV_KEY);
    const localAtasCount = await db.atas.count();
    if (
      forceApply ||
      (cloudData.atasRevisionId && cloudData.atasRevisionId !== localAtasRev) ||
      (typeof cloudData.atasCount === 'number' && cloudData.atasCount !== localAtasCount)
    ) {
      await pullAtasFromCloud();
    }

    emitSyncStatus('synced', {
      updatedAt: cloudData.updatedAt,
      deviceType: cloudData.deviceType,
      actionLabel: cloudData.actionLabel || 'Sincronizado'
    });

    emitDbSynced({
      source: 'cloud',
      updatedAt: cloudData.updatedAt,
      deviceType: cloudData.deviceType
    });

    return true;
  } catch (err) {
    console.error('Erro ao aplicar dados da nuvem localmente:', err);
    emitSyncStatus('error', { error: err.message });
    return false;
  } finally {
    isApplyingRemote = false;
  }
}

async function pullAtasFromCloud() {
  const fs = getDbInstance();
  if (!fs) return;
  try {
    const atasRef = doc(fs, SYNC_COLLECTION, ATAS_DOC_ID);
    let snap;
    try {
      snap = await getDocFromServer(atasRef);
    } catch {
      snap = await getDoc(atasRef);
    }
    if (snap && snap.exists()) {
      const data = snap.data();
      const remoteAtas = JSON.parse(data.atasJson || '[]');
      await db.transaction('rw', db.atas, async () => {
        await db.atas.clear();
        if (remoteAtas.length > 0) {
          await db.atas.bulkPut(remoteAtas);
        }
      });
      if (data.atasRevisionId) {
        localStorage.setItem(LOCAL_ATAS_REV_KEY, data.atasRevisionId);
      }
    }
  } catch (e) {
    console.warn('Erro ao buscar atas da nuvem:', e);
  }
}

/**
 * Busca imediatamente a versão mais recente na nuvem (sem cache) e atualiza a tela.
 */
export async function pullFromCloudNow(forceApply = false) {
  const fs = getDbInstance();
  if (!fs) return false;

  try {
    const coreRef = doc(fs, SYNC_COLLECTION, CORE_DOC_ID);
    let snap;
    try {
      snap = await getDocFromServer(coreRef);
    } catch {
      snap = await getDoc(coreRef);
    }

    if (snap && snap.exists()) {
      const cloudData = snap.data();
      return await applyCloudSnapshotToLocal(cloudData, forceApply);
    } else if (isDesktopDevice()) {
      // Se ainda não existe nada na nuvem e estamos no Computador (Site),
      // publica os dados atuais do Computador como base oficial para o celular receber!
      await syncToCloudNow('Sincronização Inicial do Site', true);
      return true;
    }
    return false;
  } catch (err) {
    console.warn('Erro ao puxar dados da nuvem:', err);
    return false;
  }
}

/**
 * Inicia a sincronização automática em tempo real (WebSocket Firestore + verificação ao focar no app).
 */
export function startRealtimeCloudSync() {
  const fs = getDbInstance();
  if (!fs) return;

  // 1. Faz leitura imediata do servidor ao abrir o app
  pullFromCloudNow(false);

  // 2. Listener em tempo real (atualiza em menos de 1 segundo quando edita/exclui no site ou celular)
  if (unsubscribeCore) {
    unsubscribeCore();
  }

  const coreRef = doc(fs, SYNC_COLLECTION, CORE_DOC_ID);
  unsubscribeCore = onSnapshot(
    coreRef,
    async (docSnap) => {
      if (docSnap.exists()) {
        const cloudData = docSnap.data();
        await applyCloudSnapshotToLocal(cloudData, false);
      } else if (isDesktopDevice()) {
        // Primeiro acesso pelo PC: envia o banco limpo do PC para a nuvem
        await syncToCloudNow('Sincronização Inicial do PC', true);
      }
    },
    (error) => {
      console.warn('Listener em tempo real reconectando:', error);
    }
  );

  // 3. Sempre que o usuário abrir o celular, destravar a tela ou voltar para a aba, puxa da nuvem
  if (typeof window !== 'undefined' && !window.__skyCloudListenersBound) {
    window.__skyCloudListenersBound = true;

    const handleWakeSync = () => {
      if (document.visibilityState === 'visible') {
        pullFromCloudNow(false);
      }
    };

    document.addEventListener('visibilitychange', handleWakeSync);
    window.addEventListener('focus', () => pullFromCloudNow(false));
    window.addEventListener('online', () => pullFromCloudNow(false));
    window.addEventListener('pageshow', () => pullFromCloudNow(false));
  }

  // 4. Verificação de segurança a cada 10 segundos para garantir 100% de consistência em WebViews móveis
  if (syncIntervalId) clearInterval(syncIntervalId);
  syncIntervalId = setInterval(() => {
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
      pullFromCloudNow(false);
    }
  }, 10000);
}
