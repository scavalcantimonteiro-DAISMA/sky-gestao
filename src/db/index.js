import Dexie from 'dexie';

export const db = new Dexie('SkyGestaoDB');

db.version(1).stores({
  atas: '++id, credenciado, cidade, dataVisita, createdAt',
  pendencias: '++id, ataId, credenciado, setor, status, dataCriacao, prioridade',
  rotinas: '++id, titulo, horario, ativo'
});

db.version(2).stores({
  atas: '++id, credenciado, cidade, dataVisita, createdAt, usuario',
  pendencias: '++id, ataId, credenciado, setor, status, dataCriacao, prioridade, usuario',
  rotinas: '++id, titulo, horario, ativo, usuario'
}).upgrade(async (tx) => {
  // Migração segura: preserva 100% dos dados históricos vinculando-os ao Saulo
  await tx.atas.toCollection().modify((item) => {
    if (!item.usuario) item.usuario = 'Saulo';
  });
  await tx.pendencias.toCollection().modify((item) => {
    if (!item.usuario) item.usuario = 'Saulo';
  });
  await tx.rotinas.toCollection().modify((item) => {
    if (!item.usuario) item.usuario = 'Saulo';
  });
});

// Nenhuma ação destrutiva: os dados do usuário ficam 100% preservados
export async function seedInitialDataIfNeeded() {
  try {
    // Garante que se houver registros sem usuário, atribui ao Saulo
    await db.atas.where('usuario').equals('').modify({ usuario: 'Saulo' });
    await db.pendencias.where('usuario').equals('').modify({ usuario: 'Saulo' });
    await db.rotinas.where('usuario').equals('').modify({ usuario: 'Saulo' });
  } catch (e) {
    // Silencioso se índice ainda não populado
  }
}
