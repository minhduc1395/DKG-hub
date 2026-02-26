import { motion } from 'motion/react';
import { Calendar as CalendarIcon, Clock, ArrowUpRight, ArrowDownRight } from 'lucide-react';

const attendanceLogs = [
  { id: 1, date: 'Oct 24, 2023', checkIn: '08:55 AM', checkOut: '05:05 PM', status: 'On Time', hours: '8h 10m' },
  { id: 2, date: 'Oct 23, 2023', checkIn: '09:15 AM', checkOut: '05:30 PM', status: 'Late', hours: '8h 15m' },
  { id: 3, date: 'Oct 20, 2023', checkIn: '08:50 AM', checkOut: '04:00 PM', status: 'Early Leave', hours: '7h 10m' },
  { id: 4, date: 'Oct 19, 2023', checkIn: '09:00 AM', checkOut: '05:00 PM', status: 'On Time', hours: '8h 00m' },
  { id: 5, date: 'Oct 18, 2023', checkIn: '08:58 AM', checkOut: '05:15 PM', status: 'On Time', hours: '8h 17m' },
];

export function Attendance() {
  return (
    <div className="flex flex-col gap-8 max-w-6xl mx-auto w-full">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-white text-3xl md:text-4xl font-black tracking-tight">Attendance Log</h1>
          <p className="text-blue-200/60 text-base">View your check-in and check-out history.</p>
        </div>
        <div className="flex items-center gap-3 bg-white/5 p-1.5 rounded-xl border border-white/10 w-full sm:w-auto">
          <button 
            onClick={() => alert("This feature will be updated later.")}
            className="px-4 py-2 rounded-lg bg-white/10 text-white text-sm font-bold shadow-sm flex-1 sm:flex-none justify-center whitespace-nowrap"
          >
            This Month
          </button>
          <button 
            onClick={() => alert("This feature will be updated later.")}
            className="px-4 py-2 rounded-lg text-slate-400 hover:text-white text-sm font-medium transition-colors flex-1 sm:flex-none justify-center whitespace-nowrap"
          >
            Last Month
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-2">
        <div className="bg-white/5 backdrop-blur-md rounded-3xl p-6 border border-white/10 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-emerald-400 mb-2">
            <Clock className="w-5 h-5" />
            <span className="text-sm font-bold uppercase tracking-wider">Avg. Hours</span>
          </div>
          <span className="text-3xl font-black text-white">8.2<span className="text-lg text-slate-400 font-medium">h / day</span></span>
        </div>
        <div className="bg-white/5 backdrop-blur-md rounded-3xl p-6 border border-white/10 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-blue-400 mb-2">
            <CalendarIcon className="w-5 h-5" />
            <span className="text-sm font-bold uppercase tracking-wider">Days Present</span>
          </div>
          <span className="text-3xl font-black text-white">18<span className="text-lg text-slate-400 font-medium"> / 22</span></span>
        </div>
        <div className="bg-white/5 backdrop-blur-md rounded-3xl p-6 border border-white/10 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-orange-400 mb-2">
            <ArrowDownRight className="w-5 h-5" />
            <span className="text-sm font-bold uppercase tracking-wider">Late Arrivals</span>
          </div>
          <span className="text-3xl font-black text-white">2<span className="text-lg text-slate-400 font-medium"> this month</span></span>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-3xl bg-white/5 backdrop-blur-md shadow-2xl border border-white/10 flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-400">
            <thead className="bg-white/5 text-xs uppercase text-slate-300 font-bold tracking-wider">
              <tr>
                <th className="px-6 py-5">Date</th>
                <th className="px-6 py-5">Check In</th>
                <th className="px-6 py-5">Check Out</th>
                <th className="px-6 py-5">Total Hours</th>
                <th className="px-6 py-5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {attendanceLogs.map((log, index) => (
                <motion.tr 
                  key={log.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="hover:bg-white/5 transition-colors"
                >
                  <td className="px-6 py-5 font-medium text-white">{log.date}</td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2">
                      <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                      {log.checkIn}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2">
                      <ArrowDownRight className="w-4 h-4 text-orange-400" />
                      {log.checkOut}
                    </div>
                  </td>
                  <td className="px-6 py-5 font-medium text-slate-300">{log.hours}</td>
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
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
