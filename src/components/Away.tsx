import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar as CalendarIcon, Clock, CheckCircle2, XCircle, AlertCircle, Plus, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { User } from '../types';
import { timeOffService, TimeOffBalance, TimeOffRequest } from '../services/timeOffService';

interface AwayProps {
  user: User;
  initialTab?: 'my-requests' | 'approvals';
  defaultOpenModal?: boolean;
}

export function Away({ user, initialTab, defaultOpenModal }: AwayProps) {
  const [balance, setBalance] = useState<TimeOffBalance | null>(null);
  const [history, setHistory] = useState<TimeOffRequest[]>([]);
  const [approvals, setApprovals] = useState<TimeOffRequest[]>([]);
  const [approvalHistory, setApprovalHistory] = useState<TimeOffRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(defaultOpenModal || false);
  const [activeTab, setActiveTab] = useState<'my-requests' | 'approvals'>(
    initialTab || (user.role === 'manager' ? 'approvals' : 'my-requests')
  );

  useEffect(() => {
    if (defaultOpenModal) {
      setIsModalOpen(true);
    }
  }, [defaultOpenModal]);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Form state
  const [formData, setFormData] = useState({
    type: 'Annual Leave',
    startDate: '',
    endDate: '',
    reason: ''
  });

  useEffect(() => {
    loadData();
  }, [user.id]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [bal, hist] = await Promise.all([
        timeOffService.fetchBalance(user.id),
        timeOffService.fetchHistory(user.id)
      ]);
      setBalance(bal);
      setHistory(hist);

      if (user.role === 'manager') {
        const [pending, appHistory] = await Promise.all([
          timeOffService.fetchPendingApprovals(user.id),
          timeOffService.fetchApprovalHistory(user.id)
        ]);
        setApprovals(pending);
        setApprovalHistory(appHistory);
      }
    } catch (error) {
      console.error('Error loading time off data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await timeOffService.submitRequest({
        userId: user.id,
        userName: user.name,
        ...formData
      });
      setIsModalOpen(false);
      setFormData({ type: 'Annual Leave', startDate: '', endDate: '', reason: '' });
      loadData();
    } catch (error) {
      console.error('Error submitting request:', error);
    }
  };

  const handleApproval = async (id: string, status: 'approved' | 'rejected') => {
    try {
      await timeOffService.updateRequestStatus(id, status);
      loadData();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 uppercase tracking-wider flex items-center gap-1 w-fit"><CheckCircle2 className="w-3 h-3" /> Approved</span>;
      case 'rejected':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 uppercase tracking-wider flex items-center gap-1 w-fit"><XCircle className="w-3 h-3" /> Rejected</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 uppercase tracking-wider flex items-center gap-1 w-fit"><Clock className="w-3 h-3" /> Pending</span>;
    }
  };

  const isManagerMode = initialTab === 'approvals';

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            {isManagerMode ? 'Leave Approvals' : 'Time Off'}
          </h1>
          <p className="text-slate-400 mt-1">
            {isManagerMode ? 'Review and manage team leave requests' : 'Manage your leave requests and balances'}
          </p>
        </div>
        {!isManagerMode && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="relative group overflow-hidden rounded-2xl transition-all duration-500 transform hover:-translate-y-1 hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.4),_inset_0_0_20px_rgba(255,255,255,0.05)] active:scale-[0.98]"
          >
            {/* Main Glass Body */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/[0.1] to-transparent backdrop-blur-md border border-white/10 group-hover:border-white/20 transition-all duration-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] rounded-2xl" />
            
            {/* Top Gloss */}
            <div className="absolute top-0 inset-x-0 h-[40%] bg-gradient-to-b from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-t-2xl" />
            
            {/* Content */}
            <div className="relative z-10 px-6 py-3 flex items-center justify-center gap-2 text-white font-bold tracking-wide drop-shadow-md">
              <Plus className="w-5 h-5" />
              Request Leave
            </div>
            
            {/* Sweep Effect */}
            <div className="absolute inset-0 w-[200%] h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out skew-x-[-20deg] pointer-events-none" />
          </button>
        )}
      </div>

      {/* Summary Cards - Hidden in Manager Mode */}
      {!isManagerMode && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { label: 'Total Allowance', value: balance?.total || 0, color: 'text-blue-400', bg: 'bg-blue-500/10' },
            { label: 'Used', value: balance?.used || 0, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
            { label: 'Remaining', value: balance?.remaining || 0, color: 'text-amber-400', bg: 'bg-amber-500/10' },
          ].map((card, i) => (
            <motion.div 
              key={card.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="p-6 rounded-[2rem] bg-white/5 border border-white/5 flex flex-col gap-2"
            >
              <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">{card.label}</span>
              <div className="flex items-baseline gap-2">
                <span className={`text-4xl font-black ${card.color}`}>{card.value}</span>
                <span className="text-slate-500 font-medium">days</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <div className={`grid grid-cols-1 ${isManagerMode ? '' : 'lg:grid-cols-3'} gap-8`}>
        {/* Left Column: Calendar - Hidden in Manager Mode */}
        {!isManagerMode && (
          <div className="lg:col-span-1 space-y-6">
            <div className="p-6 rounded-[2rem] bg-white/5 border border-white/5">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-blue-400" />
                  Personal Calendar
                </h3>
                <div className="flex gap-2">
                  <button className="p-1.5 rounded-lg bg-white/5 text-slate-400 hover:text-white transition-colors"><ChevronLeft className="w-4 h-4" /></button>
                  <button className="p-1.5 rounded-lg bg-white/5 text-slate-400 hover:text-white transition-colors"><ChevronRight className="w-4 h-4" /></button>
                </div>
              </div>
              
              {/* Minimal Calendar Mockup */}
              <div className="grid grid-cols-7 gap-1 mb-4">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                  <div key={`${day}-${i}`} className="text-center text-[10px] font-bold text-slate-500 py-2">{day}</div>
                ))}
                {Array.from({ length: 31 }).map((_, i) => {
                  const day = i + 1;
                  const isApproved = day === 10 || day === 11 || day === 12;
                  return (
                    <div 
                      key={i} 
                      className={`aspect-square flex items-center justify-center rounded-lg text-xs font-medium transition-all ${
                        isApproved ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-400 hover:bg-white/5'
                      }`}
                    >
                      {day}
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-4 pt-4 border-t border-white/5">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Approved</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Pending</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Right Column: History / Approvals */}
        <div className={`${isManagerMode ? 'w-full' : 'lg:col-span-2'} space-y-6`}>
          <div className="rounded-[2rem] bg-white/5 border border-white/5 overflow-hidden">
            <div className="flex border-b border-white/5">
              {!isManagerMode ? (
                <button 
                  onClick={() => setActiveTab('my-requests')}
                  className={`flex-1 py-4 text-sm font-bold transition-all ${activeTab === 'my-requests' ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-400/5' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  My Requests
                </button>
              ) : (
                <button 
                  onClick={() => setActiveTab('approvals')}
                  className={`flex-1 py-4 text-sm font-bold transition-all ${activeTab === 'approvals' ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-400/5' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  Team Approvals
                  {approvals.length > 0 && (
                    <span className="ml-2 px-1.5 py-0.5 rounded-full bg-blue-500 text-white text-[10px]">{approvals.length}</span>
                  )}
                </button>
              )}
              
              {isManagerMode ? (
                <button 
                  onClick={() => setActiveTab('my-requests')}
                  className={`flex-1 py-4 text-sm font-bold transition-all ${activeTab === 'my-requests' ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-400/5' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  Approval History
                </button>
              ) : (
                user.role === 'manager' && (
                  <button 
                    onClick={() => setActiveTab('approvals')}
                    className={`flex-1 py-4 text-sm font-bold transition-all ${activeTab === 'approvals' ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-400/5' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    Team Approvals
                    {approvals.length > 0 && (
                      <span className="ml-2 px-1.5 py-0.5 rounded-full bg-blue-500 text-white text-[10px]">{approvals.length}</span>
                    )}
                  </button>
                )
              )}
            </div>

            <div className="p-6">
              {activeTab === 'my-requests' ? (
                <div className="space-y-4">
                  {isManagerMode ? (
                    approvalHistory.length === 0 ? (
                      <div className="text-center py-12 text-slate-500">No approval history found.</div>
                    ) : (
                      <div className="flex flex-col gap-4">
                        {approvalHistory.map((req) => (
                          <div key={req.id} className="p-5 rounded-2xl bg-white/5 border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold">
                                {req.userName.charAt(0)}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-sm font-bold text-white">{req.userName}</span>
                                <span className="text-xs text-slate-400">{req.type} • {req.startDate} to {req.endDate}</span>
                                <p className="text-xs text-slate-500 mt-1 italic">"{req.reason}"</p>
                              </div>
                            </div>
                            <div>
                              {getStatusBadge(req.status)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  ) : (
                    history.length === 0 ? (
                      <div className="text-center py-12 text-slate-500">No leave history found.</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="border-b border-white/5">
                              <th className="pb-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th>
                              <th className="pb-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Dates</th>
                              <th className="pb-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {history.map((req) => (
                              <tr key={req.id} className="group">
                                <td className="py-4">
                                  <div className="flex flex-col">
                                    <span className="text-sm font-bold text-white">{req.type}</span>
                                    <span className="text-xs text-slate-500">{req.reason}</span>
                                  </div>
                                </td>
                                <td className="py-4">
                                  <div className="flex flex-col">
                                    <span className="text-sm font-medium text-slate-300">{req.startDate}</span>
                                    <span className="text-[10px] text-slate-500">to {req.endDate}</span>
                                  </div>
                                </td>
                                <td className="py-4">
                                  {getStatusBadge(req.status)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {approvals.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">No pending approvals.</div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      {approvals.map((req) => (
                        <div key={req.id} className="p-5 rounded-2xl bg-white/5 border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold">
                              {req.userName.charAt(0)}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-white">{req.userName}</span>
                              <span className="text-xs text-slate-400">{req.type} • {req.startDate} to {req.endDate}</span>
                              <p className="text-xs text-slate-500 mt-1 italic">"{req.reason}"</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => handleApproval(req.id, 'rejected')}
                              className="relative group overflow-hidden rounded-xl transition-all duration-300 transform active:scale-95"
                            >
                              <div className="absolute inset-0 bg-rose-500/10 backdrop-blur-sm border border-rose-500/20 group-hover:bg-rose-500/20 transition-all rounded-xl" />
                              <span className="relative z-10 px-4 py-2 text-rose-400 text-xs font-bold block text-center">Reject</span>
                            </button>
                            <button 
                              onClick={() => handleApproval(req.id, 'approved')}
                              className="relative group overflow-hidden rounded-xl transition-all duration-300 transform active:scale-95"
                            >
                              <div className="absolute inset-0 bg-emerald-500/10 backdrop-blur-sm border border-emerald-500/20 group-hover:bg-emerald-500/20 transition-all rounded-xl" />
                              <span className="relative z-10 px-4 py-2 text-emerald-400 text-xs font-bold block text-center">Approve</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Request Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-[#0F1115] border border-white/10 rounded-[2.5rem] shadow-2xl z-[101] overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-bold text-white">Request Leave</h2>
                  <button 
                    onClick={() => setIsModalOpen(false)}
                    className="p-2 rounded-full hover:bg-white/5 text-slate-400 transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Leave Type</label>
                    <div className="relative group">
                      <div className="absolute inset-0 bg-white/[0.03] rounded-2xl border border-white/10 backdrop-blur-md transition-all duration-300 group-focus-within:bg-white/[0.07] group-focus-within:border-white/20 group-focus-within:shadow-[0_0_20px_rgba(59,130,246,0.15)] pointer-events-none" />
                      <select 
                        value={formData.type}
                        onChange={(e) => setFormData({...formData, type: e.target.value})}
                        className="w-full p-4 bg-transparent rounded-2xl text-white focus:outline-none relative z-10 transition-all appearance-none cursor-pointer"
                      >
                        <option value="Annual Leave" className="text-black">Annual Leave</option>
                        <option value="Sick Leave" className="text-black">Sick Leave</option>
                        <option value="Unpaid Leave" className="text-black">Unpaid Leave</option>
                        <option value="Maternity/Paternity" className="text-black">Maternity/Paternity</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Start Date</label>
                      <div className="relative group">
                        <div className="absolute inset-0 bg-white/[0.03] rounded-2xl border border-white/10 backdrop-blur-md transition-all duration-300 group-focus-within:bg-white/[0.07] group-focus-within:border-white/20 group-focus-within:shadow-[0_0_20px_rgba(59,130,246,0.15)] pointer-events-none" />
                        <input 
                          type="text"
                          placeholder="Select Start Day"
                          onFocus={(e) => (e.target.type = "date")}
                          onBlur={(e) => (e.target.type = "text")}
                          required
                          value={formData.startDate}
                          onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                          className="w-full p-4 bg-transparent rounded-2xl text-white focus:outline-none relative z-10 transition-all placeholder:text-blue-200/20"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">End Date</label>
                      <div className="relative group">
                        <div className="absolute inset-0 bg-white/[0.03] rounded-2xl border border-white/10 backdrop-blur-md transition-all duration-300 group-focus-within:bg-white/[0.07] group-focus-within:border-white/20 group-focus-within:shadow-[0_0_20px_rgba(59,130,246,0.15)] pointer-events-none" />
                        <input 
                          type="text"
                          placeholder="Select End Day"
                          onFocus={(e) => (e.target.type = "date")}
                          onBlur={(e) => (e.target.type = "text")}
                          required
                          value={formData.endDate}
                          onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                          className="w-full p-4 bg-transparent rounded-2xl text-white focus:outline-none relative z-10 transition-all placeholder:text-blue-200/20"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Reason</label>
                    <div className="relative group">
                      <div className="absolute inset-0 bg-white/[0.03] rounded-2xl border border-white/10 backdrop-blur-md transition-all duration-300 group-focus-within:bg-white/[0.07] group-focus-within:border-white/20 group-focus-within:shadow-[0_0_20px_rgba(59,130,246,0.15)] pointer-events-none" />
                      <textarea 
                        required
                        placeholder="Briefly explain your reason..."
                        value={formData.reason}
                        onChange={(e) => setFormData({...formData, reason: e.target.value})}
                        className="w-full p-4 bg-transparent rounded-2xl text-white focus:outline-none relative z-10 transition-all h-32 resize-none placeholder:text-blue-200/20"
                      />
                    </div>
                  </div>

                  <button 
                    type="submit"
                    className="w-full relative group overflow-hidden rounded-2xl transition-all duration-500 transform hover:-translate-y-1 hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.4),_inset_0_0_20px_rgba(255,255,255,0.05)] active:scale-[0.98]"
                  >
                    {/* Main Glass Body */}
                    <div className="absolute inset-0 bg-gradient-to-b from-white/[0.1] to-transparent backdrop-blur-md border border-white/10 group-hover:border-white/20 transition-all duration-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] rounded-2xl" />
                    
                    {/* Top Gloss */}
                    <div className="absolute top-0 inset-x-0 h-[40%] bg-gradient-to-b from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-t-2xl" />
                    
                    {/* Content */}
                    <div className="relative z-10 py-4 flex items-center justify-center gap-2 text-white font-bold tracking-wide text-lg drop-shadow-md">
                      Submit Request
                    </div>
                    
                    {/* Sweep Effect */}
                    <div className="absolute inset-0 w-[200%] h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out skew-x-[-20deg] pointer-events-none" />
                  </button>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
