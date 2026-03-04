import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Sidebar, Tab } from './components/Sidebar';
import { Menu, Loader2, Bell } from 'lucide-react';
import { User } from './types';
import { UserProvider, useUser } from './context/UserContext';
import { NotificationsModal, NotificationItem } from './components/DashboardModals';
import { supabase } from './lib/supabaseClient';
import { Login } from './components/Login';
import type { PayslipData } from './components/PayslipDetail';
import { payslipService } from './services/payslipService';

// Lazy loaded components
const Dashboard = lazy(() => import('./components/Dashboard').then(m => ({ default: m.Dashboard })));
const Employees = lazy(() => import('./components/Employees').then(m => ({ default: m.Employees })));
const Attendance = lazy(() => import('./components/Attendance').then(m => ({ default: m.Attendance })));
const Form = lazy(() => import('./components/Form').then(m => ({ default: m.Form })));
const Calendar = lazy(() => import('./components/Calendar').then(m => ({ default: m.Calendar })));
const Profile = lazy(() => import('./components/Profile').then(m => ({ default: m.Profile })));
const Away = lazy(() => import('./components/Away').then(m => ({ default: m.Away })));
const Documents = lazy(() => import('./components/Documents').then(m => ({ default: m.Documents })));
const DkgTool = lazy(() => import('./components/DkgTool').then(m => ({ default: m.DkgTool })));
const PayslipApprovals = lazy(() => import('./components/PayslipApprovals').then(m => ({ default: m.PayslipApprovals })));
const PayslipDetail = lazy(() => import('./components/PayslipDetail').then(m => ({ default: m.PayslipDetail })));
const PayslipHistory = lazy(() => import('./components/PayslipHistory').then(m => ({ default: m.PayslipHistory })));
const Tasks = lazy(() => import('./components/Tasks').then(m => ({ default: m.Tasks })));
const TeamStatus = lazy(() => import('./components/TeamStatus').then(m => ({ default: m.TeamStatus })));
const Settings = lazy(() => import('./components/Settings').then(m => ({ default: m.Settings })));

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-full w-full">
      <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
    </div>
  );
}

