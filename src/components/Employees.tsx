import { motion } from 'motion/react';
import { Mail, Phone, MoreHorizontal } from 'lucide-react';

const employees = [
  {
    id: 1,
    name: 'Sarah Jenkins',
    role: 'Senior UX Designer',
    department: 'Product Design',
    status: 'Active',
    avatar: 'https://picsum.photos/seed/sarah/150/150',
  },
  {
    id: 2,
    name: 'Michael Chen',
    role: 'Frontend Engineer',
    department: 'Engineering',
    status: 'On Leave',
    avatar: 'https://picsum.photos/seed/michael/150/150',
  },
  {
    id: 3,
    name: 'Emily Rodriguez',
    role: 'Product Manager',
    department: 'Product',
    status: 'Active',
    avatar: 'https://picsum.photos/seed/emily/150/150',
  },
  {
    id: 4,
    name: 'David Kim',
    role: 'Backend Engineer',
    department: 'Engineering',
    status: 'Remote',
    avatar: 'https://picsum.photos/seed/david/150/150',
  },
  {
    id: 5,
    name: 'Jessica Taylor',
    role: 'HR Manager',
    department: 'Human Resources',
    status: 'Active',
    avatar: 'https://picsum.photos/seed/jessica/150/150',
  },
  {
    id: 6,
    name: 'James Wilson',
    role: 'Marketing Lead',
    department: 'Marketing',
    status: 'Active',
    avatar: 'https://picsum.photos/seed/james/150/150',
  },
];

export function Employees() {
  return (
    <div className="flex flex-col gap-8 max-w-6xl mx-auto w-full">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-white text-3xl md:text-4xl font-black tracking-tight">Team Directory</h1>
          <p className="text-blue-200/60 text-base">Manage and view all employees in the company.</p>
        </div>
        <button 
          onClick={() => alert("This feature will be updated later.")}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-lg shadow-blue-600/25 border border-blue-400/20"
        >
          + Add Employee
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {employees.map((emp, index) => (
          <motion.div
            key={emp.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="group relative overflow-hidden rounded-3xl bg-white/5 backdrop-blur-md border border-white/10 p-6 flex flex-col items-center text-center hover:bg-white/10 transition-all duration-300"
          >
            <div className="absolute top-4 right-4">
              <button 
                onClick={() => alert("This feature will be updated later.")}
                className="text-slate-500 hover:text-white transition-colors p-2"
              >
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </div>
            
            <div className="relative mb-4">
              <img 
                src={emp.avatar} 
                alt={emp.name} 
                className="w-24 h-24 rounded-full object-cover border-4 border-white/10 shadow-xl"
                referrerPolicy="no-referrer"
              />
              <div className={`absolute bottom-0 right-0 w-5 h-5 rounded-full border-4 border-black/20 ${
                emp.status === 'Active' ? 'bg-emerald-500' : 
                emp.status === 'On Leave' ? 'bg-orange-500' : 'bg-cyan-500'
              }`} />
            </div>
            
            <h3 className="text-lg font-bold text-white mb-1">{emp.name}</h3>
            <p className="text-blue-300 text-sm font-medium mb-1">{emp.role}</p>
            <p className="text-slate-400 text-xs uppercase tracking-wider font-semibold mb-6">{emp.department}</p>
            
            <div className="flex items-center gap-3 w-full mt-auto">
              <button 
                onClick={() => alert("This feature will be updated later.")}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors border border-white/5 text-sm font-medium"
              >
                <Mail className="w-4 h-4" />
                Email
              </button>
              <button 
                onClick={() => alert("This feature will be updated later.")}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors border border-white/5 text-sm font-medium"
              >
                <Phone className="w-4 h-4" />
                Call
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
