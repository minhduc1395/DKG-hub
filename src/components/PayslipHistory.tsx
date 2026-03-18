import React from 'react';
import { motion } from 'motion/react';
import { CreditCard, ChevronRight, Calendar, ArrowUpRight, ArrowDownRight, Wallet } from 'lucide-react';
import { PayslipData } from './PayslipDetail';

interface PayslipHistoryProps {
  history: PayslipData[];
  onSelect: (payslip: PayslipData) => void;
}

export function PayslipHistory({ history, onSelect }: PayslipHistoryProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const calculateTotals = (data: PayslipData) => {
    const totalInsurance = data.insurance.bhxh + data.insurance.bhyt + data.insurance.bhtn;
    const bonusAndPerformance = data.bonus + data.commission;
    const totalAllowances = data.allowances.reduce((sum, item) => sum + item.amount, 0);
    const totalIncome = data.baseSalary + data.otAmount + data.bonus + data.commission + data.allowance + totalAllowances;
    const totalDeductions = totalInsurance + data.tax + data.otherDeductions;
    const netSalary = data.netSalary || (totalIncome - totalDeductions);
    
    return { totalIncome, totalDeductions, netSalary };
  };

  return (
    <div className="max-w-4xl mx-auto w-full space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-1 px-2">
        <p className="text-slate-400 text-sm">View and download your past earnings statements.</p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {history.map((payslip) => {
          const { totalIncome, totalDeductions, netSalary } = calculateTotals(payslip);
          
          return (
            <motion.div
              key={payslip.id}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => onSelect(payslip)}
              className="group relative overflow-hidden rounded-3xl bg-white/5 border border-white/10 p-6 cursor-pointer hover:bg-white/10 transition-all"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                {/* Left: Date & Net Salary */}
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex flex-col items-center justify-center border border-blue-500/20 shrink-0">
                    <span className="text-[11px] font-bold text-blue-400 uppercase leading-none mb-0.5">{payslip.month.substring(0, 3)}</span>
                    <span className="text-sm font-bold text-white leading-none">{payslip.year}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Net Salary</span>
                    <span className="text-xl font-black text-[#10b981]">{formatCurrency(netSalary)}</span>
                  </div>
                </div>

                {/* Middle: Income & Deductions */}
                <div className="flex items-center gap-8 md:gap-12">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5 text-blue-400 mb-0.5">
                      <ArrowUpRight className="w-3 h-3" />
                      <span className="text-[10px] font-bold uppercase tracking-tight">Total Income</span>
                    </div>
                    <span className="text-sm font-bold text-slate-200">{formatCurrency(totalIncome)}</span>
                  </div>
                  
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5 text-rose-400 mb-0.5">
                      <ArrowDownRight className="w-3 h-3" />
                      <span className="text-[10px] font-bold uppercase tracking-tight">Deductions</span>
                    </div>
                    <span className="text-sm font-bold text-slate-200">{formatCurrency(totalDeductions)}</span>
                  </div>
                </div>

                {/* Right: Action */}
                <div className="flex items-center justify-end">
                  <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-all">
                    <ChevronRight className="w-5 h-5" />
                  </div>
                </div>
              </div>
              
              {/* Subtle background glow on hover */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/0 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            </motion.div>
          );
        })}
      </div>
      
      {history.length === 0 && (
        <div className="text-center py-20 bg-white/5 rounded-[2.5rem] border border-dashed border-white/10">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
            <Wallet className="w-8 h-8 text-slate-500" />
          </div>
          <p className="text-slate-400 font-medium">No data available.</p>
        </div>
      )}
    </div>
  );
}
