import React, { useState, useEffect } from 'react';
import { 
  Users, UserPlus, KeyRound, CheckCircle2, AlertTriangle, ShieldCheck, 
  Search, FileText, ClipboardList, Clock, RefreshCw, Smartphone, Eye
} from 'lucide-react';
import { db } from '../../db';
import { 
  getLocalUsers, 
  syncUsersWithCloud, 
  createUser, 
  resetUserPassword, 
  toggleUserStatus 
} from '../../services/authService';
import { formatDateBR } from '../../services/outlookService';
import AtaSummaryModal from '../checklist/AtaSummaryModal';

export default function GestaoEquipe({ currentUser }) {
  const [subTab, setSubTab] = useState('usuarios'); // 'usuarios' | 'atas' | 'pendencias'
  const [users, setUsers] = useState(() => getLocalUsers());
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Formulário de novo usuário
  const [novoNome, setNovoNome] = useState('');
  const [novoLogin, setNovoLogin] = useState('');
  const [novoCargo, setNovoCargo] = useState('Supervisor de Campo');
  const [formFeedback, setFormFeedback] = useState(null); // { type: 'success' | 'error', message: '' }
  const [submittingUser, setSubmittingUser] = useState(false);

  // Atas da equipe
  const [allAtas, setAllAtas] = useState([]);
  const [selectedUserFilter, setSelectedUserFilter] = useState('TODOS');
  const [searchTermAtas, setSearchTermAtas] = useState('');
  const [selectedAtaModal, setSelectedAtaModal] = useState(null);
  const [loadingAtas, setLoadingAtas] = useState(false);

  // Pendências da equipe
  const [allPendencias, setAllPendencias] = useState([]);
  const [pendenciaUserFilter, setPendenciaUserFilter] = useState('TODOS');
  const [pendenciaStatusFilter, setPendenciaStatusFilter] = useState('TODAS'); // 'TODAS' | 'pendente' | 'concluida'

  // Carrega lista atualizada de usuários
  const loadUsersList = async () => {
    setLoadingUsers(true);
    const list = await syncUsersWithCloud();
    setUsers(list);
    setLoadingUsers(false);
  };

  // Carrega todas as Atas do banco
  const loadAllAtas = async () => {
    setLoadingAtas(true);
    try {
      const items = await db.atas.toArray();
      items.sort((a, b) => new Date(b.dataVisita || b.createdAt) - new Date(a.dataVisita || a.createdAt));
      setAllAtas(items);
    } catch (e) {
      console.error('Erro ao carregar Atas da equipe:', e);
    } finally {
      setLoadingAtas(false);
    }
  };

  // Carrega todas as Pendências do banco
  const loadAllPendencias = async () => {
    try {
      const items = await db.pendencias.toArray();
      items.sort((a, b) => new Date(b.dataCriacao) - new Date(a.dataCriacao));
      setAllPendencias(items);
    } catch (e) {
      console.error('Erro ao carregar Pendências da equipe:', e);
    }
  };

  useEffect(() => {
    loadUsersList();
    loadAllAtas();
    loadAllPendencias();

    const handleRemoteSync = () => {
      loadAllAtas();
      loadAllPendencias();
    };
    window.addEventListener('sky-db-synced', handleRemoteSync);
    return () => window.removeEventListener('sky-db-synced', handleRemoteSync);
  }, []);

  // Cadastro de novo colaborador
  const handleCreateUser = async (e) => {
    e.preventDefault();
    setFormFeedback(null);

    if (!novoNome.trim() || !novoLogin.trim()) {
      setFormFeedback({ type: 'error', message: 'Preencha o Nome e o Login do colaborador.' });
      return;
    }

    setSubmittingUser(true);
    const res = await createUser({
      nome: novoNome.trim(),
      login: novoLogin.trim(),
      cargo: novoCargo.trim()
    });
    setSubmittingUser(false);

    if (res.success) {
      setFormFeedback({
        type: 'success',
        message: `Colaborador "${res.user.nome}" cadastrado com sucesso! Login: ${res.user.login} | Senha provisória: 1234`
      });
      setNovoNome('');
      setNovoLogin('');
      setNovoCargo('Supervisor de Campo');
      loadUsersList();
    } else {
      setFormFeedback({ type: 'error', message: res.reason || 'Erro ao criar usuário.' });
    }
  };

  // Reset de senha para 1234
  const handleResetPassword = async (loginName, nome) => {
    if (!window.confirm(`Tem certeza que deseja resetar a senha de ${nome} (${loginName}) de volta para "1234"?`)) {
      return;
    }

    const res = await resetUserPassword(loginName);
    if (res.success) {
      alert(`Senha de ${nome} resetada para "1234" com sucesso! No próximo login ele deverá criar uma nova senha.`);
      loadUsersList();
    } else {
      alert(res.reason || 'Erro ao resetar senha.');
    }
  };

  // Alterna status de ativação
  const handleToggleStatus = async (loginName) => {
    const res = await toggleUserStatus(loginName);
    if (res.success) {
      loadUsersList();
    } else {
      alert(res.reason || 'Erro ao alterar status.');
    }
  };

  // Filtro de Atas
  const filteredAtas = allAtas.filter((a) => {
    const matchUser = selectedUserFilter === 'TODOS' || (a.usuario || 'Saulo') === selectedUserFilter;
    if (!matchUser) return false;

    if (!searchTermAtas.trim()) return true;
    const term = searchTermAtas.toLowerCase();
    const cred = (a.credenciado || '').toLowerCase();
    const cid = (a.cidade || '').toLowerCase();
    const pdv = (a.pdv || '').toLowerCase();
    const autor = (a.usuario || 'Saulo').toLowerCase();
    return cred.includes(term) || cid.includes(term) || pdv.includes(term) || autor.includes(term);
  });

  // Filtro de Pendências
  const filteredPendencias = allPendencias.filter((p) => {
    const matchUser = pendenciaUserFilter === 'TODOS' || (p.usuario || 'Saulo') === pendenciaUserFilter;
    if (!matchUser) return false;

    if (pendenciaStatusFilter !== 'TODAS' && p.status !== pendenciaStatusFilter) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Cabeçalho do Painel Administrativo */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-800/40 rounded-3xl p-6 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-xs font-black tracking-wider uppercase">
              Área Administrativa Exclusiva
            </span>
            <span className="text-xs text-slate-400">Admin: {currentUser?.nome || 'Saulo'}</span>
          </div>
          <h2 className="text-2xl font-black text-white flex items-center gap-2.5">
            <Users className="w-6 h-6 text-indigo-400" />
            Gestão da Equipe & Usuários
          </h2>
          <p className="text-xs text-slate-300">
            Cadastre novos colaboradores, controle acessos e consulte as ATAs e pendências registradas por toda a equipe.
          </p>
        </div>

        {/* Botão de Atualizar Nuvem */}
        <button
          onClick={() => { loadUsersList(); loadAllAtas(); loadAllPendencias(); }}
          className="self-start sm:self-auto px-4 py-2 rounded-xl bg-indigo-600/30 hover:bg-indigo-600 text-indigo-200 hover:text-white border border-indigo-500/40 transition flex items-center gap-2 text-xs font-bold"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loadingUsers ? 'animate-spin' : ''}`} />
          <span>Atualizar Dados</span>
        </button>
      </div>

      {/* Subtabs de Navegação */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setSubTab('usuarios')}
          className={`px-4 py-2.5 rounded-2xl font-bold text-sm transition flex items-center gap-2 ${
            subTab === 'usuarios'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <UserPlus className="w-4 h-4" />
          <span>Usuários & Cadastros ({users.length})</span>
        </button>

        <button
          onClick={() => setSubTab('atas')}
          className={`px-4 py-2.5 rounded-2xl font-bold text-sm transition flex items-center gap-2 ${
            subTab === 'atas'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          <span>Atas da Equipe ({allAtas.length})</span>
        </button>

        <button
          onClick={() => setSubTab('pendencias')}
          className={`px-4 py-2.5 rounded-2xl font-bold text-sm transition flex items-center gap-2 ${
            subTab === 'pendencias'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Pendências da Equipe ({allPendencias.length})</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* ABA 1: USUÁRIOS & CADASTROS                               */}
      {/* ======================================================== */}
      {subTab === 'usuarios' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Card de Cadastro de Novo Usuário */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-600" />
                Cadastrar Novo Colaborador
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                O colaborador cadastrado receberá a senha inicial provisória <strong>1234</strong> e deverá definir a própria senha no primeiro acesso.
              </p>
            </div>

            {formFeedback && (
              <div className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2 animate-in fade-in ${
                formFeedback.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border border-rose-200 text-rose-800'
              }`}>
                {formFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{formFeedback.message}</span>
              </div>
            )}

            <form onSubmit={handleCreateUser} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Nome Completo
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Carlos Silva"
                  value={novoNome}
                  onChange={(e) => setNovoNome(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-900 text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Login de Acesso
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: carlos (sem espaços)"
                  value={novoLogin}
                  onChange={(e) => setNovoLogin(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-900 text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Cargo / Função
                </label>
                <input
                  type="text"
                  placeholder="Ex: Supervisor de Campo"
                  value={novoCargo}
                  onChange={(e) => setNovoCargo(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-900 text-sm"
                />
              </div>

              <div className="sm:col-span-3 flex items-center justify-between pt-2">
                <span className="text-[11px] text-slate-500">
                  Senha inicial: <strong className="font-mono text-slate-800 font-bold">1234</strong> • Notificações individuais serão ativadas no app dele.
                </span>
                <button
                  type="submit"
                  disabled={submittingUser}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md transition flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{submittingUser ? 'Cadastrando...' : 'Cadastrar Colaborador'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Lista de Colaboradores Cadastrados */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-600" />
                  Colaboradores Cadastrados ({users.length})
                </h3>
                <p className="text-xs text-slate-500">
                  Gerencie permissões, consulte status e resete senhas quando necessário.
                </p>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {users.map((u) => {
                const isAdmin = u.role === 'ADMIN' || u.login.toLowerCase() === 'saulo';
                return (
                  <div key={u.login} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm text-white shadow-sm ${
                        isAdmin ? 'bg-gradient-to-tr from-rose-600 to-red-500' : 'bg-gradient-to-tr from-indigo-600 to-blue-500'
                      }`}>
                        {u.nome ? u.nome.slice(0, 2).toUpperCase() : u.login.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <strong className="text-slate-900 font-bold text-sm">{u.nome || u.login}</strong>
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-lg border ${
                            isAdmin 
                              ? 'bg-rose-100 text-rose-700 border-rose-300' 
                              : 'bg-indigo-100 text-indigo-700 border-indigo-300'
                          }`}>
                            {isAdmin ? 'ADMIN' : 'COLABORADOR'}
                          </span>
                          {!u.ativo && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-500 border border-slate-300">
                              Inativo
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                          <span>Login: <strong className="text-slate-700 font-mono">{u.login}</strong></span>
                          <span>•</span>
                          <span>Cargo: <strong>{u.cargo || 'Colaborador'}</strong></span>
                          {u.precisaTrocarSenha && (
                            <>
                              <span>•</span>
                              <span className="text-amber-600 font-bold flex items-center gap-1">
                                <KeyRound className="w-3 h-3" /> Senha Inicial (1234)
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      {!isAdmin && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleResetPassword(u.login, u.nome || u.login)}
                            className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-800 border border-slate-200 transition flex items-center gap-1.5"
                            title="Resetar a senha para 1234 caso o colaborador tenha esquecido"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                            <span>Resetar para 1234</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleStatus(u.login)}
                            className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition flex items-center gap-1 ${
                              u.ativo
                                ? 'bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-700 border-slate-200'
                                : 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200'
                            }`}
                            title={u.ativo ? 'Desativar acesso do colaborador' : 'Reativar acesso do colaborador'}
                          >
                            <Power className="w-3.5 h-3.5" />
                            <span>{u.ativo ? 'Desativar' : 'Ativar'}</span>
                          </button>
                        </>
                      )}

                      {isAdmin && (
                        <span className="text-xs font-bold text-slate-400 italic px-2">
                          Perfil Master Protegido
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ABA 2: ATAS DA EQUIPE                                    */}
      {/* ======================================================== */}
      {subTab === 'atas' && (
        <div className="space-y-4 animate-in fade-in">
          {/* Barra de Filtros */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Filtrar por Colaborador:
              </label>
              <select
                value={selectedUserFilter}
                onChange={(e) => setSelectedUserFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-300 font-semibold text-slate-800 text-xs focus:ring-2 focus:ring-indigo-500 bg-slate-50"
              >
                <option value="TODOS">Todos os Colaboradores ({allAtas.length})</option>
                {users.map((u) => {
                  const count = allAtas.filter((a) => (a.usuario || 'Saulo') === u.login).length;
                  return (
                    <option key={u.login} value={u.login}>
                      {u.nome || u.login} ({count} Atas)
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="relative flex items-center min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar por PDV, Credenciado, Cidade..."
                value={searchTermAtas}
                onChange={(e) => setSearchTermAtas(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Lista de Atas */}
          {loadingAtas ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm space-y-2">
              <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mx-auto" />
              <p className="text-xs text-slate-500 font-semibold">Carregando atas da equipe...</p>
            </div>
          ) : filteredAtas.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm space-y-2">
              <ClipboardList className="w-12 h-12 text-slate-300 mx-auto" />
              <h4 className="text-base font-bold text-slate-700">Nenhuma Ata encontrada</h4>
              <p className="text-xs text-slate-400">
                {selectedUserFilter !== 'TODOS'
                  ? `O colaborador "${selectedUserFilter}" ainda não registrou nenhuma ata de visita.`
                  : 'Nenhuma ata corresponde ao filtro de busca informado.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredAtas.map((ata) => {
                const autor = ata.usuario || 'Saulo';
                return (
                  <div
                    key={ata.id}
                    className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm hover:border-indigo-400 transition space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 font-bold text-xs border border-indigo-200">
                            Autor: {autor}
                          </span>
                          {ata.pdv && (
                            <span className="px-2 py-0.5 rounded-lg bg-rose-600 text-white font-black text-xs">
                              {ata.pdv}
                            </span>
                          )}
                        </div>
                        <h4 className="text-base font-bold text-slate-900 mt-1">
                          {ata.credenciado}
                        </h4>
                        <span className="text-xs text-slate-500">
                          {ata.cidade} • Data da Visita: <strong>{formatDateBR(ata.dataVisita)}</strong>
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedAtaModal(ata)}
                        className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white border border-indigo-200 transition text-xs font-bold flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Ver Ata</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="text-[10px] text-slate-400 block font-semibold">T.A AT</span>
                        <strong className="text-slate-800 font-bold">{ata.proprietario?.indicadorTaAt || '-'}</strong>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="text-[10px] text-slate-400 block font-semibold">T.A PP</span>
                        <strong className="text-slate-800 font-bold">{ata.proprietario?.indicadorTaPp || '-'}</strong>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="text-[10px] text-slate-400 block font-semibold">Vendas Pós</span>
                        <strong className="text-emerald-600 font-bold">{ata.vendas?.vendasPos ?? 0}</strong>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* ABA 3: PENDÊNCIAS DA EQUIPE                              */}
      {/* ======================================================== */}
      {subTab === 'pendencias' && (
        <div className="space-y-4 animate-in fade-in">
          {/* Barra de Filtros */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Colaborador:
              </label>
              <select
                value={pendenciaUserFilter}
                onChange={(e) => setPendenciaUserFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-300 font-semibold text-slate-800 text-xs focus:ring-2 focus:ring-indigo-500 bg-slate-50"
              >
                <option value="TODOS">Todos ({allPendencias.length})</option>
                {users.map((u) => {
                  const count = allPendencias.filter((p) => (p.usuario || 'Saulo') === u.login).length;
                  return (
                    <option key={u.login} value={u.login}>
                      {u.nome || u.login} ({count})
                    </option>
                  );
                })}
              </select>

              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 ml-2">
                Status:
              </label>
              <select
                value={pendenciaStatusFilter}
                onChange={(e) => setPendenciaStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-300 font-semibold text-slate-800 text-xs focus:ring-2 focus:ring-indigo-500 bg-slate-50"
              >
                <option value="TODAS">Todas</option>
                <option value="pendente">Apenas Em Aberto</option>
                <option value="concluida">Apenas Concluídas</option>
              </select>
            </div>

            <span className="text-xs font-bold text-slate-500">
              {filteredPendencias.length} pendência(s) encontrada(s)
            </span>
          </div>

          {/* Lista de Pendências */}
          {filteredPendencias.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm space-y-2">
              <Clock className="w-12 h-12 text-slate-300 mx-auto" />
              <h4 className="text-base font-bold text-slate-700">Nenhuma pendência encontrada</h4>
              <p className="text-xs text-slate-400">
                Não há pendências registradas para os filtros selecionados.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPendencias.map((p) => {
                const isResolved = p.status === 'concluida';
                const autor = p.usuario || 'Saulo';
                return (
                  <div
                    key={p.id}
                    className={`bg-white rounded-2xl p-4 border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isResolved ? 'opacity-60 bg-slate-50 border-slate-200' : 'border-slate-200 shadow-sm hover:border-indigo-300'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 font-bold text-[11px] border border-indigo-200">
                          Autor: {autor}
                        </span>
                        <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 font-bold text-[11px]">
                          Setor: {p.setor || 'Geral'}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg uppercase ${
                          p.prioridade === 'alta' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          Prioridade {p.prioridade || 'Normal'}
                        </span>
                        {isResolved && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800">
                            Concluída
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-bold text-slate-800">
                        {p.credenciado ? `${p.credenciado}: ` : ''}{p.descricao}
                      </p>
                      <span className="text-xs text-slate-400">
                        Criada em: {formatDateBR(p.dataCriacao)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal de Detalhes da ATA Selecionada */}
      {selectedAtaModal && (
        <AtaSummaryModal
          isOpen={Boolean(selectedAtaModal)}
          onClose={() => setSelectedAtaModal(null)}
          data={selectedAtaModal}
          onSave={() => {}}
          hideSaveButton={true}
        />
      )}
    </div>
  );
}
