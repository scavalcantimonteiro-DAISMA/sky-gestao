import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection
} from 'firebase/firestore';

const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyCQfSfl8kGj5lfCMjz6FudCsfH9aKU6CHo',
  authDomain: 'hub-social-media.firebaseapp.com',
  projectId: 'hub-social-media',
  storageBucket: 'hub-social-media.firebasestorage.app',
  messagingSenderId: '447937845739',
  appId: '1:447937845739:web:ac94a2d54811e73bc161ae',
  measurementId: 'G-BQFRLFY0FS'
};

const USERS_COLLECTION = 'sky_gestao_usuarios';
const LOCAL_USERS_KEY = 'sky_gestao_usuarios_cache_v2';
const CURRENT_USER_KEY = 'sky_gestao_current_user_v2';
const REMEMBER_ME_KEY = 'sky_gestao_remember_me_v2';
const SALT = 'sky_gestao_salt_v1';

// Hash pré-calculado de "Saulo160605" com o SALT
const SAULO_ADMIN_HASH = 'a1224da7d5e708a41260cc3f54c11a99ac8af7a39f26ec957ec6ed802011da4d';
// Hash pré-calculado de "1234" com o SALT
const DEFAULT_INITIAL_HASH = 'dc584d733182239c1436fdca1b189522e9067c6d2502ef060b2a612c7a30ca92';

export const MASTER_ADMIN = {
  login: 'Saulo',
  nome: 'Saulo Monteiro',
  cargo: 'Administrador Master',
  role: 'ADMIN',
  passwordHash: SAULO_ADMIN_HASH,
  precisaTrocarSenha: false,
  ntfyTopic: 'sky-gestao-saulo-notificacoes-928471',
  ativo: true,
  createdAt: '2026-10-19T00:00:00.000Z'
};

let firestoreInstance = null;
function getDbInstance() {
  if (firestoreInstance) return firestoreInstance;
  try {
    const app = getApps().length === 0 ? initializeApp(FIREBASE_CONFIG) : getApp();
    firestoreInstance = getFirestore(app);
    return firestoreInstance;
  } catch (err) {
    console.error('Erro ao conectar ao Firebase Auth:', err);
    return null;
  }
}

/**
 * Hash seguro SHA-256 via Web Crypto API nativa do navegador
 */
export async function hashPassword(plainPassword) {
  if (!plainPassword) return '';
  try {
    const enc = new TextEncoder();
    const data = enc.encode(`${SALT}:${plainPassword}`);
    const hashBuf = await crypto.subtle.digest('SHA-256', data);
    const hashArr = Array.from(new Uint8Array(hashBuf));
    return hashArr.map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch (e) {
    // Fallback simples se crypto.subtle não estiver disponível em ambiente sem HTTPS
    let hash = 0;
    const str = `${SALT}:${plainPassword}`;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return String(Math.abs(hash));
  }
}

/**
 * Lê lista de usuários do cache local
 */
export function getLocalUsers() {
  if (typeof window === 'undefined') return [MASTER_ADMIN];
  try {
    const cached = localStorage.getItem(LOCAL_USERS_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const clean = parsed.filter((u) => u && typeof u === 'object' && u.login);
        if (clean.length > 0) return clean;
      }
    }
  } catch (e) {
    console.warn('Erro ao ler usuários do cache:', e);
  }
  return [MASTER_ADMIN];
}

/**
 * Salva lista de usuários no cache local
 */
export function saveLocalUsers(users) {
  if (typeof window === 'undefined') return;
  try {
    const valid = Array.isArray(users) ? users.filter((u) => u && typeof u === 'object' && u.login) : [MASTER_ADMIN];
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(valid));
  } catch (e) {
    console.warn('Erro ao salvar usuários no cache:', e);
  }
}

/**
 * Obtém usuário atualmente logado
 */
export function getCurrentUser() {
  if (typeof window === 'undefined') return MASTER_ADMIN;
  try {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.login) return parsed;
    }
  } catch (e) {
    console.warn('Erro ao ler sessão atual:', e);
  }
  return null;
}

/**
 * Define usuário atualmente logado na sessão
 */
export function setCurrentUser(user, remember = true) {
  if (typeof window === 'undefined') return;
  try {
    if (user && user.login) {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
      localStorage.setItem(REMEMBER_ME_KEY, remember ? 'true' : 'false');
      window.dispatchEvent(new CustomEvent('sky-auth-changed', { detail: { user } }));
    } else {
      localStorage.removeItem(CURRENT_USER_KEY);
      window.dispatchEvent(new CustomEvent('sky-auth-changed', { detail: { user: null } }));
    }
  } catch (e) {
    console.warn('Erro ao gravar sessão:', e);
  }
}

/**
 * Desconecta o usuário
 */
export function logout() {
  setCurrentUser(null);
}

/**
 * Sincroniza e garante persistência dos usuários com o Firestore
 */
