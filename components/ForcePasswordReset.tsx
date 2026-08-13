import React, { useState } from 'react';
import { User } from '../types';
import { Lock, ShieldCheck, KeyRound, AlertCircle, LogOut } from 'lucide-react';
import { updatePassword } from 'firebase/auth';
import { auth } from '../firebase';

interface ForcePasswordResetProps {
  currentUser: User;
  onComplete: () => void;
  onLogout: () => void;
}

// Shown to brand-new users on their first sign-in. They must replace the
// admin-issued initial password with one of their own before proceeding.
const ForcePasswordReset: React.FC<ForcePasswordResetProps> = ({ currentUser, onComplete, onLogout }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (newPassword !== confirm) { setError('Passwords do not match.'); return; }

    const firebaseUser = auth.currentUser;
    if (!firebaseUser) { setError('Session expired. Please sign in again.'); return; }

    setSubmitting(true);
    try {
      await updatePassword(firebaseUser, newPassword);
      onComplete();
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/requires-recent-login') {
        setError('Session expired. Please sign out and sign back in, then try again.');
      } else {
        setError('Could not update password. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200">
        <div className="bg-slate-900 p-8 text-white flex flex-col items-center">
          <div className="bg-blue-600/20 p-4 rounded-full mb-4 border border-blue-500/30">
            <KeyRound className="text-blue-400" size={32} />
          </div>
          <h1 className="text-xl font-black tracking-tight">Set Your Password</h1>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2 flex items-center gap-2">
            <ShieldCheck size={12} /> First Sign-In Required
          </p>
        </div>

        <div className="p-8">
          <div className="mb-6 flex items-center gap-2 p-3 bg-blue-50 border border-blue-100 rounded-xl">
            <ShieldCheck className="text-blue-600 shrink-0" size={18} />
            <p className="text-[11px] font-bold text-blue-800 leading-tight">
              Welcome, <span className="text-blue-900">{currentUser.name}</span>. For your security, please replace the
              temporary password you were given with a new one before continuing.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-slate-300" size={18} />
                <input
                  type="password"
                  required
                  className="w-full border border-slate-200 bg-slate-50 rounded-xl px-10 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  placeholder="New password (min 6 chars)"
                  value={newPassword}
                  onChange={(e) => { setNewPassword(e.target.value); setError(''); }}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-slate-300" size={18} />
                <input
                  type="password"
                  required
                  className="w-full border border-slate-200 bg-slate-50 rounded-xl px-10 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  placeholder="Re-enter new password"
                  value={confirm}
                  onChange={(e) => { setConfirm(e.target.value); setError(''); }}
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 text-red-700 text-[11px] p-3 rounded-xl border border-red-100 flex items-start gap-2 font-bold">
                <AlertCircle className="shrink-0" size={14} />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white font-black py-4 rounded-xl transition-all shadow-xl active:scale-[0.98] uppercase tracking-widest text-xs"
            >
              {submitting ? 'Saving…' : 'Set Password & Continue'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button onClick={onLogout} className="inline-flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-600 font-bold uppercase tracking-widest">
              <LogOut size={12} /> Cancel &amp; Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForcePasswordReset;
