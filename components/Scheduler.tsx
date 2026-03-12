import React, { useState, useEffect } from 'react';
import { Shift, User, Location, Role, ScheduleTemplate, TemplateShift, ChangeRequest, RequestStatus, RequestType } from '../types';
import { Calendar as CalendarIcon, MapPin, Plus, Lock, Printer, Share2, Clock, X, Trash2, Check, LayoutGrid, Save, ChevronDown, Sun, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';

interface SchedulerProps {
  shifts: Shift[];
  users: User[];
  locations: Location[];
  templates: ScheduleTemplate[];
  requests: ChangeRequest[];
  onAddShifts: (shifts: Partial<Shift>[]) => void;
  onUpdateShift: (shift: Shift) => void;
  onRemoveShift: (id: string) => void;
  onSaveTemplate: (template: Partial<ScheduleTemplate>) => void;
  onApplyTemplate: (locationId: string, weekStart: Date, template: ScheduleTemplate) => void;
  onRemoveTemplate: (id: string) => void;
  onAddLocation: (name: string, calendarId: string) => string;
  currentUser: User;
}

const Scheduler: React.FC<SchedulerProps> = ({ 
  shifts, 
  users, 
  locations, 
  templates,
  requests,
  onAddShifts, 
  onUpdateShift,
  onRemoveShift,
  onSaveTemplate,
  onApplyTemplate,
  onRemoveTemplate,
  onAddLocation,
  currentUser 
}) => {
  const [selectedLocation, setSelectedLocation] = useState<string>(locations[0]?.id || '');
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);
  const [showAddLocationModal, setShowAddLocationModal] = useState(false);
  const [newLocName, setNewLocName] = useState('');
  const [newLocCalendarId, setNewLocCalendarId] = useState('');
  const [addLocError, setAddLocError] = useState<string | null>(null);

  // Keep selectedLocation valid when locations change (e.g. load from API)
  useEffect(() => {
    const currentExists = locations.some(l => l.id === selectedLocation);
    if (!currentExists && locations.length > 0) setSelectedLocation(locations[0].id);
    if (locations.length > 0 && !selectedLocation) setSelectedLocation(locations[0].id);
  }, [locations, selectedLocation]);
  
  // Week navigation state
  const [weekStart, setWeekStart] = useState(() => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday as start of week
    const monday = new Date(now.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  });

  const [configModal, setConfigModal] = useState<{ 
    open: boolean; 
    shift?: Shift; 
    userId?: string; 
    date?: Date 
  }>({ open: false });

  // Generate the 7 days for the current viewed week
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  const weekEnd = new Date(weekDays[6]);
  weekEnd.setHours(23, 59, 59, 999);

  const goToPreviousWeek = () => {
    const newDate = new Date(weekStart);
    newDate.setDate(newDate.getDate() - 7);
    setWeekStart(newDate);
  };

  const goToNextWeek = () => {
    const newDate = new Date(weekStart);
    newDate.setDate(newDate.getDate() + 7);
    setWeekStart(newDate);
  };

  const goToToday = () => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    setWeekStart(monday);
  };

  const formatDateRange = () => {
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    const endOptions: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
    return `${weekDays[0].toLocaleDateString('en-US', options)} – ${weekDays[6].toLocaleDateString('en-US', endOptions)}`;
  };

  const handlePrint = () => {
      window.print();
  };

  const formatTimeDisplay = (iso: string) => {
      return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const calculateShiftHours = (start: string, end: string) => {
    const s = new Date(start);
    const e = new Date(end);
    return Math.abs(e.getTime() - s.getTime()) / 36e5;
  };

  const handleCopyForSlack = () => {
      const locationName = locations.find(l => l.id === selectedLocation)?.name || 'Unknown Location';
      let summary = `📅 *Schedule for ${locationName}*\n_Week of ${weekStart.toLocaleDateString()}_\n`;
      
      weekDays.forEach(day => {
        summary += `\n*${day.toLocaleDateString('en-US', { weekday: 'long', month: 'numeric', day: 'numeric' })}*\n`;
        const dayShifts = shifts.filter(s => {
             const sDate = new Date(s.start);
             return s.locationId === selectedLocation && sDate.toDateString() === day.toDateString();
        });
        
        if (dayShifts.length === 0) {
            summary += "_No shifts scheduled_\n";
        } else {
            dayShifts.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
            dayShifts.forEach(s => {
                const u = users.find(u => u.id === s.userId);
                summary += `• ${u?.name} (${u?.role}): ${formatTimeDisplay(s.start)} - ${formatTimeDisplay(s.end)}\n`;
            });
        }
    });

    navigator.clipboard.writeText(summary).then(() => {
        alert("Schedule copied to clipboard!");
    }).catch(err => {
        console.error('Failed to copy text: ', err);
    });
  };

  const isManager = currentUser.role === Role.GM || currentUser.role === Role.BOM || currentUser.role === Role.ADMIN;

  const getShiftsForCell = (userId: string, date: Date) => {
    return shifts.filter(s => {
        const sDate = new Date(s.start);
        return s.userId === userId && 
               s.locationId === selectedLocation &&
               sDate.toDateString() === date.toDateString();
    });
  };

  const getRequestsForCell = (userId: string, date: Date) => {
    return requests.filter(r => {
        const rDate = new Date(r.targetDate);
        rDate.setHours(0,0,0,0);
        const rEnd = r.endDate ? new Date(r.endDate) : new Date(r.targetDate);
        rEnd.setHours(23,59,59,999);
        
        const cellDate = new Date(date);
        cellDate.setHours(12,0,0,0); // Mid-day check

        const isDateInRange = cellDate >= rDate && cellDate <= rEnd;
        
        // Show ALL requests for the row's user
        return r.requesterId === userId && isDateInRange;
    });
  };

  const getUserWeeklyHours = (userId: string) => {
      const startLimit = new Date(weekStart);
      const endLimit = new Date(weekEnd);
      
      return shifts
        .filter(s => s.userId === userId && s.locationId === selectedLocation)
        .filter(s => {
            const sDate = new Date(s.start);
            return sDate >= startLimit && sDate <= endLimit;
        })
        .reduce((sum, s) => sum + calculateShiftHours(s.start, s.end), 0);
  };

  const handleOpenConfig = (userId: string, date: Date, shift?: Shift) => {
    if (!isManager) return;
    setConfigModal({ open: true, userId, date, shift });
  };

  const handleSaveCurrentAsTemplate = () => {
      const templateName = prompt("Enter a name for this schedule template:");
      if (!templateName) return;

      const currentWeekShifts = shifts.filter(s => {
          const sDate = new Date(s.start);
          return s.locationId === selectedLocation && sDate >= weekStart && sDate <= weekEnd;
      });

      const templateShifts: TemplateShift[] = currentWeekShifts.map(s => {
          const sDate = new Date(s.start);
          const eDate = new Date(s.end);
          const diff = sDate.getTime() - weekStart.getTime();
          const dayOffset = Math.floor(diff / (24 * 60 * 60 * 1000));

          return {
              userId: s.userId,
              dayOffset,
              startTime: `${sDate.getHours().toString().padStart(2, '0')}:${sDate.getMinutes().toString().padStart(2, '0')}`,
              endTime: `${eDate.getHours().toString().padStart(2, '0')}:${eDate.getMinutes().toString().padStart(2, '0')}`,
              title: s.title
          };
      });

      onSaveTemplate({
          name: templateName,
          locationId: selectedLocation,
          shifts: templateShifts
      });
      alert(`Template "${templateName}" saved successfully.`);
      setShowTemplateMenu(false);
  };

  const ShiftConfigModal = () => {
    if (!configModal.open) return null;

    const user = users.find(u => u.id === configModal.userId || u.id === configModal.shift?.userId);
    const [title, setTitle] = useState(configModal.shift?.title || user?.role || 'Shift');
    
    const existingStart = configModal.shift ? new Date(configModal.shift.start) : null;
    const existingEnd = configModal.shift ? new Date(configModal.shift.end) : null;

    const [startTime, setStartTime] = useState(
        existingStart 
        ? `${existingStart.getHours().toString().padStart(2, '0')}:${existingStart.getMinutes().toString().padStart(2, '0')}` 
        : '09:00'
    );
    const [endTime, setEndTime] = useState(
        existingEnd 
        ? `${existingEnd.getHours().toString().padStart(2, '0')}:${existingEnd.getMinutes().toString().padStart(2, '0')}` 
        : '17:00'
    );

    const handleSave = () => {
        const baseDate = configModal.date || new Date(configModal.shift!.start);
        const [startH, startM] = startTime.split(':').map(Number);
        const [endH, endM] = endTime.split(':').map(Number);
        const start = new Date(baseDate);
        start.setHours(startH, startM, 0, 0);
        const end = new Date(baseDate);
        end.setHours(endH, endM, 0, 0);

        if (configModal.shift) {
            onUpdateShift({ ...configModal.shift, title, start: start.toISOString(), end: end.toISOString() });
        } else {
            onAddShifts([{ userId: configModal.userId!, locationId: selectedLocation, title, start: start.toISOString(), end: end.toISOString(), locked: false }]);
        }
        setConfigModal({ open: false });
    };

    const handleDelete = () => {
        if (configModal.shift) {
            if(confirm("Permanently delete this shift?")) {
                onRemoveShift(configModal.shift.id);
                setConfigModal({ open: false });
            }
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">Shift Configuration</h3>
                        <p className="text-xs text-slate-500">{user?.name} • {configModal.date?.toLocaleDateString() || new Date(configModal.shift!.start).toLocaleDateString()}</p>
                    </div>
                    <button onClick={() => setConfigModal({ open: false })} className="p-2 hover:bg-white rounded-full transition-colors text-slate-400">
                        <X size={20}/>
                    </button>
                </div>
                <div className="p-6 space-y-5">
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Shift Label</label>
                        <input type="text" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Morning Shift" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Start Time</label>
                            <input type="time" step="900" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">End Time</label>
                            <input type="time" step="900" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                        </div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-500">Duration</span>
                        <span className="text-sm font-bold text-slate-800">{(() => {
                            const [sH, sM] = startTime.split(':').map(Number);
                            const [eH, eM] = endTime.split(':').map(Number);
                            const duration = (eH + eM/60) - (sH + sM/60);
                            return Math.max(0, duration).toFixed(2);
                        })()} Hours</span>
                    </div>
                </div>
                <div className="p-6 bg-slate-50/50 flex gap-3">
                    {configModal.shift && (
                        <button onClick={handleDelete} className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors" title="Remove Shift"><Trash2 size={20}/></button>
                    )}
                    <button onClick={() => setConfigModal({ open: false })} className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all">Cancel</button>
                    <button onClick={handleSave} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2"><Check size={18}/>Save Shift</button>
                </div>
            </div>
        </div>
    );
  };

  const filteredTemplates = templates.filter(t => t.locationId === selectedLocation);

  return (
    <div className="p-6 space-y-6">
      <ShiftConfigModal />
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
        <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <CalendarIcon className="text-blue-600" /> Staff Schedule
            </h2>
            
            {/* WEEK PICKER */}
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-sm ml-4">
                <button onClick={goToPreviousWeek} className="p-2 hover:bg-slate-50 rounded-lg text-slate-500 transition-colors" title="Previous Week">
                    <ChevronLeft size={18} />
                </button>
                <button onClick={goToToday} className="px-3 py-1.5 hover:bg-slate-50 rounded-lg text-xs font-bold text-slate-600 transition-colors">
                    Today
                </button>
                <button onClick={goToNextWeek} className="p-2 hover:bg-slate-50 rounded-lg text-slate-500 transition-colors" title="Next Week">
                    <ChevronRight size={18} />
                </button>
                <div className="px-4 py-1.5 border-l border-slate-100 text-xs font-semibold text-slate-700 min-w-[160px] text-center">
                    {formatDateRange()}
                </div>
            </div>
        </div>
        
        <div className="flex items-center gap-3">
            <div className="flex items-center bg-white border border-slate-300 rounded-lg shadow-sm">
                <div className="flex items-center px-3 py-2 border-r border-slate-200">
                    <MapPin size={16} className="text-slate-400 mr-2" />
                    <select value={selectedLocation} onChange={(e) => setSelectedLocation(e.target.value)} className="bg-transparent outline-none text-sm font-medium text-slate-700 min-w-[180px]">
                        {locations.map(loc => (<option key={loc.id} value={loc.id}>{loc.name}</option>))}
                    </select>
                </div>
                <button type="button" onClick={() => { setShowAddLocationModal(true); setAddLocError(null); setNewLocName(''); setNewLocCalendarId(''); }} className="p-2 text-slate-500 hover:bg-slate-100 hover:text-indigo-600 rounded-r-lg transition-colors" title="Add location">
                    <Plus size={18} />
                </button>
            </div>

            {showAddLocationModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowAddLocationModal(false)}>
                    <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><MapPin size={20} className="text-indigo-500" /> Add location</h3>
                            <button type="button" onClick={() => setShowAddLocationModal(false)} className="text-slate-400 hover:text-slate-600 p-1"><X size={20} /></button>
                        </div>
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            setAddLocError(null);
                            const name = newLocName.trim();
                            const calendarId = newLocCalendarId.trim();
                            if (!name) { setAddLocError('Enter a location name.'); return; }
                            const newId = onAddLocation(name, calendarId || name.replace(/\s+/g, '_').toLowerCase() + '@group.calendar.google.com');
                            setSelectedLocation(newId);
                            setShowAddLocationModal(false);
                            setNewLocName('');
                            setNewLocCalendarId('');
                        }} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Location name</label>
                                <input type="text" value={newLocName} onChange={e => setNewLocName(e.target.value)} placeholder="e.g. North Branch" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" autoFocus />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Calendar ID (optional)</label>
                                <input type="text" value={newLocCalendarId} onChange={e => setNewLocCalendarId(e.target.value)} placeholder="e.g. mycal@group.calendar.google.com" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                            </div>
                            {addLocError && <p className="text-xs text-red-600 font-medium">{addLocError}</p>}
                            <div className="flex gap-2 pt-2">
                                <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-lg text-sm">Save</button>
                                <button type="button" onClick={() => setShowAddLocationModal(false)} className="px-4 py-2 border border-slate-200 text-slate-600 font-medium rounded-lg text-sm hover:bg-slate-50">Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isManager && (
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <button onClick={() => setShowTemplateMenu(!showTemplateMenu)} className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-bold transition-all border border-slate-200"><LayoutGrid size={16} /> Templates <ChevronDown size={14} /></button>
                        {showTemplateMenu && (
                            <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 p-2 animate-in fade-in slide-in-from-top-2">
                                <button onClick={handleSaveCurrentAsTemplate} className="w-full text-left p-3 hover:bg-indigo-50 rounded-lg flex items-center gap-2 transition-colors group"><Save size={16} className="text-indigo-600" /><span className="text-xs font-bold text-slate-700 group-hover:text-indigo-800">Save Week as Template</span></button>
                                <div className="my-2 border-t border-slate-100"></div>
                                <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Apply Template</div>
                                {filteredTemplates.length === 0 ? (<div className="px-3 py-4 text-center text-[10px] text-slate-400 italic">No saved templates.</div>) : (
                                    <div className="max-h-48 overflow-y-auto space-y-1">{filteredTemplates.map(t => (
                                        <div key={t.id} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg group">
                                            <button onClick={() => { if(confirm(`Apply template "${t.name}"?`)) { onApplyTemplate(selectedLocation, weekStart, t); setShowTemplateMenu(false); } }} className="flex-1 text-left text-xs font-medium text-slate-600 truncate mr-2">{t.name}</button>
                                            <button onClick={() => { if(confirm("Delete template?")) onRemoveTemplate(t.id); }} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={12} /></button>
                                        </div>
                                    ))}</div>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-1 border-l pl-3 border-slate-300 ml-1">
                        <button onClick={handlePrint} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"><Printer size={20} /></button>
                        <button onClick={handleCopyForSlack} className="p-2 text-slate-600 hover:bg-slate-100 hover:text-indigo-600 rounded-lg transition-colors"><Share2 size={20} /></button>
                    </div>
                </div>
            )}
        </div>
      </div>
      
      {/* GRID SECTION */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto print:shadow-none print:border-slate-900">
        <div className="min-w-[1000px]">
            <div className="grid grid-cols-9 divide-x divide-slate-200 border-b border-slate-200 bg-slate-50 print:bg-slate-100 print:divide-slate-400 print:border-slate-400">
                <div className="p-4 font-semibold text-slate-600 text-sm print:text-black">Employee</div>
                {weekDays.map((day, idx) => (
                    <div key={idx} className="p-4 text-center">
                        <div className="text-slate-900 font-medium text-sm print:text-black">{day.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                        <div className="text-slate-500 text-xs print:text-slate-700">{day.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })}</div>
                    </div>
                ))}
                <div className="p-4 font-semibold text-slate-600 text-sm text-center">Week Total</div>
            </div>

            <div className="divide-y divide-slate-200 print:divide-slate-400">
                {users.map(user => {
                    const weeklyHours = getUserWeeklyHours(user.id);
                    return (
                        <div key={user.id} className="grid grid-cols-9 divide-x divide-slate-200 group hover:bg-slate-50 transition-colors print:divide-slate-400">
                            <div className="p-4 flex flex-col justify-center print:border-r print:border-slate-400">
                                <span className="font-bold text-slate-800 text-sm print:text-black">{user.name}</span>
                                <span className="text-xs text-slate-500 truncate print:text-slate-700">{user.role}</span>
                            </div>
                            {weekDays.map((day, dayIdx) => {
                                const cellShifts = getShiftsForCell(user.id, day);
                                const cellRequests = getRequestsForCell(user.id, day);
                                return (
                                    <div key={dayIdx} className="p-2 min-h-[90px] relative print:border-r print:border-slate-400">
                                        {cellRequests.length > 0 && cellRequests.map(r => {
                                            let bgColor = 'bg-amber-50 border-amber-200 text-amber-700';
                                            let icon = <Sun size={10}/>;
                                            let statusTag = '';

                                            if (r.type === RequestType.CALLED_OUT) {
                                                bgColor = 'bg-red-50 border-red-200 text-red-700';
                                                icon = <AlertCircle size={10}/>;
                                            } else if (r.status === RequestStatus.PENDING) {
                                                bgColor = 'bg-slate-100 border-slate-300 text-slate-500 opacity-80';
                                                icon = <Clock size={10} className="animate-pulse" />;
                                                statusTag = '[PENDING]';
                                            } else if (r.status === RequestStatus.REJECTED) {
                                                bgColor = 'bg-gray-50 border-gray-200 text-gray-400 opacity-40 line-through';
                                                icon = <X size={10}/>;
                                                statusTag = '[REJECTED]';
                                            }

                                            return (
                                                <div key={r.id} className={`p-2 rounded-lg border border-dashed text-[11px] mb-1.5 flex flex-col gap-1 transition-all ${bgColor}`}>
                                                    <div className="font-black flex items-center gap-1">
                                                        {icon}
                                                        <span className="truncate">{r.type.toUpperCase()}</span>
                                                        {statusTag && <span className="ml-auto text-[8px] font-bold uppercase tracking-tighter">{statusTag}</span>}
                                                    </div>
                                                    {(r.inTime || r.outTime) && (
                                                        <div className="flex items-center gap-1 opacity-70">
                                                            <Clock size={10}/> {r.inTime || '--'} {r.outTime ? ` - ${r.outTime}` : ''}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                        {cellShifts.length > 0 ? (
                                            cellShifts.map(shift => (
                                                <div key={shift.id} onClick={() => handleOpenConfig(user.id, day, shift)} className="bg-blue-50 border border-blue-200 text-blue-800 rounded-lg p-2 text-[11px] mb-1.5 shadow-sm cursor-pointer hover:border-blue-400 hover:shadow-md transition-all print:bg-slate-100 print:border-slate-400 print:text-black print:shadow-none">
                                                    <div className="font-black flex justify-between items-center mb-1"><span className="truncate">{shift.title}</span>{shift.locked && <Lock size={10} className="text-blue-400 print:text-black"/>}</div>
                                                    <div className="text-blue-600 flex items-center gap-1 print:text-black font-medium opacity-80"><Clock size={10} /> {formatTimeDisplay(shift.start)} - {formatTimeDisplay(shift.end)}</div>
                                                </div>
                                            ))
                                        ) : (
                                            isManager && (
                                                <button onClick={() => handleOpenConfig(user.id, day)} className="w-full h-full flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-slate-100 rounded-lg transition-all print:hidden"><Plus size={16} className="text-slate-400" /></button>
                                            )
                                        )}
                                    </div>
                                );
                            })}
                            <div className="p-4 flex flex-col justify-center items-center bg-slate-50/50 group-hover:bg-slate-100/50">
                                <span className={`text-sm font-black ${weeklyHours > 40 ? 'text-orange-600' : 'text-slate-700'}`}>{weeklyHours.toFixed(2)}h</span>
                                <span className="text-[9px] text-slate-400 uppercase tracking-tighter font-black">Hours</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
      </div>
    </div>
  );
};

export default Scheduler;