export async function syncUsersWithCloud() {
  const fs = getDbInstance();
  const localList = getLocalUsers();

  if (!fs) return localList;

  try {
    const colRef = collection(fs, USERS_COLLECTION);
    const snap = await getDocs(colRef);

    if (snap.empty) {
      // Cria o Admin inicial na nuvem
      const adminDocRef = doc(fs, USERS_COLLECTION, MASTER_ADMIN.login.toLowerCase());
      await setDoc(adminDocRef, MASTER_ADMIN);
      saveLocalUsers([MASTER_ADMIN]);
      return [MASTER_ADMIN];
    }

    const cloudUsers = [];
    snap.forEach((d) => {
      const u = d.data();
      if (u && typeof u === 'object' && u.login) {
        cloudUsers.push(u);
      }
    });

    // Garante que o Saulo sempre existe
    const hasAdmin = cloudUsers.some((u) => u.login && u.login.toLowerCase() === MASTER_ADMIN.login.toLowerCase());
    if (!hasAdmin) {
      const adminDocRef = doc(fs, USERS_COLLECTION, MASTER_ADMIN.login.toLowerCase());
      await setDoc(adminDocRef, MASTER_ADMIN);
      cloudUsers.unshift(MASTER_ADMIN);
    }

    saveLocalUsers(cloudUsers);
    return cloudUsers;
  } catch (err) {
    console.warn('Modo offline: usando usuários salvos localmente:', err);
    return localList;
  }
}

/**
 * Inicialização do serviço de autenticação
 */
export async function initAuth() {
  const users = await syncUsersWithCloud();
  const current = getCurrentUser();

  // Se já houver sessão gravada, valida se o usuário ainda está ativo
  if (current && current.login) {
    const valid = users.find((u) => u && u.login && u.login.toLowerCase() === current.login.toLowerCase());
    if (valid && valid.ativo) {
      setCurrentUser(valid, localStorage.getItem(REMEMBER_ME_KEY) === 'true');
      return valid;
    }
  }

  return current;
}

/**
 * Realiza autenticação com Login e Senha
 */
export async function login(loginInput, passwordInput, remember = true) {
  if (!loginInput || !passwordInput) {
    return { success: false, reason: 'Informe o login e a senha.' };
  }

  const cleanLogin = loginInput.trim().toLowerCase();
  const hashedInput = await hashPassword(passwordInput);

  // Busca na lista local primeiro para velocidade instantânea
  let users = getLocalUsers();
  let user = users.find((u) => u.login.toLowerCase() === cleanLogin);

  // Se não encontrar ou se o hash local não bater, tenta puxar da nuvem
  if (!user || user.passwordHash !== hashedInput) {
    const fs = getDbInstance();
    if (fs) {
      try {
        const userDocRef = doc(fs, USERS_COLLECTION, cleanLogin);
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists()) {
          user = userSnap.data();
          // Atualiza o cache local
          const filtered = users.filter((u) => u.login.toLowerCase() !== cleanLogin);
          filtered.push(user);
          saveLocalUsers(filtered);
        }
      } catch (e) {
        console.warn('Erro ao consultar usuário na nuvem:', e);
      }
    }
  }

  // Validação especial de segurança do Admin Saulo caso nunca tenha logado antes
  if (!user && cleanLogin === MASTER_ADMIN.login.toLowerCase()) {
    if (passwordInput === 'Saulo160605') {
      user = MASTER_ADMIN;
      users.push(MASTER_ADMIN);
      saveLocalUsers(users);
    }
  }

  if (!user) {
    return { success: false, reason: 'Usuário não encontrado.' };
  }

  if (!user.ativo) {
    return { success: false, reason: 'Este usuário está desativado pelo administrador.' };
  }

  // Verifica a senha comparando os hashes
  if (user.passwordHash !== hashedInput) {
    // Verificação de compatibilidade direta caso hash falhe
    if (cleanLogin === 'saulo' && passwordInput === 'Saulo160605') {
      // Aceita
    } else if (passwordInput === '1234' && user.precisaTrocarSenha) {
      // Aceita para primeiro acesso
    } else {
      return { success: false, reason: 'Senha incorreta. Tente novamente.' };
    }
  }

  setCurrentUser(user, remember);
  return { success: true, user };
}

/**
 * Troca de senha do usuário (exigida no primeiro acesso ou voluntária)
 */
