import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Search, Filter, FileText, CheckCircle, XCircle, Clock, ArrowRight, DollarSign, RefreshCw, X, Trash2, Send, AlertCircle, Loader2, Edit3, CheckSquare, Check, Copy, ChevronLeft } from 'lucide-react';
import { DatePicker } from './DatePicker';
import { supabase } from '../lib/supabaseClient';
import { useUser } from '../context/UserContext';
import { cn, formatDate } from '../lib/utils';

export interface AdvanceItem {
  description: string;
  amount: number | string;
  note: string;
}

export interface AdvanceRequest {
  id: string;
  requester_id: string;
  bank_account: string;
  total_amount: number;
  items: AdvanceItem[];
  status: 'Pending_Accountant' | 'Pending_BOD' | 'Approved' | 'Rejected' | 'Completed';
  type: 'Advance' | 'Clearance';
  related_advance_id?: string;
  has_invoice?: boolean;
  invoice_link?: string;
  request_date: string;
  created_at: string;
  requester?: {
    full_name: string;
    company_email: string;
  };
  related_advance?: {
    total_amount: number;
  };
}

export interface AdvanceLog {
  id: string;
  request_id: string;
  actor_id: string;
  action: string;
  note?: string;
  created_at: string;
  actor?: {
    full_name: string;
  };
}

const formatAmount = (val: number | string) => {
  if (val === undefined || val === null || val === '') return '';
  const str = val.toString();
  const parts = str.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
};

const formatDisplayCurrency = (amount: number) => {
  return formatAmount(amount) + ' ₫';
};

