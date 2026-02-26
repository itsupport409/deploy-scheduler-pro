import React from 'react';
import { User, Role } from '../types';
import { BookOpen, Calendar, ShieldCheck, Users, Zap, Settings } from 'lucide-react';

interface OrientationProps {
  currentUser: User;
}

const Orientation: React.FC<OrientationProps> = ({ currentUser }) => {
  const isManager = [Role.GM, Role.BOM, Role.ShopManager, Role.ADMIN].includes(currentUser.role);
  const isAdmin = currentUser.role === Role.ADMIN;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-bold text-slate-800 mb-2">Welcome to Shop Scheduler Pro, {currentUser.name.split(' ')[0]}!</h2>
        <p className="text-slate-600">Here is your quick guide to maximizing the app for your role as <span className="font-semibold text-blue-600">{currentUser.role}</span>.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Universal Guide */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-4">
                <div className="bg-blue-100 p-2 rounded-lg text-blue-600"><Calendar size={24}/></div>
                <h3 className="text-xl font-bold text-slate-800">Viewing Schedules</h3>
            </div>
            <p className="text-slate-600 mb-4 text-sm">
                Navigate to the <strong>Schedule</strong> tab to view your upcoming shifts. 
                Use the location dropdown to switch between different shop schedules. 
                You can see who else is working with you on any given day.
            </p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-4">
                <div className="bg-green-100 p-2 rounded-lg text-green-600"><BookOpen size={24}/></div>
                <h3 className="text-xl font-bold text-slate-800">Requesting Changes</h3>
            </div>
            <p className="text-slate-600 mb-4 text-sm">
                Need time off or a shift swap? Go to the <strong>Requests</strong> tab. 
                <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li><strong>Time Off:</strong> Submit 30 days in advance (90 days for Summer).</li>
                    <li><strong>Approvals:</strong> You will receive notifications via Slack/Email when managers approve your request.</li>
                </ul>
            </p>
        </div>

        {/* Manager/Admin Specific */}
        {isManager && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 md:col-span-2 bg-gradient-to-r from-slate-50 to-white">
                <div className="flex items-center gap-3 mb-4">
                    <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600"><ShieldCheck size={24}/></div>
                    <h3 className="text-xl font-bold text-slate-800">Management Controls</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     <div>
                        <h4 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                             <Zap size={16} className="text-yellow-500"/> AI Auto-Scheduling
                        </h4>
                        <p className="text-xs text-slate-600">
                            In the Schedule view, use the "Auto-Fill" button to let Gemini AI draft a schedule based on staff roles and availability rules.
                        </p>
                     </div>
                     <div>
                        <h4 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                             <Users size={16} className="text-blue-500"/> Staff Management
                        </h4>
                        <p className="text-xs text-slate-600">
                            In the Staff directory, assign employees to specific locations to ensure they only appear in schedules where they are eligible to work.
                        </p>
                     </div>
                     <div>
                        <h4 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                             <BookOpen size={16} className="text-green-500"/> Approvals
                        </h4>
                        <p className="text-xs text-slate-600">
                            Review pending requests in the Requests tab. Approved changes automatically update the master schedule and notify the employee.
                        </p>
                     </div>
                </div>
            </div>
        )}

        {/* Admin Specific */}
        {isAdmin && (
             <div className="bg-white p-6 rounded-xl shadow-sm border border-red-100 md:col-span-2">
                <div className="flex items-center gap-3 mb-4">
                    <div className="bg-red-100 p-2 rounded-lg text-red-600"><Settings size={24}/></div>
                    <h3 className="text-xl font-bold text-slate-800">Administrator Privileges</h3>
                </div>
                <p className="text-slate-600 text-sm mb-4">
                    You have access to the <strong>Admin Panel</strong>.
                </p>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-slate-700">
                    <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-red-400 rounded-full"></div>Add new shop locations.</li>
                    <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-red-400 rounded-full"></div>Create new user accounts.</li>
                    <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-red-400 rounded-full"></div>Assign system roles and permissions.</li>
                    <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-red-400 rounded-full"></div>Manage global calendar settings.</li>
                </ul>
            </div>
        )}

      </div>
    </div>
  );
};

export default Orientation;