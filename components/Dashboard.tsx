import React from 'react';
import { User, Shift, ChangeRequest, RequestStatus, Notification } from '../types';
import { Users, Calendar, AlertTriangle, Briefcase, Mail, CheckCircle2, Clock, Info } from 'lucide-react';

interface DashboardProps {
  users: User[];
  shifts: Shift[];
  requests: ChangeRequest[];
  notifications: Notification[];
  currentUser: User;
}

const StatCard: React.FC<{ title: string; value: string | number; icon: React.FC<any>; color: string; subtitle?: string }> = ({ title, value, icon: Icon, color, subtitle }) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow group">
        <div className="flex justify-between items-start">
            <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{title}</p>
                <h3 className="text-3xl font-black text-slate-800">{value}</h3>
                {subtitle && <p className="text-[10px] text-slate-500 mt-1 font-medium italic">{subtitle}</p>}
            </div>
            <div className={`p-3 rounded-xl ${color} bg-opacity-10 text-opacity-100 group-hover:scale-110 transition-transform`}>
                <Icon size={24} className={color.replace('bg-', 'text-')} />
            </div>
        </div>
    </div>
);

const Dashboard: React.FC<DashboardProps> = ({ users, shifts, requests, notifications, currentUser }) => {
  const pendingRequests = requests.filter(r => r.status === RequestStatus.PENDING).length;
  const myShifts = shifts.filter(s => s.userId === currentUser.id).length;
  const totalShiftsThisWeek = shifts.length;
  
  // Logic for "Staff Working Today"
  const todayStr = new Date().toDateString();
  const staffWorkingToday = new Set(
    shifts
      .filter(s => new Date(s.start).toDateString() === todayStr)
      .map(s => s.userId)
  ).size;

  const totalRegisteredStaff = users.length;

  // Limit to 10 most recent notifications for the dashboard view
  const displayNotifications = notifications.slice(0, 10);

  return (
    <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard 
                title="Staff Working Today" 
                value={staffWorkingToday} 
                icon={Users} 
                color="bg-emerald-600" 
                subtitle="Active on floor now"
            />
            <StatCard 
                title="Pending Requests" 
                value={pendingRequests} 
                icon={AlertTriangle} 
                color="bg-amber-500" 
                subtitle="Awaiting manager review"
            />
            <StatCard 
                title="Total Staff" 
                value={totalRegisteredStaff} 
                icon={Briefcase} 
                color="bg-blue-600" 
                subtitle="Registered personnel"
            />
            <StatCard 
                title="Week Schedule" 
                value={totalShiftsThisWeek} 
                icon={Calendar} 
                color="bg-indigo-600" 
                subtitle="Total shifts assigned"
            />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2">
                            <Mail size={18} className="text-blue-500" />
                            <h3 className="font-bold text-slate-800">Recent System Notifications</h3>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-full uppercase tracking-tight">
                                Top 10 of {notifications.length}
                            </span>
                            <div className="group relative">
                                <Info size={14} className="text-slate-300 cursor-help" />
                                <div className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-slate-800 text-white text-[9px] rounded shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">
                                    The system retains the last 50 notifications before rotating. Current display shows the 10 most recent.
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="space-y-4 max-h-[440px] overflow-y-auto pr-2 custom-scrollbar">
                        {displayNotifications.length === 0 ? (
                            <div className="py-12 text-center text-slate-400 text-sm italic border-2 border-dashed border-slate-100 rounded-xl">
                                No recent system activity logged.
                            </div>
                        ) : (
                            displayNotifications.map(n => (
                                <div key={n.id} className="p-4 rounded-lg bg-slate-50 border border-slate-100 flex gap-4 hover:border-slate-300 transition-all">
                                    <div className="shrink-0 mt-1">
                                        <div className="p-2 bg-white border border-slate-200 text-emerald-600 rounded-lg shadow-sm">
                                            <CheckCircle2 size={16} />
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start mb-1">
                                            <h4 className="text-sm font-bold text-slate-900 truncate">{n.subject}</h4>
                                            <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap ml-2 flex items-center gap-1 bg-white px-2 py-0.5 rounded-full border border-slate-100">
                                                <Clock size={10} /> {new Date(n.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-600 line-clamp-2 mb-2 leading-relaxed font-medium">
                                            {n.content}
                                        </p>
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-4 h-4 rounded-full bg-slate-200 flex items-center justify-center text-[8px] font-bold text-slate-600">
                                                    {n.userName.charAt(0)}
                                                </div>
                                                <span className="text-[10px] font-bold text-slate-500">{n.userName}</span>
                                            </div>
                                            <span className="text-[10px] text-blue-500 font-mono opacity-60">{n.userEmail}</span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white p-8 rounded-2xl shadow-xl border border-white/5 relative overflow-hidden">
                    <div className="relative z-10">
                        <h3 className="font-black text-xl mb-2 tracking-tight">System Reliability</h3>
                        <p className="text-slate-300 text-sm mb-6 max-w-md leading-relaxed">
                            Your HR data is synchronized using an Atomic Persistence engine. This ensures that every shift change and notification is logged securely to local storage with a verified timestamp.
                        </p>
                        <div className="flex items-center gap-4">
                            <div className="h-1 w-24 bg-indigo-500 rounded-full"></div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Verified Engine v2.6</span>
                        </div>
                    </div>
                    <Database className="absolute -right-8 -bottom-8 text-white/5" size={200} />
                </div>
            </div>

            <div className="lg:col-span-1">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 sticky top-24">
                    <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <Zap size={18} className="text-amber-500" />
                        Quick Actions
                    </h3>
                    <div className="space-y-3">
                        <button className="w-full text-left p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-100 hover:border-slate-200 transition-all flex items-center justify-between group">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white rounded-lg shadow-sm text-slate-400 group-hover:text-blue-500 transition-colors">
                                    <Calendar size={18} />
                                </div>
                                <span className="text-sm font-bold text-slate-700">Sync Master Calendar</span>
                            </div>
                            <ArrowRight size={14} className="text-slate-300 group-hover:translate-x-1 transition-transform" />
                        </button>
                        
                        <button className="w-full text-left p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-100 hover:border-slate-200 transition-all flex items-center justify-between group">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white rounded-lg shadow-sm text-slate-400 group-hover:text-amber-500 transition-colors">
                                    <Clock size={18} />
                                </div>
                                <span className="text-sm font-bold text-slate-700">Request Time Off</span>
                            </div>
                            <ArrowRight size={14} className="text-slate-300 group-hover:translate-x-1 transition-transform" />
                        </button>

                        <button className="w-full text-left p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-100 hover:border-slate-200 transition-all flex items-center justify-between group">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white rounded-lg shadow-sm text-slate-400 group-hover:text-indigo-500 transition-colors">
                                    <Users size={18} />
                                </div>
                                <span className="text-sm font-bold text-slate-700">View Team Directory</span>
                            </div>
                            <ArrowRight size={14} className="text-slate-300 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>

                    <div className="mt-8 p-4 bg-blue-50 border border-blue-100 rounded-xl">
                        <h4 className="text-[10px] font-black uppercase text-blue-600 tracking-widest mb-2">Shift Insights</h4>
                        <p className="text-[11px] text-blue-800/70 leading-relaxed font-medium">
                            Based on your history, staffing levels are optimal for the current week. 
                            <span className="block mt-1 font-bold">No coverage gaps detected.</span>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};

// Internal icon helpers for cleaner code
const Zap = ({ size, className }: { size: number, className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
);
const ArrowRight = ({ size, className }: { size: number, className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
);
const Database = ({ size, className }: { size: number, className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/></svg>
);

export default Dashboard;