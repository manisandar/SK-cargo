import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useRepository } from '../data';
import { strings } from '../strings';
import { StaffUser } from '../types';
import { ShieldAlert, User, KeyRound, ArrowRight, CheckCircle2 } from 'lucide-react';

export const LoginScreen: React.FC = () => {
  const { login, user } = useAuth();
  const repository = useRepository();
  const navigate = useNavigate();

  const [username, setUsername] = useState('staff1');
  const [password, setPassword] = useState('staff123');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);

  useEffect(() => {
    if (user) {
      if (user.role === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/parcels');
      }
    }
  }, [user, navigate]);

  useEffect(() => {
    repository.getStaffUsers().then((users) => {
      setStaffUsers(users);
    });
  }, [repository]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const loggedIn = await login(username, password);
      if (loggedIn.role === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/parcels');
      }
    } catch {
      setError(strings.auth.invalidCredentials);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickSelect = (u: StaffUser) => {
    setUsername(u.username);
    setPassword(u.password || 'staff123');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] dark:bg-slate-950 flex flex-col items-center justify-center p-4 transition-colors">
      {/* Mobile container constraint 390px */}
      <div className="w-full max-w-[390px] bg-white dark:bg-slate-900 rounded-2xl shadow-xl overflow-hidden border border-slate-200 dark:border-slate-800">
        {/* Navy Header with Official Logo */}
        <div className="bg-[#1E75BB] px-6 py-6 text-white text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white p-2 shadow-md mb-2 overflow-hidden">
            <img src="/sk-logo.jpg" alt="SK Cargo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl font-black tracking-wide text-white">
            {strings.app.title}
          </h1>
          <p className="text-xs text-amber-200 font-bold uppercase tracking-widest mt-1">
            Thai ⇄ Myanmar Cargo
          </p>
          <p className="text-[11px] text-blue-100 mt-0.5 font-medium">
            {strings.app.tagline}
          </p>
        </div>

        {/* Temporary Auth Banner */}
        <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900/50 px-4 py-3 flex items-start gap-2.5">
          <ShieldAlert className="w-5 h-5 text-[#D9822B] flex-shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed font-medium">
            <span className="font-bold block uppercase tracking-wider text-[10px] text-[#D9822B]">
              {strings.app.temporaryNotice}
            </span>
            {strings.auth.tempLoginNotice}
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 text-xs rounded-xl font-medium">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                {strings.auth.usernameLabel}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={strings.auth.usernamePlaceholder}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1E75BB] focus:bg-white dark:focus:bg-slate-800 min-h-[44px]"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                {strings.auth.passwordLabel}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={strings.auth.passwordPlaceholder}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1E75BB] focus:bg-white dark:focus:bg-slate-800 min-h-[44px]"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 bg-[#1E75BB] hover:bg-[#165B94] active:bg-[#124673] text-white font-bold py-3 px-4 rounded-xl shadow-md flex items-center justify-center gap-2 text-sm min-h-[44px] transition-colors"
            >
              <span>{strings.auth.loginButton}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick select demo users */}
          {staffUsers.length > 0 && (
            <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5">
                {strings.auth.quickFillTitle}
              </p>
              <div className="space-y-2">
                {staffUsers.map((u) => {
                  const isSelected = username === u.username;
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => handleQuickSelect(u)}
                      className={`w-full text-left p-2.5 rounded-xl border flex items-center justify-between text-xs transition-colors min-h-[44px] ${
                        isSelected
                          ? 'border-[#1E75BB] bg-blue-50/70 dark:bg-blue-950/40 text-[#1E75BB] dark:text-[#2D8AD1] font-semibold'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 dark:text-white">{u.name}</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">
                          @{u.username} • {u.role === 'admin' ? strings.auth.roleAdmin : strings.auth.roleStaff}
                        </span>
                      </div>
                      {isSelected && (
                        <CheckCircle2 className="w-4 h-4 text-[#1E75BB] dark:text-[#2D8AD1]" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

