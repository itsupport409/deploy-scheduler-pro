
import React, { useState, useEffect, useRef } from 'react';
import { HashRouter } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { ref, get, set } from 'firebase/database';
import { auth, database } from './firebase';
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

export const ALLOWED_DOMAINS = ['icecoldair.com'];

const generateId = () => Math.random().toString(36).substr(2, 9);

export const DEFAULT_LOCATIONS: Location[] = [
    { id: '1', name: 'Downtown Service Center', calendarId: 'icecoldair_downtown@group.calendar.google.com' },
    { id: '2', name: 'Westside Rapid Repair', calendarId: 'icecoldair_westside@group.calendar.google.com' },
];

export const DEFAULT_USERS: User[] = [
    { id: 'u0', name: 'A Butler', role: Role.ADMIN, email: 'abutler@icecoldair.com', avatar: '', eligibleLocationIds: ['1', '2'] },
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

const RTDB_STATE_KEY = 'appState';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [lastSaved, setLastSaved] = useState<number>(Date.now());
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateLoadedRef = useRef(false);

  const [state, setState] = useState<AppState>(() => ({ ...baseState }));

  const loadStateFromRTDB = async (email: string): Promise<void> => {
    const snapshot = await get(ref(database, RTDB_STATE_KEY));
    const raw = snapshot.val() as string | null;
    const stateData = raw ? JSON.parse(raw) : null;

    const users: User[] = stateData?.users?.length ? stateData.users : DEFAULT_USERS;
    const userProfile = users.find(u => u.email === email);
    if (!userProfile) {
      await signOut(auth);
      throw new Error('Authenticated user not found in Firebase roster');
    }

    setState({
      users,
      deletedUsers: Array.isArray(stateData?.deletedUsers) ? stateData.deletedUsers : [],
      locations: stateData?.locations?.length ? stateData.locations : DEFAULT_LOCATIONS,
      shifts: stateData?.shifts || [],
      templates: Array.isArray(stateData?.templates) ? stateData.templates : [],
      requests: stateData?.requests || [],
      notifications: stateData?.notifications || [],
      currentUser: userProfile,
    });
    setCurrentUser(userProfile);
  };

  // Check if already signed in on mount (page refresh)
  useEffect(() => {
    let cancelled = false;
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (cancelled) { unsubscribe(); return; }
      if (firebaseUser?.email) {
        try {
          await loadStateFromRTDB(firebaseUser.email);
          if (!cancelled) {
            setIsAuthenticated(true);
            stateLoadedRef.current = true;
          }
        } catch (err) {
          if (!cancelled) console.error('Failed to restore session:', err);
        }
      }
      if (!cancelled) setLoading(false);
      unsubscribe();
    });
    return () => { cancelled = true; unsubscribe(); };
  }, []);

  // Debounced save to Firebase RTDB — only after real state is loaded
  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) return;
    if (!stateLoadedRef.current) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveTimeoutRef.current = null;
      const { currentUser: _, ...rawPayload } = state;
      // Strip passwords — credentials live in Firebase Auth, not the database
      const payload = {
        ...rawPayload,
        users: rawPayload.users.map(({ password: _p, ...u }) => u),
        deletedUsers: (rawPayload.deletedUsers || []).map(({ password: _p, ...u }) => u),
      };
      setIsSaving(true);
      set(ref(database, RTDB_STATE_KEY), JSON.stringify(payload))
        .then(() => setLastSaved(Date.now()))
        .catch(err => console.error('Sync Failed:', err))
        .finally(() => setTimeout(() => setIsSaving(false), 800));
    }, 400);
    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
  }, [state, loading, isAuthenticated]);

  const handleLogin = async (user: User) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    setCurrentView('dashboard');
    try {
      await loadStateFromRTDB(user.email);
    } catch (err) {
      console.error('Failed to load state after login:', err);
      setState(prev => ({ ...prev, currentUser: user }));
    }
    stateLoadedRef.current = true;
  };

  const handleLogout = async () => {
    stateLoadedRef.current = false;
    setIsAuthenticated(false);
    setCurrentUser(null);
    setState({ ...baseState });
    await signOut(auth).catch(err => console.error('Sign-out error:', err));
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
    setState(prev => ({ ...prev, shifts: prev.shifts.filter(s => s.id !== id) }));
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
      return { id: generateId(), userId: ts.userId, locationId, title: ts.title, start: start.toISOString(), end: end.toISOString(), locked: false };
    });

    setState(prev => ({ ...prev, shifts: [...filteredShifts, ...templateShifts] }));
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

  // Resets a user's Firebase Auth password via the server-side Admin SDK
  const handleUpdatePassword = async (userId: string, newPassword: string) => {
    const user = state.users.find(u => u.id === userId);
    if (!user) return;
    const res = await fetch('/api/users/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email, newPassword })
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to reset password');
    }
  };

  const handleAddUser = async (user: Partial<User>) => {
    const email = user.email?.trim().toLowerCase() || '';
    // Best-effort: create Firebase Auth account via Admin SDK
    try {
      const res = await fetch('/api/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: user.password, displayName: user.name || 'Staff Member' })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        // auth/email-already-exists is fine — account already set up
        if (!data.error?.includes('email-already-exists')) {
          alert(`Note: Firebase Auth account could not be created (${data.error || 'unknown error'}). The user has been added to the roster but will need a login account created manually in Firebase Console.`);
        }
      }
    } catch {
      // Admin SDK may not be configured — soft failure
    }

    const newUser: User = {
      id: generateId(),
      name: user.name || 'Staff Member',
      email,
      role: user.role || Role.Technician,
      avatar: '',
      eligibleLocationIds: [],
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
    alert('System State Restored.');
  };

  const handleImportUsers = (newUsersData: Partial<User>[]) => {
    const newUsers: User[] = newUsersData.map(u => ({
      id: generateId(),
      name: u.name || 'Staff Member',
      email: u.email?.trim().toLowerCase() || '',
      role: u.role || Role.Technician,
      avatar: '',
      eligibleLocationIds: u.eligibleLocationIds || [],
    }));
    setState(prev => ({ ...prev, users: [...prev.users, ...newUsers] }));
  };

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard': return <Dashboard users={state.users} shifts={state.shifts} requests={state.requests} notifications={state.notifications} currentUser={state.currentUser} />;
      case 'schedule': return <Scheduler shifts={state.shifts} users={state.users} locations={state.locations} templates={state.templates} requests={state.requests} onAddShifts={handleAddShifts} onUpdateShift={handleUpdateShift} onRemoveShift={handleRemoveShift} onSaveTemplate={handleSaveTemplate} onApplyTemplate={handleApplyTemplate} onRemoveTemplate={handleRemoveTemplate} onAddLocation={handleAddLocation} currentUser={state.currentUser} />;
      case 'requests': return <Requests requests={state.requests} users={state.users} currentUser={state.currentUser} onUpdateRequest={handleRequestUpdate} onRequestCreate={handleRequestCreate} onSendNotification={handleAddNotification} />;
      case 'staff': return <StaffDirectory users={state.users} locations={state.locations} currentUser={state.currentUser} onUpdateUser={handleUpdateUser} />;
      case 'help': return <Orientation currentUser={state.currentUser} />;
      case 'admin': return <AdminPanel users={state.users} deletedUsers={state.deletedUsers || []} locations={state.locations} shifts={state.shifts} templates={state.templates} requests={state.requests} notifications={state.notifications} onAddUser={handleAddUser} onRemoveUser={handleRemoveUser} onRestoreUser={handleRestoreUser} onAddLocation={handleAddLocation} onRemoveLocation={handleRemoveLocation} onImportUsers={handleImportUsers} onResetPassword={handleUpdatePassword} onRestoreState={handleRestoreState} currentUser={state.currentUser} />;
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

  if (!isAuthenticated || !currentUser) return <Login onLogin={handleLogin} />;

  return (
    <HashRouter>
      <div className="min-h-screen bg-slate-50 flex">
        <Sidebar currentView={currentView} onChangeView={setCurrentView} currentUserRole={state.currentUser.role} />
        <div className="ml-64 flex-1 flex flex-col">
          <Header currentUser={state.currentUser} onLogout={handleLogout} onChangePassword={handleUpdatePassword} notifications={state.notifications} requests={state.requests} users={state.users} isSaving={isSaving} lastSaved={lastSaved} />
          <main className="flex-1 mt-16">{renderContent()}</main>
        </div>
      </div>
    </HashRouter>
  );
};

export default App;
