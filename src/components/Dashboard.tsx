import { useState } from 'react';
import { motion } from 'motion/react';
import { FileText, ArrowRight, Bell, Calendar as CalendarIcon, File, TrendingUp, CreditCard, Newspaper, Gift, MessageSquare, Users, CheckSquare, UserPlus, Info, AlertCircle } from 'lucide-react';
import { User } from '../types';
import { NewsModal, NotificationsModal, NewsItem, NotificationItem } from './DashboardModals';

const announcements: NewsItem[] = [
  {
    id: 1,
    type: 'ANNOUNCEMENT',
    date: 'Oct 28, 2023',
    title: 'Q4 Town Hall Meeting & Strategy Update',
    desc: 'Join us for the upcoming quarterly meeting where we will discuss our strategic goals for the remainder of the year and celebrate recent milestones.',
    file: 'Strategy_Update_Q4.pdf'
  },
  {
    id: 2,
    type: 'CULTURE',
    date: '2 days ago',
    title: 'New Wellness Benefits Program',
    desc: 'We are excited to introduce a new comprehensive wellness program designed to support your physical and mental health journey starting next month.',
    file: 'Benefits_Guide_2023.pdf'
  },
  {
    id: 3,
    type: 'TEAM',
    date: '4 hours ago',
    title: 'Welcome our new Design Lead',
    desc: 'Please join us in welcoming Sarah Jenkins to the team as our new Senior Design Lead. She brings over 10 years of experience in product design.',
  },
  // Expanded data for "See all"
  {
    id: 4,
    type: 'SYSTEM',
    date: 'Oct 20, 2023',
    title: 'System Maintenance Scheduled',
    desc: 'The HR portal will be undergoing scheduled maintenance this Sunday from 2 AM to 4 AM EST. Please save your work.',
  },
  {
    id: 5,
    type: 'POLICY',
    date: 'Oct 15, 2023',
    title: 'Updated Remote Work Policy',
    desc: 'We have updated our remote work policy to provide more flexibility. Please review the new guidelines in the Documents section.',
    file: 'Remote_Work_Policy_v2.pdf'
  },
  {
    id: 6,
    type: 'EVENT',
    date: 'Oct 10, 2023',
    title: 'Annual Charity Run',
    desc: 'Registration for the annual charity run is now open. Join us in supporting local communities!',
  }
];

const notifications: NotificationItem[] = [
  {
    id: 1,
    icon: FileText,
    iconBg: 'bg-blue-500/20',
    iconColor: 'text-blue-400',
    title: 'Payslip Available',
    desc: 'Your payslip for October 2023 is now available for download.',
    time: '2 hours ago',
    category: 'system',
    recipient_id: 'user_123' // Personal
  },
  {
    id: 2,
    icon: Gift,
    iconBg: 'bg-cyan-500/20',
    iconColor: 'text-cyan-400',
    title: 'Holiday Reminder',
    desc: 'Office will be closed on Monday for Labor Day.',
    time: '1 day ago',
    category: 'reminder',
    recipient_id: null // Company
  },
  {
    id: 3,
    icon: MessageSquare,
    iconBg: 'bg-indigo-500/20',
    iconColor: 'text-indigo-400',
    title: 'Performance Review',
    desc: 'Please complete your self-assessment by Friday.',
    time: '3 days ago',
    category: 'task',
    recipient_id: 'user_123' // Personal
  },
  // Expanded data for "View all"
  {
    id: 4,
    icon: CheckSquare,
    iconBg: 'bg-teal-500/20',
    iconColor: 'text-teal-400',
    title: 'Task Assigned',
    desc: 'You have been assigned to the "Q4 Planning" task force.',
    time: '4 days ago',
    category: 'task',
    recipient_id: 'user_123' // Personal
  },
  {
    id: 5,
    icon: AlertCircle,
    iconBg: 'bg-amber-500/20',
    iconColor: 'text-amber-400',
    title: 'Password Expiry',
    desc: 'Your password will expire in 5 days. Please update it soon.',
    time: '5 days ago',
    category: 'system',
    recipient_id: 'user_123' // Personal
  },
  {
    id: 6,
    icon: Users,
    iconBg: 'bg-purple-500/20',
    iconColor: 'text-purple-400',
    title: 'Team Lunch',
    desc: 'Don\'t forget the team lunch at 12:30 PM today!',
    time: '1 week ago',
    category: 'reminder',
    recipient_id: null // Company
  },
  {
    id: 7,
    icon: Info,
    iconBg: 'bg-slate-500/20',
    iconColor: 'text-slate-400',
    title: 'Policy Update',
    desc: 'Please review the updated IT security policy.',
    time: '1 week ago',
    category: 'news',
    recipient_id: null // Company
  }
];

