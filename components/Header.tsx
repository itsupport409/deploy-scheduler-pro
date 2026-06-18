import React, { useState } from 'react';
import { User as UserType, Notification, ChangeRequest } from '../types';
import { buildAlerts, formatAlertTime } from '../alerts';
import { Bell, LogOut, Key, X, Lock, CheckCircle, RefreshCcw, Clock, AlertTriangle } from 'lucide-react';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { auth } from '../firebase';

interface HeaderProps {
  currentUser: UserType;
  onLogout: () => void;
  onChangePassword?: (userId: string, newPassword: string) => void;
  notifications?: Notification[];
  requests?: ChangeRequest[];
  users?: UserType[];
  isSaving?: boolean;
  lastSaved?: number;
}

const Header: React.FC<HeaderProps> = ({ currentUser, onLogout, notifications = [], requests = [], users = [], isSaving, lastSaved }) => {
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });
  const [error, setError] = useState('');

  const recentNotifications = buildAlerts(notifications, requests, users).slice(0, 6);

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.new.length < 6) { setError('New password must be at least 6 characters.'); return; }
    if (passwordForm.new !== passwordForm.confirm) { setError('Passwords do not match.'); return; }

    const firebaseUser = auth.currentUser;
    if (!firebaseUser) { setError('Not authenticated. Please sign in again.'); return; }

    try {
      const credential = EmailAuthProvider.credential(currentUser.email, passwordForm.current);
      await reauthenticateWithCredential(firebaseUser, credential);
      await updatePassword(firebaseUser, passwordForm.new);
      setShowPasswordModal(false);
      setPasswordForm({ current: '', new: '', confirm: '' });
      alert('Password updated successfully.');
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setError('Incorrect current password.');
      } else if (code === 'auth/requires-recent-login') {
        setError('Session expired. Please sign out and sign back in before changing your password.');
      } else {
        setError('Failed to update password. Please try again.');
      }
    }
  };

  return (
    <>
    {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
             <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Lock className="text-blue-500" size={20}/> Security Settings</h3>
                      <button onClick={() => { setShowPasswordModal(false); setError(''); setPasswordForm({ current: '', new: '', confirm: '' }); }} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                  </div>
                  <form onSubmit={handleChangePasswordSubmit} className="space-y-4">
                      <input type="password" required placeholder="Current Password" className="w-full border rounded-lg px-3 py-2 outline-none" value={passwordForm.current} onChange={e => setPasswordForm({...passwordForm, current: e.target.value})} />
                      <input type="password" required placeholder="New Password (min 6 chars)" className="w-full border rounded-lg px-3 py-2 outline-none" value={passwordForm.new} onChange={e => setPasswordForm({...passwordForm, new: e.target.value})} />
                      <input type="password" required placeholder="Confirm New Password" className="w-full border rounded-lg px-3 py-2 outline-none" value={passwordForm.confirm} onChange={e => setPasswordForm({...passwordForm, confirm: e.target.value})} />
                      {error && <div className="text-xs text-red-600 bg-red-50 p-2 rounded">{error}</div>}
                      <button type="submit" className="w-full bg-blue-600 text-white font-bold py-2 rounded-lg">Update Password</button>
                  </form>
             </div>
        </div>
    )}

    <header className="h-16 bg-white border-b border-slate-200 fixed top-0 left-64 right-0 flex items-center justify-between px-6 z-10 print:hidden">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
            <span className="text-slate-500 text-sm">Staff:</span>
            <span className="font-bold text-slate-800">{currentUser.name}</span>
            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded-full border border-slate-200 uppercase font-bold tracking-tight">{currentUser.role}</span>
        </div>

        <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all duration-300 group ${
                isSaving
                ? 'bg-blue-50 border-blue-200 text-blue-600 shadow-sm'
                : 'bg-green-50 border-green-200 text-green-600'
            }`}
            title={lastSaved ? `Last synced: ${new Date(lastSaved).toLocaleTimeString()}` : 'Connecting...'}
        >
            <div className="relative">
                {isSaving ? (
                    <RefreshCcw size={14} className="animate-spin" />
                ) : (
                    <CheckCircle size={14} className="group-hover:scale-110 transition-transform" />
                )}
            </div>
            <div className="flex flex-col leading-none">
                <span className="text-[9px] font-black uppercase tracking-widest">
                    {isSaving ? 'Synchronizing' : 'Firebase Synced'}
                </span>
                {!isSaving && lastSaved && (
                    <span className="text-[8px] opacity-70 font-mono mt-0.5">
                        {new Date(lastSaved).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', second:'2-digit'})}
                    </span>
                )}
            </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors" title="Security Settings" onClick={() => setShowPasswordModal(true)}><Key size={20} /></button>
        <div className="relative">
            <button
                className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors"
                title="Recent system notifications"
                onClick={() => setShowNotifications(s => !s)}
            >
                <Bell size={20} />
                {recentNotifications.length > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                )}
            </button>

            {showNotifications && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
                            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2"><Bell size={14} className="text-blue-500" /> Recent System Notifications</h4>
                            <span className="text-[9px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded-full border border-slate-200 uppercase">{recentNotifications.length}</span>
                        </div>
                        <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
                            {recentNotifications.length === 0 ? (
                                <p className="px-4 py-8 text-center text-xs text-slate-400 italic">No recent system activity logged.</p>
                            ) : (
                                recentNotifications.map(n => (
                                    <div key={n.id} className="px-4 py-3 hover:bg-slate-50 transition-colors">
                                        <div className="flex justify-between items-start gap-2 mb-1">
                                            <h5 className={`text-xs font-bold truncate flex items-center gap-1.5 ${n.kind === 'request' ? 'text-amber-700' : 'text-slate-800'}`}>
                                                {n.kind === 'request' && <AlertTriangle size={11} className="text-amber-500 shrink-0" />}
                                                {n.subject}
                                            </h5>
                                            <span className="text-[9px] font-bold text-slate-400 whitespace-nowrap flex items-center gap-1"><Clock size={9} /> {formatAlertTime(n.sentAt)}</span>
                                        </div>
                                        <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">{n.content}</p>
                                        <span className="text-[9px] text-slate-400 font-medium mt-1 block">{n.userName}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
        <div className="pl-4 border-l border-slate-200">
            <button onClick={onLogout} className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-red-600 transition-colors"><LogOut size={18} />Sign Out</button>
        </div>
      </div>
    </header>
    </>
  );
};

export default Header;
