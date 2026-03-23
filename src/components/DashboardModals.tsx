import { useState } from 'react';
import { X, FileText, Gift, MessageSquare, Bell, CheckSquare, Info, AlertCircle, Calendar, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface NewsItem {
  id: number | string;
  type: string;
  date: string;
  title: string;
  desc: string;
  file?: string;
}

export interface NotificationItem {
  id: number | string;
  icon: any;
  iconBg: string;
  iconColor: string;
  title: string;
  desc: string;
  time: string;
  category: 'system' | 'task' | 'news' | 'reminder';
  recipient_id: string | null;
  is_read?: boolean;
}

interface NewsModalProps {
  isOpen: boolean;
  onClose: () => void;
  news: NewsItem[];
}

export function NewsModal({ isOpen, onClose, news }: NewsModalProps) {
  const [expandedId, setExpandedId] = useState<number | string | null>(null);

  const toggleExpand = (id: number | string) => {
    setExpandedId(expandedId === id ? null : id);
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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl max-h-[80vh] bg-[#0F1115] border border-white/10 rounded-3xl shadow-2xl z-[101] flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between p-6 border-b border-white/5">
              <h2 className="text-xl font-bold text-white">Company News</h2>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="overflow-y-auto p-6 flex flex-col gap-4">
              {news.map((item) => {
                const isExpanded = expandedId === item.id;
                return (
                  <div 
                    key={item.id} 
                    onClick={() => toggleExpand(item.id)}
                    className={`p-5 rounded-2xl border transition-all group cursor-pointer ${
                      isExpanded 
                        ? 'bg-white/5 border-blue-500/30' 
                        : 'bg-white/[0.02] border-white/5 hover:bg-white/5'
                    }`}
                  >
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                          isExpanded ? 'bg-blue-500/20 text-blue-300' : 'bg-slate-500/20 text-slate-400'
                        }`}>
                          {item.type}
                        </span>
                        <span className="text-[11px] font-medium text-slate-400">{item.date}</span>
                      </div>
                      <h3 className={`text-lg font-bold leading-tight ${
                        isExpanded ? 'text-blue-300' : 'text-white group-hover:text-blue-300 transition-colors'
                      }`}>
                        {item.title}
                      </h3>
                      
                      {isExpanded ? (
                        // Full HTML Content
                        <div 
                          className="text-slate-300 text-sm leading-relaxed space-y-2 mt-2 pt-4 border-t border-white/10 [&>h1]:text-xl [&>h1]:font-bold [&>h1]:text-white [&>h1]:mt-4 [&>h2]:text-lg [&>h2]:font-bold [&>h2]:text-white [&>h2]:mt-3 [&>ul]:list-disc [&>ul]:pl-5 [&>ol]:list-decimal [&>ol]:pl-5 [&>a]:text-blue-400 [&>a]:underline [&>img]:rounded-xl [&>img]:mt-2 [&>img]:w-full [&>img]:object-cover [&>blockquote]:border-l-4 [&>blockquote]:border-blue-500 [&>blockquote]:pl-4 [&>blockquote]:italic [&>blockquote]:text-slate-400"
                          dangerouslySetInnerHTML={{ __html: item.desc }}
                          onClick={(e) => e.stopPropagation()} // Prevent closing when clicking content
                        />
                      ) : (
                        // Preview Content
                        <p className="text-slate-400 text-sm leading-relaxed line-clamp-2">
                          {item.desc.replace(/<[^>]*>?/gm, '')}
                        </p>
                      )}

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
                );
              })}
              {news.length === 0 && (
                <div className="text-center py-12 text-slate-500">
                  No data available.
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  onMarkAsRead: (id: string | number) => void;
  onMarkAllAsRead: () => void;
}

export function NotificationsModal({ isOpen, onClose, notifications, onMarkAsRead, onMarkAllAsRead }: NotificationsModalProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'personal' | 'company'>('all');

  const filteredNotifications = notifications.filter(item => {
    if (activeTab === 'all') return true;
    if (activeTab === 'personal') return item.recipient_id !== null;
    if (activeTab === 'company') return item.recipient_id === null;
    return true;
  });

  const unreadCount = filteredNotifications.filter(n => !n.is_read).length;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md h-[600px] bg-[#0F1115] border border-white/10 rounded-3xl shadow-2xl z-[101] flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between p-6 border-b border-white/5 shrink-0">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-white">Notifications</h2>
                <span className="inline-flex items-center justify-center min-w-[24px] h-5 px-1.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-bold">
                  {filteredNotifications.length}
                </span>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter Tabs & Mark all as read */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-white/5 shrink-0 overflow-x-auto gap-4">
              <div className="flex items-center gap-2">
                {(['all', 'personal', 'company'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                      activeTab === tab 
                        ? 'bg-white/10 text-white' 
                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                    }`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>
              {unreadCount > 0 && (
                <button 
                  onClick={onMarkAllAsRead}
                  className="text-[10px] font-bold text-blue-400 hover:text-blue-300 whitespace-nowrap uppercase tracking-wider"
                >
                  Mark all as read
                </button>
              )}
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
              {filteredNotifications.map((item) => (
                <div 
                  key={item.id} 
                  onClick={() => !item.is_read && onMarkAsRead(item.id)}
                  className={`flex gap-4 p-4 rounded-2xl hover:bg-white/5 transition-colors group cursor-pointer border border-transparent hover:border-white/5 ${!item.is_read ? 'bg-white/[0.03]' : ''}`}
                >
                  <div className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center ${item.iconBg}`}>
                    <item.icon className={`w-5 h-5 ${item.iconColor}`} />
                  </div>
                  <div className="flex flex-col gap-1 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm font-bold leading-tight group-hover:text-blue-300 transition-colors ${item.is_read ? 'text-slate-400' : 'text-white'}`}>{item.title}</p>
                        {!item.is_read && <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
                      </div>
                      <span className="text-[10px] text-slate-500 font-medium whitespace-nowrap">{item.time}</span>
                    </div>
                    <p className={`text-xs leading-snug ${item.is_read ? 'text-slate-500' : 'text-slate-400'}`}>{item.desc}</p>
                    <div className="flex items-center gap-2 mt-1">
                       <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/5 ${
                         item.category === 'system' ? 'text-rose-400' :
                         item.category === 'task' ? 'text-indigo-400' :
                         item.category === 'news' ? 'text-blue-400' : 'text-slate-400'
                       }`}>
                         {item.category}
                       </span>
                    </div>
                  </div>
                </div>
              ))}
              {filteredNotifications.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full py-8 text-slate-500 text-sm">
                  No data available.
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
