import { supabase } from '../lib/supabaseClient';
import { parseISO, startOfDay } from 'date-fns';
import { countBusinessDays } from '../lib/utils';

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
  totalDays?: number;
  approvedBy?: string;
  approverName?: string;
  approvedAt?: string;
}

export const timeOffService = {
  async fetchBalance(userId: string): Promise<TimeOffBalance> {
    try {
      const currentYear = new Date().getFullYear();
      const { data, error } = await supabase
        .from('time_off_balances')
        .select('total, used, remaining')
        .eq('employee_id', userId)
        .eq('year', currentYear)
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
          approved_by,
          approved_at,
          employee:profiles!employee_id(full_name, avatar_url),
          approver:profiles!approved_by(full_name)
        `)
        .eq('employee_id', userId)
        .not('status', 'in', '("Cancelled", "cancelled")')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Fetch history with join failed, trying without join', error);
        // Fallback without join
        const { data: simpleData, error: simpleError } = await supabase
          .from('time_off_requests')
          .select('*')
          .eq('employee_id', userId)
          .not('status', 'in', '("Cancelled", "cancelled")')
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
          totalDays: req.total_days ? Number(req.total_days) : undefined,
        }));
      }

      return (data || []).map((req: any) => {
        const employee = req.employee;
        const userName = Array.isArray(employee) ? employee[0]?.full_name : employee?.full_name;
        const userAvatar = Array.isArray(employee) ? employee[0]?.avatar_url : employee?.avatar_url;
        const approverName = Array.isArray(req.approver) ? req.approver[0]?.full_name : req.approver?.full_name;

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
          totalDays: req.total_days ? Number(req.total_days) : undefined,
          approvedBy: req.approved_by,
          approverName: approverName || (req.approved_by ? 'Unknown Approver' : 'System'),
          approvedAt: req.approved_at
        };
      });
    } catch (error) {
      console.error('Error fetching time off history:', error);
      return [];
    }
  },

  async fetchPendingApprovals(managerId: string, isBOD: boolean = false): Promise<TimeOffRequest[]> {
    try {
      console.log(`[timeOffService] Fetching pending approvals for manager: ${managerId}, isBOD: ${isBOD}`);
      
      let query;
      if (isBOD) {
        // BOD sees all pending requests
        query = supabase
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
            total_days,
            employee:profiles!employee_id(full_name, avatar_url)
          `)
          .in('status', ['pending', 'Pending']);
      } else {
        // Regular manager sees only their team's pending requests
        query = supabase
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
            total_days,
            employee:profiles!employee_id!inner(full_name, avatar_url, manager_id)
          `)
          .in('status', ['pending', 'Pending'])
          .eq('employee.manager_id', managerId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.warn('Fetch pending approvals with join failed, trying without join', error);
        // Fallback without join
        const { data: simpleData, error: simpleError } = await supabase
          .from('time_off_requests')
          .select('*')
          .in('status', ['pending', 'Pending'])
          .order('created_at', { ascending: false });
        
        if (simpleError) throw simpleError;
        
        // Fetch profiles separately for the fallback
        const employeeIds = [...new Set((simpleData || []).map(r => r.employee_id))];
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', employeeIds);
        
        const profileMap = (profilesData || []).reduce((acc: any, p: any) => {
          acc[p.id] = p;
          return acc;
        }, {});
        
        return (simpleData || []).map((req: any) => ({
          id: req.id,
          userId: req.employee_id,
          userName: profileMap[req.employee_id]?.full_name || 'Unknown Employee',
          userAvatar: profileMap[req.employee_id]?.avatar_url,
          type: req.type,
          startDate: req.start_date,
          endDate: req.end_date,
          reason: req.reason,
          status: req.status,
          createdAt: req.created_at,
          totalDays: req.total_days ? Number(req.total_days) : undefined,
        }));
      }

      return (data || []).map((req: any) => {
        const employee = req.employee;
        const userName = Array.isArray(employee) ? employee[0]?.full_name : employee?.full_name;
        const userAvatar = Array.isArray(employee) ? employee[0]?.avatar_url : employee?.avatar_url;
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
          totalDays: req.total_days ? Number(req.total_days) : undefined,
        };
      });
    } catch (error) {
      console.error('Error fetching pending approvals:', error);
      return [];
    }
  },

  async fetchApprovalHistory(managerId: string, isBOD: boolean = false): Promise<TimeOffRequest[]> {
    try {
      console.log(`[timeOffService] Fetching approval history for manager: ${managerId}, isBOD: ${isBOD}`);
      
      let query;
      if (isBOD) {
        // BOD sees all historical requests
        query = supabase
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
            total_days,
            approved_by,
            approved_at,
            employee:profiles!employee_id(full_name, avatar_url),
            approver:profiles!approved_by(full_name)
          `)
          .not('status', 'in', '("pending","Pending")');
      } else {
        // Regular manager sees only their team's historical requests
        query = supabase
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
            total_days,
            approved_by,
            approved_at,
            employee:profiles!employee_id!inner(full_name, avatar_url, manager_id),
            approver:profiles!approved_by(full_name)
          `)
          .not('status', 'in', '("pending","Pending")')
          .eq('employee.manager_id', managerId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.warn('Fetch approval history with join failed, trying without join', error);
        const { data: simpleData, error: simpleError } = await supabase
          .from('time_off_requests')
          .select('*')
          .not('status', 'in', '("pending","Pending")')
          .order('created_at', { ascending: false });
        
        if (simpleError) throw simpleError;
        
        // Fetch profiles separately for the fallback
        const employeeIds = [...new Set((simpleData || []).map(r => r.employee_id))];
        const approverIds = [...new Set((simpleData || []).map(r => r.approved_by).filter(Boolean))];
        const allProfileIds = [...new Set([...employeeIds, ...approverIds])];
        
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', allProfileIds);
        
        const profileMap = (profilesData || []).reduce((acc: any, p: any) => {
          acc[p.id] = p;
          return acc;
        }, {});
        
        return (simpleData || []).map((req: any) => ({
          id: req.id,
          userId: req.employee_id,
          userName: profileMap[req.employee_id]?.full_name || 'Unknown Employee',
          userAvatar: profileMap[req.employee_id]?.avatar_url,
          type: req.type,
          startDate: req.start_date,
          endDate: req.end_date,
          reason: req.reason,
          status: req.status,
          createdAt: req.created_at,
          totalDays: req.total_days ? Number(req.total_days) : undefined,
          approvedBy: req.approved_by,
          approverName: profileMap[req.approved_by]?.full_name || (req.approved_by ? 'Unknown Approver' : 'System'),
        }));
      }

      return (data || []).map((req: any) => {
        const employee = req.employee;
        const userName = Array.isArray(employee) ? employee[0]?.full_name : employee?.full_name;
        const userAvatar = Array.isArray(employee) ? employee[0]?.avatar_url : employee?.avatar_url;
        const approverName = Array.isArray(req.approver) ? req.approver[0]?.full_name : req.approver?.full_name;
        
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
          totalDays: req.total_days ? Number(req.total_days) : undefined,
          approvedBy: req.approved_by,
          approverName: approverName || (req.approved_by ? 'Unknown Approver' : 'System'),
          approvedAt: req.approved_at
        };
      });
    } catch (error) {
      console.error('Error fetching approval history:', error);
      return [];
    }
  },

  async submitRequest(data: Omit<TimeOffRequest, 'id' | 'status' | 'createdAt'> & { isLastDayHalf?: boolean }): Promise<TimeOffRequest> {
    try {
      const isHalfDay = data.type.toLowerCase().includes('half day');
      const isLastDayHalf = data.isLastDayHalf || data.type.toLowerCase().includes('last day half');
      const businessDays = countBusinessDays(data.startDate, data.endDate);
      
      let totalDays = data.totalDays !== undefined ? data.totalDays : businessDays;
      if (data.totalDays === undefined) {
        if (isHalfDay) {
          totalDays = businessDays > 0 ? 0.5 : 0;
        } else if (isLastDayHalf) {
          totalDays = Math.max(0, businessDays - 0.5);
        }
      }

      const { data: rawData, error } = await supabase
        .from('time_off_requests')
        .insert([{
          employee_id: data.userId,
          type: data.type,
          start_date: data.startDate,
          end_date: data.endDate,
          reason: data.reason,
          status: 'pending',
          total_days: totalDays
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
          total_days,
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

  async updateRequestStatus(requestId: string, status: string, approverId?: string): Promise<void> {
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

      // 2. Check old status and determine balance action
      const oldStatus = existingRequest.status?.toLowerCase();
      const newStatusNormalized = status.toLowerCase();
      
      // 3. Try Title Case first (e.g. 'Approved')
      const titleCaseStatus = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
      console.log(`Updating request ${requestId} from ${oldStatus} to ${titleCaseStatus}`);
      
      const updateData: any = { status: titleCaseStatus };
      if (approverId) {
        updateData.approved_by = approverId;
        updateData.approved_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('time_off_requests')
        .update(updateData)
        .eq('id', requestId)
        .select();

      if (!error && data && data.length > 0) {
         console.log('Update successful with Title Case');
         
         // Handle balance updates
         if (newStatusNormalized === 'approved' && oldStatus !== 'approved') {
           await this.updateBalanceForRequest(requestId);
         } else if (oldStatus === 'approved' && newStatusNormalized !== 'approved') {
           await this.restoreBalanceForRequest(requestId);
         }
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
      
      // Handle balance updates for lowercase retry
      if (newStatusNormalized === 'approved' && oldStatus !== 'approved') {
        await this.updateBalanceForRequest(requestId);
      } else if (oldStatus === 'approved' && newStatusNormalized !== 'approved') {
        await this.restoreBalanceForRequest(requestId);
      }

    } catch (error) {
      console.error('Error updating request status:', error);
      throw error;
    }
  },

  async cancelRequest(requestId: string): Promise<void> {
    try {
      console.log(`[timeOffService] Attempting to cancel request: ${requestId}`);
      
      // 1. Fetch the request to verify existence and check start date
      const { data: request, error: fetchError } = await supabase
        .from('time_off_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (fetchError) {
        console.error('[timeOffService] Error fetching request for cancellation:', fetchError);
        throw fetchError;
      }

      if (!request) {
        throw new Error('Request not found.');
      }

      console.log('[timeOffService] Found request for cancellation:', request);

      // 2. Check if the leave has already started
      const today = startOfDay(new Date());
      
      // Handle date parsing carefully
      const startDate = startOfDay(parseISO(request.start_date));

      console.log(`[timeOffService] Date check - Today: ${today.toISOString()}, Start Date: ${startDate.toISOString()}`);

      if (startDate <= today) {
        console.warn('[timeOffService] Cancellation rejected: Leave has already started.');
        throw new Error('Cannot cancel a request that has already started.');
      }

      // 3. Perform the update - Try Title Case first
      console.log(`[timeOffService] Updating status to 'Cancelled' for request ${requestId}`);
      const { data: dataTitle, error: updateErrorTitle } = await supabase
        .from('time_off_requests')
        .update({ status: 'Cancelled' })
        .eq('id', requestId)
        .select();

      if (!updateErrorTitle && dataTitle && dataTitle.length > 0) {
        console.log('[timeOffService] Successfully cancelled request with Title Case');
        if (request.status.toLowerCase() === 'approved') {
          await this.restoreBalanceForRequest(requestId);
        }
        return;
      }

      if (updateErrorTitle) {
        console.warn('[timeOffService] Title Case update error:', updateErrorTitle);
      }

      // 4. Try lowercase if Title Case failed or didn't match
      console.log(`[timeOffService] Retrying with 'cancelled' for request ${requestId}`);
      const { data: dataLower, error: updateErrorLower } = await supabase
        .from('time_off_requests')
        .update({ status: 'cancelled' })
        .eq('id', requestId)
        .select();

      if (updateErrorLower) {
        console.error('[timeOffService] Lowercase update error:', updateErrorLower);
        throw updateErrorLower;
      }

      if (!dataLower || dataLower.length === 0) {
        console.error('[timeOffService] Update matched no rows. Check RLS policies or ID.');
        throw new Error('Failed to cancel request. You may not have permission to modify this request.');
      }

      console.log('[timeOffService] Successfully cancelled request with lowercase');
      if (request.status.toLowerCase() === 'approved') {
        await this.restoreBalanceForRequest(requestId);
      }
    } catch (error) {
      console.error('[timeOffService] Error in cancelRequest:', error);
      throw error;
    }
  },

  async updateBalanceForRequest(requestId: string): Promise<void> {
    try {
      const { data: request } = await supabase
        .from('time_off_requests')
        .select('*')
        .eq('id', requestId)
        .single();
        
      if (!request) return;

      // Use total_days if available, otherwise calculate it
      const daysToSubtract = request.total_days !== undefined && request.total_days !== null 
        ? Number(request.total_days) 
        : (request.type.toLowerCase().includes('half day') 
            ? (countBusinessDays(request.start_date, request.end_date) > 0 ? 0.5 : 0) 
            : countBusinessDays(request.start_date, request.end_date));

      const year = new Date(request.start_date).getFullYear();
      const { data: balance } = await supabase
        .from('time_off_balances')
        .select('*')
        .eq('employee_id', request.employee_id)
        .eq('year', year)
        .maybeSingle();

      if (balance) {
        const currentTotal = balance.total || 14;
        const newUsed = Number(balance.used) + daysToSubtract;
        const { error: updateError } = await supabase
          .from('time_off_balances')
          .update({
            total: currentTotal,
            used: newUsed,
            remaining: currentTotal - newUsed,
            updated_at: new Date().toISOString()
          })
          .eq('employee_id', request.employee_id)
          .eq('year', year);
          
        if (updateError) throw updateError;
      } else {
        // Create balance if it doesn't exist
        const totalAllowance = 14; // Default to 14
        const used = daysToSubtract;
        const { error: insertError } = await supabase
          .from('time_off_balances')
          .insert([{
            employee_id: request.employee_id,
            year: year,
            total: totalAllowance,
            used: used,
            remaining: totalAllowance - used,
            updated_at: new Date().toISOString()
          }]);
          
        if (insertError) throw insertError;
      }
    } catch (error) {
      console.error('Error updating balance for request:', error);
    }
  },

  async restoreBalanceForRequest(requestId: string): Promise<void> {
    try {
      const { data: request } = await supabase
        .from('time_off_requests')
        .select('*')
        .eq('id', requestId)
        .single();
        
      if (!request) return;

      // Use total_days if available, otherwise calculate it
      const daysToRestore = request.total_days !== undefined && request.total_days !== null 
        ? Number(request.total_days) 
        : (request.type.toLowerCase().includes('half day') 
            ? (countBusinessDays(request.start_date, request.end_date) > 0 ? 0.5 : 0) 
            : countBusinessDays(request.start_date, request.end_date));

      const year = new Date(request.start_date).getFullYear();
      const { data: balance } = await supabase
        .from('time_off_balances')
        .select('*')
        .eq('employee_id', request.employee_id)
        .eq('year', year)
        .maybeSingle();

      if (balance) {
        const currentTotal = balance.total || 14;
        const newUsed = Math.max(0, Number(balance.used) - daysToRestore);
        const { error: updateError } = await supabase
          .from('time_off_balances')
          .update({
            total: currentTotal,
            used: newUsed,
            remaining: currentTotal - newUsed,
            updated_at: new Date().toISOString()
          })
          .eq('employee_id', request.employee_id)
          .eq('year', year);
          
        if (updateError) throw updateError;
      }
    } catch (error) {
      console.error('Error restoring balance for request:', error);
    }
  },

  async getTeamApprovedDaysOffYTD(employeeIds: string[]): Promise<Record<string, number>> {
    try {
      const { data, error } = await supabase.rpc('get_approved_days_off_ytd', {
        p_employee_ids: employeeIds
      });

      if (error) {
        console.error('Error fetching approved days off YTD:', error);
        throw error;
      }

      const result: Record<string, number> = {};
      if (data) {
        data.forEach((item: any) => {
          result[item.employee_id] = Number(item.total_approved_days) || 0;
        });
      }
      return result;
    } catch (error) {
      console.error('Exception in getTeamApprovedDaysOffYTD:', error);
      return {};
    }
  }
};