export async function changePassword(loginName, newPassword) {
  if (!newPassword || newPassword.length < 4) {
    return { success: false, reason: 'A nova senha deve ter no mínimo 4 caracteres.' };
  }

  const cleanLogin = loginName.trim().toLowerCase();
  const newHash = await hashPassword(newPassword);
  const nowIso = new Date().toISOString();

  const users = getLocalUsers();
  const idx = users.findIndex((u) => u.login.toLowerCase() === cleanLogin);

  let updatedUser = null;
  if (idx !== -1) {
    users[idx] = {
      ...users[idx],
      passwordHash: newHash,
      precisaTrocarSenha: false,
      updatedAt: nowIso
    };
    updatedUser = users[idx];
  } else {
    updatedUser = {
      login: loginName,
      passwordHash: newHash,
      precisaTrocarSenha: false,
      updatedAt: nowIso
    };
    users.push(updatedUser);
  }

  saveLocalUsers(users);

  // Atualiza também na nuvem
  const fs = getDbInstance();
  if (fs) {
    try {
      const userDocRef = doc(fs, USERS_COLLECTION, cleanLogin);
      await setDoc(userDocRef, updatedUser, { merge: true });
    } catch (e) {
      console.warn('Erro ao atualizar senha na nuvem:', e);
    }
  }

  // Atualiza sessão ativa se for o próprio usuário
  const current = getCurrentUser();
  if (current && current.login.toLowerCase() === cleanLogin) {
    setCurrentUser(updatedUser);
  }

  return { success: true, user: updatedUser };
}

/**
 * Criação de novo colaborador pelo Administrador
 */
export async function createUser({ nome, login, cargo }) {
  if (!nome || !login) {
    return { success: false, reason: 'Informe o nome e o login do colaborador.' };
  }

  const cleanLogin = login.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, '');
  if (!cleanLogin) {
    return { success: false, reason: 'Login inválido. Use letras, números ou ponto.' };
  }

  const users = getLocalUsers();
  if (users.some((u) => u && u.login && u.login.toLowerCase() === cleanLogin)) {
    return { success: false, reason: `Já existe um usuário com o login "${cleanLogin}".` };
  }

  // Gera canal de notificação exclusivo
  const randomSuffix = Math.floor(100000 + Math.random() * 900000);
  const ntfyTopic = `sky-gestao-${cleanLogin}-${randomSuffix}`;
  const nowIso = new Date().toISOString();

  const newUser = {
    login: login.trim(),
    nome: nome.trim(),
    cargo: (cargo || 'Colaborador').trim(),
    role: 'USER',
    passwordHash: DEFAULT_INITIAL_HASH,
    precisaTrocarSenha: true, // Obriga troca no 1º acesso
    ntfyTopic,
    ativo: true,
    createdAt: nowIso,
    updatedAt: nowIso
  };

  users.push(newUser);
  saveLocalUsers(users);

  // Grava na nuvem Firestore
  const fs = getDbInstance();
  if (fs) {
    try {
      const userDocRef = doc(fs, USERS_COLLECTION, cleanLogin);
      await setDoc(userDocRef, newUser);
    } catch (err) {
      console.error('Erro ao gravar novo usuário na nuvem:', err);
    }
  }

  return { success: true, user: newUser };
}

/**
 * Reseta a senha de um colaborador de volta para a senha padrão "1234"
 */
export async function resetUserPassword(loginName) {
  const cleanLogin = loginName.trim().toLowerCase();
  const users = getLocalUsers();
  const idx = users.findIndex((u) => u.login.toLowerCase() === cleanLogin);

  if (idx === -1) {
    return { success: false, reason: 'Usuário não encontrado.' };
  }

  const nowIso = new Date().toISOString();
  users[idx] = {
    ...users[idx],
    passwordHash: DEFAULT_INITIAL_HASH,
    precisaTrocarSenha: true,
    updatedAt: nowIso
  };

  saveLocalUsers(users);

  const fs = getDbInstance();
  if (fs) {
    try {
      const userDocRef = doc(fs, USERS_COLLECTION, cleanLogin);
      await setDoc(userDocRef, {
        passwordHash: DEFAULT_INITIAL_HASH,
        precisaTrocarSenha: true,
        updatedAt: nowIso
      }, { merge: true });
    } catch (err) {
      console.warn('Erro ao resetar senha na nuvem:', err);
    }
  }

  return { success: true };
}

/**
 * Alterna status ativo/inativo do usuário
 */
export async function toggleUserStatus(loginName) {
  const cleanLogin = loginName.trim().toLowerCase();
  if (cleanLogin === 'saulo') {
    return { success: false, reason: 'O perfil do Administrador Master não pode ser desativado.' };
  }

  const users = getLocalUsers();
  const idx = users.findIndex((u) => u.login.toLowerCase() === cleanLogin);
  if (idx === -1) return { success: false, reason: 'Usuário não encontrado.' };

  const newStatus = !users[idx].ativo;
  users[idx].ativo = newStatus;
  users[idx].updatedAt = new Date().toISOString();
  saveLocalUsers(users);

  const fs = getDbInstance();
  if (fs) {
    try {
      const userDocRef = doc(fs, USERS_COLLECTION, cleanLogin);
      await setDoc(userDocRef, { ativo: newStatus, updatedAt: users[idx].updatedAt }, { merge: true });
    } catch (err) {
      console.warn('Erro ao atualizar status na nuvem:', err);
    }
  }

  return { success: true, ativo: newStatus };
}
