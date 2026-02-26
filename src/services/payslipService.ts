import { supabase } from '../lib/supabaseClient';
import { PayslipData } from '../components/PayslipDetail';

export interface PayslipRequest {
  id: string;
  employeeName: string;
  employeeId: string;
  avatar: string;
  department: string;
  month: string;
  year: number;
  netSalary: number;
  status: 'Pending' | 'Approved' | 'Rejected';
  submittedAt: string;
  approvedAt?: string;
  note?: string;
}

export const payslipService = {
  // Fetch payslips for the current user (My Payslips)
  async getMyPayslips(userId: string): Promise<PayslipData[]> {
    const { data, error } = await supabase
      .from('payslips')
      .select('*')
      .eq('employee_id', userId)
      .order('year', { ascending: false })
      .order('month', { ascending: false }); // Note: sorting by month string might not be ideal, but assuming standard usage

    if (error) {
      console.error('Error fetching my payslips:', error);
      return [];
    }

    return data.map(mapToPayslipData);
  },

  // Fetch all pending payslips (For Managers)
  async getPendingPayslips(): Promise<PayslipRequest[]> {
    const { data, error } = await supabase
      .from('payslips')
      .select(`
        *,
        profiles:employee_id (
          name,
          department,
          avatar
        )
      `)
      .eq('status', 'Pending')
      .order('submitted_at', { ascending: false });

    if (error) {
      console.error('Error fetching pending payslips:', error);
      return [];
    }

    return data.map(mapToPayslipRequest);
  },

  // Fetch payslip history (Approved/Rejected) (For Managers)
  async getPayslipHistory(): Promise<PayslipRequest[]> {
    const { data, error } = await supabase
      .from('payslips')
      .select(`
        *,
        profiles:employee_id (
          name,
          department,
          avatar
        )
      `)
      .neq('status', 'Pending')
      .order('approved_at', { ascending: false });

    if (error) {
      console.error('Error fetching payslip history:', error);
      return [];
    }

    return data.map(mapToPayslipRequest);
  },

  // Approve a payslip
  async approvePayslip(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('payslips')
      .update({ 
        status: 'Approved', 
        approved_at: new Date().toISOString() 
      })
      .eq('id', id);

    if (error) {
      console.error('Error approving payslip:', error);
      return false;
    }
    return true;
  },

  // Reject a payslip
  async rejectPayslip(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('payslips')
      .update({ 
        status: 'Rejected', 
        approved_at: new Date().toISOString() 
      })
      .eq('id', id);

    if (error) {
      console.error('Error rejecting payslip:', error);
      return false;
    }
    return true;
  },
  
  // Get payslip details by ID
  async getPayslipById(id: string): Promise<PayslipData | null> {
    const { data, error } = await supabase
        .from('payslips')
        .select('*')
        .eq('id', id)
        .single();
    
    if (error) {
        console.error('Error fetching payslip details:', error);
        return null;
    }
    
    return mapToPayslipData(data);
  }
};

// Helper to map DB result to PayslipData (for Detail View)
function mapToPayslipData(item: any): PayslipData {
  return {
    id: item.id,
    month: item.month,
    year: item.year,
    baseSalary: item.base_salary,
    otAmount: item.ot_amount,
    performanceBonus: item.performance_bonus,
    yearlyBonus: item.yearly_bonus,
    allowances: item.allowances || [],
    insurance: item.insurance || { bhxh: 0, bhyt: 0, bhtn: 0 },
    tax: item.tax,
    otherDeductions: item.other_deductions
  };
}

// Helper to map DB result to PayslipRequest (for List View)
function mapToPayslipRequest(item: any): PayslipRequest {
  const profile = item.profiles || {};
  return {
    id: item.id,
    employeeName: profile.name || 'Unknown',
    employeeId: item.employee_id, // Or fetch a specific employee code if it exists
    avatar: profile.avatar || 'https://picsum.photos/100/100',
    department: profile.department || 'Unknown',
    month: item.month,
    year: item.year,
    netSalary: item.net_salary, // Assuming net_salary is stored or calculated
    status: item.status,
    submittedAt: new Date(item.submitted_at).toLocaleDateString(),
    approvedAt: item.approved_at ? new Date(item.approved_at).toLocaleDateString() : undefined,
    note: item.note
  };
}
