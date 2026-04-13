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
  approvedLeaveHistory?: any[];
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

      // 4. Fetch time off balances for the current year
      const currentYear = new Date().getFullYear();

      const { data: timeOffBalances, error: timeOffError } = await supabase
        .from('time_off_balances')
        .select('*')
        .eq('year', currentYear);

      if (timeOffError) {
        console.warn('Error fetching time off balances:', timeOffError);
      }

      // 4.5 Fetch time off requests for history
      const startOfYear = new Date(currentYear, 0, 1).toISOString();
      const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59).toISOString();
      const { data: timeOffRequests } = await supabase
        .from('time_off_requests')
        .select('*')
        .in('status', ['approved', 'Approved'])
        .gte('start_date', startOfYear)
        .lte('start_date', endOfYear);

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
        const employeeTimeOffRequests = (timeOffRequests || []).filter(t => t.employee_id === profile.id);
        const employeeTimeOffBalance = (timeOffBalances || []).find(t => t.employee_id === profile.id);

        const tasksCompleted = employeeTasks.filter(t => t.status?.toLowerCase() === 'done').length;
        const tasksInProgress = employeeTasks.filter(t => ['in progress', 'doing'].includes(t.status?.toLowerCase() || '')).length;
        const tasksPending = employeeTasks.filter(t => ['todo', 'review', 'pending'].includes(t.status?.toLowerCase() || '')).length;
        const totalTasks = employeeTasks.filter(t => t.status?.toLowerCase() !== 'cancelled').length;
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tasksOverdue = employeeTasks.filter(t => {
          if (t.status?.toLowerCase() === 'done') return false;
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

        // Calculate days off directly from approved requests to ensure alignment with history
        const daysOff = employeeTimeOffRequests.reduce((total, req) => total + (Number(req.total_days) || 0), 0);

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
          daysOff: Number(daysOff.toFixed(1)), // Keep 1 decimal place without rounding integers unnecessarily
          tasks: employeeTasks,
          approvedLeaveHistory: employeeTimeOffRequests.sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime())
        };
      });

      return performanceData;

    } catch (error) {
      console.error('Error fetching team performance:', error);
      return [];
    }
  },

  async updateDaysOff(employeeId: string, used: number) {
    const currentYear = new Date().getFullYear();
    // First fetch current balance to get total
    const { data: currentBalance } = await supabase
      .from('time_off_balances')
      .select('total')
      .eq('employee_id', employeeId)
      .eq('year', currentYear)
      .single();
    
    const total = (currentBalance?.total === 12 ? 14 : currentBalance?.total) || 14;
    const remaining = total - used;

    const { error } = await supabase
      .from('time_off_balances')
      .upsert({ 
        employee_id: employeeId, 
        year: currentYear,
        total: total,
        used: used,
        remaining: remaining,
        updated_at: new Date().toISOString()
      }, { onConflict: 'employee_id,year' });
    
    if (error) throw error;
  }
};
