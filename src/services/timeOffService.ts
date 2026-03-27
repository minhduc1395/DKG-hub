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
  userAvatar?: string;
  type: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: string; // Changed from union to string to support case variations
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
          return { total: 14, used: 0, remaining: 14 };
        }
        throw error;
      }

      return data as TimeOffBalance;
    } catch (error) {
      console.error('Error fetching time off balance:', error);
      return { total: 14, used: 0, remaining: 14 }; // Fallback
    }
  },

  async fetchHistory(userId: string): Promise<TimeOffRequest[]> {
    try {
      // Try with simplified join syntax first
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
          profiles(full_name, avatar_url)
        `)
        .eq('employee_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Fetch history with join failed, trying without join', error);
        // Fallback without join
        const { data: simpleData, error: simpleError } = await supabase
          .from('time_off_requests')
          .select('*')
          .eq('employee_id', userId)
          .order('created_at', { ascending: false });
        
        if (simpleError) throw simpleError;
        
        return (simpleData || []).map((req: any) => ({
          id: req.id,
          userId: req.employee_id,
          userName: 'Me',
          type: req.type,
          startDate: req.start_date,
          endDate: req.end_date,
          reason: req.reason,
          status: req.status,
          createdAt: req.created_at,
        }));
      }

      return (data || []).map((req: any) => {
        const profiles = req.profiles;
        const userName = Array.isArray(profiles) ? profiles[0]?.full_name : profiles?.full_name;
        const userAvatar = Array.isArray(profiles) ? profiles[0]?.avatar_url : profiles?.avatar_url;
        return {
          id: req.id,
          userId: req.employee_id,
          userName: userName || 'Unknown',
          userAvatar: userAvatar,
          type: req.type,
          startDate: req.start_date,
          endDate: req.end_date,
          reason: req.reason,
          status: req.status,
          createdAt: req.created_at,
        };
      });
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
          profiles!time_off_requests_employee_id_fkey(full_name, avatar_url)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((req: any) => {
        const profiles = req.profiles;
        const userName = Array.isArray(profiles) ? profiles[0]?.full_name : profiles?.full_name;
        const userAvatar = Array.isArray(profiles) ? profiles[0]?.avatar_url : profiles?.avatar_url;
        return {
          id: req.id,
          userId: req.employee_id,
          userName: userName || 'Unknown',
          userAvatar: userAvatar,
          type: req.type,
          startDate: req.start_date,
          endDate: req.end_date,
          reason: req.reason,
          status: req.status,
          createdAt: req.created_at,
        };
      });
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
          profiles!time_off_requests_employee_id_fkey(full_name, avatar_url)
        `)
        .neq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((req: any) => {
        const profiles = req.profiles;
        const userName = Array.isArray(profiles) ? profiles[0]?.full_name : profiles?.full_name;
        const userAvatar = Array.isArray(profiles) ? profiles[0]?.avatar_url : profiles?.avatar_url;
        return {
          id: req.id,
          userId: req.employee_id,
          userName: userName || 'Unknown',
          userAvatar: userAvatar,
          type: req.type,
          startDate: req.start_date,
          endDate: req.end_date,
          reason: req.reason,
          status: req.status,
          createdAt: req.created_at,
        };
      });
    } catch (error) {
      console.error('Error fetching approval history:', error);
      return [];
    }
  },

  async submitRequest(data: Omit<TimeOffRequest, 'id' | 'status' | 'createdAt'>): Promise<TimeOffRequest> {
    try {
      const { data: rawData, error } = await supabase
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
          profiles!time_off_requests_employee_id_fkey(full_name, avatar_url)
        `)
        .single();

      if (error) throw error;

      const insertedData = rawData as any;

      const profiles = insertedData.profiles;
      const userName = Array.isArray(profiles) ? profiles[0]?.full_name : profiles?.full_name;
      const userAvatar = Array.isArray(profiles) ? profiles[0]?.avatar_url : profiles?.avatar_url;

      return {
        id: insertedData.id,
        userId: insertedData.employee_id,
        userName: userName || data.userName,
        userAvatar: userAvatar,
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

  async updateRequestStatus(requestId: string, status: string): Promise<void> {
    try {
      // 1. Verify existence and visibility
      const { data: existingRequest, error: fetchError } = await supabase
        .from('time_off_requests')
        .select('*')
        .eq('id', requestId)
        .single();
        
      if (fetchError) {
        console.error('[Debug] Could not fetch request before update:', fetchError);
        throw new Error(`Could not find request with ID ${requestId}. It may not exist or you don't have permission to view it.`);
      }
      
      console.log('[Debug] Found request:', existingRequest);

      // 2. Try Title Case first (e.g. 'Approved')
      const titleCaseStatus = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
      console.log(`Updating request ${requestId} to ${titleCaseStatus}`);
      
      const { data, error } = await supabase
        .from('time_off_requests')
        .update({ status: titleCaseStatus })
        .eq('id', requestId)
        .select();

      if (!error && data && data.length > 0) {
         console.log('Update successful with Title Case');
         return;
      }

      if (error) {
        console.warn('Title Case update returned error:', error);
      } else {
        console.warn('Title Case update returned no data, trying lowercase...');
      }
      
      // Try lowercase (e.g. 'approved')
      const lowerCaseStatus = status.toLowerCase();
      console.log(`Updating request ${requestId} to ${lowerCaseStatus}`);

      const { data: dataLower, error: errorLower } = await supabase
        .from('time_off_requests')
        .update({ status: lowerCaseStatus })
        .eq('id', requestId)
        .select();

      if (errorLower) {
        console.error('Supabase update error (lowercase):', errorLower);
        throw errorLower;
      }
      
      if (!dataLower || dataLower.length === 0) {
        console.warn('Update succeeded but no rows were modified. Check if ID exists or RLS policies.');
        throw new Error('No rows updated. Check permissions or if request exists.');
      }
      
      console.log('Update successful with lowercase');

    } catch (error) {
      console.error('Error updating request status:', error);
      throw error;
    }
  }
};
