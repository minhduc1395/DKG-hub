import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Sidebar, Tab } from './components/Sidebar';
import { Menu, UserCog, Loader2 } from 'lucide-react';
import { User } from './types';
import { UserProvider, useUser } from './context/UserContext';
import { Login } from './components/Login';
import type { PayslipData } from './components/PayslipDetail';

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

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-full w-full">
      <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
    </div>
  );
}

function AppContent() {
  const { user, setUser, isAuthenticated, login } = useUser();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [timeOffModalDefaultOpen, setTimeOffModalDefaultOpen] = useState(false);
  const [viewingPayslip, setViewingPayslip] = useState<PayslipData | null>(null);

  const mockPayslipHistory: PayslipData[] = [
    {
      id: 'PS-2023-10',
      month: 'October',
      year: 2023,
      baseSalary: 25000000,
      otAmount: 1500000,
      performanceBonus: 2000000,
      yearlyBonus: 0,
      allowances: [
        { name: 'Meal Allowance', amount: 750000 },
        { name: 'Transport', amount: 500000 }
      ],
      insurance: {
        bhxh: 2000000,
        bhyt: 375000,
        bhtn: 250000
      },
      tax: 1250000,
      otherDeductions: 0
    },
    {
      id: 'PS-2023-09',
      month: 'September',
      year: 2023,
      baseSalary: 25000000,
      otAmount: 800000,
      performanceBonus: 1500000,
      yearlyBonus: 0,
      allowances: [
        { name: 'Meal Allowance', amount: 750000 },
        { name: 'Transport', amount: 500000 }
      ],
      insurance: {
        bhxh: 2000000,
        bhyt: 375000,
        bhtn: 250000
      },
      tax: 1100000,
      otherDeductions: 0
    },
    {
      id: 'PS-2023-08',
      month: 'August',
      year: 2023,
      baseSalary: 25000000,
      otAmount: 0,
      performanceBonus: 1000000,
      yearlyBonus: 0,
      allowances: [
        { name: 'Meal Allowance', amount: 750000 },
        { name: 'Transport', amount: 500000 }
      ],
      insurance: {
        bhxh: 2000000,
        bhyt: 375000,
        bhtn: 250000
      },
      tax: 950000,
      otherDeductions: 0
    }
  ];

  useEffect(() => {
    if (activeTab !== 'timeoff') {
      setTimeOffModalDefaultOpen(false);
    }
    if (activeTab !== 'dashboard' && activeTab !== 'payslip') {
      setViewingPayslip(null);
    }
  }, [activeTab]);

  if (!isAuthenticated || !user) {
    return <Login onLogin={() => {
      login({
        id: '1',
        name: 'Alex Morgan',
        role: 'staff',
        email: 'alex.morgan@company.com',
        avatar: 'https://picsum.photos/seed/alex/100/100',
        department: 'Product Design',
        manager_id: '2',
        employeeId: 'VKIS-001',
        dob: '1990-05-15',
        gender: 'Male',
        position: 'Senior Product Designer',
        joiningDate: '2020-03-01',
        contractType: 'Full-time',
        lineManager: 'Sarah Jenkins',
        companyEmail: 'alex.morgan@company.com',
        personalEmail: '',
        phone: '',
        permanentAddress: '',
        temporaryAddress: '',
        idCardNumber: '',
        idCardDate: '',
        idCardPlace: '',
        bankAccountNumber: '',
        bankName: '',
        bankBranch: ''
      });
    }} />;
  }

  const toggleRole = () => {
    setUser(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        role: prev.role === 'staff' ? 'manager' : 'staff',
        name: prev.role === 'staff' ? 'Sarah Jenkins' : 'Alex Morgan',
        avatar: prev.role === 'staff' ? 'https://picsum.photos/seed/sarah/100/100' : 'https://picsum.photos/seed/alex/100/100'
      };
    });
  };

  return (
    <div className="flex min-h-screen w-full flex-row overflow-hidden bg-background-dark">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onLogout={() => setUser(null)} 
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
              onClick={toggleRole}
              className="p-2 text-slate-400 hover:text-white bg-white/5 rounded-lg border border-white/10"
              title={`Switch to ${user.role === 'staff' ? 'Manager' : 'Staff'} View`}
            >
              <UserCog className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-slate-400 hover:text-white p-2"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:pt-6 lg:px-10 lg:pb-10 relative">
          {/* Role Toggle for Demo */}
          <div className="absolute top-4 right-4 z-50 hidden md:block">
            <button 
              onClick={toggleRole}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 text-xs font-medium text-slate-300 transition-colors"
            >
              <UserCog className="w-3 h-3" />
              Switch to {user.role === 'staff' ? 'Manager' : 'Staff'} View
            </button>
          </div>

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
                      setViewingPayslip(mockPayslipHistory[0]);
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
            {activeTab === 'attendance' && <Attendance />}
            {/* Placeholders for new tabs */}
            {activeTab === 'profile' && <Profile user={user} onUpdate={(u) => setUser(u)} />}
            {activeTab === 'payslip' && (
              viewingPayslip ? (
                <PayslipDetail data={viewingPayslip} onBack={() => setViewingPayslip(null)} />
              ) : (
                <PayslipHistory history={mockPayslipHistory} onSelect={(p) => setViewingPayslip(p)} />
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
            {activeTab === 'settings' && <div className="text-white">Settings Content</div>}
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
