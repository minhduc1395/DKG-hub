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
  status: 'pending' | 'approved' | 'reject';
  submittedAt: string;
  approvedAt?: string;
  note?: string;
}

export const payslipService = {
  // Fetch payslips for a user
  async getMyPayslips(userId: string, status?: 'pending' | 'approved' | 'reject'): Promise<PayslipData[]> {
    let query = supabase
      .from('payslips')
      .select('*')
      .eq('user_id', userId);
    
    if (status) {
      query = query.eq('approval', status);
    }
    
    const { data, error } = await query
      .order('year', { ascending: false })
      .order('month', { ascending: false });

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
        profiles:user_id (
          full_name,
          department,
          avatar_url
        )
      `)
      .eq('approval', 'pending')
      .order('year', { ascending: false })
      .order('month', { ascending: false });

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
        profiles:user_id (
          full_name,
          department,
          avatar_url
        )
      `)
      .neq('approval', 'pending')
      .order('year', { ascending: false })
      .order('month', { ascending: false });

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
        approval: 'approved',
        status: 'Approved'
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
        approval: 'reject',
        status: 'Rejected'
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
  },

  // Save multiple payslips (from CSV or manual entry)
  async savePayslips(payslips: any[]): Promise<{ success: boolean; error?: any }> {
    const { error } = await supabase
      .from('payslips')
      .upsert(payslips, { onConflict: 'user_id,month,year' });

    if (error) {
      console.error('Error saving payslips:', error);
      return { success: false, error };
    }
    return { success: true };
  }
};

// Helper to safely parse numbers
function safeParseNum(val: any): number {
  if (typeof val === 'number' && !isNaN(val)) return val;
  if (typeof val === 'string') {
    const parsed = parseFloat(val.replace(/,/g, ''));
    if (!isNaN(parsed)) return parsed;
  }
  return 0;
}

// Helper to map DB result to PayslipData (for Detail View)
function mapToPayslipData(item: any): PayslipData {
  const baseSalary = safeParseNum(item.base_salary);
  const otAmount = safeParseNum(item.ot_amount);
  const bonus = safeParseNum(item.performance_bonus_total);
  const commission = safeParseNum(item.commission);
  const allowance = safeParseNum(item.allowance);
  const bhxh = safeParseNum(item.total_insurance);
  const tax = safeParseNum(item.tax_amount);
  const otherDeductions = safeParseNum(item.other_deduction);
  
  const totalIncome = baseSalary + otAmount + bonus + commission + allowance;
  const totalDeductions = bhxh + tax + otherDeductions;
  
  let netSalary = safeParseNum(item.net_salary);
  if (netSalary === 0) {
    netSalary = totalIncome - totalDeductions;
  }

  return {
    id: item.id,
    month: item.month,
    year: item.year,
    baseSalary,
    otAmount,
    bonus,
    commission,
    allowance,
    allowances: [], // No allowances in DB
    insurance: { bhxh, bhyt: 0, bhtn: 0 }, // Mapping total_insurance
    tax,
    otherDeductions,
    netSalary
  };
}

// Helper to map DB result to PayslipRequest (for List View)
function mapToPayslipRequest(item: any): PayslipRequest {
  const profile = item.profiles || {};
  
  let netSalary = safeParseNum(item.net_salary);
  if (netSalary === 0) {
    const baseSalary = safeParseNum(item.base_salary);
    const otAmount = safeParseNum(item.ot_amount);
    const bonus = safeParseNum(item.performance_bonus_total);
    const commission = safeParseNum(item.commission);
    const allowance = safeParseNum(item.allowance);
    const bhxh = safeParseNum(item.total_insurance);
    const tax = safeParseNum(item.tax_amount);
    const otherDeductions = safeParseNum(item.other_deduction);
    netSalary = (baseSalary + otAmount + bonus + commission + allowance) - (bhxh + tax + otherDeductions);
  }

  return {
    id: item.id,
    employeeName: profile.full_name || 'Unknown',
    employeeId: item.user_id,
    avatar: profile.avatar_url || 'https://picsum.photos/100/100',
    department: profile.department || 'Unknown',
    month: item.month,
    year: item.year,
    netSalary,
    status: (item.approval || 'pending') as 'pending' | 'approved' | 'reject',
    submittedAt: `${item.month}/${item.year}`, // Fallback since no submitted_at
    approvedAt: undefined, // No approved_at in DB
    note: ''
  };
}
