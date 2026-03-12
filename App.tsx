
import React, { useState, useEffect, useRef } from 'react';
import { HashRouter } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Scheduler from './components/Scheduler';
import Requests from './components/Requests';
import Dashboard from './components/Dashboard';
import StaffDirectory from './components/StaffDirectory';
import Orientation from './components/Orientation';
import AdminPanel from './components/AdminPanel';
import Login from './components/Login';
import { Role, User, Location, Shift, AppState, RequestStatus, ChangeRequest, RequestType, Notification, ScheduleTemplate } from './types';

// SECURITY CONFIGURATION
export const ALLOWED_DOMAINS = ['icecoldair.com']; // Add your internal domains here

const AUTH_KEY = 'shop_scheduler_pro_auth_v2_8';
const CURRENT_USER_ID_KEY = 'shop_scheduler_pro_current_user_id_v2_8';

const API_BASE = '';

const generateId = () => Math.random().toString(36).substr(2, 9);

const DEFAULT_LOCATIONS: Location[] = [
    { id: '1', name: 'Downtown Service Center', calendarId: 'icecoldair_downtown@group.calendar.google.com' },
    { id: '2', name: 'Westside Rapid Repair', calendarId: 'icecoldair_westside@group.calendar.google.com' },
];

const DEFAULT_USERS: User[] = [
    { id: 'u0', name: 'A Butler', role: Role.ADMIN, email: 'abutler@icecoldair.com', password: 'password123', avatar: '', eligibleLocationIds: ['1', '2'] },
    { id: 'u1', name: 'Scott S', role: Role.GM, email: 'scotts@icecoldair.com', password: 'password123', avatar: '', eligibleLocationIds: ['1', '2'] },
    { id: 'u2', name: 'Business Office', role: Role.BOM, email: 'office@icecoldair.com', password: 'password123', avatar: '', eligibleLocationIds: ['1', '2'] },
];

const baseState: AppState = {
    users: DEFAULT_USERS,
    deletedUsers: [],
    locations: DEFAULT_LOCATIONS,
    shifts: [],
    templates: [],
    requests: [],
    notifications: [],
    currentUser: DEFAULT_USERS[0],
};

