import React, { useState, useEffect } from 'react';
import { ChangeRequest, RequestStatus, Role, User, RequestType, Notification } from '../types';
import { Check, X, Clock, Calendar, Timer, Mail, Loader2, Send, Lock as LockIcon, AlertCircle, Info, DollarSign, Square, CheckSquare, AlertTriangle, ArrowRight } from 'lucide-react';

interface RequestsProps {
  requests: ChangeRequest[];
  users: User[];
  currentUser: User;
  onUpdateRequest: (id: string, status: RequestStatus) => void;
  onRequestCreate: (req: Partial<ChangeRequest>) => void;
  onSendNotification: (notif: Partial<Notification>) => void;
}

const Requests: React.FC<RequestsProps> = ({ requests, users, currentUser, onUpdateRequest, onRequestCreate, onSendNotification }) => {
  const [newRequestType, setNewRequestType] = useState<RequestType>(RequestType.TIME_OFF);
  const [newRequestDate, setNewRequestDate] = useState('');
  const [newEndDate, setNewEndDate] = useState('');
  const [newInTime, setNewInTime] = useState(''); 
  const [newOutTime, setNewOutTime] = useState('');
  const [newRequestDetails, setNewRequestDetails] = useState('');
  const [timeBlock, setTimeBlock] = useState<string>('');
  const [payType, setPayType] = useState<'Paid' | 'Unpaid' | ''>('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [policyWarning, setPolicyWarning] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const isApprover = 
    currentUser.role === Role.ADMIN || 
    currentUser.role === Role.GM || 
    currentUser.role === Role.BOM;

  useEffect(() => {
    setPolicyWarning(null);
    setFormError(null);

    if (newRequestType === RequestType.TIME_OFF && newRequestDate) {
        const target = new Date(newRequestDate);
        const today = new Date();
        today.setHours(0,0,0,0);
        target.setHours(0,0,0,0);
        const diffTime = target.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        
        const month = target.getMonth();
        const isSummer = month >= 4 && month <= 8; // May to Sept
        
        if (isSummer && diffDays < 90) {
            setPolicyWarning(`Summer Policy Alert: This request is for May-Sept but has only ${diffDays} days notice (90 recommended).`);
        } else if (!isSummer && diffDays < 30) {
            setPolicyWarning(`Policy Alert: Standard time off usually requires 30 days notice. (Notice provided: ${diffDays} days).`);
        }
    }
  }, [newRequestDate, newRequestType]);

  const draftEmailFromServer = async (recipientName: string, changeType: string, status: string): Promise<{ subject: string; body: string }> => {
    const res = await fetch('/api/draft-notification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipientName, changeType, status }),
    });
    const data = await res.json();
    return { subject: data.subject || `Update: ${changeType}`, body: data.body || `Your request has been ${status}.` };
  };

  const handleApprove = async (req: ChangeRequest) => {
    setProcessingId(req.id);
    onUpdateRequest(req.id, RequestStatus.APPROVED);
    const requester = users.find(u => u.id === req.requesterId);
    if (requester) {
      const { subject, body } = await draftEmailFromServer(requester.name, req.type, 'Approved');
      onSendNotification({ userId: requester.id, userName: requester.name, userEmail: requester.email, subject, content: body, type: 'EMAIL' });
    }
    setProcessingId(null);
  };

  const handleReject = async (req: ChangeRequest) => {
    setProcessingId(req.id);
    onUpdateRequest(req.id, RequestStatus.REJECTED);
    const requester = users.find(u => u.id === req.requesterId);
    if (requester) {
      const { subject, body } = await draftEmailFromServer(requester.name, req.type, 'Rejected');
      onSendNotification({ userId: requester.id, userName: requester.name, userEmail: requester.email, subject, content: body, type: 'EMAIL' });
    }
    setProcessingId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validation (Blocking)
    if (!newRequestDate) {
        setFormError("Please select a valid start date.");
        return;
    }

    if (newRequestType === RequestType.TIME_OFF && !payType) {
        setFormError("Required: You must select either Paid or Unpaid time off.");
        return;
    }

    onRequestCreate({
        type: newRequestType,
        targetDate: new Date(newRequestDate).toISOString(),
        endDate: newEndDate ? new Date(newEndDate).toISOString() : undefined,
        inTime: newInTime || undefined,
        outTime: newOutTime || undefined,
        timeBlock: timeBlock || undefined,
        payType: payType as any,
        details: newRequestDetails,
        requesterId: currentUser.id
    });
    
    // Reset Form
    setNewRequestDetails('');
    setNewRequestDate('');
    setNewEndDate('');
    setNewInTime('');
    setNewOutTime('');
    setTimeBlock('');
    setPayType('');
    setFormError(null);
    setPolicyWarning(null);
    alert("Request logged to database for review.");
  };

  return (
    <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sticky top-24">
            <h3 className="text-lg font-bold text-slate-800 mb-2">New Request</h3>
            <p className="text-xs text-slate-500 mb-6">Complete fields below to notify management.</p>
            
            <form onSubmit={handleSubmit} className="space-y-4">
                {policyWarning && (
                    <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg flex items-start gap-2 animate-in fade-in slide-in-from-top-1">
                        <AlertTriangle className="text-amber-600 mt-0.5 shrink-0" size={16} />
                        <div>
                            <p className="text-[10px] font-bold text-amber-800 uppercase tracking-tight">Policy Deviation Warning</p>
                            <p className="text-[10px] text-amber-700 leading-tight mt-0.5">{policyWarning}</p>
                            <span className="block mt-1 text-[9px] font-medium text-amber-600 italic">Submission permitted; manager review required.</span>
                        </div>
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Request Type</label>
                    <select className="w-full border border-slate-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" value={newRequestType} onChange={(e) => setNewRequestType(e.target.value as RequestType)}>
                        {Object.values(RequestType).map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>

                {newRequestType === RequestType.TIME_OFF && (
                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
                        <p className="text-xs font-bold text-slate-600 uppercase tracking-widest flex items-center gap-1">
                           <DollarSign size={12} /> Pay Type (Required)
                        </p>
                        <div className="space-y-3">
                            <button 
                                type="button"
                                onClick={() => setPayType('Paid')}
                                className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${payType === 'Paid' ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-700 hover:border-blue-300'}`}
                            >
                                {payType === 'Paid' ? <CheckSquare size={18} /> : <Square size={18} />}
                                <div className="flex flex-col">
                                    <span className="text-sm font-bold">Paid Time Off</span>
                                    <span className={`text-[10px] ${payType === 'Paid' ? 'text-blue-100' : 'text-slate-400'} italic`}>if applicable</span>
                                </div>
                            </button>
                            
                            <button 
                                type="button"
                                onClick={() => setPayType('Unpaid')}
                                className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${payType === 'Unpaid' ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-700 hover:border-blue-300'}`}
                            >
                                {payType === 'Unpaid' ? <CheckSquare size={18} /> : <Square size={18} />}
                                <div className="flex flex-col">
                                    <span className="text-sm font-bold">Unpaid Time Off</span>
                                    <span className={`text-[10px] ${payType === 'Unpaid' ? 'text-blue-100' : 'text-slate-400'}`}>Standard Leave</span>
                                </div>
                            </button>
                        </div>
                    </div>
                )}
                
                <div className="grid grid-cols-1 gap-4">
                    <div className="grid grid-cols-1 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1"><Calendar size={14} /> Start Date</label>
                            <input type="date" required className="w-full border border-slate-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" value={newRequestDate} onChange={(e) => setNewRequestDate(e.target.value)} />
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1"><Clock size={14} /> In Time <span className="text-[10px] text-slate-400 font-normal ml-auto">(Opt)</span></label>
                            <input type="time" className="w-full border border-slate-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" value={newInTime} onChange={(e) => setNewInTime(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1"><Clock size={14} /> Out Time <span className="text-[10px] text-slate-400 font-normal ml-auto">(Opt)</span></label>
                            <input type="time" className="w-full border border-slate-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" value={newOutTime} onChange={(e) => setNewOutTime(e.target.value)} />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1"><Calendar size={14} /> End Date <span className="text-[10px] text-slate-400 font-normal ml-auto">(Optional)</span></label>
                        <input type="date" className="w-full border border-slate-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" value={newEndDate} onChange={(e) => setNewEndDate(e.target.value)} />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1 flex justify-between">Reason / Details <span className="text-[10px] text-slate-400 font-normal">(Optional)</span></label>
                    <textarea className="w-full border border-slate-300 rounded-lg p-2.5 text-sm h-20 outline-none focus:ring-2 focus:ring-blue-500" placeholder="Optional details..." value={newRequestDetails} onChange={(e) => setNewRequestDetails(e.target.value)}></textarea>
                </div>

                {formError && (
                    <div className="p-3 bg-red-50 border border-red-100 rounded-lg flex items-start gap-2">
                        <AlertCircle className="text-red-500 mt-0.5 shrink-0" size={16} />
                        <p className="text-xs font-bold text-red-700">{formError}</p>
                    </div>
                )}

                <button 
                    type="submit" 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-all shadow-md active:scale-[0.98]"
                >
                    Submit Request
                </button>
            </form>
        </div>
      </div>

      <div className="lg:col-span-2 space-y-4">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">Review Status</h3>
        {requests.length === 0 ? (
            <div className="bg-white p-12 rounded-xl border border-dashed border-slate-300 text-center text-slate-400">Your request history will appear here.</div>
        ) : (
            requests.slice().reverse().map(req => {
                const requester = users.find(u => u.id === req.requesterId);
                const startStr = new Date(req.targetDate).toLocaleDateString();
                const endStr = req.endDate ? new Date(req.endDate).toLocaleDateString() : null;
                const isProcessing = processingId === req.id;
                return (
                    <div key={req.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between gap-4 hover:border-slate-300 transition-all">
                        <div className="flex gap-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${req.status === RequestStatus.APPROVED ? 'bg-green-100 text-green-600' : req.status === RequestStatus.REJECTED ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                                {isProcessing ? <Loader2 size={20} className="animate-spin" /> : req.status === RequestStatus.APPROVED ? <Check size={20} /> : req.status === RequestStatus.REJECTED ? <X size={20} /> : <Clock size={20} />}
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="font-semibold text-slate-900">{requester?.name}</span>
                                    {req.payType && <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-full ${req.payType === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{req.payType}</span>}
                                    {(req.inTime || req.outTime) && (
                                        <span className="text-[10px] text-slate-400 bg-slate-50 px-2 rounded border border-slate-100 flex items-center gap-1">
                                            <Clock size={10} /> {req.inTime || '--'} {req.outTime ? ` - ${req.outTime}` : ''}
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm font-bold text-slate-800">{req.type} {endStr ? `: ${startStr} - ${endStr}` : ` on ${startStr}`}</p>
                                {req.details && <p className="text-sm text-slate-600 italic border-l-2 border-slate-200 pl-3">"{req.details}"</p>}
                            </div>
                        </div>
                        <div className="flex items-center gap-2 self-start sm:self-center">
                            {req.status === RequestStatus.PENDING && isApprover ? (
                                <>
                                    <button onClick={() => handleReject(req)} className="px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg">Reject</button>
                                    <button onClick={() => handleApprove(req)} className="px-3 py-1.5 text-xs font-bold text-white bg-green-600 hover:bg-green-700 rounded-lg shadow-sm">Approve</button>
                                </>
                            ) : (
                                <span className={`px-3 py-1 text-[10px] font-bold rounded-full border ${req.status === RequestStatus.APPROVED ? 'bg-green-50 text-green-700 border-green-200' : req.status === RequestStatus.REJECTED ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>{req.status.toUpperCase()}</span>
                            )}
                        </div>
                    </div>
                );
            })
        )}
      </div>
    </div>
  );
};

export default Requests;