const quickActions = [
  { id: 1, label: 'Request Time Off', icon: CalendarIcon, iconBg: 'bg-indigo-500/20', iconColor: 'text-indigo-400' },
  { id: 2, label: 'View Payslips', icon: CreditCard, iconBg: 'bg-emerald-500/20', iconColor: 'text-emerald-400' },
  { id: 3, label: 'My Documents', icon: File, iconBg: 'bg-sky-500/20', iconColor: 'text-sky-400' },
  { id: 4, label: 'Company Finance', icon: TrendingUp, iconBg: 'bg-blue-600/20', iconColor: 'text-blue-400' },
];

interface DashboardProps {
  user: User;
  onAction?: (tab: string) => void;
}

const upcomingEvents = [
  {
    id: 1,
    title: 'Q4 Town Hall',
    date: 'Oct 28',
    time: '2:00 PM',
    type: 'Company'
  },
  {
    id: 2,
    title: 'Halloween Party',
    date: 'Oct 31',
    time: '4:00 PM',
    type: 'Social'
  }
];

export function Dashboard({ user, onAction }: DashboardProps) {
  const isManager = user.role === 'manager';
  const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const [showAllNews, setShowAllNews] = useState(false);
  const [showAllNotifications, setShowAllNotifications] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'personal' | 'company'>('all');

  const displayNotifications = isManager 
    ? [
        {
          id: 0,
          icon: Bell,
          iconBg: 'bg-rose-500/20',
          iconColor: 'text-rose-400',
          title: 'Approval Alert',
          desc: 'Alex requested leave for 2 days.',
          time: '10 mins ago',
          category: 'task' as const,
          recipient_id: 'manager_123'
        },
        ...notifications
      ]
    : notifications;

  const filteredNotifications = displayNotifications.filter(item => {
    if (activeTab === 'all') return true;
    if (activeTab === 'personal') return item.recipient_id !== null;
    if (activeTab === 'company') return item.recipient_id === null;
    return true;
  });

  const displayQuickActions = isManager
    ? [
        ...quickActions,
        { id: 5, label: 'Review Pending', icon: CheckSquare, iconBg: 'bg-teal-500/20', iconColor: 'text-teal-400' }
      ]
    : [
        ...quickActions.map(a => a.id === 4 ? { ...a, label: 'Register Form', icon: UserPlus } : a)
      ];

  return (
    <>
      <NewsModal isOpen={showAllNews} onClose={() => setShowAllNews(false)} news={announcements} />
      <NotificationsModal isOpen={showAllNotifications} onClose={() => setShowAllNotifications(false)} notifications={displayNotifications} />
      
      <div className="flex flex-col gap-8 max-w-6xl mx-auto w-full">
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
          {/* Company News */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-2 relative overflow-hidden rounded-[2rem] bg-white/5 border border-white/5 flex flex-col p-6 md:p-8"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2 text-blue-300">
                <Newspaper className="w-5 h-5" />
                <span className="text-sm font-bold uppercase tracking-wider">What's new today?</span>
              </div>
              <button 
                onClick={() => setShowAllNews(true)}
                className="text-xs font-medium text-slate-400 hover:text-blue-300 transition-colors flex items-center gap-1"
              >
                See all
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex flex-col gap-4">
              {announcements.slice(0, 3).map((item) => (
                <div 
                  key={item.id} 
                  onClick={() => alert("This feature will be updated later.")}
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
            </div>
          </motion.div>

          {/* Notifications & Team Status */}
          <div className="lg:col-span-1 flex flex-col gap-6">
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
                      <span className="text-2xl font-black text-white">12</span>
                      <span className="text-xs text-slate-400 font-bold uppercase">Onsite</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-2xl font-black text-white">3</span>
                      <span className="text-xs text-slate-400 font-bold uppercase">Remote</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-2xl font-black text-white">1</span>
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
                  <button 
                    onClick={() => setShowAllNotifications(true)}
                    className="text-blue-300 hover:text-blue-400 text-sm font-medium"
                  >
                    View all
                  </button>
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
                      onClick={() => alert("This feature will be updated later.")}
                      className="flex gap-4 group cursor-pointer"
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
                      No notifications found.
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Half: Upcoming Events */}
              <div className="flex-1">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-white">Upcoming Events</h3>
                  <button 
                    onClick={() => onAction?.('calendar')}
                    className="text-blue-300 hover:text-blue-400 text-sm font-medium"
                  >
                    Calendar
                  </button>
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
                </div>
              </div>
            </motion.div>
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
                if (action.id === 1) {
                  onAction?.('request-time-off');
                } else if (action.id === 2) {
                  onAction?.('payslip');
                } else if (action.id === 4) {
                  onAction?.('finance');
                } else if (action.id === 5) {
                  onAction?.('approvals');
                } else {
                  alert("This feature will be updated later.");
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
