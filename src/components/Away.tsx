import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar as CalendarIcon, Clock, CheckCircle2, XCircle, AlertCircle, Plus, ChevronLeft, ChevronRight, X, Loader2 } from 'lucide-react';
import { isWithinInterval, parseISO, startOfDay } from 'date-fns';
import { User } from '../types';
import { timeOffService, TimeOffBalance, TimeOffRequest } from '../services/timeOffService';
import { cn, formatDate, countBusinessDays } from '../lib/utils';
import { DatePicker } from './DatePicker';
import { supabase } from '../lib/supabaseClient';

interface AwayProps {
  user: User;
  initialTab?: 'my-requests' | 'approvals' | 'history';
  defaultOpenModal?: boolean;
}

export function Away({ user, initialTab, defaultOpenModal }: AwayProps) {
  const [balance, setBalance] = useState<TimeOffBalance | null>(null);
  const [history, setHistory] = useState<TimeOffRequest[]>([]);
  const [approvals, setApprovals] = useState<TimeOffRequest[]>([]);
  const [approvalHistory, setApprovalHistory] = useState<TimeOffRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(defaultOpenModal || false);
  const isBOD = 
    user.department?.toUpperCase() === 'BOD' || 
    user.role?.toLowerCase() === 'ceo' || 
    user.role?.toLowerCase() === 'bod' ||
    user.position?.toLowerCase() === 'ceo' ||
    user.position?.toLowerCase() === 'bod';

  const isManager = user.role === 'manager' || isBOD || user.role?.toLowerCase() === 'accountant' || user.position?.toLowerCase() === 'accountant';

  const [activeTab, setActiveTab] = useState<'my-requests' | 'approvals' | 'history'>(
    initialTab || (isBOD ? 'approvals' : 'my-requests')
  );

  // Calendar State
  const [currentDate, setCurrentDate] = useState(new Date());

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const monthName = currentDate.toLocaleString('default', { month: 'long' });
  const year = currentDate.getFullYear();

  const getDayStatus = (day: number) => {
    const cellDate = startOfDay(new Date(currentDate.getFullYear(), currentDate.getMonth(), day));
    
    const request = history.find(req => {
      if (!req.startDate || !req.endDate) return false;
      
      try {
        const start = startOfDay(parseISO(req.startDate));
        const end = startOfDay(parseISO(req.endDate));
        
        // Ensure start is before end for interval
        const intervalStart = start < end ? start : end;
        const intervalEnd = start < end ? end : start;
        
        return isWithinInterval(cellDate, { start: intervalStart, end: intervalEnd });
      } catch (e) {
        return false;
      }
    });

    return request?.status;
  };

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
    isHalfDay: false,
    isLastDayHalf: false,
    session: 'Morning' as 'Morning' | 'Afternoon',
    reason: '',
    totalDaysOverride: '' as string | number
  });

  useEffect(() => {
    console.log('Away component mounted or user changed:', user.id);
    loadData();
  }, [user.id, user.role]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      console.log('Fetching time off data for user:', user.id);
      let [bal, hist] = await Promise.all([
        timeOffService.fetchBalance(user.id),
        timeOffService.fetchHistory(user.id)
      ]);

      // Apply intern logic or update default total
      const isIntern = user.contractType?.toLowerCase().includes('intern');
      if (isIntern && user.joiningDate) {
        const join = new Date(user.joiningDate);
        const now = new Date();
        let months = (now.getFullYear() - join.getFullYear()) * 12 + (now.getMonth() - join.getMonth());
        
        // If the current day is before the joining day, the last month isn't full yet
        if (now.getDate() < join.getDate()) {
          months--;
        }
        
        const internTotal = Math.max(0, months) + 1; // Default 1 day + 1 day per month
        bal = {
          ...bal,
          total: internTotal,
          remaining: internTotal - bal.used
        };
      } else if (!isIntern && bal.total === 12) {
        // If it's a regular staff and we have a balance in DB that is 12, update to 14 as requested
        bal = {
          ...bal,
          total: 14,
          remaining: 14 - bal.used
        };
      }

      console.log('Fetched history:', hist);
      
      // Calculate actual used from history for the current year
      const currentYear = new Date().getFullYear();
        const usedFromHistory = hist
          .filter(req => {
            const status = req.status?.toLowerCase();
            const reqYear = new Date(req.startDate).getFullYear();
            return status === 'approved' && reqYear === currentYear;
          })
          .reduce((sum, req) => {
            // Dùng cùng fallback logic với cột hiển thị DAYS
            const days =
              req.totalDays !== undefined && req.totalDays !== null && req.totalDays > 0
                ? req.totalDays
                : req.type?.toLowerCase().includes('half day')
                ? 0.5
                : countBusinessDays(req.startDate, req.endDate);
            return sum + days;
          }, 0);
      
      // If balance from DB is out of sync with history, use history value
      if (bal.used !== usedFromHistory) {
        console.log(`[Away] Balance out of sync. DB: ${bal.used}, History: ${usedFromHistory}. Using history.`);
        bal = {
          ...bal,
          used: usedFromHistory,
          remaining: bal.total - usedFromHistory
        };
      }

      setBalance(bal);
      setHistory(hist);

      if (isManager) {
        const [pending, appHistory] = await Promise.all([
          timeOffService.fetchPendingApprovals(user.id, isBOD),
          timeOffService.fetchApprovalHistory(user.id, isBOD)
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
      let { startDate, endDate, isHalfDay, isLastDayHalf, session, type } = formData;
      
      if (isHalfDay) {
        endDate = startDate;
        type = `${type} (Half Day - ${session})`;
      } else if (isLastDayHalf) {
        type = `${type} (Last Day Half - Morning)`;
      }

      // Ensure startDate is before or equal to endDate
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (start > end) {
          // Swap them
          [startDate, endDate] = [endDate, startDate];
        }
      }

      const calculatedDays = isHalfDay ? 0.5 : (isLastDayHalf ? Math.max(0, countBusinessDays(startDate, endDate) - 0.5) : countBusinessDays(startDate, endDate));
      const finalTotalDays = formData.totalDaysOverride !== '' ? Number(formData.totalDaysOverride) : calculatedDays;

      await timeOffService.submitRequest({
        userId: user.id,
        userName: user.name,
        ...formData,
        type,
        startDate,
        endDate,
        totalDays: finalTotalDays
      });
      setIsModalOpen(false);
      setFormData({ 
        type: 'Annual Leave', 
        startDate: '', 
        endDate: '', 
        isHalfDay: false, 
        isLastDayHalf: false,
        session: 'Morning', 
        reason: '',
        totalDaysOverride: ''
      });
      loadData();
    } catch (error) {
      console.error('Error submitting request:', error);
    }
  };

  const handleApproval = async (id: string, status: string) => {
    try {
      console.log(`Attempting to update request ${id} to status: ${status}`);
      
      // Diagnostic: Check if we are the manager
      const request = approvals.find(r => r.id === id) || approvalHistory.find(r => r.id === id);
      if (request) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('manager_id, full_name')
          .eq('id', request.userId)
          .single();
          
        if (profile) {
          console.log(`[Diagnostic] Requester: ${profile.full_name}, Manager ID: ${profile.manager_id}, Current User: ${user.id}`);
          
          if (profile.manager_id !== user.id) {
            console.warn(`[Diagnostic] Mismatch! You are not the assigned manager (${profile.manager_id}) for this user.`);
            
            // Attempt to auto-claim if manager_id is null
            if (!profile.manager_id) {
               if (confirm(`User ${profile.full_name} has no manager assigned. Do you want to assign yourself as their manager to approve this request?`)) {
                 const { error: claimError } = await supabase
                   .from('profiles')
                   .update({ manager_id: user.id })
                   .eq('id', request.userId);
                   
                 if (claimError) {
                   console.error('Failed to claim user:', claimError);
                   alert('Failed to assign yourself as manager.');
                   return;
                 }
                 console.log('Successfully assigned as manager. Retrying approval...');
               } else {
                 return;
               }
            } else {
               // If manager is set but different, ask to override?
               if (confirm(`User ${profile.full_name} is assigned to another manager. Do you want to override and assign yourself?`)) {
                 const { error: claimError } = await supabase
                   .from('profiles')
                   .update({ manager_id: user.id })
                   .eq('id', request.userId);
                   
                 if (claimError) {
                   console.error('Failed to claim user:', claimError);
                   alert('Failed to re-assign yourself as manager.');
                   return;
                 }
                 console.log('Successfully re-assigned as manager. Retrying approval...');
               } else {
                 return;
               }
            }
          }
        }
      }

      await timeOffService.updateRequestStatus(id, status, user.id);
      console.log(`Successfully updated request ${id} to status: ${status}`);
      await loadData();
    } catch (error: any) {
      console.error('Error updating status:', error);
      alert(`Failed to update status: ${error.message || 'Unknown error'}`);
    }
  };

  const handleCancel = async (id: string) => {
    if (!window.confirm('Are you sure you want to cancel this request?')) return;
    
    try {
      await timeOffService.cancelRequest(id);
      console.log(`Successfully cancelled request ${id}`);
      await loadData();
    } catch (error: any) {
      console.error('Error cancelling request:', error);
      alert(`Failed to cancel request: ${error.message || 'Unknown error'}`);
    }
  };

  const getStatusBadge = (status: string) => {
    const normalizedStatus = status.toLowerCase();
    switch (normalizedStatus) {
      case 'approved':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 uppercase tracking-wider flex items-center gap-1 w-fit"><CheckCircle2 className="w-3 h-3" /> Approved</span>;
      case 'rejected':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 uppercase tracking-wider flex items-center gap-1 w-fit"><XCircle className="w-3 h-3" /> Rejected</span>;
      case 'cancelled':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-500/20 text-slate-400 uppercase tracking-wider flex items-center gap-1 w-fit"><XCircle className="w-3 h-3" /> Cancelled</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 uppercase tracking-wider flex items-center gap-1 w-fit"><Clock className="w-3 h-3" /> Pending</span>;
    }
  };

  const isManagerMode = initialTab === 'approvals' || initialTab === 'history';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            {isManagerMode || isBOD ? 'Leave Approvals' : 'Time Off'}
          </h1>
          <p className="text-slate-400 mt-1">
            {isManagerMode || isBOD ? 'Review and manage team leave requests' : 'Manage your leave requests and balances'}
          </p>
        </div>
        {!isManagerMode && !isBOD && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold text-sm transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(59,130,246,0.3)]"
          >
            <Plus className="w-4 h-4" /> Request Leave
          </button>
        )}
      </div>

      {/* Summary Cards - Hidden in Manager Mode or for BOD */}
      {!isManagerMode && !isBOD && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { label: 'Total Day Off', value: balance?.total || 0, color: 'text-blue-400', bg: 'bg-blue-500/10' },
            { label: 'Used', value: balance?.used || 0, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
            { label: 'Remaining', value: balance?.remaining || 0, color: 'text-amber-400', bg: 'bg-amber-500/10' },
          ].map((card, i) => (
            <motion.div 
              key={card.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="p-6 rounded-[2rem] bg-white/[0.03] backdrop-blur-2xl border border-white/10 shadow-[inset_0_0_30px_rgba(255,255,255,0.02)] flex flex-col gap-2"
            >
              <div className="flex flex-col items-center text-center gap-2">
                <span className="text-sm font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">{card.label}</span>
                <div className="flex items-baseline gap-2">
                  <span className={`text-4xl font-black ${card.color}`}>{card.value}</span>
                  <span className="text-slate-500 font-medium">days</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <div className={`grid grid-cols-1 ${isManagerMode || isBOD ? '' : 'lg:grid-cols-3'} gap-8`}>
        {/* Left Column: Calendar - Hidden in Manager Mode or for BOD */}
        {!isManagerMode && !isBOD && (
          <div className="lg:col-span-1 space-y-6">
            <div className="p-6 rounded-[2rem] bg-white/[0.03] backdrop-blur-2xl border border-white/10 shadow-[inset_0_0_30px_rgba(255,255,255,0.02)]">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-blue-400" />
                  {monthName} {year}
                </h3>
                <div className="flex gap-2">
                  <button onClick={prevMonth} className="p-1.5 rounded-lg bg-white/5 text-slate-400 hover:text-white transition-colors"><ChevronLeft className="w-4 h-4" /></button>
                  <button onClick={nextMonth} className="p-1.5 rounded-lg bg-white/5 text-slate-400 hover:text-white transition-colors"><ChevronRight className="w-4 h-4" /></button>
                </div>
              </div>
              
              {/* Minimal Calendar Mockup */}
              <div className="grid grid-cols-7 gap-1 mb-4">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                  <div key={`${day}-${i}`} className="text-center text-[10px] font-bold text-slate-500 py-2">{day}</div>
                ))}
                
                {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}

                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const status = getDayStatus(day);
                  const isApproved = status === 'approved' || status === 'Approved';
                  const isPending = status === 'pending' || status === 'Pending';
                  const isRejected = status === 'rejected' || status === 'Rejected';
                  
                  return (
                    <div 
                      key={i} 
                      className={cn(
                        "aspect-square flex items-center justify-center rounded-lg text-xs font-medium transition-all",
                        isApproved ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 
                        isPending ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' :
                        isRejected ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' :
                        'text-slate-400 hover:bg-white/5'
                      )}
                    >
                      {day}
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-around pt-4 border-t border-white/5">
                <div className="flex items-center gap-1.5 whitespace-nowrap">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Approved</span>
                </div>
                <div className="flex items-center gap-1.5 whitespace-nowrap">
                  <div className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Pending</span>
                </div>
                <div className="flex items-center gap-1.5 whitespace-nowrap">
                  <div className="w-2 h-2 rounded-full bg-rose-500 shrink-0"></div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Rejected</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Right Column: History / Approvals */}
        <div className={`${isManagerMode ? 'w-full' : 'lg:col-span-2'} space-y-6`}>
          <div className="rounded-[2rem] bg-white/[0.03] backdrop-blur-2xl border border-white/10 shadow-[inset_0_0_30px_rgba(255,255,255,0.02)] overflow-hidden">
            <div className="flex flex-wrap border-b border-white/5">
              {!isManagerMode && !isBOD && (
                <button 
                  onClick={() => setActiveTab('my-requests')}
                  className={`flex-1 min-w-[120px] py-4 px-2 text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'my-requests' ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-400/5' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  My Requests
                </button>
              )}

              {(isManager || isManagerMode) && (
                <button 
                  onClick={() => setActiveTab('approvals')}
                  className={`flex-1 min-w-[120px] py-4 px-2 text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'approvals' ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-400/5' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  Team Approvals
                  {approvals.length > 0 && (
                    <span className="ml-2 px-1.5 py-0.5 rounded-full bg-blue-500 text-white text-[10px]">{approvals.length}</span>
                  )}
                </button>
              )}
              
              {isManagerMode && (
                <button 
                  onClick={() => setActiveTab('history')}
                  className={`flex-1 min-w-[120px] py-4 px-2 text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'history' ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-400/5' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  History Approvals
                </button>
              )}
            </div>

            <div className="p-6">
              {activeTab === 'my-requests' ? (
                <div className="space-y-4">
                  {history.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">No data available.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-white/5">
                            <th className="pb-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th>
                            <th className="pb-4 text-xs font-bold text-slate-500 uppercase tracking-wider">From</th>
                            <th className="pb-4 text-xs font-bold text-slate-500 uppercase tracking-wider">To</th>
                            <th className="pb-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Days</th>
                            <th className="pb-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Status</th>
                            <th className="pb-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {history.map((req) => {
                            // Use totalDays from request if available, otherwise calculate
                            const displayDays = req.totalDays !== undefined && req.totalDays !== null 
                              ? req.totalDays 
                              : (req.type.toLowerCase().includes('half day') 
                                  ? (countBusinessDays(req.startDate, req.endDate) > 0 ? 0.5 : 0) 
                                  : countBusinessDays(req.startDate, req.endDate));
                            return (
                              <tr key={req.id} className="group">
                                <td className="py-4">
                                  <div className="flex flex-col">
                                    <span className="text-sm font-bold text-white">{req.type}</span>
                                    <span className="text-xs text-slate-500">{req.reason}</span>
                                  </div>
                                </td>
                                <td className="py-4 text-sm font-medium text-slate-300">
                                  {formatDate(req.startDate < req.endDate ? req.startDate : req.endDate)}
                                </td>
                                <td className="py-4 text-sm font-medium text-slate-300">
                                  {formatDate(req.startDate < req.endDate ? req.endDate : req.startDate)}
                                </td>
                                <td className="py-4 text-sm font-medium text-slate-300 text-center">{displayDays}</td>
                                <td className="py-4">
                                  <div className="flex flex-col items-center gap-1">
                                    {getStatusBadge(req.status)}
                                    {req.approverName && req.status.toLowerCase() !== 'pending' && (
                                      <span className="text-[10px] text-slate-500 italic">
                                        By: {req.approverName}
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-4 text-right">
                                  {(req.status.toLowerCase() === 'pending' || req.status.toLowerCase() === 'approved') && (
                                    (() => {
                                      const today = new Date();
                                      today.setHours(0, 0, 0, 0);
                                      const start = new Date(req.startDate);
                                      start.setHours(0, 0, 0, 0);
                                      
                                      if (start > today) {
                                        return (
                                          <button
                                            onClick={() => handleCancel(req.id)}
                                            className="text-xs font-bold text-rose-400 hover:text-rose-300 transition-colors px-3 py-1.5 rounded-lg hover:bg-rose-500/10"
                                          >
                                            Cancel
                                          </button>
                                        );
                                      }
                                      return null;
                                    })()
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ) : activeTab === 'history' ? (
                <div className="space-y-4">
                  {approvalHistory.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">No data available.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-white/5">
                            <th className="pb-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Employee</th>
                            <th className="pb-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th>
                            <th className="pb-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Dates</th>
                            <th className="pb-4 px-2 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Days</th>
                            <th className="pb-4 px-2 text-xs font-bold text-slate-500 uppercase tracking-wider">Approver</th>
                            <th className="pb-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {approvalHistory.map((req) => (
                            <tr key={req.id} className="group">
                              <td className="py-4">
                                <div className="flex items-center gap-3">
                                  {req.userAvatar ? (
                                    <img 
                                      src={req.userAvatar} 
                                      alt={req.userName} 
                                      className="w-8 h-8 rounded-full object-cover border border-white/10"
                                      referrerPolicy="no-referrer"
                                    />
                                  ) : (
                                    <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 text-xs font-bold shrink-0">
                                      {req.userName.charAt(0)}
                                    </div>
                                  )}
                                  <span className="text-sm font-bold text-white">{req.userName}</span>
                                </div>
                              </td>
                              <td className="py-4">
                                <div className="flex flex-col">
                                  <span className="text-sm text-slate-300">{req.type}</span>
                                  <span className="text-[10px] text-slate-500 italic truncate max-w-[150px]">{req.reason}</span>
                                </div>
                              </td>
                              <td className="py-4 text-sm text-slate-400">
                                {formatDate(req.startDate)} - {formatDate(req.endDate)}
                              </td>
                              <td className="py-4 text-center text-sm text-slate-400">
                                {req.totalDays !== undefined ? req.totalDays : (
                                  req.type.toLowerCase().includes('half day') 
                                    ? (countBusinessDays(req.startDate, req.endDate) > 0 ? 0.5 : 0) 
                                    : countBusinessDays(req.startDate, req.endDate)
                                )}
                              </td>
                              <td className="py-4">
                                <div className="flex flex-col">
                                  <span className="text-sm font-medium text-blue-400">{req.approverName}</span>
                                  {req.approvedAt && (
                                    <span className="text-[10px] text-slate-500 italic">
                                      {formatDate(req.approvedAt, 'dd MMM yyyy HH:mm')}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-4 text-center">
                                <div className="flex justify-center">
                                  {getStatusBadge(req.status)}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                  }
                </div>
              ) : (
                <div className="space-y-4">
                  {approvals.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">No data available.</div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      {approvals.map((req) => (
                        <div key={req.id} className="p-5 rounded-2xl bg-white/[0.03] backdrop-blur-2xl border border-white/10 shadow-[inset_0_0_30px_rgba(255,255,255,0.02)] flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            {req.userAvatar ? (
                               <img 
                                 src={req.userAvatar} 
                                 alt={req.userName} 
                                 className="w-10 h-10 rounded-full object-cover border border-white/10"
                                 referrerPolicy="no-referrer"
                               />
                             ) : (
                               <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold shrink-0">
                                 {req.userName.charAt(0)}
                               </div>
                             )}
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-white">{req.userName}</span>
                              <span className="text-xs text-slate-400">
                                {req.type} • {formatDate(req.startDate)} to {formatDate(req.endDate)}
                                {req.totalDays !== undefined && (
                                  <span className="ml-1 text-blue-400 font-medium">({req.totalDays} business days)</span>
                                )}
                              </span>
                              <p className="text-xs text-slate-500 mt-1 italic">"{req.reason}"</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button 
                              onClick={() => handleApproval(req.id, 'Rejected')}
                              className="relative group overflow-hidden rounded-xl transition-all duration-300 transform active:scale-95"
                            >
                              <div className="absolute inset-0 bg-rose-500/10 backdrop-blur-sm border border-rose-500/20 group-hover:bg-rose-500/20 transition-all rounded-xl" />
                              <span className="relative z-10 px-4 py-2 text-rose-400 text-xs font-bold block text-center">Reject</span>
                            </button>
                            <button 
                              onClick={() => handleApproval(req.id, 'Approved')}
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
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-lg bg-[#0F1115] border border-white/10 rounded-[2.5rem] shadow-2xl z-[101] overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 md:p-8">
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
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Leave Type <span className="text-rose-500">*</span></label>
                    <div className="relative group">
                      <select 
                        value={formData.type}
                        onChange={(e) => setFormData({...formData, type: e.target.value})}
                        className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all appearance-none cursor-pointer"
                      >
                        <option value="Annual Leave" className="text-black">Annual Leave</option>
                        <option value="Sick Leave" className="text-black">Sick Leave</option>
                        <option value="Unpaid Leave" className="text-black">Unpaid Leave</option>
                        <option value="Maternity/Paternity" className="text-black">Maternity/Paternity</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Start Date <span className="text-rose-500">*</span></label>
                      <DatePicker 
                        value={formData.startDate} 
                        onChange={(date) => setFormData({...formData, startDate: date, endDate: formData.isHalfDay ? date : formData.endDate})} 
                        placeholder="Select Start Day"
                        inputClassName="w-full p-4 bg-white/5 rounded-2xl border border-white/10 text-white focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all placeholder:text-slate-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">End Date <span className="text-rose-500">*</span></label>
                      <DatePicker 
                        value={formData.endDate} 
                        onChange={(date) => setFormData({...formData, endDate: date})} 
                        placeholder="Select End Day"
                        disabled={formData.isHalfDay}
                        inputClassName="w-full p-4 bg-white/5 rounded-2xl border border-white/10 text-white focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all placeholder:text-slate-500 disabled:opacity-50"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-6 py-2">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <div className="relative w-10 h-6">
                        <input 
                          type="checkbox" 
                          className="sr-only peer"
                          checked={formData.isHalfDay}
                          onChange={(e) => setFormData({
                            ...formData, 
                            isHalfDay: e.target.checked,
                            isLastDayHalf: false,
                            endDate: e.target.checked ? formData.startDate : formData.endDate
                          })}
                        />
                        <div className="w-10 h-6 bg-white/10 rounded-full border border-white/10 peer-checked:bg-blue-500/50 transition-all" />
                        <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-all peer-checked:translate-x-4" />
                      </div>
                      <span className="text-sm font-bold text-slate-300 group-hover:text-white transition-colors">Single Half Day</span>
                    </label>

                    {!formData.isHalfDay && formData.startDate !== formData.endDate && (
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <div className="relative w-10 h-6">
                          <input 
                            type="checkbox" 
                            className="sr-only peer"
                            checked={formData.isLastDayHalf}
                            onChange={(e) => setFormData({...formData, isLastDayHalf: e.target.checked})}
                          />
                          <div className="w-10 h-6 bg-white/10 rounded-full border border-white/10 peer-checked:bg-blue-500/50 transition-all" />
                          <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-all peer-checked:translate-x-4" />
                        </div>
                        <span className="text-sm font-bold text-slate-300 group-hover:text-white transition-colors">Last Day is Half</span>
                      </label>
                    )}
                  </div>

                  {formData.isHalfDay && (
                    <div className="flex items-center gap-2 bg-white/5 p-2 rounded-2xl border border-white/10 w-fit">
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, session: 'Morning'})}
                        className={cn(
                          "px-4 py-2 rounded-xl text-xs font-bold transition-all",
                          formData.session === 'Morning' ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20" : "text-slate-400 hover:text-white"
                        )}
                      >
                        Morning
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, session: 'Afternoon'})}
                        className={cn(
                          "px-4 py-2 rounded-xl text-xs font-bold transition-all",
                          formData.session === 'Afternoon' ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20" : "text-slate-400 hover:text-white"
                        )}
                      >
                        Afternoon
                      </button>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Reason <span className="text-rose-500">*</span></label>
                    <div className="relative group">
                      <textarea 
                        required
                        placeholder="Briefly explain your reason..."
                        value={formData.reason}
                        onChange={(e) => setFormData({...formData, reason: e.target.value})}
                        className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all h-32 resize-none placeholder:text-slate-500"
                      />
                    </div>
                  </div>

                  {formData.startDate && (formData.endDate || formData.isHalfDay) && (
                    <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-bold text-blue-400 flex items-center gap-2">
                          <CalendarIcon className="w-4 h-4" />
                          Calculated: {(() => {
                            if (formData.isHalfDay) return 0.5;
                            const days = countBusinessDays(formData.startDate, formData.endDate);
                            return formData.isLastDayHalf ? Math.max(0, days - 0.5) : days;
                          })()} business days
                        </p>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Override Total Days (Optional)</label>
                        <input 
                          type="number" 
                          step="0.5"
                          min="0.5"
                          placeholder="e.g. 1.5"
                          value={formData.totalDaysOverride}
                          onChange={(e) => setFormData({...formData, totalDaysOverride: e.target.value})}
                          className="w-full p-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500/50 text-sm"
                        />
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">Saturdays and Sundays are automatically excluded from calculation.</p>
                    </div>
                  )}

                  <button 
                    type="submit"
                    className="w-full py-3.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)] flex items-center justify-center gap-2"
                  >
                    Submit Request
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
