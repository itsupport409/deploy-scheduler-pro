import React, { useState, useEffect, useMemo } from 'react';
import { User, Location, Role, Shift, ChangeRequest, AppState, Notification, RequestType, ScheduleTemplate } from '../types';
import { Plus, Trash2, MapPin, UserPlus, FileUp, Download, AlertCircle, CheckCircle, Key, X, Info, Database, Save, UploadCloud, ShieldAlert, Cpu, CheckSquare, Search, RotateCcw, Calendar, History, ArrowRight, Clock } from 'lucide-react';

interface AdminPanelProps {
  users: User[];
  deletedUsers: User[];
  locations: Location[];
  shifts: Shift[];
  templates: ScheduleTemplate[];
  requests: ChangeRequest[];
  notifications: Notification[];
  onAddUser: (user: Partial<User>) => void;
  onRemoveUser: (id: string) => void;
  onRestoreUser: (id: string) => void;
  onAddLocation: (name: string, calendarId: string) => void;
  onRemoveLocation: (id: string) => void;
  onImportUsers: (users: Partial<User>[]) => void;
  onResetPassword: (userId: string, newPassword: string) => void;
  onRestoreState: (state: AppState) => void;
  currentUser: User;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ 
    users, deletedUsers, locations, shifts, templates, requests, 
    notifications,
    onAddUser, onRemoveUser, onRestoreUser, onAddLocation, onRemoveLocation, 
    onImportUsers, onResetPassword, onRestoreState, currentUser 
}) => {
  const [newLocName, setNewLocName] = useState('');
  const [newLocCalId, setNewLocCalId] = useState('');
  const [importStatus, setImportStatus] = useState<{type: 'success' | 'error', msg: string} | null>(null);
  const [storageSize, setStorageSize] = useState<string>('0 KB');
  const [formError, setFormError] = useState<string | null>(null);
  const [newUser, setNewUser] = useState({ name: '', email: '', role: Role.Technician, password: 'password123' });
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const data = localStorage.getItem('shop_scheduler_pro_v2_7_templates');
    if (data) {
        const size = (new TextEncoder().encode(data).length / 1024).toFixed(2);
        setStorageSize(`${size} KB`);
    }
  }, [users, locations, shifts, requests, notifications, deletedUsers]);

  const historicalRequests = useMemo(() => {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 160);
      return requests
          .filter(r => r.type === RequestType.TIME_OFF || r.type === RequestType.CALLED_OUT)
          .filter(r => new Date(r.targetDate) >= cutoff)
          .sort((a, b) => new Date(b.targetDate).getTime() - new Date(a.targetDate).getTime());
  }, [requests]);

  const handleAddUser = (e: React.FormEvent) => {
      e.preventDefault();
      setFormError(null);
      const cleanEmail = newUser.email.trim().toLowerCase();
      if (!newUser.name.trim()) { setFormError("Missing Staff Name."); return; }
      if (!cleanEmail || !cleanEmail.includes('@')) { setFormError("Missing or Invalid Email."); return; }
      const exists = users.find(u => u.email.trim().toLowerCase() === cleanEmail);
      if (exists) { setFormError(`CONFLICT: User with email ${cleanEmail} already exists.`); return; }
      onAddUser({ ...newUser, email: cleanEmail });
      setNewUser({ name: '', email: '', role: Role.Technician, password: 'password123' });
      setImportStatus({ type: 'success', msg: `COMMITTED added to registry.` });
  };

  const handleExportFullData = () => {
    const fullState: AppState = { users, deletedUsers, locations, shifts, templates, requests, notifications, currentUser };
    const blob = new Blob([JSON.stringify(fullState, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `verified_backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFullData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const imported = JSON.parse(e.target?.result as string);
            if (imported.users && Array.isArray(imported.users)) {
                onRestoreState(imported);
                setImportStatus({ type: 'success', msg: 'Full Database Restore Completed.' });
            } else {
                setImportStatus({ type: 'error', msg: 'Invalid backup format.' });
            }
        } catch (err) { alert("Format Error."); }
    };
    reader.readAsText(file);
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">Verified System Administration</h2>
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-green-50 text-green-700 px-3 py-1.5 rounded-full border border-green-100 text-[10px] font-bold shadow-sm">
                <CheckCircle size={14} /> PERSISTENCE ENGINE v2.8 ({storageSize})
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><UserPlus className="text-green-500" size={20}/> Verified Staff Entry</h3>
              <form onSubmit={handleAddUser} className="space-y-4 mb-6">
                  <input type="text" placeholder="Full Name" className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500" value={newUser.name} onChange={(e) => setNewUser({...newUser, name: e.target.value})} />
                  <input type="email" placeholder="Staff Email" className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500" value={newUser.email} onChange={(e) => setNewUser({...newUser, email: e.target.value})} />
                  <select className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500" value={newUser.role} onChange={(e) => setNewUser({...newUser, role: e.target.value as Role})}>{Object.values(Role).map(r => <option key={r} value={r}>{r}</option>)}</select>
                  {formError && <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded flex items-center gap-2"><AlertCircle size={14}/> {formError}</div>}
                  <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg text-sm font-bold shadow-md transition-all active:scale-[0.98]">Create User</button>
              </form>
              <div className="border-t border-slate-100 pt-6 mt-6">
                  <div className="flex justify-between items-center mb-4"><h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1"><Trash2 size={10}/> Staff Archive</h4><span className="text-[9px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 font-mono font-bold">RECOVERABLE: {deletedUsers.length}</span></div>
                  {deletedUsers.length === 0 ? (<p className="text-xs text-slate-400 italic">No deleted users.</p>) : (
                    <div className="space-y-2 max-h-32 overflow-y-auto pr-1">{deletedUsers.map(u => (
                            <div key={u.id} className="flex justify-between items-center p-2 bg-slate-50 border border-slate-200 rounded text-xs"><div><span className="font-bold text-slate-700">{u.name}</span><span className="text-slate-400 text-[10px] block">{u.email}</span></div><button onClick={() => onRestoreUser(u.id)} className="flex items-center gap-1 text-blue-600 font-bold hover:bg-blue-50 px-2 py-1 rounded"><RotateCcw size={12}/> Restore</button></div>
                    ))}</div>
                  )}
              </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <div className="flex justify-between items-center mb-4"><h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Search className="text-blue-500" size={20}/> Registry Audit</h3><span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-1 rounded-full">ACTIVE: {users.length}</span></div>
              <input type="text" placeholder="Filter active staff..." className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300 mb-4" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              <div className="max-h-96 overflow-y-auto space-y-1 pr-1 custom-scrollbar">{filteredUsers.slice().reverse().map(u => (
                      <div key={u.id} className="flex justify-between items-center p-3 hover:bg-slate-50 rounded-lg border border-transparent hover:border-slate-100 transition-all"><div className="min-w-0"><span className="font-bold text-slate-800 block">{u.name}</span><span className="text-slate-400 text-[10px] block">{u.email} • {u.role}</span></div><button onClick={() => { if(confirm(`Archive ${u.name}?`)) onRemoveUser(u.id); }} className="text-red-400 p-2 hover:bg-red-50 rounded-full transition-colors ml-2"><Trash2 size={16}/></button></div>
                  ))}</div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 lg:col-span-2">
              <div className="flex justify-between items-center mb-6">
                <div><h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><History className="text-indigo-500" size={20}/> 160-Day Request Audit</h3><p className="text-xs text-slate-500 mt-1">Absence and modification logs.</p></div>
                <div className="flex items-center gap-2 text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full font-bold text-xs border border-indigo-100"><History size={14}/> {historicalRequests.length} HISTORICAL LOGS</div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead><tr className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-widest font-bold"><th className="px-4 py-3 rounded-l-lg">Date Logged</th><th className="px-4 py-3">Staff Member</th><th className="px-4 py-3">Target Date(s) & Time</th><th className="px-4 py-3">Type/Pay</th><th className="px-4 py-3 rounded-r-lg">Status</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">
                        {historicalRequests.length === 0 ? (<tr><td colSpan={5} className="text-center py-12 text-slate-400 italic">No historical requests found.</td></tr>) : (
                            historicalRequests.map(req => {
                                const requester = users.find(u => u.id === req.requesterId) || deletedUsers.find(u => u.id === req.requesterId);
                                return (
                                    <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-4 py-4 text-slate-400 font-mono text-xs">{new Date(req.createdAt).toLocaleDateString()}</td>
                                        <td className="px-4 py-4"><span className="font-bold text-slate-800">{requester?.name || 'Unknown'}</span><span className="block text-[10px] text-slate-400">{requester?.role}</span></td>
                                        <td className="px-4 py-4">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2">
                                                    <Calendar size={12} className="text-slate-400"/>
                                                    <span className="font-medium">{new Date(req.targetDate).toLocaleDateString()}</span>
                                                    {req.endDate && (<><ArrowRight size={10} className="text-slate-300"/><span className="font-medium">{new Date(req.endDate).toLocaleDateString()}</span></>)}
                                                </div>
                                                {(req.inTime || req.outTime) && (
                                                    <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold ml-5">
                                                        <Clock size={10} /> {req.inTime || '--'} {req.outTime ? ` - ${req.outTime}` : ''}
                                                    </div>
                                                )}
                                                <div className="text-[9px] text-slate-400 font-bold ml-5 mt-0.5">
                                                    <span className="text-slate-300 uppercase tracking-tighter">Requested:</span> {new Date(req.createdAt).toLocaleDateString()}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4"><div className="flex flex-col gap-1"><span className="text-[10px] font-black uppercase text-slate-500">{req.type}</span><span className={`text-[9px] px-1.5 py-0.5 rounded-full border w-fit ${req.payType === 'Paid' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>{req.payType || 'N/A'}</span></div></td>
                                        <td className="px-4 py-4"><span className={`px-2 py-1 rounded text-[10px] font-bold ${req.status === 'Approved' ? 'bg-green-100 text-green-700' : req.status === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{req.status.toUpperCase()}</span></td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
              </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 lg:col-span-2">
              <div className="flex justify-between items-start mb-6"><div><h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Database className="text-indigo-500" size={20}/> System Persistence</h3><p className="text-xs text-slate-500 mt-1">State and backup recovery.</p></div><div className="bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-mono tracking-tighter border border-blue-500/30">v2.8_CALLOUTS</div></div>
              <div className="flex flex-wrap gap-4"><button onClick={handleExportFullData} className="flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl text-sm font-bold shadow-lg transition-transform active:scale-95"><Save size={18} /> Export Full Backup</button><label className="flex items-center gap-2 px-5 py-3 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl text-sm font-bold cursor-pointer transition-transform active:scale-95"><UploadCloud size={18} /> Import Database<input type="file" accept=".json" onChange={handleImportFullData} className="hidden" /></label><button onClick={() => { if(confirm("FINAL WARNING?")) { localStorage.clear(); window.location.reload(); } }} className="flex items-center gap-2 px-5 py-3 text-red-600 hover:bg-red-50 rounded-xl text-sm font-bold ml-auto transition-colors"><ShieldAlert size={18} /> Format System</button></div>
          </div>
      </div>
    </div>
  );
};

export default AdminPanel;