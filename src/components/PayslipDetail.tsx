import React from 'react';
import { motion } from 'motion/react';
import { Download, ChevronLeft, CreditCard, ShieldCheck, TrendingUp, Clock, Wallet } from 'lucide-react';

export interface PayslipData {
  id: string;
  month: string;
  year: number;
  // Working Summary
  workingDays?: number;
  otHours?: number;
  annualLeave?: number;
  compLeave?: number;
  unpaidLeave?: number;
  // Income
  baseSalary: number;
  otAmount: number;
  bonus: number;
  commission: number;
  allowance: number;
  allowances: { name: string; amount: number }[];
  // Deductions
  insurance: {
    bhxh: number;
    bhyt: number;
    bhtn: number;
  };
  tax: number;
  otherDeductions: number;
  // Totals
  assessableIncome?: number;
  netSalary?: number;
  // Company Contributions
  companyContributions?: {
    bhxh: number;
    bhyt: number;
    bhtn: number;
    accidentInsurance: number;
    tradeUnionFee: number;
  };
}

interface PayslipDetailProps {
  data: PayslipData;
  onBack?: () => void; // Used for "History" button
  onClose?: () => void; // Used for "Back" arrow
}

export function PayslipDetail({ data, onBack, onClose }: PayslipDetailProps) {
  // Logic: Grouping data as requested
  const totalInsurance = data.insurance.bhxh + data.insurance.bhyt + data.insurance.bhtn;
  
  const totalAllowances = data.allowances.reduce((sum, item) => sum + item.amount, 0);
  const totalIncome = data.baseSalary + data.otAmount + data.bonus + data.commission + data.allowance + totalAllowances;
  const totalDeductions = totalInsurance + data.tax + data.otherDeductions;
  
  // Use netSalary from data if available, otherwise calculate
  const netSalary = data.netSalary || (totalIncome - totalDeductions);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  return (
    <div className="max-w-md mx-auto w-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between px-2">
        <button 
          onClick={onClose || onBack}
          className="p-2 rounded-full bg-white/5 text-slate-400 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold text-white">Payslip Detail</h1>
        <button className="p-2 rounded-full bg-white/5 text-blue-400 hover:text-blue-300 transition-colors">
          <Download className="w-5 h-5" />
        </button>
      </div>

      {/* Main Card */}
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative overflow-hidden rounded-[2.5rem] bg-white/[0.03] backdrop-blur-2xl border border-white/10 shadow-[inset_0_0_30px_rgba(255,255,255,0.02)]"
      >
        {/* Glass Glow Effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-gradient-to-b from-blue-500/10 to-transparent blur-2xl pointer-events-none" />
        
        <div className="relative z-10 p-8 space-y-8">
          {/* Month/Year Summary */}
          <div className="text-center space-y-1">
            <p className="text-slate-400 text-sm font-medium uppercase tracking-widest">Earnings for</p>
            <h2 className="text-3xl font-black text-white">
              {(() => {
                const monthInt = parseInt(data.month);
                if (isNaN(monthInt)) return data.month;
                const date = new Date();
                date.setMonth(monthInt - 1);
                return date.toLocaleString('en-US', { month: 'short' });
              })()} {data.year}
            </h2>
          </div>

          {/* Net Salary - The Hero Stat */}
          <div className="bg-white/[0.03] rounded-3xl p-6 border border-white/10 shadow-[inset_0_0_20px_rgba(255,255,255,0.02)] text-center space-y-2">
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Net Salary</p>
            <p className="text-4xl font-black text-[#10b981] drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]">
              {formatCurrency(netSalary)}
            </p>
          </div>

          {/* Working Summary Section */}
          {(data.workingDays !== undefined || data.otHours !== undefined || data.annualLeave !== undefined) && (
            <div className="grid grid-cols-3 gap-2">
              {data.workingDays !== undefined && (
                <div className="bg-white/[0.02] rounded-2xl p-3 border border-white/5 text-center">
                  <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Working</p>
                  <p className="text-sm font-black text-white">{data.workingDays}d</p>
                </div>
              )}
              {data.otHours !== undefined && (
                <div className="bg-white/[0.02] rounded-2xl p-3 border border-white/5 text-center">
                  <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">OT</p>
                  <p className="text-sm font-black text-white">{data.otHours}h</p>
                </div>
              )}
              {data.annualLeave !== undefined && (
                <div className="bg-white/[0.02] rounded-2xl p-3 border border-white/5 text-center">
                  <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Leave</p>
                  <p className="text-sm font-black text-white">{data.annualLeave}d</p>
                </div>
              )}
            </div>
          )}

          {/* Income Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between text-blue-400 mb-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                <span className="text-xs font-black uppercase tracking-widest">Income Details</span>
              </div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Gross Income</span>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm">Base Salary</span>
                <span className="text-white font-bold">{formatCurrency(data.baseSalary)}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-slate-400 text-sm">OT (Overtime)</span>
                </div>
                <span className="text-white font-bold">{formatCurrency(data.otAmount)}</span>
              </div>

              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Wallet className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-slate-400 text-sm">Bonus</span>
                </div>
                <span className="text-white font-bold">{formatCurrency(data.bonus)}</span>
              </div>

              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Wallet className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-slate-400 text-sm">Commission</span>
                </div>
                <span className="text-white font-bold">{formatCurrency(data.commission)}</span>
              </div>

              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Wallet className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-slate-400 text-sm">Allowance</span>
                </div>
                <span className="text-white font-bold">{formatCurrency(data.allowance)}</span>
              </div>

              {data.allowances.length > 0 && data.allowances.map((allowance, idx) => (
                <div key={idx} className="flex justify-between items-center">
                  <span className="text-slate-400 text-sm">{allowance.name}</span>
                  <span className="text-white font-bold">{formatCurrency(allowance.amount)}</span>
                </div>
              ))}

              <div className="pt-2 border-t border-white/5 flex justify-between items-center">
                <span className="text-slate-300 text-sm font-bold">Total Gross Income</span>
                <span className="text-blue-400 font-black">{formatCurrency(totalIncome)}</span>
              </div>
            </div>
          </div>

          {/* Deductions Section */}
          <div className="space-y-4 pt-4 border-t border-white/5">
            <div className="flex items-center justify-between text-rose-400 mb-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                <span className="text-xs font-black uppercase tracking-widest">Deductions</span>
              </div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Total Deductions</span>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm">Total Insurance</span>
                <span className="text-rose-300/80 font-bold">-{formatCurrency(totalInsurance)}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm">Income Tax (PIT)</span>
                <span className="text-rose-300/80 font-bold">-{formatCurrency(data.tax)}</span>
              </div>

              {data.otherDeductions > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-sm">Others</span>
                  <span className="text-rose-300/80 font-bold">-{formatCurrency(data.otherDeductions)}</span>
                </div>
              )}

              <div className="pt-2 border-t border-white/5 flex justify-between items-center">
                <span className="text-slate-300 text-sm font-bold">Total Deductions</span>
                <span className="text-rose-400 font-black">-{formatCurrency(totalDeductions)}</span>
              </div>
            </div>
          </div>

          {/* Footer Info */}
          <div className="pt-4 flex items-center justify-center gap-2 opacity-30">
            <CreditCard className="w-4 h-4 text-slate-500" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Paid via Bank Transfer • DKG HUB</span>
          </div>
        </div>
      </motion.div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-4 px-2">
        <button 
          onClick={onBack}
          className="py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-white font-bold text-sm transition-all active:scale-95"
        >
          History
        </button>
        <button className="py-4 bg-blue-500 hover:bg-blue-600 rounded-2xl text-white font-bold text-sm shadow-[0_0_20px_rgba(59,130,246,0.3)] transition-all active:scale-95">
          Support
        </button>
      </div>
    </div>
  );
}
