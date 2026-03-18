import { supabase } from '../lib/supabaseClient';

export interface EmployeePerformance {
  id: string;
  name: string;
  avatar: string;
  department: string;
  role: string;
  position?: string;
  tasksCompleted: number;
  tasksPending: number;
  tasksInProgress: number;
  totalTasks: number;
  tasksOverdue: number;
  lateDays: number;
  otHours: number;
  daysOff: number;
  tasks: any[];
}

export const teamService = {
  async getTeamPerformance(): Promise<EmployeePerformance[]> {
    try {
      // 1. Fetch all profiles (employees)
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          id, 
          full_name, 
          avatar_url, 
          department,
          job_positions (
            title,
            roles (
              role_name
            )
          )
        `);

      if (profilesError) throw profilesError;

      // 2. Fetch all tasks and their multi-assignees
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          *,
          assignee:assignee_id(full_name),
          assigner:assigner_id(full_name),
          task_assignees(user_id)
        `);

      if (tasksError) throw tasksError;

      // 3. Fetch attendance for the current month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const startOfMonthStr = startOfMonth.toISOString();

      const { data: attendance, error: attendanceError } = await supabase
        .from('attendance_logs')
        .select('employee_id, status, date, work_hours')
        .gte('date', startOfMonthStr);

      if (attendanceError) {
        console.warn('Error fetching attendance:', attendanceError);
        // Don't throw, just continue with empty attendance
      }

      // 4. Fetch time off balances
      const { data: timeOffBalances, error: timeOffError } = await supabase
        .from('time_off_balances')
        .select('employee_id, used');

      if (timeOffError) {
        console.warn('Error fetching time off balances:', timeOffError);
      }

      // 5. Aggregate data
      const performanceData: EmployeePerformance[] = (profiles || []).map(profile => {
        // Handle potentially nested array structure from Supabase join
        const jobPositionData = profile.job_positions;
        const jobPosition = Array.isArray(jobPositionData) ? jobPositionData[0] : jobPositionData;
        
        const roleDataRaw = jobPosition?.roles;
        const roleData = Array.isArray(roleDataRaw) ? roleDataRaw[0] : roleDataRaw;
        
        const roleName = roleData?.role_name || 'Staff';

        // Filter tasks for this employee (either primary assignee or in multi-assignees)
        const employeeTasks = (tasks || []).filter(t => {
          const isPrimary = t.assignee_id === profile.id;
          const isMulti = t.task_assignees?.some((ta: any) => ta.user_id === profile.id);
          return isPrimary || isMulti;
        }).map(t => ({
          ...t,
          assigneeName: t.assignee?.full_name || 'Unknown',
          assignerName: t.assigner?.full_name || 'Unknown'
        }));
        const employeeAttendance = (attendance || []).filter(a => a.employee_id === profile.id);
        const employeeTimeOff = (timeOffBalances || []).find(t => t.employee_id === profile.id);

        const tasksCompleted = employeeTasks.filter(t => t.status === 'Done').length;
        const tasksInProgress = employeeTasks.filter(t => t.status === 'In Progress').length;
        const tasksPending = employeeTasks.filter(t => ['Todo', 'Review'].includes(t.status)).length;
        const totalTasks = employeeTasks.length;
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tasksOverdue = employeeTasks.filter(t => {
          if (t.status === 'Done') return false;
          if (!t.deadline) return false;
          const deadline = new Date(t.deadline);
          deadline.setHours(0, 0, 0, 0);
          return deadline < today;
        }).length;

        const lateDays = employeeAttendance.filter(a => a.status === 'Late').length;
        
        // Calculate OT hours (sum of work_hours > 8)
        const otHours = employeeAttendance.reduce((sum, a) => {
          const hours = a.work_hours || 0;
          return sum + (hours > 8 ? hours - 8 : 0);
        }, 0);

        const daysOff = employeeTimeOff?.used || 0;

        return {
          id: profile.id,
          name: profile.full_name || 'Unknown',
          avatar: profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.full_name || 'User')}`,
          department: profile.department || 'Unknown',
          role: roleName,
          position: jobPosition?.title,
          tasksCompleted,
          tasksPending,
          tasksInProgress,
          totalTasks,
          tasksOverdue,
          lateDays,
          otHours: Math.round(otHours * 10) / 10,
          daysOff,
          tasks: employeeTasks
        };
      });

      return performanceData;

    } catch (error) {
      console.error('Error fetching team performance:', error);
      return [];
    }
  }
};
