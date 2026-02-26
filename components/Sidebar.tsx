import React from 'react';
import { Calendar, Users, ClipboardList, LayoutDashboard, Settings, HelpCircle } from 'lucide-react';
import { Role } from '../types';

interface SidebarProps {
  currentView: string;
  onChangeView: (view: string) => void;
  currentUserRole: Role;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, currentUserRole }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'schedule', label: 'Schedule', icon: Calendar },
    { id: 'requests', label: 'Requests', icon: ClipboardList },
    { id: 'staff', label: 'Staff', icon: Users },
  ];

  // Admin Panel available for Administrator and HR/BOM
  if (currentUserRole === Role.ADMIN || currentUserRole === Role.BOM) {
      menuItems.push({ id: 'admin', label: 'Admin Panel', icon: Settings });
  }

  menuItems.push({ id: 'help', label: 'Help & Guide', icon: HelpCircle });

  return (
    <div className="w-64 bg-slate-900 text-white h-screen fixed left-0 top-0 flex flex-col shadow-xl z-20 print:hidden">
      <div className="p-6 border-b border-slate-700">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
          Shop Scheduler Pro
        </h1>
        <p className="text-xs text-slate-400 mt-1">HR & Operations</p>
      </div>
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
            const Icon = item.icon;
            return (
                <button
                key={item.id}
                onClick={() => onChangeView(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    currentView === item.id
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
                >
                <Icon size={20} />
                <span className="font-medium">{item.label}</span>
                </button>
            );
        })}
      </nav>
      <div className="p-4 border-t border-slate-800">
        <div className="text-xs text-slate-500 text-center">
            v1.0.0 &copy; 2024
        </div>
      </div>
    </div>
  );
};

export default Sidebar;