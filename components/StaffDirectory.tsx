import React from 'react';
import { User, Location, Role } from '../types';
import { MapPin } from 'lucide-react';

interface StaffDirectoryProps {
  users: User[];
  locations: Location[];
  currentUser: User;
  onUpdateUser: (userId: string, eligibleLocationIds: string[]) => void;
}

const StaffDirectory: React.FC<StaffDirectoryProps> = ({ users, locations, currentUser, onUpdateUser }) => {
  const isManager = currentUser.role === Role.GM || currentUser.role === Role.BOM;

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
             <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xl shrink-0">
                    {u.name.charAt(0)}
                </div>
                <div>
                    <h3 className="font-bold text-slate-800">{u.name}</h3>
                    <p className="text-sm text-slate-500">{u.role}</p>
                    <p className="text-xs text-blue-600 mt-1">{u.email}</p>
                </div>
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
    </div>
  );
};

export default StaffDirectory;