import { useState, useEffect } from 'react';
import { Sidebar, Tab } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { Employees } from './components/Employees';
import { Attendance } from './components/Attendance';
import { Form } from './components/Form';
import { Login } from './components/Login';
import { Calendar } from './components/Calendar';
import { Profile } from './components/Profile';
import { Away } from './components/Away';
import { Documents } from './components/Documents';
import { DkgTool } from './components/DkgTool';
import { PayslipApprovals } from './components/PayslipApprovals';
import { PayslipDetail, PayslipData } from './components/PayslipDetail';
import { Tasks } from './components/Tasks';
import { TeamStatus } from './components/TeamStatus';
import { Menu, UserCog } from 'lucide-react';
import { User } from './types';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [timeOffModalDefaultOpen, setTimeOffModalDefaultOpen] = useState(false);
  const [viewingPayslip, setViewingPayslip] = useState(false);

  const mockPayslipData: PayslipData = {
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
  };

  useEffect(() => {
    if (activeTab !== 'timeoff') {
      setTimeOffModalDefaultOpen(false);
    }
    if (activeTab !== 'dashboard') {
      setViewingPayslip(false);
    }
  }, [activeTab]);

  const [user, setUser] = useState<User>({
    id: '1',
    name: 'Alex Morgan',
    role: 'staff',
    avatar: 'https://picsum.photos/seed/alex/100/100',
    department: 'Product Design',
    manager_id: '2',
    // Identity
    employeeId: 'VKIS-001',
    dob: '1990-05-15',
    gender: 'Male',
    // Professional
    position: 'Senior Product Designer',
    joiningDate: '2020-03-01',
    contractType: 'Full-time',
    lineManager: 'Sarah Jenkins',
    // Contact & Legal
    companyEmail: 'alex.morgan@company.com',
    personalEmail: '',
    phone: '',
    permanentAddress: '',
    temporaryAddress: '',
    idCardNumber: '',
    idCardDate: '',
    idCardPlace: '',
    // Finance
    bankAccountNumber: '',
    bankName: '',
    bankBranch: ''
  });

  if (!isAuthenticated) {
    return <Login onLogin={() => setIsAuthenticated(true)} />;
  }

  const toggleRole = () => {
    setUser(prev => ({
      ...prev,
      role: prev.role === 'staff' ? 'manager' : 'staff',
      name: prev.role === 'staff' ? 'Sarah Jenkins' : 'Alex Morgan',
      avatar: prev.role === 'staff' ? 'https://picsum.photos/seed/sarah/100/100' : 'https://picsum.photos/seed/alex/100/100'
    }));
  };

  return (
    <div className="flex min-h-screen w-full flex-row overflow-hidden bg-background-dark">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onLogout={() => setIsAuthenticated(false)} 
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

          {activeTab === 'dashboard' && (
            viewingPayslip ? (
              <PayslipDetail data={mockPayslipData} onBack={() => setViewingPayslip(false)} />
            ) : (
              <Dashboard 
                user={user} 
                onAction={(tab) => {
                  if (tab === 'request-time-off') {
                    setTimeOffModalDefaultOpen(true);
                    setActiveTab('timeoff');
                  } else if (tab === 'payslip') {
                    setViewingPayslip(true);
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
          {activeTab === 'profile' && <Profile user={user} onUpdate={setUser} />}
          {activeTab === 'payslip' && <PayslipDetail data={mockPayslipData} />}
          {activeTab === 'timeoff' && (
            <Away 
              user={user} 
              initialTab="my-requests" 
              defaultOpenModal={timeOffModalDefaultOpen} 
            />
          )}
          {activeTab === 'documents' && <Documents user={user} />}
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
        </div>
      </main>
    </div>
  );
}
