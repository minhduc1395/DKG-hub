import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { FileText, ArrowRight, Bell, Calendar as CalendarIcon, File, TrendingUp, CreditCard, Newspaper, Gift, MessageSquare, Users, CheckSquare, ClipboardList, Info, AlertCircle, Loader2 } from 'lucide-react';
import { User } from '../types';
import { NewsModal, NotificationsModal, NewsItem, NotificationItem } from './DashboardModals';
import { supabase } from '../lib/supabaseClient';
import { payslipService } from '../services/payslipService';
import { timeOffService } from '../services/timeOffService';
import { fetchGoogleCalendarEvents } from '../services/googleCalendarService';
import { formatDate } from '../lib/utils';

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
  notifications: NotificationItem[];
  onAction?: (tab: string) => void;
  onMarkAsRead: (id: string | number) => void;
  onMarkAllAsRead: () => void;
}

export function Dashboard({ user, notifications, onAction, onMarkAsRead, onMarkAllAsRead }: DashboardProps) {
  const isManager = user.role === 'manager';
  const today = formatDate(new Date());
  const [showAllNews, setShowAllNews] = useState(false);
  const [showAllNotifications, setShowAllNotifications] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'personal' | 'company'>('all');
  const [expandedNewsId, setExpandedNewsId] = useState<string | null>(null);
  
  const [announcements, setAnnouncements] = useState<NewsItem[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [teamStatus, setTeamStatus] = useState({ onsite: 0, pendingTasks: 0, onLeave: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasFetchedRef = useRef(false);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // If clicking outside the news section, collapse expanded news
      if (!target.closest('.news-item-container')) {
        setExpandedNewsId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!hasFetchedRef.current) {
      fetchDashboardData();
      hasFetchedRef.current = true;
    }
  }, [user.id, isManager]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const promises: Promise<any>[] = [];

      // 1. Fetch Company News
      const newsPromise = Promise.resolve(supabase
        .from('company_news')
        .select('*')
        .order('publish_date', { ascending: false })
        .limit(10));
      promises.push(newsPromise);

      // 2. Fetch Upcoming Events
      const eventsPromise = Promise.resolve(supabase
        .from('events')
        .select('*')
        .gte('event_date', new Date().toISOString().split('T')[0]) // Only future or today's events
        .order('event_date', { ascending: true })
        .limit(10));
      promises.push(eventsPromise);

      // 3. Fetch Google Calendar Events
      const googleEventsPromise = fetchGoogleCalendarEvents();
      promises.push(googleEventsPromise);

      // 4. Fetch Personal Leave Requests
      const leavePromise = Promise.resolve(supabase
        .from('time_off_requests')
        .select('id, start_date, end_date, type')
        .eq('employee_id', user.id)
        .eq('status', 'Approved')
        .gte('end_date', new Date().toISOString().split('T')[0]));
      promises.push(leavePromise);

      // 5. Fetch Task Deadlines
      const tasksPromise = Promise.resolve(supabase
        .from('tasks')
        .select('id, title, deadline')
        .eq('assignee_id', user.id)
        .neq('status', 'Done')
        .gte('deadline', new Date().toISOString().split('T')[0]));
      promises.push(tasksPromise);

      // 6. Manager specific data (Team Status)
      let teamStatusPromise = Promise.resolve(null);
      if (isManager) {
        const todayStr = new Date().toISOString().split('T')[0];
        
        teamStatusPromise = Promise.all([
          supabase
            .from('time_off_requests')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'Approved')
            .lte('start_date', todayStr)
            .gte('end_date', todayStr),
          supabase
            .from('attendance')
            .select('*', { count: 'exact', head: true })
            .eq('date', todayStr)
            .in('status', ['Present', 'Late']),
          supabase
            .from('tasks')
            .select('*', { count: 'exact', head: true })
            .in('status', ['Todo', 'In Progress', 'Review'])
            .neq('assignee_id', user.id)
        ]).then(([onLeaveRes, presentRes, pendingTasksRes]) => ({
          onLeave: onLeaveRes.count || 0,
          onsite: presentRes.count || 0,
          pendingTasks: pendingTasksRes.count || 0
        })) as any;
      }
      promises.push(teamStatusPromise);

      const [newsRes, eventsRes, googleEventsData, leaveRes, tasksRes, teamStatusData] = await Promise.all(promises);

      // Process News
      const newsData = newsRes.data;
      const combinedNews: NewsItem[] = [];
      if (newsData) {
        newsData.forEach((item: any) => {
          const content = item.content || item.description || '';
          combinedNews.push({
            id: `news-${item.id}`,
            title: item.title,
            desc: content, 
            date: formatDate(item.publish_date),
            type: item.type || 'News',
            file: item.file_url ? 'Attachment' : undefined
          });
        });
      }
      setAnnouncements(combinedNews);

      // Process Events
      const eventsData = eventsRes.data || [];
      const allEvents: any[] = [...eventsData.map((event: any) => ({
        id: event.id,
        title: event.title,
        date: new Date(event.event_date),
        time: event.start_time ? event.start_time.slice(0, 5) : 'All Day',
        location: event.location,
        type: 'company'
      }))];

      if (googleEventsData) {
        googleEventsData.forEach((event: any) => {
          allEvents.push({
            id: `google-${event.id}`,
            title: event.title,
            date: new Date(event.start),
            endDate: new Date(event.end),
            time: event.start.getHours() === 0 && event.start.getMinutes() === 0 ? 'All Day' : formatDate(event.start, 'HH:mm'),
            location: event.location,
            type: 'company'
          });
        });
      }

      if (leaveRes.data) {
        leaveRes.data.forEach((leave: any) => {
          allEvents.push({
            id: `leave-${leave.id}`,
            title: `${leave.type} Leave`,
            date: new Date(leave.start_date),
            endDate: new Date(leave.end_date),
            time: 'All Day',
            type: 'personal'
          });
        });
      }

      if (tasksRes.data) {
        tasksRes.data.forEach((task: any) => {
          allEvents.push({
            id: `task-${task.id}`,
            title: `Deadline: ${task.title}`,
            date: new Date(task.deadline),
            time: 'All Day',
            type: 'deadline'
          });
        });
      }

      // Filter for next 7 days and sort
      const now = new Date();
      const nextWeek = new Date();
      nextWeek.setDate(now.getDate() + 7);

      const filteredEvents = allEvents.filter(e => {
        const start = new Date(e.date);
        const end = e.endDate ? new Date(e.endDate) : new Date(e.date);
        const isNotCancelled = !e.title.toLowerCase().includes('cancel');
        return end >= now && start <= nextWeek && isNotCancelled;
      });

      filteredEvents.sort((a, b) => a.date.getTime() - b.date.getTime());
      
      const formattedEvents = filteredEvents.map(event => ({
        ...event,
        date: formatDate(event.date, 'dd MMM')
      }));

      setUpcomingEvents(formattedEvents);

      // Process Team Status
      if (teamStatusData) {
        setTeamStatus(teamStatusData);
      }

    } catch (error: any) {
      console.error("Error fetching dashboard data:", error);
      if (error.message === 'Failed to fetch') {
        setError('Connection error: Please check your Supabase configuration.');
      } else {
        setError('Failed to load dashboard data.');
      }
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

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-red-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Dashboard Error</h2>
        <p className="text-slate-400 max-w-md mb-6">{error}</p>
        <button 
          onClick={() => {
            setError(null);
            fetchDashboardData();
          }}
          className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <>
      <NewsModal isOpen={showAllNews} onClose={() => setShowAllNews(false)} news={announcements} />
      <NotificationsModal 
        isOpen={showAllNotifications} 
        onClose={() => setShowAllNotifications(false)} 
        notifications={notifications} 
        onMarkAsRead={onMarkAsRead}
        onMarkAllAsRead={onMarkAllAsRead}
      />
      
      <div className="flex flex-col gap-8 max-w-6xl mx-auto w-full animate-in fade-in duration-500">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex flex-col gap-1 py-0.5">
            <h1 className="text-white text-2xl md:text-4xl font-black tracking-tight leading-tight">Welcome back, {user.name.split(' ')[0]}</h1>
            <p className="text-slate-400 text-sm md:text-base leading-none">Welcome back to DKG</p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowAllNotifications(true)}
              className="hidden lg:flex relative p-2 rounded-full hover:bg-white/5 text-slate-400 hover:text-white transition-colors mr-2"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-[#0F1115]" />
              )}
            </button>
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">Today:</span>
            <span className="text-sm font-semibold text-white bg-white/5 px-4 py-1.5 rounded-full border border-white/10 shadow-sm">
              {today}
            </span>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Company News - Moved to top on mobile */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="order-1 lg:order-1 lg:col-span-2 relative overflow-hidden rounded-[2rem] bg-white/5 border border-white/5 flex flex-col p-6 md:p-8"
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
              {announcements.slice(0, 5).map((item, index) => {
                const isFirst = index === 0;
                const isExpanded = expandedNewsId === item.id;
                
                return (
                  <div key={item.id} className="news-item-container">
                    <div 
                      onClick={() => setExpandedNewsId(isExpanded ? null : (item.id as string))}
                      className={`p-5 rounded-2xl transition-all duration-300 group cursor-pointer border ${
                        isExpanded 
                          ? 'bg-white/10 border-indigo-500/40 shadow-lg shadow-indigo-500/10' 
                          : 'border-white/5 hover:bg-white/5 hover:-translate-y-0.5 hover:shadow-md hover:shadow-black/20'
                      }`}
                    >
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                            isExpanded ? 'bg-indigo-500/20 text-indigo-300' : 'bg-blue-500/20 text-blue-300'
                          }`}>
                            {item.type}
                          </span>
                          <span className="text-[11px] font-medium text-slate-400">{item.date}</span>
                        </div>
                        
                        <h3 className={`text-lg font-bold leading-tight transition-colors ${
                          isExpanded ? 'text-indigo-300' : 'text-white group-hover:text-blue-300'
                        }`}>
                          {item.title}
                        </h3>
                        
                        {isExpanded ? (
                          <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="overflow-hidden"
                          >
                            <div 
                              className="text-slate-300 text-sm leading-relaxed space-y-2 mt-2 pt-4 border-t border-white/10 [&>h1]:text-xl [&>h1]:font-bold [&>h1]:text-white [&>h1]:mt-4 [&>h2]:text-lg [&>h2]:font-bold [&>h2]:text-white [&>h2]:mt-3 [&>ul]:list-disc [&>ul]:pl-5 [&>ol]:list-decimal [&>ol]:pl-5 [&>a]:text-blue-400 [&>a]:underline [&>img]:rounded-xl [&>img]:mt-2 [&>img]:w-full [&>img]:object-cover [&>blockquote]:border-l-4 [&>blockquote]:border-indigo-500 [&>blockquote]:pl-4 [&>blockquote]:italic [&>blockquote]:text-slate-400"
                              dangerouslySetInnerHTML={{ __html: item.desc }}
                              onClick={(e) => e.stopPropagation()} // Prevent collapsing when clicking content
                            />
                          </motion.div>
                        ) : (
                          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium group-hover:text-blue-400 transition-colors">
                            <Info className="w-3.5 h-3.5" />
                            <span>Click to view details</span>
                          </div>
                        )}

                        {item.file && (
                          <div 
                            className="flex items-center gap-2 mt-2 pt-3 border-t border-white/5"
                            onClick={(e) => e.stopPropagation()} // Prevent toggle when clicking file
                          >
                            <div className="w-6 h-6 rounded bg-white/10 flex items-center justify-center">
                              <FileText className="w-3 h-3 text-slate-300" />
                            </div>
                            <span className="text-xs font-medium text-slate-400">{item.file}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    {isFirst && announcements.length > 1 && (
                      <div className="my-4 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                    )}
                  </div>
                );
              })}
              {announcements.length === 0 && (
                <div className="text-center py-12 text-slate-500">
                  No data available.
                </div>
              )}
            </div>
          </motion.div>

          {/* Notifications & Team Status - Team Status moved to bottom on mobile */}
          <div className="order-2 lg:order-2 lg:col-span-1 flex flex-col gap-6">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="relative overflow-hidden rounded-[2rem] bg-white/5 border border-white/5 flex flex-col p-6 md:p-8 flex-1"
            >
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

            {isManager && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="order-3 relative overflow-hidden rounded-[2rem] bg-white/5 border border-white/5 flex flex-col p-6 md:p-8"
              >
                 <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2 text-teal-400">
                    <Users className="w-5 h-5" />
                    <span className="text-sm font-bold uppercase tracking-wider">Team Status</span>
                  </div>
                </div>
                <div className="flex flex-col gap-4">
                  <div className="flex items-start justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
                    <div className="flex flex-col items-center">
                      <span className="text-2xl font-black text-white">{teamStatus.onsite}</span>
                      <span className="text-xs text-slate-400 font-bold uppercase">Onsite</span>
                    </div>
                    <div 
                      className="flex flex-col items-center cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => onAction && onAction('team-status')}
                    >
                      <span className="text-2xl font-black text-white">{teamStatus.pendingTasks}</span>
                      <span className="text-xs text-slate-400 font-bold uppercase text-center">Pending<br/>Tasks</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-2xl font-black text-white">{teamStatus.onLeave}</span>
                      <span className="text-xs text-slate-400 font-bold uppercase">On Leave</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
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
