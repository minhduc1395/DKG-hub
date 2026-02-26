import { LayoutDashboard, User as UserIcon, CalendarClock, FileText, Settings, LogOut, ClipboardList, Users, CheckSquare, Folder, TrendingUp, Calendar as CalendarIcon, CreditCard, Cpu } from 'lucide-react';
import { cn } from '../lib/utils';
import { User } from '../types';

export type Tab = 'dashboard' | 'profile' | 'timeoff' | 'documents' | 'form' | 'finance' | 'settings' | 'employees' | 'attendance' | 'team-status' | 'approvals' | 'calendar' | 'payslip' | 'payslip-approvals' | 'dkg-tool' | 'tasks';

interface SidebarProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  onLogout?: () => void;
  user: User;
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ activeTab, setActiveTab, onLogout, user, isOpen = false, onClose }: SidebarProps) {
  const isManager = user.role === 'manager';

  const navItems = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'calendar', label: 'Calendar', icon: CalendarIcon },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
    { id: 'timeoff', label: 'Time Off', icon: CalendarClock },
    { id: 'payslip', label: 'My Payslips', icon: CreditCard },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'dkg-tool', label: 'DKG Tool', icon: Cpu },
  ] as const;

  const managerItems = [
    { id: 'team-status', label: 'Team Status', icon: Users },
    { id: 'approvals', label: 'Leave Approvals', icon: CheckSquare },
    { id: 'payslip-approvals', label: 'Payslip Approvals', icon: ClipboardList },
    { id: 'finance', label: 'Finance', icon: TrendingUp },
  ] as const;

  const handleTabClick = (tab: Tab) => {
    setActiveTab(tab);
    onClose?.();
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] lg:hidden"
          onClick={onClose}
        />
      )}

      <aside className={cn(
        "fixed inset-y-0 left-0 z-[100] w-64 flex-col border-r border-white/5 bg-black/90 backdrop-blur-xl transition-transform duration-300 lg:translate-x-0 lg:static lg:flex lg:h-screen lg:bg-black/40",
        isOpen ? "translate-x-0 flex" : "-translate-x-full hidden lg:flex"
      )}>
        <div className="px-4 py-6">
          <button 
            type="button"
            onClick={() => handleTabClick('profile')}
            className="flex items-center gap-3 px-4 py-3 rounded-[1.25rem] bg-white/5 border border-white/10 shadow-lg shadow-black/20 w-full hover:bg-white/10 transition-colors text-left group cursor-pointer"
          >
            <img 
              src={user.avatar} 
              alt={user.name} 
              className="rounded-full h-10 w-10 border-2 border-white/20 object-cover group-hover:border-white/40 transition-colors"
              referrerPolicy="no-referrer"
            />
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-bold text-white truncate group-hover:text-blue-300 transition-colors">{user.name}</span>
              <span className="text-xs text-slate-400 truncate capitalize">{user.role}</span>
            </div>
          </button>
        </div>
        
        <nav className="flex flex-1 flex-col gap-2 px-4 overflow-y-auto pt-2">
          {navItems.filter(item => !(isManager && item.id === 'timeoff')).map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id as Tab)}
                className={cn(
                  "group flex items-center gap-3 rounded-xl px-4 py-3 transition-all duration-200",
                  isActive 
                    ? "bg-blue-500/15 text-blue-300 border border-blue-500/20 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]" 
                    : "text-slate-400 hover:bg-white/5 hover:text-white border border-transparent"
                )}
              >
                <Icon className={cn("w-5 h-5", isActive ? "text-blue-300" : "text-slate-400 group-hover:text-white")} />
                <span className="text-sm font-semibold">{item.label}</span>
              </button>
            );
          })}

          {user.role === 'manager' && (
            <>
              <div className="px-4 py-2 mt-4">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Management Hub</span>
              </div>
              {managerItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleTabClick(item.id as Tab)}
                    className={cn(
                      "group flex items-center gap-3 rounded-xl px-4 py-3 transition-all duration-200",
                      isActive 
                        ? "bg-blue-500/15 text-blue-300 border border-blue-500/20 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]" 
                        : "text-slate-400 hover:bg-white/5 hover:text-white border border-transparent"
                    )}
                  >
                    <Icon className={cn("w-5 h-5", isActive ? "text-blue-300" : "text-slate-400 group-hover:text-white")} />
                    <span className="text-sm font-semibold">{item.label}</span>
                  </button>
                );
              })}
            </>
          )}
        </nav>

        <div className="flex flex-col gap-1 p-4 border-t border-white/5">
          <button
            onClick={() => handleTabClick('settings')}
            className={cn(
              "group flex items-center gap-3 rounded-xl px-4 py-3 transition-all duration-200 w-full",
              activeTab === 'settings'
                ? "bg-blue-500/15 text-blue-300 border border-blue-500/20 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]" 
                : "text-slate-400 hover:bg-white/5 hover:text-white border border-transparent"
            )}
          >
            <Settings className={cn("w-5 h-5", activeTab === 'settings' ? "text-blue-300" : "text-slate-400 group-hover:text-white")} />
            <span className="text-sm font-semibold">Settings</span>
          </button>
          <button 
            onClick={onLogout}
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-slate-500 hover:bg-red-500/10 hover:text-red-400 transition-colors w-full"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-sm font-medium">Log Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
