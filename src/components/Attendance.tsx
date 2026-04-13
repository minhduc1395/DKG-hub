import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Calendar as CalendarIcon, Clock, ArrowUpRight, ArrowDownRight, Loader2, AlertCircle } from 'lucide-react';
import { User } from '../types';
import { supabase } from '../lib/supabaseClient';
import { formatDate } from '../lib/utils';

interface AttendanceRecord {
  id: string;
  date: string;
  checkIn: string;
  checkOut: string;
  status: 'On Time' | 'Late' | 'Early Leave' | 'Absent' | 'Half Day';
  workHours: number;
}

interface AttendanceProps {
  user: User;
}

export function Attendance({ user }: AttendanceProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAttendanceData();

    // Subscribe to real-time updates for attendance_logs
    const channel = supabase
      .channel('attendance-logs-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'attendance_logs',
        filter: `employee_id=eq.${user.id}`
      }, () => {
        fetchAttendanceData(true);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user.id, currentDate]);

  const fetchAttendanceData = async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    setError(null);
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
      const endDate = new Date(year, month, 0).toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('attendance_logs')
        .select('*')
        .eq('employee_id', user.id)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });

      if (error) throw error;

      const formattedRecords: AttendanceRecord[] = (data || []).map(record => ({
        id: record.id,
        date: record.date,
        checkIn: record.check_in,
        checkOut: record.check_out,
        status: record.status as AttendanceRecord['status'],
        workHours: record.work_hours
      }));

      setRecords(formattedRecords);
    } catch (err: any) {
      console.error('Error fetching attendance:', err);
      setError('Failed to load attendance data.');
    } finally {
      if (!isSilent) setIsLoading(false);
    }
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  // Calculate metrics
  const daysPresent = records.filter(r => r.status === 'On Time' || r.status === 'Late' || r.status === 'Early Leave').length;
  const lateArrivals = records.filter(r => r.status === 'Late').length;
  const totalWorkHours = records.reduce((sum, r) => sum + (r.workHours || 0), 0);
  const avgHours = daysPresent > 0 ? (totalWorkHours / daysPresent).toFixed(1) : '0.0';
  const totalDaysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto w-full">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-white text-3xl md:text-4xl font-black tracking-tight">Attendance Log</h1>
          <p className="text-blue-200/60 text-base">View your check-in and check-out history.</p>
        </div>
        <div className="flex items-center gap-3 bg-white/[0.03] backdrop-blur-2xl p-1.5 rounded-xl border border-white/10 shadow-[inset_0_0_30px_rgba(255,255,255,0.02)] w-full sm:w-auto">
          <button 
            onClick={prevMonth}
            className="px-4 py-2 rounded-lg text-slate-400 hover:text-white text-sm font-medium transition-colors flex-1 sm:flex-none justify-center whitespace-nowrap"
          >
            Previous
          </button>
          <span className="text-white font-bold px-2">
            {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </span>
          <button 
            onClick={nextMonth}
            className="px-4 py-2 rounded-lg text-slate-400 hover:text-white text-sm font-medium transition-colors flex-1 sm:flex-none justify-center whitespace-nowrap"
            disabled={currentDate.getMonth() === new Date().getMonth() && currentDate.getFullYear() === new Date().getFullYear()}
          >
            Next
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3 text-red-400">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-2">
            <div className="bg-white/[0.03] backdrop-blur-2xl rounded-3xl p-6 border border-white/10 shadow-[inset_0_0_30px_rgba(255,255,255,0.02)] flex flex-col gap-2">
              <div className="flex items-center gap-2 text-emerald-400 mb-2">
                <Clock className="w-5 h-5" />
                <span className="text-sm font-bold uppercase tracking-wider">Avg. Hours</span>
              </div>
              <span className="text-3xl font-black text-white">{avgHours}<span className="text-lg text-slate-400 font-medium">h / day</span></span>
            </div>
            <div className="bg-white/[0.03] backdrop-blur-2xl rounded-3xl p-6 border border-white/10 shadow-[inset_0_0_30px_rgba(255,255,255,0.02)] flex flex-col gap-2">
              <div className="flex items-center gap-2 text-blue-400 mb-2">
                <CalendarIcon className="w-5 h-5" />
                <span className="text-sm font-bold uppercase tracking-wider">Days Present</span>
              </div>
              <span className="text-3xl font-black text-white">{daysPresent}<span className="text-lg text-slate-400 font-medium"> / {totalDaysInMonth}</span></span>
            </div>
            <div className="bg-white/[0.03] backdrop-blur-2xl rounded-3xl p-6 border border-white/10 shadow-[inset_0_0_30px_rgba(255,255,255,0.02)] flex flex-col gap-2">
              <div className="flex items-center gap-2 text-orange-400 mb-2">
                <ArrowDownRight className="w-5 h-5" />
                <span className="text-sm font-bold uppercase tracking-wider">Late Arrivals</span>
              </div>
              <span className="text-3xl font-black text-white">{lateArrivals}<span className="text-lg text-slate-400 font-medium"> this month</span></span>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-3xl bg-white/[0.03] backdrop-blur-2xl shadow-[inset_0_0_30px_rgba(255,255,255,0.02)] border border-white/10 flex flex-col">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-400">
                <thead className="bg-white/[0.03] text-xs uppercase text-slate-300 font-bold tracking-wider">
                  <tr>
                    <th className="px-6 py-5">Date</th>
                    <th className="px-6 py-5">Check In</th>
                    <th className="px-6 py-5">Check Out</th>
                    <th className="px-6 py-5">Total Hours</th>
                    <th className="px-6 py-5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {records.map((log, index) => (
                    <motion.tr 
                      key={log.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="hover:bg-white/5 transition-colors"
                    >
                      <td className="px-6 py-5 font-medium text-white">{formatDate(log.date)}</td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                          {log.checkIn || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          <ArrowDownRight className="w-4 h-4 text-orange-400" />
                          {log.checkOut || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-5 font-medium text-slate-300">{log.workHours ? `${log.workHours}h` : '-'}</td>
                      <td className="px-6 py-5">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                          log.status === 'On Time' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                          log.status === 'Late' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                          'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                    </motion.tr>
                  ))}
                  {records.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                        No data available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
