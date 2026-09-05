import React, { useState, useEffect } from 'react';
import { ShieldCheck, LogIn, ChevronRight, Eye, EyeOff, AlertCircle, Loader } from 'lucide-react';
import { login as apiLogin, getDemoUsers, setStoredAuth } from '../services/api';
import { AuthUser, DemoUser, UserRole } from '../types';

interface LoginPageProps {
  onLogin: (user: AuthUser, token: string) => void;
}

const ROLE_DESCRIPTIONS: Record<string, string> = {
  'Administrator':    'Full system access — all data, all actions.',
  'Ministry Officer': 'Ministry-level oversight and reporting.',
  'State Officer':    'State-level review and escalation.',
  'District Officer': 'District-level field audit and review decisions.',
  'MP':               'Constituency-specific monitoring dashboard.',
};

const ROLE_COLORS: Record<string, string> = {
  'Administrator':    'border-purple-300 bg-purple-50/70 hover:border-purple-500',
  'Ministry Officer': 'border-blue-300 bg-blue-50/70 hover:border-blue-500',
  'State Officer':    'border-indigo-300 bg-indigo-50/70 hover:border-indigo-500',
  'District Officer': 'border-emerald-300 bg-emerald-50/70 hover:border-emerald-500',
  'MP':               'border-amber-300 bg-amber-50/70 hover:border-amber-500',
};

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [demoUsers, setDemoUsers]     = useState<DemoUser[]>([]);
  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [selected, setSelected]       = useState<DemoUser | null>(null);

  useEffect(() => {
    getDemoUsers()
      .then((d: any) => setDemoUsers(d.users || []))
      .catch(() => {/* backend may be down — email/password still works */});
  }, []);

  const handleDemoSelect = (user: DemoUser) => {
    setSelected(user);
    setEmail(user.email);
    const pwMap: Record<string, string> = {
      'Administrator':    'admin123',
      'Ministry Officer': 'ministry123',
      'State Officer':    'state123',
      'District Officer': 'district123',
      'MP':               'mp123',
    };
    setPassword(pwMap[user.role] || '');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await apiLogin(email.trim(), password);
      setStoredAuth(res.access_token, res.user);
      onLogin(res.user as AuthUser, res.access_token);
    } catch (err: any) {
      setError(err.message?.includes('401') || err.message?.includes('Invalid')
        ? 'Invalid email or password. Try a demo account below.'
        : 'Could not connect to NIRIKSHAN backend. Ensure the API server is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F1B2F] via-[#162235] to-[#0b1320] flex flex-col items-center justify-center p-4">
      {/* Brand Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 via-blue-600 to-indigo-700 flex items-center justify-center shadow-2xl border border-blue-400/40">
          <ShieldCheck className="w-9 h-9 text-white drop-shadow-lg" />
        </div>
        <div>
          <h1 className="text-4xl font-black tracking-widest text-white">NIRIKSHAN</h1>
          <p className="text-blue-400 text-xs font-bold tracking-widest uppercase mt-0.5">
            MPLADS Intelligence Platform — SIH26102
          </p>
        </div>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-md bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
        {/* Prototype Badge */}
        <div className="bg-amber-500/20 border-b border-amber-500/30 px-6 py-3 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          <p className="text-xs font-semibold text-amber-300">
            <span className="font-black">PROTOTYPE — Demo Role Selection.</span>{' '}
            Click any role below to auto-fill credentials.
          </p>
        </div>

        <div className="p-8">
          <h2 className="text-xl font-black text-white mb-1">Secure Sign In</h2>
          <p className="text-sm text-slate-400 mb-6">Authenticate to access the MPLADS monitoring dashboard.</p>

          {/* Demo Role Selector */}
          {demoUsers.length > 0 && (
            <div className="mb-6">
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-3">Quick Demo Login</p>
              <div className="space-y-2">
                {demoUsers.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => handleDemoSelect(u)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border transition ${
                      selected?.id === u.id
                        ? 'border-blue-500 bg-blue-900/30 ring-1 ring-blue-500'
                        : `${ROLE_COLORS[u.role] || 'border-slate-600 bg-white/5 hover:bg-white/10'} border`
                    }`}
                  >
                    <div className="text-left">
                      <div className="text-sm font-bold text-white">{u.name}</div>
                      <div className="text-[10px] text-slate-400">{u.role} — {ROLE_DESCRIPTIONS[u.role]}</div>
                    </div>
                    <ChevronRight className={`w-4 h-4 shrink-0 transition ${selected?.id === u.id ? 'text-blue-400' : 'text-slate-500'}`} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mb-4 flex items-start gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <p className="text-xs font-medium text-rose-300">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">
                Email
              </label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="officer@nirikshan.gov.in"
                required
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-2.5 pr-10 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-blue-900/30 disabled:opacity-70"
            >
              {loading ? (
                <><Loader className="w-4 h-4 animate-spin" /> Authenticating…</>
              ) : (
                <><LogIn className="w-4 h-4" /> Sign In to NIRIKSHAN</>
              )}
            </button>
          </form>
        </div>
      </div>

      <p className="mt-6 text-xs text-slate-600 text-center max-w-sm">
        This is a prototype system for SIH26102. Risk scores are prioritization signals, not fraud verdicts.
      </p>
    </div>
  );
};
