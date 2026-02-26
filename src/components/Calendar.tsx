import { useState } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, User as UserIcon, Bell, Info } from 'lucide-react';
import { cn } from '../lib/utils';
import { User } from '../types';

// Mock data for calendar events
const events = [
  { id: 1, date: new Date(2023, 9, 24), title: 'Team Meeting', type: 'company' },
  { id: 2, date: new Date(2023, 9, 28), title: 'Q4 Town Hall', type: 'company' },
  { id: 3, date: new Date(2023, 9, 31), title: 'Halloween Party', type: 'company' },
  { id: 4, date: new Date(2023, 10, 10), title: 'Veterans Day (Observed)', type: 'holiday' },
  { id: 5, date: new Date(2023, 10, 23), title: 'Thanksgiving', type: 'holiday' },
  { id: 6, date: new Date(2023, 10, 24), title: 'Day After Thanksgiving', type: 'holiday' },
  { id: 7, date: new Date(2023, 9, 15), title: 'Personal Leave', type: 'personal' },
  { id: 8, date: new Date(2023, 9, 16), title: 'Personal Leave', type: 'personal' },
];

const teamLeaveStatus = [
  { id: 1, name: 'Alex Morgan', status: 'On Leave', date: 'Oct 24 - Oct 26', avatar: 'https://picsum.photos/seed/alex/40/40' },
  { id: 2, name: 'John Doe', status: 'Upcoming', date: 'Oct 30 - Nov 02', avatar: 'https://picsum.photos/seed/john/40/40' },
  { id: 3, name: 'Sarah Jenkins', status: 'On Leave', date: 'Oct 23 - Oct 25', avatar: 'https://picsum.photos/seed/sarah/40/40' },
];

const eventTypes = {
  company: { label: 'Company Event', color: 'bg-blue-500', textColor: 'text-blue-400', bgColor: 'bg-blue-500/20' },
  holiday: { label: 'Public Holiday', color: 'bg-emerald-500', textColor: 'text-emerald-400', bgColor: 'bg-emerald-500/20' },
  personal: { label: 'Personal Leave', color: 'bg-rose-500', textColor: 'text-rose-400', bgColor: 'bg-rose-500/20' },
};

interface CalendarProps {
  user: User;
}

export function Calendar({ user }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date(2023, 9, 1)); // Start at Oct 2023 for demo
  const isManager = user.role === 'manager';

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  
  const monthName = currentDate.toLocaleString('default', { month: 'long' });
  const year = currentDate.getFullYear();

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
      const isToday = day === 24 && currentDate.getMonth() === 9 && currentDate.getFullYear() === 2023; // Mock today

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
              <span className="text-[10px] font-bold text-slate-500 bg-white/5 px-2 py-0.5 rounded-full">3 Events</span>
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
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
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
            <div className="grid grid-cols-7 flex-1 overflow-y-auto">
              {renderCalendarDays()}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
