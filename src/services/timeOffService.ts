import { supabase } from '../lib/supabaseClient';

export interface TimeOffBalance {
  total: number;
  used: number;
  remaining: number;
}

export interface TimeOffRequest {
  id: string;
  userId: string;
  userName: string;
  type: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export const timeOffService = {
  async fetchBalance(userId: string): Promise<TimeOffBalance> {
    try {
      const { data, error } = await supabase
        .from('time_off_balances')
        .select('total, used, remaining')
        .eq('employee_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No balance found, return default
          return { total: 12, used: 0, remaining: 12 };
        }
        throw error;
      }

      return data as TimeOffBalance;
    } catch (error) {
      console.error('Error fetching time off balance:', error);
      return { total: 12, used: 0, remaining: 12 }; // Fallback
    }
  },

  async fetchHistory(userId: string): Promise<TimeOffRequest[]> {
    try {
      const { data, error } = await supabase
        .from('time_off_requests')
        .select(`
          id,
          employee_id,
          type,
          start_date,
          end_date,
          reason,
          status,
          created_at,
          profiles!time_off_requests_employee_id_fkey(name)
        `)
        .eq('employee_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((req: any) => ({
        id: req.id,
        userId: req.employee_id,
        userName: req.profiles?.name || 'Unknown',
        type: req.type,
        startDate: req.start_date,
        endDate: req.end_date,
        reason: req.reason,
        status: req.status,
        createdAt: req.created_at,
      }));
    } catch (error) {
      console.error('Error fetching time off history:', error);
      return [];
    }
  },

  async fetchPendingApprovals(managerId: string): Promise<TimeOffRequest[]> {
    try {
      // In a real scenario, you'd filter by manager_id. 
      // For now, we fetch all pending requests for demonstration, or you can adjust the query.
      const { data, error } = await supabase
        .from('time_off_requests')
        .select(`
          id,
          employee_id,
          type,
          start_date,
          end_date,
          reason,
          status,
          created_at,
          profiles!time_off_requests_employee_id_fkey(name)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((req: any) => ({
        id: req.id,
        userId: req.employee_id,
        userName: req.profiles?.name || 'Unknown',
        type: req.type,
        startDate: req.start_date,
        endDate: req.end_date,
        reason: req.reason,
        status: req.status,
        createdAt: req.created_at,
      }));
    } catch (error) {
      console.error('Error fetching pending approvals:', error);
      return [];
    }
  },

  async fetchApprovalHistory(managerId: string): Promise<TimeOffRequest[]> {
    try {
      const { data, error } = await supabase
        .from('time_off_requests')
        .select(`
          id,
          employee_id,
          type,
          start_date,
          end_date,
          reason,
          status,
          created_at,
          profiles!time_off_requests_employee_id_fkey(name)
        `)
        .neq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((req: any) => ({
        id: req.id,
        userId: req.employee_id,
        userName: req.profiles?.name || 'Unknown',
        type: req.type,
        startDate: req.start_date,
        endDate: req.end_date,
        reason: req.reason,
        status: req.status,
        createdAt: req.created_at,
      }));
    } catch (error) {
      console.error('Error fetching approval history:', error);
      return [];
    }
  },

  async submitRequest(data: Omit<TimeOffRequest, 'id' | 'status' | 'createdAt'>): Promise<TimeOffRequest> {
    try {
      const { data: insertedData, error } = await supabase
        .from('time_off_requests')
        .insert([{
          employee_id: data.userId,
          type: data.type,
          start_date: data.startDate,
          end_date: data.endDate,
          reason: data.reason,
          status: 'pending'
        }])
        .select(`
          id,
          employee_id,
          type,
          start_date,
          end_date,
          reason,
          status,
          created_at,
          profiles!time_off_requests_employee_id_fkey(name)
        `)
        .single();

      if (error) throw error;

      return {
        id: insertedData.id,
        userId: insertedData.employee_id,
        userName: insertedData.profiles?.[0]?.name || data.userName,
        type: insertedData.type,
        startDate: insertedData.start_date,
        endDate: insertedData.end_date,
        reason: insertedData.reason,
        status: insertedData.status,
        createdAt: insertedData.created_at,
      };
    } catch (error) {
      console.error('Error submitting time off request:', error);
      throw error;
    }
  },

  async updateRequestStatus(requestId: string, status: 'approved' | 'rejected'): Promise<void> {
    try {
      const { error } = await supabase
        .from('time_off_requests')
        .update({ status })
        .eq('id', requestId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating request status:', error);
      throw error;
    }
  }
};
