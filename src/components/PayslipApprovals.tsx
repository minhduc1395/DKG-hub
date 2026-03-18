import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  MoreVertical, 
  ChevronRight,
  History,
  CheckSquare,
  AlertCircle,
  ArrowRight,
  FileText,
  DollarSign,
  CalendarClock,
  User as UserIcon,
  Loader2
} from 'lucide-react';
import { cn } from '../lib/utils';
import { User } from '../types';
import { PayslipDetail, PayslipData } from './PayslipDetail';
import { PayslipHistory } from './PayslipHistory';
import { payslipService, PayslipRequest } from '../services/payslipService';
import { useUser } from '../context/UserContext';

interface PayslipApprovalsProps {
  user: User;
}

export function PayslipApprovals({ user: currentUser }: PayslipApprovalsProps) {
  const { user } = useUser();
  const [pendingRequests, setPendingRequests] = useState<PayslipRequest[]>([]);
  const [history, setHistory] = useState<PayslipRequest[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeView, setActiveView] = useState<'pending' | 'history'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPayslip, setSelectedPayslip] = useState<PayslipData | null>(null);
  const [viewingHistoryFor, setViewingHistoryFor] = useState<PayslipRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pending, hist] = await Promise.all([
        payslipService.getPendingPayslips(),
        payslipService.getPayslipHistory()
      ]);
      setPendingRequests(pending);
      setHistory(hist);
    } catch (error) {
      console.error("Error fetching payslip approvals data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.length === pendingRequests.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(pendingRequests.map(r => r.id));
    }
  };

  const handleSelectOne = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const approveRequest = async (id: string) => {
    const success = await payslipService.approvePayslip(id);
    if (success) {
      // Optimistic update or refetch
      const request = pendingRequests.find(r => r.id === id);
      if (request) {
        const updatedRequest: PayslipRequest = {
          ...request,
          status: 'approved',
          approvedAt: new Date().toLocaleDateString()
        };
        setPendingRequests(prev => prev.filter(r => r.id !== id));
        setHistory(prev => [updatedRequest, ...prev]);
        setSelectedIds(prev => prev.filter(i => i !== id));
      }
    }
  };

  const approveSelected = async () => {
    // Process all approvals
    const promises = selectedIds.map(id => payslipService.approvePayslip(id));
    await Promise.all(promises);
    
    // Refresh data to be safe
    fetchData();
    setSelectedIds([]);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const filteredPending = pendingRequests.filter(r => 
    r.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.employeeId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleViewDetails = async (request: PayslipRequest) => {
    setLoadingDetails(true);
    try {
      const details = await payslipService.getPayslipById(request.id);
      if (details) {
        setSelectedPayslip(details);
        setViewingHistoryFor(request);
      }
    } catch (error) {
      console.error("Error fetching payslip details:", error);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleViewHistory = () => {
    // Switch from detail view to history view for the current employee
    setSelectedPayslip(null);
    // viewingHistoryFor is already set from handleViewDetails
  };

  const handleBackToApprovals = () => {
    setSelectedPayslip(null);
    setViewingHistoryFor(null);
  };

  if (loading && !selectedPayslip && !viewingHistoryFor) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (selectedPayslip) {
    return (
      <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full animate-in fade-in duration-500">
        <PayslipDetail 
          data={selectedPayslip} 
          onBack={handleViewHistory}
          onClose={handleBackToApprovals}
        />
      </div>
    );
  }

  if (viewingHistoryFor) {
    // In a real app, we would fetch history for this specific employee here
    // For now, we'll just show "No data available" if we don't have it, or filter from global history if appropriate
    // But since we don't have an endpoint for "get payslips by employee ID" in the service yet (except getMyPayslips which is for current user),
    // we might need to add that or just show a placeholder.
    // Actually, getMyPayslips takes userId, so we can use it!
    
    return (
      <EmployeeHistoryView 
        employeeId={viewingHistoryFor.employeeId} 
        employeeName={viewingHistoryFor.employeeName}
        onBack={handleBackToApprovals}
        onSelect={(payslip) => setSelectedPayslip(payslip)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full lg:h-full animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-white text-3xl font-black tracking-tight">Payslip Approvals</h1>
          <p className="text-slate-400">Review and authorize monthly payroll for your team.</p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 w-full sm:w-auto">
            <button 
              onClick={() => setActiveView('pending')}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 flex-1 sm:flex-none whitespace-nowrap",
                activeView === 'pending' ? "bg-blue-500 text-white shadow-lg" : "text-slate-400 hover:text-white"
              )}
            >
              <Clock className="w-3.5 h-3.5" /> Pending ({pendingRequests.length})
            </button>
            <button 
              onClick={() => setActiveView('history')}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 flex-1 sm:flex-none whitespace-nowrap",
                activeView === 'history' ? "bg-blue-500 text-white shadow-lg" : "text-slate-400 hover:text-white"
              )}
            >
              <History className="w-3.5 h-3.5" /> History
            </button>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-6 rounded-[2rem] bg-white/5 border border-white/10 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
            <DollarSign className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Pending Amount</p>
            <p className="text-xl font-black text-white">{formatCurrency(pendingRequests.reduce((acc, curr) => acc + curr.netSalary, 0))}</p>
          </div>
        </div>
        <div className="p-6 rounded-[2rem] bg-white/5 border border-white/10 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Approved This Month</p>
            <p className="text-xl font-black text-white">{history.length} Payslips</p>
          </div>
        </div>
        <div className="p-6 rounded-[2rem] bg-white/5 border border-white/10 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
            <AlertCircle className="w-6 h-6 text-orange-400" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Awaiting Action</p>
            <p className="text-xl font-black text-white">{pendingRequests.length} Requests</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col gap-4 lg:flex-1 lg:overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative group flex-1 md:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-400 transition-colors" />
            <input 
              type="text"
              placeholder="Search employee name or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all"
            />
          </div>

          {activeView === 'pending' && selectedIds.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3"
            >
              <span className="text-xs font-bold text-blue-400">{selectedIds.length} selected</span>
              <button 
                onClick={approveSelected}
                className="px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2"
              >
                <CheckSquare className="w-3.5 h-3.5" /> Approve Selected
              </button>
            </motion.div>
          )}
        </div>

        {/* Table/List */}
        <div className="bg-white/5 border border-white/10 rounded-[2rem] overflow-hidden flex flex-col lg:flex-1 lg:min-h-0">
          <div className="overflow-x-auto lg:overflow-auto lg:flex-1 w-full custom-scrollbar relative">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 z-10 bg-[#0a0a0a] text-xs uppercase text-slate-400 font-bold tracking-wider border-b border-white/10">
                <tr>
                  {activeView === 'pending' && (
                    <th className="px-6 py-4 w-10">
                      <button 
                        onClick={handleSelectAll}
                        className={cn(
                          "w-5 h-5 rounded border flex items-center justify-center transition-all",
                          selectedIds.length === pendingRequests.length && pendingRequests.length > 0
                            ? "bg-blue-500 border-blue-500 text-white" 
                            : "border-white/20 hover:border-white/40"
                        )}
                      >
                        {selectedIds.length === pendingRequests.length && pendingRequests.length > 0 && <CheckSquare className="w-3 h-3" />}
                      </button>
                    </th>
                  )}
                  <th className="px-6 py-4">Employee</th>
                  <th className="px-6 py-4">Period</th>
                  <th className="px-6 py-4">Net Salary</th>
                  <th className="px-6 py-4">{activeView === 'pending' ? 'Submitted' : 'Approved Date'}</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {(activeView === 'pending' ? filteredPending : history).map((request) => (
                  <tr key={request.id} className="hover:bg-white/5 transition-colors group">
                    {activeView === 'pending' && (
                      <td className="px-6 py-4">
                        <button 
                          onClick={() => handleSelectOne(request.id)}
                          className={cn(
                            "w-5 h-5 rounded border flex items-center justify-center transition-all",
                            selectedIds.includes(request.id)
                              ? "bg-blue-500 border-blue-500 text-white" 
                              : "border-white/20 hover:border-white/40"
                          )}
                        >
                          {selectedIds.includes(request.id) && <CheckSquare className="w-3 h-3" />}
                        </button>
                      </td>
                    )}
                    <td className="px-6 py-4">
                      <div 
                        className="flex items-center gap-3 cursor-pointer group/emp"
                        onClick={() => handleViewDetails(request)}
                      >
                        <div className="relative">
                          <img src={request.employeeId === user?.id ? user.avatar : request.avatar} alt="" className="w-10 h-10 rounded-full border border-white/10 group-hover/emp:border-blue-500/50 transition-colors" />
                          <div className="absolute inset-0 bg-blue-500/20 rounded-full opacity-0 group-hover/emp:opacity-100 transition-opacity flex items-center justify-center">
                            {loadingDetails ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Eye className="w-4 h-4 text-white" />}
                          </div>
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-white group-hover/emp:text-blue-400 transition-colors">{request.employeeName}</span>
                          <span className="text-xs text-slate-500">{request.employeeId} • {request.department}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <CalendarClock className="w-3.5 h-3.5 text-slate-500" />
                        <span className="text-slate-300">{request.month} {request.year}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-white">{formatCurrency(request.netSalary)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-slate-400 text-xs">
                        {activeView === 'pending' ? request.submittedAt : request.approvedAt}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleViewDetails(request)}
                          className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors" 
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {activeView === 'pending' && (
                          <>
                            <button 
                              onClick={() => approveRequest(request.id)}
                              className="p-2 text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors" 
                              title="Approve"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={async () => {
                                const success = await payslipService.rejectPayslip(request.id);
                                if (success) fetchData();
                              }}
                              className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors" 
                              title="Reject"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        <button className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {(activeView === 'pending' ? filteredPending : history).length === 0 && (
                  <tr>
                    <td colSpan={activeView === 'pending' ? 6 : 5} className="px-6 py-12 text-center text-slate-500">
                      No data available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// Sub-component for viewing employee history
function EmployeeHistoryView({ employeeId, employeeName, onBack, onSelect }: { 
  employeeId: string, 
  employeeName: string, 
  onBack: () => void,
  onSelect: (payslip: PayslipData) => void
}) {
  const { user } = useUser();
  const [history, setHistory] = useState<PayslipData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const data = await payslipService.getMyPayslips(employeeId);
        setHistory(data);
      } catch (error) {
        console.error("Error fetching employee payslip history:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [employeeId]);

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full animate-in fade-in duration-500">
      <div className="flex items-center gap-4 mb-4">
         <button 
          onClick={onBack}
          className="p-2 rounded-full bg-white/5 text-slate-400 hover:text-white transition-colors"
        >
          <ChevronRight className="w-6 h-6 rotate-180" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">Payslip History</h1>
          <p className="text-slate-400 text-sm">Viewing history for <span className="text-blue-400 font-bold">{employeeName}</span></p>
        </div>
      </div>
      
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : (
        <PayslipHistory 
          history={history} 
          onSelect={onSelect} 
        />
      )}
    </div>
  );
}
