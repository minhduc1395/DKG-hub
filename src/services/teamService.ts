import { supabase } from '../lib/supabaseClient';

export interface EmployeePerformance {
  id: string;
  name: string;
  avatar: string;
  department: string;
  role: string;
  tasksCompleted: number;
  tasksPending: number;
  tasksOverdue: number;
  lateDays: number;
  attendanceRate: number;
}

export const teamService = {
  async getTeamPerformance(): Promise<EmployeePerformance[]> {
    try {
      // 1. Fetch all profiles (employees)
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, avatar, department, role');

      if (profilesError) throw profilesError;

      // 2. Fetch all tasks
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('id, assignee_id, status, deadline');

      if (tasksError) throw tasksError;

      // 3. Fetch attendance for the current month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const startOfMonthStr = startOfMonth.toISOString();

      const { data: attendance, error: attendanceError } = await supabase
        .from('attendance')
        .select('employee_id, status, date')
        .gte('date', startOfMonthStr);

      if (attendanceError) throw attendanceError;

      // 4. Aggregate data
      const performanceData: EmployeePerformance[] = profiles.map(profile => {
        const employeeTasks = tasks.filter(t => t.assignee_id === profile.id);
        const employeeAttendance = attendance.filter(a => a.employee_id === profile.id);

        const tasksCompleted = employeeTasks.filter(t => t.status === 'Done').length;
        const tasksPending = employeeTasks.filter(t => ['Todo', 'In Progress', 'Review'].includes(t.status)).length;
        
        const today = new Date().toISOString().split('T')[0];
        const tasksOverdue = employeeTasks.filter(t => t.status !== 'Done' && t.deadline < today).length;

        const lateDays = employeeAttendance.filter(a => a.status === 'Late').length;
        
        // Calculate attendance rate (simplified: present/late days / 22 working days * 100)
        // Or better: (present + late) / (total days in month so far excluding weekends?)
        // Let's use a fixed denominator of 22 for now as a standard month, or max(22, days passed)
        const presentDays = employeeAttendance.filter(a => ['Present', 'Late'].includes(a.status)).length;
        const attendanceRate = Math.min(100, Math.round((presentDays / 22) * 100));

        return {
          id: profile.id,
          name: profile.name || 'Unknown',
          avatar: profile.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name || 'User')}`,
          department: profile.department || 'Unknown',
          role: profile.role || 'Staff',
          tasksCompleted,
          tasksPending,
          tasksOverdue,
          lateDays,
          attendanceRate
        };
      });

      return performanceData;

    } catch (error) {
      console.error('Error fetching team performance:', error);
      return [];
    }
  }
};
