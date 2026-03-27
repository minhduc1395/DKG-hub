import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Mail, Phone, MoreHorizontal, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useUser } from '../context/UserContext';

interface Employee {
  id: string;
  name: string;
  role: string;
  position?: string;
  department: string;
  status: string;
  avatar_url: string | null;
  email: string;
}

export function Employees() {
  const { user } = useUser();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          job_positions (
            title,
            roles (
              role_name
            )
          )
        `);

      if (error) throw error;

      if (data) {
        const isBOD = 
          user?.department?.toUpperCase() === 'BOD' || 
          user?.role?.toLowerCase() === 'ceo' || 
          user?.role?.toLowerCase() === 'chairman' ||
          user?.role?.toLowerCase() === 'bod' ||
          user?.position?.toLowerCase() === 'ceo' ||
          user?.position?.toLowerCase() === 'chairman' ||
          user?.position?.toLowerCase() === 'bod';

        const isManager = user?.role === 'manager' || isBOD;

        let visibleProfiles = data;

        if (isManager && !isBOD && user?.id) {
          // Recursive function to get all subordinates
          const getSubordinateIds = (allProfiles: any[], managerId: string): string[] => {
            const directSubordinates = allProfiles.filter(p => p.manager_id === managerId);
            let allSubordinateIds = directSubordinates.map(p => p.id);
            
            for (const sub of directSubordinates) {
              allSubordinateIds = [...allSubordinateIds, ...getSubordinateIds(allProfiles, sub.id)];
            }
            
            return allSubordinateIds;
          };

          const subordinateIds = getSubordinateIds(data, user.id);
          const visibleIds = [user.id, ...subordinateIds];
          visibleProfiles = data.filter(p => visibleIds.includes(p.id));
        } else if (!isBOD && user?.id) {
          // Staff only sees themselves in the directory if not BOD/Manager? 
          // Usually directory is public, but user asked to restrict.
          // "CHỉ BOD là hiện đầy đủ thông tin... còn manage chỉ hiện... cấp dưới"
          // This implies staff might not see anyone or only themselves.
          // Let's assume staff sees only themselves if we follow the logic strictly.
          visibleProfiles = data.filter(p => p.id === user.id);
        }

        const mappedEmployees = visibleProfiles.map((profile: any) => {
          const jobPosition = Array.isArray(profile.job_positions) ? profile.job_positions[0] : profile.job_positions;
          const roleData = jobPosition ? (Array.isArray(jobPosition.roles) ? jobPosition.roles[0] : jobPosition.roles) : null;
          
          return {
            id: profile.id,
            name: profile.full_name || 'Unknown',
            role: roleData?.role_name || 'Staff',
            position: jobPosition?.title,
            department: profile.department || 'General',
            status: 'Active',
            avatar_url: profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.full_name || 'User')}&background=random`,
            email: profile.personal_email || ''
          };
        });
        setEmployees(mappedEmployees);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full w-full">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 max-w-6xl mx-auto w-full animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-white text-3xl md:text-4xl font-black tracking-tight">Team Directory</h1>
          <p className="text-blue-200/60 text-base">Manage and view all employees in the company.</p>
        </div>
        <button 
          onClick={() => alert("This feature will be updated later.")}
          className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)]"
        >
          + Add Employee
        </button>
      </div>

      {employees.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {employees.map((emp, index) => (
            <motion.div
              key={emp.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="group relative overflow-hidden rounded-3xl bg-white/[0.03] backdrop-blur-2xl border border-white/10 shadow-[inset_0_0_30px_rgba(255,255,255,0.02)] p-6 flex flex-col items-center text-center hover:bg-white/10 transition-all duration-300"
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
                  src={(emp.id === user?.id ? user.avatar : emp.avatar_url) || ''} 
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
              <p className="text-blue-300 text-sm font-medium mb-1">{emp.position || emp.role}</p>
              <p className="text-slate-400 text-xs uppercase tracking-wider font-semibold mb-6">{emp.department}</p>
              
              <div className="flex items-center gap-3 w-full mt-auto">
                <button 
                  onClick={() => window.location.href = `mailto:${emp.email}`}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors border border-white/10 text-sm font-medium"
                >
                  <Mail className="w-4 h-4" />
                  Email
                </button>
                <button 
                  onClick={() => alert("This feature will be updated later.")}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors border border-white/10 text-sm font-medium"
                >
                  <Phone className="w-4 h-4" />
                  Call
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-64 text-slate-500">
          <p>No data available.</p>
        </div>
      )}
    </div>
  );
}