function resolveCurrentUser(users: User[]): User {
    const id = typeof localStorage !== 'undefined' ? localStorage.getItem(CURRENT_USER_ID_KEY) : null;
    const found = users.find(u => u.id === id);
    return found || users[0] || DEFAULT_USERS[0];
}

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
      return typeof localStorage !== 'undefined' && localStorage.getItem(AUTH_KEY) === 'true';
  });
  const [currentView, setCurrentView] = useState('dashboard');
  const [lastSaved, setLastSaved] = useState<number>(Date.now());
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [state, setState] = useState<AppState>(() => ({ ...baseState }));

  // Load state from SQLite API on mount
  useEffect(() => {
      let cancelled = false;
      fetch(`${API_BASE}/api/state`)
          .then(res => res.ok ? res.json() : Promise.reject(new Error('Not ok')))
          .then((data: Omit<AppState, 'currentUser'>) => {
              if (cancelled) return;
              const users = (data.users && data.users.length > 0) ? data.users : DEFAULT_USERS;
              const deletedUsers = Array.isArray(data.deletedUsers) ? data.deletedUsers : [];
              const templates = Array.isArray(data.templates) ? data.templates : [];
              setState({
                  users,
                  deletedUsers,
                  locations: data.locations?.length ? data.locations : DEFAULT_LOCATIONS,
                  shifts: data.shifts || [],
                  templates,
                  requests: data.requests || [],
                  notifications: data.notifications || [],
                  currentUser: resolveCurrentUser(users),
              });
          })
          .catch(() => {
              if (!cancelled) setState(prev => ({ ...prev }));
          })
          .finally(() => {
              if (!cancelled) setLoading(false);
          });
      return () => { cancelled = true; };
  }, []);

  // Persist state to SQLite API (debounced)
  useEffect(() => {
      if (loading) return;
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
          saveTimeoutRef.current = null;
          const { currentUser: _, ...payload } = state;
          setIsSaving(true);
          fetch(`${API_BASE}/api/state`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
          })
              .then(res => {
                  if (res.ok) setLastSaved(Date.now());
              })
              .catch(err => console.error('Sync Failed:', err))
              .finally(() => {
                  setTimeout(() => setIsSaving(false), 800);
              });
      }, 400);
      return () => {
          if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      };
  }, [state, loading]);

  useEffect(() => {
      if (typeof localStorage === 'undefined') return;
      localStorage.setItem(AUTH_KEY, isAuthenticated.toString());
  }, [isAuthenticated]);

  const handleLogin = (user: User) => {
      setState(prev => ({ ...prev, currentUser: user }));
      setIsAuthenticated(true);
      setCurrentView('dashboard');
      if (typeof localStorage !== 'undefined') {
          localStorage.setItem(AUTH_KEY, 'true');
          localStorage.setItem(CURRENT_USER_ID_KEY, user.id);
      }
  };

  const handleLogout = () => {
      setIsAuthenticated(false);
      if (typeof localStorage !== 'undefined') {
          localStorage.removeItem(AUTH_KEY);
          localStorage.removeItem(CURRENT_USER_ID_KEY);
      }
  };

  const handleAddShifts = (newShifts: Partial<Shift>[]) => {
      const fullShifts = newShifts.map(s => ({ ...s, id: generateId(), locked: false })) as Shift[];
      setState(prev => ({ ...prev, shifts: [...prev.shifts, ...fullShifts] }));
  };

  const handleUpdateShift = (updatedShift: Shift) => {
      setState(prev => ({
          ...prev,
          shifts: prev.shifts.map(s => s.id === updatedShift.id ? updatedShift : s)
      }));
  };

  const handleRemoveShift = (id: string) => {
      setState(prev => ({
          ...prev,
          shifts: prev.shifts.filter(s => s.id !== id)
      }));
  };

  const handleApplyTemplate = (locationId: string, weekStart: Date, template: ScheduleTemplate) => {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const filteredShifts = state.shifts.filter(s => {
          const sDate = new Date(s.start);
          return s.locationId !== locationId || sDate < weekStart || sDate >= weekEnd;
      });

      const templateShifts: Shift[] = template.shifts.map(ts => {
          const shiftDate = new Date(weekStart);
          shiftDate.setDate(shiftDate.getDate() + ts.dayOffset);
          
          const [startH, startM] = ts.startTime.split(':').map(Number);
          const [endH, endM] = ts.endTime.split(':').map(Number);

          const start = new Date(shiftDate);
          start.setHours(startH, startM, 0, 0);

          const end = new Date(shiftDate);
          end.setHours(endH, endM, 0, 0);

          return {
              id: generateId(),
              userId: ts.userId,
              locationId,
              title: ts.title,
              start: start.toISOString(),
              end: end.toISOString(),
              locked: false
          };
      });

      setState(prev => ({
          ...prev,
          shifts: [...filteredShifts, ...templateShifts]
      }));
  };

  const handleSaveTemplate = (template: Partial<ScheduleTemplate>) => {
      const newTemplate: ScheduleTemplate = {
          id: generateId(),
          name: template.name || 'Unnamed Template',
          locationId: template.locationId!,
          shifts: template.shifts || []
      };
      setState(prev => ({ ...prev, templates: [...prev.templates, newTemplate] }));
  };

  const handleRemoveTemplate = (id: string) => {
      setState(prev => ({ ...prev, templates: prev.templates.filter(t => t.id !== id) }));
  };

  const handleRequestUpdate = (id: string, status: RequestStatus) => {
      setState(prev => ({
          ...prev,
          requests: prev.requests.map(r => r.id === id ? { ...r, status } : r)
      }));
  };

  const handleAddNotification = (notif: Partial<Notification>) => {
      const newNotif: Notification = {
          id: generateId(),
          userId: notif.userId || '',
          userName: notif.userName || '',
          userEmail: notif.userEmail || '',
          subject: notif.subject || 'System Notification',
          content: notif.content || '',
          sentAt: new Date().toISOString(),
          type: notif.type || 'SYSTEM'
      };
      setState(prev => ({ ...prev, notifications: [newNotif, ...prev.notifications].slice(0, 50) }));
  };

  const handleRequestCreate = (req: Partial<ChangeRequest>) => {
      const newReq: ChangeRequest = {
          id: generateId(),
          requesterId: req.requesterId!,
          type: req.type as any,
          details: req.details || '',
          targetDate: req.targetDate!,
          endDate: req.endDate,
          inTime: req.inTime,
          outTime: req.outTime,
          timeBlock: req.timeBlock,
          payType: req.payType,
          status: RequestStatus.PENDING,
          createdAt: new Date().toISOString()
      };
      setState(prev => ({ ...prev, requests: [...prev.requests, newReq] }));
  };
  
  const handleUpdateUser = (userId: string, eligibleLocationIds: string[]) => {
      setState(prev => ({
          ...prev,
          users: prev.users.map(u => u.id === userId ? { ...u, eligibleLocationIds } : u)
      }));
  };

  const handleUpdatePassword = (userId: string, newPassword: string) => {
      setState(prev => ({
          ...prev,
          users: prev.users.map(u => u.id === userId ? { ...u, password: newPassword } : u),
          currentUser: prev.currentUser.id === userId ? { ...prev.currentUser, password: newPassword } : prev.currentUser
      }));
  };

  const handleAddUser = (user: Partial<User>) => {
      const newUser: User = {
          id: generateId(),
          name: user.name || 'Staff Member',
          email: user.email?.trim().toLowerCase() || '',
          role: user.role || Role.Technician,
          avatar: '',
          eligibleLocationIds: [],
          password: user.password || 'password123'
      };
      setState(prev => ({ ...prev, users: [...prev.users, newUser] }));
  };

  const handleRemoveUser = (id: string) => {
      setState(prev => {
          const userToRemove = prev.users.find(u => u.id === id);
          if (!userToRemove) return prev;
          
          return {
              ...prev,
              users: prev.users.filter(u => u.id !== id),
              deletedUsers: [userToRemove, ...(prev.deletedUsers || [])].slice(0, 50)
          };
      });
  };

  const handleRestoreUser = (id: string) => {
      setState(prev => {
          const userToRestore = (prev.deletedUsers || []).find(u => u.id === id);
          if (!userToRestore) return prev;

          return {
              ...prev,
              deletedUsers: (prev.deletedUsers || []).filter(u => u.id !== id),
              users: [...prev.users, userToRestore]
          };
      });
  };

  const handleAddLocation = (name: string, calendarId: string): string => {
      const newLoc: Location = { id: generateId(), name, calendarId };
      setState(prev => ({ ...prev, locations: [...prev.locations, newLoc] }));
      return newLoc.id;
  };

  const handleRemoveLocation = (id: string) => {
      setState(prev => ({ ...prev, locations: prev.locations.filter(l => l.id !== id) }));
  };

  const handleRestoreState = (newState: AppState) => {
      setState(newState);
      alert("System State Restored.");
  };

  const handleImportUsers = (newUsersData: Partial<User>[]) => {
      const newUsers: User[] = newUsersData.map(u => ({
          id: generateId(),
          name: u.name || 'Staff Member',
          email: u.email?.trim().toLowerCase() || '',
          role: u.role || Role.Technician,
          avatar: '',
          eligibleLocationIds: u.eligibleLocationIds || [],
          password: 'password123'
      }));
      setState(prev => ({ ...prev, users: [...prev.users, ...newUsers] }));
  };

  const renderContent = () => {
      switch (currentView) {
          case 'dashboard': return <Dashboard users={state.users} shifts={state.shifts} requests={state.requests} notifications={state.notifications} currentUser={state.currentUser} />;
          case 'schedule': return <Scheduler 
            shifts={state.shifts} 
            users={state.users} 
            locations={state.locations} 
            templates={state.templates}
            requests={state.requests}
            onAddShifts={handleAddShifts} 
            onUpdateShift={handleUpdateShift}
            onRemoveShift={handleRemoveShift}
            onSaveTemplate={handleSaveTemplate}
            onApplyTemplate={handleApplyTemplate}
            onRemoveTemplate={handleRemoveTemplate}
            onAddLocation={handleAddLocation}
            currentUser={state.currentUser} 
          />;
          case 'requests': return <Requests requests={state.requests} users={state.users} currentUser={state.currentUser} onUpdateRequest={handleRequestUpdate} onRequestCreate={handleRequestCreate} onSendNotification={handleAddNotification} />;
          case 'staff': return <StaffDirectory users={state.users} locations={state.locations} currentUser={state.currentUser} onUpdateUser={handleUpdateUser} />;
          case 'help': return <Orientation currentUser={state.currentUser} />;
          case 'admin': return <AdminPanel 
            users={state.users} 
            deletedUsers={state.deletedUsers || []}
            locations={state.locations} 
            shifts={state.shifts} 
            templates={state.templates}
            requests={state.requests} 
            notifications={state.notifications} 
            onAddUser={handleAddUser} 
            onRemoveUser={handleRemoveUser} 
            onRestoreUser={handleRestoreUser}
            onAddLocation={handleAddLocation} 
            onRemoveLocation={handleRemoveLocation} 
            onImportUsers={handleImportUsers} 
            onResetPassword={handleUpdatePassword} 
            onRestoreState={handleRestoreState} 
            currentUser={state.currentUser} 
          />;
          default: return <Dashboard users={state.users} shifts={state.shifts} requests={state.requests} notifications={state.notifications} currentUser={state.currentUser} />;
      }
  };

  if (loading) {
      return (
          <div className="min-h-screen bg-slate-50 flex items-center justify-center">
              <div className="text-slate-500 font-medium">Loading…</div>
          </div>
      );
  }

  if (!isAuthenticated) return <Login users={state.users} onLogin={handleLogin} />;

  return (
    <HashRouter>
        <div className="min-h-screen bg-slate-50 flex">
            <Sidebar currentView={currentView} onChangeView={setCurrentView} currentUserRole={state.currentUser.role} />
            <div className="ml-64 flex-1 flex flex-col">
                <Header currentUser={state.currentUser} onLogout={handleLogout} onChangePassword={handleUpdatePassword} isSaving={isSaving} lastSaved={lastSaved} />
                <main className="flex-1 mt-16">{renderContent()}</main>
            </div>
        </div>
    </HashRouter>
  );
};

export default App;
