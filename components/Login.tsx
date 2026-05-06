
import React, { useState } from 'react';
import { User, Role } from '../types';
import { Lock, ShieldCheck, ArrowLeft, Mail, Building2, Globe, AlertCircle } from 'lucide-react';
import { ALLOWED_DOMAINS } from '../App';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [step, setStep] = useState<'login' | '2fa'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // 2FA State
  const [tempUser, setTempUser] = useState<User | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [sentCode, setSentCode] = useState('');

  const ROLES_REQUIRING_2FA = [Role.ADMIN, Role.GM, Role.BOM];

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    const domain = cleanEmail.split('@')[1];

    // Domain Enforcement Check
    if (!ALLOWED_DOMAINS.includes(domain)) {
        setError(`Access Denied: ${domain ? '@' + domain : 'This address'} is not a recognized corporate domain.`);
        return;
    }

    // Validate credentials server-side and get the user's role (no session created yet)
    fetch('/api/auth/pre-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password })
    })
        .then(res => res.ok ? res.json() : Promise.reject(new Error('Invalid credentials')))
        .then(data => {
            const user: User = data.user;
            if (ROLES_REQUIRING_2FA.includes(user.role)) {
                // Require 2FA before creating a session
                const code = Math.floor(100000 + Math.random() * 900000).toString();
                setSentCode(code);
                setTempUser(user);
                setStep('2fa');
                setError('');
            } else {
                // No 2FA needed — create the session now
                return fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: cleanEmail, password })
                })
                    .then(res => res.ok ? res.json() : Promise.reject(new Error('Login failed')))
                    .then(loginData => onLogin(loginData.user));
            }
        })
        .catch(err => {
            console.error('Login error:', err);
            setError('Access Denied: Incorrect credentials or identity not found in the verified staff roster.');
        });
  };

  const handleVerifySubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (verificationCode === sentCode && tempUser) {
          // 2FA passed — create the session now
          fetch('/api/auth/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: tempUser.email, password })
          })
              .then(res => res.ok ? res.json() : Promise.reject(new Error('Login failed')))
              .then(data => {
                  onLogin(data.user);
              })
              .catch(err => {
                  console.error('Login error:', err);
                  setError('Login failed. Please try again.');
              });
      } else {
          setError('Invalid verification code. Please try again.');
      }
  };

  const handleResendCode = () => {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setSentCode(code);
      setVerificationCode('');
      setError('');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200">
        <div className="bg-slate-900 p-8 text-white flex flex-col items-center">
            <div className="bg-blue-600/20 p-4 rounded-full mb-4 border border-blue-500/30">
                <Building2 className="text-blue-400" size={32} />
            </div>
            <h1 className="text-xl font-black tracking-tight">Corporate Identity Provider</h1>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2 flex items-center gap-2">
                <Globe size={12} /> Secure Internal Access
            </p>
        </div>

        <div className="p-8">
        {step === 'login' ? (
            <>
                <div className="mb-6 flex items-center gap-2 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                    <ShieldCheck className="text-blue-600 shrink-0" size={18} />
                    <p className="text-[10px] font-bold text-blue-800 leading-tight">
                        This application is restricted to employees with a verified 
                        <span className="block font-black text-blue-900">{ALLOWED_DOMAINS.map(d => '@' + d).join(', ')} email address.</span>
                    </p>
                </div>

                <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Work Email</label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-3 text-slate-300" size={18} />
                        <input
                        type="email"
                        required
                        className="w-full border border-slate-200 bg-slate-50 rounded-xl px-10 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-slate-700"
                        placeholder="john.doe@company.com"
                        value={email}
                        onChange={(e) => {
                            setEmail(e.target.value);
                            setError('');
                        }}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Password</label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-3 text-slate-300" size={18} />
                        <input
                        type="password"
                        required
                        className="w-full border border-slate-200 bg-slate-50 rounded-xl px-10 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => {
                            setPassword(e.target.value);
                            setError('');
                        }}
                        />
                    </div>
                </div>
                
                {error && (
                    <div className="bg-red-50 text-red-700 text-[11px] p-3 rounded-xl border border-red-100 flex items-start gap-2 font-bold animate-in fade-in slide-in-from-top-2">
                        <AlertCircle className="shrink-0" size={14} />
                        <span>{error}</span>
                    </div>
                )}
                
                <button
                    type="submit"
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-4 rounded-xl transition-all shadow-xl active:scale-[0.98] uppercase tracking-widest text-xs"
                >
                    Authenticate Identity
                </button>
                </form>
                
                <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Authorized Personnel Audit Required</p>
                    <p className="text-[10px] text-slate-300 mt-2 italic leading-relaxed">
                        Access is monitored. Unauthorized attempts are logged via IP and reported to Information Security.
                    </p>
                </div>
            </>
        ) : (
            <>
                <button 
                    onClick={() => {
                        setStep('login');
                        setError('');
                        setVerificationCode('');
                    }}
                    className="flex items-center gap-1 text-slate-400 hover:text-slate-600 mb-6 text-xs font-bold uppercase tracking-wider"
                >
                    <ArrowLeft size={14} /> Cancel Verification
                </button>

                <h2 className="text-lg font-black text-slate-800 mb-2">Multi-Factor Challenge</h2>
                <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                    A secure 6-digit code has been dispatched to:<br/>
                    <span className="font-black text-blue-600">{tempUser?.email}</span>
                </p>
                
                {/* Simulated Email Notification */}
                {sentCode && (
                    <div className="mb-6 bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-3 border-dashed">
                        <div className="text-amber-600 mt-0.5"><Mail size={18} /></div>
                        <div>
                            <h4 className="text-[10px] font-black text-amber-800 uppercase tracking-widest">Email Simulator (Demo Mode)</h4>
                            <p className="text-xs text-amber-700 mt-1">
                                <span className="block mt-1">Security code: <span className="font-mono font-black text-lg bg-white px-2 py-0.5 rounded border border-amber-200 ml-1 select-all">{sentCode}</span></span>
                            </p>
                        </div>
                    </div>
                )}
                
                <form onSubmit={handleVerifySubmit} className="space-y-6">
                <div>
                    <input
                    type="text"
                    required
                    maxLength={6}
                    className="w-full border-2 border-slate-200 bg-slate-50 rounded-xl px-4 py-4 outline-none focus:ring-2 focus:ring-blue-500 transition-shadow text-center text-3xl tracking-[0.5em] font-mono font-black text-slate-800"
                    placeholder="000000"
                    value={verificationCode}
                    onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '');
                        setVerificationCode(val);
                        setError('');
                    }}
                    />
                </div>
                
                {error && (
                    <div className="bg-red-50 text-red-700 text-xs p-3 rounded-xl border border-red-100 font-bold flex items-center gap-2">
                         <AlertCircle size={14} /> {error}
                    </div>
                )}
                
                <button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl transition-all shadow-xl shadow-blue-500/20 uppercase tracking-widest text-xs"
                >
                    Verify & Proceed
                </button>
                </form>

                <div className="mt-6 text-center">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                        Wait 60 seconds to{' '}
                        <button onClick={handleResendCode} className="text-blue-600 hover:underline">
                            Request New Code
                        </button>
                    </p>
                </div>
            </>
        )}
        </div>
      </div>
    </div>
  );
};

export default Login;
