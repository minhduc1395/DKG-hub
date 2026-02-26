import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { FileText, ArrowRight, Bell, Calendar as CalendarIcon, File, TrendingUp, CreditCard, Newspaper, Gift, MessageSquare, Users, CheckSquare, ClipboardList, Info, AlertCircle, Loader2 } from 'lucide-react';
import { User } from '../types';
import { NewsModal, NotificationsModal, NewsItem, NotificationItem } from './DashboardModals';
import { supabase } from '../lib/supabaseClient';
import { payslipService } from '../services/payslipService';
import { timeOffService } from '../services/timeOffService';

const staffQuickActions = [
  { id: 'request-time-off', label: 'Request Time Off', icon: CalendarIcon, iconBg: 'bg-indigo-500/20', iconColor: 'text-indigo-400' },
  { id: 'payslip', label: 'View Payslips', icon: CreditCard, iconBg: 'bg-emerald-500/20', iconColor: 'text-emerald-400' },
  { id: 'documents', label: 'My Documents', icon: File, iconBg: 'bg-sky-500/20', iconColor: 'text-sky-400' },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare, iconBg: 'bg-blue-600/20', iconColor: 'text-blue-400' },
];

const managerQuickActions = [
  { id: 'approvals', label: 'Leave Approvals', icon: CheckSquare, iconBg: 'bg-indigo-500/20', iconColor: 'text-indigo-400' },
  { id: 'payslip-approvals', label: 'Payslip Approvals', icon: ClipboardList, iconBg: 'bg-emerald-500/20', iconColor: 'text-emerald-400' },
  { id: 'team-status', label: 'Team Status', icon: Users, iconBg: 'bg-teal-500/20', iconColor: 'text-teal-400' },
  { id: 'documents', label: 'My Documents', icon: File, iconBg: 'bg-sky-500/20', iconColor: 'text-sky-400' },
  { id: 'finance', label: 'Company Finance', icon: TrendingUp, iconBg: 'bg-blue-600/20', iconColor: 'text-blue-400' },
];

interface DashboardProps {
  user: User;
  onAction?: (tab: string) => void;
}

