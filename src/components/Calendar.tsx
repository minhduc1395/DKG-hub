import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, User as UserIcon, Bell, Info, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { User } from '../types';
import { supabase } from '../lib/supabaseClient';

const eventTypes = {
  company: { label: 'Company Event', color: 'bg-blue-500', textColor: 'text-blue-400', bgColor: 'bg-blue-500/20' },
  holiday: { label: 'Public Holiday', color: 'bg-emerald-500', textColor: 'text-emerald-400', bgColor: 'bg-emerald-500/20' },
  personal: { label: 'Personal Leave', color: 'bg-rose-500', textColor: 'text-rose-400', bgColor: 'bg-rose-500/20' },
  deadline: { label: 'Task Deadline', color: 'bg-yellow-500', textColor: 'text-yellow-400', bgColor: 'bg-yellow-500/20' },
};

interface CalendarEvent {
  id: string | number;
  date: Date;
  title: string;
  type: 'company' | 'holiday' | 'personal' | 'deadline';
}

interface TeamLeave {
  id: string;
  name: string;
  status: string;
  date: string;
  avatar: string;
}

interface CalendarProps {
  user: User;
}

export function Calendar({ user }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const isManager = user.role === 'manager';
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [teamLeaveStatus, setTeamLeaveStatus] = useState<TeamLeave[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  
  const monthName = currentDate.toLocaleString('default', { month: 'long' });
  const year = currentDate.getFullYear();

  useEffect(() => {
    fetchCalendarData();
  }, [currentDate, user.id]);

  const fetchCalendarData = async () => {
    // Only set loading on initial mount
    if (!events.length && loading) setLoading(true);
    setIsFetching(true);
    try {
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString();
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString();

      // Fetch approved time off requests for the current month
      const { data: leaveRequests, error } = await supabase
        .from('time_off_requests')
        .select(`
          id,
          start_date,
          end_date,
          leave_type,
          user_id,
          profiles:user_id (name, avatar_url)
        `)
        .eq('status', 'Approved')
        .or(`start_date.gte.${startOfMonth},end_date.lte.${endOfMonth}`);

      if (error) throw error;

      // Fetch tasks with deadlines in the current month
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('id, title, deadline, assignee_id, assigner_id')
        .neq('status', 'Done')
        .or(`assignee_id.eq.${user.id},assigner_id.eq.${user.id}`)
        .gte('deadline', startOfMonth)
        .lte('deadline', endOfMonth);

      if (tasksError) throw tasksError;

      const newEvents: CalendarEvent[] = [];
      const newTeamLeave: TeamLeave[] = [];

      if (leaveRequests) {
        leaveRequests.forEach((request: any) => {
          const startDate = new Date(request.start_date);
          const endDate = new Date(request.end_date);
          const userName = request.profiles?.name || 'Unknown';
          const avatar = request.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=random`;

          // Add to events (simplified: just start date for now, or expand for range)
          // For personal calendar, show own leaves. For manager, maybe show all?
          // Let's show own leaves as 'personal' and others as 'company' (or maybe just not show others on main calendar to avoid clutter?)
          // Requirement says "View holidays, events, and team availability."
          
          if (request.user_id === user.id) {
             newEvents.push({
              id: request.id,
              date: startDate, // Simplified to start date
              title: `${request.leave_type} Leave`,
              type: 'personal'
            });
          }

          // Add to team leave status (for sidebar)
          // Check if the leave overlaps with TODAY or upcoming in this month
          const today = new Date();
          const isActive = today >= startDate && today <= endDate;
          const isUpcoming = startDate > today;

          if (isActive || isUpcoming) {
             newTeamLeave.push({
              id: request.id,
              name: userName,
              status: isActive ? 'On Leave' : 'Upcoming',
              date: `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
              avatar: avatar
            });
          }
        });
      }

      if (tasks) {
        tasks.forEach((task: any) => {
          if (task.deadline) {
            newEvents.push({
              id: `task-${task.id}`,
              date: new Date(task.deadline),
              title: `Deadline: ${task.title}`,
              type: 'deadline'
            });
          }
        });
      }
      
      // Add some static holidays for demo purposes if needed, or fetch from a holidays table if it existed.
      // For now, we'll keep the events array clean with just fetched data.

      setEvents(newEvents);
      setTeamLeaveStatus(newTeamLeave);

    } catch (error) {
      console.error("Error fetching calendar data:", error);
    } finally {
      setLoading(false);
      setIsFetching(false);
    }
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const getEventsForDay = (day: number) => {
    return events.filter(e => 
      e.date.getDate() === day && 
      e.date.getMonth() === currentDate.getMonth() && 
      e.date.getFullYear() === currentDate.getFullYear()
    );
  };

  const renderCalendarDays = () => {
    const days = [];
    
    // Empty cells for previous month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`empty-${i}`} className="h-28 md:h-32 border border-white/5 bg-white/[0.02]"></div>);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dayEvents = getEventsForDay(day);
      const today = new Date();
      const isToday = day === today.getDate() && currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear();

      days.push(
        <div key={day} className={cn(
          "h-28 md:h-32 border border-white/5 p-1.5 relative group hover:bg-white/5 transition-colors",
          isToday ? "bg-white/5" : "bg-transparent"
        )}>
          <div className="flex justify-between items-start">
            <span className={cn(
              "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full",
              isToday ? "bg-blue-500 text-white" : "text-slate-400"
            )}>
              {day}
            </span>
          </div>
          
          <div className="mt-1 flex flex-col gap-0.5 overflow-y-auto max-h-[calc(100%-1.5rem)]">
            {dayEvents.map((event) => (
              <div 
                key={event.id}
                className={cn(
                  "text-[9px] px-1 py-0.5 rounded truncate font-medium leading-tight",
                  eventTypes[event.type as keyof typeof eventTypes].bgColor,
                  eventTypes[event.type as keyof typeof eventTypes].textColor
                )}
                title={event.title}
              >
                {event.title}
              </div>
            ))}
          </div>
        </div>
      );
    }

    return days;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full w-full">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full lg:h-full animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-white text-3xl font-black tracking-tight">Calendar</h1>
          <p className="text-slate-400">View holidays, events, and team availability.</p>
        </div>
        
        <div className="flex items-center gap-4 bg-white/5 p-1 rounded-xl border border-white/10">
          <button onClick={prevMonth} className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-white font-bold min-w-[140px] text-center">
            {monthName} {year}
          </span>
          <button onClick={nextMonth} className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex gap-4 flex-wrap">
        {Object.entries(eventTypes).map(([key, value]) => (
          <div key={key} className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${value.color}`}></div>
            <span className="text-xs text-slate-400">{value.label}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:flex-1 min-h-0">
        {/* Sidebar Section - Shown first on mobile to ensure visibility */}
        <div className="order-1 lg:order-2 lg:col-span-1 flex flex-col gap-6 lg:overflow-y-auto lg:pr-2 custom-scrollbar">
          {/* Upcoming Events */}
          <div className="p-6 rounded-[2rem] bg-white/5 border border-white/10 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Bell className="w-4 h-4 text-blue-400" />
                Upcoming
              </h3>
              <span className="text-[10px] font-bold text-slate-500 bg-white/5 px-2 py-0.5 rounded-full">{events.length} Events</span>
            </div>
            <div className="space-y-3">
              {events.slice(0, 3).map((event) => (
                <div key={event.id} className="group p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition-all cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-1 h-8 rounded-full", eventTypes[event.type as keyof typeof eventTypes].color)} />
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-white truncate">{event.title}</span>
                      <span className="text-[10px] text-slate-500">{event.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    </div>
                  </div>
                </div>
              ))}
              {events.length === 0 && (
                 <div className="text-center py-4 text-slate-500 text-xs">
                  No data available.
                </div>
              )}
            </div>
          </div>

          {/* Manager Only: Team Availability */}
          {isManager && (
            <div className="p-6 rounded-[2rem] bg-white/5 border border-white/10 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <UserIcon className="w-4 h-4 text-emerald-400" />
                  Team Status
                </h3>
                <Info className="w-3.5 h-3.5 text-slate-500 cursor-help" />
              </div>
              <div className="space-y-4">
                {teamLeaveStatus.map((person) => (
                  <div key={person.id} className="flex items-center gap-3">
                    <div className="relative">
                      <img 
                        src={person.avatar} 
                        alt={person.name} 
                        className="w-9 h-9 rounded-full border border-white/10 object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className={cn(
                        "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-black",
                        person.status === 'On Leave' ? 'bg-rose-500' : 'bg-amber-500'
                      )} />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-white truncate">{person.name}</span>
                      <div className="flex items-center gap-1.5">
                        <span className={cn(
                          "text-[9px] font-bold uppercase tracking-tighter",
                          person.status === 'On Leave' ? 'text-rose-400' : 'text-amber-400'
                        )}>
                          {person.status}
                        </span>
                        <span className="text-[9px] text-slate-500">• {person.date}</span>
                      </div>
                    </div>
                  </div>
                ))}
                {teamLeaveStatus.length === 0 && (
                  <div className="text-center py-4 text-slate-500 text-xs">
                    No data available.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Quick Note / Legend */}
          <div className="p-5 rounded-2xl bg-blue-500/5 border border-blue-500/10">
            <p className="text-[10px] text-blue-300/60 leading-relaxed italic">
              "Team availability is synced with approved leave requests. Use the Time Off module to submit new requests."
            </p>
          </div>
        </div>

        {/* Main Calendar Section */}
        <div className="order-2 lg:order-1 lg:col-span-3 flex flex-col">
          <div 
            className="bg-white/5 border border-white/10 rounded-[2rem] overflow-hidden flex flex-col shadow-2xl shadow-black/40"
          >
            {/* Weekday Headers */}
            <div className="grid grid-cols-7 border-b border-white/10 bg-white/5">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="py-3 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden relative min-h-[600px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentDate.toISOString()}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                  className="grid grid-cols-7"
                >
                  {renderCalendarDays()}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