function AppContent() {
  const { user, setUser, isAuthenticated, isLoading, logout } = useUser();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [timeOffModalDefaultOpen, setTimeOffModalDefaultOpen] = useState(false);
  const [viewingPayslip, setViewingPayslip] = useState<PayslipData | null>(null);
  const [payslipHistory, setPayslipHistory] = useState<PayslipData[]>([]);
  const [loadingPayslips, setLoadingPayslips] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    const fetchNotifications = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .or(`recipient_id.eq.${user?.id},recipient_id.is.null`)
        .order('created_at', { ascending: false });
      
      if (data) {
        setNotifications(data.map((item: any) => ({
          id: item.id,
          icon: Bell,
          iconBg: 'bg-slate-500/20',
          iconColor: 'text-slate-400',
          title: item.title,
          desc: item.content,
          time: new Date(item.created_at).toLocaleDateString(),
          category: item.category as any,
          recipient_id: item.recipient_id
        })));
      }
    };
    if (user) fetchNotifications();
  }, [user]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  useEffect(() => {
    if (activeTab !== 'timeoff') {
      setTimeOffModalDefaultOpen(false);
    }
    if (activeTab !== 'dashboard' && activeTab !== 'payslip') {
      setViewingPayslip(null);
    }
  }, [activeTab]);

  useEffect(() => {
    if (user && (activeTab === 'payslip' || activeTab === 'dashboard')) {
      const fetchPayslips = async () => {
        setLoadingPayslips(true);
        try {
          const data = await payslipService.getMyPayslips(user.id);
          setPayslipHistory(data);
        } catch (error) {
          console.error("Failed to fetch payslips", error);
        } finally {
          setLoadingPayslips(false);
        }
      };
      fetchPayslips();
    }
  }, [user, activeTab]);

  // Handle Password Recovery Redirect
  useEffect(() => {
    if (window.location.pathname === '/update-password') {
      setActiveTab('settings');
      // Optional: Clean up URL to avoid staying on /update-password
      window.history.replaceState({}, document.title, "/");
    }
    
    // Listen for Supabase Password Recovery event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setActiveTab('settings');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-black">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Login />;
  }

  return (
    <div className="flex min-h-screen w-full flex-row overflow-hidden bg-background-dark">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onLogout={logout} 
        user={user} 
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />
      
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <header className="flex lg:hidden items-center justify-between p-4 bg-white/5 border-b border-white/10 backdrop-blur-md sticky top-0 z-50">
          <div className="flex items-center gap-2">
            <img 
              src="https://i.postimg.cc/nr1gWnR4/Untitled_design_(3).png" 
              alt="DKG Hub" 
              className="w-8 h-8 object-contain"
              referrerPolicy="no-referrer"
            />
            <span className="font-bold text-white">Hub</span>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowNotifications(true)}
              className="relative text-slate-400 hover:text-white p-2"
            >
              <Bell className="w-6 h-6" />
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" />
              )}
            </button>
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-slate-400 hover:text-white p-2"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </header>

        <NotificationsModal isOpen={showNotifications} onClose={() => setShowNotifications(false)} notifications={notifications} />

        <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:pt-6 lg:px-10 lg:pb-10 relative">
          <Suspense fallback={<LoadingFallback />}>
            {activeTab === 'dashboard' && (
              viewingPayslip ? (
                <PayslipDetail data={viewingPayslip} onBack={() => setViewingPayslip(null)} />
              ) : (
                <Dashboard 
                  user={user} 
                  onAction={(tab) => {
                    if (tab === 'request-time-off') {
                      setTimeOffModalDefaultOpen(true);
                      setActiveTab('timeoff');
                    } else if (tab === 'payslip') {
                      // If we have payslips loaded, show the first one, otherwise switch tab to load them
                      if (payslipHistory.length > 0) {
                        setViewingPayslip(payslipHistory[0]);
                      } else {
                         setActiveTab('payslip');
                      }
                    } else {
                      setActiveTab(tab as Tab);
                    }
                  }} 
                />
              )
            )}
            {activeTab === 'calendar' && <Calendar user={user} />}
            {activeTab === 'tasks' && <Tasks user={user} />}
            {activeTab === 'employees' && <Employees />}
            {activeTab === 'attendance' && <Attendance user={user} />}
            {/* Placeholders for new tabs */}
            {activeTab === 'profile' && <Profile user={user} onUpdate={(u) => setUser(u)} />}
            {activeTab === 'payslip' && (
              viewingPayslip ? (
                <PayslipDetail data={viewingPayslip} onBack={() => setViewingPayslip(null)} />
              ) : (
                loadingPayslips ? <LoadingFallback /> :
                <PayslipHistory history={payslipHistory} onSelect={(p) => setViewingPayslip(p)} />
              )
            )}
            {activeTab === 'timeoff' && (
              <Away 
                user={user} 
                initialTab="my-requests" 
                defaultOpenModal={timeOffModalDefaultOpen} 
              />
            )}
            {activeTab === 'documents' && <Documents />}
            {activeTab === 'form' && <Form />}
            {activeTab === 'finance' && (
              <div className="flex flex-col items-center justify-center h-[60vh] text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="w-20 h-20 rounded-3xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(59,130,246,0.1)]">
                  <span className="text-4xl">💰</span>
                </div>
                <h2 className="text-2xl font-black text-white mb-2">Finance Module</h2>
                <p className="text-slate-400 max-w-xs mx-auto">This feature is currently under development. Stay tuned for updates!</p>
                <div className="mt-8 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Coming Soon
                </div>
              </div>
            )}
            {activeTab === 'settings' && <Settings />}
            {activeTab === 'dkg-tool' && <DkgTool user={user} />}
            
            {/* Manager specific tabs */}
            {activeTab === 'team-status' && <TeamStatus user={user} />}
            {activeTab === 'approvals' && <Away user={user} initialTab="approvals" />}
            {activeTab === 'payslip-approvals' && <PayslipApprovals user={user} />}
          </Suspense>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <UserProvider>
      <AppContent />
    </UserProvider>
  );
}
