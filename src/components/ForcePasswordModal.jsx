import React, { useState } from 'react';
import { Lock, KeyRound, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { changePassword } from '../services/authService';

export default function ForcePasswordModal({ user, onSuccess }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!user || !user.precisaTrocarSenha) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!newPassword.trim()) {
      setError('Por favor, informe a sua nova senha.');
      return;
    }

    if (newPassword.length < 4) {
      setError('A senha deve ter no mínimo 4 caracteres.');
      return;
    }

    if (newPassword === '1234') {
      setError('A nova senha não pode ser a senha padrão "1234". Escolha uma senha pessoal.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('A confirmação de senha não confere. Digite a mesma senha nos dois campos.');
      return;
    }

    setLoading(true);
    const res = await changePassword(user.login, newPassword);
    setLoading(false);

    if (res.success) {
      if (onSuccess) onSuccess(res.user);
    } else {
      setError(res.reason || 'Erro ao alterar a senha.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md p-4 flex items-center justify-center animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden p-6 sm:p-7 space-y-5">
        {/* Cabeçalho */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto shadow-sm">
            <KeyRound className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-black text-slate-900">Primeiro Acesso — Crie sua Senha</h3>
          <p className="text-xs text-slate-500">
            Olá, <strong>{user.nome || user.login}</strong>! Por segurança, substitua a senha provisória <strong>1234</strong> por uma senha pessoal definitiva.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Nova Senha Pessoal
            </label>
            <div className="relative flex items-center">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5" />
              <input
                type="password"
                required
                autoFocus
                placeholder="Mínimo 4 dígitos ou letras..."
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 text-slate-900 font-semibold"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Confirmar Nova Senha
            </label>
            <div className="relative flex items-center">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5" />
              <input
                type="password"
                required
                placeholder="Repita a nova senha..."
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 text-slate-900 font-semibold"
              />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Dica de Segurança</span>
            </div>
            <p>
              Guarde esta senha. Ela será usada em todos os seus acessos futuros no computador e no celular.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-lg shadow-rose-600/30 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{loading ? 'Salvando...' : 'Salvar Nova Senha e Entrar'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
