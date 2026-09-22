import Dexie from 'dexie';

export const db = new Dexie('SkyGestaoDB');

db.version(1).stores({
  atas: '++id, credenciado, cidade, dataVisita, createdAt',
  pendencias: '++id, ataId, credenciado, setor, status, dataCriacao, prioridade',
  rotinas: '++id, titulo, horario, ativo'
});

// Nenhuma ação destrutiva: os dados do usuário ficam 100% preservados
export async function seedInitialDataIfNeeded() {
  // Mantido vazio para proteger totalmente as rotinas e adições feitas pelo usuário
}
