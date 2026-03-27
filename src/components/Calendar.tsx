import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, User as UserIcon, Bell, Info, Loader2, Cake } from 'lucide-react';
import { cn, formatDate } from '../lib/utils';
import { User } from '../types';
import { supabase } from '../lib/supabaseClient';
import { fetchGoogleCalendarEvents } from '../services/googleCalendarService';

const eventTypes = {
  company: { label: 'Company Event', color: 'bg-blue-500', textColor: 'text-blue-400', bgColor: 'bg-blue-500/20' },
  holiday: { label: 'Public Holiday', color: 'bg-emerald-500', textColor: 'text-emerald-400', bgColor: 'bg-emerald-500/20' },
  personal: { label: 'Personal Leave', color: 'bg-rose-500', textColor: 'text-rose-400', bgColor: 'bg-rose-500/20' },
  deadline: { label: 'Task Deadline', color: 'bg-yellow-500', textColor: 'text-yellow-400', bgColor: 'bg-yellow-500/20' },
  birthday: { label: 'Birthday', color: 'bg-pink-500', textColor: 'text-pink-400', bgColor: 'bg-pink-500/20' },
};

interface CalendarEvent {
  id: string | number;
  date: Date;
  endDate?: Date;
  title: string;
  type: 'company' | 'holiday' | 'personal' | 'deadline' | 'birthday';
}

interface TeamLeave {
  id: string;
  employeeId: string;
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
          type,
          employee_id,
          profiles:employee_id (full_name, avatar_url)
        `)
        .eq('status', 'Approved')
        .or(`start_date.gte.${startOfMonth},end_date.lte.${endOfMonth}`);

      if (error) throw error;

      // Fetch company events for the current month
      const { data: companyEvents, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .gte('event_date', startOfMonth)
        .lte('event_date', endOfMonth);

      if (eventsError) throw eventsError;

      // Fetch tasks with deadlines in the current month
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('id, title, deadline, assignee_id, assigner_id')
        .neq('status', 'Done')
        .or(`assignee_id.eq.${user.id},assigner_id.eq.${user.id}`)
        .gte('deadline', startOfMonth)
        .lte('deadline', endOfMonth);

      if (tasksError) throw tasksError;

      // Fetch all employee birthdays
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, dob')
        .not('dob', 'is', null);

      if (profilesError) throw profilesError;

      // Fetch Google Calendar events
      const googleEvents = await fetchGoogleCalendarEvents();

      const vietnamHolidays: CalendarEvent[] = [
        { id: 'vn-h-2026-01-01', date: new Date('2026-01-01'), title: "New Year's Day", type: 'holiday' },
        // Lunar New Year 2026 (Tet)
        { id: 'vn-h-2026-02-16', date: new Date('2026-02-16'), title: "Tet Eve", type: 'holiday' },
        { id: 'vn-h-2026-02-17', date: new Date('2026-02-17'), title: "Lunar New Year (Day 1)", type: 'holiday' },
        { id: 'vn-h-2026-02-18', date: new Date('2026-02-18'), title: "Lunar New Year (Day 2)", type: 'holiday' },
        { id: 'vn-h-2026-02-19', date: new Date('2026-02-19'), title: "Lunar New Year (Day 3)", type: 'holiday' },
        { id: 'vn-h-2026-02-20', date: new Date('2026-02-20'), title: "Lunar New Year (Day 4)", type: 'holiday' },
        { id: 'vn-h-2026-02-21', date: new Date('2026-02-21'), title: "Lunar New Year (Day 5)", type: 'holiday' },
        { id: 'vn-h-2026-02-22', date: new Date('2026-02-22'), title: "Lunar New Year (Weekend)", type: 'holiday' },
        { id: 'vn-h-2026-02-23', date: new Date('2026-02-23'), title: "Tet Compensatory Leave", type: 'holiday' },
        { id: 'vn-h-2026-02-24', date: new Date('2026-02-24'), title: "Tet Compensatory Leave", type: 'holiday' },
        
        // Hung Kings' Festival (Falls on Sunday Apr 26)
        { id: 'vn-h-2026-04-26', date: new Date('2026-04-26'), title: "Hung Kings' Festival", type: 'holiday' },
        { id: 'vn-h-2026-04-27', date: new Date('2026-04-27'), title: "Hung Kings' Compensatory Leave", type: 'holiday' },
        
        { id: 'vn-h-2026-04-30', date: new Date('2026-04-30'), title: "Reunification Day", type: 'holiday' },
        { id: 'vn-h-2026-05-01', date: new Date('2026-05-01'), title: "International Workers' Day", type: 'holiday' },
        { id: 'vn-h-2026-09-02', date: new Date('2026-09-02'), title: "National Day", type: 'holiday' },
        { id: 'vn-h-2026-09-03', date: new Date('2026-09-03'), title: "National Day Holiday", type: 'holiday' },

        // Special Occasions (Marked as Public Holidays per user request)
        { id: 'vn-s-2026-09-25', date: new Date('2026-09-25'), title: "Mid-Autumn Festival", type: 'holiday' },
        { id: 'vn-s-2026-10-31', date: new Date('2026-10-31'), title: "Halloween", type: 'holiday' },
        { id: 'vn-s-2026-12-25', date: new Date('2026-12-25'), title: "Christmas", type: 'holiday' },
      ];

      const newEvents: CalendarEvent[] = [...vietnamHolidays];
      const newTeamLeave: TeamLeave[] = [];

      if (leaveRequests) {
        leaveRequests.forEach((request: any) => {
          const startDate = new Date(request.start_date);
          const endDate = new Date(request.end_date);
          const userName = request.profiles?.full_name || 'Unknown';
          const avatar = request.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=random`;

