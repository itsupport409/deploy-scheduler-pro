import React, { useState } from 'react';
import { User, Location, Role } from '../types';
import { MapPin, Pencil, X, Check } from 'lucide-react';

interface StaffDirectoryProps {
  users: User[];
  locations: Location[];
  currentUser: User;
  onUpdateUser: (userId: string, eligibleLocationIds: string[]) => void;
  onEditUser: (userId: string, updates: { name: string; email: string; role: Role }) => void;
}

const StaffDirectory: React.FC<StaffDirectoryProps> = ({ users, locations, currentUser, onUpdateUser, onEditUser }) => {
  const isManager = currentUser.role === Role.ADMIN || currentUser.role === Role.GM || currentUser.role === Role.BOM;

  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', role: Role.Technician });
  const [editError, setEditError] = useState('');

  const openEdit = (user: User) => {
    setEditForm({ name: user.name, email: user.email, role: user.role });
    setEditError('');
    setEditingUser(user);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = editForm.name.trim();
    const email = editForm.email.trim().toLowerCase();
    if (!name) { setEditError('Name is required.'); return; }
    if (!email || !email.includes('@')) { setEditError('A valid email is required.'); return; }
    const duplicate = users.find(u => u.id !== editingUser!.id && u.email.trim().toLowerCase() === email);
    if (duplicate) { setEditError(`Another user already uses ${email}.`); return; }
    onEditUser(editingUser!.id, { name, email, role: editForm.role });
    setEditingUser(null);
  };

  const toggleLocation = (user: User, locId: string) => {
    const current = user.eligibleLocationIds || [];
    const newLocs = current.includes(locId)
      ? current.filter(id => id !== locId)
      : [...current, locId];
    onUpdateUser(user.id, newLocs);
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-slate-800 mb-6">Staff Directory</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {users.map(u => (
          <div key={u.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col gap-4">
             {/* Header */}
             <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xl shrink-0">
                    {u.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-slate-800 truncate">{u.name}</h3>
                    <p className="text-sm text-slate-500">{u.role}</p>
                    <p className="text-xs text-blue-600 mt-1 truncate">{u.email}</p>
                </div>
                {isManager && (
                    <button
                        onClick={() => openEdit(u)}
                        className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 p-2 rounded-full transition-colors shrink-0"
                        title={`Edit ${u.name}`}
                    >
                        <Pencil size={16} />
                    </button>
                )}
             </div>

             {/* Locations */}
             {isManager && (
               <div className="pt-4 border-t border-slate-100">
                 <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide flex items-center gap-1">
                   <MapPin size={12} /> Eligible Locations
                 </p>
                 <div className="space-y-2">
                   {locations.map(loc => (
                     <label key={loc.id} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                       <input
                         type="checkbox"
                         checked={u.eligibleLocationIds?.includes(loc.id)}
                         onChange={() => toggleLocation(u, loc.id)}
                         className="rounded text-blue-600 focus:ring-blue-500"
                       />
                       {loc.name}
                     </label>
                   ))}
                 </div>
               </div>
             )}
          </div>
        ))}
      </div>

      {/* Edit staff modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4" onClick={() => setEditingUser(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Edit Staff Member</h3>
                <p className="text-xs text-slate-500">{editingUser.name}</p>
              </div>
              <button onClick={() => setEditingUser(null)} className="p-2 hover:bg-white rounded-full transition-colors text-slate-400"><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Full Name</label>
                <input type="text" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Email</label>
                <input type="email" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Role</label>
                <select className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" value={editForm.role} onChange={e => setEditForm({ ...editForm, role: e.target.value as Role })}>
                  {Object.values(Role).map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              {editError && <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded">{editError}</div>}
              <p className="text-[10px] text-slate-400 italic">Note: changing the email here updates the staff roster only. The sign-in email in Firebase Auth is managed separately.</p>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditingUser(null)} className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all">Cancel</button>
                <button type="submit" className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2"><Check size={18} /> Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffDirectory;
