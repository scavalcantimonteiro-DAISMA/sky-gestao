import React, { useState } from 'react';
import { LogIn, Lock, User, Eye, EyeOff, Shield, Sparkles, AlertCircle, Smartphone } from 'lucide-react';
import { login } from '../services/authService';

export default function LoginScreen({ onLoginSuccess }) {
  const [loginInput, setLoginInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!loginInput.trim() || !passwordInput) {
      setError('Por favor, informe seu login e sua senha.');
      return;
    }

    setLoading(true);
    const res = await login(loginInput, passwordInput, rememberMe);
    setLoading(false);

    if (res.success) {
      if (onLoginSuccess) onLoginSuccess(res.user);
    } else {
      setError(res.reason || 'Usuário ou senha incorretos.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white flex flex-col justify-center items-center px-4 py-8 font-sans">
      <div className="max-w-md w-full space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-rose-600 to-red-500 shadow-xl shadow-rose-600/30 text-white font-black text-2xl tracking-tighter mb-1">
            SKY
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center justify-center gap-2">
            <span>Gestão de Rotinas & ATAs</span>
          </h1>
          <p className="text-sm text-slate-400">
            Acesse com seu Login e Senha para continuar
          </p>
        </div>

        {/* Card do Formulário */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5 backdrop-blur-xl">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-950/70 border border-rose-500/40 text-rose-300 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Campo Login */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                Login / Usuário
              </label>
              <div className="relative flex items-center">
                <User className="w-5 h-5 text-slate-400 absolute left-3.5" />
                <input
                  type="text"
                  required
                  autoFocus
                  autoCapitalize="none"
                  autoCorrect="off"
                  value={loginInput}
                  onChange={(e) => setLoginInput(e.target.value)}
                  placeholder="Ex: Saulo"
                  className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-800/90 border border-slate-700 text-white placeholder-slate-500 font-semibold focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition shadow-inner"
                />
              </div>
            </div>

            {/* Campo Senha */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                Senha de Acesso
              </label>
              <div className="relative flex items-center">
                <Lock className="w-5 h-5 text-slate-400 absolute left-3.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Digite sua senha..."
                  className="w-full pl-11 pr-11 py-3 rounded-2xl bg-slate-800/90 border border-slate-700 text-white placeholder-slate-500 font-semibold focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition shadow-inner"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 text-slate-400 hover:text-white p-1"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Lembrar-me */}
            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded text-rose-600 bg-slate-800 border-slate-700 focus:ring-rose-500 focus:ring-offset-slate-900"
                />
                <span>Mantenha-me conectado</span>
              </label>
            </div>

            {/* Botão Entrar */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-base shadow-lg shadow-rose-600/30 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 pt-3"
            >
              <LogIn className="w-5 h-5" />
              <span>{loading ? 'Entrando...' : 'Entrar no Sistema'}</span>
            </button>
          </form>

          {/* Dica de Primeiro Acesso */}
          <div className="pt-2 border-t border-slate-800/80 text-center">
            <p className="text-[11px] text-slate-500">
              Novos colaboradores: use o login fornecido pelo Administrador e senha inicial <strong className="text-slate-300 font-mono">1234</strong>.
            </p>
          </div>
        </div>

        {/* Rodapé */}
        <div className="text-center text-xs text-slate-500 flex items-center justify-center gap-2">
          <Shield className="w-3.5 h-3.5 text-rose-500" />
          <span>Acesso individual seguro com sincronização em nuvem</span>
        </div>
      </div>
    </div>
  );
}