          if (request.employee_id === user.id) {
             newEvents.push({
              id: request.id,
              date: startDate,
              endDate: endDate,
              title: `${request.type} Leave`,
              type: 'personal'
            });
          }

          const today = new Date();
          const isActive = today >= startDate && today <= endDate;
          const isUpcoming = startDate > today;

          if (isActive || isUpcoming) {
             newTeamLeave.push({
              id: request.id,
              employeeId: request.employee_id,
              name: userName,
              status: isActive ? 'On Leave' : 'Upcoming',
              date: `${formatDate(startDate, 'dd MMM')} - ${formatDate(endDate, 'dd MMM')}`,
              avatar: avatar
            });
          }
        });
      }

      if (companyEvents) {
        companyEvents.forEach((event: any) => {
          newEvents.push({
            id: `event-${event.id}`,
            date: new Date(event.event_date),
            title: event.title,
            type: event.type === 'Holiday' ? 'holiday' : 'company'
          });
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

      if (googleEvents) {
        googleEvents.forEach((event) => {
          newEvents.push({
            id: `google-${event.id}`,
            date: event.start,
            endDate: event.end,
            title: event.title,
            type: 'company'
          });
        });
      }

      if (profiles) {
        profiles.forEach((profile: any) => {
          if (profile.dob) {
            const dob = new Date(profile.dob);
            // Create birthday event for the current year being viewed
            const birthdayDate = new Date(currentDate.getFullYear(), dob.getMonth(), dob.getDate());
            
            // Get family name and short name
            const nameParts = (profile.full_name || 'Unknown').trim().split(/\s+/);
            const familyName = nameParts[0];
            const shortName = nameParts.length >= 2 
              ? nameParts.slice(-2).join(' ') 
              : nameParts[0];

            const title = (familyName === 'Kim')
              ? `Mr ${familyName}'s birthday`
              : `${shortName}'s birthday`;

            newEvents.push({
              id: `birthday-${profile.id}`,
              date: birthdayDate,
              title: title,
              type: 'birthday'
            });
          }
        });
      }
      
      // Sort events by date for upcoming section
      newEvents.sort((a, b) => a.date.getTime() - b.date.getTime());

      // Filter out cancelled events
      const filteredEvents = newEvents.filter(e => !e.title.toLowerCase().includes('cancel'));

      setEvents(filteredEvents);
      setTeamLeaveStatus(newTeamLeave);

    } catch (error) {
      console.error("Error fetching calendar data:", error);
    } finally {
      setLoading(false);
      setIsFetching(false);
    }
  };

  const prevMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input or textarea
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      if (e.key === 'ArrowLeft') {
        prevMonth();
      } else if (e.key === 'ArrowRight') {
        nextMonth();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const getEventsForDay = (day: number) => {
    const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    targetDate.setHours(0, 0, 0, 0);

    return events.filter(e => {
      const start = new Date(e.date);
      start.setHours(0, 0, 0, 0);
      
      const end = e.endDate ? new Date(e.endDate) : new Date(e.date);
      // For all-day events, Google Calendar often sets the end date to the next day at 00:00.
      // We should treat it as ending on the previous day if it's exactly 00:00 and spans multiple days.
      const adjustedEnd = new Date(end);
      if (e.endDate && end.getHours() === 0 && end.getMinutes() === 0 && end.getTime() > start.getTime()) {
        adjustedEnd.setDate(adjustedEnd.getDate() - 1);
      }
      adjustedEnd.setHours(23, 59, 59, 999);

      return targetDate >= start && targetDate <= adjustedEnd;
    });
  };

  const renderCalendarDays = () => {
    const days = [];
    
    // Pre-compute slots for all events in the month to ensure vertical alignment
    const eventSlots: Record<string, number> = {};
    
    const getEventDates = (event: CalendarEvent) => {
      const start = new Date(event.date);
      start.setHours(0, 0, 0, 0);
      const end = event.endDate ? new Date(event.endDate) : new Date(event.date);
      const adjustedEnd = new Date(end);
      if (event.endDate && end.getHours() === 0 && end.getMinutes() === 0 && end.getTime() > start.getTime()) {
        adjustedEnd.setDate(adjustedEnd.getDate() - 1);
      }
      adjustedEnd.setHours(23, 59, 59, 999);
      return { start, adjustedEnd };
    };

    const sortedEvents = [...events].sort((a, b) => {
      const aDates = getEventDates(a);
      const bDates = getEventDates(b);
      if (aDates.start.getTime() !== bDates.start.getTime()) {
        return aDates.start.getTime() - bDates.start.getTime();
      }
      return (bDates.adjustedEnd.getTime() - bDates.start.getTime()) - (aDates.adjustedEnd.getTime() - aDates.start.getTime());
    });

    const slotOccupancy: boolean[][] = Array(daysInMonth + 1).fill(null).map(() => []);

    sortedEvents.forEach(event => {
      const { start, adjustedEnd } = getEventDates(event);
      let firstDayInMonth = -1;
      let lastDayInMonth = -1;

      for (let day = 1; day <= daysInMonth; day++) {
        const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        targetDate.setHours(0, 0, 0, 0);
        if (targetDate >= start && targetDate <= adjustedEnd) {
          if (firstDayInMonth === -1) firstDayInMonth = day;
          lastDayInMonth = day;
        }
      }

      if (firstDayInMonth !== -1) {
        let slot = 0;
        while (true) {
          let isAvailable = true;
          for (let day = firstDayInMonth; day <= lastDayInMonth; day++) {
            if (slotOccupancy[day][slot]) {
              isAvailable = false;
              break;
            }
          }
          if (isAvailable) break;
          slot++;
        }
        eventSlots[event.id] = slot;
        for (let day = firstDayInMonth; day <= lastDayInMonth; day++) {
          slotOccupancy[day][slot] = true;
        }
      }
    });

    // Empty cells for previous month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`empty-${i}`} className="h-28 md:h-32 border border-white/5 bg-white/[0.02]"></div>);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dayEvents = getEventsForDay(day);
      const today = new Date();
      const isToday = day === today.getDate() && currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear();

      const maxSlot = dayEvents.length > 0 ? Math.max(...dayEvents.map(e => eventSlots[e.id] || 0)) : -1;

      days.push(
        <div key={day} className={cn(
          "h-28 md:h-32 border border-white/5 relative group hover:bg-white/5 transition-colors flex flex-col",
          isToday ? "bg-white/5" : "bg-transparent"
        )}>
          <div className="flex justify-between items-start shrink-0 p-1.5 pb-0">
            <span className={cn(
              "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full",
              isToday ? "bg-blue-500 text-white" : "text-slate-400"
            )}>
              {day}
            </span>
          </div>
          
          <div className="mt-1 flex flex-col gap-0.5 flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar pb-1">
            {Array.from({ length: maxSlot + 1 }).map((_, slotIndex) => {
              const event = dayEvents.find(e => eventSlots[e.id] === slotIndex);
              
              if (!event) {
                return <div key={`empty-slot-${slotIndex}`} className="h-[18px] shrink-0" />;
              }

              const { start, adjustedEnd } = getEventDates(event);
              const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
              targetDate.setHours(0, 0, 0, 0);

              const isStart = targetDate.getTime() === start.getTime() || day === 1;
              const isEnd = targetDate.getTime() === adjustedEnd.getTime() || day === daysInMonth;
              const isMultiDay = adjustedEnd.getTime() > start.getTime();

              // Check if the event continues from the previous week (Sunday)
              const isStartOfWeek = targetDate.getDay() === 0;
              const isEndOfWeek = targetDate.getDay() === 6;
              
              const showStartRounded = isStart || isStartOfWeek;
              const showEndRounded = isEnd || isEndOfWeek;

              return (
                <div 
                  key={event.id}
                  className={cn(
                    "text-[9px] py-0.5 truncate font-medium leading-tight shrink-0 h-[18px] flex items-center relative z-10",
                    eventTypes[event.type as keyof typeof eventTypes].bgColor,
                    eventTypes[event.type as keyof typeof eventTypes].textColor,
                    isMultiDay && !showStartRounded ? "rounded-l-none border-l-0 ml-0 pl-1.5" : "ml-1.5 pl-1.5",
                    isMultiDay && !showEndRounded ? "rounded-r-none border-r-0 mr-0 pr-1.5" : "mr-1.5 pr-1.5",
                    isMultiDay && showStartRounded && "rounded-l-sm",
                    isMultiDay && showEndRounded && "rounded-r-sm",
                    !isMultiDay && "rounded-sm mx-1.5 px-1.5"
                  )}
                  title={event.title}
                >
                  {event.type === 'birthday' && <Cake className="w-2.5 h-2.5 mr-1 shrink-0" />}
                  {(!isMultiDay || showStartRounded || targetDate.getDay() === 1) ? event.title : '\u00A0'}
                </div>
              );
            })}
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
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-white text-3xl font-black tracking-tight">Calendar</h1>
          <p className="text-slate-400">View holidays, events, and team availability.</p>
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
          {/* Date Selector - Moved here for perfect alignment with cards */}
          <div className="flex items-center justify-between gap-4 bg-white/[0.03] backdrop-blur-2xl p-4 rounded-[2rem] border border-white/10 w-full shadow-[inset_0_0_30px_rgba(255,255,255,0.02)]">
            <button 
              onClick={prevMonth} 
              className="p-2.5 hover:bg-white/10 rounded-2xl text-slate-400 hover:text-white transition-all bg-white/5 border border-white/5 active:scale-90"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-white font-black text-lg tracking-tight">
              {monthName} {year}
            </span>
            <button 
              onClick={nextMonth} 
              className="p-2.5 hover:bg-white/10 rounded-2xl text-slate-400 hover:text-white transition-all bg-white/5 border border-white/5 active:scale-90"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Upcoming Events */}
          <div className="p-6 rounded-[2rem] bg-white/[0.03] backdrop-blur-2xl border border-white/10 shadow-[inset_0_0_30px_rgba(255,255,255,0.02)] flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Bell className="w-4 h-4 text-blue-400" />
                Upcoming
              </h3>
              <span className="text-[10px] font-bold text-slate-500 bg-white/5 px-2 py-0.5 rounded-full">{events.length} Events</span>
            </div>
            <div className="space-y-3">
              {events
                .filter(e => {
                  const now = new Date();
                  const nextWeek = new Date();
                  nextWeek.setDate(now.getDate() + 7);
                  
                  const start = new Date(e.date);
                  const end = e.endDate ? new Date(e.endDate) : new Date(e.date);
                  
                  // Show if it's currently happening OR starting within the next 7 days
                  // AND hasn't ended yet
                  return end >= now && start <= nextWeek;
                })
                .map((event) => (
                <div key={event.id} className="group p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition-all cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-1 h-8 rounded-full", eventTypes[event.type as keyof typeof eventTypes].color)} />
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-white truncate">{event.title}</span>
                      <span className="text-[10px] text-slate-500">{formatDate(event.date, 'dd MMM')}</span>
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
            <div className="p-6 rounded-[2rem] bg-white/[0.03] backdrop-blur-2xl border border-white/10 shadow-[inset_0_0_30px_rgba(255,255,255,0.02)] flex flex-col gap-4">
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
                        src={person.employeeId === user.id ? user.avatar : person.avatar} 
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
            className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 shadow-[inset_0_0_30px_rgba(255,255,255,0.02)] rounded-[2rem] overflow-hidden flex flex-col"
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