export function Advances({ isApprovalView = false }: { isApprovalView?: boolean }) {
  const { user } = useUser();
  const [requests, setRequests] = useState<AdvanceRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [dateFilter, setDateFilter] = useState<string>(isApprovalView ? 'this_month' : 'all');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createType, setCreateType] = useState<'Advance' | 'Clearance'>('Advance');
  const [selectedRequest, setSelectedRequest] = useState<AdvanceRequest | null>(null);
  const [activeGroup, setActiveGroup] = useState<'Pending' | 'Approved' | 'Rejected' | null>(null);
  const [editRequest, setEditRequest] = useState<AdvanceRequest | null>(null);
  const [logs, setLogs] = useState<AdvanceLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dbError, setDbError] = useState<{title: string, message: string} | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToastMessage({ type, message });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const isBOD = 
    user?.department?.toUpperCase() === 'BOD' || 
    user?.role?.toLowerCase() === 'ceo' || 
    user?.role?.toLowerCase() === 'chairman' ||
    user?.role?.toLowerCase() === 'bod' ||
    user?.position?.toLowerCase() === 'ceo' ||
    user?.position?.toLowerCase() === 'chairman' ||
    user?.position?.toLowerCase() === 'bod';

  const isAccountant = 
    user?.department?.toLowerCase() === 'accounting' || 
    user?.position?.toLowerCase() === 'accountant' || 
    user?.position?.toLowerCase() === 'chief accountant';

  const fetchRequests = async () => {
    if (!user) return;
    setIsLoading(true);
    setDbError(null);
    try {
      let query = supabase
        .from('advance_requests')
        .select(`
          *,
          requester:profiles!requester_id(full_name, company_email),
          related_advance:advance_requests!related_advance_id(total_amount)
        `)
        .order('created_at', { ascending: false });

      if (!isApprovalView) {
        // "My Advances" view: only show the user's own requests
        query = query.eq('requester_id', user.id);
      } else {
        // "Advance Approvals" view (Management Hub)
        if (isAccountant) {
          // Accountant sees everything
        } else if (isBOD) {
          // BOD only sees requests that have passed Accountant
          query = query.in('status', ['Pending_BOD', 'Approved', 'Rejected', 'Completed']);
        } else {
          // Fallback if somehow a normal user gets here
          query = query.eq('requester_id', user.id);
        }
      }

      const { data, error } = await query;

      if (error) {
        if (error.code === '42P01') {
          setDbError({
            title: 'Database Setup Required',
            message: 'The advance_requests table does not exist. Please run the provided SQL script in your Supabase SQL Editor.'
          });
        } else {
          throw error;
        }
      } else {
        setRequests(data || []);
      }
    } catch (error: any) {
      console.error('Error fetching advance requests:', error);
      setDbError({
        title: 'Error Loading Data',
        message: error.message || 'Failed to load advance requests.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [user]);

  const fetchLogs = async (requestId: string) => {
    setLoadingLogs(true);
    try {
      const { data, error } = await supabase
        .from('advance_logs')
        .select(`
          *,
          actor:profiles!actor_id(full_name)
        `)
        .eq('request_id', requestId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleOpenDetail = (req: AdvanceRequest) => {
    setSelectedRequest(req);
    fetchLogs(req.id);
  };

  const filteredRequests = useMemo(() => {
    let result = requests.filter(req => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = 
        req.requester?.full_name?.toLowerCase().includes(searchLower) ||
        req.items.some(item => item.description.toLowerCase().includes(searchLower)) ||
        req.id.toLowerCase().includes(searchLower) ||
        req.total_amount.toString().includes(searchLower);
      
      const matchesStatus = statusFilter === 'All' || 
        req.status === statusFilter || 
        (statusFilter === 'Approved' && req.status === 'Completed');
      const matchesType = typeFilter === 'All' || req.type === typeFilter;
      
      let matchesDate = true;
      if (dateFilter !== 'all') {
        const reqDate = new Date(req.created_at);
        const now = new Date();
        if (dateFilter === 'this_month') {
          matchesDate = reqDate.getMonth() === now.getMonth() && reqDate.getFullYear() === now.getFullYear();
        } else if (dateFilter === 'last_month') {
          const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          matchesDate = reqDate.getMonth() === lastMonth.getMonth() && reqDate.getFullYear() === lastMonth.getFullYear();
        } else if (dateFilter === 'this_year') {
          matchesDate = reqDate.getFullYear() === now.getFullYear();
        }
      }

      return matchesSearch && matchesStatus && matchesType && matchesDate;
    });

    // Apply sorting
    result.sort((a, b) => {
      // Priority statuses: Needs_Edit and Rejected
      const priority = (status: string) => (status === 'Needs_Edit' || status === 'Rejected' ? 1 : 0);
      const priorityA = priority(a.status);
      const priorityB = priority(b.status);

      if (priorityA !== priorityB) {
        return priorityB - priorityA; // Priority first
      }

      if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortBy === 'amount_high') return b.total_amount - a.total_amount;
      if (sortBy === 'amount_low') return a.total_amount - b.total_amount;
      return 0;
    });

    return result;
  }, [requests, searchQuery, statusFilter, typeFilter, sortBy, dateFilter]);

  const groupedRequests = useMemo(() => {
    return {
      Pending: filteredRequests.filter(r => r.status.startsWith('Pending') || r.status === 'Needs_Edit'),
      Approved: filteredRequests.filter(r => r.status === 'Approved' || r.status === 'Completed'),
      Rejected: filteredRequests.filter(r => r.status === 'Rejected')
    };
  }, [filteredRequests]);

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'Pending_Accountant': return { icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', label: 'Pending Accountant' };
      case 'Pending_BOD': return { icon: Clock, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', label: 'Pending BOD' };
      case 'Approved': return { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', label: 'Approved' };
      case 'Rejected': return { icon: XCircle, color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20', label: 'Rejected' };
      case 'Needs_Edit': return { icon: Edit3, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', label: 'Needs Edit' };
      case 'Completed': return { icon: CheckSquare, color: 'text-teal-400', bg: 'bg-teal-500/10', border: 'border-teal-500/20', label: 'Completed' };
      default: return { icon: Clock, color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20', label: status };
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full lg:h-full animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-white text-3xl font-black tracking-tight">
            {isApprovalView ? 'Advance Approvals' : 'My Advances & Clearances'}
          </h1>
          <p className="text-slate-400">
            {isApprovalView ? 'Review and manage advance requests' : 'Manage your advance requests and clearances'}
          </p>
        </div>

        {!isApprovalView && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setCreateType('Advance'); setIsCreateModalOpen(true); }}
              className="px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold text-sm transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)] flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Advance</span>
            </button>
            <button
              onClick={() => { setCreateType('Clearance'); setIsCreateModalOpen(true); }}
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-sm transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline">New Clearance</span>
            </button>
          </div>
        )}
      </div>

      {/* Stats Overview */}
      {isApprovalView && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-6 rounded-[2rem] bg-white/[0.03] backdrop-blur-2xl border border-white/10 shadow-[inset_0_0_30px_rgba(255,255,255,0.02)] flex flex-col items-center text-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
              <DollarSign className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Total Pending Amount</p>
              <p className="text-xl font-black text-white">
                {formatDisplayCurrency(
                  requests.filter(r => r.status.startsWith('Pending')).reduce((acc, curr) => acc + curr.total_amount, 0)
                )}
              </p>
            </div>
          </div>
          <div className="p-6 rounded-[2rem] bg-white/[0.03] backdrop-blur-2xl border border-white/10 shadow-[inset_0_0_30px_rgba(255,255,255,0.02)] flex flex-col items-center text-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
              <CheckCircle className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Approved Requests</p>
              <p className="text-xl font-black text-white">
                <span>{requests.filter(r => r.status === 'Approved' || r.status === 'Completed').length}</span>
                <span className="ml-1.5">Requests</span>
              </p>
            </div>
          </div>
          <div className="p-6 rounded-[2rem] bg-white/[0.03] backdrop-blur-2xl border border-white/10 shadow-[inset_0_0_30px_rgba(255,255,255,0.02)] flex flex-col items-center text-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
              <AlertCircle className="w-6 h-6 text-orange-400" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Awaiting Action</p>
              <p className="text-xl font-black text-white">
                <span>{requests.filter(r => (isAccountant && r.status === 'Pending_Accountant') || (isBOD && r.status === 'Pending_BOD')).length}</span>
                <span className="ml-1.5">Requests</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-col gap-4 lg:flex-1 lg:overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-1 items-center gap-3 md:max-w-2xl">
              <div className="relative group flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-400 transition-colors" />
                <input
                  type="text"
                  placeholder="Search by requester, description, ID or amount..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
                />
              </div>

              {/* Type Filter */}
              <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-1 shrink-0">
                {['All', 'Advance', 'Clearance'].map((type) => (
                  <button
                    key={type}
                    onClick={() => setTypeFilter(type)}
                    className={cn(
                      "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                      typeFilter === type
                        ? "bg-blue-500 text-white shadow-lg"
                        : "text-slate-400 hover:text-white hover:bg-white/5"
                    )}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Date Filter */}
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-300 focus:outline-none focus:border-blue-500/50 transition-all cursor-pointer hover:bg-white/10"
              >
                <option value="all">All Time</option>
                <option value="this_month">This Month</option>
                <option value="last_month">Last Month</option>
                <option value="this_year">This Year</option>
              </select>

              {/* Advanced Filter Toggle */}
              <button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className={cn(
                  "p-2.5 rounded-xl border transition-all flex items-center justify-center",
                  showAdvancedFilters 
                    ? "bg-blue-500/20 border-blue-500/50 text-blue-400" 
                    : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white"
                )}
                title="Advanced Filters"
              >
                <Filter className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Advanced Filters Section */}
          <AnimatePresence>
            {showAdvancedFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="p-5 rounded-[2rem] bg-white/[0.02] border border-white/5 flex flex-col gap-5">
                  <div className="flex flex-col gap-3">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Status Filter</span>
                    <div className="flex flex-wrap items-center gap-2">
                      {['Pending_Accountant', 'Needs_Edit', 'Pending_BOD', 'Approved', 'Rejected'].map((status) => (
                        <button
                          key={status}
                          onClick={() => setStatusFilter(statusFilter === status ? 'All' : status)}
                          className={cn(
                            "px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border",
                            statusFilter === status
                              ? "bg-blue-500 text-white border-blue-500 shadow-lg"
                              : "bg-white/5 text-slate-400 border-white/10 hover:bg-white/10 hover:text-white"
                          )}
                        >
                          {status.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Sort By</span>
                    <div className="flex flex-wrap items-center gap-2">
                      {[
                        { id: 'newest', label: 'Newest First' },
                        { id: 'oldest', label: 'Oldest First' },
                        { id: 'amount_high', label: 'Amount: High to Low' },
                        { id: 'amount_low', label: 'Amount: Low to High' }
                      ].map((option) => (
                        <button
                          key={option.id}
                          onClick={() => setSortBy(option.id)}
                          className={cn(
                            "px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border",
                            sortBy === option.id
                              ? "bg-blue-500 text-white border-blue-500 shadow-lg"
                              : "bg-white/5 text-slate-400 border-white/10 hover:bg-white/10 hover:text-white"
                          )}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* List / Grid */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
          {dbError ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6">
                <AlertCircle className="w-8 h-8 text-red-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">{dbError.title}</h2>
              <p className="text-slate-400 max-w-md mb-6">{dbError.message}</p>
              <button 
                onClick={fetchRequests}
                className="px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition-all flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Retry
              </button>
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-6">
                <FileText className="w-8 h-8 text-slate-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">No requests found</h2>
              <p className="text-slate-400 max-w-md">
                {searchQuery || statusFilter !== 'All' 
                  ? "Try adjusting your search or filters." 
                  : "You haven't created any advance or clearance requests yet."}
              </p>
            </div>
          ) : (
            <div className="w-full">
              {!activeGroup && !searchQuery ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12 py-10 max-w-6xl mx-auto px-4">
                  {(['Pending', 'Approved', 'Rejected'] as const).map((group) => {
                    const groupItems = groupedRequests[group];
                    const count = groupItems.length;
                    const topReq = groupItems[0];
                    
                    return (
                      <div key={group} className="flex flex-col items-center gap-8">
                        <div 
                          onClick={() => count > 0 && setActiveGroup(group)}
                          className={cn(
                            "relative w-full aspect-[4/5] max-w-[280px] cursor-pointer group transition-all duration-500",
                            count === 0 && "opacity-40 cursor-not-allowed grayscale"
                          )}
                        >
                          {/* Stacked layers */}
                          {count > 2 && (
                            <div className="absolute inset-0 translate-x-6 translate-y-6 rotate-6 bg-white/5 border border-white/10 rounded-[2.5rem] transition-all duration-500 group-hover:translate-x-8 group-hover:translate-y-8 group-hover:rotate-12" />
                          )}
                          {count > 1 && (
                            <div className="absolute inset-0 translate-x-3 translate-y-3 rotate-3 bg-white/10 border border-white/10 rounded-[2.5rem] transition-all duration-500 group-hover:translate-x-4 group-hover:translate-y-4 group-hover:rotate-6" />
                          )}
                          
                          {/* Top card */}
                          <div className={cn(
                            "absolute inset-0 bg-white/[0.03] backdrop-blur-3xl border rounded-[2.5rem] shadow-2xl flex flex-col p-7 transition-all duration-500 group-hover:-translate-y-4 group-hover:-rotate-2",
                            group === 'Pending' ? 'border-blue-500/30 shadow-blue-500/10' : 
                            group === 'Approved' ? 'border-emerald-500/30 shadow-emerald-500/10' : 
                            'border-rose-500/30 shadow-rose-500/10'
                          )}>
                            <div className="flex-1 flex flex-col items-center justify-center text-center gap-5">
                              <div className={cn(
                                "w-20 h-20 rounded-[2rem] flex items-center justify-center border-2 shadow-lg",
                                group === 'Pending' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 
                                group === 'Approved' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 
                                'bg-rose-500/10 border-rose-500/20 text-rose-400'
                              )}>
                                {group === 'Pending' ? <Clock className="w-10 h-10" /> : 
                                 group === 'Approved' ? <CheckCircle className="w-10 h-10" /> : 
                                 <XCircle className="w-10 h-10" />}
                              </div>
                              <div>
                                <h3 className="text-2xl font-black text-white mb-1 tracking-tight">{group}</h3>
                                <div className="flex items-center justify-center gap-2">
                                  <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-slate-400 text-xs font-bold">
                                    <span>{count}</span>
                                    <span className="ml-1.5">{count === 1 ? 'Request' : 'Requests'}</span>
                                  </span>
                                </div>
                              </div>
                            </div>
                            
                            {topReq && (
                              <div className="pt-5 border-t border-white/10 mt-auto">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Latest</span>
                                  <span className="text-[10px] font-bold text-slate-400">
                                    {topReq.request_date ? formatDate(new Date(topReq.request_date)) : formatDate(new Date(topReq.created_at))}
                                  </span>
                                </div>
                                <p className="text-sm text-white font-bold truncate mb-0.5">{topReq.items[0]?.description}</p>
                                <p className="text-xs text-slate-400 font-medium">{formatDisplayCurrency(topReq.total_amount)}</p>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex flex-col items-center text-center">
                          <p className="text-xs text-slate-500 font-medium max-w-[200px]">
                            {group === 'Pending' ? 'Requests awaiting your review or action' : 
                             group === 'Approved' ? 'Successfully processed and approved requests' : 
                             'Requests that have been declined'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col gap-6">
                  {activeGroup && !searchQuery && (
                    <div className="flex items-center justify-between bg-white/[0.02] border border-white/5 rounded-2xl p-4 mb-2">
                      <button 
                        onClick={() => setActiveGroup(null)}
                        className="flex items-center gap-2 text-slate-400 hover:text-white transition-all font-bold text-sm group"
                      >
                        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-all">
                          <ChevronLeft className="w-4 h-4" />
                        </div>
                        Back to Groups
                      </button>
                      <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white/5 border border-white/10">
                        <div className={cn(
                          "w-2.5 h-2.5 rounded-full animate-pulse shadow-[0_0_10px_rgba(255,255,255,0.2)]",
                          activeGroup === 'Pending' ? 'bg-blue-400 shadow-blue-400/50' : 
                          activeGroup === 'Approved' ? 'bg-emerald-400 shadow-emerald-400/50' : 
                          'bg-rose-400 shadow-rose-400/50'
                        )} />
                        <span className="text-sm font-black text-white uppercase tracking-widest">
                          {activeGroup}
                          <span className="ml-1.5">Requests</span>
                        </span>
                        <span className="text-xs font-bold text-slate-500 ml-1">
                          ({(!activeGroup || searchQuery ? filteredRequests : groupedRequests[activeGroup]).length})
                        </span>
                      </div>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-6">
                    {(activeGroup && !searchQuery ? groupedRequests[activeGroup] : filteredRequests).map((req) => {
                      const statusConfig = getStatusConfig(req.status);
                      const StatusIcon = statusConfig.icon;
                      
                      return (
                        <motion.div
                          key={req.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          onClick={() => handleOpenDetail(req)}
                          className="group relative flex flex-col p-6 rounded-[2rem] bg-white/[0.03] backdrop-blur-2xl border border-white/10 shadow-[inset_0_0_30px_rgba(255,255,255,0.02)] hover:bg-white/[0.05] hover:border-white/20 transition-all cursor-pointer overflow-hidden"
                        >
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center",
                                req.type === 'Advance' ? 'bg-blue-500/20 text-blue-400' : 'bg-emerald-500/20 text-emerald-400'
                              )}>
                                {req.type === 'Advance' ? <DollarSign className="w-5 h-5" /> : <RefreshCw className="w-5 h-5" />}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-sm font-bold text-white">{req.type}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-slate-400">
                                    {req.request_date ? formatDate(new Date(req.request_date)) : formatDate(new Date(req.created_at))}
                                  </span>
                                  {req.has_invoice && (
                                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20" title="Invoice Included">
                                      <FileText className="w-3 h-3" />
                                      <span className="text-[8px] font-bold uppercase">INV</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className={cn("px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border flex items-center gap-1.5", statusConfig.bg, statusConfig.color, statusConfig.border)}>
                              <StatusIcon className="w-3 h-3" />
                              {statusConfig.label}
                            </div>
                          </div>

                          <div className="flex-1 flex flex-col gap-2 mb-6">
                            <h3 className="text-lg font-bold text-white line-clamp-2">
                              {req.items[0]?.description || 'Untitled Request'}
                            </h3>
                            <p className="text-sm text-slate-400">
                              By {req.requester?.full_name || 'Unknown'}
                            </p>
                          </div>

                          <div className="flex items-center justify-between pt-4 border-t border-white/5">
                            <span className="text-sm text-slate-400">Total Amount</span>
                            <span className="text-xl font-black text-white">
                              {formatDisplayCurrency(req.total_amount)}
                            </span>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed bottom-8 right-8 z-[200]"
          >
            <div className={cn(
              "flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border backdrop-blur-xl",
              toastMessage.type === 'success' 
                ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-200" 
                : "bg-red-500/20 border-red-500/30 text-red-200"
            )}>
              {toastMessage.type === 'success' ? (
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                  <Check className="w-5 h-5 text-emerald-400" />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                </div>
              )}
              <p className="font-medium">{toastMessage.message}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Modal */}
      <CreateAdvanceModal 
        isOpen={isCreateModalOpen} 
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditRequest(null);
        }} 
        type={createType}
        onSuccess={() => {
          fetchRequests();
          showToast('success', `${createType} request ${editRequest ? 'updated' : 'submitted'} successfully!`);
          setEditRequest(null);
        }}
        onError={(msg) => showToast('error', msg)}
        user={user}
        editRequest={editRequest}
      />

      {/* Detail Modal */}
      <AdvanceDetailModal
        isOpen={!!selectedRequest}
        onClose={() => setSelectedRequest(null)}
        request={selectedRequest}
        logs={logs}
        loadingLogs={loadingLogs}
        user={user}
        isAccountant={isAccountant}
        isBOD={isBOD}
        isApprovalView={isApprovalView}
        onSuccess={(msg: string) => {
          if (msg === 'edit_request' && selectedRequest) {
            setEditRequest(selectedRequest);
            setCreateType(selectedRequest.type as 'Advance' | 'Clearance');
            setIsCreateModalOpen(true);
            setSelectedRequest(null);
          } else {
            fetchRequests();
            setSelectedRequest(null);
            showToast('success', msg);
          }
        }}
        onError={(msg: string) => showToast('error', msg)}
      />
    </div>
  );
}

// --- Create Modal Component ---
function CreateAdvanceModal({ isOpen, onClose, type, onSuccess, onError, user, editRequest }: { isOpen: boolean, onClose: () => void, type: 'Advance' | 'Clearance', onSuccess: () => void, onError: (msg: string) => void, user: any, editRequest?: AdvanceRequest | null }) {
  const [items, setItems] = useState<AdvanceItem[]>([{ description: '', amount: 0, note: '' }]);
  const [relatedAdvanceId, setRelatedAdvanceId] = useState('');
  const [requestDate, setRequestDate] = useState(new Date().toISOString().split('T')[0]);
  const [hasInvoice, setHasInvoice] = useState(false);
  const [invoiceLink, setInvoiceLink] = useState('');
  const [approvedAdvances, setApprovedAdvances] = useState<AdvanceRequest[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Derive bank account info from user profile
  const bankAccountInfo = useMemo(() => {
    if (!user) return 'No bank account information available.';
    const parts = [];
    if (user.name) parts.push(user.name);
    if (user.bankAccountNumber) parts.push(user.bankAccountNumber);
    if (user.bankName) parts.push(user.bankName);
    return parts.length > 0 ? parts.join(' - ') : 'No bank account information available.';
  }, [user]);

  useEffect(() => {
    if (isOpen) {
      if (editRequest) {
        setItems(editRequest.items);
        setRelatedAdvanceId(editRequest.related_advance_id || '');
        setRequestDate(editRequest.request_date ? editRequest.request_date.split('T')[0] : new Date().toISOString().split('T')[0]);
        setHasInvoice(editRequest.has_invoice || false);
        setInvoiceLink(editRequest.invoice_link || '');
      } else {
        setItems([{ description: '', amount: 0, note: '' }]);
        setRelatedAdvanceId('');
        setRequestDate(new Date().toISOString().split('T')[0]);
        setHasInvoice(false);
        setInvoiceLink('');
      }
      
      if (type === 'Clearance') {
        // Fetch approved advances for this user
        const fetchApproved = async () => {
          const { data } = await supabase
            .from('advance_requests')
            .select('*')
            .eq('requester_id', user.id)
            .eq('type', 'Advance')
            .eq('status', 'Approved');
          setApprovedAdvances(data || []);
        };
        fetchApproved();
      }
    }
  }, [isOpen, type, user.id, editRequest]);

  const totalAmount = useMemo(() => items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0), [items]);
  
  const relatedAdvance = useMemo(() => approvedAdvances.find(a => a.id === relatedAdvanceId), [approvedAdvances, relatedAdvanceId]);
  const difference = type === 'Clearance' && relatedAdvance ? totalAmount - relatedAdvance.total_amount : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (type === 'Clearance' && !relatedAdvanceId) {
      onError('Please select an approved advance request.');
      return;
    }
    if (hasInvoice && !invoiceLink.trim()) {
      onError('Please provide an invoice link.');
      return;
    }
    if (items.some(i => !i.description || i.amount <= 0)) {
      onError('Please fill all item descriptions and ensure amounts are greater than 0.');
      return;
    }

    setIsSubmitting(true);
    try {
      let requestData, requestError;
      const itemsToSubmit = items.map(item => ({
        ...item,
        amount: Number(item.amount) || 0
      }));

      if (editRequest) {
        const result = await supabase
          .from('advance_requests')
          .update({
            total_amount: totalAmount,
            items: itemsToSubmit,
            related_advance_id: type === 'Clearance' ? relatedAdvanceId : null,
            has_invoice: hasInvoice,
            invoice_link: hasInvoice ? invoiceLink : null,
            request_date: requestDate,
            status: 'Pending_Accountant'
          })
          .eq('id', editRequest.id)
          .select()
          .single();
        requestData = result.data;
        requestError = result.error;
      } else {
        const result = await supabase
          .from('advance_requests')
          .insert({
            requester_id: user.id,
            department: user.department || null,
            bank_account: bankAccountInfo,
            total_amount: totalAmount,
            items: itemsToSubmit,
            type,
            related_advance_id: type === 'Clearance' ? relatedAdvanceId : null,
            has_invoice: hasInvoice,
            invoice_link: hasInvoice ? invoiceLink : null,
            request_date: requestDate,
            status: 'Pending_Accountant'
          })
          .select()
          .single();
        requestData = result.data;
        requestError = result.error;
      }

      if (requestError) throw requestError;

      // Log action
      await supabase
        .from('advance_logs')
        .insert({
          request_id: requestData.id,
          actor_id: user.id,
          action: editRequest ? 'Resubmitted' : 'Submitted'
        });

      onSuccess();
      onClose();
      // Reset form
      setItems([{ description: '', amount: 0, note: '' }]);
      setRelatedAdvanceId('');
      setRequestDate(new Date().toISOString().split('T')[0]);
      setHasInvoice(false);
      setInvoiceLink('');
    } catch (error: any) {
      console.error('Error submitting request:', error);
      onError('Failed to submit request: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl max-h-[90vh] bg-black/40 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] shadow-[inset_0_0_30px_rgba(255,255,255,0.02)] z-[101] flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between p-6 border-b border-white/5 shrink-0">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center",
                  type === 'Advance' ? 'bg-blue-500/20 text-blue-400' : 'bg-emerald-500/20 text-emerald-400'
                )}>
                  {type === 'Advance' ? <DollarSign className="w-5 h-5" /> : <RefreshCw className="w-5 h-5" />}
                </div>
                <h2 className="text-xl font-bold text-white">{editRequest ? 'Edit' : 'Create'} {type} Request</h2>
              </div>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-white/5 text-slate-400 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <form id="create-advance-form" onSubmit={handleSubmit} className="space-y-6">
                
                {type === 'Clearance' && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Select Approved Advance <span className="text-rose-500">*</span></label>
                    <select
                      required
                      value={relatedAdvanceId}
                      onChange={(e) => setRelatedAdvanceId(e.target.value)}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    >
                      <option value="">-- Select Advance --</option>
                      {approvedAdvances.map(adv => (
                        <option key={adv.id} value={adv.id}>
                          {adv.items[0]?.description} - {formatDisplayCurrency(adv.total_amount)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Requester</label>
                    <div className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-slate-400 cursor-not-allowed">
                      {bankAccountInfo}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">
                      {type === 'Advance' ? 'Advance Date' : 'Clearance Date'} (Ngày {type === 'Advance' ? 'tạm ứng' : 'hoàn ứng'}) <span className="text-rose-500">*</span>
                    </label>
                    <DatePicker
                      value={requestDate}
                      onChange={(date) => setRequestDate(date)}
                      inputClassName="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                  </div>
                </div>

                <p className="text-xs text-slate-500 -mt-4">
                  Requester info is pulled from your profile. Update your profile if it is incorrect.
                </p>

                {type === 'Clearance' && (
                  <div className="space-y-4 p-4 rounded-2xl bg-white/5 border border-white/10">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="hasInvoice"
                        checked={hasInvoice}
                        onChange={(e) => setHasInvoice(e.target.checked)}
                        className="w-5 h-5 rounded border-white/10 bg-white/5 text-blue-500 focus:ring-blue-500/50"
                      />
                      <label htmlFor="hasInvoice" className="text-sm font-medium text-white cursor-pointer select-none">
                        Invoice included (Kèm invoice)
                      </label>
                    </div>

                    {hasInvoice && (
                      <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                        <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                          Invoice Link <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="url"
                          required={hasInvoice}
                          placeholder="https://..."
                          value={invoiceLink}
                          onChange={(e) => setInvoiceLink(e.target.value)}
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        />
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-300">Items</label>
                    <button
                      type="button"
                      onClick={() => setItems([...items, { description: '', amount: 0, note: '' }])}
                      className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Add Item
                    </button>
                  </div>
                  
                  <div className="border border-white/10 rounded-2xl overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-white/5 border-b border-white/10">
                          <th className="p-3 text-xs font-semibold text-slate-400">Description <span className="text-rose-500">*</span></th>
                          <th className="p-3 text-xs font-semibold text-slate-400 w-48">Amount (VND) <span className="text-rose-500">*</span></th>
                          <th className="p-3 text-xs font-semibold text-slate-400">Note</th>
                          <th className="p-3 w-12"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item, index) => (
                          <tr key={index} className="border-b border-white/5 last:border-0">
                            <td className="p-2">
                              <input
                                required
                                type="text"
                                placeholder="What is this for?"
                                value={item.description}
                                onChange={(e) => {
                                  const newItems = [...items];
                                  newItems[index].description = e.target.value;
                                  setItems(newItems);
                                }}
                                className="w-full px-3 py-2 bg-transparent border border-transparent hover:border-white/10 focus:border-blue-500/50 rounded-lg text-sm text-white focus:outline-none transition-all"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                required
                                type="text"
                                placeholder="0"
                                value={formatAmount(item.amount)}
                                onChange={(e) => {
                                  const rawValue = e.target.value.replace(/,/g, '');
                                  if (rawValue === '' || /^\d*\.?\d*$/.test(rawValue)) {
                                    const newItems = [...items];
                                    newItems[index].amount = rawValue;
                                    setItems(newItems);
                                  }
                                }}
                                className="w-full px-3 py-2 bg-transparent border border-transparent hover:border-white/10 focus:border-blue-500/50 rounded-lg text-sm text-white focus:outline-none transition-all"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                placeholder="example: Korean Spotlight show/ Capital"
                                value={item.note}
                                onChange={(e) => {
                                  const newItems = [...items];
                                  newItems[index].note = e.target.value;
                                  setItems(newItems);
                                }}
                                className="w-full px-3 py-2 bg-transparent border border-transparent hover:border-white/10 focus:border-blue-500/50 rounded-lg text-sm text-white focus:outline-none transition-all"
                              />
                            </td>
                            <td className="p-2 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  if (items.length > 1) {
                                    setItems(items.filter((_, i) => i !== index));
                                  }
                                }}
                                className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                                disabled={items.length === 1}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Summary */}
                <div className="bg-white/5 rounded-2xl p-6 border border-white/10 space-y-3">
                  {type === 'Clearance' && relatedAdvance && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Original Advance Amount:</span>
                      <span className="text-white font-medium">{formatDisplayCurrency(relatedAdvance.total_amount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base">
                    <span className="text-slate-300 font-medium">Total {type === 'Advance' ? 'Requested' : 'Actual'} Amount:</span>
                    <span className="text-white font-bold">{formatDisplayCurrency(totalAmount)}</span>
                  </div>
                  {type === 'Clearance' && relatedAdvance && (
                    <div className="flex justify-between text-lg pt-3 border-t border-white/10">
                      <span className="text-white font-bold">
                        {difference > 0 ? 'Company Reimburses You:' : 'You Return to Company:'}
                      </span>
                      <span className={cn("font-black", difference > 0 ? "text-emerald-400" : "text-rose-400")}>
                        {formatDisplayCurrency(Math.abs(difference))}
                      </span>
                    </div>
                  )}
                </div>

              </form>
            </div>

            <div className="p-6 border-t border-white/5 shrink-0 flex justify-end gap-3 bg-black/20">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-300 hover:text-white hover:bg-white/5 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="create-advance-form"
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)] flex items-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {editRequest ? 'Save Changes' : 'Submit Request'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// --- Detail & Approval Modal Component ---
function AdvanceDetailModal({ isOpen, onClose, request, logs, loadingLogs, user, isAccountant, isBOD, isApprovalView, onSuccess, onError }: any) {
  const [actionNote, setActionNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{action: string, newStatus: string} | null>(null);

  if (!request) return null;

  const triggerAction = (action: string, newStatus: string) => {
    if ((action === 'Needs Edit' || action === 'Rejected') && !actionNote.trim()) {
      onError('Please provide a note/reason for this action.');
      return;
    }
    setConfirmDialog({ action, newStatus });
  };

  const handleAction = async (action: string, newStatus: string) => {
    if ((action === 'Needs Edit' || action === 'Rejected') && !actionNote.trim()) {
      onError('Please provide a note/reason for this action.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Update status
      const { error: updateError } = await supabase
        .from('advance_requests')
        .update({ status: newStatus })
        .eq('id', request.id);

      if (updateError) throw updateError;

      // Log action
      await supabase
        .from('advance_logs')
        .insert({
          request_id: request.id,
          actor_id: user.id,
          action,
          note: actionNote.trim() || null
        });

      onSuccess(`Successfully ${action.toLowerCase()}`);
      setActionNote('');
    } catch (error: any) {
      console.error('Error performing action:', error);
      onError('Failed to perform action: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const difference = request.type === 'Clearance' && request.related_advance 
    ? request.total_amount - request.related_advance.total_amount 
    : 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl max-h-[90vh] bg-black/40 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] shadow-[inset_0_0_30px_rgba(255,255,255,0.02)] z-[101] flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between p-6 border-b border-white/5 shrink-0">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center",
                  request.type === 'Advance' ? 'bg-blue-500/20 text-blue-400' : 'bg-emerald-500/20 text-emerald-400'
                )}>
                  {request.type === 'Advance' ? <DollarSign className="w-6 h-6" /> : <RefreshCw className="w-6 h-6" />}
                </div>
                <div className="flex flex-col">
                  <h2 className="text-xl font-bold text-white">{request.type} Request</h2>
                  <span className="text-sm text-slate-400">
                    By {request.requester?.full_name} • {request.request_date ? formatDate(new Date(request.request_date)) : formatDate(new Date(request.created_at))}
                  </span>
                </div>
              </div>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-white/5 text-slate-400 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Col: Details */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white/5 rounded-2xl p-6 border border-white/10 space-y-4">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Request Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="block text-xs text-slate-400 mb-1">Status</span>
                      <span className="inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide bg-white/10 text-white border border-white/20">
                        {request.status.replace('_', ' ')}
                      </span>
                    </div>
                    {request.has_invoice && request.invoice_link && (
                      <div>
                        <span className="block text-xs text-slate-400 mb-1">Invoice</span>
                        <a 
                          href={request.invoice_link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 transition-all"
                        >
                          <FileText className="w-3 h-3" />
                          LINK INVOICE
                        </a>
                      </div>
                    )}
                    <div>
                      <span className="block text-xs text-slate-400 mb-2">Requester</span>
                      <div className="space-y-1.5">
                        {(() => {
                          const parts = request.bank_account ? request.bank_account.split(' - ') : [];
                          const name = parts.length > 0 ? parts[0] : 'Unknown';
                          const account = parts.length > 1 ? parts[1] : '';
                          const bank = parts.length > 2 ? parts.slice(2).join(' - ') : '';

                          return (
                            <>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-white font-medium">{name}</span>
                                {name !== 'Unknown' && (
                                  <button 
                                    onClick={() => {
                                      navigator.clipboard.writeText(name);
                                      onSuccess('Name copied to clipboard!');
                                    }}
                                    className="p-1 rounded-md bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                                    title="Copy Name"
                                  >
                                    <Copy className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                              {account && (
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-white font-medium">{account}</span>
                                  <button 
                                    onClick={() => {
                                      navigator.clipboard.writeText(account);
                                      onSuccess('Account number copied to clipboard!');
                                    }}
                                    className="p-1 rounded-md bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                                    title="Copy Account Number"
                                  >
                                    <Copy className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                              {bank && (
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-slate-300">{bank}</span>
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white/5 rounded-2xl p-6 border border-white/10 space-y-4">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Items</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="pb-3 text-xs font-semibold text-slate-400">Description</th>
                          <th className="pb-3 text-xs font-semibold text-slate-400 text-right">Amount</th>
                          <th className="pb-3 text-xs font-semibold text-slate-400 pl-4">Note</th>
                        </tr>
                      </thead>
                      <tbody>
                        {request.items.map((item: any, idx: number) => (
                          <tr key={idx} className="border-b border-white/5 last:border-0">
                            <td className="py-3 text-sm text-white">{item.description}</td>
                            <td className="py-3 text-sm text-white font-medium text-right whitespace-nowrap">
                              {formatDisplayCurrency(item.amount)}
                            </td>
                            <td className="py-3 text-sm text-slate-400 pl-4">{item.note || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  <div className="pt-4 border-t border-white/10 space-y-2">
                    {request.type === 'Clearance' && request.related_advance && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Original Advance:</span>
                        <span className="text-white font-medium">{formatDisplayCurrency(request.related_advance.total_amount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-base">
                      <span className="text-slate-300 font-medium">Total Amount:</span>
                      <span className="text-white font-bold">{formatDisplayCurrency(request.total_amount)}</span>
                    </div>
                    {request.type === 'Clearance' && request.related_advance && (
                      <div className="flex justify-between text-lg pt-2">
                        <span className="text-white font-bold">
                          {difference > 0 ? 'Company Reimburses:' : 'Return to Company:'}
                        </span>
                        <span className={cn("font-black", difference > 0 ? "text-emerald-400" : "text-rose-400")}>
                          {formatDisplayCurrency(Math.abs(difference))}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Col: Logs & Actions */}
              <div className="space-y-6">
                <div className="bg-white/5 rounded-2xl p-6 border border-white/10 flex flex-col h-full max-h-[400px]">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 shrink-0">History</h3>
                  <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                    {loadingLogs ? (
                      <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 text-blue-500 animate-spin" /></div>
                    ) : logs.map((log, idx) => {
                      // Determine circle appearance based on action
                      let circleColor = "stroke-blue-500";
                      let dashArray = "25 75"; // 1/4 circle for submitted/resubmitted
                      let isFull = false;

                      if (log.action === 'Approved' || log.action === 'Completed' || log.action === 'Confirm Paid' || log.action === 'Confirm Received') {
                        circleColor = "stroke-emerald-500";
                        dashArray = "100 0";
                        isFull = true;
                      } else if (log.action === 'Forwarded to BOD') {
                        circleColor = "stroke-blue-500";
                        dashArray = "75 25"; // 3/4 circle
                      } else if (log.action === 'Rejected') {
                        circleColor = "stroke-rose-500";
                        dashArray = "100 0";
                        isFull = true;
                      } else if (log.action === 'Needs Edit' || log.action === 'Requested Edit') {
                        circleColor = "stroke-amber-500";
                        dashArray = "50 50"; // 1/2 circle
                      }

                      return (
                        <div key={log.id} className="relative pl-6 border-l-2 border-white/10 pb-6 last:pb-0">
                          <div className="absolute -left-[11px] top-0 w-5 h-5 flex items-center justify-center bg-[#1a1a1a] rounded-full z-10">
                            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                              <path
                                className={cn("fill-none stroke-[4]", circleColor)}
                                strokeDasharray={dashArray}
                                strokeLinecap="round"
                                d="M18 2.0845
                                  a 15.9155 15.9155 0 0 1 0 31.831
                                  a 15.9155 15.9155 0 0 1 0 -31.831"
                              />
                            </svg>
                            {isFull && (
                              <div className={cn("absolute inset-[4px] rounded-full opacity-20", circleColor.replace('stroke', 'bg'))} />
                            )}
                          </div>
                          <div className="flex flex-col gap-1 -mt-1">
                            <span className="text-sm font-bold text-white">{log.action}</span>
                            <span className="text-xs text-slate-400">By {log.actor?.full_name} • {formatDate(new Date(log.created_at))}</span>
                            {log.note && (
                              <div className="mt-2 p-3 rounded-xl bg-white/5 text-sm text-slate-300 italic border border-white/5">
                                "{log.note}"
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Actions Footer */}
            <div className="p-6 border-t border-white/5 shrink-0 bg-black/20 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="w-full sm:w-1/2">
                {isApprovalView && ((isAccountant && request.status === 'Pending_Accountant') || (isBOD && request.status === 'Pending_BOD')) ? (
                  <input
                    type="text"
                    placeholder="Add a note (required for Reject/Edit) *..."
                    value={actionNote}
                    onChange={(e) => setActionNote(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                ) : <div />}
              </div>
              
              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                {isApprovalView && isAccountant && request.status === 'Pending_Accountant' && (
                  <>
                    <button
                      onClick={() => triggerAction('Rejected', 'Rejected')}
                      disabled={isSubmitting}
                      className="px-4 py-2.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 rounded-xl font-bold transition-all border border-rose-500/30"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => triggerAction('Needs Edit', 'Needs_Edit')}
                      disabled={isSubmitting}
                      className="px-4 py-2.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded-xl font-bold transition-all border border-amber-500/30"
                    >
                      Request Edit
                    </button>
                    <button
                      onClick={() => triggerAction('Forwarded to BOD', 'Pending_BOD')}
                      disabled={isSubmitting}
                      className="px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)]"
                    >
                      Forward to BOD
                    </button>
                  </>
                )}

                {isApprovalView && isBOD && request.status === 'Pending_BOD' && (
                  <>
                    <button
                      onClick={() => triggerAction('Rejected', 'Rejected')}
                      disabled={isSubmitting}
                      className="px-4 py-2.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 rounded-xl font-bold transition-all border border-rose-500/30"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => triggerAction('Approved', 'Approved')}
                      disabled={isSubmitting}
                      className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                    >
                      Approve
                    </button>
                  </>
                )}

                {isApprovalView && isAccountant && request.status === 'Approved' && (
                  <button
                    onClick={() => triggerAction('Completed', 'Completed')}
                    disabled={isSubmitting}
                    className="px-4 py-2.5 bg-teal-500 hover:bg-teal-600 text-white rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(20,184,166,0.3)]"
                  >
                    Confirm Paid/Received
                  </button>
                )}

                {!isApprovalView && request.status === 'Needs_Edit' && (
                  <button
                    onClick={() => {
                      onClose();
                      onSuccess('edit_request');
                    }}
                    className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)] flex items-center gap-2"
                  >
                    <Edit3 className="w-4 h-4" />
                    Edit Request
                  </button>
                )}
              </div>
            </div>
          </motion.div>

          {/* Confirmation Modal */}
          <AnimatePresence>
            {confirmDialog && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[102]"
                  onClick={() => setConfirmDialog(null)}
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl z-[103] overflow-hidden"
                >
                  <div className="p-6">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                        <AlertCircle className="w-6 h-6 text-amber-400" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white">Confirm Action</h3>
                        <p className="text-sm text-slate-400 mt-1">
                          Are you sure you want to proceed with "{confirmDialog.action}"?
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-end gap-3 mt-6">
                      <button
                        onClick={() => setConfirmDialog(null)}
                        disabled={isSubmitting}
                        className="px-4 py-2 rounded-xl font-bold text-slate-300 hover:bg-white/5 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          handleAction(confirmDialog.action, confirmDialog.newStatus);
                          setConfirmDialog(null);
                        }}
                        disabled={isSubmitting}
                        className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold transition-colors shadow-lg shadow-blue-500/20 flex items-center gap-2"
                      >
                        {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm'}
                      </button>
                    </div>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </>
      )}
    </AnimatePresence>
  );
}
