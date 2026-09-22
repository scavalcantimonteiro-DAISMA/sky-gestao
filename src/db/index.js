import Dexie from 'dexie';

export const db = new Dexie('SkyGestaoDB');

db.version(1).stores({
  atas: '++id, credenciado, cidade, dataVisita, createdAt',
  pendencias: '++id, ataId, credenciado, setor, status, dataCriacao, prioridade',
  rotinas: '++id, titulo, horario, ativo'
});

// Limpa as rotinas de exemplo existentes para o usuário cadastrar as suas próprias
export async function seedInitialDataIfNeeded() {
  const flagKey = 'sky_rotinas_cleared_user_req_v2';
  if (!localStorage.getItem(flagKey)) {
    await db.rotinas.clear();
    localStorage.setItem(flagKey, 'true');
  }
}