export function Dashboard({ user, onAction }: DashboardProps) {
  const isManager = user.role === 'manager';
  const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const [showAllNews, setShowAllNews] = useState(false);
  const [showAllNotifications, setShowAllNotifications] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'personal' | 'company'>('all');
  
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [announcements, setAnnouncements] = useState<NewsItem[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [teamStatus, setTeamStatus] = useState({ onsite: 0, remote: 0, onLeave: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [user.id, isManager]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const newNotifications: NotificationItem[] = [];

      // 1. Fetch recent tasks assigned to user
      const { data: tasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('assignee_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3);

      if (tasks) {
        tasks.forEach(task => {
          newNotifications.push({
            id: `task-${task.id}`,
            icon: CheckSquare,
            iconBg: 'bg-teal-500/20',
            iconColor: 'text-teal-400',
            title: 'Task Assigned',
            desc: `You have been assigned to "${task.title}".`,
            time: new Date(task.created_at).toLocaleDateString(),
            category: 'task',
            recipient_id: user.id
          });
        });
      }

      // 2. Fetch recent payslips
      const payslips = await payslipService.getMyPayslips(user.id);
      if (payslips.length > 0) {
        const latestPayslip = payslips[0];
        newNotifications.push({
          id: `payslip-${latestPayslip.id}`,
          icon: FileText,
          iconBg: 'bg-blue-500/20',
          iconColor: 'text-blue-400',
          title: 'Payslip Available',
          desc: `Your payslip for ${latestPayslip.month} ${latestPayslip.year} is available.`,
          time: 'Recently',
          category: 'system',
          recipient_id: user.id
        });
      }

      // 3. Manager specific notifications
      if (isManager) {
        // Pending Leave Requests
        const pendingLeaves = await timeOffService.fetchPendingApprovals(user.id);
        if (pendingLeaves.length > 0) {
          newNotifications.push({
            id: 'pending-leaves',
            icon: Bell,
            iconBg: 'bg-rose-500/20',
            iconColor: 'text-rose-400',
            title: 'Leave Approvals',
            desc: `You have ${pendingLeaves.length} pending leave requests.`,
            time: 'Now',
            category: 'task',
            recipient_id: user.id
          });
        }

        // Pending Payslip Requests
        const pendingPayslips = await payslipService.getPendingPayslips();
        if (pendingPayslips.length > 0) {
          newNotifications.push({
            id: 'pending-payslips',
            icon: ClipboardList,
            iconBg: 'bg-emerald-500/20',
            iconColor: 'text-emerald-400',
            title: 'Payslip Approvals',
            desc: `You have ${pendingPayslips.length} pending payslip approvals.`,
            time: 'Now',
            category: 'task',
            recipient_id: user.id
          });
        }

        // Team Status (Onsite/Remote/On Leave)
        // This is an approximation based on today's data
        const todayStr = new Date().toISOString().split('T')[0];
        
        // Count On Leave
        const { count: onLeaveCount } = await supabase
          .from('time_off_requests')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'Approved')
          .lte('start_date', todayStr)
          .gte('end_date', todayStr);

        // Count Present (Onsite)
        const { count: presentCount } = await supabase
          .from('attendance')
          .select('*', { count: 'exact', head: true })
          .eq('date', todayStr)
          .in('status', ['Present', 'Late']);

        setTeamStatus({
          onsite: presentCount || 0,
          remote: 0, // We don't have remote tracking yet
          onLeave: onLeaveCount || 0
        });
      }

      setNotifications(newNotifications);
      // Announcements and Events are empty for now as requested
      setAnnouncements([]);
      setUpcomingEvents([]);

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredNotifications = notifications.filter(item => {
    if (activeTab === 'all') return true;
    if (activeTab === 'personal') return item.recipient_id !== null;
    if (activeTab === 'company') return item.recipient_id === null;
    return true;
  });

  const displayQuickActions = isManager ? managerQuickActions : staffQuickActions;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <NewsModal isOpen={showAllNews} onClose={() => setShowAllNews(false)} news={announcements} />
      <NotificationsModal isOpen={showAllNotifications} onClose={() => setShowAllNotifications(false)} notifications={notifications} />
      
      <div className="flex flex-col gap-8 max-w-6xl mx-auto w-full animate-in fade-in duration-500">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex flex-col justify-between h-16 py-0.5">
            <h1 className="text-white text-3xl md:text-4xl font-black tracking-tight leading-none">Welcome back, {user.name.split(' ')[0]} 👋</h1>
            <p className="text-slate-400 text-base leading-none">Welcome back to DKG</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">Today:</span>
            <span className="text-sm font-semibold text-white bg-white/5 px-4 py-1.5 rounded-full border border-white/10 shadow-sm">
              {today}
            </span>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Notifications & Team Status - Moved to top on mobile */}
          <div className="order-1 lg:order-2 lg:col-span-1 flex flex-col gap-6">
            {isManager && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden rounded-[2rem] bg-white/5 border border-white/5 flex flex-col p-6 md:p-8"
              >
                 <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2 text-teal-400">
                    <Users className="w-5 h-5" />
                    <span className="text-sm font-bold uppercase tracking-wider">Team Status</span>
                  </div>
                </div>
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
                    <div className="flex flex-col items-center">
                      <span className="text-2xl font-black text-white">{teamStatus.onsite}</span>
                      <span className="text-xs text-slate-400 font-bold uppercase">Onsite</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-2xl font-black text-white">{teamStatus.remote}</span>
                      <span className="text-xs text-slate-400 font-bold uppercase">Remote</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-2xl font-black text-white">{teamStatus.onLeave}</span>
                      <span className="text-xs text-slate-400 font-bold uppercase">On Leave</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="relative overflow-hidden rounded-[2rem] bg-white/5 border border-white/5 flex flex-col p-6 md:p-8 flex-1"
            >
              {/* Top Half: Notifications */}
              <div className="flex-1 border-b border-white/10 pb-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-white">Notifications</h3>
                  {notifications.length > 0 && (
                    <button 
                      onClick={() => setShowAllNotifications(true)}
                      className="text-blue-300 hover:text-blue-400 text-sm font-medium"
                    >
                      View all
                    </button>
                  )}
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-2 mb-6">
                  {(['all', 'personal', 'company'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                        activeTab === tab 
                          ? 'bg-white/10 text-white' 
                          : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                      }`}
                    >
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                  ))}
                </div>
                
                <div className="flex flex-col gap-6">
                  {filteredNotifications.slice(0, 3).map((item) => (
                    <div 
                      key={item.id} 
                      className="flex gap-4 group"
                    >
                      <div className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center ${item.iconBg}`}>
                        <item.icon className={`w-5 h-5 ${item.iconColor}`} />
                      </div>
                      <div className="flex flex-col gap-1">
                        <p className="text-sm font-bold text-white leading-tight group-hover:text-blue-300 transition-colors">{item.title}</p>
                        <p className="text-slate-400 text-sm leading-snug">{item.desc}</p>
                        <span className="text-[10px] text-slate-500 font-medium mt-1">{item.time}</span>
                      </div>
                    </div>
                  ))}
                  {filteredNotifications.length === 0 && (
                    <div className="text-center py-4 text-slate-500 text-sm">
                      No data available.
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Half: Upcoming Events */}
              <div className="flex-1">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-white">Upcoming Events</h3>
                  {upcomingEvents.length > 0 && (
                    <button 
                      onClick={() => onAction?.('calendar')}
                      className="text-blue-300 hover:text-blue-400 text-sm font-medium"
                    >
                      Calendar
                    </button>
                  )}
                </div>

                <div className="flex flex-col gap-4">
                  {upcomingEvents.map((event) => (
                    <div key={event.id} className="flex items-center gap-4 p-3 rounded-xl bg-white/5 border border-white/5">
                      <div className="flex flex-col items-center justify-center w-12 h-12 bg-white/5 rounded-lg border border-white/10">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">{event.date.split(' ')[0]}</span>
                        <span className="text-lg font-black text-white leading-none">{event.date.split(' ')[1]}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-white">{event.title}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-medium text-slate-400">{event.time}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {upcomingEvents.length === 0 && (
                    <div className="text-center py-4 text-slate-500 text-sm">
                      No data available.
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>

          {/* Company News - Moved to bottom on mobile */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="order-2 lg:order-1 lg:col-span-2 relative overflow-hidden rounded-[2rem] bg-white/5 border border-white/5 flex flex-col p-6 md:p-8"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2 text-blue-300">
                <Newspaper className="w-5 h-5" />
                <span className="text-sm font-bold uppercase tracking-wider">What's new today?</span>
              </div>
              {announcements.length > 0 && (
                <button 
                  onClick={() => setShowAllNews(true)}
                  className="text-xs font-medium text-slate-400 hover:text-blue-300 transition-colors flex items-center gap-1"
                >
                  See all
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
            
            <div className="flex flex-col gap-4">
              {announcements.slice(0, 3).map((item) => (
                <div 
                  key={item.id} 
                  className="p-5 rounded-2xl border border-white/5 hover:bg-white/5 transition-all group cursor-pointer"
                >
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 uppercase tracking-wide">
                        {item.type}
                      </span>
                      <span className="text-[11px] font-medium text-slate-400">{item.date}</span>
                    </div>
                    <h3 className="text-lg font-bold text-white group-hover:text-blue-300 transition-colors leading-tight">
                      {item.title}
                    </h3>
                    <p className="text-slate-400 text-sm leading-relaxed">
                      {item.desc}
                    </p>
                    {item.file && (
                      <div className="flex items-center gap-2 mt-2 pt-3 border-t border-white/5">
                        <div className="w-6 h-6 rounded bg-white/10 flex items-center justify-center">
                          <FileText className="w-3 h-3 text-slate-300" />
                        </div>
                        <span className="text-xs font-medium text-slate-400">{item.file}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {announcements.length === 0 && (
                <div className="text-center py-12 text-slate-500">
                  No data available.
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Quick Actions */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={`grid grid-cols-2 ${isManager ? 'md:grid-cols-5' : 'md:grid-cols-4'} gap-4`}
        >
          {displayQuickActions.map((action) => (
            <button 
              key={action.id} 
              onClick={() => {
                if (action.id) {
                  onAction?.(action.id);
                }
              }}
              className="flex flex-col items-center justify-center gap-4 p-8 rounded-[2rem] bg-white/5 border border-white/5 hover:border-blue-500/30 hover:bg-white/10 transition-all group"
            >
              <div className={`w-14 h-14 rounded-full flex items-center justify-center ${action.iconBg} group-hover:scale-110 transition-transform`}>
                <action.icon className={`w-6 h-6 ${action.iconColor}`} />
              </div>
              <span className="font-semibold text-white text-sm">{action.label}</span>
            </button>
          ))}
        </motion.div>
      </div>
    </>
  );
}
